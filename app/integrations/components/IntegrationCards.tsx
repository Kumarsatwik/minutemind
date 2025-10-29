import React from "react";
import { Integration } from "../hooks/useIntegration";
import Image from "next/image";
import { Check, ExternalLink, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Props for the IntegrationCard component
 */
interface IntegrationCardProps {
  /** The integration data to display */
  integration: Integration;
  /** Callback function when user clicks connect */
  onConnect: (platform: string) => void;
  /** Callback function when user clicks disconnect */
  onDisconnect: (platform: string) => void;
  /** Callback function when user clicks setup/settings */
  onSetup: (platform: string) => void;
}

/**
 * IntegrationCard component displays an individual integration card
 * showing the integration's logo, name, description, connection status,
 * and action buttons for connecting/disconnecting or setup.
 */
function IntegrationCard({
  integration,
  onConnect,
  onDisconnect,
  onSetup,
}: IntegrationCardProps) {
  return (
    <div className="bg-card rounded-lg p-6 border border-border">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 relative flex-shrink-0">
            <Image
              src={integration.logo}
              alt={`${integration.name} logo`}
              className="object-contain rounded"
              width={32}
              height={32}
            />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              {integration.name}
            </h3>

            {integration.connected && (
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
                Connected
              </span>
            )}
          </div>
        </div>
        {integration.connected && <Check className="h-5 w-5 text-green-500" />}
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        {integration.description}
      </p>

      {/* Display destination info for connected integrations (except Google Calendar) */}
      {integration.connected &&
        integration.platform !== "google-calendar" &&
        (integration.boardName ||
          integration.projectName ||
          integration.channelName) && (
          <div className="mb-4 p-3 bg-muted/50 rounded-lg">
            <div className="text-xs text-muted-foreground mb-1">
              Destination:
            </div>
            <div className="text-sm font-medium text-foreground">
              {/* Display channel name with # prefix for Slack */}
              {integration.platform === "slack" &&
                integration.channelName &&
                `#${integration.channelName}`}
              {/* Display board name for Trello */}
              {integration.platform === "trello" && integration.boardName}
              {/* Display project name for Jira and Asana */}
              {integration.platform === "jira" && integration.projectName}
              {integration.platform === "asana" && integration.projectName}
            </div>
          </div>
        )}

      {/* Special status display for Google Calendar */}
      {integration.connected && integration.platform === "google-calendar" && (
        <div className="mb-4 p-3 bg-muted/50 rounded-lg">
          <div className="text-xs text-muted-foreground mb-1">Status:</div>
          <div className="text-sm font-medium text-foreground">
            Lambda auto-sync anabled
          </div>
        </div>
      )}

      {/* Action buttons - different layouts based on connection status and platform */}
      <div className="flex gap-2">
        {integration.connected ? (
          integration.platform === "google-calendar" ? (
            // Google Calendar only has disconnect option
            <Button
              variant="outline"
              onClick={() => onDisconnect(integration.platform)}
              className="flex-1 cursor-pointer"
              type="button"
            >
              Disconnect
            </Button>
          ) : (
            // Other platforms have disconnect and setup buttons
            <>
              <Button
                variant="outline"
                onClick={() => onDisconnect(integration.platform)}
                className="flex-1 cursor-pointer"
                type="button"
              >
                Disconnect
              </Button>
              <Button
                variant="outline"
                onClick={() => onSetup(integration.platform)}
                className="px-3 py-2 cursor-pointer"
                type="button"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </>
          )
        ) : (
          // Not connected - show connect button
          <Button
            onClick={() => onConnect(integration.platform)}
            className="flex-1 flex items-center justify-center gap-2 cursor-pointer"
            type="button"
          >
            Connect
            <ExternalLink className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default IntegrationCard;
