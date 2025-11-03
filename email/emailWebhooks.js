/**
 * Email Webhook System
 * 
 * This module automatically triggers emails when certain events occur.
 * Listens for database events or API webhooks and sends emails to relevant users.
 */

import {
  sendVoteConfirmationEmail,
  sendProgressUpdateEmail,
  sendRankUpdateEmail,
  sendRewardDeliveryEmail,
  sendReferralJoinEmail,
  sendReferralMilestoneEmail
} from './emailService.js';

/**
 * Handle vote created event
 * Automatically sends confirmation email to voter
 * 
 * @param {Object} data - Vote event data
 * @param {string} data.voterEmail - Email of the person who voted
 * @param {string} data.modelName - Name of the model voted for
 * @param {string} data.modelId - ID of the model
 */
export async function onVoteCreated(data) {
  const { voterEmail, modelName, modelId } = data;
  
  try {
    await sendVoteConfirmationEmail(voterEmail, {
      modelName,
      profileUrl: `${process.env.FRONTEND_URL || 'https://covergirl.com'}/models/${modelId}`
    });
    
    console.log(`✅ Vote confirmation sent to: ${voterEmail}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to send vote confirmation:', error);
    throw error;
  }
}

/**
 * Handle model progress milestone event
 * Sends progress updates to all subscribers/supporters
 * 
 * @param {Object} data - Progress event data
 * @param {string} data.modelId - ID of the model
 * @param {string} data.modelName - Name of the model
 * @param {number} data.voteCount - Current vote count
 * @param {number} data.votesNeeded - Votes needed for next milestone
 * @param {number} data.daysLeft - Days left in contest
 * @param {string[]} data.subscriberEmails - Array of subscriber emails
 */
export async function onModelProgressMilestone(data) {
  const { modelId, modelName, voteCount, votesNeeded, daysLeft, subscriberEmails } = data;
  
  const progressPercent = Math.min(100, Math.round((voteCount / (voteCount + votesNeeded)) * 100));
  
  try {
    // Send to all subscribers in parallel
    const emailPromises = subscriberEmails.map(email =>
      sendProgressUpdateEmail(email, {
        modelName,
        voteCount,
        votesNeeded,
        daysLeft,
        progressPercent,
        profileUrl: `${process.env.FRONTEND_URL || 'https://covergirl.com'}/models/${modelId}`
      })
    );
    
    await Promise.all(emailPromises);
    
    console.log(`✅ Progress updates sent to ${subscriberEmails.length} subscribers`);
    return { success: true, emailsSent: subscriberEmails.length };
  } catch (error) {
    console.error('❌ Failed to send progress updates:', error);
    throw error;
  }
}

/**
 * Handle rank change event
 * Sends rank update emails to all supporters (sent immediately)
 * 
 * @param {Object} data - Rank change event data
 * @param {string} data.modelId - ID of the model
 * @param {string} data.modelName - Name of the model
 * @param {number} data.newRank - New rank position
 * @param {number} data.oldRank - Previous rank position
 * @param {number} data.voteCount - Current vote count
 * @param {string[]} data.supporterEmails - Array of supporter emails
 */
export async function onRankChanged(data) {
  const { modelId, modelName, newRank, oldRank, voteCount, supporterEmails } = data;
  
  try {
    // Rank updates are time-sensitive, send immediately
    const emailPromises = supporterEmails.map(email =>
      sendRankUpdateEmail(email, {
        modelName,
        rankPosition: newRank,
        previousRank: oldRank,
        voteCount,
        profileUrl: `${process.env.FRONTEND_URL || 'https://covergirl.com'}/models/${modelId}`
      }, true) // immediate = true
    );
    
    await Promise.all(emailPromises);
    
    console.log(`✅ Rank update sent to ${supporterEmails.length} supporters (immediate)`);
    return { success: true, emailsSent: supporterEmails.length };
  } catch (error) {
    console.error('❌ Failed to send rank updates:', error);
    throw error;
  }
}

/**
 * Handle reward earned event
 * Sends reward delivery email to the user who earned it
 * 
 * @param {Object} data - Reward event data
 * @param {string} data.userEmail - Email of user who earned reward
 * @param {string} data.rewardId - ID of the reward
 * @param {string} data.rewardName - Name of the reward
 * @param {string} data.rewardDescription - Description of reward
 * @param {string} data.expiryDate - When reward expires
 */
export async function onRewardEarned(data) {
  const { userEmail, rewardId, rewardName, rewardDescription, expiryDate } = data;
  
  try {
    await sendRewardDeliveryEmail(userEmail, {
      rewardName,
      rewardDescription,
      expiryDate,
      claimUrl: `${process.env.FRONTEND_URL || 'https://covergirl.com'}/rewards/claim/${rewardId}`
    });
    
    console.log(`✅ Reward delivery sent to: ${userEmail}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to send reward delivery:', error);
    throw error;
  }
}

/**
 * Handle user registration event
 * Sends referral join email to encourage sharing
 * 
 * @param {Object} data - User registration data
 * @param {string} data.userEmail - New user's email
 * @param {string} data.userName - New user's name
 * @param {string} data.userId - New user's ID
 * @param {string} data.referralCode - User's unique referral code
 */
export async function onUserRegistered(data) {
  const { userEmail, userName, userId, referralCode } = data;
  
  try {
    await sendReferralJoinEmail(userEmail, {
      userName,
      referralLink: `${process.env.FRONTEND_URL || 'https://covergirl.com'}/register?ref=${referralCode}`,
      rewardName: 'Premium Membership',
      referralsNeeded: 5
    });
    
    console.log(`✅ Referral join email sent to: ${userEmail}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to send referral join email:', error);
    throw error;
  }
}

/**
 * Handle referral milestone achieved event
 * Sends celebration email when user hits referral tier (sent immediately)
 * 
 * @param {Object} data - Referral milestone data
 * @param {string} data.userEmail - User's email
 * @param {string} data.userName - User's name
 * @param {number} data.referralCount - Number of successful referrals
 * @param {string} data.tierName - Tier achieved (Bronze, Silver, Gold, etc.)
 * @param {string} data.rewardName - Reward for this tier
 * @param {string} data.rewardId - ID to claim reward
 * @param {number} data.nextTierCount - Referrals needed for next tier (optional)
 */
export async function onReferralMilestone(data) {
  const { userEmail, userName, referralCount, tierName, rewardName, rewardId, nextTierCount } = data;
  
  try {
    // Milestone celebrations should be sent immediately
    await sendReferralMilestoneEmail(userEmail, {
      userName,
      referralCount,
      tierName,
      rewardName,
      claimUrl: `${process.env.FRONTEND_URL || 'https://covergirl.com'}/rewards/claim/${rewardId}`,
      nextTierCount
    }, true); // immediate = true
    
    console.log(`✅ Referral milestone email sent to: ${userEmail}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to send referral milestone email:', error);
    throw error;
  }
}

/**
 * Main webhook handler
 * Routes webhook events to appropriate email handlers
 * 
 * @param {string} eventType - Type of event
 * @param {Object} eventData - Event data
 * @returns {Promise<Object>} Result of webhook handling
 */
export async function handleWebhook(eventType, eventData) {
  console.log(`📨 Webhook received: ${eventType}`);
  
  try {
    let result;
    
    switch (eventType) {
      case 'vote.created':
        result = await onVoteCreated(eventData);
        break;
        
      case 'model.progress_milestone':
        result = await onModelProgressMilestone(eventData);
        break;
        
      case 'model.rank_changed':
        result = await onRankChanged(eventData);
        break;
        
      case 'reward.earned':
        result = await onRewardEarned(eventData);
        break;
        
      case 'user.registered':
        result = await onUserRegistered(eventData);
        break;
        
      case 'referral.milestone':
        result = await onReferralMilestone(eventData);
        break;
        
      default:
        console.warn(`⚠️  Unknown event type: ${eventType}`);
        return { success: false, error: 'Unknown event type' };
    }
    
    return result;
  } catch (error) {
    console.error(`❌ Webhook handling failed for ${eventType}:`, error);
    return { success: false, error: error.message };
  }
}

export default {
  handleWebhook,
  onVoteCreated,
  onModelProgressMilestone,
  onRankChanged,
  onRewardEarned,
  onUserRegistered,
  onReferralMilestone
};

