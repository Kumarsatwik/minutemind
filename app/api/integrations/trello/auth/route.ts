import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * GET handler - Initiates Trello OAuth authorization flow.
 * Redirects user to Trello authorization page where they can grant
 * read/write permissions to the application.
 * @returns Redirect response to Trello OAuth authorization URL
 */
export async function GET() {
  // Authenticate user with Clerk
  const { userId } = await auth();
  if (!userId) {
    // Redirect to sign-in page if user is not authenticated
    return NextResponse.json(
      new URL("/sign-in", process.env.NEXT_PUBLIC_APP_URL)
    );
  }

  // Get Trello API key from environment variables
  const apiKey = process.env.TRELLO_API_KEY;

  // Construct callback URL for after authorization
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/trello/callback`;

  // Build Trello OAuth authorization URL with required parameters:
  // - expiration=never: Token never expires
  // - scope=read,write: Request read and write permissions
  // - response_type=token: Return token in URL fragment
  // - key: Trello API key
  // - return_url: Where to redirect after authorization
  const authUrl = `https://trello.com/1/authorize?expiration=never&scope=read,write&response_type=token&key=${apiKey}&return_url=${encodeURIComponent(
    redirectUri
  )}`;

  // Redirect user to Trello authorization page
  return NextResponse.redirect(authUrl);
}
