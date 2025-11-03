#!/usr/bin/env node

/**
 * Email Worker Starter
 * 
 * Starts the email worker process to process queued emails
 * Can be run standalone or with PM2 for production
 */

import { config } from 'dotenv';
config();

import { startWorkers } from './emailWorker.js';
import { registerDefaultHandlers, createEventWorker } from './eventBus.js';

console.log('🚀 Starting Email System...\n');

// Register event handlers
registerDefaultHandlers();

// Start event worker
const eventWorker = createEventWorker();

// Start email workers
const { emailWorker, dlqWorker } = startWorkers({
  concurrency: parseInt(process.env.EMAIL_WORKER_CONCURRENCY || '5'),
  maxJobsPerSecond: parseInt(process.env.EMAIL_RATE_LIMIT || '10')
});

console.log('\n✅ Email system is fully operational!');
console.log(`   - Email Worker: Processing up to ${process.env.EMAIL_WORKER_CONCURRENCY || 5} jobs concurrently`);
console.log(`   - Rate Limit: ${process.env.EMAIL_RATE_LIMIT || 10} emails/second`);
console.log(`   - Event Worker: Listening for application events`);
console.log(`   - DLQ Worker: Monitoring failed jobs\n`);

// Handle process termination
process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  await emailWorker.close();
  await dlqWorker.close();
  await eventWorker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  await emailWorker.close();
  await dlqWorker.close();
  await eventWorker.close();
  process.exit(0);
});

// Keep process alive
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Don't exit - worker should keep running
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit - worker should keep running
});