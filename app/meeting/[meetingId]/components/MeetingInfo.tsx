import { useUser } from "@clerk/nextjs";
import Image from "next/image";

/**
 * Interface for meeting data displayed in the info section.
 */
interface MeetingData {
  title: string; // Meeting title
  date: string; // Formatted meeting date
  time: string; // Formatted meeting time
  userName: string; // Name of the meeting owner
}

/**
 * Props for the MeetingInfo component.
 */
interface MeetingInfoProps {
  meetingData: MeetingData; // Data for the meeting info display
}

/**
 * Component to display key meeting information including title, owner avatar/initials, date, and time.
 * Uses Clerk's useUser hook to fetch the current user's image for the avatar.
 * Falls back to initials if no image is available.
 *
 * @param {MeetingInfoProps} props - Component props including meeting data
 * @returns {JSX.Element} - Rendered meeting info section
 */
export const MeetingInfo: React.FC<MeetingInfoProps> = ({ meetingData }) => {
  // Fetch current user data from Clerk for avatar
  const { user } = useUser();

  return (
    <div className="mb-8">
      {/* Meeting title */}
      <h2 className="text-3xl font-bold text-foreground mb-3">
        {meetingData.title}
      </h2>
      
      {/* Meeting metadata: owner, date, time */}
      <div className="text-sm text-muted-foreground mb-8 flex items-center gap-4 flex-wrap">
        {/* Owner avatar and name */}
        <span className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0 ring-1 ring-border">
            {user?.imageUrl ? (
              // Use user image if available
              <Image
                src={user?.imageUrl}
                alt={meetingData?.userName}
                width={20}
                height={20}
                className="w-full h-full object-cover"
              />
            ) : (
              // Fallback to initials in a colored circle
              <div className="w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center ">
                <span className="text-xs text-primary font-medium">
                  {meetingData.userName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          {meetingData.userName}
        </span>
        
        {/* Date with calendar icon */}
        <span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M10.3333 5.66663V4.33333H5.66667V5.66663H1.33333V8.33333H5.66667V10.6666H10.3333V8.33333H14V6.66663H10.3333Z"
              stroke="#2585FF"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>{" "}
          {meetingData.date} at
        </span>
        
        {/* Time */}
        <span className="flex items-center gap-1">{meetingData.time}</span>
      </div>
    </div>
  );
};
