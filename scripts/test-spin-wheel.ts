#!/usr/bin/env tsx
/**
 * Test script for Spin Wheel API endpoints
 * 
 * Usage: pnpm tsx scripts/test-spin-wheel.ts [profileId]
 */

import { db } from "../src/db/index.js";

async function testSpinWheel() {
  console.log("🎡 Testing Spin Wheel API...\n");

  try {
    // 1. Check if rewards are seeded
    console.log("1. Checking if rewards are seeded...");
    const rewards = await db.spinWheelReward.findMany({
      where: { isActive: true },
    });
    
    if (rewards.length === 0) {
      console.log("❌ No rewards found. Please run: pnpm db:seed");
      console.log("   Or seed manually: pnpm tsx src/db/seed-spin-wheel.ts");
      process.exit(1);
    }
    
    console.log(`✅ Found ${rewards.length} active rewards\n`);

    // 2. Check if there's at least one profile
    console.log("2. Checking for profiles...");
    const profile = await db.profile.findFirst({
      include: {
        user: {
          select: {
            email: true,
            username: true,
          },
        },
      },
    });

    if (!profile) {
      console.log("❌ No profiles found. Please run: pnpm db:seed");
      process.exit(1);
    }

    console.log(`✅ Found profile: ${profile.user.email || profile.user.username} (${profile.id})\n`);

    // 3. Test can-spin endpoint logic
    console.log("3. Checking spin availability...");
    const lastSpin = await db.spinWheelHistory.findFirst({
      where: { profileId: profile.id },
      orderBy: { spunAt: "desc" },
    });

    if (lastSpin) {
      const timeSinceLastSpin = Date.now() - lastSpin.spunAt.getTime();
      const SPIN_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
      const canSpin = timeSinceLastSpin >= SPIN_COOLDOWN_MS;
      
      if (canSpin) {
        console.log("✅ User can spin (last spin was more than 24 hours ago)");
      } else {
        const nextSpinAt = new Date(lastSpin.spunAt.getTime() + SPIN_COOLDOWN_MS);
        console.log(`⏳ User must wait until ${nextSpinAt.toISOString()}`);
      }
    } else {
      console.log("✅ User can spin (no previous spins)");
    }

    console.log("\n✅ All checks passed!");
    console.log("\n📝 To test the API endpoints:");
    console.log(`   GET  /api/v1/spin-wheel/rewards`);
    console.log(`   GET  /api/v1/spin-wheel/can-spin/${profile.id}`);
    console.log(`   POST /api/v1/spin-wheel/spin`);
    console.log(`   Body: { "profileId": "${profile.id}" }`);

  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }

  process.exit(0);
}

testSpinWheel().catch((err) => {
  console.error("❌ Test script failed");
  console.error(err);
  process.exit(1);
});

