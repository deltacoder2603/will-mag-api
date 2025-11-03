/**
 * Email Queue System using BullMQ
 * 
 * Features:
 * - Job queue for all email types
 * - Dead Letter Queue (DLQ) for failed jobs
 * - Automatic retries with exponential backoff
 * - Job prioritization
 * - Scheduled/delayed emails
 * - Job monitoring and metrics
 */

import { Queue } from 'bullmq';
import { getQueueConnection } from './redis.config.js';

/**
 * Queue Configuration
 */
const QUEUE_CONFIG = {
  // Main email queue
  EMAIL_QUEUE: 'email-notifications',
  
  // Dead Letter Queue for failed emails
  EMAIL_DLQ: 'email-dlq',
  
  // Default job options
  defaultJobOptions: {
    attempts: 3, // Retry 3 times
    backoff: {
      type: 'exponential',
      delay: 2000 // Start with 2 seconds, doubles each retry
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000 // Keep last 1000 completed jobs
    },
    removeOnFail: false // Keep failed jobs for DLQ processing
  }
};

/**
 * Email Queue - Main queue for all email jobs
 */
export const emailQueue = new Queue(QUEUE_CONFIG.EMAIL_QUEUE, {
  ...getQueueConnection(),
  defaultJobOptions: QUEUE_CONFIG.defaultJobOptions
});

/**
 * Dead Letter Queue - Stores permanently failed emails
 */
export const emailDLQ = new Queue(QUEUE_CONFIG.EMAIL_DLQ, {
  ...getQueueConnection(),
  defaultJobOptions: {
    removeOnComplete: false, // Keep all DLQ entries
    removeOnFail: false
  }
});

/**
 * Email Job Types
 */
export const EMAIL_JOB_TYPES = {
  VOTE_CONFIRMATION: 'vote-confirmation',
  PROGRESS_UPDATE: 'progress-update',
  RANK_UPDATE: 'rank-update',
  REWARD_DELIVERY: 'reward-delivery',
  REFERRAL_JOIN: 'referral-join',
  REFERRAL_MILESTONE: 'referral-milestone'
};

/**
 * Job Priority Levels
 */
export const PRIORITY = {
  CRITICAL: 1, // Rank updates, milestone celebrations
  HIGH: 2, // Reward deliveries
  NORMAL: 3, // Vote confirmations
  LOW: 4 // Progress updates, referral invites
};

/**
 * Queue a vote confirmation email
 */
export async function queueVoteConfirmation(to, data, options = {}) {
  return await emailQueue.add(
    EMAIL_JOB_TYPES.VOTE_CONFIRMATION,
    { to, data, emailType: 'vote-confirmation' },
    {
      priority: options.priority || PRIORITY.NORMAL,
      delay: options.delay || 0,
      ...options
    }
  );
}

/**
 * Queue a progress update email
 */
export async function queueProgressUpdate(to, data, options = {}) {
  return await emailQueue.add(
    EMAIL_JOB_TYPES.PROGRESS_UPDATE,
    { to, data, emailType: 'progress-update' },
    {
      priority: options.priority || PRIORITY.LOW,
      delay: options.delay || 0,
      ...options
    }
  );
}

/**
 * Queue a rank update email (high priority, immediate)
 */
export async function queueRankUpdate(to, data, options = {}) {
  return await emailQueue.add(
    EMAIL_JOB_TYPES.RANK_UPDATE,
    { to, data, emailType: 'rank-update' },
    {
      priority: options.priority || PRIORITY.CRITICAL,
      delay: options.delay || 0, // Immediate by default
      ...options
    }
  );
}

/**
 * Queue a reward delivery email
 */
export async function queueRewardDelivery(to, data, options = {}) {
  return await emailQueue.add(
    EMAIL_JOB_TYPES.REWARD_DELIVERY,
    { to, data, emailType: 'reward-delivery' },
    {
      priority: options.priority || PRIORITY.HIGH,
      delay: options.delay || 0,
      ...options
    }
  );
}

/**
 * Queue a referral join email
 */
export async function queueReferralJoin(to, data, options = {}) {
  return await emailQueue.add(
    EMAIL_JOB_TYPES.REFERRAL_JOIN,
    { to, data, emailType: 'referral-join' },
    {
      priority: options.priority || PRIORITY.LOW,
      delay: options.delay || 0,
      ...options
    }
  );
}

/**
 * Queue a referral milestone email (high priority, immediate)
 */
export async function queueReferralMilestone(to, data, options = {}) {
  return await emailQueue.add(
    EMAIL_JOB_TYPES.REFERRAL_MILESTONE,
    { to, data, emailType: 'referral-milestone' },
    {
      priority: options.priority || PRIORITY.CRITICAL,
      delay: options.delay || 0,
      ...options
    }
  );
}

/**
 * Batch queue multiple emails (efficient for bulk sends)
 */
export async function queueBulkEmails(emailType, recipients, data, options = {}) {
  const jobs = recipients.map(to => ({
    name: emailType,
    data: { to, data: { ...data, recipientEmail: to }, emailType },
    opts: {
      priority: options.priority || PRIORITY.NORMAL,
      delay: options.delay || 0,
      ...options
    }
  }));
  
  return await emailQueue.addBulk(jobs);
}

/**
 * Schedule an email for specific date/time
 */
export async function scheduleEmail(emailType, to, data, scheduledTime) {
  const delay = scheduledTime.getTime() - Date.now();
  
  if (delay < 0) {
    throw new Error('Scheduled time must be in the future');
  }
  
  const queueFunctions = {
    [EMAIL_JOB_TYPES.VOTE_CONFIRMATION]: queueVoteConfirmation,
    [EMAIL_JOB_TYPES.PROGRESS_UPDATE]: queueProgressUpdate,
    [EMAIL_JOB_TYPES.RANK_UPDATE]: queueRankUpdate,
    [EMAIL_JOB_TYPES.REWARD_DELIVERY]: queueRewardDelivery,
    [EMAIL_JOB_TYPES.REFERRAL_JOIN]: queueReferralJoin,
    [EMAIL_JOB_TYPES.REFERRAL_MILESTONE]: queueReferralMilestone
  };
  
  const queueFn = queueFunctions[emailType];
  if (!queueFn) {
    throw new Error(`Unknown email type: ${emailType}`);
  }
  
  return await queueFn(to, data, { delay });
}

/**
 * Move failed job to Dead Letter Queue
 */
export async function moveToDLQ(job, error) {
  return await emailDLQ.add(
    'failed-email',
    {
      originalJob: job.data,
      failedAt: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack
      },
      attempts: job.attemptsMade,
      jobId: job.id
    },
    {
      priority: PRIORITY.CRITICAL // DLQ jobs are high priority for manual review
    }
  );
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    emailQueue.getWaitingCount(),
    emailQueue.getActiveCount(),
    emailQueue.getCompletedCount(),
    emailQueue.getFailedCount(),
    emailQueue.getDelayedCount()
  ]);
  
  const [dlqCount] = await Promise.all([
    emailDLQ.getWaitingCount()
  ]);
  
  return {
    main: {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + delayed
    },
    dlq: {
      count: dlqCount
    }
  };
}

/**
 * Pause the email queue (for maintenance)
 */
export async function pauseQueue() {
  await emailQueue.pause();
  console.log('⏸️  Email queue paused');
}

/**
 * Resume the email queue
 */
export async function resumeQueue() {
  await emailQueue.resume();
  console.log('▶️  Email queue resumed');
}

/**
 * Clear all jobs from queue (dangerous!)
 */
export async function clearQueue() {
  await emailQueue.drain();
  await emailQueue.clean(0, 0, 'completed');
  await emailQueue.clean(0, 0, 'failed');
  console.log('🗑️  Email queue cleared');
}

/**
 * Close queue connections gracefully
 */
export async function closeQueues() {
  await emailQueue.close();
  await emailDLQ.close();
  console.log('👋 Queue connections closed');
}

export default {
  emailQueue,
  emailDLQ,
  EMAIL_JOB_TYPES,
  PRIORITY,
  queueVoteConfirmation,
  queueProgressUpdate,
  queueRankUpdate,
  queueRewardDelivery,
  queueReferralJoin,
  queueReferralMilestone,
  queueBulkEmails,
  scheduleEmail,
  moveToDLQ,
  getQueueStats,
  pauseQueue,
  resumeQueue,
  clearQueue,
  closeQueues
};

