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
