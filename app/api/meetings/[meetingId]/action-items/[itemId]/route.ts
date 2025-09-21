import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

// Define the structure of an action item for type safety
interface ActionItem {
  id: number;
  text: string;
}

/**
 * API route handler for DELETE requests to remove a specific action item from a meeting.
 * This endpoint allows authenticated users (meeting owners) to delete an action item by its ID
 * from the meeting's JSON array of action items.
 *
 * Path Parameters:
 * - meetingId: string (required) - The ID of the meeting containing the action item
 * - itemId: string (required) - The ID of the action item to delete (numeric string)
 *
 * Responses:
 * - 200: { success: true } - Action item deleted successfully
 * - 401: { error: string } - Unauthorized (not logged in)
 * - 404: { error: string } - Meeting not found or user not owner
 * - 500: { error: string } - Internal server error
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ meetingId: string; itemId: string }> }
) {
  // Step 1: Authenticate the user using Clerk to get the user ID (Clerk ID)
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Step 2: Extract meetingId and itemId from path params, parse itemId to number
    const { meetingId, itemId } = await params;
    const itemIdNumber = parseInt(itemId, 10); // Use base 10 for safety

    // Step 3: Verify the meeting exists and the user is the owner (using findFirst with ownership filter)
    const meeting = await prisma.meeting.findFirst({
      where: {
        id: meetingId,
        userId: userId, // Filters by internal user ID; note: userId here is Clerk ID, but schema uses internal ID - potential mismatch if not mapped
      },
    });

    // Step 4: Return 404 if meeting not found or user not authorized
    if (!meeting) {
      return NextResponse.json(
        { error: "Meeting not found or you are not the owner" },
        { status: 404 }
      );
    }

    // Step 5: Retrieve existing action items from the meeting (stored as JSON array)
    const actionItems = ((meeting.actionItems as unknown) as ActionItem[]) || [];

    // Step 6: Filter out the action item with the matching ID
    const updatedActionItems = actionItems.filter(
      (item) => item.id !== itemIdNumber
    );

    // Step 7: Update the meeting record with the filtered action items array
    await prisma.meeting.update({
      where: {
        id: meetingId,
      },
      data: {
        actionItems: (updatedActionItems as unknown) as Prisma.InputJsonValue, // Cast via unknown to Prisma's JSON input type for compatibility
      },
    });

    // Step 8: Return success response
    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    // Step 9: Handle errors (e.g., parsing failures, database issues), log for debugging, return 500
    console.error("error deleting action item", error);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
