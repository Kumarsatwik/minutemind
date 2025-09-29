import { NextRequest, NextResponse } from "next/server";

/**
 * Slack OAuth Installation Handler
 *
 * This endpoint initiates the Slack OAuth 2.0 installation flow by redirecting
 * users to Slack's authorization page. It constructs the authorization URL
 * with the required scopes and handles return URL state management.
 *
 * Flow:
 * 1. User visits this endpoint (usually from "Add to Slack" button)
 * 2. Redirect to Slack OAuth with required permissions
 * 3. User authorizes → redirected to /api/slack/oauth with code
 * 4. OAuth callback processes the authorization and stores tokens
 */
export async function GET(request: NextRequest) {
    // Parse query parameters to determine post-installation redirect
    const { searchParams } = new URL(request.url)
    const returnTo = searchParams.get('return')  // Where to redirect after installation

    // Get Slack app configuration from environment variables
    const redirectUri = process.env.SLACK_REDIRECT_URI as string

    // Create state parameter to preserve return URL through OAuth flow
    // This allows redirecting back to integrations page or other specified location
    const state = returnTo ? `return=${returnTo}` : ''

    // Construct Slack OAuth authorization URL with comprehensive permissions
    const slackInstallUrl = `https://slack.com/oauth/v2/authorize?client_id=${process.env.SLACK_CLIENT_ID}&scope=app_mentions:read,channels:read,channels:history,groups:history,groups:read,chat:write,im:history,im:read,im:write,mpim:history,mpim:read,mpim:write,users:read,users:read.email&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`

    /**
     * OAuth Scopes Explained:
     * - app_mentions:read    - Read messages that mention the bot
     * - channels:read        - Read public channel information
     * - channels:history     - Access message history in public channels
     * - groups:read/history  - Read private channel information and history
     * - chat:write          - Send messages as the bot
     * - im:*                - Read/write direct messages (DMs)
     * - mpim:*              - Read/write multi-person direct messages
     * - users:read          - Read user profiles and information
     * - users:read.email    - Read user email addresses (for account linking)
     */

    // Redirect user to Slack's OAuth authorization page
    return NextResponse.redirect(slackInstallUrl)
}
