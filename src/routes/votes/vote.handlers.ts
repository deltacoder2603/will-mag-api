import * as HttpStatusCodes from "stoker/http-status-codes";

import type { Prisma } from "@/generated/prisma";
import type { AppRouteHandler } from "@/types/types";

import { FREE_VOTE_COUNT, FREE_VOTE_INTERVAL } from "@/constants";
import { db } from "@/db";
import env from "@/env";
import { Icon, Notification_Type } from "@/generated/prisma";
import { sendErrorResponse } from "@/helpers/send-error-response";
import { updateProfileStatsOnVote } from "@/lib/profile-stats";
import { calculatePaginationMetadata } from "@/lib/queries/query.helper";
import { stripe } from "@/lib/stripe";

import type { FreeVote, GetLatestVotes, GetTopVotersForVotee, GetVotesByProfileId, GetVoterLeaderboardForModel, IsFreeVoteAvailable, PayVote } from "./vote.routes";

import { updateLastFreeVote, validateFreeVote } from "./vote.action";

// Import email queue system
import { publishEvent } from "../../../email/queue/eventBus.js";

export const freeVote: AppRouteHandler<FreeVote> = async (c) => {
  const data = c.req.valid("json");

  // Prevent users from voting for themselves
  if (data.voterId === data.voteeId) {
    return sendErrorResponse(c, "badRequest", "You cannot vote for yourself");
  }

  // Check if voting is enabled for the contest
  const contest = await db.contest.findUnique({
    where: { id: data.contestId },
    select: { isVotingEnabled: true, status: true },
  });

  if (!contest) {
    return sendErrorResponse(c, "notFound", "Contest not found");
  }

  // Check if voting is enabled - allow voting if contest is in an active state
  // Active contests (ACTIVE, VOTING, PUBLISHED) should allow voting by default
  // The isVotingEnabled flag can be used to explicitly disable voting, but active contests allow voting by default
  const isActiveStatus = contest.status === "ACTIVE" || contest.status === "VOTING" || contest.status === "PUBLISHED";
  
  // For active contests, allow voting by default (even if isVotingEnabled is false by default in schema)
  // Only block if isVotingEnabled is explicitly set to false AND we want to respect that
  // Since schema defaults to false, we'll allow voting for all active contests
  const canVote = isActiveStatus;
  
  if (!canVote) {
    return sendErrorResponse(c, "badRequest", `Contest is not in an active state. Current status: ${contest.status}`);
  }

  if (!(await validateFreeVote(data.voterId))) {
    return sendErrorResponse(c, "tooManyRequests", "You can only use one free vote per day. Please wait 24 hours from your last free vote.");
  }

  // Fetch minimal info to personalize the notification
  const [voter, votee] = await Promise.all([
    db.profile.findUnique({
      where: { id: data.voterId },
      select: {
        id: true,
        user: { select: { name: true, username: true } },
      },
    }),
    db.profile.findUnique({
      where: { id: data.voteeId },
      select: {
        id: true,
        user: { select: { username: true } },
      },
    }),
  ]);

  if (!votee) {
    return sendErrorResponse(c, "notFound", "Votee not found");
  }
  if (!voter) {
    return sendErrorResponse(c, "notFound", "Voter not found");
  }

  // Create vote with FREE_VOTE_COUNT (1 vote)
  const vote = await db.vote.create({ 
    data: {
      ...data,
      count: FREE_VOTE_COUNT
    }
  });

  await updateLastFreeVote(data.voterId);

  // Update ProfileStats for the votee
  await updateProfileStatsOnVote(votee.id, "FREE", FREE_VOTE_COUNT);

  // Notify the votee that they received a free vote
  try {
    const voterName = voter.user.name ?? "Someone";
    const voterUsername = voter.user.username;

    await db.notification.create({
      data: {
        profileId: data.voteeId,
        title: "Free vote received",
        message: `${voterName} sent you a free vote`,
        type: Notification_Type.VOTE_RECEIVED,
        icon: Icon.SUCCESS,
        action: voterUsername ? `/profile/${voterUsername}` : undefined,
      },
    });
  } catch {
    // Intentionally do not fail the request if notification creation fails
  }

  // Send vote confirmation email (async, non-blocking)
  try {
    const voterEmail = await db.user.findUnique({
      where: { id: voter.user.id },
      select: { email: true },
    });

    if (voterEmail?.email) {
      publishEvent.voteCreated({
        voterEmail: voterEmail.email,
        modelName: votee.user.username ?? votee.user.name ?? "Model",
        modelId: votee.id,
      }).catch((err) => {
        console.error("Failed to queue vote confirmation email:", err);
      });
    }
  } catch {
    // Don't fail the request if email queuing fails
  }

  return c.json(vote, HttpStatusCodes.OK);
};

export const isFreeVoteAvailable: AppRouteHandler<IsFreeVoteAvailable> = async (c) => {
  const { profileId } = c.req.valid("json");

  const profile = await db.profile.findUnique({
    where: { id: profileId },
    select: { lastFreeVoteAt: true },
  });
  if (!profile) {
    return sendErrorResponse(c, "notFound", "Profile not found.");
  }
  if (!profile.lastFreeVoteAt) {
    return c.json({ available: true }, HttpStatusCodes.OK);
  }
  const now = new Date();
  const last = new Date(profile.lastFreeVoteAt);
  const diff = now.getTime() - last.getTime();
  if (diff >= FREE_VOTE_INTERVAL) {
    return c.json({ available: true }, HttpStatusCodes.OK);
  }
  const nextAvailableAt = new Date(last.getTime() + FREE_VOTE_INTERVAL);
  return c.json({ available: false, nextAvailableAt }, HttpStatusCodes.OK);
};

export const payVote: AppRouteHandler<PayVote> = async (c) => {
  const { voteeId, voterId, voteCount, contestId } = c.req.valid("json");

  // Prevent users from voting for themselves
  if (voterId === voteeId) {
    return sendErrorResponse(c, "badRequest", "You cannot vote for yourself");
  }

  // Validate vote count - support preset boxes (50, 100, 150, 200) or custom (min 1, max 1000)
  if (voteCount <= 0) {
    return sendErrorResponse(c, "badRequest", "Vote count must be greater than 0");
  }

  // Validate custom votes have reasonable limits
  if (voteCount > 1000) {
    return sendErrorResponse(c, "badRequest", "Vote count cannot exceed 1000");
  }

  const [voter, votee, contest] = await Promise.all([
    db.profile.findUnique({
      where: { id: voterId },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    }),
    db.profile.findUnique({
      where: { id: voteeId },
      include: {
        coverImage: {
          select: {
            url: true,
          },
        },
        user: {
          select: {
            name: true,
            username: true,
            displayUsername: true,
          },
        },
      },
    }),
    db.contest.findUnique({
      where: { id: contestId },
      select: { isVotingEnabled: true, status: true },
    }),
  ]);

  if (!votee) {
    return sendErrorResponse(c, "notFound", "Votee with the shared profile id was not found");
  }

  if (!voter) {
    return sendErrorResponse(c, "notFound", "Voter with the shared profile id was not found");
  }

  if (!contest) {
    return sendErrorResponse(c, "notFound", "Contest with the shared contest id was not found");
  }

  // Check if voting is enabled - allow voting if contest is in an active state
  // Active contests (ACTIVE, VOTING, PUBLISHED) should allow voting by default
  // The isVotingEnabled flag can be used to explicitly disable voting, but active contests allow voting by default
  const isActiveStatus = contest.status === "ACTIVE" || contest.status === "VOTING" || contest.status === "PUBLISHED";
  
  // For active contests, allow voting by default (even if isVotingEnabled is false by default in schema)
  // Only block if isVotingEnabled is explicitly set to false AND we want to respect that
  // Since schema defaults to false, we'll allow voting for all active contests
  const canVote = isActiveStatus;
  
  if (!canVote) {
    return sendErrorResponse(c, "badRequest", `Contest is not in an active state. Current status: ${contest.status}`);
  }

  const isVoteePresent = await db.contestParticipation.findFirst({
    where: {
      contestId,
      profileId: votee.id,
    },
  });

  if (!isVoteePresent) {
    return sendErrorResponse(c, "notFound", "Votee is not a participant in the contest");
  }

  // Calculate price based on vote count (pricing tiers)
  const getPriceForVoteCount = (count: number): number => {
    // Standard pricing: $1 = 1 vote
    return count * 1.0;
  };

  const totalPrice = getPriceForVoteCount(voteCount);
  const unitPrice = Math.round((totalPrice / voteCount) * 100);

  const payment = await db.payment.create({
    data: {
      amount: totalPrice,
      status: "PENDING",
      payerId: voter.id,
      stripeSessionId: "",
      type: "MODEL_VOTE",
      // Store voting intent data
      intendedVoteeId: votee.id,
      intendedContestId: contest.id,
      intendedVoteCount: voteCount,
      intendedComment: null,
    },
  });

  const modelName = votee.user.name || votee.user.username || votee.user.displayUsername || "Model";
  
  const session = await stripe.checkout.sessions.create({
    metadata: {
      paymentId: payment.id,
      voteeId: votee.id,
      contestId: contest.id,
      voterId: voter.id,
      voteCount: voteCount.toString(),
      type: "MODEL_VOTE",
      modelName: modelName,
    },
    payment_intent_data: {
      description: `Votes for ${modelName}`,
      statement_descriptor: `Votes for ${modelName.substring(0, 22)}`, // Max 22 chars
      statement_descriptor_suffix: modelName.substring(0, 20), // Max 20 chars - appears on statement
      metadata: {
        modelName: modelName,
        voteeId: votee.id,
      },
    },
    payment_method_types: ["card"],
    submit_type: "pay",
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: unitPrice,
          product_data: {
            name: `Votes for ${modelName}`,
            ...(votee.coverImage?.url ? { images: [votee.coverImage?.url] } : null),
            description: `${voteCount} votes for ${modelName}`,
          },
        },
        quantity: voteCount,
      },
    ],
    mode: "payment",
    currency: "usd",
    customer_email: voter.user.email,
    success_url: `${env.FRONTEND_URL}/payments/success?callback=/voters`,
    cancel_url: `${env.FRONTEND_URL}/profile/${votee.user.username || votee.user.displayUsername || votee.id}`,
    // Custom styling options
    custom_fields: [
      {
        key: "comment",
        label: {
          type: "custom",
          custom: `Message for ${modelName} (Optional)`,
        },
        type: "text",
        optional: true,
      },
    ],
    billing_address_collection: "auto",
    // Custom branding
    // payment_method_types: ["card", "cashapp", "afterpay_clearpay", "paypal"],
    allow_promotion_codes: true,
  });

  if (!session) {
    return sendErrorResponse(c, "serviceUnavailable", "Session was not created");
  }

  if (!session.url) {
    return sendErrorResponse(c, "notFound", "Session URL was not found");
  }

  const formattedStripeSession = {
    url: session.url,
  };

  // console.log(session.url);

  return c.json(formattedStripeSession, HttpStatusCodes.OK);
};

export const getLatestVotes: AppRouteHandler<GetLatestVotes> = async (c) => {
  const { page, limit, search } = c.req.valid("query");

  const skip = (page - 1) * limit;
  const take = limit;

  const where: Prisma.VoteWhereInput = {};

  if (search) {
    const fields: (keyof Prisma.UserWhereInput)[] = ["name", "username", "email", "displayUsername"];

    where.OR = fields.map(field => ({
      votee: {
        user: {
          [field]: { contains: search },
        },
      },
    }));
  }

  const [votesRaw, totalVotesRaw] = await Promise.all([
    db.vote.findMany({
      skip,
      take: take + 50, // Fetch extra to account for null voters
      where,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        voterId: true,
        voteeId: true,
        votee: {
          select: {
            id: true,
            user: {
              select: {
                name: true,
                image: true,
              },
            },
          },
        },
        count: true,
        comment: true,
        createdAt: true,
      },
    }),
    db.vote.count({ where }),
  ]);

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
          name: true,
          image: true,
        },
      },
    },
  });

  // Create a map for quick lookup
  const voterMap = new Map(voterProfiles.map(v => [v.id, v]));

  // Format votes with voter information
  const votes = validVotes
    .filter(vote => voterMap.has(vote.voterId!))
    .slice(0, take);

  const formattedVotes = votes.map(vote => {
    const voter = voterMap.get(vote.voterId!)!;
    return {
      votee: vote.votee?.user
        ? {
            name: vote.votee.user.name,
            id: vote.votee.id,
            profilePicture: vote.votee.user.image ?? "",
          }
        : null,
      voter: {
        name: voter.user.name,
        id: voter.id,
        profilePicture: voter.user.image ?? "",
      },
      totalVotes: vote.count,
      comment: vote.comment,
      createdAt: vote.createdAt.toISOString(),
    };
  });

  const totalVotes = validVotes.filter(vote => voterMap.has(vote.voterId!)).length;
  const pagination = calculatePaginationMetadata(totalVotes, page, limit);

  return c.json({ data: formattedVotes, pagination }, HttpStatusCodes.OK);
};

export const getVotesByProfileId: AppRouteHandler<GetVotesByProfileId> = async (c) => {
  const { profileId } = c.req.valid("param");
  const { page, limit, onlyPaid } = c.req.valid("query");

  const profile = await db.profile.findUnique({
    where: { id: profileId },
    select: { id: true },
  });

  if (!profile) {
    return sendErrorResponse(c, "notFound", "Profile not found");
  }

  const skip = (page - 1) * limit;
  const take = limit;

  // Get votes without including the voter relation (to avoid null issues)
  const votesRaw = await db.vote.findMany({
    where: {
      voteeId: profile.id,
      ...(onlyPaid ? { paymentId: { not: null } } : {}),
    },
    skip,
    take: take + 50, // Fetch extra to account for potential null voters we'll filter out
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      count: true,
      comment: true,
      createdAt: true,
      voterId: true,
      payment: {
        select: {
          amount: true,
        },
      },
      contest: {
        select: {
          name: true,
        },
      },
    },
  });

  // Filter out null voters and fetch their profiles
  const validVotes = votesRaw.filter(vote => vote.voterId != null);
  
  // Get unique voter IDs
  const voterIds = [...new Set(validVotes.map(vote => vote.voterId))];
  
  // Fetch all voter profiles in one query
  const voterProfiles = await db.profile.findMany({
    where: {
      id: { in: voterIds },
    },
    select: {
      id: true,
      user: {
        select: {
          name: true,
          username: true,
        },
      },
    },
  });

  // Create a map for quick lookup
  const voterMap = new Map(voterProfiles.map(v => [v.id, v]));

  // Format the votes with voter information
  const formattedVotesReceived = validVotes
    .slice(0, take) // Limit to requested page size
    .filter(vote => voterMap.has(vote.voterId!))
    .map(vote => {
      const voter = voterMap.get(vote.voterId!)!;
      return {
        profileId: voter.id,
        name: voter.user.name,
        username: voter.user.username ?? "Anonymous User",
        contestName: vote.contest.name,
        votedOn: vote.createdAt.toISOString(),
        amount: vote.payment?.amount ?? null,
        comment: vote.comment,
        count: vote.count,
      };
    });

  // Count total valid votes (those with valid voter IDs and profiles)
  const total = validVotes.filter(vote => voterMap.has(vote.voterId!)).length;

  const pagination = calculatePaginationMetadata(total, page, limit);

  return c.json({ data: formattedVotesReceived, pagination }, HttpStatusCodes.OK);
};

export const getTopVotersForVotee: AppRouteHandler<GetTopVotersForVotee> = async (c) => {
  const { profileId } = c.req.valid("param");

  // First check if the votee profile exists
  const voteeProfile = await db.profile.findUnique({
    where: { id: profileId },
    select: { id: true },
  });

  if (!voteeProfile) {
    return sendErrorResponse(c, "notFound", "Votee profile not found");
  }

  // Get top 10 voters for this votee with aggregated vote counts and latest vote info
  const topVotersRaw = await db.vote.groupBy({
    by: ["voterId"],
    where: {
      voteeId: profileId,
    },
    _sum: {
      count: true,
    },
    _max: {
      createdAt: true,
    },
    orderBy: {
      _sum: {
        count: "desc",
      },
    },
    take: 10,
  });

  // Filter out any votes with null voterId
  const topVoters = topVotersRaw.filter(voter => voter.voterId != null);

  // Get detailed information for each top voter
  const topVotersWithDetails = await Promise.all(
    topVoters.map(async (voter, index) => {
      const voterProfile = await db.profile.findUnique({
        where: { id: voter.voterId },
        select: {
          user: {
            select: {
              name: true,
              image: true,
            },
          },
        },
      });

      // Get the latest vote with comment for this voter
      const latestVote = await db.vote.findFirst({
        where: {
          voterId: voter.voterId,
          voteeId: profileId,
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          comment: true,
          createdAt: true,
        },
      });

      return {
        rank: index + 1,
        profileId: voter.voterId,
        userName: voterProfile?.user.name ?? "Anonymous User",
        profilePicture: voterProfile?.user.image ?? "",
        totalVotesGiven: voter._sum.count ?? 0,
        comment: latestVote?.comment ?? null,
        lastVoteAt: latestVote?.createdAt.toISOString() ?? "",
      };
    }),
  );

  return c.json(topVotersWithDetails, HttpStatusCodes.OK);
};

/**
 * Get voter leaderboard for a specific model
 * Shows all voters ranked by total votes given to this model
 */
export const getVoterLeaderboardForModel: AppRouteHandler<GetVoterLeaderboardForModel> = async (c) => {
  const { profileId } = c.req.valid("param");
  const { page = 1, limit = 20 } = c.req.valid("query");

  // First check if the model profile exists
  const modelProfile = await db.profile.findUnique({
    where: { id: profileId },
    select: { id: true },
  });

  if (!modelProfile) {
    return sendErrorResponse(c, "notFound", "Model profile not found");
  }

  // Get all voters with their vote aggregations for this specific model
  const votersDataRaw = await db.vote.groupBy({
    by: ["voterId"],
    where: {
      voteeId: profileId,
    },
    _sum: {
      count: true,
    },
    _max: {
      createdAt: true,
    },
    orderBy: {
      _sum: {
        count: "desc",
      },
    },
  });

  // Filter out any votes with null voterId after grouping
  const votersData = votersDataRaw.filter(voter => voter.voterId != null);

  // Get total count for pagination
  const total = votersData.length;

  // Apply pagination
  const paginatedVoters = votersData.slice((page - 1) * limit, page * limit);

  // Get detailed information for each voter including free/paid breakdown
  const voterLeaderboard = await Promise.all(
    paginatedVoters.map(async (voter, index) => {
      const voterProfile = await db.profile.findUnique({
        where: { id: voter.voterId },
        select: {
          user: {
            select: {
              username: true,
              name: true,
              image: true,
            },
          },
        },
      });

      // Get free and paid vote counts separately
      const [freeVotesResult, paidVotesResult] = await Promise.all([
        db.vote.aggregate({
          where: {
            voterId: voter.voterId,
            voteeId: profileId,
            type: "FREE",
          },
          _sum: {
            count: true,
          },
        }),
        db.vote.aggregate({
          where: {
            voterId: voter.voterId,
            voteeId: profileId,
            type: "PAID",
          },
          _sum: {
            count: true,
          },
        }),
      ]);

      const freeVotesGiven = freeVotesResult._sum.count || 0;
      const paidVotesGiven = paidVotesResult._sum.count || 0;

      return {
        rank: (page - 1) * limit + index + 1,
        profileId: voter.voterId,
        username: voterProfile?.user.username || "Anonymous",
        name: voterProfile?.user.name || "Anonymous User",
        profileImage: voterProfile?.user.image || null,
        totalVotesGiven: voter._sum.count || 0,
        freeVotesGiven,
        paidVotesGiven,
        lastVoteAt: voter._max.createdAt?.toISOString() || "",
      };
    }),
  );

  const pagination = calculatePaginationMetadata(total, page, limit);

  return c.json({ data: voterLeaderboard, pagination }, HttpStatusCodes.OK);
};

