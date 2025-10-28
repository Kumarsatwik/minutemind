import prisma from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

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

    return NextResponse.json({
      botName: dbUser?.botName || "MinuteMind bot",
      botImageUrl: dbUser?.botImageUrl || "",
      currentPlan: dbUser?.currentPlan || "free",
    });
  } catch (error) {
    console.error("Error fetching bot settings:", error);
    return NextResponse.json(
      { error: "internal server error" },
      { status: 500 }
    );
  }
}
