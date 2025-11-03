/**
 * Resend Email Client Configuration
 *
 * This module initializes and exports the Resend client instance
 * that will be used by all email services.
 */

import { config } from "dotenv";
import { Resend } from "resend";

// Load environment variables
config();

// Initialize Resend client with API key from environment
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send email using Resend API
 *
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject line
 * @param {string} html - HTML content of the email
 * @returns {Promise} Resend API response
 */
export async function sendEmail(to, subject, html) {
  try {
    // Get from email from environment or use default
    const fromEmail = process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
    const fromName = process.env.EMAIL_FROM_NAME || "CoverGirl Contest";
    const from = `${fromName} <${fromEmail}>`;

    const response = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });

    // Check if there was an error in the response
    if (response.error) {
      console.error(`❌ Resend API Error for ${to}:`, response.error);
      console.error(`   Status: ${response.error.statusCode}`);
      console.error(`   Message: ${response.error.message}`);
      throw new Error(`Resend API Error: ${response.error.message}`);
    }

    // Log successful send
    if (response.data) {
      console.log(`✅ Resend API Success - Email ID: ${response.data.id} → ${to}`);
    }

    return response;
  } catch (error) {
    console.error("❌ Failed to send email to", to, ":", error.message);
    throw error;
  }
}

export default resend;
