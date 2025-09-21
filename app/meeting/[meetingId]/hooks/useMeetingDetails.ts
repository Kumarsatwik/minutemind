/**
 * Custom hook for managing meeting details and related functionality.
 * Handles fetching meeting data, processing transcripts, chat interactions,
 * and action item management for a specific meeting.
 */

import { useChatCore } from "@/app/hooks/chat/useChatCore";
import { useAuth } from "@clerk/clerk-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Interface defining the structure of action items
 */
export interface ActionItem {
  id: number;
  text: string;
}

/**
 * Interface defining the structure of transcript word objects
 */
export interface TranscriptWord {
  word: string;
  start?: number;
  end?: number;
}

/**
 * Interface defining the structure of transcript items
 */
export interface TranscriptItem {
  speaker: string;
  words: TranscriptWord[];
  timestamp?: number;
}

/**
 * Interface defining the structure of meeting data
 */
export interface MeetingData {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  transcript?: string;
  summary?: string;
  actionItems?: ActionItem[];
  processed: boolean;
  processedAt?: string;
  recordingUrl?: string;
  emailSent: boolean;
  emailSentAt?: string;
  userId?: string;
  user?: {
    name?: string;
    email?: string;
  };
  ragProcessed?: boolean;
}

/**
 * Custom hook that manages all meeting-related state and functionality
 * @returns Object containing meeting data, state, and handler functions
 */
export function useMeetingDetails() {
  // Extract meeting ID from URL parameters
  const params = useParams();
  const meetingId = params.meetingId as string;

  // Get authentication state from Clerk
  const { userId, isLoaded } = useAuth();

  // State for user permissions and verification
  const [isOwner, setIsOwner] = useState(false); // Whether current user owns the meeting
  const [userChecked, setUserChecked] = useState(false); // Whether user ownership has been verified

  // UI state
  const [activeTab, setActiveTab] = useState<"summary" | "transcript">(
    "summary"
  ); // Currently active tab
  const [localActionItems, setLocalActionItems] = useState<ActionItem[]>([]); // Local copy of action items for optimistic updates

  // Data state
  const [meetingData, setMeetingData] = useState<MeetingData | null>(null); // Complete meeting data
  const [loading, setLoading] = useState(true); // Loading state for data fetching

  // Initialize chat functionality for RAG-based Q&A
  const chat = useChatCore({
    apiEndpoint: `/api/rag/chat-meeting`,
    getRequestBody: (input: string) => ({
      meetingId,
      question: input,
    }),
  });

  // Chat event handlers - only allow owners to interact with chat
  /**
   * Handles sending a chat message to the RAG system
   * Only works if user is the meeting owner and input is not empty
   */
  const handleSendMessage = async () => {
    if (!chat.chatInput.trim() || !isOwner) {
      return;
    }
    await chat.handleSendMessage();
  };

  /**
   * Handles clicking on a chat suggestion
   * @param suggestion - The suggestion text to use
   */
  const handleSuggestionClick = (suggestion: string) => {
    if (!isOwner) {
      return;
    }
    chat.handleSuggestionClick(suggestion);
  };

  /**
   * Handles input changes in the chat input field
   * @param value - The new input value
   */
  const handleInputChange = (value: string) => {
    if (!isOwner) {
      return;
    }
    chat.handleInputChange(value);
  };

  // Effect to fetch meeting data when component mounts or dependencies change
  useEffect(() => {
    /**
     * Fetches meeting data from the API and updates local state
     * Also determines if current user is the meeting owner
     */
    const fetchMeetingData = async () => {
      try {
        const response = await fetch(`/api/meetings/${meetingId}`);
        if (response.ok) {
          const data = await response.json();
          setMeetingData(data);
          if (isLoaded) {
            const ownerStatus = userId === data.userId;
            setIsOwner(ownerStatus);
            setUserChecked(true);
          }
          if (data.actionItems && data.actionItems.length > 0) {
            setLocalActionItems(data.actionItems);
          } else {
            setLocalActionItems([]);
          }
        }
      } catch (error) {
        console.error("Error fetching meeting data:", error);
      } finally {
        setLoading(false);
      }
    };
    if (isLoaded) {
      fetchMeetingData();
    }
  }, [userChecked, userId, meetingId]);

  // Effect to process transcript for RAG when user is verified as owner
  useEffect(() => {
    /**
     * Processes the meeting transcript for RAG (Retrieval-Augmented Generation)
     * Only runs for meeting owners when transcript exists and hasn't been processed yet
     */
    const processTranscript = async () => {
      try {
        const meetingResponse = await fetch(`/api/meetings/${meetingId}`);
        if (!meetingResponse.ok) {
          return;
        }
        const meeting = await meetingResponse.json();

        if (
          meeting.transcript &&
          !meeting.ragProcessed &&
          userId == meeting.userId
        ) {
          let transcriptText = "";
          // Handle different transcript formats
          if (typeof meeting.transcript === "string") {
            transcriptText = meeting.transcript;
          } else if (Array.isArray(meeting.transcript)) {
            // Convert array format to readable text
            transcriptText = (meeting.transcript as TranscriptItem[])
              .map(
                (item: TranscriptItem) =>
                  `${item.speaker}: ${item.words
                    .map((w: TranscriptWord) => w.word)
                    .join(" ")}`
              )
              .join("\n");
          }
          // Send transcript to RAG processing endpoint
          await fetch("/api/rag/process", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              meetingId,
              transcript: transcriptText,
              meetingTitle: meeting.title,
            }),
          });
        }
      } catch (error) {
        console.error("Error processing transcript:", error);
      }
    };
    if (isLoaded && userChecked) {
      processTranscript();
    }
  }, [isLoaded, userChecked, userId, meetingId]);

  // Action item management functions
  /**
   * Deletes an action item from the local state (optimistic update)
   * @param id - The ID of the action item to delete
   */
  const deleteActionItem = async (id: number) => {
    if (!isOwner) {
      return;
    }
    setLocalActionItems((prev: ActionItem[]) =>
      prev.filter((item: ActionItem) => item.id !== id)
    );
  };

  /**
   * Adds a new action item by fetching updated meeting data
   * @param text - The text content of the new action item
   */
  const addActionItem = async (text: string) => {
    if (!isOwner) {
      return;
    }
    try {
      const response = await fetch(`/api/meetings/${meetingId}`);
      if (!response.ok) {
        return;
      }
      const meeting = await response.json();
      setMeetingData(meeting);
      setLocalActionItems(meeting.actionItems || []);
    } catch (error) {
      console.error("Error adding action item:", error);
    }
  };

  // Utility functions for data transformation
  /**
   * Formats action items for display, ensuring consistent structure
   * @returns Array of formatted action items or empty array
   */
  const displayActionItems =
    localActionItems.length > 0
      ? localActionItems.map((item: ActionItem) => ({
          id: item.id,
          text: item.text,
        }))
      : [];

  /**
   * Formats meeting information for display components
   * Includes fallback values for loading states
   */
  const meetingInfoData = meetingData
    ? {
        title: meetingData.title,
        date: new Date(meetingData.startTime).toLocaleDateString(),
        time: `${new Date(meetingData.startTime).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })} - ${new Date(meetingData.endTime).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}`,
        userName: meetingData.user?.name || "User",
      }
    : {
        title: "loading...",
        data: "loading...",
        time: "loading...",
        userName: "loading...",
      };

  // Return all state and functions for use in components
  return {
    // Basic identifiers and permissions
    meetingId,
    isOwner,
    userChecked,

    // UI state
    activeTab,
    setActiveTab,

    // Action items state and functions
    localActionItems,
    setLocalActionItems,
    deleteActionItem,
    addActionItem,
    displayActionItems,

    // Meeting data and loading state
    meetingData,
    setMeetingData,
    loading,
    setLoading,

    // Chat functionality from useChatCore
    chatInput: chat.chatInput,
    setChatInput: chat.setChatInput,
    messages: chat.messages,
    setMessages: chat.setMessages,
    showSuggestions: chat.showSuggestions,
    setShowSuggestions: chat.setShowSuggestions,
    isLoading: chat.isLoading,
    setIsLoading: chat.setIsLoading,

    // Chat event handlers
    handleSendMessage,
    handleSuggestionClick,
    handleInputChange,

    // Formatted meeting information
    meetingInfoData,
  };
}
