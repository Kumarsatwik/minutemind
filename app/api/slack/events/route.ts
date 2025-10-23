import { App } from "@slack/bolt"; // Slack Bolt framework for event handling
import { authorizeSlack } from "./utils/slack-auth"; // Custom Slack authorization utility
import { handleAppMention } from "./handlers/app-mention"; // Handler for @bot mentions
import { handleMessage } from "./handlers/message"; // Handler for regular messages
import { NextRequest, NextResponse } from "next/server"; // Next.js API types
import { verifySlackSignature } from "./utils/verifySlackSignature"; // Security signature verification

/**
 * Initialize Slack Bolt application with security configuration
 * Sets up event handling with custom authorization and signature verification
 */
const app = new App({
  signingSecret: process.env.SLACK_SIGNING_SECRET!, // Slack signing secret for request verification
  authorize: authorizeSlack, // Custom authorization function for Slack API calls
});

/**
 * Register Slack event handlers
 * - App mentions (@bot) are handled by handleAppMention
 * - Regular messages are handled by handleMessage
 */
app.event("app_mention", handleAppMention); // Handle @bot mentions with RAG integration
app.message(handleMessage); // Handle regular messages for conversational experience

/**
 * Main webhook endpoint for handling all Slack events
 * Receives and processes Slack events with security verification
 *
 * @param req - Next.js request object containing Slack event data
 * @returns Response with appropriate status code and message
 */
export async function POST(req: NextRequest) {
  try {
    // Parse the raw request body as text
    const body = await req.text();
    const bodyJson = JSON.parse(body);

    // Handle Slack URL verification challenge (required for webhook setup)
    if (bodyJson.type === "url_verification") {
      return NextResponse.json({ challenge: bodyJson.challenge });
    }

    // Extract Slack security headers for signature verification
    const signature = req.headers.get("x-slack-signature");
    const timestamp = req.headers.get("x-slack-request-timestamp");

    // Validate required security headers are present
    if (!signature || !timestamp) {
      return NextResponse.json({ error: "missing signature" }, { status: 401 });
    }

    // Verify the request signature to ensure it comes from Slack
    if (!verifySlackSignature(body, signature, timestamp)) {
      return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    }

    // Process the verified Slack event using the configured handlers
    await app.processEvent({
      body: bodyJson,
      ack: async () => {}, // Acknowledge function (no-op for webhooks)
    });

    // Return success response to Slack
    return NextResponse.json({ ok: true });
  } catch (error) {
    // Log error for debugging and return generic error response
    console.error("POST error:", error);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
