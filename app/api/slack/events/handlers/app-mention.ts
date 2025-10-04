import prisma from "@/lib/db"; // Database client for user operations
import { isDuplicateEvent } from "../utils/deduplicate"; // Duplicate event prevention utility

interface SlackEvent {
  channel: string;
  user?: string;
  text?: string;
  event_ts?: string;
  ts?: string;
}

interface SlackContext {
  event: SlackEvent;
  say: (message: string | object) => Promise<void>;
  client: {
    auth: {
      test: () => Promise<{ user_id: string; team_id: string }>;
    };
    users: {
      info: (params: { user: string }) => Promise<{
        user?: {
          profile?: {
            email?: string;
          };
        };
      }>;
    };
  };
}

/**
 * Handles Slack app mention events (@bot mentions)
 * Processes user questions about meetings using RAG API and responds in Slack
 *
 * @param context - Slack event context containing event, say function, and client
 */
export async function handleAppMention(context: SlackContext) {
  const { event, say, client } = context;
  try {
    // Create unique event identifier for duplicate prevention
    const eventId = `app_mention-${event.channel}-${event.user}`;
    const eventTs = event.event_ts || event.ts || "";

    // Check for duplicate events and return early if already processed
    if (eventTs && isDuplicateEvent(eventId, eventTs)) {
      return;
    }

    // Verify the bot's identity and ignore self-mentions
    const authTest = await client.auth.test();
    if (event.user === authTest.user_id) {
      return; // Ignore messages from the bot itself
    }

    // Extract Slack user ID from the event
    const slackUserId = event.user;
    if (!slackUserId) {
      return; // Exit if no user ID provided
    }

    // Extract and clean the message text (remove @mentions)
    const text = event.text || "";
    const cleanText = text.replace(/<@[^>]+>/g, "").trim();

    // Handle empty messages with helpful guidance
    if (!cleanText) {
      await say(
        "👋 Hi! Ask me anything about your meetings. For example:\n· What were the key decisions in yesterday's meeting?\n· Summarize yesterday's meeting action items\n· Who attended the product planning session?"
      );
      return;
    }

    // Get user's email from their Slack profile
    const userInfo = await client.users.info({ user: slackUserId });
    const userEmail = userInfo.user?.profile?.email;

    // Handle cases where email is not accessible
    if (!userEmail) {
      await say(
        "Sorry, I cant access ur email. Please make sure your slack email is visible on your profile settings."
      );
      return;
    }

    // Look up user in database by email
    const user = await prisma.user.findFirst({
      where: {
        email: userEmail,
      },
    });

    // Handle new users who need to sign up first
    if (!user) {
      await say({
        text: "Account not found",
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `👋 Hi! I coant find an accoutn with email *${userEmail}*.\n\nPlease sign up first, then you can chat with me here!`,
            },
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: "Once you have an account, I can help you with meeting summaries, action items, and more!",
              },
            ],
          },
        ],
      });
      return;
    }

    // Update user's Slack connection information in database
    const { team_id: teamId } = await client.auth.test();
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        slackUserId: slackUserId,
        slackTeamId: teamId as string,
        slackConnected: true,
      },
    });

    // Acknowledge that we're processing the request
    await say("🤖 Searching through your meetings...");

    // Make request to RAG API for meeting-related queries
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/rag/chat-all`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: cleanText,
          userId: user.id,
        }),
      }
    );

    // Handle RAG API errors
    if (!response.ok) {
      throw new Error(`RAG API failed: ${response.status}`);
    }

    const data = await response.json();

    // Send formatted response if RAG API returned an answer
    if (data.answer) {
      const answer = data.answer;

      await say({
        text: "Meeting Assistant Response",
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `🤖 *Meeting Assistant*\n\n${answer}`,
            },
          },
          {
            type: "divider",
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `💡 Ask me about meetings, decisions, action items or participants`,
              },
            ],
          },
        ],
      });
    } else {
      // Handle cases where RAG API didn't return an answer
      await say(
        "sorry, i encountered an error searching through your meetings"
      );
    }
  } catch (error) {
    // Log error and send user-friendly error message
    console.error("app mention handler error:", error);
    await say("sory, something went wrong. please try again");
  }
}
