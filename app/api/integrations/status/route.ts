import prisma from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const integrations = await prisma.userIntegration.findMany({
      where: {
        userId: user.id,
      },
    });

    const allPlatforms = [
      { platform: "trello", name: "Trello", logo: "📋", connected: false },
      { platform: "jira", name: "Jira", logo: "🎯", connected: false },
      { platform: "asana", name: "Asana", logo: "✅", connected: false },
    ];

    const results = allPlatforms.map((platform) => {
      const integration = integrations.find(
        (integration) => integration.platform === platform.platform
      );
      return {
        ...platform,
        connected: !!integration,
        boardName: integration?.boardName,
        projectName: integration?.projectName,
        channelName: undefined as string | undefined,
      };
    });

    const dbUser = await prisma.user.findFirst({
      where: {
        clerkId: user.id,
      },
    });

    if (dbUser?.slackConnected) {
      results.push({
        platform: "slack",
        name: "Slack",
        logo: "💬",
        connected: true,
        boardName: undefined,
        projectName: undefined,
        channelName: dbUser.preferredChannelName || "Not Set",
      });
    } else {
      results.push({
        platform: "slack",
        name: "Slack",
        logo: "💬",
        connected: false,
        boardName: undefined,
        projectName: undefined,
        channelName: undefined,
      });
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error fetching integrations status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
