import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";

/**
 * Interface defining the structure of an integration platform configuration.
 * Represents the state and metadata for each supported integration.
 */
export interface Integration {
  /** Unique identifier for the integration platform */
  platform: "google-calendar" | "trello" | "jira" | "asana" | "slack";
  /** Display name of the integration */
  name: string;
  /** Description of what the integration does */
  description: string;
  /** Whether the user has connected this integration */
  connected: boolean;
  /** Name of the connected Trello board (only for Trello) */
  boardName?: string;
  /** Name of the connected project (for Jira/Asana) */
  projectName?: string;
  /** Name of the connected Slack channel (only for Slack) */
  channelName?: string;
  /** Path to the integration's logo image */
  logo: string;
}

// Shared setup item and data types
type SetupItem = { id?: string; key?: string; gid?: string; name: string };
export interface SetupData {
  boards?: SetupItem[];
  channels?: SetupItem[];
  projects?: SetupItem[];
  workspaceId?: string;
}

// Setup config type used when submitting configuration
export type SetupConfig = Record<string, string | boolean | undefined>;

/**
 * Custom hook for managing third-party integrations state and operations.
 * Handles fetching integration status, OAuth connections, disconnections,
 * and setup configuration for supported platforms.
 *
 * @returns Object containing integration state and handler functions
 */
export function useIntegrations() {
  const { userId } = useAuth();

  // Default integrations configuration - defines all supported platforms
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      platform: "slack",
      name: "Slack",
      description: "Post meeting summaries to your Slack channels",
      connected: false,
      channelName: undefined,
      logo: "/slack.png",
    },
    {
      platform: "trello",
      name: "Trello",
      description: "Add action items to your Trello boards",
      connected: false,
      logo: "/trello.png",
    },
    {
      platform: "jira",
      name: "Jira",
      description: "Create tickets for development tasks and more",
      connected: false,
      logo: "/jira.png",
    },
    {
      platform: "asana",
      name: "Asana",
      description: "Sync tasks with your team projects",
      connected: false,
      logo: "/asana.png",
    },
    {
      platform: "google-calendar",
      name: "Google Calendar",
      description: "Auto-Sync meetings",
      connected: false,
      logo: "/gcal.png",
    },
  ]);

  // Loading state for initial integration data fetch
  const [loading, setLoading] = useState(true);

  // Current platform being configured in setup mode (null when not in setup)
  const [setupMode, setSetupMode] = useState<string | null>(null);

  // Data for the setup form (projects/boards/channels available for selection)
  const [setupData, setSetupData] = useState<SetupData | null>(null);

  // Loading state during setup form submission
  const [setupLoading, setSetupLoading] = useState(false);

  // Initialize integrations data and handle URL-based setup mode
  useEffect(() => {
    // Fetch integration status when user is authenticated
    if (userId) {
      fetchIntegrations();
    }

    // Check URL parameters for setup mode (e.g., ?setup=trello)
    const urlParams = new URLSearchParams(window.location.search);
    const setup = urlParams.get("setup");
    if (setup && ["trello", "jira", "asana", "slack"].includes(setup)) {
      setSetupMode(setup);
      fetchSetupData(setup);
    }
  }, [userId]);

  /**
   * Fetches the current status of all user integrations from the backend.
   * Updates the integrations state with connection status and destination details.
   */
  const fetchIntegrations = async () => {
    try {
      // Fetch general integration status
      const response = await fetch("/api/integrations/status");
      const data = (await response.json()) as Array<{
        platform: Integration["platform"];
        connected?: boolean;
        boardName?: string;
        projectName?: string;
        channelName?: string;
      }>;

      // Fetch Google Calendar status separately (different API endpoint)
      const calendarResponse = await fetch("/api/user/calendar-status");
      const calendarData = (await calendarResponse.json()) as {
        connected?: boolean;
      };

      // Update integrations state with fetched data
      setIntegrations((prev) =>
        prev.map((integration) => {
          // Special handling for Google Calendar
          if (integration.platform === "google-calendar") {
            return {
              ...integration,
              connected: calendarData.connected || false,
            };
          }

          // Find status data for this integration
          const status = data.find(
            (d) => d.platform === integration.platform
          );

          // Update integration with status data
          return {
            ...integration,
            connected: status?.connected || false,
            boardName: status?.boardName,
            projectName: status?.projectName,
            channelName: status?.channelName,
          };
        })
      );
    } catch (error) {
      console.error("error fetching integrations:", error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetches setup data for a specific platform (projects, boards, channels).
   * Used to populate the setup form with available destinations.
   * @param platform - The integration platform to fetch setup data for
   */
  const fetchSetupData = async (platform: string) => {
    try {
      const response = await fetch(`/api/integrations/${platform}/setup`);
      const data = (await response.json()) as SetupData;
      setSetupData(data);
    } catch (error) {
      console.error(`Error fetching ${platform} setup data:`, error);
    }
  };

  /**
   * Initiates the OAuth connection flow for a specific platform.
   * Redirects the user to the appropriate authorization endpoint.
   * @param platform - The integration platform to connect
   */
  const handleConnect = (platform: string) => {
    // Different platforms use different OAuth endpoints
    if (platform === "slack") {
      window.location.href = "/api/slack/install?return=integrations";
    } else if (platform === "google-calendar") {
      window.location.href = "/api/auth/google/direct-connect";
    } else {
      // Trello, Jira, Asana use the standard auth flow
      window.location.href = `/api/integrations/${platform}/auth`;
    }
  };

  /**
   * Disconnects an integration and refreshes the integration status.
   * @param platform - The integration platform to disconnect
   */
  const handleDisconnect = async (platform: string) => {
    try {
      // Google Calendar uses a different disconnect endpoint
      if (platform === "google-calendar") {
        await fetch("/api/auth/google/disconnect", {
          method: "POST",
        });
      } else {
        await fetch(`/api/integrations/${platform}/disconnect`, {
          method: "POST",
        });
      }

      // Refresh integration status after disconnection
      fetchIntegrations();
    } catch (error) {
      console.error("error disconnecting:", error);
    }
  };

  /**
   * Submits setup configuration for an integration platform.
   * Saves the destination (project/board/channel) and refreshes integration status.
   * @param platform - The integration platform being configured
   * @param config - The setup configuration (project/board/channel selection)
   */
  const handleSetupSubmit = async (platform: string, config: SetupConfig) => {
    setSetupLoading(true);
    try {
      // Submit setup configuration to backend
      const response = await fetch(`/api/integrations/${platform}/setup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        // Clear setup mode and data on success
        setSetupMode(null);
        setSetupData(null);

        // Refresh integration status and clean up URL
        fetchIntegrations();
        window.history.replaceState({}, "", "/integrations");
      }
    } catch (error) {
      console.error("error saving setup:", error);
    } finally {
      setSetupLoading(false);
    }
  };

  return {
    integrations,
    loading,
    setupMode,
    setSetupMode,
    setupData,
    setSetupData,
    setupLoading,
    setSetupLoading,
    fetchIntegrations,
    fetchSetupData,
    handleConnect,
    handleDisconnect,
    handleSetupSubmit,
  };
}
