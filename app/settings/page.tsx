"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SignOutButton, useAuth, useUser } from "@clerk/nextjs";
import { Bot, LogOut, Save, Upload, User } from "lucide-react";
import Image from "next/image";
import React, { useEffect, useState } from "react";

/**
 * Settings page component for managing user and bot configuration.
 *
 * This component allows users to:
 * - View their profile information
 * - Customize bot name and avatar
 * - View their subscription plan
 * - Sign out of the application
 *
 * Features include:
 * - Real-time bot customization with change tracking
 * - Image upload for bot avatar
 * - Loading states and error handling
 * - Responsive design with modern UI
 */
function Settings() {
  // Get authenticated user data from Clerk
  const { user } = useUser();
  const { userId } = useAuth();

  // Bot customization state
  const [botName, setBotName] = useState("Meeting Bot");
  // URL for the bot's avatar image, null if not set
  const [botImageUrl, setBotImageUrl] = useState<string | null>(null);

  // User subscription plan
  const [userPlan, setUserPlan] = useState("free");

  // UI loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load bot settings when component mounts and user is authenticated
  useEffect(() => {
    if (userId) {
      fetchBotSettings();
    }
  }, [userId]);

  // Fetch bot settings from the API
  const fetchBotSettings = async () => {
    try {
      const response = await fetch("/api/user/bot-settings");
      if (response.ok) {
        const data = await response.json();
        // Set bot name with fallback to default
        setBotName(data.botName || "Meeting Bot");
        // Set bot image URL, null if not configured
        setBotImageUrl(data.botImageUrl || null);
        // Set user plan with fallback to free
        setUserPlan(data.plan || "free");
      }
    } catch (error) {
      console.error("error fetching bot settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle bot name input changes
  const handleBotNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBotName(e.target.value);
    setHasChanges(true);
  };

  // Handle bot avatar image upload
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

  // Save bot settings to the API
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
        // Clear the changes flag on successful save
        setHasChanges(false);
      }
    } catch (error) {
      console.error("error saving bot settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Convert plan string to display name
  const getPlanDisplayName = (plan: string): string => {
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
        return "Invalid Plan";
    }
  };

  // Get CSS classes for plan badge based on plan type
  const getPlanColor = (plan: string): string => {
    return plan.toLowerCase() === "free"
      ? "bg-gray-500/20 text-gray-400"
      : "bg-green-500/20 text-green-400";
  };

  // Show loading spinner while fetching initial data
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
    <div className="min-h-screen bg-background p-6">
      {/* Main container with responsive centering */}
      <div className="max-w-2xl mx-auto">
        {/* Page title */}
        <h1 className="text-2xl font-bold text-foreground mb-8 text-center">
          Settings
        </h1>

        {/* User profile card with gradient overlay */}
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

        {/* Bot customization settings card */}
        <div className="bg-card rounded-lg p-6 border border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Bot Customization
          </h3>

          {/* Bot name input section */}
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

            {/* Avatar preview and upload controls */}
            <div className="flex items-center gap-4">
              {/* Current avatar display */}
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center overflow-hidden">
                {botImageUrl ? (
                  <Image
                    src={botImageUrl}
                    alt="Bot Avatar"
                    className="w-20 h-20 rounded-full object-cover"
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

          {/* Save button - only shown when there are unsaved changes */}
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

          {/* Sign out section */}
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
