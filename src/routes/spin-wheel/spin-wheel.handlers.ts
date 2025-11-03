import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "@/types/types";

import { db } from "@/db";
import { sendErrorResponse } from "@/helpers/send-error-response";
import { calculatePaginationMetadata } from "@/lib/queries/query.helper";

import type {
  CanSpinTodayRoute,
  ClaimPrizeRoute,
  GetActivePrizesRoute,
  GetAvailableRewardsRoute,
  GetSpinHistoryRoute,
  SpinWheelRoute,
  UseMultiplierTokenRoute,
} from "./spin-wheel.routes";

const SPIN_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Spin the wheel and get a reward
 */
export const spinWheel: AppRouteHandler<SpinWheelRoute> = async (c) => {
  const { profileId } = c.req.valid("json");

  // Check if profile exists - try as profileId first, then as userId
  let profile = await db.profile.findUnique({
    where: { id: profileId },
  });

  // If not found, try looking up by userId
  if (!profile) {
    const user = await db.user.findUnique({
      where: { id: profileId },
      include: { profile: true },
    });
    
    if (!user || !user.profile) {
      return sendErrorResponse(c, "notFound", "Profile not found");
    }
    
    profile = user.profile;
  }

  const actualProfileId = profile.id;

  // Check for free retry spin prizes
  const retrySpinPrize = await db.activeSpinPrize.findFirst({
    where: {
      profileId: actualProfileId,
      prizeType: "FREE_RETRY_SPIN",
      isActive: true,
      isClaimed: false,
    },
  });

  // If user has a retry spin, consume it and allow the spin
  if (retrySpinPrize) {
    // Mark the retry prize as claimed
    await db.activeSpinPrize.update({
      where: { id: retrySpinPrize.id },
      data: {
        isClaimed: true,
        claimedAt: new Date(),
        isActive: false,
      },
    });
  } else {
    // Check if user can spin (last spin was more than 24 hours ago)
    const lastSpin = await db.spinWheelHistory.findFirst({
      where: { profileId },
      orderBy: { spunAt: "desc" },
    });

    if (lastSpin) {
      const timeSinceLastSpin = Date.now() - lastSpin.spunAt.getTime();
      if (timeSinceLastSpin < SPIN_COOLDOWN_MS) {
        const nextSpinTime = new Date(lastSpin.spunAt.getTime() + SPIN_COOLDOWN_MS);
        return sendErrorResponse(
          c,
          "badRequest",
          `You can spin again at ${nextSpinTime.toISOString()}`,
        );
      }
    }
  }

  // Get all active rewards
  const rewards = await db.spinWheelReward.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  if (rewards.length === 0) {
    return sendErrorResponse(c, "badRequest", "No rewards available. Please seed the spin wheel rewards first.");
  }

  // Select a reward based on probability
  const selectedReward = selectRewardByProbability(rewards);
  
  if (!selectedReward) {
    return sendErrorResponse(c, "internalServerError", "Failed to select a reward. Please try again.");
  }

  // Create spin history entry
  const spinHistory = await db.spinWheelHistory.create({
    data: {
      profileId: actualProfileId,
      rewardId: selectedReward.id,
      rewardName: selectedReward.name,
      rewardType: selectedReward.rewardType,
    },
  });

  // Process the reward
  let prizeId: string | undefined;

  switch (selectedReward.rewardType) {
    case "BONUS_VOTES":
      // Add bonus votes to user's available votes
      await db.profile.update({
        where: { id: actualProfileId },
        data: {
          availableVotes: {
            increment: selectedReward.rewardValue || 100,
          },
        },
      });
      break;

    case "VOTE_MULTIPLIER":
      // Create an active prize for vote multiplier
      const days = selectedReward.rewardValue || 3;
      const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      const prize = await db.activeSpinPrize.create({
        data: {
          profileId: actualProfileId,
          prizeType: "VOTE_MULTIPLIER",
          prizeValue: days,
          expiresAt,
          isActive: true,
          isClaimed: true, // Auto-claimed for multipliers
          claimedAt: new Date(),
        },
      });
      prizeId = prize.id;
      break;

    case "VOTE_MULTIPLIER_TOKEN":
      // Create a prize for 10x vote multiplier token
      const tokenPrize = await db.activeSpinPrize.create({
        data: {
          profileId: actualProfileId,
          prizeType: "VOTE_MULTIPLIER_TOKEN",
          prizeValue: selectedReward.rewardValue || 10,
          isActive: true,
          isClaimed: false, // Needs to be used/claimed
        },
      });
      prizeId = tokenPrize.id;
      break;

    case "FREE_RETRY_SPIN":
      // Create a prize for free retry spin
      const retryPrize = await db.activeSpinPrize.create({
        data: {
          profileId: actualProfileId,
          prizeType: "FREE_RETRY_SPIN",
          prizeValue: 1,
          isActive: true,
          isClaimed: false,
        },
      });
      prizeId = retryPrize.id;
      break;

    case "MAGAZINE_FOLLOW_BACK":
      // Create an active prize with expiration (30 days)
      const followBackExpiry = new Date(Date.now() + (selectedReward.rewardValue || 30) * 24 * 60 * 60 * 1000);
      const followBackPrize = await db.activeSpinPrize.create({
        data: {
          profileId: actualProfileId,
          prizeType: "MAGAZINE_FOLLOW_BACK",
          prizeValue: selectedReward.rewardValue || 30,
          expiresAt: followBackExpiry,
          isActive: true,
          isClaimed: false,
        },
      });
      prizeId = followBackPrize.id;
      break;

    case "EXCLUSIVE_BADGE":
      // Create an active prize - badges are auto-claimed when won
      const badgePrize = await db.activeSpinPrize.create({
        data: {
          profileId: actualProfileId,
          prizeType: selectedReward.rewardType,
          prizeValue: selectedReward.rewardValue,
          isActive: true,
          isClaimed: true, // Auto-claim badges so they show immediately
          claimedAt: new Date(),
        },
      });
      prizeId = badgePrize.id;
      break;

    case "PERSONAL_MESSAGE":
    case "INSTAGRAM_FEATURE":
    case "DIGITAL_BOUDOIR_ACCESS":
    case "BTS_VIDEO_LINK":
    case "MEET_GREET_DISCOUNT":
      // Create an active prize that needs manual claiming
      const manualPrize = await db.activeSpinPrize.create({
        data: {
          profileId: actualProfileId,
          prizeType: selectedReward.rewardType,
          prizeValue: selectedReward.rewardValue,
          isActive: true,
          isClaimed: false,
        },
      });
      prizeId = manualPrize.id;
      break;

    default:
      // Log unknown reward type but don't fail the request
      console.error(`Unknown reward type: ${selectedReward.rewardType}`);
      // Still create a prize entry for tracking
      const unknownPrize = await db.activeSpinPrize.create({
        data: {
          profileId: actualProfileId,
          prizeType: selectedReward.rewardType as any,
          prizeValue: selectedReward.rewardValue,
          isActive: true,
          isClaimed: false,
        },
      });
      prizeId = unknownPrize.id;
      break;
  }

  return c.json(
    {
      reward: {
        id: selectedReward.id,
        name: selectedReward.name,
        description: selectedReward.description,
        icon: selectedReward.icon,
        probability: selectedReward.probability,
        popupMessage: selectedReward.popupMessage,
        rewardType: selectedReward.rewardType,
        rewardValue: selectedReward.rewardValue,
        isActive: selectedReward.isActive,
        sortOrder: selectedReward.sortOrder,
      },
      prizeId,
      message: selectedReward.popupMessage,
    },
    HttpStatusCodes.OK,
  );
};

/**
 * Get all available rewards
 */
export const getAvailableRewards: AppRouteHandler<GetAvailableRewardsRoute> = async (c) => {
  const rewards = await db.spinWheelReward.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  return c.json(
    {
      rewards: rewards.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        icon: r.icon,
        probability: r.probability,
        popupMessage: r.popupMessage,
        rewardType: r.rewardType,
        rewardValue: r.rewardValue,
        isActive: r.isActive,
        sortOrder: r.sortOrder,
      })),
    },
    HttpStatusCodes.OK,
  );
};

/**
 * Get user's spin history
 */
export const getSpinHistory: AppRouteHandler<GetSpinHistoryRoute> = async (c) => {
  const { profileId } = c.req.valid("param");
  const { page, limit } = c.req.valid("query");

  // Check if profile exists - try as profileId first, then as userId
  let profile = await db.profile.findUnique({
    where: { id: profileId },
  });

  // If not found, try looking up by userId
  if (!profile) {
    const user = await db.user.findUnique({
      where: { id: profileId },
      include: { profile: true },
    });
    
    if (!user || !user.profile) {
      return sendErrorResponse(c, "notFound", "Profile not found");
    }
    
    profile = user.profile;
  }

  const actualProfileId = profile.id;

  const [history, total] = await Promise.all([
    db.spinWheelHistory.findMany({
      where: { profileId: actualProfileId },
      orderBy: { spunAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.spinWheelHistory.count({
      where: { profileId: actualProfileId },
    }),
  ]);

  const pagination = calculatePaginationMetadata(total, page, limit);

  return c.json(
    {
      data: history.map((h) => ({
        id: h.id,
        rewardName: h.rewardName,
        rewardType: h.rewardType,
        spunAt: h.spunAt.toISOString(),
      })),
      pagination,
    },
    HttpStatusCodes.OK,
  );
};

/**
 * Get user's active prizes
 */
export const getActivePrizes: AppRouteHandler<GetActivePrizesRoute> = async (c) => {
  const { profileId } = c.req.valid("param");
  const { includeExpired } = c.req.valid("query");

  // Check if profile exists - try as profileId first, then as userId
  let profile = await db.profile.findUnique({
    where: { id: profileId },
  });

  // If not found, try looking up by userId
  if (!profile) {
    const user = await db.user.findUnique({
      where: { id: profileId },
      include: { profile: true },
    });
    
    if (!user || !user.profile) {
      return sendErrorResponse(c, "notFound", "Profile not found");
    }
    
    profile = user.profile;
  }

  const actualProfileId = profile.id;

  const now = new Date();
  const prizes = await db.activeSpinPrize.findMany({
    where: {
      profileId: actualProfileId,
      ...(includeExpired
        ? {}
        : {
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: now } },
            ],
          }),
    },
    orderBy: { createdAt: "desc" },
  });

  return c.json(
    {
      prizes: prizes.map((p) => ({
        id: p.id,
        prizeType: p.prizeType,
        prizeValue: p.prizeValue,
        isActive: p.isActive,
        isClaimed: p.isClaimed,
        claimedAt: p.claimedAt?.toISOString() || null,
        expiresAt: p.expiresAt?.toISOString() || null,
        createdAt: p.createdAt.toISOString(),
      })),
    },
    HttpStatusCodes.OK,
  );
};

/**
 * Claim a prize
 */
export const claimPrize: AppRouteHandler<ClaimPrizeRoute> = async (c) => {
  const { prizeId } = c.req.valid("json");

  const prize = await db.activeSpinPrize.findUnique({
    where: { id: prizeId },
  });

  if (!prize) {
    return sendErrorResponse(c, "notFound", "Prize not found");
  }

  if (prize.isClaimed && prize.prizeType !== "EXCLUSIVE_BADGE") {
    return sendErrorResponse(c, "badRequest", "Prize has already been claimed");
  }

  if (prize.expiresAt && prize.expiresAt < new Date()) {
    return sendErrorResponse(c, "badRequest", "Prize has expired");
  }

  // Special handling for badge prizes - mark as claimed and keep active
  if (prize.prizeType === "EXCLUSIVE_BADGE") {
    await db.activeSpinPrize.update({
      where: { id: prizeId },
      data: {
        isClaimed: true,
        claimedAt: new Date(),
        isActive: true, // Keep badge active
      },
    });
    
    return c.json(
      {
        success: true,
        message: "Badge activated! Your Swing VIP Voter badge is now displayed on your profile.",
      },
      HttpStatusCodes.OK,
    );
  }

  // Mark prize as claimed
  await db.activeSpinPrize.update({
    where: { id: prizeId },
    data: {
      isClaimed: true,
      claimedAt: new Date(),
    },
  });

  return c.json(
    {
      success: true,
      message: "Prize claimed successfully",
    },
    HttpStatusCodes.OK,
  );
};

/**
 * Check if user can spin today
 */
export const canSpinToday: AppRouteHandler<CanSpinTodayRoute> = async (c) => {
  const { profileId } = c.req.valid("param");

  // Check if profile exists - try as profileId first, then as userId
  let profile = await db.profile.findUnique({
    where: { id: profileId },
  });

  // If not found, try looking up by userId
  if (!profile) {
    const user = await db.user.findUnique({
      where: { id: profileId },
      include: { profile: true },
    });
    
    if (!user || !user.profile) {
      return sendErrorResponse(c, "notFound", "Profile not found");
    }
    
    profile = user.profile;
  }

  const actualProfileId = profile.id;

  // Check for free retry spin prizes
  const retrySpinPrize = await db.activeSpinPrize.findFirst({
    where: {
      profileId: actualProfileId,
      prizeType: "FREE_RETRY_SPIN",
      isActive: true,
      isClaimed: false,
    },
  });

  // If user has a retry spin, they can always spin
  if (retrySpinPrize) {
    return c.json(
      {
        canSpin: true,
        nextSpinAt: null,
        hasRetryPrize: true,
        retryPrizeId: retrySpinPrize.id,
      },
      HttpStatusCodes.OK,
    );
  }

  const lastSpin = await db.spinWheelHistory.findFirst({
    where: { profileId: actualProfileId },
    orderBy: { spunAt: "desc" },
  });

  if (!lastSpin) {
    return c.json(
      {
        canSpin: true,
        nextSpinAt: null,
        hasRetryPrize: false,
      },
      HttpStatusCodes.OK,
    );
  }

  const timeSinceLastSpin = Date.now() - lastSpin.spunAt.getTime();
  const canSpin = timeSinceLastSpin >= SPIN_COOLDOWN_MS;

  const nextSpinAt = canSpin
    ? null
    : new Date(lastSpin.spunAt.getTime() + SPIN_COOLDOWN_MS).toISOString();

  return c.json(
    {
      canSpin,
      nextSpinAt,
      hasRetryPrize: false,
    },
    HttpStatusCodes.OK,
  );
};

/**
 * Helper function to select a reward based on probability
 */
function selectRewardByProbability(
  rewards: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    probability: number;
    popupMessage: string;
    rewardType: string;
    rewardValue: number | null;
    isActive: boolean;
    sortOrder: number;
  }>,
) {
  if (rewards.length === 0) {
    throw new Error("No rewards available");
  }

  const totalProbability = rewards.reduce((sum, r) => sum + r.probability, 0);
  
  if (totalProbability <= 0) {
    // If total probability is 0, return first reward as fallback
    return rewards[0];
  }

  const random = Math.random() * totalProbability;

  let cumulativeProbability = 0;
  for (const reward of rewards) {
    cumulativeProbability += reward.probability;
    if (random <= cumulativeProbability) {
      return reward;
    }
  }

  // Fallback to last reward if something goes wrong
  return rewards[rewards.length - 1];
}

/**
 * Use a vote multiplier token (10x multiplier for one vote)
 */
export const useMultiplierToken: AppRouteHandler<UseMultiplierTokenRoute> = async (c) => {
  const { tokenId, profileId } = c.req.valid("json");

  // Check if profile exists
  let profile = await db.profile.findUnique({
    where: { id: profileId },
  });

  if (!profile) {
    const user = await db.user.findUnique({
      where: { id: profileId },
      include: { profile: true },
    });
    
    if (!user || !user.profile) {
      return sendErrorResponse(c, "notFound", "Profile not found");
    }
    
    profile = user.profile;
  }

  const actualProfileId = profile.id;

  // Check if token exists and is available
  const token = await db.activeSpinPrize.findUnique({
    where: { id: tokenId },
  });

  if (!token) {
    return sendErrorResponse(c, "notFound", "Token not found");
  }

  if (token.profileId !== actualProfileId) {
    return sendErrorResponse(c, "badRequest", "Token does not belong to this profile");
  }

  if (token.prizeType !== "VOTE_MULTIPLIER_TOKEN") {
    return sendErrorResponse(c, "badRequest", "Invalid token type");
  }

  if (token.isClaimed || !token.isActive) {
    return sendErrorResponse(c, "badRequest", "Token has already been used");
  }

  const now = new Date();
  if (token.expiresAt && token.expiresAt < now) {
    return sendErrorResponse(c, "badRequest", "Token has expired");
  }

  // Mark token as claimed (it will be used when casting the next vote)
  // We don't delete it yet - let the vote handler consume it
  await db.activeSpinPrize.update({
    where: { id: tokenId },
    data: {
      isClaimed: true,
      claimedAt: new Date(),
    },
  });

  return c.json(
    {
      success: true,
      message: "Multiplier token activated! Your next vote will be multiplied by 10x",
      multiplier: token.prizeValue || 10,
    },
    HttpStatusCodes.OK,
  );
}

