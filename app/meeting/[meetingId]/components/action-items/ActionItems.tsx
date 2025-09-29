import React from "react";
import { ActionItem, useActionItems } from "../../hooks/useActionItems";
import { Button } from "@/components/ui/button";
import ActionItemsList from "./ActionItemsList";
import AddActionItemInput from "./AddActionItemInput";
import { toast } from "sonner";

/**
 * Props for the ActionItems component.
 * @param actionItems - Array of current action items for the meeting.
 * @param onDeleteItem - Callback function to handle deletion of an action item by id.
 * @param onAddItem - Callback function to handle addition of a new action item text.
 * @param meetingId - Unique identifier for the current meeting.
 */
export interface ActionItemsProps {
  actionItems: ActionItem[];
  onDeleteItem: (id: number) => void;
  onAddItem: (text: string) => void;
  meetingId: string;
}

/**
 * Main component for managing action items in a meeting.
 * Integrates with useActionItems hook for state management of integrations, loading, and input form.
 * Handles adding/deleting items via API calls with toast notifications.
 * Shows loading skeleton while integrations load, then renders list, add input, and integration prompt if needed.
 */
function ActionItems({
  actionItems,
  onDeleteItem,
  onAddItem,
  meetingId,
}: ActionItemsProps) {
  // Custom hook for managing action items state specific to the meeting
  const {
    integrations,
    integrationsLoaded,
    loading,
    setLoading,
    showAddInput,
    setShowAddInput,
    newItemText,
    setNewItemText,
  } = useActionItems(meetingId);

  /**
   * Asynchronously adds an action item to a specific integration platform.
   * Updates loading state, shows success toast, and makes POST request to API.
   * Resets loading in finally block regardless of outcome.
   * @param platform - The integration platform (e.g., 'asana', 'jira').
   * @param actionItem - The action item to add.
   */
  const addToIntegration = async (platform: string, actionItem: ActionItem) => {
    // Set loading state for this specific action
    setLoading((prev) => ({ ...prev, [`${platform}-${actionItem.id}`]: true }));
    try {
      // Show success toast immediately (optimistic UI)
      toast(`✅ Action item added to ${platform}`, {
        action: {
          label: "OK",
          onClick: () => {},
        },
      });
      // API call to add to integration
      const response = await fetch("/api/integrations/action-items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          platform,
          actionItem: actionItem.text,
          meetingId,
        }),
      });
    } finally {
      // Reset loading state
      setLoading((prev) => ({
        ...prev,
        [`${platform}-${actionItem.id}`]: false,
      }));
    }
  };

  /**
   * Asynchronously adds a new action item to the meeting.
   * Validates non-empty text, shows toast, makes POST request, and updates state on success.
   * Clears input and hides form after successful addition.
   */
  const handleAddNewItem = async () => {
    if (!newItemText.trim()) {
      return;
    }

    try {
      // Optimistic toast
      toast(`✅ Action item added`, {
        action: {
          label: "OK",
          onClick: () => {},
        },
      });
      // API call to create new action item
      const response = await fetch(`/api/meetings/${meetingId}/action-items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: newItemText,
        }),
      });

      if (response.ok) {
        // Update parent state and reset form
        onAddItem(newItemText);
        setNewItemText("");
        setShowAddInput(false);
      }
    } catch (error) {
      console.error("failed to add action item:", error);
    }
  };

  /**
   * Asynchronously deletes an action item from the meeting.
   * Shows toast, makes DELETE request, and updates state on success.
   * @param id - The id of the action item to delete.
   */
  const handleDeleteItem = async (id: number) => {
    try {
      // Optimistic toast
      toast(`✅ Action item deleted`, {
        action: {
          label: "OK",
          onClick: () => {},
        },
      });
      // API call to delete action item
      const response = await fetch(
        `/api/meetings/${meetingId}/action-items/${id}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        // Update parent state
        onDeleteItem(id);
      }
    } catch (error) {
      console.error("failed to delete action item:", error);
    }
  };

  // Check if any integrations are connected
  const hasConnectedIntegrations = integrations.length > 0;

  // Loading state: Show skeleton while integrations are being fetched
  if (!integrationsLoaded) {
    return (
      <>
        {/* 
         * Loading container with card styling, padding, and border.
         * Includes header and skeleton rows for action items plus add button.
         */}
        <div className="bg-card rounded-lg p-6 border border-border mb-8">
          {/* Header for the section */}
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Action Items
          </h3>

          {/* 
           * Skeleton list with spacing, mapping existing actionItems to show placeholders.
           * Includes pulsing animation for loading effect.
           */}
          <div className="space-y-4">
            {actionItems.map((item) => (
              <div key={item.id} className="group relative">
                <div className="flex items-center gap-3">
                  {/* Action item text (shown as is during loading) */}
                  <p className="flex-1 text-sm leading-relaxed text-foreground">
                    {item.text}
                  </p>
                  {/* Pulsing placeholder for integration controls */}
                  <div className="animate-pulse">
                    <div className="h-6 w-20 bg-muted rounded"></div>
                  </div>

                  {/* Disabled delete button placeholder with hover styles */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/20 text-destructive rounded transition-all"
                    disabled
                  ></Button>
                </div>
              </div>
            ))}

            {/* Pulsing placeholder for the add input button */}
            <div className="animate-pulse">
              <div className="h-8 bg-muted rounded-lg"></div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Main render: Full functionality once integrations are loaded
  return (
    <>
      {/* 
       * Main container with card styling, padding, border, and bottom margin.
       * Houses the header, list, input form, and optional integrations prompt.
       */}
      <div className="bg-card rounded-lg p-6 border border-border mb-8">
        {/* Section header */}
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Action Items
        </h3>

        {/* 
         * List of action items, passing necessary props for rendering rows,
         * integrations, loading, and handlers.
         */}
        <ActionItemsList
          actionItems={actionItems}
          integrations={integrations}
          loading={loading}
          addToIntegration={addToIntegration}
          handleDeleteItem={handleDeleteItem}
        />

        {/* 
         * Input component for adding new action items, controlled by hook state.
         * Uses handleAddNewItem as the add callback.
         */}
        <AddActionItemInput
          showAddInput={showAddInput}
          setShowAddInput={setShowAddInput}
          newItemText={newItemText}
          setNewItemText={setNewItemText}
          onAddItem={handleAddNewItem}
        />

        {/* 
         * Conditional prompt to connect integrations if none are connected and items exist.
         * Styled as a dashed border info box with link to integrations page.
         */}
        {!hasConnectedIntegrations && actionItems.length > 0 && (
          <div className="mt-4 p-3 bg-muted/30 rounded-lg border border-dashed border-muted-foreground/30">
            <p className="text-xs text-muted-foreground text-center">
              <a href="/integrations" className="text-primary hover:underline">
                Connect Integrations
              </a>{" "}
              to add action items to your tools
            </p>
          </div>
        )}
      </div>
    </>
  );
}

export default ActionItems;
