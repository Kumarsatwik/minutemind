import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";
import MeetingSummaryEmailNew from "@/app/components/email/meeting-summary";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
const mailerSend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY!,
});

const sentFrom = new Sender("info@minutemind.site", "MinuteMind");


interface EmailData {
  userEmail: string;
  userName: string;
  meetingTitle: string;
  summary: string;
  actionItems: Array<{
    id: number;
    text: string;
  }>;
  meetingId: string;
  meetingDate: string;
}

export async function sendMeetingSummaryEmail(data: EmailData) {
  try {
    const { userEmail, userName, meetingTitle, summary, actionItems, meetingId, meetingDate } = data;
    const htmlContent = renderToStaticMarkup(
      React.createElement(MeetingSummaryEmailNew, {
        userName,
        meetingTitle,
        summary,
        actionItems,
        meetingId,
        meetingDate,
      })
    );
    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo([new Recipient(userEmail, userName)])
      .setReplyTo(sentFrom)
      .setSubject(`Meeting Summary: ${meetingTitle}`)
      .setHtml(htmlContent)
      .setText(`
            Hello ${userName},
            Here is the summary of your meeting:
            ${summary}
            Action Items:
            ${actionItems.map((item) => `${item.id}. ${item.text}`).join("\n")}
            Meeting ID: ${meetingId}
            Meeting Date: ${meetingDate}
            Regards,
            MinuteMind
        `);
    await mailerSend.email.send(emailParams);
  } catch (error) {
    console.error("error sending meeting summary email:", error);
  }
}
