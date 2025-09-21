import prisma from "@/lib/db";
import { chatWithAllMeetings } from "@/lib/rag";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * API route handler for POST requests to chat across all of a user's meetings using RAG.
 * This endpoint supports both direct Clerk authentication and Slack integration,
 * allowing users to ask questions that span multiple meetings. It resolves the target user
 * and uses the RAG pipeline to retrieve and generate responses from relevant transcripts.
 *
 * Request Body:
 * - question: string (required) - The user's question about meetings
 * - userId: string (optional) - Slack user ID for integration; if omitted, uses Clerk auth
 *
 * Responses:
 * - 200: { answer: string; sources: Array<{ meetingId: string; meetingTitle: string; content: string; speakerName: string; confidence: number; }> }
 * - 400: { error: string } - Missing question
 * - 401: { error: string } - Not authenticated (Clerk)
 * - 404: { error: string } - User not found (Slack)
 * - 500: { error: string; answer: string } - Internal server error with fallback message
 */
export async function POST(request: NextRequest) {
  // Step 1: Parse request body to extract question and optional Slack user ID
  try {
    const { question, userId: slackUserId } = await request.json();

    // Step 2: Validate required question field, return 400 if missing
    if (!question) {
      return NextResponse.json({ error: "missing question" }, { status: 400 });
    }

    let targetUserId = slackUserId;

    // Step 3: Handle authentication and user resolution
    if (!slackUserId) {
      // For direct web access: Use Clerk authentication
      const { userId: clerkUserId } = await auth();
      if (!clerkUserId) {
        return NextResponse.json(
          { error: "not authenticated" },
          { status: 401 }
        );
      }
      targetUserId = clerkUserId; // Use Clerk ID directly
    } else {
      // For Slack integration: Resolve internal user ID to Clerk ID
      const user = await prisma.user.findUnique({
        where: {
          id: slackUserId,
        },
        select: {
          clerkId: true,
        },
      });
      if (!user) {
        return NextResponse.json({ error: "user not found" }, { status: 404 });
      }
      targetUserId = user.clerkId; // Map Slack user to Clerk ID for RAG access
    }

    // Step 4: Process the question using RAG across all meetings for the target user
    const response = await chatWithAllMeetings(targetUserId, question);

    // Step 5: Return the AI response and sources
    return NextResponse.json(response);
  } catch (error) {
    // Step 6: Handle errors (e.g., RAG processing failures), log for debugging, return 500 with fallback
    console.error("error in chat", error);
    return NextResponse.json(
      {
        error: "internal server error",
        answer:
          "I encountered an error while searching your meetins . Please try again ",
      },
      { status: 500 }
    );
  }
}
