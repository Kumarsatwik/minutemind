import { auth } from "@clerk/nextjs/server"; // Clerk authentication
import { NextRequest, NextResponse } from "next/server"; // Next.js API types
import prisma from "@/lib/db"; // Database client for user and installation data
import { WebClient } from "@slack/web-api"; // Slack Web API client

/**
 * GET handler for fetching available Slack channels
 * Retrieves list of public and private channels from user's connected Slack workspace
 */
export async function GET() {
  try {
    // Authenticate user and get their ID
    const { userId } = await auth();

    // Check if user is authenticated
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user data to check Slack connection
    const user = await prisma.user.findFirst({
      where: {
        clerkId: userId,
      },
    });

    // Verify user has Slack connected by checking for team ID
    if (!user?.slackTeamId) {
      return NextResponse.json(
        { error: "slack not connected" },
        { status: 400 }
      );
    }

    // Get Slack installation data using the team ID
    const installation = await prisma.slackInstallation.findFirst({
      where: {
        teamId: user.slackTeamId,
      },
    });

    // Verify Slack installation exists
    if (!installation) {
      return NextResponse.json(
        { error: "slack not connected" },
        { status: 400 }
      );
    }

    // Initialize Slack WebClient with bot token
    const slack = new WebClient(installation.botToken);

    // Fetch conversations (channels) from Slack API
    const channels = await slack.conversations.list({
      types: "public_channel,private_channel",
      limit: 50,
    });

    // Check if Slack API call was successful
    if (!channels.ok) {
      return NextResponse.json(
        { error: "slack not connected" },
        { status: 400 }
      );
    }

    // Return formatted channel data (id and name only)
    return NextResponse.json({
      channels:
        channels.channels?.map((ch) => ({
          id: ch.id,
          name: ch.name,
        })) || [],
    });
  } catch (error) {
    console.error("slack setup error", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * POST handler for setting user's preferred Slack channel
 * Updates the user's preferred channel for meeting notifications
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user and get their ID
    const { userId } = await auth();

    // Check if user is authenticated
    if (!userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // Extract channel ID and name from request body
    const { channelId, channelName } = await request.json();

    // Update user's preferred channel in database
    await prisma.user.updateMany({
      where: {
        clerkId: userId,
      },
      data: {
        preferredChannelId: channelId,     // Set preferred channel ID
        preferredChannelName: channelName, // Set preferred channel name
      },
    });

    // Return success response
    return NextResponse.json({ success: true });
  } catch (error) {
    // Log error for debugging purposes
    console.error("slack setup error", error);
    // Return internal server error response
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
