#!/usr/bin/env node
/**
 * Milestone Monitor Scheduler
 *
 * Runs milestone checks periodically and automatically sends emails
 * when users/models reach milestones
 *
 * Usage: node email/monitors/scheduler.js
 */

import { runAllChecks } from "./milestoneMonitor.js";

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║      🎯 MILESTONE MONITOR STARTING                           ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`);

/**
 * Configuration
 */
const CONFIG = {
  // How often to check for milestones (in milliseconds)
  CHECK_INTERVAL: process.env.MILESTONE_CHECK_INTERVAL || 5 * 60 * 1000, // Default: 5 minutes

  // Run immediately on start
  RUN_ON_START: true,
};

console.log("⚙️  Configuration:");
console.log(`  Check Interval: Every ${CONFIG.CHECK_INTERVAL / 1000 / 60} minutes`);
console.log(`  Run on Start: ${CONFIG.RUN_ON_START}`);
console.log("");

/**
 * Start the monitoring scheduler
 */
async function startMonitoring() {
  try {
    console.log("🚀 Milestone monitor started!\n");
    console.log("📊 Monitoring for:");
    console.log("  • Vote count milestones (100, 250, 500, 1000, 2500, 5000, 10000)");
    console.log("  • Rank changes (real-time leaderboard updates)");
    console.log("  • Referral milestones (5, 10, 20, 50, 100 referrals)");
    console.log("  • Reward eligibility (top voters, achievements)");
    console.log("");
    console.log("📧 Emails will be sent automatically when milestones are reached!");
    console.log("");
    console.log("Press Ctrl+C to stop...\n");

    // Run immediately if configured
    if (CONFIG.RUN_ON_START) {
      await runAllChecks();
    }

    // Schedule periodic checks
    const intervalId = setInterval(async () => {
      try {
        await runAllChecks();
      } catch (error) {
        console.error("❌ Error during milestone check:", error);
      }
    }, CONFIG.CHECK_INTERVAL);

    // Graceful shutdown
    process.on("SIGTERM", async () => {
      console.log("\n🛑 Shutting down milestone monitor...");
      clearInterval(intervalId);
      process.exit(0);
    });

    process.on("SIGINT", async () => {
      console.log("\n🛑 Shutting down milestone monitor...");
      clearInterval(intervalId);
      process.exit(0);
    });
  } catch (error) {
    console.error("❌ Failed to start monitoring:", error);
    process.exit(1);
  }
}

// Start monitoring
startMonitoring();
