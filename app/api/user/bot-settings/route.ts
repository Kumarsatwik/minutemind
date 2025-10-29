/**
 * API Route: GET /api/user/bot-settings
 *
 * Fetches the authenticated user's bot settings from the database.
 * Returns bot name, avatar URL, and current subscription plan.
 *
 * Authentication: Requires a valid Clerk user session.
 *
 * Response codes:
 * - 200: User bot settings
 * - 401: Unauthorized (user not authenticated)
 * - 500: Internal server error
 */

import prisma from "@/lib/db"; // Prisma database client for interacting with the database
import { currentUser } from "@clerk/nextjs/server"; // Clerk server-side authentication helper
import { NextResponse } from "next/server"; // Next.js server response utilities

/**
 * GET /api/user/bot-settings
 *
 * Retrieves the current user's bot settings including bot name, avatar URL, and subscription plan.
 * This endpoint is called by the frontend settings page to display current bot configuration.
 *
 * @returns {Promise<NextResponse>} JSON response containing bot settings or error message
 */
export async function GET() {
  try {
    // Authenticate the current user using Clerk
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // Fetch user data from database using Clerk ID, selecting only required fields
    const dbUser = await prisma.user.findUnique({
      where: {
        clerkId: user.id,
      },
      select: {
        botName: true,
        botImageUrl: true,
        currentPlan: true,
      },
    });

    // Return bot settings with fallback values for null database fields
    return NextResponse.json({
      botName: dbUser?.botName || "MinuteMind bot",
      botImageUrl: dbUser?.botImageUrl || "",
      plan: dbUser?.currentPlan || "free",
    });
  } catch (error) {
    // Log any unexpected errors and return a generic internal server error
    console.error("Error fetching bot settings:", error);
    return NextResponse.json(
      { error: "internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/bot-settings
 *
 * Updates the current user's bot settings. Accepts partial updates.
 * Body: { botName?: string; botImageUrl?: string }
 *
 * @returns {Promise<NextResponse>} JSON response with updated bot settings or error
 */
export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { botName, botImageUrl } = body as {
      botName?: unknown;
      botImageUrl?: unknown;
    };

    const updates: { botName?: string; botImageUrl?: string } = {};
    if (typeof botName === "string") {
      updates.botName = botName.trim();
    }
    if (typeof botImageUrl === "string") {
      updates.botImageUrl = botImageUrl.trim();
    }

    if (!updates.botName && !updates.botImageUrl) {
      return NextResponse.json(
        { error: "no valid fields to update" },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { clerkId: user.id },
      data: updates,
      select: {
        botName: true,
        botImageUrl: true,
        currentPlan: true,
      },
    });

    return NextResponse.json({
      botName: updated.botName || "MinuteMind bot",
      botImageUrl: updated.botImageUrl || "",
      plan: updated.currentPlan || "free",
    });
  } catch (error) {
    console.error("Error updating bot settings:", error);
    return NextResponse.json(
      { error: "internal server error" },
      { status: 500 }
    );
  }
}

// Handle CORS preflight if the client sends an OPTIONS request
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
