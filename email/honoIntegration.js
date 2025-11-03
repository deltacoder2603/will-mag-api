/**
 * Hono Framework Integration for Email Webhooks
 * 
 * This file shows how to integrate the email webhook system
 * into your existing Hono backend.
 * 
 * Usage: Import and use in your routes
 */

import { handleWebhook } from './emailWebhooks.js';

/**
 * Create Hono routes for email webhooks
 * 
 * @param {Object} app - Hono app instance
 */
export function setupEmailWebhooks(app) {
  
  /**
   * Webhook endpoint
   * POST /api/webhooks/email
   */
  app.post('/api/webhooks/email', async (c) => {
    try {
      const { event, data } = await c.req.json();
      
      if (!event || !data) {
        return c.json({ 
          success: false, 
          error: 'Missing event or data' 
        }, 400);
      }
      
      const result = await handleWebhook(event, data);
      
      return c.json(result);
    } catch (error) {
      console.error('Webhook error:', error);
      return c.json({ 
        success: false, 
        error: error.message 
      }, 500);
    }
  });
  
  return app;
}

/**
 * Helper functions to trigger emails from your existing routes
 */

/**
 * Call this after creating a vote in your vote handler
 */
export async function triggerVoteEmail(voterEmail, modelName, modelId) {
  return await handleWebhook('vote.created', {
    voterEmail,
    modelName,
    modelId
  });
}

/**
 * Call this when a model reaches a progress milestone
 */
export async function triggerProgressEmail(modelData, subscriberEmails) {
  return await handleWebhook('model.progress_milestone', {
    ...modelData,
    subscriberEmails
  });
}

/**
 * Call this when a model's rank changes
 */
export async function triggerRankEmail(modelData, supporterEmails) {
  return await handleWebhook('model.rank_changed', {
    ...modelData,
    supporterEmails
  });
}

/**
 * Call this when a user earns a reward
 */
export async function triggerRewardEmail(rewardData) {
  return await handleWebhook('reward.earned', rewardData);
}

/**
 * Call this after user registration
 */
export async function triggerWelcomeEmail(userData) {
  return await handleWebhook('user.registered', userData);
}

/**
 * Call this when user hits referral milestone
 */
export async function triggerReferralMilestoneEmail(milestoneData) {
  return await handleWebhook('referral.milestone', milestoneData);
}

export default {
  setupEmailWebhooks,
  triggerVoteEmail,
  triggerProgressEmail,
  triggerRankEmail,
  triggerRewardEmail,
  triggerWelcomeEmail,
  triggerReferralMilestoneEmail
};

