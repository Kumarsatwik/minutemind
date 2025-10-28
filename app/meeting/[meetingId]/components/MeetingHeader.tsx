import { Button } from "@/components/ui/button";
import { Check, Eye, Share2, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { toast } from "sonner";

/**
 * Props for the MeetingHeader component.
 */
interface MeetingHeaderProps {
  title: string; // Meeting title
  meetingId?: string; // Optional meeting ID for actions
  summary?: string; // Optional meeting summary for posting
  actionItems?: string; // Optional action items for posting
  isOwner: boolean; // Whether the current user owns the meeting
  isLoading?: boolean; // Loading state for the header
}

/**
 * Header component for the meeting page.
 * Displays the meeting title and provides action buttons for owners:
 * - Post to Slack (sends summary and action items)
 * - Share meeting link (copies to clipboard)
 * - Delete meeting (API call, redirects on success)
 * For non-owners, shows a "Viewing shared meeting" indicator.
 * Handles loading state with spinner.
 *
 * @param {MeetingHeaderProps} props - Component props
 * @returns {JSX.Element} - Rendered header with conditional actions
 */
function MeetingHeader({
  title,
  meetingId,
  summary,
  actionItems,
  isOwner,
  isLoading = false,
}: MeetingHeaderProps) {
  // State for UI interactions
  const [isPosting, setIsPosting] = useState(false); // Posting to Slack loading
  const [copied, setCopied] = useState(false); // Share link copied state
  const [isDeleting, setIsDeleting] = useState(false); // Deleting meeting loading
  const router = useRouter();

  /**
   * Handles posting the meeting summary and action items to Slack.
   * Shows toast notification and calls API; currently no error handling in UI.
   */
  const handlePostToSlack = async () => {
    if (!meetingId) {
      return;
    }

    try {
      setIsPosting(true);

      // Show success toast immediately (optimistic UI)
      toast("✅ Posted to Slack", {
        action: {
          label: "OK",
          onClick: () => {},
        },
      });

      // API call to post to Slack
      const response = await fetch("/api/slack/post-meeting", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          meetingId: meetingId,
          summary: summary || "Meeting summary not available",
          actionItems: actionItems || "No action items recorded",
        }),
      });

      await response.json();

      // Note: No specific handling for success/error in UI beyond initial toast
      if (response.ok) {
        // Success - no additional action
      } else {
        // Error - no UI feedback implemented
      }
    } catch (error) {
      // Error - no UI feedback implemented
      console.error("Post to Slack error:", error);
    } finally {
      setIsPosting(false);
    }
  };

  /**
   * Handles sharing the meeting by copying the link to clipboard.
   * Shows success toast and temporary "Copied!" state.
   */
  const handleShare = async () => {
    if (!meetingId) {
      return;
    }

    try {
      const shareUrl = `${window.location.origin}/meeting/${meetingId}`;
      await navigator.clipboard.writeText(shareUrl);

      setCopied(true);
      toast("✅ Meeting link copied!", {
        action: {
          label: "OK",
          onClick: () => {},
        },
      });

      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("failed to copy:", error);
    }
  };

  /**
   * Handles deleting the meeting.
   * Calls DELETE API, shows toast, and redirects to home on success.
   */
  const handleDelete = async () => {
    if (!meetingId) {
      return;
    }

    try {
      setIsDeleting(true);
      toast("✅ Meeting Deleted", {
        action: {
          label: "OK",
          onClick: () => {},
        },
      });

      // API call to delete meeting
      const response = await fetch(`/api/meetings/${meetingId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });
      await response.json();

      if (response.ok) {
        // Success - redirect to home page
        router.push("/home");
      }
    } catch (error) {
      console.error("delete error", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-card border-b border-border px-6 py-3.5 flex justify-between items-center">
      {/* Meeting title */}
      <h1 className="text-xl font-semibold text-foreground">{title}</h1>

      {/* Conditional rendering based on loading and ownership */}
      {isLoading ? (
        // Loading spinner
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-muted-foreground"></div>
          Loading...
        </div>
      ) : isOwner ? (
        // Owner actions: Post to Slack, Share, Delete
        <div className="flex gap-3">
          {/* Post to Slack button */}
          <Button
            onClick={handlePostToSlack}
            disabled={isPosting || !meetingId}
            variant="outline"
            className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white cursor-pointer disabled:cursor-not-allowed"
          >
            <Image
              src="/slack.png"
              alt="Slack"
              className="w-4 h-4 mr-2"
              width={20}
              height={20}
            />
            {isPosting ? "Posting..." : "Post to Slack"}
          </Button>

          {/* Share button with copy state */}
          <Button
            onClick={handleShare}
            variant="outline"
            className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors text-foreground text-sm cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4" />
                Share
              </>
            )}
          </Button>

          {/* Delete button */}
          <Button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive text-white hover:bg-destructive/90 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      ) : (
        // Non-owner view indicator
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Eye className="w-4 h-4" />
          Viewing shared meeting
        </div>
      )}
    </div>
  );
}

export default MeetingHeader;
