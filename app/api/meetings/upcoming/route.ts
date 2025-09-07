import prisma from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const now = new Date();

    const upcomingMeetings = await prisma.meeting.findMany({
      where: {
        userId: user.id,
        startTime: { gte: now },
        isFromCalendar: true,
      },
      orderBy: {
        startTime: "asc",
      },
      take: 10,
    });

    const events = upcomingMeetings.map((meeting) => ({
      id: meeting.calendarEventId || meeting.id,
      summary: meeting.title,
      start: {
        dateTime: meeting.startTime.toISOString(),
      },
      end: {
        dateTime: meeting.endTime.toISOString(),
      },
      attendees: meeting.attendees ? JSON.parse(String(meeting.attendees)) : [],
      hangoutLink: meeting.meetingUrl,
      conferenceData: meeting.meetingUrl
        ? { entryPoints: [{ uri: meeting.meetingUrl }] }
        : null,
      botScheduled: meeting.botScheduled,
      meetingId: meeting.id,
    }));

    return NextResponse.json({
      events,
      connected: user.calendarConnected,
      source: "database",
    });
  } catch (error) {
    console.error("Error fetching upcoming meetings:", error);
    return NextResponse.json(
      { error: "Internal server error", events: [], connected: false },
      { status: 500 }
    );
  }
}
