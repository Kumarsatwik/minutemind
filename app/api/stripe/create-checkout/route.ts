// API route for creating Stripe checkout sessions for subscription payments
import prisma from "@/lib/db";
import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// Initialize Stripe with the secret key from environment variables
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-09-30.clover",
});

// POST handler to create a checkout session
export async function POST(request: NextRequest) {
  try {
    // Authenticate the user using Clerk
    const { userId } = await auth();

    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json({ error: "not authenticated" }, { status: 401 });
    }

    // Parse request body to get price ID and plan name
    const { priceId, planName } = await request.json();

    // Validate required fields
    if (!priceId) {
      return NextResponse.json(
        { error: "price Id is required" },
        { status: 400 }
      );
    }

    // Check if user exists in database
    let dbUser = await prisma.user.findUnique({
      where: {
        clerkId: userId,
      },
    });

    // Ensure user has email
    if (!user.primaryEmailAddress?.emailAddress) {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }
    const emailAddress = user.primaryEmailAddress?.emailAddress as string;

    // Create user in database if not exists
    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: {
          id: userId,
          clerkId: userId,
          email: emailAddress,
          name: user.fullName,
        },
      });
    }

    // Get existing Stripe customer ID from database
    let stripeCustomerId = dbUser?.stripeCustomerId;

    // Create new Stripe customer if not exists
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: emailAddress,
        name: user.fullName || undefined,
        metadata: {
          clerkUserId: userId,
          dbUserId: dbUser.id,
        },
      });

      stripeCustomerId = customer.id;

      // Update database with new Stripe customer ID
      await prisma.user.update({
        where: {
          id: dbUser.id,
        },
        data: {
          stripeCustomerId,
        },
      });
    }

    // Create Stripe checkout session for subscription
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/home?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
      metadata: {
        clerkUserId: userId,
        dbUserId: dbUser.id,
        planName,
      },
      subscription_data: {
        metadata: {
          clerkUserId: userId,
          dbUserId: dbUser.id,
          planName,
        },
      },
    });

    // Return the checkout session URL to client
    return NextResponse.json({ url: session.url });
  } catch (error) {
    // Handle any errors during the process
    console.error("stripe checkout error:", error);
    return NextResponse.json(
      { error: "failed to create checkout session" },
      { status: 500 }
    );
  }
}
