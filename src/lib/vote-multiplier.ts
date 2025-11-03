import { db } from "@/db";

/**
 * Get the active vote multiplier for the current time (global + user-specific)
 * @param profileId Optional profile ID to check for user-specific multipliers from spin wheel
 * @returns The multiplier value (defaults to 1 if no active period)
 */
export async function getActiveVoteMultiplier(profileId?: string): Promise<number> {
  const now = new Date();

  // First check for global multiplier period
  const globalMultiplier = await db.voteMultiplierPeriod.findFirst({
    where: {
      isActive: true,
      startTime: {
        lte: now,
      },
      endTime: {
        gte: now,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  let multiplier = globalMultiplier?.multiplierTimes || 1;

  // If profileId provided, check for user-specific multipliers from spin wheel
  if (profileId) {
    const userMultiplierPrize = await db.activeSpinPrize.findFirst({
      where: {
        profileId,
        prizeType: "VOTE_MULTIPLIER",
        isActive: true,
        isClaimed: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // User-specific multiplier (typically 2x) overrides or multiplies with global
    if (userMultiplierPrize) {
      // For spin wheel multipliers, they're typically 2x for X days
      // We'll use the higher of global or user multiplier
      const userMultiplier = 2; // Spin wheel vote multipliers are always 2x
      multiplier = Math.max(multiplier, userMultiplier);
    }
  }

  return multiplier;
}

/**
 * Get the active vote multiplier period details
 * @returns The active multiplier period or null if none exists
 */
export async function getActiveVoteMultiplierPeriod() {
  const now = new Date();

  const activeMultiplier = await db.voteMultiplierPeriod.findFirst({
    where: {
      isActive: true,
      startTime: {
        lte: now,
      },
      endTime: {
        gte: now,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return activeMultiplier;
}

/**
 * Calculate the total votes after applying multiplier
 * @param originalVoteCount The original number of votes
 * @param profileId Optional profile ID to check for user-specific multipliers
 * @returns The total votes after applying the active multiplier
 */
export async function calculateVotesWithMultiplier(
  originalVoteCount: number,
  profileId?: string,
): Promise<{
  originalVotes: number;
  multiplier: number;
  totalVotes: number;
  hasActiveMultiplier: boolean;
}> {
  const multiplier = await getActiveVoteMultiplier(profileId);
  const totalVotes = originalVoteCount * multiplier;

  return {
    originalVotes: originalVoteCount,
    multiplier,
    totalVotes,
    hasActiveMultiplier: multiplier > 1,
  };
}

/**
 * Check if user has an active vote multiplier token (one-time use 10x multiplier)
 * @param profileId Profile ID to check
 * @returns The multiplier token prize if available, null otherwise
 */
export async function getUserMultiplierToken(profileId: string) {
  const now = new Date();

  return await db.activeSpinPrize.findFirst({
    where: {
      profileId,
      prizeType: "VOTE_MULTIPLIER_TOKEN",
      isActive: true,
      isClaimed: false,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } },
      ],
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}
