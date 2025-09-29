
import { NextRequest, NextResponse } from "next/server";
import { WebClient } from '@slack/web-api'
import prisma from "@/lib/db";

/**
 * Slack OAuth callback handler
 *
 * This endpoint handles the OAuth 2.0 callback from Slack after a user
 * authorizes the application. It exchanges the authorization code for
 * an access token and stores the Slack workspace installation details.
 *
 * Flow:
 * 1. User clicks "Add to Slack" → redirected to Slack OAuth
 * 2. User authorizes → Slack redirects to this endpoint with code/state
 * 3. Exchange code for access token
 * 4. Store/update Slack installation in database
 * 5. Link user account if email matches
 * 6. Redirect back to appropriate page
 */
export async function GET(request: NextRequest) {
    try {
        // Parse OAuth callback parameters from URL
        const { searchParams } = new URL(request.url)
        const code = searchParams.get('code')        // Authorization code from Slack
        const error = searchParams.get('error')      // Error from Slack (if any)
        const state = searchParams.get('state')      // State parameter (can contain return URL)

        // Determine base URL for redirects (handle localhost vs production)
        const host = request.headers.get('host')
        const isLocal = host?.includes('localhost')
        const protocol = isLocal ? 'http' : 'https'
        const baseUrl = `${protocol}://${host}`

        // Handle OAuth errors from Slack
        if (error) {
            console.error('slack oauth error:', error)
            return NextResponse.redirect(`${baseUrl}/?slack=error`)
        }

        // Validate required authorization code
        if (!code) {
            return NextResponse.json({ error: 'no authorization code' }, { status: 400 })
        }

        // Construct redirect URI for token exchange (must match Slack app settings)
        const redirectUri = `${baseUrl}/api/slack/oauth`

        // Exchange authorization code for access token
        const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                client_id: process.env.SLACK_CLIENT_ID!,
                client_secret: process.env.SLACK_CLIENT_SECRET!,
                code: code,
                redirect_uri: redirectUri
            })
        })

        const tokenData = await tokenResponse.json()

        // Handle token exchange errors
        if (!tokenData.ok) {
            console.error('failed to exchange oauth code:', tokenData.error)
            return NextResponse.redirect(`${baseUrl}/?slack=error`)
        }

        // Store or update Slack installation in database
        // Using unchecked operations to handle 'active' field type issues
        await (prisma.slackInstallation as any).upsert({
            where: {
                teamId: tokenData.team.id  // Unique identifier for Slack workspace
            },
            update: {
                teamName: tokenData.team.name,           // Workspace name
                botToken: tokenData.access_token,        // Bot access token for API calls
                installedBy: tokenData.authed_user.id,   // User who authorized the app
                installerName: tokenData.authed_user.name || 'Unknown', // Display name
                updatedAt: new Date(),
                active: true  // Mark installation as active
            },
            create: {
                teamId: tokenData.team.id,
                teamName: tokenData.team.name,
                botToken: tokenData.access_token,
                installedBy: tokenData.authed_user.id,
                installerName: tokenData.authed_user.name || 'Unknown',
                active: true,  // New installations are active by default
            }
        })

        // Ensure the installation is marked as active (separate update for reliability)
        await (prisma.slackInstallation as any).update({
            where: {
                teamId: tokenData.team.id
            },
            data: {
                active: true
            }
        })

        // Attempt to link the Slack user to an existing user account
        try {
            const slack = new WebClient(tokenData.access_token)
            const userInfo = await slack.users.info({ user: tokenData.authed_user.id })

            // If we found a matching email, link the Slack account to the user
            if (userInfo.user?.profile?.email) {
                await prisma.user.updateMany({
                    where: {
                        email: userInfo.user.profile.email
                    },
                    data: {
                        slackUserId: tokenData.authed_user.id,  // Slack user ID
                        slackTeamId: tokenData.team.id,        // Slack workspace ID
                        slackConnected: true                   // Mark as connected
                    }
                })
            }
        } catch (error) {
            console.error('failed to link user during oauth:', error)
            // Non-critical error - continue with installation success
        }

        // Handle return URL from state parameter (for post-installation redirects)
        const returnTo = state?.startsWith('return=') ? state.split('return=')[1] : null

        // Redirect based on state parameter or default to home page
        if (returnTo === 'integrations') {
            return NextResponse.redirect(`${baseUrl}/integrations?setup=slack`)
        } else {
            return NextResponse.redirect(`${baseUrl}/?slack=installed`)
        }
    } catch (error) {
        // Handle unexpected errors during OAuth process
        console.error('slack oauth error', error)

        // Determine base URL for error redirect
        const host = request.headers.get('host')
        const isLocal = host?.includes('localhost')
        const protocol = isLocal ? 'http' : 'https'
        const baseUrl = `${protocol}://${host}`

        return NextResponse.redirect(`${baseUrl}/?slack=error`)
    }
}
