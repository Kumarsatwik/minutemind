/**
 * API route handler for creating action items in integrated platforms (Trello, Jira, Asana, Slack).
 * Handles authentication, integration lookup, token refresh, and platform-specific creation logic.
 */

import prisma from "@/lib/db";
import { AsanaAPI } from "@/lib/integrations/asana/asana";
import { JiraAPI } from "@/lib/integrations/jira/jira";
import { refreshTokenIfNeeded } from "@/lib/integrations/refreshTokenIfNeeded";
import { TrelloAPI } from "@/lib/integrations/trello/trello";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  // Authenticate the user using Clerk
  const { userId } = await auth();

  // Parse request body for platform, action item details, and meeting ID
  const { platform, actionItem, meetingId } = await request.json();

  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Fetch the user's integration details for the specified platform
  let integration = await prisma.userIntegration.findUnique({
    where: {
      userId_platform: {
        userId,
        platform,
      },
    },
  });

  if (!integration) {
    return NextResponse.json(
      { error: "integration not found" },
      { status: 400 }
    );
  }

  // Refresh token if needed for Jira or Asana integrations
  if (platform === "jira" || platform === "asana") {
    try {
      integration = await refreshTokenIfNeeded(integration);
    } catch (error) {
      console.error(`token refresh failed for ${platform}:`, error);
      return NextResponse.json(
        { error: `please reconnet your ${platform} integration` },
        { status: 401 }
      );
    }
  }

  try {
    // Handle action item creation based on the platform
    if (platform === "trello") {
      // Validate board configuration
      if (!integration.boardId) {
        return NextResponse.json(
          { error: "board not configured" },
          { status: 400 }
        );
      }

      const trello = new TrelloAPI();

      // Fetch lists from the configured board
      const lists = await trello.getBoardLists(
        integration.accessToken,
        integration.boardId
      );

      // Find a "To Do" or "Todo" list, fallback to first list
      const todoList =
        lists.find(
          (list: { name: string }) =>
            list.name.toLowerCase().includes("to do") ||
            list.name.toLowerCase().includes("todo")
        ) || lists[0];

      if (!todoList) {
        return NextResponse.json(
          { error: "no suitable list found" },
          { status: 400 }
        );
      }

      // Create a new card in the selected list
      await trello.createCard(integration.accessToken, todoList.id, {
        title: actionItem,
        description: `Action item from meeting ${meetingId || "Unkown"}`,
      });
    } else if (platform === "jira") {
      // Validate project and workspace configuration
      if (!integration.projectId || !integration.workspaceId) {
        return NextResponse.json(
          { error: "project not configured" },
          { status: 400 }
        );
      }

      const jira = new JiraAPI();

      // Prepare issue details
      const title = actionItem || "Untitled action item";
      const description = `Action item from meeting ${meetingId || "Unkown"}`;

      // Create a new issue in the configured project
      const issue = await jira.createIssue(
        integration.accessToken,
        integration.workspaceId,
        integration.projectId,
        {
          title,
          description,
        }
      );
    } else if (platform === "asana") {
      // Validate project configuration
      if (!integration.projectId) {
        return NextResponse.json(
          { error: "project not configured" },
          { status: 400 }
        );
      }

      const asana = new AsanaAPI();

      // Create a new task in the configured project
      await asana.createTask(integration.accessToken, integration.projectId, {
        title: actionItem,
        description: `Action item from meeting ${meetingId || "Unkown"}`,
      });
    } else if (platform === "slack") {
      // Validate channel configuration (boardId used as channel ID)
      if (!integration.boardId) {
        return NextResponse.json(
          { error: "slack channel not configured" },
          { status: 400 }
        );
      }

      // Post message to Slack channel using the API
      const slackResponse = await fetch(
        "https://slack.com/api/chat.postMessage",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${integration.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            channel: integration.boardId,
            text: `📋 *Action Item from Meeting ${
              meetingId || "Unknown"
            }*\n${actionItem}`,
          }),
        }
      );

      const slackResult = await slackResponse.json();
      if (!slackResponse.ok) {
        throw new Error(`Slack API error: ${slackResult.error}`);
      }
    }

    // Return success response if action item creation succeeds
    return NextResponse.json({ success: true });
  } catch (error) {
    // Handle any errors during action item creation
    console.error(`Error creating action item in ${platform}: `, error);
    return NextResponse.json(
      { error: `failed to create action item in ${platform}` },
      { status: 500 }
    );
  }
}
