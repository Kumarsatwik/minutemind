"use client";

import React from "react";
import { useIntegrations } from "./hooks/useIntegration";
import SetupForm from "./components/SetupForm";
import IntegrationCard from "./components/IntegrationCards";

/**
 * Integrations page component - Main interface for managing third-party integrations.
 * Displays available integrations, handles connection/disconnection, and provides
 * setup workflows for configuring destinations (projects, boards, channels).
 */
function Integrations() {
  // Destructure all necessary state and handlers from the integrations hook
  const {
    integrations, // Array of user's integration configurations
    loading, // Loading state for initial data fetch
    setupMode, // Current platform being configured (trello/jira/asana/slack or null)
    setSetupMode, // Function to set/clear setup mode
    setupData, // Data for the setup form (projects/boards available)
    setSetupData, // Function to update setup data
    setupLoading, // Loading state during setup submission
    fetchSetupData, // Function to fetch setup data for a platform
    handleConnect, // Function to initiate OAuth connection flow
    handleDisconnect, // Function to disconnect an integration
    handleSetupSubmit, // Function to submit setup configuration
  } = useIntegrations();

  // Show loading spinner while fetching integration data
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-foreground mb-4"></div>
          <div className="text-foreground">Loading Integrations...</div>
        </div>
      </div>
    );
  }

  return (
    // Main page container with full height background
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        {/* Page header with title and description */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Integrations
          </h1>

          <p className="text-muted-foreground">
            Connect your favourite tools to automatically add action items from
            meetings
          </p>
        </div>

        {/* Setup modal - shown when user clicks setup on a connected integration */}
        {setupMode && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg p-6 border border-border max-w-md w-full mx-4">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Setup {setupMode.charAt(0).toUpperCase() + setupMode.slice(1)}
              </h2>

              <SetupForm
                platform={setupMode}
                data={setupData || { boards: [], channels: [], projects: [] }}
                onSubmit={handleSetupSubmit}
                onCancel={() => {
                  setSetupMode(null);
                  setSetupData(null);
                  // Clean up URL when canceling setup
                  window.history.replaceState({}, "", "/integrations");
                }}
                loading={setupLoading}
              />
            </div>
          </div>
        )}

        {/* Integration cards grid - responsive layout showing all available integrations */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {integrations.map((integration) => (
            <IntegrationCard
              key={integration.platform}
              integration={integration}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              onSetup={(platform) => {
                // Enter setup mode and fetch available destinations for the platform
                setSetupMode(platform);
                fetchSetupData(platform);
              }}
            />
          ))}
        </div>

        {/* Instructions section - explains how the integration system works */}
        <div className="mt-8 bg-card rounded-lg p-6 border border-border">
          <h3 className="font-semibold text-foreground mb-2">How it wokrs </h3>

          <ol className="text-sm text-muted-foreground space-y-2">
            <li>1. Connect your preffered tools above</li>
            <li>2. Choose where to send action items during setup</li>
            <li>
              3. In meetings, hover over action items and click &quot;Add
              to&quot;
            </li>
            <li>
              4. Select which tool(s) to add the task to from the dropdown
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default Integrations;
