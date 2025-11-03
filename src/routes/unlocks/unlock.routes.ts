import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";

import { UnlockedContentInsertSchema, UnlockedContentResponseSchema, UnlockProgressSchema } from "@/db/schema/unlock.schema";
import { BadRequestResponse, NotFoundResponse, UnauthorizedResponse } from "@/lib/openapi.responses";
import { createPaginatedResponseSchema, PaginationQuerySchema } from "@/lib/queries/query.schema";

const tags = ["Unlocks"];

export const getUnlockProgress = createRoute({
  path: "/api/v1/unlocks/{profileId}/progress",
  method: "get",
  tags,
  summary: "Get unlock progress",
  description: "Get progress towards unlocking exclusive content for a profile",
  request: {
    params: z.object({
      profileId: z.string().describe("The profile ID"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      UnlockProgressSchema,
      "Unlock progress details",
    ),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse("Profile not found"),
  },
});

export const getProfileUnlocks = createRoute({
  path: "/api/v1/unlocks/{profileId}",
  method: "get",
  tags,
  summary: "Get profile unlocked content",
  description: "Get all unlocked content for a specific profile",
  request: {
    params: z.object({
      profileId: z.string().describe("The profile ID"),
    }),
    query: PaginationQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createPaginatedResponseSchema(UnlockedContentResponseSchema),
      "Unlocked content",
    ),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse("Profile not found"),
  },
});

export const createUnlock = createRoute({
  path: "/api/v1/unlocks",
  method: "post",
  tags,
  summary: "Create unlocked content",
  description: "Manually unlock content for a profile (Admin only)",
  request: {
    body: jsonContentRequired(UnlockedContentInsertSchema, "Unlock data"),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      UnlockedContentResponseSchema,
      "Content unlocked successfully",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse("Profile not found"),
    [HttpStatusCodes.BAD_REQUEST]: BadRequestResponse("Content already unlocked"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(UnlockedContentInsertSchema),
      "Validation error",
    ),
  },
});

export const checkUnlockEligibility = createRoute({
  path: "/api/v1/unlocks/{profileId}/check/{voteThreshold}",
  method: "post",
  tags,
  summary: "Check and unlock content",
  description: "Check if profile has reached vote threshold and auto-unlock content",
  request: {
    params: z.object({
      profileId: z.string().describe("The profile ID"),
      voteThreshold: z.coerce.number().describe("Vote threshold to check"),
    }),
    body: jsonContentRequired(
      z.object({
        contentType: z.string(),
        title: z.string(),
        description: z.string().optional(),
        contentUrl: z.string().optional(),
      }),
      "Content details to unlock",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        eligible: z.boolean(),
        unlocked: z.boolean(),
        currentVotes: z.number(),
        votesNeeded: z.number(),
        content: UnlockedContentResponseSchema.nullable(),
      }),
      "Unlock eligibility result",
    ),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse("Profile not found"),
  },
});

export type GetUnlockProgressRoute = typeof getUnlockProgress;
export type GetProfileUnlocksRoute = typeof getProfileUnlocks;
export type CreateUnlockRoute = typeof createUnlock;
export type CheckUnlockEligibilityRoute = typeof checkUnlockEligibility;
