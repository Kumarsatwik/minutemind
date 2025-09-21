import { chatWithMeeting } from "@/lib/rag";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * API route handler for POST requests to chat with a specific meeting's transcript.
 * This endpoint allows authenticated users to ask questions about a particular meeting,
 * leveraging RAG (Retrieval-Augmented Generation) to provide context-aware responses.
 *
 * Request Body:
 * - meetingId: string (required) - The ID of the meeting to query
 * - question: string (required) - The user's question about the meeting
 *
 * Responses:
 * - 200: { answer: string, sources: Array<{ meetingId: string; content: string; speakerName: string; confidence: number; }> }
 * - 400: { error: string } - Missing required fields
 * - 401: { error: string } - Not authenticated
 * - 500: { error: string } - Internal server error
 */
export async function POST(request: NextRequest) {
  // Step 1: Authenticate the user using Clerk
  const { userId } = await auth();

  // Step 2: Return 401 if user is not authenticated
  if (!userId) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  }

  // Step 3: Parse the request body to extract meetingId and question
  const { meetingId, question } = await request.json();

  // Step 4: Validate required fields, return 400 if missing
  if (!meetingId || !question) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Step 5: Process the question using the RAG chat function
  try {
    const response = await chatWithMeeting(userId, meetingId, question);
    return NextResponse.json(response);
  } catch (error) {
    // Step 6: Handle errors gracefully, log for debugging, return 500
    console.error('Error in chat', error);
    return NextResponse.json({ error: 'Failed to process question' }, { status: 500 });
  }
}