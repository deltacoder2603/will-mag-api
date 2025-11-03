import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "@/types/types";

import { db } from "@/db";
import { sendErrorResponse } from "@/helpers/send-error-response";

import type {
  GetAvailableContestsRoute,
  GetContestParticipantsRoute,
  GetVoterProgressRoute,
  GetVoterStatsRoute,
  SpinWheelRoute,
} from "./voter.routes";

// NOTE: Milestones and Achievements are now stored in the database
// and queried dynamically. See MilestoneConfig and Achievement tables.

/**
 * Get Voter Statistics
 */
export const getVoterStats: AppRouteHandler<GetVoterStatsRoute> = async (c) => {
  const { userId } = c.req.valid("param");

  // Get user
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
    },
  });

  if (!user || !user.profile) {
    return sendErrorResponse(c, "notFound", "User or profile not found");
  }

  const profileId = user.profile.id;

  // Get total votes cast by user (using profileId)
  const voteStats = await db.vote.aggregate({
    where: { voterId: profileId },
    _sum: { count: true },
    _count: true,
  });

  const totalVotes = voteStats._sum.count || 0;

  // Get free vs paid votes
  const [freeVotesResult, paidVotesResult] = await Promise.all([
    db.vote.aggregate({
      where: { voterId: profileId, type: "FREE" },
      _sum: { count: true },
    }),
    db.vote.aggregate({
      where: { voterId: profileId, type: "PAID" },
      _sum: { count: true },
    }),
  ]);

  const freeVotes = freeVotesResult._sum.count || 0;
  const paidVotes = paidVotesResult._sum.count || 0;

  // Get contests voted in
  const contestsVotedIn = await db.vote.groupBy({
    by: ["contestId"],
    where: { voterId: profileId },
    _count: true,
  });

  // Get favorite models (top 5)
  const favoriteModelsData = await db.vote.groupBy({
    by: ["voteeId"],
    where: { voterId: profileId },
    _sum: { count: true },
    orderBy: { _sum: { count: "desc" } },
    take: 5,
  });

  const favoriteModels = await Promise.all(
    favoriteModelsData.map(async (fav) => {
      const profile = await db.profile.findUnique({
        where: { id: fav.voteeId },
        include: {
          user: { select: { name: true, username: true } },
          coverImage: { select: { url: true } },
        },
      });

      return {
        profileId: fav.voteeId,
        modelName: profile?.user?.name || "Unknown",
        voteCount: fav._sum.count || 0,
        avatarUrl: profile?.coverImage?.url || null,
      };
    }),
  );

  // Get milestone configurations from database
  const allMilestoneConfigs = await db.milestoneConfig.findMany({
    where: { isActive: true, type: "VOTE_COUNT" },
    orderBy: { threshold: "asc" },
  });

  // Calculate current milestone (highest threshold user has passed)
  const currentMilestone = allMilestoneConfigs
    .filter(m => totalVotes >= m.threshold)
    .pop();
  
  // Find next milestone (lowest threshold user hasn't reached yet)
  const nextMilestone = allMilestoneConfigs
    .find(m => totalVotes < m.threshold);

  // Get achievements from database
  const allAchievements = await db.achievement.findMany({
    orderBy: { tier: "asc" },
  });

  const profileAchievements = await db.profileAchievement.findMany({
    where: { profileId },
    include: {
      achievement: true,
    },
  });

  const achievements = allAchievements.map((achievement) => {
    const unlocked = profileAchievements.find(pa => pa.achievementId === achievement.id);
    return {
      id: achievement.id,
      name: achievement.name,
      description: achievement.description,
      icon: achievement.icon,
      isUnlocked: !!unlocked,
      unlockedAt: unlocked?.unlockedAt.toISOString() || null,
    };
  });

  // Get unlocked rewards/content from database
  const unlockedContentData = await db.unlockedContent.findMany({
    where: {
      isActive: true,
    },
    orderBy: { voteThreshold: "asc" },
  });

  const unlockedRewards = unlockedContentData.map((content) => {
    let type: "PHOTO" | "VIDEO" | "AUDIO" | "CALL" | "MERCH" = "PHOTO";
    
    if (content.contentType === "EXCLUSIVE_PHOTO") type = "PHOTO";
    else if (content.contentType === "VIDEO_MESSAGE") type = "VIDEO";
    else if (content.contentType === "AUDIO_MESSAGE") type = "AUDIO";
    else if (content.contentType === "PRIVATE_CALL") type = "CALL";
    else if (content.contentType === "SIGNED_MERCH" || content.contentType === "MAGAZINE_FEATURE") type = "MERCH";

    return {
      id: content.id,
      name: content.title,
      description: content.description || "",
      type,
      unlockedAt: content.unlockedAt.toISOString(),
      accessUrl: content.contentUrl,
      accessCode: null,
    };
  });

  // Spin wheel data (simplified)
  const spinsAvailable = Math.floor(totalVotes / 50); // 1 spin per 50 votes
  const totalSpins = await db.spinWheelHistory.count({
    where: { profileId },
  });

  // Get active badges from spin wheel prizes
  const activeBadges = await db.activeSpinPrize.findMany({
    where: {
      profileId,
      prizeType: "EXCLUSIVE_BADGE",
      isActive: true,
      isClaimed: true, // Only show claimed badges
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const lastSpin = await db.spinWheelHistory.findFirst({
    where: { profileId },
    orderBy: { spunAt: "desc" },
    select: { spunAt: true },
  });

  return c.json(
    {
      totalVotes,
      freeVotes,
      paidVotes,
      contestsVotedIn: contestsVotedIn.length,
      favoriteModels,
      currentMilestone: currentMilestone
        ? {
            level: currentMilestone.sortOrder,
            name: currentMilestone.name,
            votesRequired: currentMilestone.threshold,
            isUnlocked: true,
          }
        : null,
      nextMilestone: nextMilestone
        ? {
            level: nextMilestone.sortOrder,
            name: nextMilestone.name,
            votesRequired: nextMilestone.threshold,
            votesRemaining: nextMilestone.threshold - totalVotes,
            progress: (totalVotes / nextMilestone.threshold) * 100,
          }
        : null,
      achievements,
      unlockedRewards,
      activeBadges: activeBadges.map(badge => ({
        id: badge.id,
        type: badge.prizeType,
        createdAt: badge.createdAt.toISOString(),
      })),
      spinWheelData: {
        availableSpins: spinsAvailable,
        lastSpinAt: lastSpin?.spunAt.toISOString() || null,
        totalSpins,
      },
    },
    HttpStatusCodes.OK,
  );
};

/**
 * Get Available Contests
 */
export const getAvailableContests: AppRouteHandler<GetAvailableContestsRoute> = async (c) => {
  const { userId } = c.req.valid("param");

  // Get user profile
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { profile: { select: { id: true } } },
  });

  const profileId = user?.profile?.id;

  // Get active contests
  const contests = await db.contest.findMany({
    where: {
      status: { in: ["ACTIVE", "VOTING", "PUBLISHED"] },
    },
    include: {
      images: {
        where: { status: "COMPLETED" },
        select: {
          url: true,
          caption: true,
        },
        take: 1,
      },
      contestParticipations: {
        select: { id: true },
      },
      votes: {
        select: {
          count: true,
          voterId: true,
        },
      },
    },
    orderBy: { startDate: "desc" },
  });

  const contestsData = contests.map((contest) => {
    const totalVotes = contest.votes.reduce((sum, vote) => sum + vote.count, 0);
    const userVotes = profileId
      ? contest.votes
          .filter(v => v.voterId === profileId)
          .reduce((sum, vote) => sum + vote.count, 0)
      : 0;

    return {
      id: contest.id,
      name: contest.name,
      slug: contest.slug,
      prizePool: contest.prizePool,
      startDate: contest.startDate?.toISOString() || null,
      endDate: contest.endDate?.toISOString() || null,
      status: contest.status,
      images: contest.images,
      participantCount: contest.contestParticipations.length,
      totalVotes,
      userVoteCount: userVotes,
    };
  });

  return c.json({ contests: contestsData }, HttpStatusCodes.OK);
};

/**
 * Get Contest Participants
 */
export const getContestParticipants: AppRouteHandler<GetContestParticipantsRoute> = async (c) => {
  const { contestId } = c.req.valid("param");
  const { userId, sortBy } = c.req.valid("query");

  // Get user's profileId if userId provided
  let profileId: string | undefined;
  if (userId) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { profile: { select: { id: true } } },
    });
    profileId = user?.profile?.id;
  }

  // Get contest
  const contest = await db.contest.findUnique({
    where: { id: contestId },
  });

  if (!contest) {
    return sendErrorResponse(c, "notFound", "Contest not found");
  }

  // Get participants with vote counts
  const participants = await db.contestParticipation.findMany({
    where: {
      contestId,
      isApproved: true,
    },
    include: {
      profile: {
        include: {
          user: { select: { name: true, username: true } },
          coverImage: { select: { url: true } },
        },
      },
      coverImage: {
        select: { url: true },
      },
    },
  });

  // Get vote counts for each participant
  const participantsWithVotes = await Promise.all(
    participants.map(async (participant, index) => {
      const voteCount = await db.vote.aggregate({
        where: {
          contestId,
          voteeId: participant.profileId,
        },
        _sum: { count: true },
      });

      const userVoteCount = profileId
        ? await db.vote.aggregate({
            where: {
              contestId,
              voteeId: participant.profileId,
              voterId: profileId,
            },
            _sum: { count: true },
          })
        : { _sum: { count: 0 } };

      return {
        profileId: participant.profileId,
        contestParticipationId: participant.id,
        modelName: participant.profile.user?.name || "Unknown",
        username: participant.profile.user?.username || null,
        bio: participant.profile.bio || null,
        avatarUrl: participant.profile.coverImage?.url || null,
        coverImageUrl: participant.coverImage?.url || null,
        totalVotes: voteCount._sum.count || 0,
        rank: index + 1, // Will be recalculated after sorting
        userVoteCount: userVoteCount._sum.count || 0,
        joinedAt: participant.createdAt.toISOString(),
      };
    }),
  );

  // Sort participants
  let sorted = participantsWithVotes;
  if (sortBy === "votes") {
    sorted = participantsWithVotes.sort((a, b) => b.totalVotes - a.totalVotes);
  } else if (sortBy === "recent") {
    sorted = participantsWithVotes.sort((a, b) => 
      new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime()
    );
  } else if (sortBy === "name") {
    sorted = participantsWithVotes.sort((a, b) => a.modelName.localeCompare(b.modelName));
  }

  // Update ranks
  sorted.forEach((participant, index) => {
    participant.rank = index + 1;
  });

  return c.json({ participants: sorted }, HttpStatusCodes.OK);
};

/**
 * Spin Wheel
 */
export const spinWheel: AppRouteHandler<SpinWheelRoute> = async (c) => {
  const { userId } = c.req.valid("param");

  // Get user profile
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { profile: { select: { id: true } } },
  });

  if (!user || !user.profile) {
    return sendErrorResponse(c, "notFound", "User or profile not found");
  }

  const profileId = user.profile.id;

  // Get user stats
  const voteCount = await db.vote.aggregate({
    where: { voterId: profileId },
    _sum: { count: true },
  });

  const totalVotes = voteCount._sum.count || 0;
  const availableSpins = Math.floor(totalVotes / 50);

  if (availableSpins <= 0) {
    return c.json(
      { message: "No spins available. Cast more votes to earn spins!" },
      HttpStatusCodes.BAD_REQUEST,
    );
  }

  // Prize pool with probabilities
  const prizes = [
    { id: "votes-5", name: "5 Free Votes", type: "VOTES" as const, value: 5, probability: 30, description: "5 bonus votes" },
    { id: "votes-10", name: "10 Free Votes", type: "VOTES" as const, value: 10, probability: 20, description: "10 bonus votes" },
    { id: "votes-25", name: "25 Free Votes", type: "VOTES" as const, value: 25, probability: 15, description: "25 bonus votes" },
    { id: "badge", name: "Special Badge", type: "BADGE" as const, value: 1, probability: 15, description: "Exclusive badge" },
    { id: "discount-10", name: "10% Discount", type: "DISCOUNT" as const, value: 10, probability: 10, description: "10% off next purchase" },
    { id: "discount-25", name: "25% Discount", type: "DISCOUNT" as const, value: 25, probability: 5, description: "25% off next purchase" },
    { id: "spin", name: "Extra Spin", type: "SPIN" as const, value: 1, probability: 4, description: "Spin again!" },
    { id: "unlock", name: "Instant Unlock", type: "UNLOCK" as const, value: 1, probability: 1, description: "Unlock exclusive content" },
  ];

  // Weighted random selection
  const totalProbability = prizes.reduce((sum, prize) => sum + prize.probability, 0);
  const random = Math.random() * totalProbability;
  
  let cumulativeProbability = 0;
  let selectedPrize = prizes[0];
  
  for (const prize of prizes) {
    cumulativeProbability += prize.probability;
    if (random <= cumulativeProbability) {
      selectedPrize = prize;
      break;
    }
  }

  // In production, save spin result to database
  // await db.spinHistory.create({ userId, prizeId: selectedPrize.id, ... })

  return c.json(
    {
      prize: {
        id: selectedPrize.id,
        name: selectedPrize.name,
        type: selectedPrize.type,
        value: selectedPrize.value,
        description: selectedPrize.description,
      },
      spinsRemaining: availableSpins - 1,
    },
    HttpStatusCodes.OK,
  );
};

/**
 * Get Voter Progress
 */
export const getVoterProgress: AppRouteHandler<GetVoterProgressRoute> = async (c) => {
  const { userId } = c.req.valid("param");

  // Get user profile
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { profile: { select: { id: true } } },
  });

  if (!user || !user.profile) {
    return sendErrorResponse(c, "notFound", "User or profile not found");
  }

  const profileId = user.profile.id;

  // Get total votes
  const voteCount = await db.vote.aggregate({
    where: { voterId: profileId },
    _sum: { count: true },
  });

  const totalVotes = voteCount._sum.count || 0;

  // Get milestone configs and user's unlocked milestones from database
  const milestoneConfigs = await db.milestoneConfig.findMany({
    where: {
      isActive: true,
      type: "VOTE_COUNT",
    },
    orderBy: { threshold: "asc" },
  });

  const unlockedMilestones = await db.milestone.findMany({
    where: {
      profileId,
      type: "VOTE_COUNT",
    },
  });

  const finalMilestones = milestoneConfigs.map((config, index) => {
    const unlocked = unlockedMilestones.find(m => m.threshold === config.threshold);
    return {
      level: index + 1,
      name: config.name,
      votesRequired: config.threshold,
      reward: config.reward || "Milestone Badge",
      isUnlocked: !!unlocked || totalVotes >= config.threshold,
      unlockedAt: unlocked?.createdAt.toISOString() || null,
    };
  });

  // Calculate progress to next milestone
  const nextMilestoneData = finalMilestones.find(m => !m.isUnlocked);
  const progressToNext = nextMilestoneData
    ? {
        currentVotes: totalVotes,
        nextMilestone: nextMilestoneData.votesRequired,
        votesNeeded: nextMilestoneData.votesRequired - totalVotes,
        percentComplete: (totalVotes / nextMilestoneData.votesRequired) * 100,
      }
    : {
        currentVotes: totalVotes,
        nextMilestone: totalVotes,
        votesNeeded: 0,
        percentComplete: 100,
      };

  // Get voting history (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const votingHistory = await db.vote.findMany({
    where: {
      voterId: profileId,
      createdAt: { gte: thirtyDaysAgo },
    },
    include: {
      contest: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const historyGrouped = votingHistory.reduce((acc, vote) => {
    const date = vote.createdAt.toISOString().split("T")[0];
    const existing = acc.find(h => h.date === date);
    
    if (existing) {
      existing.voteCount += vote.count;
    } else {
      acc.push({
        date,
        voteCount: vote.count,
        contestName: vote.contest.name,
      });
    }
    
    return acc;
  }, [] as Array<{ date: string; voteCount: number; contestName: string }>);

  return c.json(
    {
      totalVotes,
      milestones: finalMilestones,
      progressToNext,
      votingHistory: historyGrouped,
    },
    HttpStatusCodes.OK,
  );
};
