import prisma from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * API route handlers for managing a specific meeting by ID.
 *
 * GET: Retrieves meeting details including owner information and ownership status for the authenticated user.
 * DELETE: Deletes a meeting, but only if the authenticated user is the owner.
 *
 * Path Parameters:
 * - meetingId: string (required) - The ID of the meeting
 *
 * Responses for GET:
 * - 200: { ...meeting, isOwner: boolean } - Meeting data with ownership flag
 * - 404: { error: string } - Meeting not found
 * - 500: { error: string } - Internal server error
 *
 * Responses for DELETE:
 * - 200: { success: true; message: string } - Deletion successful
 * - 401: { error: string } - Not authenticated
 * - 403: { error: string } - Not authorized (not owner)
 * - 404: { error: string } - Meeting not found
 * - 500: { error: string } - Internal server error
 */

/**
 * GET handler: Fetches details of a specific meeting and determines if the requester is the owner.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  // Step 1: Authenticate the user using Clerk to get Clerk user ID
  try {
    const { userId: clerkUserId } = await auth();
    const { meetingId } = await params;

    // Step 2: Query the database for the meeting, including limited user info
    const meeting = await prisma.meeting.findUnique({
      where: {
        id: meetingId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            clerkId: true,
          },
        },
      },
    });

    // Step 3: Return 404 if meeting does not exist
    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    // Step 4: Prepare response data, adding an isOwner flag based on Clerk ID comparison
    const responseData = {
      ...meeting,
      isOwner: clerkUserId == meeting.user?.clerkId,
    };

    // Step 5: Return the meeting data
    return NextResponse.json(responseData);
  } catch (error) {
    // Step 6: Handle errors (e.g., database query failures), log for debugging, return 500
    console.error("api error:", error);
    return NextResponse.json(
      { error: "failed to fetch meeting" },
      { status: 500 }
    );
  }
}

/**
 * DELETE handler: Removes a specific meeting from the database.
 * Only the meeting owner can perform this action.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  // Step 1: Authenticate the user using Clerk
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "not authenticated" }, { status: 404 });
    }

    // Step 2: Extract meetingId from path params
    const { meetingId } = await params;

    // Step 3: Fetch the meeting with user info to verify ownership
    const meeting = await prisma.meeting.findUnique({
      where: {
        id: meetingId,
      },
      include: {
        user: true,
      },
    });

    // Step 4: Return 404 if meeting does not exist
    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    // Step 5: Check ownership; return 403 if not the owner
    if (meeting.user.clerkId !== userId) {
      return NextResponse.json({ error: "Not authorized to delete this meeting" }, { status: 403 });
    }

    // Step 6: Delete the meeting from the database
    await prisma.meeting.delete({
      where: {
        id: meetingId
      }
    });

    // Step 7: Return success response
    return NextResponse.json({
      success: true,
      message: "Meeting deleted successfully"
    });
  } catch (error) {
    // Step 8: Handle errors (e.g., database deletion failures), log for debugging, return 500
    console.error('failed to delete meeting', error);
    return NextResponse.json({ error: "failed to delete meeting" }, { status: 500 });
  }
}
