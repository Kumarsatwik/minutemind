import prisma from "./db";
import { chatWithAI, createEmbedding, createManyEmbeddings } from "./openai";
import { saveManyVectors, searchVectors } from "./pinecone";
import { chunkTranscript, extractSpeaker } from "./text-chunker";

// Define the structure of a transcript chunk for database storage
// Matches Prisma schema where speakerName is optional (nullable)
interface TranscriptChunk {
  meetingId: string;
  chunkIndex: number;
  content: string;
  speakerName: string | null;
  vectorId: string;
}

// Define the structure for vector data to be stored in Pinecone
// Metadata fields are stringified to match Record<string, string> requirement
interface VectorData {
  id: string;
  embedding: number[]; // Assuming OpenAI embeddings return arrays of numbers
  metadata: {
    meetingId: string;
    userId: string;
    chunkIndex: string;
    content: string;
    speakerName: string;
    meetingTitle: string;
  };
}

/**
 * Processes a meeting transcript by:
 * 1. Chunking the transcript into manageable pieces.
 * 2. Generating embeddings for each chunk using OpenAI.
 * 3. Saving the chunk metadata to the database (Prisma).
 * 4. Storing the embeddings and metadata as vectors in Pinecone for RAG retrieval.
 *
 * This enables semantic search and retrieval of meeting content later.
 *
 * @param meetingId - Unique identifier for the meeting
 * @param userId - Unique identifier for the user who owns the meeting
 * @param transcript - The full text transcript of the meeting
 * @param meetingTitle - Optional title for the meeting (defaults to "Meeting")
 * @returns Promise<void> - No return value, but throws errors if operations fail
 */
export async function processTranscript(
  meetingId: string,
  userId: string,
  transcript: string,
  meetingTitle?: string
): Promise<void> {
  // Step 1: Split the transcript into chunks for better processing and retrieval
  const chunks = chunkTranscript(transcript);

  // Step 2: Extract plain text from chunks to prepare for embedding generation
  const texts = chunks.map((chunk) => chunk.content);

  // Step 3: Generate vector embeddings for each text chunk using OpenAI
  const embeddings = await createManyEmbeddings(texts);

  // Step 4: Prepare chunk data for insertion into the database
  // Each chunk gets metadata like speaker and index for querying
  const dbChunks: TranscriptChunk[] = chunks.map((chunk, index) => ({
    meetingId,
    chunkIndex: chunk.chunkIndex,
    content: chunk.content,
    speakerName: extractSpeaker(chunk.content),
    vectorId: `${meetingId}_chunk_${chunk.chunkIndex}`,
  }));

  // Step 5: Bulk insert chunks into the database, skipping any duplicates
  await prisma.transcriptChunk.createMany({
    data: dbChunks,
    skipDuplicates: true,
  });

  // Step 6: Prepare vector objects for Pinecone storage
  // Vectors include the embedding and rich metadata for semantic search
  // Note: Pinecone metadata must be Record<string, string>, so non-string values are stringified
  const vectors: VectorData[] = chunks.map((chunk, index) => ({
    id: `${meetingId}_chunk_${chunk.chunkIndex}`,
    embedding: embeddings[index],
    metadata: {
      meetingId,
      userId,
      chunkIndex: chunk.chunkIndex.toString(),
      content: chunk.content,
      speakerName: extractSpeaker(chunk.content) || "Unknown",
      meetingTitle: meetingTitle || "Meeting",
    },
  }));

  // Step 7: Bulk save vectors to Pinecone index for fast similarity searches
  await saveManyVectors(vectors);
}

/**
 * Enables conversational querying of a specific meeting's transcript using RAG.
 * 1. Generates an embedding for the user's question.
 * 2. Performs semantic search in Pinecone to retrieve relevant transcript chunks.
 * 3. Fetches meeting details from the database.
 * 4. Builds a context from retrieved chunks and crafts a system prompt for the AI.
 * 5. Generates a response using the AI chat model.
 * 6. Returns the answer along with source chunks for transparency.
 *
 * @param userId - Unique identifier for the user
 * @param meetingId - Unique identifier for the specific meeting
 * @param question - The user's question about the meeting
 * @returns Promise<{ answer: string; sources: Array<{ meetingId: string; content: string; speakerName: string; confidence: number; }> }> - AI response and relevant sources
 */
export async function chatWithMeeting(
  userId: string,
  meetingId: string,
  question: string
): Promise<{ answer: string; sources: Array<{ meetingId: string; content: string; speakerName: string; confidence: number; }> }> {
  // Step 1: Generate embedding for the question to enable semantic search
  const questionEmbedding = await createEmbedding(question);

  // Step 2: Search Pinecone for top 5 most relevant transcript chunks filtered by user and meeting
  const results = await searchVectors(
    questionEmbedding,
    { userId, meetingId },
    5
  );

  // Step 3: Fetch meeting details from database for context in the prompt
  const meeting = await prisma.meeting.findUnique({
    where: {
      id: meetingId,
    },
  });

  // Step 4: Build context string from retrieved chunks, attributing to speakers
  const context = results
    .map((result) => {
      const speaker = result.metadata?.speakerName || "Unknown";
      const content = result.metadata?.content || "";
      return `${speaker}: ${content}`;
    })
    .join("\n\n");

  // Step 5: Construct a detailed system prompt guiding the AI to answer based solely on the transcript
  const systemPrompt = `You are a helpful meeting assistant specializing in summarizing and answering questions about past meetings.

The meeting is titled "${meeting?.title || "Untitled Meeting"}" and took place on ${
    meeting?.createdAt
      ? new Date(meeting.createdAt).toDateString()
      : "an unknown date"
  }.

Here is the relevant transcript from the meeting:
${context}

Answer the user's question based strictly on the provided transcript. Be concise, accurate, and professional. If the question refers to something not mentioned in the transcript, respond with: "I'm sorry, but that topic wasn't discussed in this meeting." Do not add external knowledge or assumptions.`;

  // Step 6: Generate AI response using the system prompt and user question
  const answer = await chatWithAI(systemPrompt, question);

  // Step 7: Prepare sources for response transparency, including relevance scores
  // Coerce metadata values to strings to match expected return type
  return {
    answer,
    sources: results.map((result) => ({
      meetingId: String(result.metadata?.meetingId || ""),
      content: String(result.metadata?.content || ""),
      speakerName: String(result.metadata?.speakerName || "Unknown"),
      confidence: result.score || 0,
    })),
  };
}

/**
 * Enables conversational querying across all of a user's meetings using RAG.
 * Similar to chatWithMeeting, but searches across all meetings for the user.
 * Retrieves relevant chunks from multiple meetings and provides context-aware responses.
 *
 * @param userId - Unique identifier for the user
 * @param question - The user's question spanning multiple meetings
 * @returns Promise<{ answer: string; sources: Array<{ meetingId: string; meetingTitle: string; content: string; speakerName: string; confidence: number; }> }> - AI response and relevant sources from various meetings
 */
export async function chatWithAllMeetings(
  userId: string,
  question: string
): Promise<{ answer: string; sources: Array<{ meetingId: string; meetingTitle: string; content: string; speakerName: string; confidence: number; }> }> {
  // Step 1: Generate embedding for the question to enable semantic search across meetings
  const questionEmbedding = await createEmbedding(question);

  // Step 2: Search Pinecone for top 5 most relevant transcript chunks filtered by user (all meetings)
  const results = await searchVectors(
    questionEmbedding,
    { userId },
    5
  );

  // Step 3: Build context string from retrieved chunks, grouping by meeting title and attributing to speakers
  const context = results
    .map((result) => {
      const meetingTitle = result.metadata?.meetingTitle || "Unknown Meeting";
      const speaker = result.metadata?.speakerName || "Unknown";
      const content = result.metadata?.content || "";
      return `Meeting: ${meetingTitle}\n${speaker}: ${content}`;
    })
    .join("\n\n---\n\n");

  // Step 4: Construct a system prompt for handling multi-meeting context
  const systemPrompt = `You are a helpful meeting assistant specializing in answering questions about a user's past meetings across multiple sessions.

Here are relevant excerpts from your meetings:
${context}

Answer the user's question based strictly on the provided excerpts. Identify and reference the specific meeting(s) if relevant (e.g., "In your meeting titled 'X' on [date]..."). Be concise, accurate, and professional. If the question refers to something not mentioned in any excerpt, respond with: "I'm sorry, but that topic wasn't discussed in the meetings I have access to." Do not add external knowledge or assumptions.`;

  // Step 5: Generate AI response using the system prompt and user question
  const answer = await chatWithAI(systemPrompt, question);

  // Step 6: Prepare sources for response transparency, including meeting titles and relevance scores
  return {
    answer,
    sources: results.map((result) => ({
      meetingId: String(result.metadata?.meetingId || ""),
      meetingTitle: String(result.metadata?.meetingTitle || "Unknown Meeting"),
      content: String(result.metadata?.content || ""),
      speakerName: String(result.metadata?.speakerName || "Unknown"),
      confidence: result.score || 0,
    })),
  };
}
