import React from "react";
import { Integration } from "../../hooks/useActionItems";
import { Button } from "@/components/ui/button";
import { ChevronDown, ExternalLink, Trash2 } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Image from "next/image";

/**
 * Props for the ActionItemRow component.
 * @param item - The action item to display, containing id and text.
 * @param integrations - Array of connected integrations available for adding the item.
 * @param loading - Object tracking loading states for integration actions, keyed by platform-itemId.
 * @param addToIntegration - Function to add the action item to a specific integration platform.
 * @param handleDeleteItem - Function to delete the action item by its id.
 */
interface ActionItemRowProps {
  item: {
    id: number;
    text: string;
  };
  integrations: Integration[];
  loading: { [key: string]: boolean };
  addToIntegration: (
    platform: string,
    item: { id: number; text: string }
  ) => void;
  handleDeleteItem: (id: number) => void;
}

/**
 * Renders a single row for an action item in a list.
 * Displays the item text with a bullet point, options to add to connected integrations
 * (via button or dropdown if multiple), and a delete button on hover.
 * Handles loading states for integration additions and image error handling for logos.
 */
function ActionItemRow({
  item,
  integrations,
  loading,
  addToIntegration,
  handleDeleteItem,
}: ActionItemRowProps) {
  // Check if there are any connected integrations to show add options
  const hasConnectedIntegrations = integrations.length > 0;

  return (
    <>
      {/* 
       * Outer container for the action item row with group hover effects
       * for revealing the delete button on interaction.
       */}
      <div className="group relative">
        {/* 
         * Inner flex container for aligning the bullet, text, integration controls,
         * and delete button horizontally with top alignment.
         */}
        <div className="flex items-start gap-3">
          {/* 
           * Visual bullet point indicator for the action item,
           * styled as a small primary-colored circle.
           */}
          <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>

          {/* 
           * Action item text content, taking available space with relaxed line height
           * for readability.
           */}
          <p className="flex-1 text-sm leading-relaxed text-foreground">
            {item.text}
          </p>

          {/* 
           * Conditional section for integration addition controls.
           * Only shown if integrations are connected, with smooth opacity transition.
           */}
          {hasConnectedIntegrations && (
            <div className="transition-opacity relative">
              {/* 
               * Single integration case: Direct button to add to the only connected platform.
               * Shows loading text if in progress, otherwise "Add to [name]" with external link icon.
               * Button is disabled during loading.
               */}
              {integrations.length === 1 ? (
                <Button
                  onClick={() => addToIntegration(integrations[0].platform, item)}
                  disabled={loading[`${integrations[0].platform}-${item.id}`]}
                  size="sm"
                  className="px-3 py-1 text-xs flex items-center gap-1"
                >
                  {loading[`${integrations[0].platform}-${item.id}`] ? (
                    "Adding..."
                  ) : (
                    <>
                      Add to {integrations[0].name}
                      <ExternalLink className="h-3 w-3" />
                    </>
                  )}
                </Button>
              ) : (
                /* 
                 * Multiple integrations case: Dropdown menu to select which platform to add to.
                 * Trigger button shows "Add to" with chevron icon.
                 */
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="default"
                      className="px-3 py-1 text-xs flex items-center gap-1 cursor-pointer"
                    >
                      Add to
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>

                  {/* 
                   * Dropdown content aligned to the end with minimum width.
                   * Lists each integration as a selectable item with logo and text.
                   */}
                  <DropdownMenuContent align="end" className="min-w-[160px]">
                    {integrations.map((integration) => (
                      <DropdownMenuItem
                        key={integration.platform}
                        onClick={() =>
                          addToIntegration(integration.platform, item)
                        }
                        className="flex items-center gap-2"
                      >
                        {/* 
                         * Integration logo container with fixed size.
                         * Hides on error if image fails to load.
                         */}
                        <div className="w-4 h-4 relative flex-shrink-0">
                          <Image
                            src={integration.logo}
                            alt={integration.name}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        </div>

                        {/* 
                         * Text for the menu item: Shows loading or "Add to [name]".
                         */}
                        <span>
                          {loading[`${integration.platform}-${item.id}`]
                            ? "Adding..."
                            : `Add to ${integration.name}`}
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}

          {/* 
           * Delete button, hidden by default and revealed on group hover.
           * Styled with destructive colors and smooth transition.
           */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDeleteItem(item.id)}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/20 text-destructive rounded transition-all cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
}

export default ActionItemRow;
