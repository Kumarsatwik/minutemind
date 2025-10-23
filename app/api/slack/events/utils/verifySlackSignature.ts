import crypto from "crypto"; // Node.js crypto module for HMAC signature verification

/**
 * Verifies Slack webhook signature to ensure request authenticity
 * Implements Slack's signature verification to prevent unauthorized webhook calls
 *
 * @param body - The raw request body string
 * @param signature - The signature header from Slack (x-slack-signature)
 * @param timestamp - The timestamp header from Slack (x-slack-request-timestamp)
 * @returns true if signature is valid and timestamp is recent, false otherwise
 */
export function verifySlackSignature(
  body: string,
  signature: string,
  timestamp: string
) {
  // Get the signing secret from environment variables
  const signingSecret = process.env.SLACK_SIGNING_SECRET!;

  // Get current time in seconds for timestamp validation
  const time = Math.floor(new Date().getTime() / 1000);

  // Check if timestamp is within 5 minutes (300 seconds) to prevent replay attacks
  // Slack recommends rejecting requests with timestamps older than 5 minutes
  if (Math.abs(time - parseInt(timestamp)) > 300) {
    return false; // Timestamp too old, reject request
  }

  // Create the signature base string in Slack's required format: "v0:timestamp:body"
  const sigBaseString = `v0:${timestamp}:${body}`;

  // Generate HMAC-SHA256 signature using the signing secret
  const mySignature =
    "v0=" +
    crypto
      .createHmac("sha256", signingSecret)
      .update(sigBaseString, "utf8")
      .digest("hex");

  // Use timing-safe comparison to prevent timing attacks
  // This ensures comparison takes constant time regardless of signature similarity
  return crypto.timingSafeEqual(
    Buffer.from(mySignature, "utf8"),
    Buffer.from(signature, "utf8")
  );
}
