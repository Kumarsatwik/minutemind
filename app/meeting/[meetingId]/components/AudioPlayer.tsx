import { Button } from "@/components/ui/button";
import { Pause, Play, SkipBack, SkipForward, Volume2 } from "lucide-react";
import React, { useRef, useState } from "react";
import AudioPlayer from "react-h5-audio-player";
import "react-h5-audio-player/lib/styles.css";

/**
 * Props for the CustomAudioPlayer component.
 * @param recordingUrl - The URL of the audio recording to play.
 * @param isOwner - Whether the current user is the meeting owner (affects layout).
 */
interface CustomAudioPlayerProps {
  recordingUrl?: string;
  isOwner?: boolean;
}

/**
 * A custom audio player component for playing meeting recordings.
 * Features play/pause, skip controls, progress bar, and volume control.
 * Uses react-h5-audio-player under the hood but provides a custom UI.
 */
function CustomAudioPlayer({
  recordingUrl,
  isOwner = true,
}: CustomAudioPlayerProps) {
  const playerRef = useRef<InstanceType<typeof AudioPlayer>>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.75);

  if (!recordingUrl) {
    return null;
  }

  // Handle play/pause toggle for the audio
  const handlePlayPause = () => {
    const audio = playerRef.current?.audio?.current;
    if (!audio) {
      return;
    }

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
  };

  // Skip backward by 10 seconds
  const handleSkipBack = () => {
    const audio = playerRef.current?.audio?.current;
    if (!audio) {
      return;
    }
    audio.currentTime = Math.max(0, audio.currentTime - 10);
  };

  // Skip forward by 10 seconds
  const handleSkipForward = () => {
    const audio = playerRef.current?.audio?.current;
    if (!audio) {
      return;
    }
    audio.currentTime = Math.min(duration, audio.currentTime + 10);
  };

  // Handle click on progress bar to seek to a specific time
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = playerRef.current?.audio?.current;
    if (!audio || !duration) {
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const newTime = (clickX / width) * duration;

    audio.currentTime = newTime;
  };

  /**
   * Handles user interaction with the volume slider by calculating the new volume
   * based on the click position within the slider and updating both the audio element
   * and the component's state accordingly.
   * @param e - The mouse event triggered by clicking on the volume slider.
   */
  const handleVolumeChange = (e: React.MouseEvent<HTMLDivElement>) => {
    // Retrieve the underlying HTML audio element via the player reference.
    // This allows direct manipulation of the audio properties.
    const audio = playerRef.current?.audio?.current;

    // Early return if the audio element is not yet available (e.g., before loading).
    // Note: A previous duration check was removed here since volume adjustment
    // does not depend on the audio duration.
    if (!audio) {
      return;
    }

    // Obtain the bounding client rectangle of the volume slider element.
    // This provides the position and dimensions relative to the viewport.
    const rect = e.currentTarget.getBoundingClientRect();

    // Calculate the x-coordinate of the click relative to the left edge of the slider.
    // This determines where along the slider the user clicked.
    const clickX = e.clientX - rect.left;

    // Get the total width of the volume slider for normalization.
    const width = rect.width;

    // Compute the new volume level as a fraction of the slider width (0 to 1).
    // Math.max and Math.min ensure the value is clamped within valid bounds,
    // preventing errors from clicks outside the slider area.
    const newVolume = Math.max(0, Math.min(1, clickX / width));

    // Apply the calculated volume to the audio element, which immediately affects playback.
    audio.volume = newVolume;

    // Update the component's local state to synchronize the UI (e.g., slider visual position)
    // with the new volume value.
    setVolume(newVolume);
  };

  // Format seconds into MM:SS string
  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <>
      {/* 
       * The main container for the audio player, positioned fixed at the bottom of the screen.
       * It uses conditional styling based on whether the user is the meeting owner:
       * - For owners: Offset to account for sidebar and right panel widths.
       * - For non-owners: Full width across the bottom.
       * This ensures the player doesn't overlap with other UI elements.
       */}
      <div
        className={`fixed bottom-0 bg-card border-t border-border p-5 ${
          !isOwner ? "left-0 right-0" : ""
        }`}
        style={
          isOwner ? { left: "var(--sidebar-width, 16rem)", right: "24rem" } : {}
        }
      >
        {/* 
         * Hidden wrapper for the underlying AudioPlayer component from react-h5-audio-player.
         * This component handles the actual audio playback logic but is visually hidden
         * (display: none) to allow for a custom UI implementation below.
         * Event handlers update the component state for play status, time, duration, etc.
         */}
        <div style={{ display: "none" }}>
          <AudioPlayer
            ref={playerRef}
            src={recordingUrl}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            onListen={(e) => {
              const audio = e.target as HTMLAudioElement;
              if (audio && audio.currentTime) {
                setCurrentTime(audio.currentTime);
              }
            }}
            onLoadedMetaData={(e) => {
              const audio = e.target as HTMLAudioElement;
              if (audio && audio.duration) {
                setDuration(audio.duration);
              }
            }}
            volume={volume}
            hasDefaultKeyBindings={true}
            autoPlayAfterSrcChange={false}
            showSkipControls={false}
            showJumpControls={false}
            showDownloadProgress={false}
            showFilledProgress={false}
          />
        </div>

        {/* 
         * Container for the visible custom UI controls.
         * Centers the controls horizontally with max-width when not in owner mode
         * to prevent them from spanning the full screen width unnecessarily.
         */}
        <div className={!isOwner ? "max-w-4xl mx-auto" : ""}>
          {/* Main audio controls row - Horizontal layout for all player elements */}
          <div className="flex items-center gap-4">
            {/* Skip and play/pause buttons - Grouped navigation controls */}
            <div className="flex items-center gap-3">
              {/* Skip backward button - Rewinds audio by 10 seconds */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSkipBack}
                className="hover:bg-muted rounded-lg transition-colors cursor-pointer"
              >
                <SkipBack className="h-4 w-4 text-foreground" />
              </Button>

              {/* Play/Pause toggle button - Primary control for starting/stopping playback.
               * Icon changes based on isPlaying state. */}
              <Button
                variant="default"
                size="icon"
                onClick={handlePlayPause}
                className="bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors cursor-pointer"
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
              </Button>

              {/* Skip forward button - Advances audio by 10 seconds */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSkipForward}
                className="hover:bg-muted rounded-lg transition-colors cursor-pointer"
              >
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>

            {/* Progress bar with time labels - Displays current position and total duration */}
            <div className="flex-1 flex items-center gap-3">
              {/* Current time label - Shows elapsed time in MM:SS format */}
              <span className="text-sm text-muted-foreground min-w-[40px]">
                {formatTime(currentTime)}
              </span>

              {/* Progress bar container - Clickable to seek to a specific time.
               * Inner div represents the filled portion based on currentTime/duration. */}
              <div
                className="flex-1 bg-muted rounded-full h-2 cursor-pointer"
                onClick={handleProgressClick}
              >
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${duration ? (currentTime / duration) * 100 : 0}%`,
                  }}
                />
              </div>

              {/* Total duration label - Shows full audio length in MM:SS format */}
              <span className="text-sm text-muted-foreground min-w-[40px]">
                {formatTime(duration)}
              </span>
            </div>

            {/* Volume control - Simple slider for adjusting audio volume */}
            <div className="flex items-center gap-2">
              {/* Volume icon - Visual indicator for the volume control */}
              <Volume2 className="h-4 w-4 text-muted-foreground" />
              {/* Volume slider - Clickable bar where position sets volume (0-100%) */}
              <div
                className="w-20 bg-muted rounded-full h-2 cursor-pointer"
                onClick={handleVolumeChange}
              >
                <div
                  className="bg-primary h-2 rounded-full"
                  style={{ width: `${volume * 100}%` }}
                />
              </div>
            </div>

            {/* Recording label - Static text indicating this is a meeting recording */}
            <div className="text-sm text-muted-foreground">Meeting Recording</div>
          </div>
        </div>
      </div>
    </>
  );
}

export default CustomAudioPlayer;
