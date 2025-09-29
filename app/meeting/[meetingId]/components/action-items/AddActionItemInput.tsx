import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import React from "react";

/**
 * Props for the AddActionItemInput component.
 * @param showAddInput - Boolean flag to toggle visibility of the input form.
 * @param setShowAddInput - Function to update the showAddInput state.
 * @param newItemText - Current text value for the new action item input.
 * @param setNewItemText - Function to update the newItemText state.
 * @param onAddItem - Function to handle adding the new action item.
 */
interface AddActionItemInputProps {
  showAddInput: boolean;
  setShowAddInput: (show: boolean) => void;
  newItemText: string;
  setNewItemText: (text: string) => void;
  onAddItem: () => void;
}

/**
 * A toggleable input component for adding new action items.
 * When closed, shows a button to open the input form.
 * When open, displays a text input with Add and Cancel buttons,
 * supporting Enter/Escape key handling for quick actions.
 */
function AddActionItemInput({
  showAddInput,
  setShowAddInput,
  newItemText,
  setNewItemText,
  onAddItem,
}: AddActionItemInputProps) {
  // Render the input form if showAddInput is true
  if (showAddInput) {
    return (
      <>
        {/* 
         * Container for the expanded input form with muted background and rounded corners.
         * Flex layout aligns input, Add, and Cancel buttons horizontally.
         */}
        <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
          {/* 
           * Text input for entering the new action item description.
           * Supports real-time updates, placeholder text, and keyboard shortcuts:
           * - Enter: Add the item
           * - Escape: Cancel and clear
           * Auto-focuses when shown for better UX.
           */}
          <Input
            type="text"
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            placeholder="Enter action item..."
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onAddItem();
              }
              if (e.key === "Escape") {
                setShowAddInput(false);
                setNewItemText("");
              }
            }}
            autoFocus
          />
          {/* 
           * Add button: Triggers onAddItem, disabled if input is empty after trimming.
           * Small size for compact layout.
           */}
          <Button onClick={onAddItem} disabled={!newItemText.trim()} size="sm">
            Add
          </Button>
          {/* 
           * Cancel button: Hides the form and clears the input text.
           * Outlined variant for secondary action.
           */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShowAddInput(false);
              setNewItemText("");
            }}
          >
            Cancel
          </Button>
        </div>
      </>
    );
  }

  // Render the collapsed add button when input form is hidden
  return (
    <>
      {/* 
       * Ghost button to trigger opening the input form.
       * Full-width with muted text, hover effects for interactivity,
       * and includes Plus icon with label.
       */}
      <Button
        variant="ghost"
        className="flex items-center gap-3 w-full py-2 px-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors group"
        onClick={() => setShowAddInput(true)}
      >
        {/* Plus icon for visual add indication */}
        <Plus className="h-4 w-4" />
        {/* Button label text */}
        <span>Add Action Item</span>
      </Button>
    </>
  );
}

export default AddActionItemInput;
