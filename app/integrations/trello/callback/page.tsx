"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * TrelloCallback page component handles the OAuth callback after Trello authorization.
 * This page is redirected to by Trello after the user grants permission to the app.
 * It extracts the access token from the URL hash and processes the connection.
 */
export default function TrelloCallback() {
  const router = useRouter();

  // Status message displayed to user during the connection process
  const [status, setStatus] = useState("Connecting your trello account ...");

  useEffect(() => {
    /**
     * Processes the OAuth token received from Trello after authorization.
     * Extracts token from URL hash, validates it, and saves the connection.
     */
    const processToken = async () => {
      try {
        // Extract token from URL hash (Trello OAuth returns token in hash fragment)
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const token = params.get("token");

        // Validate that token exists
        if (!token) {
          setStatus("no auth token found");
          setTimeout(() => router.push("/integrations?error=no_token"), 2000);
          return;
        }

        // Update status and send token to backend for processing
        setStatus("saving your connection...");

        const response = await fetch("/api/integrations/trello/process-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        // Handle successful connection
        if (response.ok) {
          setStatus("Success! Redirecting...");
          // Redirect to integrations page with success message and setup prompt
          router.push("/integrations?success=trello_connected&setup=trello");
        } else {
          // Handle API error
          setStatus("failed to sabe connection");
          setTimeout(
            () => router.push("/integrations?error=save_failed"),
            2000
          );
        }
      } catch {
        // Handle any unexpected errors
        setStatus("an error occured");
        setTimeout(() => router.push("/integrations?error=save_failed"), 2000);
      }
    };

    // Execute token processing when component mounts
    processToken();
  }, [router]);

  return (
    // Full-screen loading overlay with centered content
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        {/* Animated loading spinner */}
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        {/* Main heading */}
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Connecting trello
        </h2>
        {/* Dynamic status message */}
        <p className="text-muted-foreground">{status}</p>
      </div>
    </div>
  );
}
