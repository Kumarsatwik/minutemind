import prisma from "@/lib/db";
import { processTranscript } from "@/lib/rag";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * API route handler for POST requests to process a meeting transcript for RAG (Retrieval-Augmented Generation).
 * This endpoint triggers the chunking, embedding, and storage of transcript data in the database and Pinecone,
 * enabling semantic search and chat functionalities for the meeting.
 *
 * Request Body:
 * - meetingId: string (required) - The ID of the meeting to process
 * - transcript: string (required) - The full text transcript of the meeting
 * - meetingTitle: string (required) - The title of the meeting for metadata
 *
 * Responses:
 * - 200: { success: true } - Processing completed successfully
 * - 400: { error: string } - Missing required fields
 * - 401: { error: string } - Not authenticated
 * - 403: { error: string } - Unauthorized access to meeting
 * - 404: { error: string } - Meeting not found
 * - 500: { error: string } - Internal server error
 */
export async function POST(request: NextRequest) {
  // Step 1: Authenticate the user using Clerk
  const { userId } = await auth();

  // Step 2: Return 401 if user is not authenticated
  if (!userId) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  // Step 3: Parse the request body to extract meetingId, transcript, and meetingTitle
  const { meetingId, transcript, meetingTitle } = await request.json();

  // Step 4: Validate required fields, return 400 if any are missing
  if (!meetingId || !transcript || !meetingTitle) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  // Step 5: Process the transcript and handle business logic
  try {
    // Fetch meeting details to check existence, ownership, and processing status
    const meeting = await prisma.meeting.findUnique({
      where: {
        id: meetingId,
      },
      select: {
        ragProcessed: true,
        userId: true,
      },
    });

    // Return 404 if meeting does not exist
    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    // Return 403 if user does not own the meeting
    if (meeting.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Return success if already processed to avoid re-processing
    if (meeting.ragProcessed) {
      return NextResponse.json({ success: true, message: "Already processed" });
    }

    // Step 6: Process the transcript using the RAG pipeline (chunking, embedding, storage)
    await processTranscript(meetingId, userId, transcript, meetingTitle);

    // Step 7: Update the meeting record to mark as RAG processed
    await prisma.meeting.update({
      where: {
        id: meetingId,
      },
      data: {
        ragProcessed: true,
        ragProcessedAt: new Date(),
      },
    });

    // Return success response
    return NextResponse.json({ success: true });
  } catch (error) {
    // Step 8: Handle errors gracefully, log for debugging, return 500
    console.error("error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
