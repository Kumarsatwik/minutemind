import prisma from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await prisma.userIntegration.delete({
      where: {
        userId_platform: {
          userId,
          platform: "jira",
        },
      },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("error disconnecting jira", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
