import { createRoute } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";
import { z } from "zod";

const tags = ["Payments"];

export const getPaymentStatusRoute = createRoute({
  path: "/payments/status/:sessionId",
  method: "get",
  tags,
  summary: "Get payment status by Stripe session ID",
  description: "Retrieves payment status and details by Stripe checkout session ID",
  request: {
    params: z.object({
      sessionId: z.string().describe("Stripe checkout session ID"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        status: z.enum(["completed", "pending", "expired", "not_found"]),
        paymentId: z.string().nullable(),
        amount: z.number().nullable(),
        voteCount: z.number().nullable(),
        createdAt: z.string().nullable(),
      }),
      "Payment status",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      createErrorSchema(z.literal("NOT_FOUND")),
      "Payment not found",
    ),
  },
});

export type GetPaymentStatusRoute = typeof getPaymentStatusRoute;

