import { z } from "zod";

import { Achievement_Category, Achievement_Tier } from "@/generated/prisma";

export const AchievementSelectSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  description: z.string(),
  icon: z.string(),
  badgeImage: z.string().nullable(),
  category: z.nativeEnum(Achievement_Category),
  requirement: z.number().nullable(),
  tier: z.nativeEnum(Achievement_Tier),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const AchievementInsertSchema = z.object({
  code: z.string().min(1).max(100),
  name: z.string().min(1).max(255),
  description: z.string(),
  icon: z.string(),
  badgeImage: z.string().url().optional(),
  category: z.nativeEnum(Achievement_Category),
  requirement: z.number().positive().optional(),
  tier: z.nativeEnum(Achievement_Tier).default(Achievement_Tier.BRONZE),
});

export const ProfileAchievementSelectSchema = z.object({
  id: z.string(),
  profileId: z.string(),
  achievementId: z.string(),
  unlockedAt: z.date(),
  progress: z.number(),
});

export const AchievementResponseSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  description: z.string(),
  icon: z.string(),
  badgeImage: z.string().nullable(),
  category: z.string(),
  requirement: z.number().nullable(),
  tier: z.string(),
  isUnlocked: z.boolean(),
  unlockedAt: z.string().nullable(),
  progress: z.number(),
});

