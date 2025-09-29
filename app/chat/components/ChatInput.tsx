import { useUsage } from '@/app/contexts/UsageContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send } from 'lucide-react'
import React from 'react'

/**
 * ChatInput Component Props
 * Defines the interface for the chat input component with message handling
 * and loading state management.
 */
interface ChatInputProps {
    chatInput: string                    // Current value of the input field
    onInputChange: (value: string) => void // Handler for input text changes
    onSendMessage: () => void           // Handler for sending messages
    isLoading: boolean                  // Loading state to disable input during processing
}

/**
 * Chat Input Component
 *
 * This component provides the message input interface for the chat system.
 * It includes usage limit checking, dynamic placeholder text, keyboard shortcuts,
 * and visual feedback for different states (loading, disabled, limit reached).
 *
 * Features:
 * - Real-time usage limit monitoring and display
 * - Dynamic placeholder text based on user permissions
 * - Keyboard shortcut support (Enter to send)
 * - Loading state management
 * - Responsive design with proper spacing
 * - Upgrade prompts for limit-exceeded users
 */
function ChatInput({
    chatInput,
    onInputChange,
    onSendMessage,
    isLoading
}: ChatInputProps) {

    // Access usage context to check chat limits and current usage
    const { canChat, usage, limits } = useUsage()

    return (
        // Main container with padding for proper spacing
        <div className='p-6'>
            {/*
             * Usage Limit Warning Banner
             * Displayed when user has exceeded daily chat limits
             * Provides clear feedback and upgrade path
             */}
            {!canChat && usage && (
                <div className='max-w-4xl mx-auto mb-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg'>
                    <p className='text-sm text-orange-600 dark:text-orange-400 text-center'>
                        {/* Dynamic usage display with current/total counts */}
                        Daily limit reached ({usage.chatMessagesToday}/{limits.chatMessages} messages used).
                        {/* Direct link to pricing page for upgrades */}
                        <a href="/pricing" className='underline ml-1'>Upgrade your plan</a> to continue chatting.
                    </p>
                </div>
            )}

            {/* Input area with responsive centering and proper spacing */}
            <div className='flex gap-3 max-w-4xl mx-auto'>
                {/* Main text input field with comprehensive event handling */}
                <Input
                    type='text'
                    value={chatInput}
                    onChange={e => onInputChange(e.target.value)}  // Handle text input changes
                    onKeyDown={(e) => e.key === 'Enter' && onSendMessage()}  // Enter key shortcut
                    placeholder={
                        // Dynamic placeholder based on user permissions
                        canChat
                            ? 'Ask about any meeting - deadlines, decisions, action items, participants...'
                            : 'Daily chat limit reached - upgrade to continue'
                    }
                    className='flex-1'  // Take up remaining space in flex container
                    disabled={isLoading || !canChat}  // Disable during loading or when limits exceeded
                />

                {/* Send button with icon and consistent styling */}
                <Button
                    onClick={onSendMessage}                    // Handle click to send message
                    disabled={isLoading || !canChat}          // Disable during loading or limit exceeded
                    className='px-4 py-3'                      // Consistent padding with input height
                >
                    {/* Send icon from Lucide React */}
                    <Send className='h-4 w-4' />
                </Button>
            </div>
        </div>
    )
}

export default ChatInput
