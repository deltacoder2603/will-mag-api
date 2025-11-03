import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";

import { MilestoneProgressSchema, MilestoneResponseSchema } from "@/db/schema/milestone.schema";
import { NotFoundResponse } from "@/lib/openapi.responses";
import { createPaginatedResponseSchema, PaginationQuerySchema } from "@/lib/queries/query.schema";

const tags = ["Milestones"];

export const getProfileMilestones = createRoute({
  path: "/api/v1/milestones/{profileId}",
  method: "get",
  tags,
  summary: "Get profile milestones",
  description: "Get all milestones achieved by a specific profile",
  request: {
    params: z.object({
      profileId: z.string().describe("The profile ID"),
    }),
    query: PaginationQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createPaginatedResponseSchema(MilestoneResponseSchema),
      "Profile milestones",
    ),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse("Profile not found"),
  },
});

export const getMilestoneProgress = createRoute({
  path: "/api/v1/milestones/{profileId}/progress",
  method: "get",
  tags,
  summary: "Get milestone progress",
  description: "Get detailed milestone progress for a profile including next milestones",
  request: {
    params: z.object({
      profileId: z.string().describe("The profile ID"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      MilestoneProgressSchema,
      "Milestone progress details",
    ),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse("Profile not found"),
  },
});

export type GetProfileMilestonesRoute = typeof getProfileMilestones;
export type GetMilestoneProgressRoute = typeof getMilestoneProgress;
