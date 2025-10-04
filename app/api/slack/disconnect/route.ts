import prisma from "@/lib/db"; // Database client for user data operations
import { auth } from "@clerk/nextjs/server"; // Clerk authentication
import { NextRequest, NextResponse } from "next/server"; // Next.js API types

/**
 * POST handler for disconnecting user's Slack integration
 * Removes all Slack-related data from the user's account
 */
export async function POST(_request: NextRequest) {
  try {
    // Authenticate user and get their ID
    const { userId } = await auth();

    // Check if user is authenticated
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Update user record to disconnect Slack integration
    // Clears all Slack-related fields from the database
    await prisma.user.updateMany({
      where: {
        clerkId: userId,
      },
      data: {
        slackConnected: false, // Mark Slack as disconnected
        slackUserId: null, // Clear Slack user ID
        slackTeamId: null, // Clear Slack team ID
        preferredChannelId: null, // Clear preferred channel ID
        preferredChannelName: null, // Clear preferred channel name
      },
    });

    // Return success response
    return NextResponse.json({ success: true });
  } catch (error) {
    // Log error for debugging purposes
    console.error("slack disconnect error", error);
    // Return internal server error response
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
