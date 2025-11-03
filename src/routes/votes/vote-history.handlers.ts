import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "@/types/types";

import { db } from "@/db";
import { sendErrorResponse } from "@/helpers/send-error-response";
import { calculatePaginationMetadata } from "@/lib/queries/query.helper";

import type { GetVoteHistoryRoute } from "./vote-history.routes";

/**
 * Get vote history for a user
 */
export const getVoteHistory: AppRouteHandler<GetVoteHistoryRoute> = async (c) => {
  const { profileId } = c.req.valid("param");
  const { page = 1, limit = 50 } = c.req.valid("query");

  // Check if profile exists
  const profile = await db.profile.findUnique({
    where: { id: profileId },
  });

  if (!profile) {
    return sendErrorResponse(c, "notFound", "Profile not found");
  }

  // Get total count for pagination
  const totalCount = await db.vote.count({
    where: { voterId: profileId },
  });

  // Calculate pagination
  const skip = (page - 1) * limit;
  const paginationMetadata = calculatePaginationMetadata(totalCount, page, limit);

  // Get vote history with related data
  const votes = await db.vote.findMany({
    where: { voterId: profileId },
    include: {
      votee: {
        include: {
          user: {
            select: {
              name: true,
              image: true,
            },
          },
        },
      },
      contest: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          endDate: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    skip,
    take: limit,
  });

  // Transform data for frontend
  const voteHistory = votes.map((vote) => ({
    id: vote.id,
    modelName: vote.votee.user?.name || "Unknown Model",
    modelProfileImage: vote.votee.user?.image || null,
    contestName: vote.contest?.name || "Unknown Contest",
    contestId: vote.contestId,
    contestSlug: vote.contest?.slug || "",
    contestStatus: vote.contest?.status || "ACTIVE",
    contestEndDate: vote.contest?.endDate || null,
    voteType: vote.type,
    voteCount: vote.count,
    timestamp: vote.createdAt.toISOString(),
    voteeId: vote.voteeId,
  }));

  // Calculate stats
  const stats = await db.vote.aggregate({
    where: { voterId: profileId },
    _sum: { count: true },
    _count: true,
  });

  const freeVotesSum = await db.vote.aggregate({
    where: { voterId: profileId, type: "FREE" },
    _sum: { count: true },
  });

  const paidVotesSum = await db.vote.aggregate({
    where: { voterId: profileId, type: "PAID" },
    _sum: { count: true },
  });

  const uniqueContests = await db.vote.groupBy({
    by: ["contestId"],
    where: { voterId: profileId },
  });

  const uniqueModels = await db.vote.groupBy({
    by: ["voteeId"],
    where: { voterId: profileId },
  });

  return c.json(
    {
      votes: voteHistory,
      stats: {
        totalVotes: stats._sum.count || 0,
        totalRecords: stats._count || 0,
        freeVotes: freeVotesSum._sum.count || 0,
        paidVotes: paidVotesSum._sum.count || 0,
        contestsVotedIn: uniqueContests.length,
        uniqueModels: uniqueModels.length,
      },
      pagination: paginationMetadata,
    },
    HttpStatusCodes.OK,
  );
};
