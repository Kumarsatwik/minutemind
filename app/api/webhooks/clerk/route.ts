import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import prisma from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const headers = {
      "svix-id": request.headers.get("svix-id") || "",
      "svix-timestamp": request.headers.get("svix-timestamp") || "",
      "svix-signature": request.headers.get("svix-signature") || "",
    };
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("Missing webhook secret");
      return new Response("Missing webhook secret", { status: 500 });
    }
    const wh = new Webhook(webhookSecret);
    try {
      wh.verify(payload, headers);
    } catch (err) {
      console.error("Error verifying webhook:", err);
      return NextResponse.json("Invalid Signature", { status: 400 });
    }

    const event = JSON.parse(payload);
    console.log("clerk webhook event:", event.type);

    if (event.type === "user.created") {
      // Handle user.created event
      const { id, email_addresses, first_name, last_name } = event.data;
      console.log("id", id);
      console.log("email_addresses", email_addresses);
      console.log("first_name", first_name);
      console.log("last_name", last_name);
      console.log("event.data", event.data);
      const primaryEmail = email_addresses?.find(
        (email) => email.id === event.data.primary_email_address_id
      )?.email_address;
      const user = await prisma.user.create({
        data: {
          id: id,
          clerkId: id,
          email: primaryEmail || null,
          name: `${first_name} ${last_name}`,
        },
      });
      console.log("user", user);
      return NextResponse.json({ message: "user created successfully" });
    }
    return NextResponse.json({ message: "webhook event received" });
  } catch (error) {
    console.error("Error handling webhook:", error);
    return NextResponse.json(
      { message: "Error handling webhook" },
      { status: 500 }
    );
  }
}
