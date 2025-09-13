import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";

// Interface defining the structure of an integration platform
import { ProjectData, SetupFormConfig } from "../components/SetupForm";

export interface Integration {
  platform: "google-calendar" | "trello" | "jira" | "asana" | "slack";
  name: string;
  description: string;
  connected: boolean;
  boardName?: string; // For Trello integration
  projectName?: string; // For Jira/Asana integration
  channelName?: string; // For Slack integration
  logo: string;
}

export type SetupMode = "trello" | "jira" | "asana" | null;

// Custom hook to manage integration states and operations
export function useIntegrations() {
  const { userId } = useAuth();

  // Initialize integrations with default values
  const [integrations, setIntegrations] = useState<Integration[]>([
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

  // State management for loading and setup processes
  const [loading, setLoading] = useState(true);
  const [setupMode, setSetupMode] = useState<
    "trello" | "jira" | "asana" | null
  >(null);
  const [setupData, setSetupData] = useState<ProjectData | null>(null);
  const [setupLoading, setSetupLoading] = useState(false);

  // Effect to fetch integrations on component mount and handle setup mode
  useEffect(() => {
    if (userId) {
      fetchIntegrations();
    }
    // if query params has ["trello","jira","asana","slack"] then set setup mode to the query param
    // /integrations/setup=trello
    const urlParams = new URLSearchParams(window.location.search);
    const setup = urlParams.get("setup");
    if (
      setup &&
      (setup === "trello" || setup === "jira" || setup === "asana")
    ) {
      setSetupMode(setup);
      fetchSetupData(setup);
    }
  }, [userId]);

  // Fetch the current status of all integrations
  const fetchIntegrations = async () => {
    try {
      const response = await fetch("/api/integrations/status");
      const data = await response.json();

      // Special handling for Google Calendar status
      const calendarResponse = await fetch("/api/user/calendar-status");
      const calendarData = await calendarResponse.json();

      setIntegrations((prev) =>
        prev.map((integration) => {
          if (integration.platform === "google-calendar") {
            return {
              ...integration,
              connected: calendarData.connected || false,
            };
          }

          const status = data.find(
            (d: {
              platform: string;
              connected: boolean;
              boardName?: string;
              projectName?: string;
              channelName?: string;
            }) => d.platform === integration.platform
          );
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

  // Fetch setup data for a specific platform
  const fetchSetupData = async (platform: string) => {
    try {
      const response = await fetch(`/api/integrations/${platform}/setup`);
      const data = await response.json();
      setSetupData(data);
    } catch (error) {
      console.error(`Error fetching ${platform} setup data:`, error);
    }
  };

  // Handle connecting to different integration platforms
  const handleConnect = (platform: string) => {
    if (platform === "slack") {
      window.location.href = "/api/slack/install?return=integrations";
    } else if (platform === "google-calendar") {
      window.location.href = "/api/auth/google/direct-connect";
    } else {
      window.location.href = `/api/integrations/${platform}/auth`;
    }
  };

  // Handle disconnecting from integration platforms
  const handleDisconnect = async (platform: string) => {
    try {
      if (platform === "google-calendar") {
        await fetch("/api/auth/google/disconnect", {
          method: "POST",
        });
      } else {
        await fetch(`/api/integrations/${platform}/disconnect`, {
          method: "POST",
        });
      }
      fetchIntegrations();
    } catch (error) {
      console.error("error disconnecting:", error);
    }
  };

  // Handle submitting setup configuration for an integration
  const handleSetupSubmit = async (
    platform: "trello" | "jira" | "asana",
    config: SetupFormConfig
  ) => {
    setSetupLoading(true);
    try {
      const response = await fetch(`/api/integrations/${platform}/setup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      });
      if (response.ok) {
        setSetupMode(null);
        setSetupData(null);

        fetchIntegrations();
        window.history.replaceState({}, "", "/integrations");
      }
    } catch (error) {
      console.error("error saving setup:", error);
    } finally {
      setSetupLoading(false);
    }
  };

  // Return all necessary states and handlers
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
