/**
 * Event Bus (SNS-like System)
 * 
 * Simple Notification Service implementation using BullMQ queues.
 * Allows publish/subscribe pattern for decoupled event handling.
 * 
 * Similar to AWS SNS but using Redis + BullMQ
 */

import { Queue, Worker } from 'bullmq';
import { getQueueConnection } from './redis.config.js';
import {
  queueVoteConfirmation,
  queueProgressUpdate,
  queueRankUpdate,
  queueRewardDelivery,
  queueReferralJoin,
  queueReferralMilestone
} from './emailQueue.js';

/**
 * Event Topics (like SNS Topics)
 */
export const EVENT_TOPICS = {
  VOTE_CREATED: 'vote.created',
  MODEL_PROGRESS_MILESTONE: 'model.progress_milestone',
  MODEL_RANK_CHANGED: 'model.rank_changed',
  REWARD_EARNED: 'reward.earned',
  USER_REGISTERED: 'user.registered',
  REFERRAL_MILESTONE: 'referral.milestone'
};

/**
 * Event Queue for pub/sub
 */
const eventQueue = new Queue('email-events', {
  ...getQueueConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    },
    removeOnComplete: {
      age: 3600, // Keep for 1 hour
      count: 100
    }
  }
});

/**
 * Event subscribers (handlers for each topic)
 */
const eventSubscribers = new Map();

/**
 * Subscribe to an event topic
 * 
 * @param {string} topic - Event topic to subscribe to
 * @param {Function} handler - Handler function to process event
 */
export function subscribe(topic, handler) {
  if (!eventSubscribers.has(topic)) {
    eventSubscribers.set(topic, []);
  }
  
  eventSubscribers.get(topic).push(handler);
  console.log(`📡 Subscribed to topic: ${topic}`);
}

/**
 * Publish an event to a topic
 * 
 * @param {string} topic - Event topic
 * @param {Object} data - Event data
 */
export async function publish(topic, data) {
  console.log(`📤 Publishing event: ${topic}`);
  
  return await eventQueue.add(topic, {
    topic,
    data,
    publishedAt: new Date().toISOString()
  });
}

/**
 * Default email event handlers
 */
const defaultHandlers = {
  [EVENT_TOPICS.VOTE_CREATED]: async (data) => {
    const { voterEmail, modelName, modelId } = data;
    await queueVoteConfirmation(voterEmail, {
      modelName,
      profileUrl: `${process.env.FRONTEND_URL || 'https://covergirl.com'}/models/${modelId}`
    });
  },
  
  [EVENT_TOPICS.MODEL_PROGRESS_MILESTONE]: async (data) => {
    const { modelId, modelName, voteCount, votesNeeded, daysLeft, subscriberEmails } = data;
    const progressPercent = Math.min(100, Math.round((voteCount / (voteCount + votesNeeded)) * 100));
    
    // Queue emails for all subscribers
    for (const email of subscriberEmails) {
      await queueProgressUpdate(email, {
        modelName,
        voteCount,
        votesNeeded,
        daysLeft,
        progressPercent,
        profileUrl: `${process.env.FRONTEND_URL || 'https://covergirl.com'}/models/${modelId}`
      });
    }
  },
  
  [EVENT_TOPICS.MODEL_RANK_CHANGED]: async (data) => {
    const { modelId, modelName, newRank, oldRank, voteCount, supporterEmails } = data;
    
    // Queue high-priority rank update emails
    for (const email of supporterEmails) {
      await queueRankUpdate(email, {
        modelName,
        rankPosition: newRank,
        previousRank: oldRank,
        voteCount,
        profileUrl: `${process.env.FRONTEND_URL || 'https://covergirl.com'}/models/${modelId}`
      }, { priority: 1 }); // Critical priority
    }
  },
  
  [EVENT_TOPICS.REWARD_EARNED]: async (data) => {
    const { userEmail, rewardId, rewardName, rewardDescription, expiryDate } = data;
    await queueRewardDelivery(userEmail, {
      rewardName,
      rewardDescription,
      expiryDate,
      claimUrl: `${process.env.FRONTEND_URL || 'https://covergirl.com'}/rewards/claim/${rewardId}`
    }, { priority: 2 }); // High priority
  },
  
  [EVENT_TOPICS.USER_REGISTERED]: async (data) => {
    const { userEmail, userName, userId, referralCode } = data;
    await queueReferralJoin(userEmail, {
      userName,
      referralLink: `${process.env.FRONTEND_URL || 'https://covergirl.com'}/register?ref=${referralCode}`,
      rewardName: 'Premium Membership',
      referralsNeeded: 5
    });
  },
  
  [EVENT_TOPICS.REFERRAL_MILESTONE]: async (data) => {
    const { userEmail, userName, referralCount, tierName, rewardName, rewardId, nextTierCount } = data;
    await queueReferralMilestone(userEmail, {
      userName,
      referralCount,
      tierName,
      rewardName,
      claimUrl: `${process.env.FRONTEND_URL || 'https://covergirl.com'}/rewards/claim/${rewardId}`,
      nextTierCount
    }, { priority: 1 }); // Critical priority
  }
};

/**
 * Register default email handlers
 */
export function registerDefaultHandlers() {
  Object.entries(defaultHandlers).forEach(([topic, handler]) => {
    subscribe(topic, handler);
  });
  
  console.log('✅ Default email event handlers registered');
}

/**
 * Event worker - processes published events
 */
export function createEventWorker() {
  const worker = new Worker(
    'email-events',
    async (job) => {
      const { topic, data } = job.data;
      
      console.log(`📥 Processing event: ${topic}`);
      
      const handlers = eventSubscribers.get(topic) || [];
      
      if (handlers.length === 0) {
        console.warn(`⚠️  No subscribers for topic: ${topic}`);
        return { processed: false, reason: 'no-subscribers' };
      }
      
      // Execute all subscribers
      const results = await Promise.allSettled(
        handlers.map(handler => handler(data))
      );
      
      const failed = results.filter(r => r.status === 'rejected');
      
      if (failed.length > 0) {
        console.error(`❌ ${failed.length} handler(s) failed for ${topic}`);
        failed.forEach((r, i) => {
          console.error(`  Handler ${i + 1}:`, r.reason);
        });
      }
      
      return {
        processed: true,
        successCount: results.filter(r => r.status === 'fulfilled').length,
        failCount: failed.length,
        topic
      };
    },
    {
      ...getQueueConnection(),
      concurrency: 3 // Process 3 events concurrently
    }
  );
  
  worker.on('completed', (job, result) => {
    console.log(`✅ Event processed: ${result.topic} (${result.successCount} succeeded, ${result.failCount} failed)`);
  });
  
  worker.on('failed', (job, error) => {
    console.error(`❌ Event processing failed:`, error.message);
  });
  
  return worker;
}

/**
 * Convenience functions for publishing events
 */
export const publishEvent = {
  voteCreated: (data) => publish(EVENT_TOPICS.VOTE_CREATED, data),
  modelProgressMilestone: (data) => publish(EVENT_TOPICS.MODEL_PROGRESS_MILESTONE, data),
  modelRankChanged: (data) => publish(EVENT_TOPICS.MODEL_RANK_CHANGED, data),
  rewardEarned: (data) => publish(EVENT_TOPICS.REWARD_EARNED, data),
  userRegistered: (data) => publish(EVENT_TOPICS.USER_REGISTERED, data),
  referralMilestone: (data) => publish(EVENT_TOPICS.REFERRAL_MILESTONE, data)
};

/**
 * Get event queue stats
 */
export async function getEventStats() {
  const [waiting, active, completed, failed] = await Promise.all([
    eventQueue.getWaitingCount(),
    eventQueue.getActiveCount(),
    eventQueue.getCompletedCount(),
    eventQueue.getFailedCount()
  ]);
  
  return {
    waiting,
    active,
    completed,
    failed,
    subscribers: Array.from(eventSubscribers.entries()).map(([topic, handlers]) => ({
      topic,
      handlerCount: handlers.length
    }))
  };
}

export default {
  EVENT_TOPICS,
  subscribe,
  publish,
  publishEvent,
  registerDefaultHandlers,
  createEventWorker,
  getEventStats
};

