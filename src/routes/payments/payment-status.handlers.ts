import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "@/types/types";

import { db } from "@/db";
import { sendErrorResponse } from "@/helpers/send-error-response";

import type { GetPaymentStatusRoute } from "./payment-status.routes";

/**
 * Get payment status by Stripe session ID
 */
export const getPaymentStatus: AppRouteHandler<GetPaymentStatusRoute> = async (c) => {
  const { sessionId } = c.req.valid("param");

  // Find payment by Stripe session ID
  const payment = await db.payment.findFirst({
    where: {
      OR: [
        { stripeSessionId: sessionId },
        { stripeSessionId: { contains: sessionId } },
      ],
    },
    select: {
      id: true,
      status: true,
      amount: true,
      intendedVoteCount: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!payment) {
    return c.json(
      {
        status: "not_found" as const,
        paymentId: null,
        amount: null,
        voteCount: null,
        createdAt: null,
      },
      HttpStatusCodes.OK,
    );
  }

  // Map payment status to response format
  let status: "completed" | "pending" | "expired" | "not_found";
  if (payment.status === "COMPLETED") {
    status = "completed";
  } else if (payment.status === "PENDING") {
    status = "pending";
  } else if (payment.status === "FAILED" || payment.status === "CANCELLED") {
    status = "expired";
  } else {
    status = "not_found";
  }

  return c.json(
    {
      status,
      paymentId: payment.id,
      amount: payment.amount,
      voteCount: payment.intendedVoteCount,
      createdAt: payment.createdAt.toISOString(),
    },
    HttpStatusCodes.OK,
  );
};

