#!/usr/bin/env node
/**
 * Queue System Test Suite
 * 
 * Tests all functionality:
 * - Redis connection
 * - Queue operations
 * - Event bus (SNS-like)
 * - DLQ handling
 * - Bulk operations
 * 
 * Usage: node email/queue/test.js
 */

import { testRedisConnection } from './redis.config.js';
import {
  queueVoteConfirmation,
  queueProgressUpdate,
  queueRankUpdate,
  queueRewardDelivery,
  queueReferralJoin,
  queueReferralMilestone,
  queueBulkEmails,
  scheduleEmail,
  getQueueStats,
  EMAIL_JOB_TYPES,
  emailQueue,
  emailDLQ
} from './emailQueue.js';
import {
  publish,
  publishEvent,
  getEventStats,
  EVENT_TOPICS
} from './eventBus.js';

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║          🧪 EMAIL QUEUE SYSTEM TEST SUITE                    ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`);

/**
 * Test Results Tracker
 */
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, passed, details = '') {
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${name}`);
  if (details) console.log(`   ${details}`);
  
  results.tests.push({ name, passed, details });
  if (passed) results.passed++;
  else results.failed++;
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📋 Running tests...\n');
  
  // Test 1: Redis Connection
  console.log('1️⃣  Testing Redis Connection');
  try {
    const isConnected = await testRedisConnection();
    logTest('Redis Connection', isConnected);
  } catch (error) {
    logTest('Redis Connection', false, error.message);
  }
  
  console.log('');
  
  // Test 2: Queue Vote Confirmation Email
  console.log('2️⃣  Testing Vote Confirmation Queue');
  try {
    const job = await queueVoteConfirmation('test@example.com', {
      modelName: 'Test Model',
      profileUrl: 'https://example.com/model'
    });
    logTest('Queue Vote Confirmation', !!job.id, `Job ID: ${job.id}`);
  } catch (error) {
    logTest('Queue Vote Confirmation', false, error.message);
  }
  
  console.log('');
  
  // Test 3: Queue Progress Update Email
  console.log('3️⃣  Testing Progress Update Queue');
  try {
    const job = await queueProgressUpdate('test@example.com', {
      modelName: 'Test Model',
      voteCount: 100,
      votesNeeded: 50,
      daysLeft: 5,
      progressPercent: 67,
      profileUrl: 'https://example.com/model'
    });
    logTest('Queue Progress Update', !!job.id, `Job ID: ${job.id}`);
  } catch (error) {
    logTest('Queue Progress Update', false, error.message);
  }
  
  console.log('');
  
  // Test 4: Queue Rank Update (High Priority)
  console.log('4️⃣  Testing Rank Update Queue (High Priority)');
  try {
    const job = await queueRankUpdate('test@example.com', {
      modelName: 'Test Model',
      rankPosition: 3,
      previousRank: 5,
      voteCount: 2500,
      profileUrl: 'https://example.com/model'
    });
    logTest('Queue Rank Update', !!job.id, `Job ID: ${job.id}, Priority: ${job.opts.priority}`);
  } catch (error) {
    logTest('Queue Rank Update', false, error.message);
  }
  
  console.log('');
  
  // Test 5: Queue Reward Delivery
  console.log('5️⃣  Testing Reward Delivery Queue');
  try {
    const job = await queueRewardDelivery('test@example.com', {
      rewardName: 'VIP Pass',
      rewardDescription: 'Exclusive access',
      expiryDate: 'Dec 31, 2025',
      claimUrl: 'https://example.com/claim'
    });
    logTest('Queue Reward Delivery', !!job.id, `Job ID: ${job.id}`);
  } catch (error) {
    logTest('Queue Reward Delivery', false, error.message);
  }
  
  console.log('');
  
  // Test 6: Queue Referral Join
  console.log('6️⃣  Testing Referral Join Queue');
  try {
    const job = await queueReferralJoin('test@example.com', {
      userName: 'Test User',
      referralLink: 'https://example.com/ref/123',
      rewardName: 'Premium Membership',
      referralsNeeded: 5
    });
    logTest('Queue Referral Join', !!job.id, `Job ID: ${job.id}`);
  } catch (error) {
    logTest('Queue Referral Join', false, error.message);
  }
  
  console.log('');
  
  // Test 7: Queue Referral Milestone
  console.log('7️⃣  Testing Referral Milestone Queue');
  try {
    const job = await queueReferralMilestone('test@example.com', {
      userName: 'Test User',
      referralCount: 10,
      tierName: 'Gold',
      rewardName: 'Gold Package',
      claimUrl: 'https://example.com/claim',
      nextTierCount: 20
    });
    logTest('Queue Referral Milestone', !!job.id, `Job ID: ${job.id}`);
  } catch (error) {
    logTest('Queue Referral Milestone', false, error.message);
  }
  
  console.log('');
  
  // Test 8: Bulk Email Queue
  console.log('8️⃣  Testing Bulk Email Queue');
  try {
    const recipients = ['user1@example.com', 'user2@example.com', 'user3@example.com'];
    const jobs = await queueBulkEmails(EMAIL_JOB_TYPES.VOTE_CONFIRMATION, recipients, {
      modelName: 'Test Model',
      profileUrl: 'https://example.com/model'
    });
    logTest('Bulk Email Queue', jobs.length === recipients.length, `Queued ${jobs.length} emails`);
  } catch (error) {
    logTest('Bulk Email Queue', false, error.message);
  }
  
  console.log('');
  
  // Test 9: Schedule Email (Delayed)
  console.log('9️⃣  Testing Scheduled Email (5 seconds delay)');
  try {
    const scheduledTime = new Date(Date.now() + 5000); // 5 seconds from now
    const job = await scheduleEmail(
      EMAIL_JOB_TYPES.VOTE_CONFIRMATION,
      'test@example.com',
      { modelName: 'Scheduled Test', profileUrl: 'https://example.com' },
      scheduledTime
    );
    logTest('Schedule Email', !!job.id, `Scheduled for ${scheduledTime.toLocaleTimeString()}`);
  } catch (error) {
    logTest('Schedule Email', false, error.message);
  }
  
  console.log('');
  
  // Test 10: Event Bus - Publish Vote Created Event
  console.log('🔟 Testing Event Bus (SNS-like) - Publish Event');
  try {
    const job = await publishEvent.voteCreated({
      voterEmail: 'voter@example.com',
      modelName: 'Event Test Model',
      modelId: '123'
    });
    logTest('Publish Vote Created Event', !!job.id, `Event Job ID: ${job.id}`);
  } catch (error) {
    logTest('Publish Vote Created Event', false, error.message);
  }
  
  console.log('');
  
  // Test 11: Event Bus - Publish Rank Changed Event
  console.log('1️⃣1️⃣  Testing Event Bus - Rank Changed (Multiple Recipients)');
  try {
    const job = await publishEvent.modelRankChanged({
      modelId: '123',
      modelName: 'Event Test Model',
      newRank: 3,
      oldRank: 5,
      voteCount: 2500,
      supporterEmails: ['supporter1@example.com', 'supporter2@example.com', 'supporter3@example.com']
    });
    logTest('Publish Rank Changed Event', !!job.id, `Will notify 3 supporters`);
  } catch (error) {
    logTest('Publish Rank Changed Event', false, error.message);
  }
  
  console.log('');
  
  // Test 12: Get Queue Statistics
  console.log('1️⃣2️⃣  Testing Queue Statistics');
  try {
    const stats = await getQueueStats();
    logTest('Get Queue Stats', !!stats.main, `Total jobs: ${stats.main.total}, Completed: ${stats.main.completed}`);
  } catch (error) {
    logTest('Get Queue Stats', false, error.message);
  }
  
  console.log('');
  
  // Test 13: Get Event Statistics
  console.log('1️⃣3️⃣  Testing Event Bus Statistics');
  try {
    const stats = await getEventStats();
    logTest('Get Event Stats', typeof stats.waiting === 'number', `Waiting: ${stats.waiting}, Completed: ${stats.completed}`);
  } catch (error) {
    logTest('Get Event Stats', false, error.message);
  }
  
  console.log('');
  
  // Display Queue Stats
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📊 Current Queue State:\n');
  try {
    const queueStats = await getQueueStats();
    const eventStats = await getEventStats();
    
    console.log('Email Queue:');
    console.log(`  • Waiting: ${queueStats.main.waiting}`);
    console.log(`  • Active: ${queueStats.main.active}`);
    console.log(`  • Delayed: ${queueStats.main.delayed}`);
    console.log(`  • Completed: ${queueStats.main.completed}`);
    console.log(`  • Failed: ${queueStats.main.failed}`);
    console.log('');
    console.log('Event Bus:');
    console.log(`  • Waiting: ${eventStats.waiting}`);
    console.log(`  • Active: ${eventStats.active}`);
    console.log(`  • Completed: ${eventStats.completed}`);
    console.log(`  • Failed: ${eventStats.failed}`);
  } catch (error) {
    console.error('Error getting stats:', error.message);
  }
  
  // Display Results
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📋 TEST RESULTS:\n');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📊 Total: ${results.tests.length}`);
  console.log(`📈 Success Rate: ${Math.round((results.passed / results.tests.length) * 100)}%`);
  
  if (results.failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.tests.filter(t => !t.passed).forEach(t => {
      console.log(`   • ${t.name}: ${t.details}`);
    });
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  if (results.passed > 0) {
    console.log(`
💡 NEXT STEPS:

1. Start the worker to process these queued jobs:
   node email/queue/worker.js

2. Jobs will be processed and emails will be sent!

3. Monitor queue statistics in the worker output

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);
  }
  
  // Close connections
  await emailQueue.close();
  await emailDLQ.close();
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});

