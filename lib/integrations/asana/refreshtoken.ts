/**
 * Refreshes the Asana access token using the refresh token.
 * Updates the integration record in the database with the new tokens and expiration.
 * @param integration - The user's integration record containing the refresh token.
 * @returns The updated integration record with new tokens.
 */
import prisma from "@/lib/db";
import { UserIntegration } from "@prisma/client";

export async function refreshToken(integration: UserIntegration) {
  try {
    const response = await fetch("https://app.asana.com/-/oauth_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: process.env.ASANA_CLIENT_ID!,
        client_secret: process.env.ASANA_CLIENT_SECRET!,
        refresh_token: integration.refreshToken!,
      }),
    });
    if (!response.ok) {
      throw new Error("Failed to refresh token");
    }
    const tokenData = await response.json();
    const updatedIntegration = await prisma.userIntegration.update({
      where: { id: integration.id },
      data: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
      },
    });
    return updatedIntegration;
  } catch (error) {
    console.error("error refreshing token", error);
    throw error;
  }
}
