/**
 * Example Usage of Email Service
 * 
 * This file demonstrates how to use the email notification system
 * in any backend application. All emails are automatically scheduled
 * to be sent at optimal times unless the immediate flag is set to true.
 */

import {
  sendVoteConfirmationEmail,
  sendProgressUpdateEmail,
  sendRankUpdateEmail,
  sendRewardDeliveryEmail,
  sendReferralJoinEmail,
  sendReferralMilestoneEmail
} from './emailService.js';

// =============================================================================
// EXAMPLE 1: Vote Confirmation Email (Scheduled)
// =============================================================================

async function exampleVoteConfirmation() {
  try {
    await sendVoteConfirmationEmail('user@example.com', {
      modelName: 'Aarushi',
      profileUrl: 'https://covergirl.com/models/aarushi'
    });
    
    console.log('Vote confirmation email scheduled successfully!');
  } catch (error) {
    console.error('Failed to schedule vote confirmation email:', error);
  }
}

// =============================================================================
// EXAMPLE 2: Progress Update Email (Scheduled)
// =============================================================================

async function exampleProgressUpdate() {
  try {
    await sendProgressUpdateEmail('voter@example.com', {
      modelName: 'Aarushi',
      voteCount: 1250,
      votesNeeded: 150,
      daysLeft: 5,
      progressPercent: 75,
      profileUrl: 'https://covergirl.com/models/aarushi'
    });
    
    console.log('Progress update email scheduled successfully!');
  } catch (error) {
    console.error('Failed to schedule progress update email:', error);
  }
}

// =============================================================================
// EXAMPLE 3: Rank Update Email (Immediate - Time Sensitive!)
// =============================================================================

async function exampleRankUpdate() {
  try {
    // Rank updates are usually time-sensitive, so we send immediately
    await sendRankUpdateEmail('supporter@example.com', {
      modelName: 'Aarushi',
      rankPosition: 3,
      previousRank: 5,
      voteCount: 2500,
      profileUrl: 'https://covergirl.com/models/aarushi'
    }, true); // immediate = true
    
    console.log('Rank update email sent immediately!');
  } catch (error) {
    console.error('Failed to send rank update email:', error);
  }
}

// =============================================================================
// EXAMPLE 4: Reward Delivery Email (Scheduled)
// =============================================================================

async function exampleRewardDelivery() {
  try {
    await sendRewardDeliveryEmail('winner@example.com', {
      rewardName: 'VIP Access Pass',
      rewardDescription: 'Get exclusive backstage access to the CoverGirl photoshoot and meet the models in person!',
      expiryDate: 'December 31, 2025',
      claimUrl: 'https://covergirl.com/rewards/claim/abc123'
    });
    
    console.log('Reward delivery email scheduled successfully!');
  } catch (error) {
    console.error('Failed to schedule reward delivery email:', error);
  }
}

// =============================================================================
// EXAMPLE 5: Referral Join Email (Scheduled)
// =============================================================================

async function exampleReferralJoin() {
  try {
    await sendReferralJoinEmail('newuser@example.com', {
      userName: 'Jessica',
      referralLink: 'https://covergirl.com/ref/jessica123',
      rewardName: 'Premium Membership',
      referralsNeeded: 5
    });
    
    console.log('Referral join email scheduled successfully!');
  } catch (error) {
    console.error('Failed to schedule referral join email:', error);
  }
}

// =============================================================================
// EXAMPLE 6: Referral Milestone Email (Immediate - Celebration!)
// =============================================================================

async function exampleReferralMilestone() {
  try {
    // Milestone achievements are exciting, send immediately!
    await sendReferralMilestoneEmail('referrer@example.com', {
      userName: 'Jessica',
      referralCount: 10,
      tierName: 'Gold',
      rewardName: 'Gold Member Exclusive Rewards Package',
      claimUrl: 'https://covergirl.com/rewards/claim/gold123',
      nextTierCount: 20
    }, true); // immediate = true
    
    console.log('Referral milestone email sent immediately!');
  } catch (error) {
    console.error('Failed to send referral milestone email:', error);
  }
}

// =============================================================================
// BATCH SENDING EXAMPLE
// =============================================================================

async function exampleBatchEmails() {
  console.log('Starting batch email send...');
  
  const emailPromises = [
    sendVoteConfirmationEmail('user1@example.com', {
      modelName: 'Aarushi',
      profileUrl: 'https://covergirl.com/models/aarushi'
    }),
    
    sendVoteConfirmationEmail('user2@example.com', {
      modelName: 'Priya',
      profileUrl: 'https://covergirl.com/models/priya'
    }),
    
    sendProgressUpdateEmail('user3@example.com', {
      modelName: 'Aarushi',
      voteCount: 1500,
      votesNeeded: 100,
      daysLeft: 3,
      progressPercent: 85,
      profileUrl: 'https://covergirl.com/models/aarushi'
    })
  ];
  
  try {
    await Promise.all(emailPromises);
    console.log('All batch emails scheduled successfully!');
  } catch (error) {
    console.error('Some emails failed to schedule:', error);
  }
}

// =============================================================================
// INTEGRATION WITH BACKEND FRAMEWORKS
// =============================================================================

/**
 * Express.js Integration Example
 */
export async function handleVoteEndpoint(req, res) {
  const { modelName, userEmail, profileUrl } = req.body;
  
  try {
    // Process the vote in your database
    // ... your vote processing logic ...
    
    // Send confirmation email (scheduled at optimal time)
    await sendVoteConfirmationEmail(userEmail, {
      modelName,
      profileUrl
    });
    
    res.json({ 
      success: true, 
      message: 'Vote recorded and confirmation email scheduled!' 
    });
  } catch (error) {
    console.error('Vote processing error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Background Job Integration Example
 * (Works with any job queue: Bull, BullMQ, Agenda, etc.)
 */
export async function processRankUpdateJob(job) {
  const { modelName, rankPosition, previousRank, voteCount, subscribers } = job.data;
  
  try {
    // Send rank update to all subscribers
    const emailPromises = subscribers.map(subscriberEmail => 
      sendRankUpdateEmail(subscriberEmail, {
        modelName,
        rankPosition,
        previousRank,
        voteCount,
        profileUrl: `https://covergirl.com/models/${modelName.toLowerCase()}`
      }, true) // Send immediately for time-sensitive rank updates
    );
    
    await Promise.all(emailPromises);
    console.log(`Rank update emails sent to ${subscribers.length} subscribers`);
  } catch (error) {
    console.error('Rank update job failed:', error);
    throw error; // Let the job queue handle retry logic
  }
}

/**
 * Webhook Integration Example
 * (Useful for integrating with payment providers, etc.)
 */
export async function handlePaymentWebhook(webhookData) {
  const { userEmail, rewardName, transactionId } = webhookData;
  
  try {
    // Verify the webhook signature
    // ... your webhook verification logic ...
    
    // Send reward delivery email
    await sendRewardDeliveryEmail(userEmail, {
      rewardName,
      rewardDescription: 'Thank you for your purchase! Your reward is ready.',
      expiryDate: 'Never',
      claimUrl: `https://covergirl.com/rewards/claim/${transactionId}`
    });
    
    console.log('Reward delivery email scheduled for:', userEmail);
  } catch (error) {
    console.error('Webhook processing error:', error);
    throw error;
  }
}

// =============================================================================
// RUN EXAMPLES (Uncomment to test)
// =============================================================================

// Uncomment any of these to test individual email types:

// exampleVoteConfirmation();
// exampleProgressUpdate();
// exampleRankUpdate();
// exampleRewardDelivery();
// exampleReferralJoin();
// exampleReferralMilestone();
// exampleBatchEmails();

console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Email Service Ready! 📧
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Import and use in your backend:
  
  import { 
    sendVoteConfirmationEmail,
    sendProgressUpdateEmail,
    sendRankUpdateEmail,
    sendRewardDeliveryEmail,
    sendReferralJoinEmail,
    sendReferralMilestoneEmail
  } from './email/emailService.js';
  
  Example:
  await sendVoteConfirmationEmail('user@example.com', {
    modelName: 'Aarushi',
    profileUrl: 'https://covergirl.com/models/aarushi'
  });
  
  All emails are automatically scheduled for optimal send times!
  Pass 'true' as the third parameter to send immediately.
  
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

