import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "@/types/types";

import { db } from "@/db";
import { Unlock_Content_Type } from "@/generated/prisma";
import { sendErrorResponse } from "@/helpers/send-error-response";
import { calculatePaginationMetadata } from "@/lib/queries/query.helper";

import type { CheckUnlockEligibilityRoute, CreateUnlockRoute, GetProfileUnlocksRoute, GetUnlockProgressRoute } from "./unlock.routes";

const UNLOCK_TIERS = [
  { voteThreshold: 100, type: Unlock_Content_Type.EXCLUSIVE_PHOTO, title: "Exclusive Photo" },
  { voteThreshold: 200, type: Unlock_Content_Type.VIDEO_MESSAGE, title: "Video Message" },
  { voteThreshold: 200, type: Unlock_Content_Type.AUDIO_MESSAGE, title: "Audio Message" },
  { voteThreshold: 500, type: Unlock_Content_Type.PRIVATE_CALL, title: "Private Call" },
  { voteThreshold: 1000, type: Unlock_Content_Type.SIGNED_MERCH, title: "Signed Merch" },
  { voteThreshold: 1000, type: Unlock_Content_Type.MAGAZINE_FEATURE, title: "Magazine Feature" },
];

/**
 * Get unlock progress for a profile
 */
export const getUnlockProgress: AppRouteHandler<GetUnlockProgressRoute> = async (c) => {
  const { profileId } = c.req.valid("param");

  // Check if profile exists and get vote count
  const profile = await db.profile.findUnique({
    where: { id: profileId },
    include: {
      _count: {
        select: {
          votesReceived: true,
        },
      },
      unlockedContent: {
        select: {
          contentType: true,
          voteThreshold: true,
          unlockedAt: true,
          contentUrl: true,
        },
      },
    },
  });

  if (!profile) {
    return sendErrorResponse(c, "notFound", "Profile not found");
  }

  const totalVotes = profile._count.votesReceived;

  // Create a set of unlocked content for quick lookup
  const unlockedSet = new Set(
    profile.unlockedContent.map(u => `${u.contentType}-${u.voteThreshold}`),
  );

  // Map all unlock tiers to show progress
  const unlocks = UNLOCK_TIERS.map((tier) => {
    const key = `${tier.type}-${tier.voteThreshold}`;
    const unlocked = profile.unlockedContent.find(
      u => u.contentType === tier.type && u.voteThreshold === tier.voteThreshold,
    );
    const isUnlocked = totalVotes >= tier.voteThreshold || unlockedSet.has(key);
    const progress = Math.min(100, Math.round((totalVotes / tier.voteThreshold) * 100));

    return {
      type: tier.type,
      title: tier.title,
      description: `Unlock at ${tier.voteThreshold} votes`,
      voteThreshold: tier.voteThreshold,
      isUnlocked,
      progress,
      unlockedAt: unlocked?.unlockedAt.toISOString() || null,
      contentUrl: isUnlocked ? unlocked?.contentUrl || null : null,
    };
  });

  return c.json(
    {
      totalVotes,
      unlocks,
    },
    HttpStatusCodes.OK,
  );
};

/**
 * Get all unlocked content for a profile
 */
export const getProfileUnlocks: AppRouteHandler<GetProfileUnlocksRoute> = async (c) => {
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

  // Get unlocked content with pagination
  const [unlocks, total] = await Promise.all([
    db.unlockedContent.findMany({
      where: {
        profileId,
        isActive: true,
      },
      orderBy: { unlockedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.unlockedContent.count({
      where: {
        profileId,
        isActive: true,
      },
    }),
  ]);

  const formattedUnlocks = unlocks.map(unlock => ({
    id: unlock.id,
    contentType: unlock.contentType,
    title: unlock.title,
    description: unlock.description,
    contentUrl: unlock.contentUrl,
    voteThreshold: unlock.voteThreshold,
    unlockedAt: unlock.unlockedAt.toISOString(),
    isActive: unlock.isActive,
  }));

  const pagination = calculatePaginationMetadata(total, page, limit);

  return c.json({ data: formattedUnlocks, pagination }, HttpStatusCodes.OK);
};

/**
 * Create unlocked content (Admin only)
 */
export const createUnlock: AppRouteHandler<CreateUnlockRoute> = async (c) => {
  const data = c.req.valid("json");

  // Check if profile exists
  const profile = await db.profile.findUnique({
    where: { id: data.profileId },
  });

  if (!profile) {
    return sendErrorResponse(c, "notFound", "Profile not found");
  }

  // Check if content already unlocked
  const existing = await db.unlockedContent.findUnique({
    where: {
      profileId_contentType_voteThreshold: {
        profileId: data.profileId,
        contentType: data.contentType,
        voteThreshold: data.voteThreshold,
      },
    },
  });

  if (existing) {
    return sendErrorResponse(c, "badRequest", "Content already unlocked");
  }

  // Create unlocked content
  const unlock = await db.unlockedContent.create({
    data,
  });

  return c.json(
    {
      id: unlock.id,
      contentType: unlock.contentType,
      title: unlock.title,
      description: unlock.description,
      contentUrl: unlock.contentUrl,
      voteThreshold: unlock.voteThreshold,
      unlockedAt: unlock.unlockedAt.toISOString(),
      isActive: unlock.isActive,
    },
    HttpStatusCodes.CREATED,
  );
};

/**
 * Check unlock eligibility and auto-unlock if eligible
 */
export const checkUnlockEligibility: AppRouteHandler<CheckUnlockEligibilityRoute> = async (c) => {
  const { profileId, voteThreshold } = c.req.valid("param");
  const { contentType, title, description, contentUrl } = c.req.valid("json");

  // Check if profile exists and get vote count
  const profile = await db.profile.findUnique({
    where: { id: profileId },
    include: {
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

  const currentVotes = profile._count.votesReceived;
  const eligible = currentVotes >= voteThreshold;
  const votesNeeded = Math.max(0, voteThreshold - currentVotes);

  let unlockedContent = null;
  let unlocked = false;

  if (eligible) {
    // Check if already unlocked
    const existing = await db.unlockedContent.findUnique({
      where: {
        profileId_contentType_voteThreshold: {
          profileId,
          contentType: contentType as Unlock_Content_Type,
          voteThreshold,
        },
      },
    });

    if (existing) {
      unlocked = true;
      unlockedContent = {
        id: existing.id,
        contentType: existing.contentType,
        title: existing.title,
        description: existing.description,
        contentUrl: existing.contentUrl,
        voteThreshold: existing.voteThreshold,
        unlockedAt: existing.unlockedAt.toISOString(),
        isActive: existing.isActive,
      };
    } else {
      // Auto-unlock
      const newUnlock = await db.unlockedContent.create({
        data: {
          profileId,
          contentType: contentType as Unlock_Content_Type,
          title,
          description,
          contentUrl,
          voteThreshold,
        },
      });

      unlocked = true;
      unlockedContent = {
        id: newUnlock.id,
        contentType: newUnlock.contentType,
        title: newUnlock.title,
        description: newUnlock.description,
        contentUrl: newUnlock.contentUrl,
        voteThreshold: newUnlock.voteThreshold,
        unlockedAt: newUnlock.unlockedAt.toISOString(),
        isActive: newUnlock.isActive,
      };
    }
  }

  return c.json(
    {
      eligible,
      unlocked,
      currentVotes,
      votesNeeded,
      content: unlockedContent,
    },
    HttpStatusCodes.OK,
  );
};

