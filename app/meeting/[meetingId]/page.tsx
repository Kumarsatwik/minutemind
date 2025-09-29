"use client";

/**
 * Main page component for displaying meeting details.
 * Fetches and renders meeting data using useMeetingDetails hook.
 * Handles tab switching between summary and transcript views,
 * conditional rendering based on ownership and loading states,
 * action items display (editable for owners, read-only for others),
 * chat sidebar for owners, and audio player for recordings.
 * Includes loading skeletons and error states.
 */
import React from "react";
import { useMeetingDetails } from "./hooks/useMeetingDetails";
import MeetingHeader from "./components/MeetingHeader";
import MeetingInfo from "./components/MeetingInfo";
import { Button } from "@/components/ui/button";
import ActionItems from "./components/action-items/ActionItems";
import TranscriptDisplay from "./components/TranscriptDisplay";
import ChatSidebar from "./components/ChatSidebar";
import CustomAudioPlayer from "./components/AudioPlayer";

function MeetingDetail() {
  /*
   * Custom hook providing all meeting-related state and handlers:
   * - meetingId: Unique meeting identifier
   * - isOwner: Whether the current user owns the meeting
   * - userChecked: Flag indicating user authentication check completion
   * - chatInput: Current chat input text
   * - setChatInput: Setter for chat input
   * - messages: Array of chat messages
   * - showSuggestions: Flag to show chat suggestions
   * - activeTab: Current active tab ('summary' or 'transcript')
   * - setActiveTab: Setter for active tab
   * - meetingData: Core meeting data (title, summary, transcript, etc.)
   * - loading: Global loading state for meeting data
   * - handleSendMessage: Handler for sending chat messages
   * - handleSuggestionClick: Handler for clicking chat suggestions
   * - handleInputChange: Handler for chat input changes
   * - deleteActionItem: Handler for deleting action items
   * - addActionItem: Handler for adding action items
   * - displayActionItems: Processed array of action items for display
   * - meetingInfoData: Additional meeting info (attendees, date, etc.)
   */
  const {
    meetingId,
    isOwner,
    userChecked,
    chatInput,
    setChatInput,
    messages,
    showSuggestions,
    activeTab,
    setActiveTab,
    meetingData,
    loading,
    handleSendMessage,
    handleSuggestionClick,
    handleInputChange,
    deleteActionItem,
    addActionItem,
    displayActionItems,
    meetingInfoData,
  } = useMeetingDetails();

  return (
    <div className="min-h-screen bg-background">
      {/*
       * Root container for the full meeting page with background styling
       * and minimum screen height.
       */}
      {/*
       * Meeting header component, shown at the top with title, summary preview,
       * action items bullet list, and loading state if user not checked.
       */}
      <MeetingHeader
        title={meetingData?.title || "Meeting"}
        meetingId={meetingId}
        summary={meetingData?.summary}
        actionItems={
          meetingData?.actionItems
            ?.map((item) => `• ${item.text}`)
            .join("\n") || ""
        }
        isOwner={isOwner}
        isLoading={!userChecked}
      />

      {/*
       * Main flex layout for the page content below header.
       * Height calculated to fill viewport minus header (73px).
       * Includes main content area and optional sidebar.
       */}
      <div className="flex h-[calc(100vh-73px)]">
        {/*
         * Primary content area: Flexible width, padding, scrollable with bottom padding
         * for audio player overlap. Centers content for non-owners once user checked.
         */}
        <div
          className={`flex-1 p-6 overflow-auto pb-24 ${
            !userChecked ? "" : !isOwner ? "max-w-4xl mx-auto" : ""
          }`}
        >
          {/* Meeting info section (attendees, date, duration, etc.)
           * Type assertion to handle optional date in meetingInfoData vs required in MeetingData type
           */}
          <MeetingInfo meetingData={meetingInfoData} />

          {/*
           * Tabbed content container with bottom border.
           * Includes Summary and Transcript tabs with active state styling.
           */}
          <div className="mb-8">
            {/* Tab navigation bar */}
            <div className="flex border-b border-border">
              {/* Summary tab button: Active if activeTab === 'summary' */}
              <Button
                variant="ghost"
                onClick={() => setActiveTab("summary")}
                className={`px-4 py-2 text-sm font-medium border-b-2 rounded-none shadow-none transition-colors
                                ${
                                  activeTab === "summary"
                                    ? "border-primary text-primary"
                                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50"
                                }`}
                style={{ boxShadow: "none" }}
                type="button"
              >
                Summary
              </Button>
              {/* Transcript tab button: Active if activeTab === 'transcript' */}
              <Button
                variant="ghost"
                onClick={() => setActiveTab("transcript")}
                className={`px-4 py-2 text-sm font-medium border-b-2 rounded-none shadow-none transition-colors
                                ${
                                  activeTab === "transcript"
                                    ? "border-primary text-primary"
                                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50"
                                }`}
                style={{ boxShadow: "none" }}
                type="button"
              >
                Transcript
              </Button>
            </div>

            {/* Tab content area with top margin */}
            <div className="mt-6">
              {/* Summary tab content */}
              {activeTab === "summary" && (
                <div>
                  {/* Loading spinner if data is loading */}
                  {loading ? (
                    <div className="bg-card border border-border rounded-lg p-6 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                      <p className="text-muted-foreground">
                        Loading meeting data..
                      </p>
                    </div>
                  ) : meetingData?.processed ? (
                    /*
                     * Processed meeting: Show summary and action items.
                     * Conditional based on ownership for editable vs read-only action items.
                     */
                    <div className="space-y-6">
                      {/* Meeting summary section if available */}
                      {meetingData.summary && (
                        <div className="bg-card border border-border rounded-lg p-6">
                          <h3 className="text-lg font-semibold text-foreground mb-3">
                            Meeting Summary
                          </h3>
                          <p className="text-muted-foreground leading-relaxed">
                            {meetingData.summary}
                          </p>
                        </div>
                      )}

                      {/*
                       * User check loading skeleton for action items if not checked.
                       * Pulsing placeholders for content.
                       */}
                      {!userChecked ? (
                        <div className="bg-card border border-border rounded-lg p-6">
                          <div className="animate-pulse">
                            <div className="h-4 bg-muted rounded w-1/4 mb-4"></div>
                            <div className="space-y-2">
                              <div className="h-3 bg-muted rounded w-3/4"></div>
                              <div className="h-3 bg-muted rounded w-1/2"></div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Editable action items for owners */}
                          {isOwner && displayActionItems.length > 0 && (
                            <ActionItems
                              actionItems={displayActionItems}
                              onDeleteItem={deleteActionItem}
                              onAddItem={addActionItem}
                              meetingId={meetingId}
                            />
                          )}

                          {/* Read-only action items for non-owners */}
                          {!isOwner && displayActionItems.length > 0 && (
                            <div className="bg-card rounded-lg p-6 border border-border">
                              <h3 className="text-lg font-semibold text-foreground mb-4">
                                Action Items
                              </h3>
                              <div className="space-y-3">
                                {displayActionItems.map((item) => (
                                  <div
                                    key={item.id}
                                    className="flex items-start gap-3"
                                  >
                                    <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                                    <p className="text-sm text-foreground">
                                      {item.text}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ) : (
                    /*
                     * Processing state: Show spinner and message about email notification.
                     */
                    <div className="bg-card border border-border rounded-lg p-6 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                      <p className="text-muted-foreground">
                        Processing meeting with AI..
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        You&apos;ll receive an email when ready
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Transcript tab content */}
              {activeTab === "transcript" && (
                <div>
                  {/* Loading spinner if data is loading */}
                  {loading ? (
                    <div className="bg-card border border-border rounded-lg p-6 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                      <p className="text-muted-foreground">
                        Loading meeting data..
                      </p>
                    </div>
                  ) : meetingData?.transcript ? (
                    /* Transcript display if available
                     * Type assertion to handle string vs TranscriptSegment[] mismatch
                     */
                    <TranscriptDisplay transcript={meetingData.transcript} />
                  ) : (
                    /* No transcript message */
                    <div className="bg-card rounded-lg p-6 border border-border text-center">
                      <p className="text-muted-foreground">
                        No transcript available
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/*
         * Sidebar: Chat for owners or loading skeleton if user not checked.
         * Fixed width with left border and card background.
         * Placed as second child in the flex layout.
         */}
        {!userChecked ? (
          <div className="w-96 border-l border-border p-4 bg-card">
            <div className="animate-pulse">
              <div className="h-4 bg-muted rounded w-1/2 mb-4"></div>
              <div className="space-y-3">
                <div className="h-8 bg-muted rounded"></div>
                <div className="h-8 bg-muted rounded"></div>
                <div className="h-8 bg-muted rounded"></div>
              </div>
            </div>
          </div>
        ) : (
          isOwner && (
            /* Chat sidebar for meeting owners */
            <ChatSidebar
              messages={messages}
              chatInput={chatInput}
              showSuggestions={showSuggestions}
              onInputChange={handleInputChange}
              onSendMessage={handleSendMessage}
              onSuggestionClick={handleSuggestionClick}
            />
          )
        )}
      </div>

      {/*
       * Custom audio player for meeting recording, positioned fixed at bottom.
       * Only shows if recording URL available, conditional on ownership for layout.
       */}
      <CustomAudioPlayer
        recordingUrl={meetingData?.recordingUrl}
        isOwner={isOwner}
      />
    </div>
  );
}

export default MeetingDetail;
