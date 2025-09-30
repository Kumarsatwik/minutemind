import prisma from "@/lib/db"; // Database client for user, installation, and meeting data
import { currentUser } from "@clerk/nextjs/server"; // Clerk authentication
import { WebClient } from "@slack/web-api"; // Slack Web API client for posting messages
import { NextRequest, NextResponse } from "next/server"; // Next.js API types

/**
 * POST handler for posting meeting summaries to Slack
 * Sends formatted meeting summary and action items to user's preferred Slack channel
 */
export async function POST(request: NextRequest) {
  let dbUser = null;

  try {
    // Authenticate user using Clerk
    const user = await currentUser();

    // Check if user is authenticated
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // Extract meeting data from request body
    const { meetingId, summary, actionItems } = await request.json();

    // Fetch user data from database
    dbUser = await prisma.user.findFirst({
      where: {
        clerkId: user.id,
      },
    });

    // Verify user exists and has Slack connected
    if (!dbUser || !dbUser.slackTeamId) {
      return NextResponse.json(
        { error: "slack not connected" },
        { status: 400 }
      );
    }

    // Get Slack installation data for the user's team
    const installation = await prisma.slackInstallation.findUnique({
      where: {
        teamId: dbUser.slackTeamId,
      },
    });

    // Verify Slack installation exists
    if (!installation) {
      return NextResponse.json(
        { error: "slack workspace not found" },
        { status: 400 }
      );
    }

    // Initialize Slack WebClient with bot token
    const slack = new WebClient(installation.botToken);

    // Determine target channel (use preferred channel or default to #general)
    const targetChannel = dbUser.preferredChannelId || "#general";

    // Fetch meeting details from database
    const meeting = await prisma.meeting.findUnique({
      where: {
        id: meetingId,
      },
    });

    // Extract meeting title for the Slack message
    const meetingTitle = meeting?.title;

    // Post formatted message to Slack using Block Kit
    await slack.chat.postMessage({
      channel: targetChannel,
      blocks: [
        // Header block with meeting summary title
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "📝 Meeting Summary",
            emoji: true,
          },
        },
        // Section with meeting details (title and date) in two columns
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Meeting:*\n${meetingTitle}`,
            },
            {
              type: "mrkdwn",
              text: `*Date:*\n${meeting?.startTime}`,
            },
          ],
        },
        // Visual divider between sections
        {
          type: "divider",
        },
        // Section containing the meeting summary
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*📋 Summary:*\n${summary}`,
          },
        },
        // Section containing the action items
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*✅ Action Items:*\n${actionItems}`,
          },
        },
        // Context block with user and timestamp information
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `Posted by ${
                user.firstName || "User"
              } · ${new Date().toLocaleString()}`,
            },
          ],
        },
      ],
    });

    // Return success response with channel information
    return NextResponse.json({
      success: true,
      message: `Meeting summary posted to ${
        dbUser.preferredChannelName || "#general"
      }`,
    });
  } catch (error) {
    // Log error for debugging purposes
    console.error("error posting to slack:", error);

    // Return error response if posting to Slack fails
    return NextResponse.json(
      { error: "failed to post to slack" },
      { status: 500 }
    );
  }
}
