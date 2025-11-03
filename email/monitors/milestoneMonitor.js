/**
 * Milestone Monitoring System
 *
 * Automatically checks database for milestone achievements and triggers emails
 * Runs periodically to detect:
 * - Vote count milestones (100, 500, 1000, 5000 votes)
 * - Rank changes
 * - Referral milestones (5, 10, 20, 50 referrals)
 * - Reward eligibility
 */

import { PrismaClient } from "../../src/generated/prisma/index.js";
import { publishEvent } from "../queue/eventBus.js";

const db = new PrismaClient();

/**
 * Milestone thresholds
 */
const VOTE_MILESTONES = [100, 250, 500, 1000, 2500, 5000, 10000];
const REFERRAL_TIERS = [
  { count: 5, tier: "Bronze", reward: "Bronze Member Package" },
  { count: 10, tier: "Silver", reward: "Silver Member Package" },
  { count: 20, tier: "Gold", reward: "Gold Member Exclusive Package" },
  { count: 50, tier: "Platinum", reward: "Platinum VIP Package" },
  { count: 100, tier: "Diamond", reward: "Diamond Elite Package" },
];

/**
 * Track what milestones have been sent (in-memory for now)
 * In production, store this in database
 */
const sentMilestones = {
  votes: new Set(), // profileId:milestone
  ranks: new Map(), // profileId -> lastRank
  referrals: new Set(), // userId:tier
  rewards: new Set(), // userId:rewardType
};

/**
 * Check for vote count milestones
 */
export async function checkVoteMilestones() {
  try {
    console.log("🔍 Checking vote milestones...");

    // Get all profiles with their vote counts
    const profiles = await db.profile.findMany({
      include: {
        user: {
          select: { username: true, name: true, email: true },
        },
        _count: {
          select: {
            votesReceived: true,
          },
        },
      },
    });

    let milestonesFound = 0;

    for (const profile of profiles) {
      const voteCount = profile._count.votesReceived;

      // Check each milestone threshold
      for (const milestone of VOTE_MILESTONES) {
        if (voteCount >= milestone) {
          const milestoneKey = `${profile.id}:${milestone}`;

          // Only send if not already sent
          if (!sentMilestones.votes.has(milestoneKey)) {
            console.log(`  ✨ Milestone reached: ${profile.user.username} - ${voteCount} votes`);

            // Get all voters for this model
            const voters = await db.vote.findMany({
              where: { voteeId: profile.id },
              include: {
                voter: {
                  include: {
                    user: { select: { email: true } },
                  },
                },
              },
              distinct: ["voterId"],
            });

            const subscriberEmails = voters
              .map(v => v.voter?.user?.email)
              .filter(Boolean);

            if (subscriberEmails.length > 0) {
              // Calculate next milestone
              const nextMilestone = VOTE_MILESTONES.find(m => m > voteCount);
              const votesNeeded = nextMilestone ? nextMilestone - voteCount : 0;
              const progressPercent = Math.min(100, Math.round((voteCount / (nextMilestone || voteCount)) * 100));

              // Get contest info
              const contest = await db.contest.findFirst({
                where: { isVotingEnabled: true },
              });

              const daysLeft = contest?.endDate
                ? Math.ceil((new Date(contest.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : 7;

              // Send progress update to all voters
              await publishEvent.modelProgressMilestone({
                modelId: profile.id,
                modelName: profile.user.username ?? profile.user.name ?? "Model",
                voteCount,
                votesNeeded,
                daysLeft: Math.max(1, daysLeft),
                subscriberEmails,
              });

              sentMilestones.votes.add(milestoneKey);
              milestonesFound++;

              console.log(`    📧 Progress update queued for ${subscriberEmails.length} supporter(s)`);
            }
          }
        }
      }
    }

    if (milestonesFound > 0) {
      console.log(`✅ Found and processed ${milestonesFound} vote milestone(s)\n`);
    } else {
      console.log("  No new vote milestones\n");
    }
  } catch (error) {
    console.error("❌ Error checking vote milestones:", error.message);
  }
}

/**
 * Check for rank changes
 */
export async function checkRankChanges() {
  try {
    console.log("🔍 Checking rank changes...");

    // Get active contest
    const contest = await db.contest.findFirst({
      where: { isVotingEnabled: true },
      include: {
        contestParticipations: {
          include: {
            profile: {
              include: {
                user: {
                  select: { username: true, name: true },
                },
                _count: {
                  select: {
                    votesReceived: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!contest) {
      console.log("  No active contest\n");
      return;
    }

    // Calculate current rankings
    const rankedParticipants = contest.contestParticipations
      .map(p => ({
        profileId: p.profile.id,
        modelName: p.profile.user.username ?? p.profile.user.name ?? "Model",
        voteCount: p.profile._count.votesReceived,
      }))
      .sort((a, b) => b.voteCount - a.voteCount);

    let ranksChanged = 0;

    // Check each participant for rank changes
    for (let i = 0; i < rankedParticipants.length; i++) {
      const participant = rankedParticipants[i];
      const newRank = i + 1;
      const oldRank = sentMilestones.ranks.get(participant.profileId);

      if (oldRank && oldRank !== newRank) {
        console.log(`  📊 Rank changed: ${participant.modelName} (${oldRank} → ${newRank})`);

        // Get all supporters for this model
        const supporters = await db.vote.findMany({
          where: { voteeId: participant.profileId },
          include: {
            voter: {
              include: {
                user: { select: { email: true } },
              },
            },
          },
          distinct: ["voterId"],
        });

        const supporterEmails = supporters
          .map(v => v.voter?.user?.email)
          .filter(Boolean);

        if (supporterEmails.length > 0) {
          await publishEvent.modelRankChanged({
            modelId: participant.profileId,
            modelName: participant.modelName,
            newRank,
            oldRank,
            voteCount: participant.voteCount,
            supporterEmails,
          });

          ranksChanged++;
          console.log(`    📧 Rank update queued for ${supporterEmails.length} supporter(s)`);
        }
      }

      // Update stored rank
      sentMilestones.ranks.set(participant.profileId, newRank);
    }

    if (ranksChanged > 0) {
      console.log(`✅ Found and processed ${ranksChanged} rank change(s)\n`);
    } else {
      console.log("  No rank changes\n");
    }
  } catch (error) {
    console.error("❌ Error checking rank changes:", error.message);
  }
}

/**
 * Check for referral milestones
 */
export async function checkReferralMilestones() {
  try {
    console.log("🔍 Checking referral milestones...");

    // This would require a referral tracking system in your database
    // For now, showing the structure

    // Example: Get users with referral counts
    // const users = await db.user.findMany({
    //   where: { referralCount: { gte: 5 } }
    // });

    // For each tier, check if user reached it
    // for (const tier of REFERRAL_TIERS) {
    //   for (const user of users) {
    //     if (user.referralCount >= tier.count) {
    //       const milestoneKey = `${user.id}:${tier.tier}`;
    //
    //       if (!sentMilestones.referrals.has(milestoneKey)) {
    //         await publishEvent.referralMilestone({
    //           userEmail: user.email,
    //           userName: user.name,
    //           referralCount: user.referralCount,
    //           tierName: tier.tier,
    //           rewardName: tier.reward,
    //           rewardId: `ref-${user.id}-${tier.tier}`,
    //           nextTierCount: getNextTierCount(tier.count)
    //         });
    //
    //         sentMilestones.referrals.add(milestoneKey);
    //       }
    //     }
    //   }
    // }

    console.log("  (Referral tracking not implemented in schema yet)\n");
  } catch (error) {
    console.error("❌ Error checking referral milestones:", error.message);
  }
}

/**
 * Check for reward eligibility
 */
export async function checkRewardEligibility() {
  try {
    console.log("🔍 Checking reward eligibility...");

    // Example reward criteria:
    // - 10+ votes given = "Active Supporter" reward
    // - Top 10 voters = "Top Supporter" reward
    // - First vote = "Welcome" reward

    const topVoters = await db.vote.groupBy({
      by: ["voterId"],
      _sum: {
        count: true,
      },
      orderBy: {
        _sum: {
          count: "desc",
        },
      },
      take: 10,
      having: {
        count: {
          _sum: {
            gte: 10, // At least 10 votes total
          },
        },
      },
    });

    let rewardsQueued = 0;

    for (const voter of topVoters) {
      const rewardKey = `${voter.voterId}:top-voter`;

      if (!sentMilestones.rewards.has(rewardKey)) {
        const profile = await db.profile.findUnique({
          where: { id: voter.voterId },
          include: {
            user: { select: { email: true, name: true } },
          },
        });

        if (profile?.user?.email) {
          await publishEvent.rewardEarned({
            userEmail: profile.user.email,
            rewardId: `reward-${voter.voterId}-${Date.now()}`,
            rewardName: "Top Supporter Badge",
            rewardDescription: `You're one of our top supporters with ${voter._sum.count} votes given!`,
            expiryDate: "Never",
          });

          sentMilestones.rewards.add(rewardKey);
          rewardsQueued++;

          console.log(`  🎁 Reward queued for ${profile.user.name} (${voter._sum.count} votes)`);
        }
      }
    }

    if (rewardsQueued > 0) {
      console.log(`✅ Queued ${rewardsQueued} reward email(s)\n`);
    } else {
      console.log("  No new rewards to send\n");
    }
  } catch (error) {
    console.error("❌ Error checking reward eligibility:", error.message);
  }
}

/**
 * Run all milestone checks
 */
export async function runAllChecks() {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`📊 MILESTONE CHECK - ${new Date().toLocaleString()}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  await checkVoteMilestones();
  await checkRankChanges();
  await checkReferralMilestones();
  await checkRewardEligibility();

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

export default {
  runAllChecks,
  checkVoteMilestones,
  checkRankChanges,
  checkReferralMilestones,
  checkRewardEligibility,
};
