import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "@/types/types";

import { db } from "@/db";
import { Milestone_Type } from "@/generated/prisma";
import { sendErrorResponse } from "@/helpers/send-error-response";
import { calculatePaginationMetadata } from "@/lib/queries/query.helper";
import { VOTE_MILESTONE_CONFIGS, getMilestoneConfig } from "@/config/gamification.config";

import type { GetMilestoneProgressRoute, GetProfileMilestonesRoute } from "./milestone.routes";

/**
 * Get all milestones for a profile
 */
export const getProfileMilestones: AppRouteHandler<GetProfileMilestonesRoute> = async (c) => {
  const { profileId } = c.req.valid("param");
  const { page = 1, limit = 20 } = c.req.valid("query");

  // Check if profile exists
  const profile = await db.profile.findUnique({
    where: { id: profileId },
    select: { id: true },
  });

  if (!profile) {
    return sendErrorResponse(c, "notFound", "Profile not found");
  }

  // Get milestones with pagination
  const [milestones, total] = await Promise.all([
    db.milestone.findMany({
      where: { profileId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.milestone.count({
      where: { profileId },
    }),
  ]);

  const formattedMilestones = milestones.map(milestone => ({
    id: milestone.id,
    type: milestone.type,
    threshold: milestone.threshold,
    currentValue: milestone.currentValue,
    unlockedAt: milestone.createdAt.toISOString(),
    isNotified: milestone.isNotified,
  }));

  const pagination = calculatePaginationMetadata(total, page, limit);

  return c.json({ data: formattedMilestones, pagination }, HttpStatusCodes.OK);
};

/**
 * Get milestone progress for a profile
 */
export const getMilestoneProgress: AppRouteHandler<GetMilestoneProgressRoute> = async (c) => {
  const { profileId } = c.req.valid("param");

  // Check if profile exists
  const profile = await db.profile.findUnique({
    where: { id: profileId },
    include: {
      milestones: {
        where: {
          type: Milestone_Type.VOTE_COUNT,
        },
      },
    },
  });

  if (!profile) {
    return sendErrorResponse(c, "notFound", "Profile not found");
  }

  // Get total votes by summing the count field from database
  const voteAggregate = await db.vote.aggregate({
    where: {
      voteeId: profileId,
    },
    _sum: {
      count: true,
    },
  });

  const totalVotes = voteAggregate._sum.count || 0;

  // Map all milestones from config to show progress
  const milestones = VOTE_MILESTONE_CONFIGS.map((config) => {
    const unlockedMilestone = profile.milestones.find(m => m.threshold === config.threshold);
    const isUnlocked = totalVotes >= config.threshold;
    const progress = Math.min(100, Math.round((totalVotes / config.threshold) * 100));

    return {
      threshold: config.threshold,
      name: config.name,
      description: config.description,
      icon: config.icon,
      reward: config.reward,
      isUnlocked,
      progress,
      unlockedAt: unlockedMilestone?.createdAt.toISOString() || null,
    };
  });

  // Find next milestone from config
  const nextMilestoneConfig = VOTE_MILESTONE_CONFIGS.find(config => config.threshold > totalVotes);
  const nextMilestoneData = nextMilestoneConfig
    ? {
      threshold: nextMilestoneConfig.threshold,
      name: nextMilestoneConfig.name,
      votesNeeded: nextMilestoneConfig.threshold - totalVotes,
      progress: Math.round((totalVotes / nextMilestoneConfig.threshold) * 100),
    }
    : null;

  return c.json(
    {
      totalVotes,
      milestones,
      nextMilestone: nextMilestoneData,
    },
    HttpStatusCodes.OK,
  );
};

