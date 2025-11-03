import { db } from "./index";

export async function seedMilestones() {
  console.log("🏆 Seeding voter milestones...");

  const milestones = [
    {
      type: "VOTE_COUNT",
      threshold: 10,
      name: "Beginner Voter",
      description: "Cast your first 10 votes and join the community!",
      icon: "🎯",
      reward: "Welcome Badge",
      isActive: true,
      sortOrder: 1,
    },
    {
      type: "VOTE_COUNT",
      threshold: 50,
      name: "Active Supporter",
      description: "You've shown consistent support by casting 50 votes!",
      icon: "💝",
      reward: "1 Spin Wheel",
      isActive: true,
      sortOrder: 2,
    },
    {
      type: "VOTE_COUNT",
      threshold: 100,
      name: "Exclusive Access",
      description: "Your dedication has earned you exclusive rewards!",
      icon: "🔓",
      reward: "Unlock Exclusive Photo",
      isActive: true,
      sortOrder: 3,
    },
    {
      type: "VOTE_COUNT",
      threshold: 200,
      name: "VIP Supporter",
      description: "You're a valued member of our voting community!",
      icon: "⭐",
      reward: "Unlock Video/Audio Message",
      isActive: true,
      sortOrder: 4,
    },
    {
      type: "VOTE_COUNT",
      threshold: 500,
      name: "Elite Voter",
      description: "Your support is legendary - thank you!",
      icon: "💎",
      reward: "Unlock Private Call",
      isActive: true,
      sortOrder: 5,
    },
    {
      type: "VOTE_COUNT",
      threshold: 1000,
      name: "Legend Status",
      description: "You've reached the pinnacle of voter dedication!",
      icon: "👑",
      reward: "Unlock Signed Merch/Magazine",
      isActive: true,
      sortOrder: 6,
    },
  ];

  for (const milestone of milestones) {
    await db.milestoneConfig.upsert({
      where: {
        type_threshold: {
          type: milestone.type as any,
          threshold: milestone.threshold,
        },
      },
      update: milestone,
      create: milestone,
    });
  }

  console.log(`✅ Created ${milestones.length} voter milestones`);
}

export async function seedAchievements() {
  console.log("🏅 Seeding voter achievements...");

  const achievements = [
    {
      code: "FIRST_VOTE",
      name: "First Vote",
      description: "Cast your first vote",
      icon: "🎯",
      category: "VOTING",
      requirement: 1,
      tier: "BRONZE",
    },
    {
      code: "LOYAL_VOTER",
      name: "Loyal Voter",
      description: "Vote for the same model 10 times",
      icon: "💝",
      category: "VOTING",
      requirement: 10,
      tier: "SILVER",
    },
    {
      code: "CONTEST_EXPLORER",
      name: "Contest Explorer",
      description: "Vote in 5 different contests",
      icon: "🌟",
      category: "ENGAGEMENT",
      requirement: 5,
      tier: "BRONZE",
    },
    {
      code: "POWER_VOTER",
      name: "Power Voter",
      description: "Cast 100 votes",
      icon: "⚡",
      category: "VOTING",
      requirement: 100,
      tier: "GOLD",
    },
    {
      code: "MEGA_SUPPORTER",
      name: "Mega Supporter",
      description: "Cast 500 votes",
      icon: "🚀",
      category: "VOTING",
      requirement: 500,
      tier: "PLATINUM",
    },
    {
      code: "LEGENDARY",
      name: "Legendary",
      description: "Cast 1000 votes",
      icon: "👑",
      category: "VOTING",
      requirement: 1000,
      tier: "DIAMOND",
    },
    {
      code: "EARLY_BIRD",
      name: "Early Bird",
      description: "Vote in the first hour of a contest",
      icon: "🌅",
      category: "ENGAGEMENT",
      requirement: 1,
      tier: "SILVER",
    },
    {
      code: "DAILY_VOTER",
      name: "Daily Voter",
      description: "Vote every day for 7 days straight",
      icon: "📅",
      category: "ENGAGEMENT",
      requirement: 7,
      tier: "GOLD",
    },
  ];

  for (const achievement of achievements) {
    await db.achievement.upsert({
      where: { code: achievement.code },
      update: achievement,
      create: achievement,
    });
  }

  console.log(`✅ Created ${achievements.length} achievements`);
}

