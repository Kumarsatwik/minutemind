/**
 * Utility functions for processing meeting transcripts.
 * Provides functionality to chunk large transcripts and extract speaker information.
 */

/**
 * Splits a meeting transcript into manageable chunks for processing
 * @param transcript - The full transcript text to be chunked
 * @returns Array of chunk objects with content and index
 */
export function chunkTranscript(transcript:string){
    // Maximum characters per chunk to keep processing manageable
    const maxChunkSize = 500
    const chunks = []

    // Split transcript into individual lines and filter out empty ones
    const speakerLines = transcript.split('\n').filter(line=>line.trim())

    let currentChunk=''
    let chunkIndex=0

    // Process each line of the transcript
    for(const line of speakerLines){
        // Check if adding this line would exceed chunk size
        if(currentChunk.length + line.length > maxChunkSize && currentChunk.length>0){
            // Save current chunk and start a new one
            chunks.push({content:currentChunk.trim(),chunkIndex:chunkIndex})
            currentChunk=line +'\n'
            chunkIndex++
        }else{
            // Add line to current chunk
            currentChunk +=line +'\n'
        }
    }

    // Add any remaining content as the final chunk
    if(currentChunk.trim()){
        chunks.push({content:currentChunk.trim(),chunkIndex:chunkIndex})
    }

    return chunks
}

/**
 * Extracts the speaker name from a line of transcript text
 * @param text - A line of transcript text (e.g., "John Doe: Hello everyone")
 * @returns The speaker name if found, null otherwise
 */
export function extractSpeaker(text:string){
    // Match pattern: "Speaker Name: " at the beginning of the line
    const match = text.match(/^([A-Za-z\s]+):\s*/)
    return match ? match?.[1].trim() : null
}
