/**
 * Custom hook for managing chat functionality with usage tracking.
 * Handles sending messages to chat APIs, managing conversation state,
 * and enforcing usage limits for chat interactions.
 */

import { useUsage } from "@/app/contexts/UsageContext"
import { useState } from "react"

/**
 * Interface defining the structure of a chat message
 */
export interface ChatMessage{
    id:number
    content:string
    isBot:boolean
    timestamp:Date
}

/**
 * Configuration options for the useChatCore hook
 */
interface UseChatCoreOptions{
    apiEndpoint:string
    getRequestBody:(input:string)=>Record<string, unknown>
}

/**
 * Custom hook that provides chat functionality with configurable API endpoints
 * @param options - Configuration object containing API endpoint and request body formatter
 * @returns Object containing chat state and handler functions
 */
export function useChatCore({apiEndpoint,getRequestBody}:UseChatCoreOptions){
    // Chat input state
    const [chatInput,setChatInput]=useState('') // Current text in the chat input field

    // Conversation state
    const [messages,setMessages]=useState<ChatMessage[]>([]); // Array of chat messages in the conversation
    const [showSuggestions,setShowSuggestions]=useState(true) // Whether to show chat suggestions
    const [isLoading,setIsLoading]=useState(false) // Loading state during API calls

    // Usage tracking from context
    const {canChat,incrementChatUsage}=useUsage()
    /**
     * Handles sending a chat message to the configured API endpoint
     * Manages the complete chat flow including validation, API calls, and error handling
     */
    const handleSendMessage = async()=>{
        // Early returns for invalid states
        if(!chatInput.trim() || isLoading){
            return
        }
        if(!canChat){
            return
        }

        // Update UI state
        setShowSuggestions(false)
        setIsLoading(true)

        // Create and add user message to conversation
        const newMessage:ChatMessage = {
            id:messages.length+1,
            content:chatInput,
            isBot:false,
            timestamp:new Date()
        }
        setMessages(prev => [...prev, newMessage])

        // Store current input for API call
        const currentInput = chatInput

        try{
            // Make API request to chat endpoint
            const response = await fetch(apiEndpoint,{
                method:'POST',
                headers:{
                    'Content-Type':'application/json'
                },
                body:JSON.stringify(getRequestBody(currentInput))
            })
            const data = await response.json()

            if(response.ok){
                // Successful response - increment usage and add bot message
                await incrementChatUsage();

                const botMessage:ChatMessage = {
                    id:messages.length+2,
                    content:data.answer || data.response,
                    isBot:true,
                    timestamp:new Date()
                }
                setMessages(prev => [...prev, botMessage])
            }else{
                // Handle API errors
                if(data.upgradeRequired){
                    // User needs to upgrade their plan
                    const upgradeMessage:ChatMessage = {
                        id:messages.length+2,
                        content:'Please Upgrade your plan',
                        isBot:true,
                        timestamp:new Date()
                    }
                    setMessages(prev => [...prev, upgradeMessage])
                }else{
                    // Generic error message
                    const errorMessage:ChatMessage = {
                        id:messages.length+2,
                        content: 'Sorry, something went wrong. Please try again.',
                        isBot:true,
                        timestamp:new Date()
                    }
                    setMessages(prev => [...prev, errorMessage])
                }
            }
        }catch(error){
            // Handle network or other errors
            console.log('chat message error',error)

            const errorMessage:ChatMessage = {
                id:messages.length+2,
                content: 'Sorry, not able to process your request. Please try again.',
                isBot:true,
                timestamp:new Date()
            }
            setMessages(prev => [...prev, errorMessage])
        }finally{
            // Always reset loading state
            setIsLoading(false)
        }
    }

    /**
     * Handles clicking on a chat suggestion
     * @param suggestion - The suggestion text to populate the input field
     */
    const handleSuggestionClick = (suggestion:string)=>{
        if(!canChat){
            return;
        }
        setShowSuggestions(false)
        setChatInput(suggestion)
    }

    /**
     * Handles changes to the chat input field
     * @param value - The new input value
     */
    const handleInputChange = (value:string)=>{
        setChatInput(value)
        // Hide suggestions when user starts typing
        if(value.length>0 && showSuggestions){
            setShowSuggestions(false)
        }
    }

    // Return all chat state and functions for use in components
    return{
        // Input field state
        chatInput,        // Current text in the chat input
        setChatInput,     // Function to update the chat input

        // Conversation state
        messages,         // Array of chat messages
        setMessages,      // Function to update the messages array

        // UI state
        showSuggestions,  // Whether suggestions should be displayed
        setShowSuggestions, // Function to control suggestion visibility
        isLoading,        // Loading state during API calls
        setIsLoading,     // Function to update loading state

        // Event handlers
        handleSendMessage,    // Function to send a chat message
        handleSuggestionClick, // Function to handle suggestion clicks
        handleInputChange,    // Function to handle input field changes

        // Usage permissions
        canChat,          // Whether the user can send chat messages
    }

}
