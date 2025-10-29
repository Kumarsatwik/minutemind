import Replicate from "replicate";
import OpenAI from "openai";

const REPLICATE_MODEL = process.env.REPLICATE_MODEL!;

function ensureReplicate() {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    throw new Error("Missing REPLICATE_API_TOKEN environment variable");
  }
  return new Replicate({ auth: token });
}

function toEmbeddings(output: unknown): number[][] | null {
  if (Array.isArray(output)) {
    if (output.length === 0) return [];
    if (Array.isArray(output[0])) {
      return output as number[][];
    }
    if (typeof output[0] === "number") {
      return [output as number[]];
    }
  } else if (output && typeof output === "object") {
    const maybe = (output as { embeddings?: number[][] }).embeddings;
    if (Array.isArray(maybe)) return maybe as number[][];
  }
  return null;
}

export async function createEmbedding(text: string): Promise<number[]> {
  try {
    const replicate = ensureReplicate();
    const output = await replicate.run(
      REPLICATE_MODEL as `${string}/${string}`,
      {
        input: {
          text: JSON.stringify([text]),
          normalize: true,
          batch_size: 8,
          instruction: "",
          embedding_dim: 1024,
        },
      }
    );

    const embeddings = toEmbeddings(output);
    if (!embeddings || embeddings.length === 0) {
      throw new Error("Replicate embedding error: no embedding in response");
    }
    return embeddings[0];
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Error creating embedding:", errorMessage);
    throw new Error(errorMessage);
  }
}

export async function createManyEmbeddings(
  texts: string[]
): Promise<number[][]> {
  try {
    const replicate = ensureReplicate();
    const output = await replicate.run(
      REPLICATE_MODEL as `${string}/${string}`,
      {
        input: {
          text: JSON.stringify(texts),
          normalize: true,
          batch_size: Math.min(8, texts.length),
          instruction: "",
          embedding_dim: 1024,
        },
      }
    );

    const embeddings = toEmbeddings(output);
    if (!embeddings) {
      throw new Error("Replicate embedding error: no embeddings in response");
    }
    return embeddings;
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Error creating embeddings:", errorMessage);
    throw new Error(errorMessage);
  }
}

export async function chatWithAI(
  systemPrompt: string,
  userQuestion: string
): Promise<string> {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("Missing OPENROUTER_API_KEY environment variable");
    }

    const openai = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey,
      defaultHeaders: {
        "HTTP-Referer":
          process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
        "X-Title": process.env.NEXT_PUBLIC_APP_NAME ?? "ai-meeting",
      },
    });

    console.log("systemPrompt", systemPrompt);
    console.log("userQuestion", userQuestion);

    const completion = await openai.chat.completions.create({
      model: process.env.OPENROUTER_MODEL!,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userQuestion },
      ],
    });

    const message = completion.choices?.[0]?.message;
    return message?.content ?? "Sorry, I could not find an answer for that.";
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Error chatting with AI:", errorMessage);
    throw new Error(errorMessage);
  }
}
