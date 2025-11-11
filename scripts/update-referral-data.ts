import { faker } from "@faker-js/faker";

import { db } from "../src/db";

const primaryEmail = "crew6437@gmail.com";
const primaryUsername = "crew6437";
const primaryName = "Crew 6437";
const primaryReferralCode = "CREW6437";

const referralFixtures = [
  {
    email: "crew6437+referral1@example.com",
    name: "Jordan Blake",
    city: "Los Angeles",
    country: "United States",
    joinedAt: new Date("2024-08-15T14:30:00Z"),
  },
  {
    email: "crew6437+referral2@example.com",
    name: "Avery Quinn",
    city: "Austin",
    country: "United States",
    joinedAt: new Date("2024-09-02T18:45:00Z"),
  },
  {
    email: "crew6437+referral3@example.com",
    name: "Morgan Lee",
    city: "Toronto",
    country: "Canada",
    joinedAt: new Date("2024-09-25T09:15:00Z"),
  },
  {
    email: "crew6437+referral4@example.com",
    name: "Dakota Rivers",
    city: "London",
    country: "United Kingdom",
    joinedAt: new Date("2024-10-10T12:00:00Z"),
  },
  {
    email: "crew6437+referral5@example.com",
    name: "Riley Morgan",
    city: "Sydney",
    country: "Australia",
    joinedAt: new Date("2024-10-28T20:20:00Z"),
  },
];

function normalizeUsernameBase(base: string) {
  const normalized = base.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (normalized.length > 0) {
    return normalized;
  }

  return `user${Date.now()}`;
}

async function ensureUniqueUsername(base: string, existingUserId?: string) {
  const normalizedBase = normalizeUsernameBase(base);
  let candidate = normalizedBase;
  let counter = 1;

  while (true) {
    const existing = await db.user.findUnique({
      where: { username: candidate },
      select: { id: true },
    });

    if (!existing || existing.id === existingUserId) {
      return candidate;
    }

    candidate = `${normalizedBase}${counter}`;
    counter += 1;
  }
}

async function ensureUniqueReferralCode(base: string, existingUserId?: string) {
  const normalizedBase = base.toUpperCase().replace(/[^A-Z0-9]/g, "");
  let candidate = normalizedBase || `REF${Date.now()}`;
  let counter = 1;

  while (true) {
    const existing = await db.user.findUnique({
      where: { referralCode: candidate },
      select: { id: true },
    });

    if (!existing || existing.id === existingUserId) {
      return candidate;
    }

    candidate = `${normalizedBase}${counter}`;
    counter += 1;
  }
}

async function ensureProfile(userId: string, city: string, country: string) {
  const profile = await db.profile.findUnique({ where: { userId } });
  if (profile) {
    return profile;
  }

  return db.profile.create({
    data: {
      userId,
      address: faker.location.streetAddress(),
      city,
      country,
      postalCode: faker.location.zipCode(),
      bio: faker.lorem.sentence(),
    },
  });
}

async function ensurePrimaryUser() {
  const existing = await db.user.findUnique({
    where: { email: primaryEmail },
    include: { profile: true },
  });

  if (!existing) {
    const username = await ensureUniqueUsername(primaryUsername);
    const referralCode = await ensureUniqueReferralCode(primaryReferralCode);
    const created = await db.user.create({
      data: {
        email: primaryEmail,
        emailVerified: true,
        username,
        displayUsername: primaryName,
        name: primaryName,
        referralCode,
        role: "USER",
        type: "MODEL",
        isActive: true,
      },
    });

    await ensureProfile(created.id, "New York", "United States");
    return created;
  }

  const updateData: Record<string, any> = {
    name: primaryName,
    displayUsername: primaryName,
    role: "USER",
    type: "MODEL",
    isActive: true,
    emailVerified: true,
  };

  if (!existing.username) {
    updateData.username = await ensureUniqueUsername(primaryUsername, existing.id);
  }

  if (!existing.referralCode) {
    updateData.referralCode = await ensureUniqueReferralCode(primaryReferralCode, existing.id);
  }

  const updated = await db.user.update({
    where: { id: existing.id },
    data: updateData,
  });

  await ensureProfile(updated.id, existing.profile?.city ?? "New York", existing.profile?.country ?? "United States");

  return updated;
}

async function ensureReferralUsers(primaryUserId: string) {
  for (const fixture of referralFixtures) {
    const referral = await db.user.findUnique({
      where: { email: fixture.email },
      include: { profile: true },
    });

    if (!referral) {
      const username = await ensureUniqueUsername(`${primaryUsername}-${fixture.name}`);
      const created = await db.user.create({
        data: {
          email: fixture.email,
          emailVerified: true,
          referredById: primaryUserId,
          username,
          displayUsername: fixture.name,
          name: fixture.name,
          type: "MODEL",
          role: "USER",
          isActive: true,
          createdAt: fixture.joinedAt,
        },
      });

      await ensureProfile(created.id, fixture.city, fixture.country);
      continue;
    }

    const updateData: Record<string, any> = {};

    if (!referral.referredById) {
      updateData.referredById = primaryUserId;
    }

    if (!referral.username) {
      updateData.username = await ensureUniqueUsername(`${primaryUsername}-${fixture.name}`, referral.id);
    }

    if (!referral.type || referral.type !== "MODEL") {
      updateData.type = "MODEL";
    }

    if (Object.keys(updateData).length > 0) {
      await db.user.update({
        where: { id: referral.id },
        data: updateData,
      });
    }

    await ensureProfile(referral.id, referral.profile?.city ?? fixture.city, referral.profile?.country ?? fixture.country);
  }
}

async function updateReferralCount(primaryUserId: string) {
  const referralCount = await db.user.count({
    where: { referredById: primaryUserId },
  });

  await db.user.update({
    where: { id: primaryUserId },
    data: { referralCount },
  });

  return referralCount;
}

async function main() {
  console.log("🔄 Seeding referral data for", primaryEmail);
  const primaryUser = await ensurePrimaryUser();
  await ensureReferralUsers(primaryUser.id);
  const referralCount = await updateReferralCount(primaryUser.id);

  console.log(`✅ Upserted primary user: ${primaryUser.email}`);
  console.log(`✅ Total referrals linked: ${referralCount}`);
  console.log("🎯 Referral data ready for dashboard.");
}

main()
  .catch((error) => {
    console.error("Failed to seed referral data:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });


