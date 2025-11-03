import { db } from "./index";

/**
 * Seed spinning wheel rewards based on the requirements
 */
export async function seedSpinWheelRewards() {
  console.log("🎡 Seeding spinning wheel rewards...");

  const rewards = [
    // First set of rewards
    {
      name: "100 Bonus Votes",
      description: "Instantly adds 100 extra votes to your chosen model.",
      icon: "💞",
      probability: 5.0,
      popupMessage: "Wow! You've unlocked 100 bonus votes for your favorite model — they just got a major boost!",
      rewardType: "BONUS_VOTES",
      rewardValue: 100,
      isActive: true,
      sortOrder: 1,
    },
    {
      name: "2x Voting Power for 3 Days",
      description: "Your votes will count double for the next 3 days.",
      icon: "🔁",
      probability: 8.0,
      popupMessage: "You've activated 2x voting power! Every vote you cast for the next 3 days counts as two!",
      rewardType: "VOTE_MULTIPLIER",
      rewardValue: 3,
      isActive: true,
      sortOrder: 2,
    },
    {
      name: "Send a Personal Message to the Model",
      description: "You'll get a one-time chance to send a personalized message (approved by the team) to your favorite model.",
      icon: "💌",
      probability: 10.0,
      popupMessage: "You've unlocked a Personal Message Pass — send your favorite model a special note of support!",
      rewardType: "PERSONAL_MESSAGE",
      rewardValue: null,
      isActive: true,
      sortOrder: 3,
    },
    {
      name: "Your Instagram Handle Featured on the Model's Story",
      description: "The model you voted for will tag and thank you on their Instagram story.",
      icon: "📸",
      probability: 10.0,
      popupMessage: "Congratulations! Your Instagram handle will be featured on your favorite model's story!",
      rewardType: "INSTAGRAM_FEATURE",
      rewardValue: null,
      isActive: true,
      sortOrder: 4,
    },
    {
      name: "Exclusive Voter Badge (Displayed on Leaderboard)",
      description: "A digital badge on your voter profile showing 'Swing VIP Voter.'",
      icon: "🪩",
      probability: 10.0,
      popupMessage: "You've earned the Swing VIP Voter Badge — show off your support in style!",
      rewardType: "EXCLUSIVE_BADGE",
      rewardValue: null,
      isActive: true,
      sortOrder: 5,
    },
    // Second set of rewards
    {
      name: "Follow Back from Swing Magazines",
      description: "Swing Magazines will follow you back on Instagram for 1 month.",
      icon: "💖",
      probability: 7.0,
      popupMessage: "You just earned a follow-back from @SwingMagazines! We'll connect soon 💋",
      rewardType: "MAGAZINE_FOLLOW_BACK",
      rewardValue: 30, // 30 days
      isActive: true,
      sortOrder: 6,
    },
    {
      name: "Free Digital Boudoir Access",
      description: "Get access to Swing's Boudoir Edition digital issue.",
      icon: "🌟",
      probability: 8.0,
      popupMessage: "You've won Free Digital Access to our Boudoir Edition — check your inbox!",
      rewardType: "DIGITAL_BOUDOIR_ACCESS",
      rewardValue: null,
      isActive: true,
      sortOrder: 7,
    },
    {
      name: "Exclusive Behind-the-Scenes Video Link",
      description: "Get a private link to behind-the-scenes boudoir shoots.",
      icon: "💬",
      probability: 7.0,
      popupMessage: "Lucky you! You've unlocked exclusive behind-the-scenes access to our boudoir shoots.",
      rewardType: "BTS_VIDEO_LINK",
      rewardValue: null,
      isActive: true,
      sortOrder: 8,
    },
    {
      name: "Vote Multiplier Token",
      description: "A one-time token to multiply any single vote by x10.",
      icon: "💎",
      probability: 5.0,
      popupMessage: "You've won a Vote Multiplier Token! Use it on any model for a 10x vote boost.",
      rewardType: "VOTE_MULTIPLIER_TOKEN",
      rewardValue: 10,
      isActive: true,
      sortOrder: 9,
    },
    {
      name: "Try Again Spin",
      description: "One free retry to spin again.",
      icon: "🎁",
      probability: 10.0,
      popupMessage: "Almost there! You've earned another spin — let's see what's next!",
      rewardType: "FREE_RETRY_SPIN",
      rewardValue: 1,
      isActive: true,
      sortOrder: 10,
    },
    {
      name: "50% Off Model Meet & Greet Ticket (Virtual)",
      description: "Discount code for Swing's next virtual meet-and-greet event.",
      icon: "🎉",
      probability: 5.0,
      popupMessage: "You've unlocked 50% OFF your Meet & Greet pass — join our next virtual event!",
      rewardType: "MEET_GREET_DISCOUNT",
      rewardValue: 50, // 50% discount
      isActive: true,
      sortOrder: 11,
    },
  ];

  for (const reward of rewards) {
    await db.spinWheelReward.upsert({
      where: {
        // Use a unique combination to check for existing rewards
        // Since we don't have a unique constraint, we'll try to find by name
        id: "", // This will never match, so it will always create
      },
      update: {},
      create: reward as any,
    });
  }

  // Actually, let's use a better approach - delete all and recreate
  await db.spinWheelReward.deleteMany({});
  
  for (const reward of rewards) {
    await db.spinWheelReward.create({
      data: reward as any,
    });
  }

  console.log(`✅ Created ${rewards.length} spinning wheel rewards`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedSpinWheelRewards()
    .then(() => {
      console.log("✅ Spinning wheel rewards seeded successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Error seeding spinning wheel rewards:", error);
      process.exit(1);
    });
}

