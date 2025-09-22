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

  // Handle click on volume slider to adjust volume
  const handleVolumeChange = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = playerRef.current?.audio?.current;
    if (!audio) {  // Note: duration check removed as it's not relevant for volume
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const newVolume = Math.max(0, Math.min(1, clickX / width));

    audio.volume = newVolume;
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
    <div
      className={`fixed bottom-0 bg-card border-t border-border p-5 ${
        !isOwner ? "left-0 right-0" : ""
      }`}
      style={
        isOwner ? { left: "var(--sidebar-width, 16rem)", right: "24rem" } : {}
      }
    >
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

      <div className={!isOwner ? "max-w-4xl mx-auto" : ""}>
        {/* Main audio controls row */}
        <div className="flex items-center gap-4">
          {/* Skip and play/pause buttons */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSkipBack}
              className="hover:bg-muted rounded-lg transition-colors cursor-pointer"
            >
              <SkipBack className="h-4 w-4 text-foreground" />
            </Button>
    
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
    
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSkipForward}
              className="hover:bg-muted rounded-lg transition-colors cursor-pointer"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>
    
          {/* Progress bar with time labels */}
          <div className="flex-1 flex items-center gap-3">
            <span className="text-sm text-muted-foreground min-w-[40px]">
              {formatTime(currentTime)}
            </span>
    
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
    
            <span className="text-sm text-muted-foreground min-w-[40px]">
              {formatTime(duration)}
            </span>
          </div>
    
          {/* Volume control */}
          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-muted-foreground" />
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
    
          {/* Recording label */}
          <div className="text-sm text-muted-foreground">Meeting Recording</div>
        </div>
      </div>
    </div>
  );
}

export default CustomAudioPlayer;
