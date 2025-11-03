import { createRoute } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";
import { z } from "zod";

import { PaginationQuerySchema } from "@/lib/queries/query.schema";

const tags = ["Votes"];

export const getVoteHistoryRoute = createRoute({
  path: "/votes/history/:profileId",
  method: "get",
  tags,
  summary: "Get vote history for a profile",
  description: "Retrieves the voting history for a specific profile with pagination",
  request: {
    params: z.object({
      profileId: z.string().cuid(),
    }),
    query: PaginationQuerySchema.extend({
      limit: z.coerce.number().optional().default(50),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        votes: z.array(
          z.object({
            id: z.string(),
            modelName: z.string(),
            modelProfileImage: z.string().nullable(),
            contestName: z.string(),
            contestId: z.string(),
            contestSlug: z.string(),
            contestStatus: z.string(),
            contestEndDate: z.string().nullable(),
            voteType: z.enum(["FREE", "PAID"]),
            voteCount: z.number(),
            timestamp: z.string(),
            voteeId: z.string(),
          }),
        ),
        stats: z.object({
          totalVotes: z.number(),
          totalRecords: z.number(),
          freeVotes: z.number(),
          paidVotes: z.number(),
          contestsVotedIn: z.number(),
          uniqueModels: z.number(),
        }),
        pagination: z.object({
          currentPage: z.number(),
          totalPages: z.number(),
          totalCount: z.number(),
          hasNextPage: z.boolean(),
          hasPreviousPage: z.boolean(),
        }),
      }),
      "Vote history with stats and pagination",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      createErrorSchema(z.literal("NOT_FOUND")),
      "Profile not found",
    ),
  },
});

export type GetVoteHistoryRoute = typeof getVoteHistoryRoute;

