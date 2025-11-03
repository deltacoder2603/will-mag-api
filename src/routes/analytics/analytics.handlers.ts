import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "@/types/types";

import { db } from "@/db";

import type { GetContestAnalyticsRoute, GetDashboardStatsRoute, GetDetailedAnalyticsRoute, GetVotesAnalyticsRoute } from "./analytics.routes";

export const getDashboardStats: AppRouteHandler<GetDashboardStatsRoute> = async (c) => {
  // Get all statistics in parallel for better performance
  const [
    totalCompetitions,
    totalUsers,
    totalVotes,
    totalPrizePool,
    totalOnboardedUsers,
    freeVotes,
    paidVotes,
    activeCompetitions,
    completedCompetitions,
    totalParticipants,
    totalRevenue,
  ] = await Promise.all([
    // Total competitions
    db.contest.count(),

    // Total users
    db.user.count(),

    // Total votes
    db.vote.aggregate({
      _sum: {
        count: true,
      },
    }),

    // Total prize pool
    db.contest.aggregate({
      _sum: {
        prizePool: true,
      },
    }),

    // Total onboarded users (users with profiles)
    db.profile.count(),

    // Free votes
    db.vote.aggregate({
      _sum: {
        count: true,
      },
      where: {
        type: "FREE",
      },
    }),

    // Paid votes
    db.vote.aggregate({
      _sum: {
        count: true,
      },
      where: {
        type: "PAID",
      },
    }),

    // Active competitions (PUBLISHED, ACTIVE, VOTING, JUDGING)
    db.contest.count({
      where: {
        status: {
          in: ["PUBLISHED", "ACTIVE", "VOTING", "JUDGING"],
        },
      },
    }),

    // Completed competitions
    db.contest.count({
      where: {
        status: "COMPLETED",
      },
    }),

    // Total participants
    db.contestParticipation.count(),

    // Total revenue from paid votes (sum of payment amounts)
    db.payment.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        status: "COMPLETED",
      },
    }),
  ]);

  const stats = {
    totalCompetitions,
    totalUsers,
    totalVotes: totalVotes._sum.count || 0,
    totalPrizePool: totalPrizePool._sum.prizePool || 0,
    totalOnboardedUsers,
    freeVotes: freeVotes._sum.count || 0,
    paidVotes: paidVotes._sum.count || 0,
    activeCompetitions,
    completedCompetitions,
    totalParticipants,
    totalRevenue: totalRevenue._sum.amount || 0,
  };

  return c.json(stats, HttpStatusCodes.OK);
};

export const getDetailedAnalytics: AppRouteHandler<GetDetailedAnalyticsRoute> = async (c) => {
  const { period } = c.req.valid("query");

  // Calculate date range based on period
  const now = new Date();
  let startDate: Date;

  switch (period) {
    case "7d":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "90d":
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case "1y":
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    case "all":
    default:
      startDate = new Date(0); // Beginning of time
      break;
  }

  // Get all analytics data in parallel
  const [
    totalUsers,
    newUsersThisPeriod,
    totalVotes,
    votesThisPeriod,
    freeVotesThisPeriod,
    paidVotesThisPeriod,
    totalCompetitions,
    activeCompetitions,
    completedCompetitions,
    totalPrizePool,
    totalRevenue,
    revenueThisPeriod,
    totalParticipants,
    activeParticipants,
  ] = await Promise.all([
    // Total users
    db.user.count(),

    // New users this period
    db.user.count({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
    }),

    // Total votes
    db.vote.aggregate({
      _sum: {
        count: true,
      },
    }),

    // Votes this period
    db.vote.aggregate({
      _sum: {
        count: true,
      },
      where: {
        createdAt: {
          gte: startDate,
        },
      },
    }),

    // Free votes this period
    db.vote.aggregate({
      _sum: {
        count: true,
      },
      where: {
        type: "FREE",
        createdAt: {
          gte: startDate,
        },
      },
    }),

    // Paid votes this period
    db.vote.aggregate({
      _sum: {
        count: true,
      },
      where: {
        type: "PAID",
        createdAt: {
          gte: startDate,
        },
      },
    }),

    // Total competitions
    db.contest.count(),

    // Active competitions
    db.contest.count({
      where: {
        status: {
          in: ["PUBLISHED", "ACTIVE", "VOTING", "JUDGING"],
        },
      },
    }),

    // Completed competitions
    db.contest.count({
      where: {
        status: "COMPLETED",
      },
    }),

    // Total prize pool
    db.contest.aggregate({
      _sum: {
        prizePool: true,
      },
    }),

    // Total revenue
    db.payment.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        status: "COMPLETED",
      },
    }),

    // Revenue this period
    db.payment.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        status: "COMPLETED",
        createdAt: {
          gte: startDate,
        },
      },
    }),

    // Total participants
    db.contestParticipation.count(),

    // Active participants (participated in this period)
    db.contestParticipation.count({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
    }),
  ]);

  // Calculate derived metrics
  const daysInPeriod = period === "all" ? 365 : period === "7d" ? 7 : period === "30d" ? 30 : period === "90d" ? 90 : 365;
  const totalVotesCount = totalVotes._sum.count || 0;
  const votesThisPeriodCount = votesThisPeriod._sum.count || 0;
  const totalRevenueAmount = totalRevenue._sum.amount || 0;
  const revenueThisPeriodAmount = revenueThisPeriod._sum.amount || 0;
  const totalPrizePoolAmount = totalPrizePool._sum.prizePool || 0;

  const analytics = {
    period,
    userGrowth: {
      total: totalUsers,
      newThisPeriod: newUsersThisPeriod,
      growthRate: totalUsers > 0 ? (newUsersThisPeriod / totalUsers) * 100 : 0,
    },
    voteActivity: {
      total: totalVotesCount,
      thisPeriod: votesThisPeriodCount,
      averagePerDay: daysInPeriod > 0 ? votesThisPeriodCount / daysInPeriod : 0,
      freeVotes: freeVotesThisPeriod._sum.count || 0,
      paidVotes: paidVotesThisPeriod._sum.count || 0,
    },
    competitionMetrics: {
      total: totalCompetitions,
      active: activeCompetitions,
      completed: completedCompetitions,
      averagePrizePool: totalCompetitions > 0 ? totalPrizePoolAmount / totalCompetitions : 0,
      totalPrizePool: totalPrizePoolAmount,
    },
    revenueMetrics: {
      total: totalRevenueAmount,
      thisPeriod: revenueThisPeriodAmount,
      averagePerVote: totalVotesCount > 0 ? totalRevenueAmount / totalVotesCount : 0,
      conversionRate: votesThisPeriodCount > 0 ? (paidVotesThisPeriod._sum.count || 0) / votesThisPeriodCount * 100 : 0,
    },
    participationMetrics: {
      totalParticipants,
      activeParticipants,
      averageParticipationRate: totalCompetitions > 0 ? totalParticipants / totalCompetitions : 0,
    },
  };

  return c.json(analytics, HttpStatusCodes.OK);
};

export const getContestAnalytics: AppRouteHandler<GetContestAnalyticsRoute> = async (c) => {
  // Get contest analytics in parallel for better performance
  const [
    total,
    active,
    upcoming,
    prizePool,
  ] = await Promise.all([
    // Total contests
    db.contest.count(),

    // Active contests (PUBLISHED, ACTIVE, VOTING, JUDGING)
    db.contest.count({
      where: {
        AND: {
          status: {
            in: ["PUBLISHED", "ACTIVE", "VOTING", "JUDGING", "BOOKED"],
          },
          startDate: {
            lte: new Date(),
          },
          endDate: {
            gte: new Date(),
          },
        },
      },
    }),

    // Upcoming contests (DRAFT, PUBLISHED with future start date)
    db.contest.count({
      where: {
        OR: [
          {
            AND: [
              {
                status: "PUBLISHED",
              },
              {
                startDate: {
                  gt: new Date(),
                },
              },
            ],
          },
        ],
      },
    }),

    // Total prize pool
    db.contest.aggregate({
      _sum: {
        prizePool: true,
      },
    }),
  ]);

  const analytics = {
    total,
    active,
    upcoming,
    prizePool: prizePool._sum.prizePool || 0,
  };

  return c.json(analytics, HttpStatusCodes.OK);
};

export const getVotesAnalytics: AppRouteHandler<GetVotesAnalyticsRoute> = async (c) => {
  // Get vote statistics in parallel for better performance
  const [totalVotes, freeVotes, paidVotes, topVotersRaw, topVoteRecipients] = await Promise.all([
    // Total votes count (sum of all vote counts)
    db.vote.aggregate({
      _sum: {
        count: true,
      },
    }),

    // Free votes count (sum of free vote counts)
    db.vote.aggregate({
      _sum: {
        count: true,
      },
      where: {
        type: "FREE",
      },
    }),

    // Paid votes count (sum of paid vote counts)
    db.vote.aggregate({
      _sum: {
        count: true,
      },
      where: {
        type: "PAID",
      },
    }),

    // Top 5 voters (users who have given the most votes)
    db.vote.groupBy({
      by: ["voterId"],
      _sum: {
        count: true,
      },
      orderBy: {
        _sum: {
          count: "desc",
        },
      },
      take: 5,
    }),

    // Top 5 vote recipients (users who have received the most votes)
    db.vote.groupBy({
      by: ["voteeId"],
      _sum: {
        count: true,
      },
      orderBy: {
        _sum: {
          count: "desc",
        },
      },
      take: 5,
    }),
  ]);

  // Filter out any votes with null voterId
  const topVoters = topVotersRaw.filter(voter => voter.voterId != null);

  // Get user details for top voters
  const topVotersWithDetails = await Promise.all(
    topVoters.map(async (voter) => {
      const profile = await db.profile.findUnique({
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

      return {
        profileId: voter.voterId,
        username: profile?.user.username || "",
        name: profile?.user.name || "",
        profileImage: profile?.user.image || "",
        totalVotesGiven: voter._sum.count || 0,
      };
    }),
  );

  // Get user details for top vote recipients
  const topVoteRecipientsWithDetails = await Promise.all(
    topVoteRecipients.map(async (recipient) => {
      const profile = await db.profile.findUnique({
        where: { id: recipient.voteeId },
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

      return {
        profileId: recipient.voteeId,
        username: profile?.user.username || "",
        name: profile?.user.name || "",
        profileImage: profile?.user.image || "",
        totalVotesReceived: recipient._sum.count || 0,
      };
    }),
  );

  const analytics = {
    totalVotes: totalVotes._sum.count || 0,
    freeVotes: freeVotes._sum.count || 0,
    paidVotes: paidVotes._sum.count || 0,
    topVoters: topVotersWithDetails,
    topVoteRecipients: topVoteRecipientsWithDetails,
  };

  return c.json(analytics, HttpStatusCodes.OK);
};
