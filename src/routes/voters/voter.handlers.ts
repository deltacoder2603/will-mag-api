import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "@/types/types";

import { db } from "@/db";
import { sendErrorResponse } from "@/helpers/send-error-response";

import type {
  GetAvailableContestsRoute,
  GetContestParticipantsRoute,
  GetVoterProgressRoute,
  GetVoterStatsRoute,
} from "./voter.routes";

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
          user: { select: { name: true, username: true, displayUsername: true } },
          coverImage: { select: { url: true } },
        },
      });

      return {
        profileId: fav.voteeId,
        modelName: profile?.user?.name || "Unknown",
        username: profile?.user?.username || profile?.user?.displayUsername || null,
        voteCount: fav._sum.count || 0,
        avatarUrl: profile?.coverImage?.url || null,
      };
    }),
  );

  return c.json(
    {
      totalVotes,
      freeVotes,
      paidVotes,
      contestsVotedIn: contestsVotedIn.length,
      favoriteModels,
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
          user: { select: { name: true, username: true, displayUsername: true } },
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
        username: participant.profile.user?.username || participant.profile.user?.displayUsername || null,
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
      new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime(),
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
      votingHistory: historyGrouped,
    },
    HttpStatusCodes.OK,
  );
};
