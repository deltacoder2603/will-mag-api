import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "@/types/types";

import { db } from "@/db";
import { Achievement_Category } from "@/generated/prisma";
import { sendErrorResponse } from "@/helpers/send-error-response";
import { calculatePaginationMetadata } from "@/lib/queries/query.helper";

import type { CreateAchievementRoute, GetAllAchievementsRoute, GetProfileAchievementsRoute, UnlockAchievementRoute } from "./achievement.routes";

/**
 * Get all achievements
 */
export const getAllAchievements: AppRouteHandler<GetAllAchievementsRoute> = async (c) => {
  const { page = 1, limit = 20 } = c.req.valid("query");

  const [achievements, total] = await Promise.all([
    db.achievement.findMany({
      orderBy: [{ tier: "asc" }, { requirement: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.achievement.count(),
  ]);

  const pagination = calculatePaginationMetadata(total, page, limit);

  return c.json({ data: achievements, pagination }, HttpStatusCodes.OK);
};

/**
 * Get achievements for a specific profile
 */
export const getProfileAchievements: AppRouteHandler<GetProfileAchievementsRoute> = async (c) => {
  const { profileId } = c.req.valid("param");
  const { page = 1, limit = 20, category } = c.req.valid("query");

  // Check if profile exists
  const profile = await db.profile.findUnique({
    where: { id: profileId },
    select: {
      id: true,
      _count: {
        select: {
          votesReceived: true,
        },
      },
    },
  });

  if (!profile) {
    return sendErrorResponse(c, "notFound", "Profile not found");
  }

  // Get all achievements with optional category filter
  const where = category
    ? { category: category as Achievement_Category }
    : {};

  const [achievements, total] = await Promise.all([
    db.achievement.findMany({
      where,
      orderBy: [{ tier: "asc" }, { requirement: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.achievement.count({ where }),
  ]);

  // Get unlocked achievements for this profile
  const profileAchievements = await db.profileAchievement.findMany({
    where: { profileId },
    select: {
      achievementId: true,
      unlockedAt: true,
      progress: true,
    },
  });

  const profileAchievementMap = new Map(
    profileAchievements.map(pa => [pa.achievementId, pa]),
  );

  const totalVotes = profile._count.votesReceived;

  // Format achievements with unlock status
  const formattedAchievements = achievements.map((achievement) => {
    const unlocked = profileAchievementMap.get(achievement.id);
    
    // Calculate progress if not unlocked
    let progress = 0;
    if (!unlocked && achievement.requirement) {
      if (achievement.category === Achievement_Category.VOTING) {
        progress = Math.min(100, Math.round((totalVotes / achievement.requirement) * 100));
      }
    }

    return {
      id: achievement.id,
      code: achievement.code,
      name: achievement.name,
      description: achievement.description,
      icon: achievement.icon,
      badgeImage: achievement.badgeImage,
      category: achievement.category,
      requirement: achievement.requirement,
      tier: achievement.tier,
      isUnlocked: !!unlocked,
      unlockedAt: unlocked?.unlockedAt.toISOString() || null,
      progress: unlocked?.progress || progress,
    };
  });

  const pagination = calculatePaginationMetadata(total, page, limit);

  return c.json({ data: formattedAchievements, pagination }, HttpStatusCodes.OK);
};

/**
 * Create a new achievement (Admin only)
 */
export const createAchievement: AppRouteHandler<CreateAchievementRoute> = async (c) => {
  const data = c.req.valid("json");

  // Check if achievement code already exists
  const existing = await db.achievement.findUnique({
    where: { code: data.code },
  });

  if (existing) {
    return sendErrorResponse(c, "badRequest", "Achievement code already exists");
  }

  const achievement = await db.achievement.create({
    data,
  });

  return c.json(achievement, HttpStatusCodes.CREATED);
};

/**
 * Unlock an achievement for a profile (Admin only)
 */
export const unlockAchievement: AppRouteHandler<UnlockAchievementRoute> = async (c) => {
  const { profileId, achievementId } = c.req.valid("param");
  const { progress = 100 } = c.req.valid("json");

  // Check if profile and achievement exist
  const [profile, achievement] = await Promise.all([
    db.profile.findUnique({ where: { id: profileId } }),
    db.achievement.findUnique({ where: { id: achievementId } }),
  ]);

  if (!profile) {
    return sendErrorResponse(c, "notFound", "Profile not found");
  }

  if (!achievement) {
    return sendErrorResponse(c, "notFound", "Achievement not found");
  }

  // Check if already unlocked
  const existing = await db.profileAchievement.findUnique({
    where: {
      profileId_achievementId: {
        profileId,
        achievementId,
      },
    },
  });

  if (existing) {
    return sendErrorResponse(c, "badRequest", "Achievement already unlocked");
  }

  // Unlock the achievement
  await db.profileAchievement.create({
    data: {
      profileId,
      achievementId,
      progress,
    },
  });

  return c.json(
    {
      message: "Achievement unlocked successfully",
      achievement: {
        id: achievement.id,
        code: achievement.code,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        badgeImage: achievement.badgeImage,
        category: achievement.category,
        requirement: achievement.requirement,
        tier: achievement.tier,
        isUnlocked: true,
        unlockedAt: new Date().toISOString(),
        progress,
      },
    },
    HttpStatusCodes.OK,
  );
};

