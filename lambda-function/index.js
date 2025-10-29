/**
 * Lambda function to synchronize Google Calendars and schedule AI bots for upcoming meetings.
 * This function handles:
 * - Syncing calendar events from Google for all users with connected calendars
 * - Handling token refreshes for Google OAuth
 * - Processing calendar events (creation/updates/deletions)
 * - Scheduling AI meeting bots for upcoming meetings based on user limits
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Main Lambda handler function
 * Orchestrates calendar syncing and bot scheduling for all users
 */
export const handler = async (event) => {
  try {
    // Sync all user calendars with their Google Calendar data
    await syncAllUserCalendars();

    // Schedule bots for meetings starting within the next 5 minutes
    await scheduleBotsForUpcomingMeetings();

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "success" }),
    };
  } catch (error) {
    console.error("error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "internal server error",
        details: error.message,
      }),
    };
  } finally {
    await prisma.$disconnect();
  }
};

/**
 * Synchronize all user calendars with their Google Calendar data
 * Iterates through all users with connected calendars and syncs their events
 */
async function syncAllUserCalendars() {
  // Find all users with connected calendars and valid access tokens
  const users = await prisma.user.findMany({
    where: {
      calendarConnected: true,
      googleAccessToken: {
        not: null,
      },
    },
  });

  // Process each user's calendar independently
  for (const user of users) {
    try {
      await syncUserCalendar(user);
    } catch (error) {
      console.error(`sync failed for ${user.id}:`, error.message);
    }
  }
}

/**
 * Synchronize a single user's Google Calendar
 * Fetches events from Google Calendar API and processes them (create/update/delete)
 */
async function syncUserCalendar(user) {
  try {
    let accessToken = user.googleAccessToken;

    const now = new Date();
    const tokenExpiry = new Date(user.googleTokenExpiry);
    const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);

    // Refresh access token if it expires within 10 minutes
    if (tokenExpiry <= tenMinutesFromNow) {
      accessToken = await refreshGoogleToken(user);
      if (!accessToken) {
        return; // Skip sync if token refresh failed
      }
    }

    // Fetch calendar events for the next 7 days
    const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
        `timeMin=${now.toISOString()}&` +
        `timeMax=${sevenDays.toISOString()}&` +
        `singleEvents=true&orderBy=startTime&showDeleted=true`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        // Invalid token - disconnect calendar
        await prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            calendarConnected: false,
          },
        });
        return;
      }
      throw new Error(`Calendar API failed: ${response.status}`);
    }

    const data = await response.json();
    const events = data.items || [];

    // Get existing calendar events from database for this user
    const existingEvents = await prisma.meeting.findMany({
      where: {
        userId: user.id,
        isFromCalendar: true,
        startTime: {
          gte: now,
        },
      },
    });

    const googleEventIds = new Set();

    // Process each Google Calendar event
    for (const event of events) {
      if (event.status === "cancelled") {
        // Handle deleted/cancelled events
        await handleDeletedEvent(event);
        continue;
      }
      googleEventIds.add(event.id);
      // Create or update the meeting in database
      await processEvent(user, event);
    }

    // Find events that exist in DB but not in Google Calendar (deleted)
    const deletedEvents = existingEvents.filter(
      (dbEvent) => !googleEventIds.has(dbEvent.calendarEventId)
    );

    // Remove deleted events from database
    if (deletedEvents.length > 0) {
      for (const deletedEvent of deletedEvents) {
        await handleDeletedEventFromDB(user, deletedEvent);
      }
    }
  } catch (error) {
    console.error(`calendar error for ${user.id}:`, error.message);
    // Disconnect calendar if token issues
    if (error.message.includes("401") || error.message.includes("403")) {
      await prisma.user.update({
        where: {
          id: user.id,
        },
          data: {
          calendarConnected: false,
        },
      });
    }
  }
}

/**
 * Refresh Google OAuth access token using refresh token
 * Updates user's access token and expiry in database
 */
async function refreshGoogleToken(user) {
  try {
    // Cannot refresh without refresh token
    if (!user.googleRefreshToken) {
      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          calendarConnected: false,
          googleAccessToken: null,
        },
      });
      return null;
    }

    // Call Google OAuth token endpoint to refresh access token
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: user.googleRefreshToken,
        grant_type: "refresh_token",
      }),
    });
    const tokens = await response.json();

    // Handle failed token refresh
    if (!tokens.access_token) {
      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          calendarConnected: false,
        },
      });
      return null;
    }

    // Update user with new access token and expiry
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        googleAccessToken: tokens.access_token,
        googleTokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
      },
    });
    return tokens.access_token;
  } catch (error) {
    console.error(`token refresh error for ${user.clerkId}: `, error);
    // Disconnect calendar on refresh failure
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        calendarConnected: false,
      },
    });
    return null;
  }
}

/**
 * Handle deletion of a Google Calendar event
 * Removes the corresponding meeting from database if it exists
 */
async function handleDeletedEvent(event) {
  try {
    const exsistingMeeting = await prisma.meeting.findUnique({
      where: {
        calendarEventId: event.id,
      },
    });
    if (exsistingMeeting) {
      await prisma.meeting.delete({
        where: {
          calendarEventId: event.id,
        },
      });
    }
  } catch (error) {
    console.error("error deleting event:", error.message);
  }
}

/**
 * Handle deletion of events that are in DB but not in Google Calendar
 * Removes meetings that were deleted in Google but still exist in DB
 */
async function handleDeletedEventFromDB(dbEvent) {
  await prisma.meeting.delete({
    where: {
      id: dbEvent.id,
    },
  });
}

/**
 * Process a Google Calendar event - create or update meeting in database
 * Extracts meeting details and handles duplicates/updates
 */
async function processEvent(user, event) {
  // Extract meeting URL from Google Calendar event
  const meetingUrl =
    event.hangoutLink || event.conferenceData?.entryPoints?.[0]?.uri;

  // Skip events without meeting URL or start time
  if (!meetingUrl || !event.start?.dateTime) {
    return;
  }

  // Prepare event data for database
  const eventData = {
    calendarEventId: event.id,
    userId: user.id,
    title: event.summary || "Untitled Meeting",
    description: event.description || null,
    meetingUrl: meetingUrl,
    startTime: new Date(event.start.dateTime),
    endTime: new Date(event.end.dateTime),
    attendees: event.attendees
      ? JSON.stringify(event.attendees.map((a) => a.email))
      : null,
    isFromCalendar: true,
    botScheduled: true,
  };

  try {
    // Check if meeting already exists
    const exsistingMeeting = await prisma.meeting.findUnique({
      where: {
        calendarEventId: event.id,
      },
    });

    if (exsistingMeeting) {
      // Track what changed for logging/notifications (if needed)

      // Prepare update data
      const updateData = {
        title: eventData.title,
        description: eventData.description,
        meetingUrl: eventData.meetingUrl,
        startTime: eventData.startTime,
        endTime: eventData.endTime,
        attendees: eventData.attendees,
      };

      // Only update botScheduled if bot hasn't been sent yet
      if (!exsistingMeeting.botSent) {
        updateData.botScheduled = eventData.botScheduled;
      }

      // Update existing meeting
      await prisma.meeting.update({
        where: {
          calendarEventId: event.id,
        },
        data: updateData,
      });
    } else {
      // Create new meeting
      await prisma.meeting.create({
        data: eventData,
      });
    }
  } catch (error) {
    console.error(`error for ${event.id}:`, error.message);
  }
}

/**
 * Schedule AI bots for upcoming meetings that start within 5 minutes
 * Fetches meetings, checks user limits, and calls MeetingBaas API to join bots
 */
async function scheduleBotsForUpcomingMeetings() {
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  // Find meetings starting within 5 minutes that need bots
  const upcomingMeetings = await prisma.meeting.findMany({
    where: {
      startTime: {
        gte: now,
        lte: fiveMinutesFromNow,
      },
      botScheduled: true,
      botSent: false,
      meetingUrl: {
        not: null,
      },
    },
    include: {
      user: true,
    },
  });

  // Process each meeting
  for (const meeting of upcomingMeetings) {
    try {
      // Check if user can schedule this meeting (plan limits)
      const canSchedule = await canUserScheduleMeeting(meeting.user);

      if (!canSchedule.allowed) {
        // Mark as sent to prevent retry attempts
        await prisma.meeting.update({
          where: {
            id: meeting.id,
          },
          data: {
            botSent: true,
            botJoinedAt: new Date(),
          },
        });
        continue;
      }

      // Prepare request body for MeetingBaas API
      const requestBody = {
        meeting_url: meeting.meetingUrl,
        bot_name: meeting.user.botName || "AI Noteetaker",
        reserved: false,
        recording_mode: "speaker_view",
        speech_to_text: { provider: "Default" },
        webhook_url: process.env.WEBHOOK_URL,
        extra: {
          meeting_id: meeting.id,
          user_id: meeting.userId,
        },
      };

      // Include bot image if available
      if (meeting.user.botImageUrl) {
        requestBody.bot_image = meeting.user.botImageUrl;
      }

      // Call MeetingBaas API to schedule bot
      const response = await fetch("https://api.meetingbaas.com/bots", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-meeting-baas-api-key": process.env.MEETING_BAAS_API_KEY,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`meeting baas api req failed: ${response.status}`);
      }

      const data = await response.json();

      // Update meeting with bot details
      await prisma.meeting.update({
        where: {
          id: meeting.id,
        },
        data: {
          botSent: true,
          botId: data.bot_id,
          botJoinedAt: new Date(),
        },
      });

      // Increment user's meeting usage counter
      await incrementMeetingUsage(meeting.userId);
    } catch (error) {
      console.error(`bot failed for ${meeting.title}: `, error.message);
    }
  }
}

/**
 * Check if a user is allowed to schedule a bot for this meeting
 * Validates subscription status and monthly meeting limits
 */
async function canUserScheduleMeeting(user) {
  try {
    // Define plan limits
    const PLAN_LIMITS = {
      free: { meetings: 0 },
      starter: { meetings: 10 },
      pro: { meetings: 30 },
      premium: { meetings: -1 }, // Unlimited
    };
    const limits = PLAN_LIMITS[user.currentPlan] || PLAN_LIMITS.free;

    // Free plan or inactive subscription not allowed
    if (user.currentPlan === "free" || user.subscriptionStatus !== "active") {
      return {
        allowed: false,
        reason: `${user.currentPlan === "free" ? "Free plan" : "Inactive subscription"} - upgrade required`,
      };
    }

    // Check monthly meeting limit (premium = unlimited)
    if (limits.meetings !== -1 && user.meetingsThisMonth >= limits.meetings) {
      return {
        allowed: false,
        reason: `Monthly limit reached (${user.meetingsThisMonth}/${limits.meetings})`,
      };
    }

    return {
      allowed: true,
    };
  } catch (error) {
    console.error("error checking meeting limits:", error);
    return {
      allowed: false,
      reason: "Error checking limits",
    };
  }
}

/**
 * Increment the user's monthly meeting usage counter
 * Called after successfully scheduling a bot
 */
async function incrementMeetingUsage(userId) {
  try {
    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        meetingsThisMonth: {
          increment: 1,
        },
      },
    });
  } catch (error) {
    console.error("error incrementing meeting usage:", error);
  }
}
