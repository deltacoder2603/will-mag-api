import * as HttpStatusCodes from "stoker/http-status-codes";

import type { Prisma } from "@/generated/prisma";
import type { AppRouteHandler } from "@/types/types";

import { db } from "@/db/index";
import { sendErrorResponse } from "@/helpers/send-error-response";
import { calculatePaginationMetadata } from "@/lib/queries/query.helper";

import type { GetAllPayments, GetPaymentAnalytics, GetPaymentHistory } from "./payments.routes";

export const getPaymentHistory: AppRouteHandler<GetPaymentHistory> = async (c) => {
  const { page, limit } = c.req.valid("query");
  const { profileId } = c.req.valid("param");

  const profile = await db.profile.findFirst({
    where: { id: profileId },
  });

  if (!profile) {
    return sendErrorResponse(c, "notFound", "Profile not found");
  }

  const [payments, total] = await Promise.all([
    db.payment.findMany({
      where: {
        payerId: profile.id,
      },
      select: {
        id: true,
        amount: true,
        createdAt: true,
        updatedAt: true,
        status: true,
        stripeSessionId: true,
        intendedVoteeId: true,
        intendedContestId: true,
        intendedVoteCount: true,
        intendedComment: true,
        payer: {
          select: {
            id: true,
            user: {
              select: {
                name: true,
                username: true,
                image: true,
              },
            },
          },
        },
        votes: {
          select: {
            id: true,
            count: true,
            comment: true,
            votee: {
              select: {
                id: true,
                user: {
                  select: {
                    name: true,
                    username: true,
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
              },
            },
          },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
    }),
    db.payment.count({
      where: {
        payerId: profile.id,
      },
    }),
  ]);

  const enrichedPayments = await Promise.all(
    payments.map(async (payment) => {
      let model = null;
      let contest = null;

      // Prefer vote-based data if available
      if (payment.votes.length > 0) {
        const firstVote = payment.votes[0];
        model = firstVote.votee || null;
        contest = firstVote.contest || null;
      }

      // Fallback if missing
      if (!model && payment.intendedVoteeId) {
        model = await db.profile.findUnique({
          where: { id: payment.intendedVoteeId },
          select: {
            id: true,
            user: {
              select: {
                name: true,
                username: true,
                image: true,
              },
            },
          },
        });
      }

      if (!contest && payment.intendedContestId) {
        contest = await db.contest.findUnique({
          where: { id: payment.intendedContestId },
          select: {
            id: true,
            name: true,
            slug: true,
          },
        });
      }

      return {
        id: payment.id,
        amount: payment.amount,
        status: payment.status,
        stripeSessionId: payment.stripeSessionId,
        createdAt: payment.createdAt.toISOString(),
        updatedAt: payment.updatedAt.toISOString(),
        payer: payment.payer,
        model: model || { id: "", user: { name: "", username: "", image: "" } },
        contest,
        comment: payment.intendedComment,
        voteCount: payment.intendedVoteCount,
      };
    }),
  );

  const pagination = calculatePaginationMetadata(total, page, limit);

  return c.json(
    {
      data: enrichedPayments,
      pagination,
    },
    HttpStatusCodes.OK,
  );
};

export const getAllPayments: AppRouteHandler<GetAllPayments> = async (c) => {
  const { page, limit, status, fromDate, toDate } = c.req.valid("query");

  const where: Prisma.PaymentWhereInput = {};
  if (status !== "all") {
    where.status = status;
  }

  // Handle date filtering properly
  if (fromDate || toDate) {
    where.createdAt = {};
    if (fromDate) {
      where.createdAt.gte = new Date(fromDate);
    }
    if (toDate) {
      // Add 1 day to toDate to include the entire day
      const toDatePlusOne = new Date(toDate);
      toDatePlusOne.setDate(toDatePlusOne.getDate() + 1);
      where.createdAt.lt = toDatePlusOne;
    }
  }

  const [payments, total] = await Promise.all([
    db.payment.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      where,
      select: {
        id: true,
        amount: true,
        createdAt: true,
        updatedAt: true,
        status: true,
        stripeSessionId: true,
        intendedComment: true,

        // fallback relations
        intendedVoteCount: true,
        intendedVotee: {
          select: {
            id: true,
            user: { select: { name: true, username: true, image: true } },
          },
        },
        intendedContest: {
          select: { id: true, name: true, slug: true },
        },

        // payer info
        payer: {
          select: {
            id: true,
            user: { select: { name: true, username: true, image: true } },
          },
        },

        // votes + aggregate
        votes: {
          select: {
            id: true,
            comment: true,
            count: true,
            voterId: true,
            votee: {
              select: {
                id: true,
                user: { select: { name: true, username: true, image: true } },
              },
            },
            contest: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
    }),
    db.payment.count({
      where,
    }),
  ]);

  const enrichedPayments = payments.map((payment) => {
    const firstVote = payment.votes[0];

    // Use Prisma relations directly - no additional DB calls needed
    const model = firstVote?.votee || payment.intendedVotee || {
      id: "",
      user: { name: "", username: "", image: "" },
    };

    const contest = firstVote?.contest || payment.intendedContest || null;

    const voteCount = payment.votes.length > 0
      ? payment.votes.reduce((sum, v) => sum + (v.count || 0), 0)
      : payment.intendedVoteCount || 0;

    return {
      id: payment.id,
      amount: payment.amount,
      status: payment.status,
      stripeSessionId: payment.stripeSessionId,
      createdAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString(),
      payer: payment.payer,
      model,
      contest,
      comment: payment.intendedComment,
      voteCount,
    };
  });

  const pagination = calculatePaginationMetadata(total, page, limit);

  return c.json({ data: enrichedPayments, pagination }, HttpStatusCodes.OK);
};

export const getPaymentAnalytics: AppRouteHandler<GetPaymentAnalytics> = async (c) => {
  const [
    totalPayments,
    completedPayments,
    pendingPayments,
    failedPayments,
    totalAmount,
    completedAmount,
    pendingAmount,
    failedAmount,
  ] = await Promise.all([
    // Count queries
    db.payment.count(),
    db.payment.count({ where: { status: "COMPLETED" } }),
    db.payment.count({ where: { status: "PENDING" } }),
    db.payment.count({ where: { status: "FAILED" } }),

    // Amount aggregation queries
    db.payment.aggregate({
      _sum: { amount: true },
    }),
    db.payment.aggregate({
      where: { status: "COMPLETED" },
      _sum: { amount: true },
    }),
    db.payment.aggregate({
      where: { status: "PENDING" },
      _sum: { amount: true },
    }),
    db.payment.aggregate({
      where: { status: "FAILED" },
      _sum: { amount: true },
    }),
  ]);

  const analytics = {
    totalPayments,
    completedPayments,
    pendingPayments,
    failedPayments,
    amounts: {
      total: totalAmount._sum.amount || 0,
      completed: completedAmount._sum.amount || 0,
      pending: pendingAmount._sum.amount || 0,
      failed: failedAmount._sum.amount || 0,
    },
  };

  return c.json(analytics, HttpStatusCodes.OK);
};

