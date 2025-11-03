import * as HttpStatusCodes from "stoker/http-status-codes";

import type { Prisma } from "@/generated/prisma";
import type { AppRouteHandler } from "@/types/types";

import { db } from "@/db";
import { calculatePaginationMetadata } from "@/lib/queries/query.helper";

import type { GetAllVotes } from "./admin-votes.routes";

export const getAllVotes: AppRouteHandler<GetAllVotes> = async (c) => {
  const query = c.req.valid("query");
  const { page = 1, limit = 20, contestId, voterId, modelId, search, type, startDate, endDate, sortBy, sortOrder } = query;
  // Build where clause for filtering
  const where: Prisma.VoteWhereInput = {};

  if (contestId) {
    where.contestId = contestId;
  }

  if (voterId) {
    where.voterId = voterId;
  }

  if (modelId) {
    where.voteeId = modelId;
  }

  if (search) {
    const fields: (keyof Prisma.UserWhereInput)[] = ["name", "username", "email", "displayUsername"];

    where.OR = [
      // votee user fields
      ...fields.map(field => ({
        votee: { user: { [field]: { contains: search } } },
      })),

      // voter user fields
      ...fields.map(field => ({
        voter: { user: { [field]: { contains: search } } },
      })),

      // comment field
      { comment: { contains: search } },
    ];
  }

  if (type) {
    switch (type) {
      case "all":
        break;
      case "FREE":
        where.type = "FREE";
        break;
      case "PAID":
        where.type = "PAID";
        break;
    }
  }

  // Build order by clause
  const orderBy: Prisma.VoteOrderByWithRelationInput = {};
  switch (sortBy) {
    case "createdAt":
      orderBy.createdAt = sortOrder;
      break;
    case "count":
      orderBy.count = sortOrder;
      break;
    default:
      break;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate && startDate !== "") {
      // If it's just a date (YYYY-MM-DD), set it to start of day
      const startDateTime = startDate.includes("T") ? startDate : `${startDate}T00:00:00.000Z`;
      where.createdAt.gte = new Date(startDateTime);
    }
    if (endDate && endDate !== "") {
      // If it's just a date (YYYY-MM-DD), set it to end of day
      const endDateTime = endDate.includes("T") ? endDate : `${endDate}T23:59:59.999Z`;
      where.createdAt.lte = new Date(endDateTime);
    }
  }

  // Get total count for pagination
  const total = await db.vote.count({ where, orderBy });

  // Calculate pagination metadata
  const pagination = calculatePaginationMetadata(total, page, limit);

  // Get votes with related data (excluding voter to avoid null issues)
  const votesRaw = await db.vote.findMany({
    where,
    select: {
      id: true,
      type: true,
      count: true,
      comment: true,
      createdAt: true,
      voterId: true,
      voteeId: true,
      contest: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      votee: {
        select: {
          id: true,
          user: {
            select: {
              username: true,
              name: true,
              image: true,
            },
          },
        },
      },
      payment: {
        select: {
          id: true,
          amount: true,
          status: true,
        },
      },
    },
    skip: (page - 1) * limit,
    take: limit + 50, // Fetch extra to account for null voters
    orderBy,
  });

  // Filter out votes with null voters
  const validVotes = votesRaw.filter(vote => vote.voterId != null);

  // Get unique voter IDs
  const voterIds = [...new Set(validVotes.map(vote => vote.voterId))];

  // Fetch voter profiles
  const voterProfiles = await db.profile.findMany({
    where: {
      id: { in: voterIds },
    },
    select: {
      id: true,
      user: {
        select: {
          username: true,
          name: true,
          image: true,
        },
      },
    },
  });

  // Create a map for quick lookup
  const voterMap = new Map(voterProfiles.map(v => [v.id, v]));

  // Get votes with valid voters and limit to requested page size
  const votes = validVotes.filter(vote => voterMap.has(vote.voterId!)).slice(0, limit);

  // Transform the data to match the AdminVote schema
  const transformedVotes = votes.map(vote => {
    const voter = voterMap.get(vote.voterId!)!;
    return {
      id: vote.id,
      type: vote.type,
      count: vote.count,
      comment: vote.comment,
      createdAt: vote.createdAt.toISOString(),
      contest: {
        id: vote.contest.id,
        name: vote.contest.name,
        slug: vote.contest.slug,
      },
      voter: {
        id: voter.id,
        username: voter.user.username || "",
        name: voter.user.name,
        profilePicture: voter.user.image || "",
      },
      votee: {
        id: vote.votee.id,
        username: vote.votee.user.username || "",
        name: vote.votee.user.name,
        profilePicture: vote.votee.user.image || "",
      },
      payment: vote.payment
        ? {
            id: vote.payment.id,
            amount: vote.payment.amount,
            status: vote.payment.status,
          }
        : null,
    };
  });

  const response = {
    data: transformedVotes,
    pagination,
  };

  return c.json(response, HttpStatusCodes.OK);
};
