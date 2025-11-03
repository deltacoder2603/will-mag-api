import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";

const tags = ["Debug"];

export const debugUserProfile = createRoute({
  path: "/debug/user-profile",
  method: "get",
  tags,
  summary: "Debug User Profile Data",
  description: "Get current user and profile information for debugging",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        user: z.object({
          id: z.string(),
          username: z.string().nullable(),
          email: z.string(),
          profileId: z.string().nullable(),
        }),
        profile: z.object({
          id: z.string(),
          userId: z.string(),
        }).nullable(),
        votes: z.object({
          totalVotes: z.number(),
          voteRecords: z.number(),
        }),
        milestones: z.array(z.object({
          id: z.string(),
          threshold: z.number(),
          createdAt: z.string(),
        })),
      }),
      "Debug information about current user",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      z.object({ error: z.string() }),
      "Not authenticated",
    ),
  },
});

export type DebugUserProfileRoute = typeof debugUserProfile;
