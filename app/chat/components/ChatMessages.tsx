import React from 'react'

/**
 * Message Interface
 * Defines the structure of a chat message with unique identification,
 * content, sender type, and timestamp for proper message tracking.
 */
interface Message {
    id: number        // Unique identifier for each message
    content: string   // The actual message text content
    isBot: boolean    // Flag to distinguish bot messages from user messages
    timestamp: Date   // When the message was created (for potential future use)
}

/**
 * ChatMessages Component Props
 * Props interface defining the data required to render the chat messages.
 */
interface ChatMessagesProps {
    messages: Message[]  // Array of messages to display
    isLoading: boolean   // Loading state to show progress indicator
}

/**
 * Chat Messages Display Component
 *
 * This component renders a list of chat messages with distinct styling for
 * bot and user messages. It handles message layout, responsive design, and
 * displays a loading indicator when the bot is processing a request.
 *
 * Features:
 * - Distinct visual styling for bot vs user messages
 * - Responsive message bubbles with proper alignment
 * - Loading state with contextual message
 * - Accessible color scheme and typography
 */
function ChatMessages({
    messages,
    isLoading
}: ChatMessagesProps) {
    return (
        // Container with vertical spacing between messages
        <div className='space-y-4'>
            {/*
             * Render each message with appropriate styling and alignment
             * - Bot messages: Left-aligned with card-like appearance
             * - User messages: Right-aligned with primary color scheme
             */}
            {messages.map((message) => (
                // Message container with conditional alignment based on sender
                <div key={message.id} className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}>
                    {/* Message bubble with responsive width and conditional styling */}
                    <div className={`max-w-[70%] rounded-lg p-4 ${message.isBot
                        // Bot message styling: Card-like with border and muted colors
                        ? 'bg-card border border-border text-foreground'
                        // User message styling: Primary theme colors
                        : 'bg-primary text-primary-foreground'
                        }`}>
                        {/* Message content with readable typography */}
                        <p className='text-sm leading-relaxed'>{message.content}</p>
                    </div>
                </div>
            ))}

            {/*
             * Loading State Display
             * Shows a bot-like message bubble when the system is processing
             * Provides user feedback during async operations like RAG searches
             */}
            {isLoading && (
                <div className='flex justify-start'>
                    <div className='bg-card border border-border rounded-lg p-4'>
                        {/* Contextual loading message with bot emoji */}
                        <p className='text-sm text-muted-foreground'>🤖 Searching through all your meetings...</p>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ChatMessages
