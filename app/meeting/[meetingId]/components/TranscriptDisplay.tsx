/**
 * Interface for a single word in the transcript with timing information.
 */
interface TranscriptWord {
  word: string;
  start: number; // Start time in seconds
  end: number; // End time in seconds
}

/**
 * Interface for a transcript segment spoken by a speaker.
 */
interface TranscriptSegment {
  words: TranscriptWord[]; // Array of words in this segment
  offset: number; // Start time offset for the segment in seconds
  speaker: string; // Name of the speaker
}

/**
 * Props for the TranscriptDisplay component.
 */
interface TranscriptDisplayProps {
  transcript: TranscriptSegment[]; // Full transcript divided into speaker segments
}

/**
 * Component to display the meeting transcript in a readable format.
 * Renders segments by speaker with timestamps and concatenated word text.
 * Handles empty transcript state with a fallback message.
 *
 * @param {TranscriptDisplayProps} props - Component props including the transcript data
 * @returns {JSX.Element} - Rendered transcript display or fallback UI
 */
export default function TranscriptDisplay({
  transcript,
}: TranscriptDisplayProps) {
  /**
   * Utility function to format seconds into MM:SS string.
   * @param {number} seconds - Time in seconds
   * @returns {string} - Formatted time string
   */
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  /**
   * Calculates the time range for a speaker's segment.
   * @param {TranscriptSegment} segment - The transcript segment
   * @returns {string} - Formatted start - end time string
   */
  const getSpeakerSegmentTime = (segment: TranscriptSegment) => {
    const startTime = segment.offset;
    const endTime =
      segment.words[segment.words.length - 1]?.end || segment.offset;
    return `${formatTime(startTime)} - ${formatTime(endTime)}`;
  };

  /**
   * Joins words in a segment into a full text string.
   * @param {TranscriptSegment} segment - The transcript segment
   * @returns {string} - Concatenated text without spaces
   */
  const getSegmentText = (segment: TranscriptSegment) => {
    return segment.words.map((word) => word.word).join("");
  };

  // Render fallback if no transcript is provided
  if (!transcript) {
    return (
      <div className="bg-card rounded-lg p-6 border border-border text-center">
        <p className="text-text-foreground">No transcript available.</p>
      </div>
    );
  }

  // Render the transcript segments
  return (
    <div className="bg-white rounded-lg p-6 border border-border">
      <h3 className="text-lg font-semibold text-foreground mb-4">
        Meeting Transcript
      </h3>
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {transcript.map((segment, index) => (
          <div
            className="pb-4 border-b border-border last:border-b-0"
            key={index}
          >
            {/* Speaker name and timestamp */}
            <div className="flex items-center gap-3 mb-2">
              <span className="font-medium text-foreground">
                {segment.speaker}
              </span>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                {getSpeakerSegmentTime(segment)}
              </span>
            </div>
            {/* Segment text */}
            <p className="text-muted-foreground leading-relaxed pl-4 ">
              {getSegmentText(segment)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
