/**
 * Email Service - Main Interface
 *
 * This module provides the main API for sending all types of emails.
 * It integrates email templates with the Resend client and scheduler.
 *
 * Available email types:
 * 1. Vote Confirmation - Sent when a user votes for a model
 * 2. Progress Update - Sent to update on a model's progress
 * 3. Rank Update - Sent when a model's rank changes
 * 4. Reward Delivery - Sent when a reward is earned
 * 5. Referral Join - Sent to encourage referrals
 * 6. Referral Milestone - Sent when referral milestone is reached
 */

import { scheduleEmail, sendImmediately } from "./emailScheduler.js";
import { sendEmail } from "./resendClient.js";
import { generateProgressUpdateHTML } from "./templates/progressUpdate.js";
import { generateRankUpdateHTML } from "./templates/rankUpdate.js";
import { generateReferralJoinHTML } from "./templates/referralJoin.js";
import { generateReferralMilestoneHTML } from "./templates/referralMilestone.js";
import { generateRewardDeliveryHTML } from "./templates/rewardDelivery.js";
import { generateVoteConfirmationHTML } from "./templates/voteConfirmation.js";

/**
 * Send Vote Confirmation Email
 * Sends a thank you email when a user votes for a model
 *
 * @param {string} to - Recipient email address
 * @param {object} data - Email template data
 * @param {string} data.modelName - Name of the model who received the vote
 * @param {string} data.profileUrl - URL to the model's profile for sharing
 * @param {boolean} immediate - If true, send immediately; otherwise schedule
 * @returns {Promise} Result of email send operation
 */
export async function sendVoteConfirmationEmail(to, data, immediate = false) {
  const html = generateVoteConfirmationHTML(data);
  const subject = `✅ You Made ${data.modelName}'s Day!`;

  const sendFunction = async () => {
    return await sendEmail(to, subject, html);
  };

  if (immediate) {
    return await sendImmediately(sendFunction, to, data);
  } else {
    return await scheduleEmail(sendFunction, to, data);
  }
}

/**
 * Send Progress Update Email
 * Sends updates on a model's voting progress
 *
 * @param {string} to - Recipient email address
 * @param {object} data - Email template data
 * @param {string} data.modelName - Name of the model
 * @param {number} data.voteCount - Current vote count
 * @param {number} data.votesNeeded - Votes needed to reach next milestone
 * @param {number} data.daysLeft - Days remaining in contest
 * @param {number} data.progressPercent - Progress percentage (0-100)
 * @param {string} data.profileUrl - URL to boost/vote
 * @param {boolean} immediate - If true, send immediately; otherwise schedule
 * @returns {Promise} Result of email send operation
 */
export async function sendProgressUpdateEmail(to, data, immediate = false) {
  const html = generateProgressUpdateHTML(data);
  const subject = `🔥 ${data.modelName} is Heating Up!`;

  const sendFunction = async () => {
    return await sendEmail(to, subject, html);
  };

  if (immediate) {
    return await sendImmediately(sendFunction, to, data);
  } else {
    return await scheduleEmail(sendFunction, to, data);
  }
}

/**
 * Send Rank Update Email
 * Sends notification when a model's rank changes
 *
 * @param {string} to - Recipient email address
 * @param {object} data - Email template data
 * @param {string} data.modelName - Name of the model
 * @param {number} data.rankPosition - Current rank position
 * @param {number} data.previousRank - Previous rank position
 * @param {number} data.voteCount - Current vote count
 * @param {string} data.profileUrl - URL to vote/share
 * @param {boolean} immediate - If true, send immediately; otherwise schedule
 * @returns {Promise} Result of email send operation
 */
export async function sendRankUpdateEmail(to, data, immediate = false) {
  const html = generateRankUpdateHTML(data);
  const subject = `🚀 ${data.modelName} Just Hit #${data.rankPosition}!`;

  const sendFunction = async () => {
    return await sendEmail(to, subject, html);
  };

  if (immediate) {
    return await sendImmediately(sendFunction, to, data);
  } else {
    return await scheduleEmail(sendFunction, to, data);
  }
}

/**
 * Send Reward Delivery Email
 * Sends notification when a reward has been earned
 *
 * @param {string} to - Recipient email address
 * @param {object} data - Email template data
 * @param {string} data.rewardName - Name of the reward
 * @param {string} data.rewardDescription - Description of the reward
 * @param {string} data.expiryDate - Expiration date for claiming
 * @param {string} data.claimUrl - URL to claim the reward
 * @param {boolean} immediate - If true, send immediately; otherwise schedule
 * @returns {Promise} Result of email send operation
 */
export async function sendRewardDeliveryEmail(to, data, immediate = false) {
  const html = generateRewardDeliveryHTML(data);
  const subject = `🎁 Reward Unlocked: ${data.rewardName}`;

  const sendFunction = async () => {
    return await sendEmail(to, subject, html);
  };

  if (immediate) {
    return await sendImmediately(sendFunction, to, data);
  } else {
    return await scheduleEmail(sendFunction, to, data);
  }
}

/**
 * Send Referral Join Email
 * Sends invitation to share referral link
 *
 * @param {string} to - Recipient email address
 * @param {object} data - Email template data
 * @param {string} data.userName - Name of the user
 * @param {string} data.referralLink - Unique referral link
 * @param {string} data.rewardName - Reward for successful referrals
 * @param {number} data.referralsNeeded - Number of referrals needed for reward
 * @param {boolean} immediate - If true, send immediately; otherwise schedule
 * @returns {Promise} Result of email send operation
 */
export async function sendReferralJoinEmail(to, data, immediate = false) {
  const html = generateReferralJoinHTML(data);
  const subject = `🌸 Share the Spotlight & Earn ${data.rewardName}`;

  const sendFunction = async () => {
    return await sendEmail(to, subject, html);
  };

  if (immediate) {
    return await sendImmediately(sendFunction, to, data);
  } else {
    return await scheduleEmail(sendFunction, to, data);
  }
}

/**
 * Send Referral Milestone Email
 * Sends congratulations when referral milestone is achieved
 *
 * @param {string} to - Recipient email address
 * @param {object} data - Email template data
 * @param {string} data.userName - Name of the user
 * @param {number} data.referralCount - Number of successful referrals
 * @param {string} data.tierName - Achievement tier reached
 * @param {string} data.rewardName - Reward earned
 * @param {string} data.claimUrl - URL to claim the reward
 * @param {number} data.nextTierCount - Referrals needed for next tier
 * @param {boolean} immediate - If true, send immediately; otherwise schedule
 * @returns {Promise} Result of email send operation
 */
export async function sendReferralMilestoneEmail(to, data, immediate = false) {
  const html = generateReferralMilestoneHTML(data);
  const subject = `✨ Milestone Unlocked: ${data.tierName} Tier Achieved!`;

  const sendFunction = async () => {
    return await sendEmail(to, subject, html);
  };

  if (immediate) {
    return await sendImmediately(sendFunction, to, data);
  } else {
    return await scheduleEmail(sendFunction, to, data);
  }
}

// Export all functions as named exports
export default {
  sendVoteConfirmationEmail,
  sendProgressUpdateEmail,
  sendRankUpdateEmail,
  sendRewardDeliveryEmail,
  sendReferralJoinEmail,
  sendReferralMilestoneEmail,
};
