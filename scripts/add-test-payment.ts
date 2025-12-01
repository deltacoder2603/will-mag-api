/**
 * Script to add a test payment of $50 from srisrikantpandey@gmail.com to crew
 * This will also trigger milestone tracking
 */

import { db } from "../src/db";
import { checkAndGrantMilestoneSpins } from "../src/lib/milestone-spin";

async function addTestPayment() {
  try {
    // Find the voter (srisrikantpandey@gmail.com)
    const voterUser = await db.user.findUnique({
      where: { email: "srisrikantpandey@gmail.com" },
      include: { profile: true },
    });

    if (!voterUser || !voterUser.profile) {
      console.error("❌ Voter not found: srisrikantpandey@gmail.com");
      console.log("Please ensure the user exists and has a profile");
      process.exit(1);
    }

    // Find the model (crew - by username)
    const crewUser = await db.user.findFirst({
      where: {
        OR: [
          { username: "crew6437" },
          { username: "crew" },
          { displayUsername: "crew6437" },
          { displayUsername: "crew" },
        ],
      },
      include: { profile: true },
    });

    if (!crewUser || !crewUser.profile) {
      console.error("❌ Model 'crew' not found");
      console.log("Please check the username - tried: crew6437, crew");
      process.exit(1);
    }

    // Find an active contest (or use the first one)
    const contest = await db.contest.findFirst({
      where: {
        status: { in: ["ACTIVE", "VOTING", "PUBLISHED"] },
      },
    });

    if (!contest) {
      console.error("❌ No active contest found");
      process.exit(1);
    }

    const voterProfile = voterUser.profile;
    const crewProfile = crewUser.profile;

    console.log(`✅ Found voter: ${voterUser.name} (${voterUser.email})`);
    console.log(`✅ Found model: ${crewUser.name} (${crewUser.username || crewUser.displayUsername})`);
    console.log(`✅ Found contest: ${contest.name}`);

    // Create a payment record for $50
    const payment = await db.payment.create({
      data: {
        amount: 50.0,
        status: "COMPLETED",
        payerId: voterProfile.id,
        stripeSessionId: `test_payment_${Date.now()}`,
        type: "MODEL_VOTE",
        intendedVoteeId: crewProfile.id,
        intendedContestId: contest.id,
        intendedVoteCount: 50, // $50 = 50 votes at $1 per vote
        intendedComment: "Test payment - $50",
      },
    });

    console.log(`✅ Created payment: ${payment.id} for $${payment.amount}`);

    // Create the vote
    const vote = await db.vote.create({
      data: {
        voteeId: crewProfile.id,
        voterId: voterProfile.id,
        contestId: contest.id,
        type: "PAID",
        paymentId: payment.id,
        count: 50, // 50 votes
        comment: "Test payment - $50",
      },
    });

    console.log(`✅ Created vote: ${vote.id} with ${vote.count} votes`);

    // Check and grant milestone spins (if table exists)
    try {
      const milestoneResult = await checkAndGrantMilestoneSpins(
        voterProfile.id,
        crewProfile.id,
        50.0,
      );

      if (milestoneResult.granted && milestoneResult.milestoneReached) {
        console.log(`🎉 Milestone reached! $${milestoneResult.milestoneReached} - Free spin granted!`);
      } else {
        console.log(`ℹ️  No milestone reached yet (current spending will be tracked)`);
      }

      // Get current milestone progress
      const milestone = await db.voterModelMilestone.findUnique({
        where: {
          voterId_modelId: {
            voterId: voterProfile.id,
            modelId: crewProfile.id,
          },
        },
      });

      if (milestone) {
        console.log(`\n📊 Milestone Progress:`);
        console.log(`   Total Spent: $${milestone.totalSpent}`);
        console.log(`   Last Milestone: $${milestone.lastMilestoneReached || "None"}`);
      }
    } catch (error: any) {
      if (error.code === 'P2021') {
        console.log(`\n⚠️  Milestone table doesn't exist yet. Run 'pnpm db:push' to create it.`);
      } else {
        console.error(`❌ Error checking milestones:`, error);
      }
    }

    console.log("\n✅ Test payment completed successfully!");
  } catch (error) {
    console.error("❌ Error adding test payment:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

addTestPayment();

