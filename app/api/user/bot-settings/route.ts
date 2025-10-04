// API route for managing user bot settings
// Import Prisma client for database operations
import prisma from "@/lib/db";
// Import currentUser from Clerk for user authentication
import { currentUser } from "@clerk/nextjs/server";
// Import NextResponse for HTTP responses
import { NextResponse } from "next/server";

// GET handler to retrieve the current user's bot settings
export async function GET() {
  try {
    // Authenticate the current user using Clerk
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // Fetch user data from the database
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

    // Return the bot settings with defaults
    return NextResponse.json({
      botName: dbUser?.botName || "Meeting Bot",
      botImageUrl: dbUser?.botImageUrl || null,
      plan: dbUser?.currentPlan || "free",
    });
  } catch (error) {
    // Log the error and return a 500 response
    console.error("error fetching bot settings:", error);
    return NextResponse.json(
      { error: "internal server error" },
      { status: 500 }
    );
  }
}

// POST handler to update the current user's bot settings
export async function POST(request: Request) {
  try {
    // Authenticate the current user using Clerk
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // Parse the request body for bot settings
    const { botName, botImageUrl } = await request.json();

    // Update the user data in the database
    await prisma.user.update({
      where: {
        clerkId: user.id,
      },
      data: {
        botName: botName || "Meeting Bot",
        botImageUrl: botImageUrl,
      },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    // Log the error and return a 500 response
    console.error("error saving bot settings:", error);
    return NextResponse.json(
      { error: "internal server error" },
      { status: 500 }
    );
  }
}
