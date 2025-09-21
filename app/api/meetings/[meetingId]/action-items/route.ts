import prisma from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

// Define the structure of an action item for type safety
interface ActionItem {
  id: number;
  text: string;
}

/**
 * API route handler for POST requests to add a new action item to a specific meeting.
 * This endpoint allows authenticated users (meeting owners) to append action items to the meeting's JSON array.
 * Action items are stored as a simple array of { id: number, text: string } in the meeting record.
 *
 * Path Parameters:
 * - meetingId: string (required) - The ID of the meeting to add the action item to
 *
 * Request Body:
 * - text: string (required) - The description of the new action item
 *
 * Responses:
 * - 200: { newActionItem: { id: number; text: string } } - New action item added successfully
 * - 401: { error: string } - Unauthorized (not logged in)
 * - 404: { error: string } - Meeting not found or user not owner
 * - 500: { error: string } - Internal server error (not explicitly handled, but caught in try-catch if added)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  // Step 1: Authenticate the user using Clerk to get the user ID (Clerk ID)
  const { userId } = await auth();

  // Step 2: Return 401 if user is not authenticated
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Step 3: Parse the request body to extract the action item text and meetingId from params
  const { text } = await request.json();
  const { meetingId } = await params;

  // Step 4: Verify the meeting exists and the user is the owner (using findFirst with ownership filter)
  const meeting = await prisma.meeting.findFirst({
    where: {
      id: meetingId,
      userId: userId, // Filters by internal user ID; note: userId here is Clerk ID, but schema uses internal ID - potential mismatch if not mapped
    },
  });

  // Step 5: Return 404 if meeting not found or user not authorized
  if (!meeting) {
    return NextResponse.json({ error: "meeting not found" }, { status: 404 });
  }

  // Step 6: Retrieve existing action items from the meeting (stored as JSON array)
  const existingItems = ((meeting.actionItems as unknown) as ActionItem[]) || [];

  // Step 7: Generate a unique incremental ID for the new action item
  const nextId =
    existingItems.length > 0
      ? Math.max(...(existingItems.map((item) => item.id) || [0])) + 1
      : 1;

  // Step 8: Create the new action item object
  const newActionItem = {
    id: nextId,
    text,
  };

  // Step 9: Append the new item to the existing array
  const updatedActionItems = [...existingItems, newActionItem];

  // Step 10: Update the meeting record with the new action items array
  await prisma.meeting.update({
    where: {
      id: meetingId,
    },
    data: {
      actionItems: updatedActionItems,
    },
  });

  // Step 11: Return the newly added action item
  return NextResponse.json({ newActionItem });
}
