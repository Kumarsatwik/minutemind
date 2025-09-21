import prisma from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * API route handler for POST requests to toggle the AI bot scheduling for a specific meeting.
 * This endpoint allows authenticated users to enable or disable the bot for joining and processing a meeting.
 * It updates the meeting record in the database, ensuring only the meeting owner can make changes.
 *
 * Path Parameters:
 * - meetingId: string (required) - The ID of the meeting to toggle bot for
 *
 * Request Body:
 * - botScheduled: boolean (required) - True to enable bot, false to disable
 *
 * Responses:
 * - 200: { success: true; botScheduled: boolean; message: string } - Toggle successful
 * - 401: { error: string } - Unauthorized (not logged in)
 * - 404: { error: string } - User not found
 * - 500: { error: string } - Internal server error
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  // Step 1: Authenticate the user using Clerk and extract userId (Clerk ID)
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Step 2: Extract meetingId from path params and botScheduled from request body
    const { meetingId } = await params;
    const { botScheduled } = await request.json();

    // Step 3: Fetch the user record from database using Clerk ID to get internal user ID
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    // Step 4: Return 404 if user does not exist in database
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Step 5: Update the meeting's botScheduled status, ensuring ownership via where clause
    const meeting = await prisma.meeting.update({
      where: {
        id: meetingId,
        userId: user.id, // Ensures only the owner can update
      },
      data: {
        botScheduled: botScheduled,
      },
    });

    // Step 6: Return success response with updated status and confirmation message
    return NextResponse.json({
      success: true,
      botScheduled: meeting.botScheduled,
      message: `Bot ${botScheduled ? "enabled" : "disabled"} for meeting`,
    });
  } catch (error) {
    // Step 7: Handle errors (e.g., meeting not found, database issues), log for debugging, return 500
    console.error("Error toggling bot:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
