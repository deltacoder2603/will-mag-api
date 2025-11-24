import { createRoute } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";
import { z } from "zod";

import { PaymentSchema } from "@/db/schema/payments.schema";
import { ForbiddenResponse, NotFoundResponse, UnauthorizedResponse } from "@/lib/openapi.responses";
import { createPaginatedResponseSchema, PaginationQuerySchema } from "@/lib/queries/query.schema";

const tags = ["Payments"];

export const getPaymentHistory = createRoute({
  path: "/payments/{profileId}/history",
  method: "get",
  tags,
  summary: "Get user payment history",
  description: "Retrieve paginated payment history for a specific user",
  request: {
    params: z.object({
      profileId: z.string().openapi({ description: "User ID to get payment history for" }),
    }),
    query: PaginationQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createPaginatedResponseSchema(PaymentSchema),
      "Payment history retrieved successfully",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.FORBIDDEN]: ForbiddenResponse(),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse(),
  },
});

export const getAllPayments = createRoute({
  path: "/payments",
  method: "get",
  tags,
  summary: "Get all payments (Admin only)",
  description: "Retrieve paginated list of all payments in the system",
  request: {
    query: PaginationQuerySchema.extend({
      status: z.enum(["all", "PENDING", "COMPLETED", "FAILED"]).optional().default("all").openapi({
        description: "Filter by payment status",
        example: "PENDING",
      }),
      fromDate: z.string().optional().or(z.literal("")).describe("Filter payments from this date (ISO string or YYYY-MM-DD)"),
      toDate: z.string().optional().or(z.literal("")).describe("Filter payments until this date (ISO string or YYYY-MM-DD)"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createPaginatedResponseSchema(PaymentSchema),
      "All payments retrieved successfully",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.FORBIDDEN]: ForbiddenResponse(),
  },
});

export const getPaymentAnalytics = createRoute({
  path: "/payments/analytics",
  method: "get",
  tags,
  summary: "Get payment analytics",
  description: "Retrieve payment statistics including counts and amounts by status",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        totalPayments: z.number(),
        completedPayments: z.number(),
        pendingPayments: z.number(),
        failedPayments: z.number(),
        amounts: z.object({
          total: z.number(),
          completed: z.number(),
          pending: z.number(),
          failed: z.number(),
        }),
      }),
      "Payment analytics retrieved successfully",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.FORBIDDEN]: ForbiddenResponse(),
  },
});

export type GetPaymentHistory = typeof getPaymentHistory;
export type GetAllPayments = typeof getAllPayments;
export type GetPaymentAnalytics = typeof getPaymentAnalytics;
