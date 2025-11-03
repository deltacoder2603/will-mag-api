/**
 * Email Worker - Processes email jobs from the queue
 * 
 * This worker runs as a separate process and processes email jobs
 * from the BullMQ queue with automatic retries and DLQ handling.
 */

import { Worker } from 'bullmq';
import { getQueueConnection } from './redis.config.js';
import { EMAIL_JOB_TYPES, emailDLQ, moveToDLQ } from './emailQueue.js';
import {
  sendVoteConfirmationEmail,
  sendProgressUpdateEmail,
  sendRankUpdateEmail,
  sendRewardDeliveryEmail,
  sendReferralJoinEmail,
  sendReferralMilestoneEmail
} from '../emailService.js';

/**
 * Email sending functions mapped by job type
 */
const EMAIL_HANDLERS = {
  [EMAIL_JOB_TYPES.VOTE_CONFIRMATION]: sendVoteConfirmationEmail,
  [EMAIL_JOB_TYPES.PROGRESS_UPDATE]: sendProgressUpdateEmail,
  [EMAIL_JOB_TYPES.RANK_UPDATE]: sendRankUpdateEmail,
  [EMAIL_JOB_TYPES.REWARD_DELIVERY]: sendRewardDeliveryEmail,
  [EMAIL_JOB_TYPES.REFERRAL_JOIN]: sendReferralJoinEmail,
  [EMAIL_JOB_TYPES.REFERRAL_MILESTONE]: sendReferralMilestoneEmail
};

/**
 * Process email job
 */
async function processEmailJob(job) {
  const { to, data, emailType } = job.data;
  
  console.log(`📧 Processing ${emailType} email to ${to} (Job ID: ${job.id})`);
  
  const handler = EMAIL_HANDLERS[job.name];
  
  if (!handler) {
    throw new Error(`Unknown email type: ${job.name}`);
  }
  
  try {
    // Send email (immediate send, no scheduling)
    const result = await handler(to, data, true);
    
    console.log(`✅ Email sent successfully: ${emailType} to ${to}`);
    
    // Wait 3 seconds before allowing next email (rate limiting)
    // Resend free tier allows 2 emails/second, so 3 seconds ensures we stay well under the limit
    console.log(`⏱️  Waiting 3 seconds before next email (rate limiting)...`);
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    return {
      success: true,
      to,
      emailType,
      result,
      sentAt: new Date().toISOString()
    };
  } catch (error) {
    console.error(`❌ Failed to send ${emailType} email to ${to}:`, error.message);
    throw error; // BullMQ will handle retries
  }
}

/**
 * Create and start email worker
 */
export function createEmailWorker(options = {}) {
  const worker = new Worker(
    'email-notifications',
    processEmailJob,
    {
      ...getQueueConnection(),
      concurrency: 1, // Process 1 email at a time (sequential with 3s delay)
      limiter: {
        max: 1, // Rate limit: 1 email per 3 seconds (handled by delay in processEmailJob)
        duration: 3000
      }
    }
  );
  
  // Event: Job completed successfully
  worker.on('completed', (job, result) => {
    console.log(`✅ Job ${job.id} completed:`, result.emailType);
  });
  
  // Event: Job failed
  worker.on('failed', async (job, error) => {
    console.error(`❌ Job ${job.id} failed after ${job.attemptsMade} attempts:`, error.message);
    
    // If all retries exhausted, move to DLQ
    if (job.attemptsMade >= (job.opts.attempts || 3)) {
      console.log(`📮 Moving job ${job.id} to Dead Letter Queue`);
      await moveToDLQ(job, error);
    }
  });
  
  // Event: Worker ready
  worker.on('ready', () => {
    console.log('🚀 Email worker is ready and waiting for jobs...');
  });
  
  // Event: Worker error
  worker.on('error', (error) => {
    console.error('❌ Worker error:', error);
  });
  
  // Event: Job progress (optional, for long-running jobs)
  worker.on('progress', (job, progress) => {
    console.log(`📊 Job ${job.id} progress: ${progress}%`);
  });
  
  return worker;
}

/**
 * DLQ Worker - Process failed emails from DLQ
 * This can be used to manually retry or log failed emails
 */
export function createDLQWorker() {
  const dlqWorker = new Worker(
    'email-dlq',
    async (job) => {
      console.log(`🔍 DLQ Job ${job.id}:`, job.data);
      
      // Here you can:
      // 1. Log to external monitoring system
      // 2. Send alert to admins
      // 3. Attempt manual retry with different logic
      // 4. Store in database for later review
      
      return {
        processed: true,
        reviewedAt: new Date().toISOString()
      };
    },
    {
      ...getQueueConnection(),
      concurrency: 1 // Process DLQ jobs one at a time
    }
  );
  
  dlqWorker.on('completed', (job) => {
    console.log(`📮 DLQ job ${job.id} reviewed`);
  });
  
  return dlqWorker;
}

/**
 * Start all workers
 */
export function startWorkers(options = {}) {
  const emailWorker = createEmailWorker(options);
  const dlqWorker = createDLQWorker();
  
  console.log('🎯 All workers started!');
  
  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('🛑 Shutting down workers gracefully...');
    await emailWorker.close();
    await dlqWorker.close();
    process.exit(0);
  });
  
  process.on('SIGINT', async () => {
    console.log('🛑 Shutting down workers gracefully...');
    await emailWorker.close();
    await dlqWorker.close();
    process.exit(0);
  });
  
  return { emailWorker, dlqWorker };
}

export default {
  createEmailWorker,
  createDLQWorker,
  startWorkers
};

