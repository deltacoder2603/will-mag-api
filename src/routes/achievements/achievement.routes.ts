import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";

import { AchievementInsertSchema, AchievementResponseSchema, AchievementSelectSchema } from "@/db/schema/achievement.schema";
import { BadRequestResponse, NotFoundResponse, UnauthorizedResponse } from "@/lib/openapi.responses";
import { createPaginatedResponseSchema, PaginationQuerySchema } from "@/lib/queries/query.schema";

const tags = ["Achievements"];

export const getAllAchievements = createRoute({
  path: "/api/v1/achievements",
  method: "get",
  tags,
  summary: "Get all achievements",
  description: "Get all available achievements in the system",
  request: {
    query: PaginationQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createPaginatedResponseSchema(AchievementSelectSchema),
      "List of all achievements",
    ),
  },
});

export const getProfileAchievements = createRoute({
  path: "/api/v1/achievements/{profileId}",
  method: "get",
  tags,
  summary: "Get profile achievements",
  description: "Get all achievements for a specific profile with unlock status",
  request: {
    params: z.object({
      profileId: z.string().describe("The profile ID"),
    }),
    query: PaginationQuerySchema.extend({
      category: z.string().optional().describe("Filter by achievement category"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createPaginatedResponseSchema(AchievementResponseSchema),
      "Profile achievements with unlock status",
    ),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse("Profile not found"),
  },
});

export const createAchievement = createRoute({
  path: "/api/v1/achievements",
  method: "post",
  tags,
  summary: "Create achievement",
  description: "Create a new achievement (Admin only)",
  request: {
    body: jsonContentRequired(AchievementInsertSchema, "Achievement data"),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      AchievementSelectSchema,
      "Achievement created successfully",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.BAD_REQUEST]: BadRequestResponse("Achievement code already exists"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(AchievementInsertSchema),
      "Validation error",
    ),
  },
});

export const unlockAchievement = createRoute({
  path: "/api/v1/achievements/{profileId}/unlock/{achievementId}",
  method: "post",
  tags,
  summary: "Unlock achievement",
  description: "Manually unlock an achievement for a profile (Admin only)",
  request: {
    params: z.object({
      profileId: z.string().describe("The profile ID"),
      achievementId: z.string().describe("The achievement ID"),
    }),
    body: jsonContentRequired(
      z.object({
        progress: z.number().min(0).max(100).optional().default(100),
      }),
      "Unlock data",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        message: z.string(),
        achievement: AchievementResponseSchema,
      }),
      "Achievement unlocked successfully",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse("Profile or achievement not found"),
    [HttpStatusCodes.BAD_REQUEST]: BadRequestResponse("Achievement already unlocked"),
  },
});

export type GetAllAchievementsRoute = typeof getAllAchievements;
export type GetProfileAchievementsRoute = typeof getProfileAchievements;
export type CreateAchievementRoute = typeof createAchievement;
export type UnlockAchievementRoute = typeof unlockAchievement;
