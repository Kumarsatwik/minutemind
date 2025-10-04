/**
 * Custom hook for managing action items and integrations for meetings.
 * Handles fetching available integrations and managing UI state for action item creation.
 */

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";

/**
 * Interface defining the structure of an action item
 */
export interface ActionItem {
  id: number;
  text: string;
}

/**
 * Interface defining the structure of an integration
 */
export interface Integration {
  platform: string;
  connected: boolean;
  name: string;
  logo: string;
}

/**
 * Custom hook that manages action items and integrations for a specific meeting
 * @param meetingId - The ID of the meeting to manage action items for
 * @returns Object containing integration data and UI state for action item management
 */
export function useActionItems(meetingId: string) {
  // Get authenticated user ID from Clerk
  const { userId } = useAuth();

  // Integration state
  const [integrations, setIntegrations] = useState<Integration[]>([]); // List of connected integrations
  const [integrationsLoaded, setIntegrationsLoaded] = useState(false); // Whether integrations have been fetched

  // Loading state for various operations (keyed by operation type)
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});

  // UI state for action item creation
  const [showAddInput, setShowAddInput] = useState(false); // Whether to show the add action item input
  const [newItemText, setNewItemText] = useState(""); // Text for new action item being created

  // Effect to fetch integrations when user is authenticated
  useEffect(() => {
    if (userId) {
      fetchIntegrations();
    } else {
      // Mark as loaded even without user to prevent infinite loading
      setIntegrationsLoaded(true);
    }
  }, [userId]);

  /**
   * Fetches the user's connected integrations from the API
   * Filters out Slack integrations and adds logo paths
   */
  const fetchIntegrations = async () => {
    try {
      const response = await fetch(`/api/integration/status`);
      if (response.ok) {
        const data = await response.json();
        // Process integrations: filter connected ones, exclude Slack, add logos
        const integrationsWithLogos = data
          .filter((d: { connected: boolean }) => d.connected)
          .filter((d: { platform: string }) => d.platform !== "slack")
          .map((integration: Integration) => ({
            ...integration,
            logo: `/${integration.platform}.png`,
          }));
        setIntegrations(integrationsWithLogos);
      }
    } catch (error) {
      // On error, set empty integrations array
      setIntegrations([]);
      console.error("Error fetching integrations:", error);
    } finally {
      // Always mark as loaded regardless of success/failure
      setIntegrationsLoaded(true);
    }
  };

  // Return all state and functions for use in components
  return {
    // Integration data
    integrations, // Array of connected integrations with logos
    integrationsLoaded, // Whether integrations have been fetched from API

    // Loading state management
    loading, // Object tracking loading states for different operations
    setLoading, // Function to update loading states

    // Action item creation UI state
    showAddInput, // Whether to display the add action item input field
    setShowAddInput, // Function to control input field visibility
    newItemText, // Current text in the new action item input
    setNewItemText, // Function to update the new action item text
  };
}
