/**
 * Script to create a dummy user for testing the spinning wheel
 */
import { db } from "./index";

async function seedDummyUser() {
  console.log("🎯 Creating dummy user for spinning wheel testing...");

  try {
    // Check if dummy user already exists
    const existingUser = await db.user.findUnique({
      where: { email: "dummy@spinwheel.test" },
      include: { profile: true },
    });

    if (existingUser) {
      console.log("✅ Dummy user already exists:");
      console.log(`   Email: ${existingUser.email}`);
      console.log(`   User ID: ${existingUser.id}`);
      console.log(`   Profile ID: ${existingUser.profile?.id}`);
      console.log(`\n🎡 You can now spin the wheel with Profile ID: ${existingUser.profile?.id}`);
      return;
    }

    // Create dummy user
    const user = await db.user.create({
      data: {
        email: "dummy@spinwheel.test",
        emailVerified: true,
        username: "spinwheeltester",
        displayUsername: "Spin Wheel Tester",
        name: "Dummy Spin Tester",
        image: null,
        role: "USER",
        type: "VOTER",
        isActive: true,
      },
    });

    console.log(`✅ Created dummy user: ${user.email} (ID: ${user.id})`);

    // Create profile for the user
    const profile = await db.profile.create({
      data: {
        userId: user.id,
        address: "123 Test Street",
        city: "Test City",
        country: "Test Country",
        postalCode: "12345",
        bio: "This is a dummy user for testing the spinning wheel feature.",
        availableVotes: 0,
        lastFreeVoteAt: null, // Can spin immediately
      },
    });

    console.log(`✅ Created profile: ${profile.id}`);
    console.log("\n" + "=".repeat(60));
    console.log("🎉 DUMMY USER CREATED SUCCESSFULLY!");
    console.log("=".repeat(60));
    console.log(`\n📧 Email: ${user.email}`);
    console.log(`👤 User ID: ${user.id}`);
    console.log(`🎭 Profile ID: ${profile.id}`);
    console.log(`\n🎡 To test the spinning wheel:`);
    console.log(`   1. Use Profile ID: ${profile.id}`);
    console.log(`   2. Call: POST /api/v1/spin-wheel/spin`);
    console.log(`   3. Body: { "profileId": "${profile.id}" }`);
    console.log(`\n💡 Or use this curl command:`);
    console.log(`\ncurl -X POST http://localhost:8787/api/v1/spin-wheel/spin \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -d '{"profileId": "${profile.id}"}'`);
    console.log("\n" + "=".repeat(60) + "\n");

  } catch (error) {
    console.error("❌ Error creating dummy user:", error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDummyUser()
    .then(() => {
      console.log("✅ Script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Script failed:", error);
      process.exit(1);
    });
}

export { seedDummyUser };

