import { UserIntegration } from "@prisma/client";
import { refreshJiraToken } from "./jira/refreshToken";
import { refreshToken as refreshAsanaToken } from "./asana/refreshtoken";

/**
 * Refreshes the access token for a user integration if it is expired or about to expire (within 5 minutes).
 * Supports platform-specific refresh logic for Jira and Asana.
 *
 * @param integration - The UserIntegration object containing platform details and token info.
 * @returns The updated integration with refreshed token if needed, otherwise the original.
 */
export async function refreshTokenIfNeeded(integration: UserIntegration) {
  // Get current time and expiration time
  const now = new Date();
  const expiresAt = integration.expiresAt;

  // Check if token is missing or expires soon (within 5 minutes buffer)
  if (!expiresAt || now >= new Date(expiresAt.getTime() - 5 * 60 * 1000)) {
    // Perform platform-specific token refresh
    switch (integration.platform) {
      case "jira":
        return await refreshJiraToken(integration);
      case "asana":
        return await refreshAsanaToken(integration);
      default:
        // No refresh needed or supported for other platforms
        return integration;
    }
  }
  // Token is still valid, return unchanged
  return integration;
}
