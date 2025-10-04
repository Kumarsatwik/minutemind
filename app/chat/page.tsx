'use client'

import React from 'react'
import useChatAll from './hooks/useChatAll'
import ChatSuggestions from './components/ChatSuggestions'
import ChatMessages from './components/ChatMessages'
import ChatInput from './components/ChatInput'

/**
 * Main Chat Interface Component
 *
 * This component renders the primary chat interface for the application,
 * providing a full-screen chat experience with message history, real-time
 * input, and contextual suggestions for new users.
 *
 * Features:
 * - Full-screen responsive layout
 * - Conditional rendering of suggestions vs. message history
 * - Real-time message input and sending
 * - Loading states and user feedback
 * - Integration with chat management hooks
 */
function Chat() {
    // Destructure all chat-related state and handlers from the custom hook
    // This centralizes chat logic and makes the component focused on UI rendering
    const {
        chatInput,           // Current text in the input field
        messages,            // Array of chat messages to display
        showSuggestions,     // Boolean to show/hide suggestion prompts
        isLoading,           // Loading state for async operations
        chatSuggestions,     // Array of suggested conversation starters
        handleSendMessage,   // Function to send a message
        handleSuggestionClick, // Function to handle suggestion selection
        handleInputChange    // Function to handle input field changes
    } = useChatAll()

    return (
        // Main container with full screen height and background styling
        <div className='h-screen bg-background flex flex-col'>
            {/* Centered content container with max width for optimal readability */}
            <div className='flex-1 flex flex-col max-w-4xl mx-auto w-full'>

                {/* Scrollable message area with padding */}
                <div className='flex-1 p-6 overflow-auto'>
                    {/*
                     * Conditional Rendering Logic:
                     * - Show suggestions if no messages exist and suggestions are enabled
                     * - Otherwise show the chat messages
                     *
                     * This provides a better first-time user experience by showing
                     * helpful conversation starters when the chat is empty.
                     */}
                    {messages.length === 0 && showSuggestions ? (
                        // Display suggestion prompts for new conversations
                        <ChatSuggestions
                            suggestions={chatSuggestions}
                            onSuggestionClick={handleSuggestionClick}
                        />
                    ) : (
                        // Display chat messages with loading indicator
                        <ChatMessages
                            messages={messages}
                            isLoading={isLoading}
                        />
                    )}
                </div>

                {/* Input area fixed at bottom for message composition */}
                <ChatInput
                    chatInput={chatInput}
                    onInputChange={handleInputChange}
                    onSendMessage={handleSendMessage}
                    isLoading={isLoading}
                />
            </div>
        </div>
    )
}

export default Chat
