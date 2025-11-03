/* eslint-disable no-console */
import { faker } from "@faker-js/faker";

import { db } from "./index";
import { seedSpinWheelRewards } from "./seed-spin-wheel";

async function runSeed() {
  console.log("⏳ Running seed...");
  const start = Date.now();

  try {
    // Create more users with faker data
    const users = [];
    for (let i = 0; i < 10; i++) { // Increased from 10 to 25
      const user = await db.user.create({
        data: {
          email: faker.internet.email(),
          emailVerified: true,
          username: faker.internet.username(),
          displayUsername: faker.person.fullName(),
          role: i === 0 ? "ADMIN" : i === 1 ? "MODERATOR" : "USER", // First user is admin, second is moderator
          name: faker.person.fullName(),
          image: faker.image.avatar(),
        },
      });
      users.push(user);
    }

    // Create profiles for each user
    const profiles = [];
    for (const user of users) {
      const profile = await db.profile.create({
        data: {
          userId: user.id,
          bio: faker.lorem.paragraph(),
          phone: faker.string.numeric(10),
          address: faker.location.streetAddress(),
          city: faker.location.city(),
          country: faker.location.country(),
          postalCode: faker.location.zipCode(),
          dateOfBirth: faker.date.birthdate({ min: 18, max: 65, mode: "age" }),
          gender: faker.helpers.arrayElement(["Male", "Female", "Non-binary"]),
          hobbiesAndPassions: faker.lorem.sentence(),
          paidVoterMessage: faker.lorem.sentence(),
          freeVoterMessage: faker.lorem.sentence(),
          instagram: `@${faker.internet.username()}`,
          tiktok: `@${faker.internet.username()}`,
          youtube: `youtube.com/c/${faker.internet.username()}`,
          facebook: faker.internet.username(),
          twitter: `@${faker.internet.username()}`,
        },
      });
      profiles.push(profile);
    }

    // Create more contests
    const contests = [];
    for (let i = 0; i < 5; i++) { // Increased from 5 to 15
      const contest = await db.contest.create({
        data: {
          name: faker.company.catchPhrase(),
          description: faker.lorem.paragraph(),
          prizePool: faker.number.float({ min: 1000, max: 10000, fractionDigits: 2 }),
          startDate: faker.date.future(),
          endDate: faker.date.future({ years: 1 }),
          slug: faker.string.uuid(),
        },
      });
      contests.push(contest);
    }

    // Create awards for each contest
    const awards = [];
    const awardNames = ["Best Photography", "Most Creative", "People's Choice", "Technical Excellence", "Innovation Award"];
    const awardIcons = ["📸", "🎨", "👥", "⚙️", "💡"];

    for (const contest of contests) {
      // Create 2-4 awards per contest
      const numAwards = faker.number.int({ min: 2, max: 4 });
      const shuffledNames = faker.helpers.shuffle([...awardNames]);
      const shuffledIcons = faker.helpers.shuffle([...awardIcons]);

      for (let i = 0; i < numAwards; i++) {
        const award = await db.award.create({
          data: {
            name: shuffledNames[i],
            icon: shuffledIcons[i],
            contestId: contest.id,
          },
        });
        awards.push(award);
      }
    }

    // Create contest participations
    for (const contest of contests) {
      for (const profile of profiles) {
        if (faker.datatype.boolean()) { // 50% chance to participate
          await db.contestParticipation.create({
            data: {
              profileId: profile.id,
              contestId: contest.id,
              isApproved: faker.datatype.boolean(),
              isParticipating: faker.datatype.boolean(),
            },
          });
        }
      }
    }

    // Create more votes
    for (let i = 0; i < 20; i++) {
      const voter = faker.helpers.arrayElement(profiles);
      const votee = faker.helpers.arrayElement(profiles.filter(p => p.id !== voter.id));
      const contest = faker.helpers.arrayElement(contests);

      await db.vote.create({
        data: {
          voterId: voter.id,
          voteeId: votee.id,
          contestId: contest.id,
          type: faker.helpers.arrayElement(["FREE", "PAID"]),
        },
      });
    }

    // Create some media files
    for (const profile of profiles) {
      for (let i = 0; i < faker.number.int({ min: 1, max: 5 }); i++) {
        await db.media.create({
          data: {
            key: faker.string.alphanumeric(10),
            name: faker.system.fileName(),
            url: faker.image.url(),
            size: faker.number.int({ min: 1000, max: 10000000 }),
            type: faker.helpers.arrayElement(["image/jpeg", "image/png", "image/webp"]),
            status: faker.helpers.arrayElement(["PROCESSING", "COMPLETED", "FAILED"]),
            profileId: profile.id,
          },
        });
      }
    }

    // Seed spin wheel rewards
    await seedSpinWheelRewards();

    const end = Date.now();
    console.log(`✅ Seed completed in ${end - start}ms`);
    console.log(`📊 Created:`);
    console.log(`   - ${users.length} users`);
    console.log(`   - ${profiles.length} profiles`);
    console.log(`   - ${contests.length} contests`);
    console.log(`   - ${awards.length} awards`);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    throw error;
  }

  process.exit(0);
}

runSeed().catch((err) => {
  console.error("❌ Seed failed");
  console.error(err);
  process.exit(1);
});
