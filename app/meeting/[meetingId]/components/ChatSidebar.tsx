import { useUsage } from "@/app/contexts/UsageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";

/**
 * Interface for a chat message in the sidebar.
 */
interface Message {
  id: number; // Unique message ID
  content: string; // Message text
  isBot: boolean; // Whether the message is from the bot (true) or user (false)
  timestamp: Date; // Message timestamp
}

/**
 * Props for the ChatSidebar component.
 */
interface ChatSidebarProps {
  messages: Message[]; // Array of chat messages to display
  chatInput: string; // Current value of the chat input field
  showSuggestions: boolean; // Flag to show suggestion buttons
  onInputChange: (value: string) => void; // Callback for input changes
  onSendMessage: () => void; // Callback to send a message
  onSuggestionClick: (suggestion: string) => void; // Callback for suggestion clicks
}

/**
 * Sidebar component for chatting with the meeting assistant.
 * Displays chat messages, suggestions for new chats, usage limits, and input field.
 * Integrates with UsageContext to enforce daily chat limits.
 * Messages are styled differently for user vs. bot, with a "Thinking..." indicator for pending bot responses.
 *
 * @param {ChatSidebarProps} props - Component props for messages, input, and callbacks
 * @returns {JSX.Element} - Rendered chat sidebar UI
 */
export default function ChatSidebar({
  messages,
  chatInput,
  showSuggestions,
  onInputChange,
  onSendMessage,
  onSuggestionClick,
}: ChatSidebarProps) {
  // Get chat permission from usage context
  const { canChat } = useUsage();

  // Predefined suggestions for starting a chat

  const chatSuggestions = [
    "What are the key deadlines and milestones discussed in this meeting?",
    "Draft a comprehensive follow-up email summarizing today's decisions",
    "What specific feedback and recommendations were given to me?",
    "Create a detailed summary of all action items with assigned owners",
  ];

  return (
    <div className="w-96 border-l border-border bg-card flex flex-col">
      {/* Header section */}
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-foreground">Meeting Assistant</h3>
        <p className="text-sm text-muted-foreground">
          Ask me anything about this meeting
        </p>
      </div>

      {/* Messages area */}
      <div className="flex-1 p-4 overflow-auto space-y-4">
        {/* Render chat messages */}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.isBot ? "justify-start" : "justify-end"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.isBot
                  ? "bg-muted text-foreground"
                  : "bg-primary text-primary-foreground"
              }`}
            >
              <p className="text-sm">{message.content}</p>
            </div>
          </div>
        ))}

        {/* Pending bot response indicator */}
        {messages.length > 0 && !messages[messages.length - 1].isBot && (
          <div className="flex justify-start">
            <div className="bg-muted text-foreground rounded-lg p-3">
              <p className="text-sm">Thinking...</p>
            </div>
          </div>
        )}

        {/* Suggestion buttons for empty chat */}
        {showSuggestions && messages.length === 0 && (
          <div className="flex flex-col items-center space-y-3 mt-8">
            {chatSuggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => onSuggestionClick(suggestion)}
                disabled={!canChat}
                className={`w-4/5 rounded-lg p-4 border transition-colors text-center ${
                  canChat
                    ? "bg-primary/10 text-foreground border-primary/20 hover:bg-primary/20"
                    : "bg-muted/50 text-muted-foreground border-muted cursor-not-allowed"
                }`}
              >
                <p className="text-sm">⚡️ {suggestion}</p>
              </button>
            ))}
          </div>
        )}

        {/* Usage limit message */}
        {!canChat && (
          <div className="text-center p-4">
            <p className="text-xs text-muted-foreground mb-2">
              {" "}
              Daily chat limit reached
            </p>
            <a href="/pricing" className="text-xs text-primary underline">
              Upgrade to continute chatting
            </a>
          </div>
        )}
      </div>

      {/* Input section */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            type="text"
            value={chatInput}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key == "Enter") {
                e.preventDefault();
                onSendMessage();
              }
            }}
            placeholder={
              canChat ? "Ask about this meeting..." : "Daily limit reached"
            }
            className="flex-1"
            disabled={!canChat}
          />

          {/* Send button */}
          <Button
            type="button"
            onClick={onSendMessage}
            disabled={!chatInput.trim() || !canChat}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
