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
import { getActiveVoteMultiplier, getUserMultiplierToken } from "@/lib/vote-multiplier";

import type { CastVoteWithCredits, FreeVote, GetAvailableVotes, GetLatestVotes, GetTopVotersForVotee, GetVotesByProfileId, GetVoterLeaderboardForModel, IsFreeVoteAvailable, PayVote } from "./vote.routes";

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
    select: { isVotingEnabled: true },
  });

  if (!contest) {
    return sendErrorResponse(c, "notFound", "Contest not found");
  }

  if (!contest.isVotingEnabled) {
    return sendErrorResponse(c, "badRequest", "Voting is not enabled for this contest yet");
  }

  if (!(await validateFreeVote(data.voterId))) {
    return sendErrorResponse(c, "tooManyRequests", "You can only use a free vote once every 24 hours for this contest");
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

  // Create vote with FREE_VOTE_COUNT (5 votes)
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

  // Validate vote count is supported
  if (voteCount <= 0) {
    return sendErrorResponse(c, "badRequest", "Vote count must be greater than 0");
  }

  // For custom votes, validate reasonable limits
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
          },
        },
      },
    }),
    db.contest.findUnique({
      where: { id: contestId },
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

  // Check if voting is enabled for the contest
  if (!contest.isVotingEnabled) {
    return sendErrorResponse(c, "badRequest", "Voting is not enabled for this contest yet");
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
    // Standard pricing: $1 = 5 votes ($0.20 per vote)
    return count * 0.2;
  };

  const totalPrice = getPriceForVoteCount(voteCount);
  // Check for user-specific multiplier from spin wheel
  const activeMultiplier = await getActiveVoteMultiplier(voter.id);
  const unitPrice = Math.round((totalPrice / voteCount) * 100);

  const payment = await db.payment.create({
    data: {
      amount: totalPrice,
      status: "PENDING",
      payerId: voter.id,
      stripeSessionId: "",
      // Store voting intent data
      intendedVoteeId: votee.id,
      intendedContestId: contest.id,
      intendedVoteCount: voteCount * activeMultiplier,
      intendedComment: null,
    },
  });

  const session = await stripe.checkout.sessions.create({
    metadata: {
      paymentId: payment.id,
      voteeId: votee.id,
      contestId: contest.id,
      voterId: voter.id,
      voteCount,
      votesMultipleBy: activeMultiplier,
    },
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: unitPrice,
          product_data: {
            name: activeMultiplier > 1 ? `Votes Boost Pack` : "Back Your Favorite",
            ...(votee.coverImage?.url ? { images: [votee.coverImage?.url] } : null),
            description:
              activeMultiplier > 1
                ? `${voteCount} votes boosted by ${activeMultiplier}x = ${voteCount * activeMultiplier} votes for ${votee.user.name}`
                : `${voteCount} votes for ${votee.user.name}`,
          },
        },
        quantity: voteCount,
      },
    ],
    mode: "payment",
    currency: "usd",
    customer_email: voter.user.email,
    success_url: `${env.FRONTEND_URL}/payments/success?callback=/voters`,
    cancel_url: `${env.FRONTEND_URL}/voters?section=buy-votes&payment=cancelled`,
    // Custom styling options
    custom_fields: [
      {
        key: "comment",
        label: {
          type: "custom",
          custom: `Message for ${votee.user.name} (Optional)`,
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

/**
 * Cast a vote using pre-purchased vote credits
 */
export const castVoteWithCredits: AppRouteHandler<CastVoteWithCredits> = async (c) => {
  const data = c.req.valid("json");
  const { voterId, voteeId, contestId, count = 1, comment } = data;

  // Prevent users from voting for themselves
  if (voterId === voteeId) {
    return sendErrorResponse(c, "badRequest", "You cannot vote for yourself");
  }

  // Check if contest exists and voting is enabled
  const contest = await db.contest.findUnique({
    where: { id: contestId },
    select: { isVotingEnabled: true },
  });

  if (!contest) {
    return sendErrorResponse(c, "notFound", "Contest not found");
  }

  if (!contest.isVotingEnabled) {
    return sendErrorResponse(c, "badRequest", "Voting is not enabled for this contest yet");
  }

  // Check if voter has sufficient credits
  const voterProfile = await db.profile.findUnique({
    where: { id: voterId },
    select: {
      availableVotes: true,
      user: {
        select: {
          name: true,
          username: true,
        },
      },
    },
  });

  if (!voterProfile) {
    return sendErrorResponse(c, "notFound", "Voter profile not found");
  }

  if (voterProfile.availableVotes < count) {
    return sendErrorResponse(
      c,
      "badRequest",
      `Insufficient votes. You have ${voterProfile.availableVotes} vote(s) available, but tried to cast ${count} vote(s).`,
    );
  }

  // Check if votee exists
  const voteeProfile = await db.profile.findUnique({
    where: { id: voteeId },
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

  if (!voteeProfile) {
    return sendErrorResponse(c, "notFound", "Votee profile not found");
  }

  // Check for user-specific multiplier from spin wheel
  let activeMultiplier = await getActiveVoteMultiplier(voterId);
  
  // Check for active multiplier token (one-time 10x multiplier)
  const multiplierToken = await getUserMultiplierToken(voterId);
  
  // If user has an active multiplier token, use it (10x)
  if (multiplierToken && !multiplierToken.isClaimed) {
    activeMultiplier = multiplierToken.prizeValue || 10;
    // Mark token as used after vote
    await db.activeSpinPrize.update({
      where: { id: multiplierToken.id },
      data: {
        isActive: false, // Deactivate after use
      },
    });
  }
  
  const actualVoteCount = count * activeMultiplier;

  // Perform the vote and deduct credits in a transaction
  const result = await db.$transaction(async (tx) => {
    // Deduct vote credits (only deduct the original count, not multiplied)
    const updatedProfile = await tx.profile.update({
      where: { id: voterId },
      data: {
        availableVotes: {
          decrement: count, // Deduct original count
        },
      },
      select: {
        availableVotes: true,
      },
    });

    // Create the vote with multiplied count
    const vote = await tx.vote.create({
      data: {
        voterId,
        voteeId,
        contestId,
        count: actualVoteCount, // Use multiplied count
        comment,
        type: "PAID", // Votes cast with credits are considered "PAID"
      },
    });

    return { vote, remainingCredits: updatedProfile.availableVotes, multiplier: activeMultiplier, originalCount: count, actualCount: actualVoteCount };
  });

  // Update profile stats with actual vote count (outside transaction to avoid conflicts)
  await updateProfileStatsOnVote(voteeId, "PAID", actualVoteCount);

  // Send notification to votee
  try {
    const votesLabel = count === 1 ? "vote" : "votes";
    const voterName = voterProfile.user.name || "Someone";
    const voterUsername = voterProfile.user.username;

    await db.notification.create({
      data: {
        profileId: voteeId,
        title: "Vote received",
        message: `${voterName} sent you ${count} ${votesLabel}`,
        type: Notification_Type.VOTE_PREMIUM,
        icon: Icon.SUCCESS,
        action: voterUsername ? `/profile/${voterUsername}` : undefined,
      },
    });
  } catch (error) {
    console.error("Failed to create notification:", error);
  }

  return c.json(
    {
      ...result.vote,
      remainingCredits: result.remainingCredits,
      multiplier: result.multiplier,
      originalCount: result.originalCount,
      actualCount: result.actualCount,
    },
    HttpStatusCodes.OK,
  );
};

/**
 * Get available vote credits for a voter
 */
export const getAvailableVotes: AppRouteHandler<GetAvailableVotes> = async (c) => {
  const { profileId } = c.req.valid("param");

  const profile = await db.profile.findUnique({
    where: { id: profileId },
    select: {
      availableVotes: true,
      lastFreeVoteAt: true,
    },
  });

  if (!profile) {
    return sendErrorResponse(c, "notFound", "Profile not found");
  }

  // Check if free vote is available
  let freeVoteAvailable = true;
  if (profile.lastFreeVoteAt) {
    const timeSinceLastVote = Date.now() - profile.lastFreeVoteAt.getTime();
    freeVoteAvailable = timeSinceLastVote >= FREE_VOTE_INTERVAL;
  }

  return c.json(
    {
      profileId,
      availableVotes: profile.availableVotes,
      lastFreeVoteAt: profile.lastFreeVoteAt?.toISOString() || null,
      freeVoteAvailable,
    },
    HttpStatusCodes.OK,
  );
};
