import { seedMilestones, seedAchievements } from "../src/db/seed-milestones";
import { db } from "../src/db/index";

async function main() {
  console.log("🌱 Seeding milestones and achievements...\n");
  
  try {
    await seedMilestones();
    await seedAchievements();
    
    console.log("\n✅ Seeding completed successfully!");
  } catch (error) {
    console.error("\n❌ Seeding failed:", error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

