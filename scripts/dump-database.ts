import { db } from "../src/db/index";
import * as fs from "fs/promises";
import * as path from "path";

interface TableData {
  [tableName: string]: unknown[];
}

async function dumpDatabase() {
  console.log("📊 Starting database dump...\n");

  const dump: TableData = {};
  const timestamp = new Date().toISOString().replace(/:/g, "-").split(".")[0];

  try {
    // Dump all tables
    console.log("📥 Dumping Users...");
    dump.users = await db.user.findMany({
      include: {
        profile: true,
      },
    });

    console.log("📥 Dumping Profiles...");
    dump.profiles = await db.profile.findMany({
      include: {
        user: true,
        stats: true,
        rank: true,
        coverImage: true,
        bannerImage: true,
        profilePhotos: true,
      },
    });

    console.log("📥 Dumping Profile Stats...");
    dump.profileStats = await db.profileStats.findMany();

    console.log("📥 Dumping Votes...");
    dump.votes = await db.vote.findMany({
      include: {
        voter: {
          include: { user: true },
        },
        votee: {
          include: { user: true },
        },
        contest: true,
      },
    });

    console.log("📥 Dumping Payments...");
    dump.payments = await db.payment.findMany({
      include: {
        payer: {
          include: { user: true },
        },
        intendedVotee: {
          include: { user: true },
        },
      },
    });

    console.log("📥 Dumping Contests...");
    dump.contests = await db.contest.findMany({
      include: {
        awards: true,
        participations: true,
      },
    });

    console.log("📥 Dumping Contest Participations...");
    dump.contestParticipations = await db.contestParticipation.findMany({
      include: {
        profile: {
          include: { user: true },
        },
        contest: true,
      },
    });

    console.log("📥 Dumping Contest Awards...");
    dump.contestAwards = await db.award.findMany({
      include: {
        contest: true,
      },
    });

    console.log("📥 Dumping Spin Wheel Rewards...");
    dump.spinWheelRewards = await db.spinWheelReward.findMany();

    console.log("📥 Dumping Spin Wheel History...");
    dump.spinWheelHistory = await db.spinWheelHistory.findMany({
      include: {
        profile: {
          include: { user: true },
        },
        reward: true,
      },
    });

    console.log("📥 Dumping Active Spin Prizes...");
    dump.activeSpinPrizes = await db.activeSpinPrize.findMany({
      include: {
        profile: {
          include: { user: true },
        },
      },
    });

    console.log("📥 Dumping Favorites...");
    dump.favorites = await db.favorite.findMany({
      include: {
        voter: {
          include: { user: true },
        },
        model: {
          include: { user: true },
        },
      },
    });

    console.log("📥 Dumping Milestone Configs...");
    dump.milestoneConfigs = await db.milestoneConfig.findMany();

    console.log("📥 Dumping Milestones...");
    dump.milestones = await db.milestone.findMany({
      include: {
        profile: {
          include: { user: true },
        },
      },
    });

    console.log("📥 Dumping Achievements...");
    dump.achievements = await db.achievement.findMany();

    console.log("📥 Dumping Profile Achievements...");
    dump.profileAchievements = await db.profileAchievement.findMany({
      include: {
        profile: {
          include: { user: true },
        },
        achievement: true,
      },
    });

    console.log("📥 Dumping Unlocked Content...");
    dump.unlockedContent = await db.unlockedContent.findMany({
      include: {
        profile: {
          include: { user: true },
        },
      },
    });

    console.log("📥 Dumping Ranks...");
    dump.ranks = await db.rank.findMany({
      include: {
        profile: {
          include: { user: true },
        },
      },
    });

    console.log("📥 Dumping Notifications...");
    dump.notifications = await db.notification.findMany({
      include: {
        profile: {
          include: { user: true },
        },
      },
    });

    console.log("📥 Dumping Referrals...");
    dump.referrals = await db.referral.findMany({
      include: {
        referrer: {
          include: { user: true },
        },
        referee: {
          include: { user: true },
        },
      },
    });

    console.log("📥 Dumping Vote Multiplier Periods...");
    dump.voteMultiplierPeriods = await db.voteMultiplierPeriod.findMany();

    console.log("📥 Dumping Media...");
    dump.media = await db.media.findMany({
      include: {
        profile: {
          include: { user: true },
        },
        contest: true,
      },
    });

    // Add metadata
    const metadata = {
      timestamp: new Date().toISOString(),
      tablesDumped: Object.keys(dump).length,
      totalRecords: Object.values(dump).reduce((sum, arr) => sum + arr.length, 0),
    };

    const fullDump = {
      metadata,
      data: dump,
    };

    // Write to file
    const filename = `database-dump-${timestamp}.json`;
    const filepath = path.join(process.cwd(), filename);
    
    await fs.writeFile(filepath, JSON.stringify(fullDump, null, 2), "utf-8");

    console.log("\n✅ Database dump completed!");
    console.log(`📁 File saved: ${filename}`);
    console.log(`📊 Total tables: ${metadata.tablesDumped}`);
    console.log(`📊 Total records: ${metadata.totalRecords}`);

    // Also create a summary file
    const summary = {
      timestamp: metadata.timestamp,
      summary: Object.entries(dump).map(([table, records]) => ({
        table,
        recordCount: (records as unknown[]).length,
      })),
    };

    const summaryFilename = `database-dump-summary-${timestamp}.json`;
    const summaryFilepath = path.join(process.cwd(), summaryFilename);
    await fs.writeFile(summaryFilepath, JSON.stringify(summary, null, 2), "utf-8");
    
    console.log(`📋 Summary saved: ${summaryFilename}`);

  } catch (error) {
    console.error("❌ Error dumping database:", error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

dumpDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

