import { App } from "@slack/bolt";
import { authorizeSlack } from "./utils/slack-auth";
import { NextRequest, NextResponse } from "next/server";
import { verifySlackSignature } from "./utils/verifySlackSignature";
import prisma from "@/lib/db";
import { isDuplicateEvent } from "./utils/deduplicate";

/**
 * Initialize Slack Bolt application with security configuration
 */
const app = new App({
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
  authorize: authorizeSlack,
});

/**
 * Handle app mentions (@bot)
 */
  /**
   * Handles Slack app mentions (@bot).
   *
   * This event is triggered when a user mentions the bot in a channel.
   * The handler performs the following steps:
   * 1. Checks for duplicate events to prevent reprocessing (using event timestamp and ID).
   * 2. Ignores mentions from the bot itself to avoid infinite loops.
   * 3. Extracts the user ID from the event and cleans the message text by removing user mentions.
   * 4. Retrieves the user's email address from Slack's API.
   * 5. Looks up the user in the database using the email.
   * 6. Updates the user's Slack connection status with bot user ID and team ID.
   * 7. Sends a "searching" message to the user.
   * 8. Calls the RAG chat API to generate a response based on meeting data.
   * 9. Formats and sends the response back to the user in Slack, or an error message if something fails.
   *
   * Error handling: Catches any exceptions and responds with a generic error message.
   */
app.event("app_mention", async ({ event, say, client }) => {
  try {
    // Create unique event ID for deduplication
    const eventId = `app_mention-${event.channel}-${event.user}`;
    // Use event timestamp, fallback to ts if event_ts not available
    const eventTs = event.event_ts || event.ts || "";

    // Skip if this event has been processed before to prevent duplicates
    if (eventTs && isDuplicateEvent(eventId, eventTs)) {
      return;
    }

    const authTest = await client.auth.test();
    if (event.user === authTest.user_id) {
      return;
    }

    const slackUserId = event.user;
    if (!slackUserId) {
      return;
    }

    // Extract message text and remove user mentions (e.g., <@U123456>) to get clean query
    const text = event.text || "";
    const cleanText = text.replace(/<@[^>]+>/g, "").trim();

    // Respond with greeting if no meaningful text after cleaning
    if (!cleanText) {
      await say("👋 Hi! Ask me anything about your meetings.");
      return;
    }

    const userInfo = await client.users.info({ user: slackUserId });
    const userEmail = userInfo.user?.profile?.email;

    if (!userEmail) {
      await say(
        "Sorry, I can't access your email. Please make sure your Slack email is visible."
      );
      return;
    }

    const user = await prisma.user.findFirst({
      where: { email: userEmail },
    });

    if (!user) {
      await say("Account not found. Please sign up first!");
      return;
    }

    const { team_id: teamId } = authTest;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        slackUserId: slackUserId,
        slackTeamId: teamId as string,
        slackConnected: true,
      },
    });

    await say("🤖 Searching through your meetings...");

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/rag/chat-all`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: cleanText,
          userId: user.id,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`RAG API failed: ${response.status}`);
    }

    const data = await response.json();

    if (data.answer) {
      await say({
        text: "Meeting Assistant Response",
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `🤖 *Meeting Assistant*\n\n${data.answer}`,
            },
          },
        ],
      });
  /**
   * Handles regular Slack messages.
   *
   * This event is triggered for all messages in channels where the bot is present.
   * The handler performs the following steps:
   * 1. Filters out bot messages, system messages, and messages without users or text.
   * 2. Ignores messages from the bot itself to avoid infinite loops.
   * 3. Skips messages that directly mention the bot (handled by app_mention).
   * 4. Checks for duplicate events to prevent reprocessing.
   * 5. Extracts the user ID and cleans the message text.
   * 6. Retrieves the user's email address from Slack's API.
   * 7. Looks up the user in the database using the email.
   * 8. Updates the user's Slack connection status.
   * 9. Calls the RAG chat API to generate a response.
   * 10. Formats and sends the response, or an error message.
   *
   * Note: This handler differs from app_mention as it processes all messages, not just mentions.
   * Error handling: Catches exceptions and responds with a generic error message.
   */
    } else {
      await say(
        "Sorry, I encountered an error searching through your meetings"
      );
    }
  } catch (error) {
    console.error("app mention handler error:", error);
    await say("Sorry, something went wrong. Please try again");
  }
});

/**
 * Handle regular messages
 */
app.message(async ({ message, say, client }) => {
  try {
    // Filter out irrelevant messages:
    // - Bot messages (to avoid loops)
    // - Messages without user property
    // - Messages without text property
    // - Messages with no user ID
    // - Messages from bot users (IDs starting with 'B')
    if (
      message.subtype === "bot_message" ||
      !("user" in message) ||
      !("text" in message) ||
      !message.user ||
      message.user.startsWith("B")
    ) {
      return;
    }

    const authTest = await client.auth.test();
    if (message.user === authTest.user_id) {
      return;
    }

    // Skip messages that mention the bot - those are handled by app_mention event
    const text = message.text || "";
    if (text.includes(`<@${authTest.user_id}>`)) {
      return;
    }

    const eventId = `message-${message.channel}-${message.user}`;
    const eventTs = message.ts;

    if (isDuplicateEvent(eventId, eventTs)) {
      return;
    }

    const slackUserId = message.user;
    const cleanText = text.replace(/<@[^>]+>/g, "").trim();

    if (!cleanText) {
      await say("👋 Hi! Ask me anything about your meetings.");
      return;
    }

    const userInfo = await client.users.info({ user: slackUserId });
    const userEmail = userInfo.user?.profile?.email;

    if (!userEmail) {
      await say(
        "Sorry, I can't access your email. Please make sure your Slack email is visible."
      );
      return;
    }

    // Find user in database by email
    const user = await prisma.user.findFirst({
      where: { email: userEmail },
    });

    // User not found in database - prompt to sign up
    if (!user) {
      await say("Account not found. Please sign up first!");
      return;
    }

    // Extract team ID from bot authentication
    const { team_id: teamId } = authTest;
    // Update user's Slack connection info in database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        slackUserId: slackUserId,
        slackTeamId: teamId as string,
        slackConnected: true,
      },
    });

    // Indicate that the bot is processing the query
    await say("🤖 Searching through your meetings...");

    // Call internal RAG API to generate response based on user's meeting data
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/rag/chat-all`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: cleanText,
          userId: user.id,
        }),
      }
    );

    // Throw error if RAG API call failed
    if (!response.ok) {
      throw new Error(`RAG API failed: ${response.status}`);
    }

    // Parse the API response
    const data = await response.json();

    // Send formatted response if answer exists, otherwise send error message
    if (data.answer) {
      await say({
        text: "Meeting Assistant Response",
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `🤖 *Meeting Assistant*\n\n${data.answer}`,
            },
          },
        ],
      });
    } else {
      await say(
        "Sorry, I encountered an error searching through your meetings"
      );
    }
  } catch (error) {
    console.error("message handler error:", error);
    await say("Sorry, something went wrong. Please try again");
  }
});

/**
 * Main webhook endpoint for handling all Slack events.
 *
 * This Next.js API route serves as the entry point for Slack webhooks.
 * It handles:
 * 1. Slack's URL verification challenge during app installation.
 * 2. Signature verification to ensure requests are from Slack.
 * 3. Event processing by delegating to the Bolt app instance.
 *
 * Security: Validates Slack signature using timestamp and signing secret.
 * Error handling: Returns appropriate HTTP status codes and error messages.
 */
export async function POST(req: NextRequest) {
  try {
    // Get raw request body for signature verification
    const body = await req.text();
    const bodyJson = JSON.parse(body);

    // Handle Slack's URL verification challenge during app setup
    if (bodyJson.type === "url_verification") {
      return NextResponse.json({ challenge: bodyJson.challenge });
    }

    // Extract signature and timestamp headers for verification
    const signature = req.headers.get("x-slack-signature");
    const timestamp = req.headers.get("x-slack-request-timestamp");

    // Reject requests missing required security headers
    if (!signature || !timestamp) {
      return NextResponse.json({ error: "missing signature" }, { status: 401 });
    }

    // Verify request authenticity using Slack's signature
    if (!verifySlackSignature(body, signature, timestamp)) {
      return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    }

    await app.processEvent({
      body: bodyJson,
      ack: async () => {},
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
