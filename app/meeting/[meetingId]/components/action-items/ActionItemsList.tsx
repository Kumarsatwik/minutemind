import React from "react";
import { Integration } from "../../hooks/useActionItems";
import ActionItemRow from "./ActionItemsRow";

/**
 * Props for the ActionItemsList component.
 * @param actionItems - Array of action items to render, each with id and text.
 * @param integrations - Array of connected integrations passed to each row.
 * @param loading - Object tracking loading states for integration actions in rows.
 * @param addToIntegration - Function to add an action item to a specific integration, passed to rows.
 * @param handleDeleteItem - Function to delete an action item by id, passed to rows.
 */
interface ActionItemsListProps {
  actionItems: {
    id: number;
    text: string;
  }[];
  integrations: Integration[];
  loading: { [key: string]: boolean };
  addToIntegration: (
    platform: string,
    item: { id: number; text: string }
  ) => void;
  handleDeleteItem: (id: number) => void;
}

/**
 * Renders a list of action items using ActionItemRow components.
 * Applies vertical spacing between rows and maps over the actionItems array,
 * passing necessary props to each row for display, integration, and deletion.
 */
function ActionItemsList(props: ActionItemsListProps) {
  return (
    <>
      {/* 
       * Container for the list of action items with vertical spacing (space-y-4)
       * to separate each row visually.
       */}
      <div className="space-y-4">
        {/* 
         * Map over actionItems to render each as an ActionItemRow.
         * Uses item.id as key for efficient React reconciliation.
         * Passes all required props (item, integrations, loading, functions) to each row.
         */}
        {props.actionItems.map((item) => (
          <ActionItemRow
            key={item.id}
            item={item}
            integrations={props.integrations}
            loading={props.loading}
            addToIntegration={props.addToIntegration}
            handleDeleteItem={props.handleDeleteItem}
          />
        ))}
      </div>
    </>
  );
}

export default ActionItemsList;
