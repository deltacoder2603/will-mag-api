import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";

import {
  ClaimPrizeRequestSchema,
  GetActivePrizesQuerySchema,
  GetSpinHistoryQuerySchema,
  SpinWheelRequestSchema,
} from "@/db/schema/spin-wheel.schema";

const tags = ["Spin Wheel"];

// Response schemas
const SpinWheelRewardResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  icon: z.string(),
  probability: z.number(),
  popupMessage: z.string(),
  rewardType: z.string(),
  rewardValue: z.number().nullable(),
  isActive: z.boolean(),
  sortOrder: z.number(),
});

const SpinResultResponseSchema = z.object({
  reward: SpinWheelRewardResponseSchema,
  prizeId: z.string().optional(),
  message: z.string(),
});

const SpinHistoryItemSchema = z.object({
  id: z.string(),
  rewardName: z.string(),
  rewardType: z.string(),
  spunAt: z.string(),
});

const SpinHistoryResponseSchema = z.object({
  data: z.array(SpinHistoryItemSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

const ActivePrizeSchema = z.object({
  id: z.string(),
  prizeType: z.string(),
  prizeValue: z.number().nullable(),
  isActive: z.boolean(),
  isClaimed: z.boolean(),
  claimedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  createdAt: z.string(),
});

const ActivePrizesResponseSchema = z.object({
  prizes: z.array(ActivePrizeSchema),
});

// Routes

export const spinWheelRoute = createRoute({
  path: "/spin-wheel/spin",
  method: "post",
  tags,
  summary: "Spin the wheel",
  description: "Spin the wheel and get a random reward",
  request: {
    body: jsonContentRequired(SpinWheelRequestSchema, "Spin wheel request"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      SpinResultResponseSchema,
      "Spin result with reward details",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(z.literal("BAD_REQUEST")),
      "Invalid request or user has already spun today",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      createErrorSchema(z.literal("NOT_FOUND")),
      "Profile not found",
    ),
  },
});

export const getAvailableRewardsRoute = createRoute({
  path: "/spin-wheel/rewards",
  method: "get",
  tags,
  summary: "Get all available spin wheel rewards",
  description: "Returns all active rewards that can be won from the spin wheel",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({ rewards: z.array(SpinWheelRewardResponseSchema) }),
      "List of available rewards",
    ),
  },
});

export const getSpinHistoryRoute = createRoute({
  path: "/spin-wheel/history/:profileId",
  method: "get",
  tags,
  summary: "Get user's spin history",
  description: "Returns paginated history of all spins by a user",
  request: {
    params: z.object({
      profileId: z.string().cuid(),
    }),
    query: GetSpinHistoryQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      SpinHistoryResponseSchema,
      "Paginated spin history",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      createErrorSchema(z.literal("NOT_FOUND")),
      "Profile not found",
    ),
  },
});

export const getActivePrizesRoute = createRoute({
  path: "/spin-wheel/prizes/:profileId",
  method: "get",
  tags,
  summary: "Get user's active prizes",
  description: "Returns all active prizes for a user that can be claimed or are in effect",
  request: {
    params: z.object({
      profileId: z.string().cuid(),
    }),
    query: GetActivePrizesQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      ActivePrizesResponseSchema,
      "List of active prizes",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      createErrorSchema(z.literal("NOT_FOUND")),
      "Profile not found",
    ),
  },
});

export const claimPrizeRoute = createRoute({
  path: "/spin-wheel/claim",
  method: "post",
  tags,
  summary: "Claim a prize",
  description: "Claim a prize that was won from spinning the wheel",
  request: {
    body: jsonContentRequired(ClaimPrizeRequestSchema, "Claim prize request"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({ success: z.boolean(), message: z.string() }),
      "Prize claimed successfully",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(z.literal("BAD_REQUEST")),
      "Prize already claimed or expired",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      createErrorSchema(z.literal("NOT_FOUND")),
      "Prize not found",
    ),
  },
});

export const canSpinTodayRoute = createRoute({
  path: "/spin-wheel/can-spin/:profileId",
  method: "get",
  tags,
  summary: "Check if user can spin today",
  description: "Checks if the user has already spun the wheel in the last 24 hours or has a retry spin prize",
  request: {
    params: z.object({
      profileId: z.string().cuid(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        canSpin: z.boolean(),
        nextSpinAt: z.string().nullable(),
        hasRetryPrize: z.boolean().optional(),
        retryPrizeId: z.string().optional(),
      }),
      "Can spin status",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      createErrorSchema(z.literal("NOT_FOUND")),
      "Profile not found",
    ),
  },
});

export const useMultiplierTokenRoute = createRoute({
  path: "/spin-wheel/use-token",
  method: "post",
  tags,
  summary: "Use a vote multiplier token",
  description: "Activate a 10x vote multiplier token for a single vote",
  request: {
    body: jsonContentRequired(
      z.object({
        tokenId: z.string().cuid(),
        profileId: z.string().cuid(),
      }),
      "Use token request",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        success: z.boolean(),
        message: z.string(),
        multiplier: z.number(),
      }),
      "Token activated successfully",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(z.literal("BAD_REQUEST")),
      "Token not available or already used",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      createErrorSchema(z.literal("NOT_FOUND")),
      "Token not found",
    ),
  },
});

export type SpinWheelRoute = typeof spinWheelRoute;
export type GetAvailableRewardsRoute = typeof getAvailableRewardsRoute;
export type GetSpinHistoryRoute = typeof getSpinHistoryRoute;
export type GetActivePrizesRoute = typeof getActivePrizesRoute;
export type ClaimPrizeRoute = typeof claimPrizeRoute;
export type CanSpinTodayRoute = typeof canSpinTodayRoute;
export type UseMultiplierTokenRoute = typeof useMultiplierTokenRoute;
