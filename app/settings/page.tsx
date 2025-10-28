/**
 * Settings Page Component
 *
 * This component provides a user settings interface where users can:
 * - View their profile information (name, email, plan)
 * - Customize the bot name for their AI assistant
 * - Upload and change the bot's avatar image
 * - Save changes to bot settings
 * - Sign out of their account
 *
 * The component integrates with Clerk for authentication and uses custom API endpoints
 * for managing bot settings and image uploads.
 */

"use client";

import { Button } from "@/components/ui/button"; // UI button component
import { Input } from "@/components/ui/input"; // UI input field component
import { Label } from "@/components/ui/label"; // UI label component for forms
import { SignOutButton, useAuth, useUser } from "@clerk/nextjs"; // Clerk authentication hooks and sign out button
import { Bot, LogOut, Save, Upload, User } from "lucide-react"; // Lucide React icons
import Image from "next/image";
import React, { useEffect, useState } from "react"; // React hooks and core library

function Settings() {
  // Authentication hooks from Clerk
  const { user } = useUser(); // Current user information
  const { userId } = useAuth(); // Current user ID

  // Bot customization state
  const [botName, setBotName] = useState("MinuteMind Bot"); // Name of the AI assistant bot
  const [botImageUrl, setBotImageUrl] = useState<string | null>(null); // URL of the bot's avatar image
  const [userPlan, setUserPlan] = useState("free"); // User's subscription plan

  // UI state management
  const [isLoading, setIsLoading] = useState(true); // Whether initial data is being loaded
  const [isSaving, setIsSaving] = useState(false); // Whether bot settings are being saved
  const [isUploading, setIsUploading] = useState(false); // Whether an image is being uploaded
  const [hasChanges, setHasChanges] = useState(false); // Whether there are unsaved changes

  // Fetch bot settings when user ID is available
  useEffect(() => {
    if (userId) {
      fetchBotSettings();
    }
  }, [userId]);

  /**
   * Fetches the user's bot settings from the API on component mount or user change
   * Sets bot name, image URL, and user plan from the response
   */
  const fetchBotSettings = async () => {
    try {
      const response = await fetch("/api/user/bot-settings");
      if (response.ok) {
        const data = await response.json();
        setBotName(data.botName || "MinuteMind Bot");
        setBotImageUrl(data.botImageUrl || null);
        setUserPlan(data.plan || "free");
      }
    } catch (error) {
      console.error("error fetching bot settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles changes to the bot name input field
   * Updates the bot name state and marks that there are unsaved changes
   */
  const handleBotNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBotName(e.target.value);
    setHasChanges(true);
  };

  /**
   * Handles image upload for the bot avatar
   * Creates a FormData object, sends it to the upload endpoint, and updates the bot image URL
   */
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/upload/bot-avatar", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setBotImageUrl(data.url);
        setHasChanges(true);
      } else {
        console.error("image uploaded failed:", data.error);
      }
    } catch (error) {
      console.error("image uploaded failed:", error);
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Saves the bot settings (name and image URL) to the API
   * Resets the hasChanges flag if the save is successful
   */
  const saveBotSettings = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/user/bot-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          botName,
          botImageUrl,
        }),
      });

      if (response.ok) {
        setHasChanges(false);
      }
    } catch (error) {
      console.error("error saving bot settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Returns the display-friendly name for a subscription plan
   * @param plan - The lowercase plan string from the API
   * @returns The formatted display name for the plan
   */
  const getPlanDisplayName = (plan: string) => {
    switch (plan.toLowerCase()) {
      case "free":
        return "Free Plan";
      case "starter":
        return "Starter Plan";
      case "pro":
        return "Pro Plan";
      case "premium":
        return "Premium Plan";
      default:
        "Invalid Plan";
    }
  };

  /**
   * Returns the Tailwind CSS classes for styling the plan badge
   * Free plan gets gray styling, all other plans get green styling
   * @param plan - The plan name
   * @returns CSS class string for the plan badge background and text color
   */
  const getPlanColor = (plan: string) => {
    return plan.toLowerCase() === "free"
      ? "bg-gray-500/20 text-gray-400"
      : "bg-green-500/20 text-green-400";
  };

  // Loading state - shows spinner while fetching initial data
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-foreground mb-4"></div>
          <div className="text-foreground">Loading Settings...</div>
        </div>
      </div>
    );
  }

  return (
    // Main settings page container
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        {/* Page title */}
        <h1 className="text-2xl font-bold text-foreground mb-8 text-center">
          Settings
        </h1>

        {/* User profile card - displays user information, email, and plan */}
        <div className="relative bg-card/80 backdrop-blur-sm rounded-lg p-6 border border-border/50 mb-8 shadow-xl shadow-black/10">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-lg pointer-events-none"></div>
          <div className="relative">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-full flex-shrink-0 overflow-hidden ring-2 ring-primary/20">
                {user?.imageUrl ? (
                  <Image
                    src={user.imageUrl}
                    alt="profile"
                    className="w-16 h-16 rounded-full object-cover"
                    width={16}
                    height={16}
                  />
                ) : (
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center ">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                )}
              </div>
              <h2 className="text-lg font-semibold text-foreground">
                {user?.fullName || "User"}
              </h2>
            </div>
            <div className="flex justify-between items-start ">
              <div>
                <span className="text-sm bg-muted/80 text-muted-foreground px-2 py-1 rounded-full">
                  EMAIL
                </span>
                <p className="text-sm text-foreground mt-1">
                  {user?.primaryEmailAddress?.emailAddress || "No email"}
                </p>
              </div>
              <span
                className={`text-xs px-2 py-1 rounded-full ${getPlanColor(
                  userPlan
                )}`}
              >
                {getPlanDisplayName(userPlan)}
              </span>
            </div>
          </div>
        </div>

        {/* Bot customization section - allows users to set bot name and avatar */}
        <div className="bg-card rounded-lg p-6 border border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Bot Customization
          </h3>

          {/* Bot name input field */}
          <div className="mb-6">
            <Label
              htmlFor="bot-name"
              className="block text-sm font-medium text-foreground mb-2"
            >
              Bot Name
            </Label>

            <Input
              id="bot-name"
              type="text"
              value={botName}
              onChange={handleBotNameChange}
              placeholder="Enter Bot Name..."
            />
          </div>

          {/* Bot avatar upload section */}
          <div className="mb-6">
            <Label
              htmlFor="bot-image-upload"
              className="block text-sm font-medium text-foreground mb-2"
            >
              Bot Avatar
            </Label>

            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center overflow-hidden">
                {botImageUrl ? (
                  <Image
                    src={botImageUrl}
                    alt="Bot Avatar"
                    className="w-20 h-20 rounded-full object-cover"
                    width={20}
                    height={20}
                  />
                ) : (
                  <Bot className="h-10 w-10 text-primary" />
                )}
              </div>

              <div>
                <Input
                  type="file"
                  id="bot-image-upload"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUploading}
                  className="hidden"
                />

                <Label
                  htmlFor="bot-image-upload"
                  className={`inline-flex items-center gap-2 px-3 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors cursor-pointer ${
                    isUploading ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  <Upload className="h-4 w-4" />
                  {isUploading ? "Uploading..." : "Upload Image"}
                </Label>

                <p className="text-xs text-muted-foreground mt-1">JPG or PNG</p>
              </div>
            </div>
          </div>

          {/* Save changes button - only visible when there are unsaved changes */}
          {hasChanges && (
            <Button
              onClick={saveBotSettings}
              disabled={isSaving}
              className="inline-flex items-center gap-2 mb-6 cursor-pointer"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          )}

          {/* Sign out section - placed at the bottom with a border separator */}
          <div className="pt-4 border-t border-border">
            <SignOutButton>
              <Button
                variant="destructive"
                className="inline-flex items-center gap-2 cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </SignOutButton>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
