// Global declaration for tracking processed Slack events
// This prevents duplicate processing of the same Slack events
declare global {
  var processedEvents: Set<string> | undefined;
}

/**
 * Checks if a Slack event has already been processed to prevent duplicates
 * Uses an in-memory Set to track processed events with automatic cleanup
 *
 * @param eventId - The unique identifier for the Slack event
 * @param eventTs - The timestamp of the Slack event
 * @returns true if the event is a duplicate, false if it's new
 */
export function isDuplicateEvent(eventId: string, eventTs: string) {
  // Create a unique identifier combining event ID and timestamp
  const uniqueId = `${eventId}-${eventTs}`;

  // Initialize the global Set if it doesn't exist
  if (!global.processedEvents) {
    global.processedEvents = new Set();
  }

  // Check if this event has already been processed
  if (global.processedEvents.has(uniqueId)) {
    return true; // Duplicate event detected
  }

  // Add the event to the processed set
  global.processedEvents.add(uniqueId);

  // Set up automatic cleanup after 5 minutes (300,000ms)
  // This prevents memory leaks from accumulating too many processed events
  setTimeout(() => {
    global.processedEvents?.delete(uniqueId);
  }, 300000);

  // Event is new and has been added to the processed set
  return false;
}
