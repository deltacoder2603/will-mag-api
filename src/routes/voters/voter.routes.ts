import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";

import { NotFoundResponse, UnauthorizedResponse } from "@/lib/openapi.responses";

const tags = ["Voter"];

// Voter Stats Schema
const VoterStatsSchema = z.object({
  totalVotes: z.number().describe("Total votes cast by voter"),
  freeVotes: z.number().describe("Free votes cast"),
  paidVotes: z.number().describe("Paid votes cast"),
  contestsVotedIn: z.number().describe("Number of contests voted in"),
  favoriteModels: z.array(z.object({
    profileId: z.string(),
    modelName: z.string(),
    voteCount: z.number(),
    avatarUrl: z.string().nullable(),
  })).describe("Top 5 models voted for"),
});

// Get Voter Statistics
export const getVoterStats = createRoute({
  path: "/voter/{userId}/stats",
  method: "get",
  tags,
  summary: "Get Voter Statistics",
  description: "Get comprehensive statistics for a voter including votes and favorite models",
  request: {
    params: z.object({
      userId: z.string().describe("User ID"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      VoterStatsSchema,
      "Voter statistics retrieved successfully",
    ),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse("User not found"),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
  },
});

// Get Available Contests for Voting
export const getAvailableContests = createRoute({
  path: "/voter/{userId}/contests",
  method: "get",
  tags,
  summary: "Get Available Contests",
  description: "Get list of active contests available for voting",
  request: {
    params: z.object({
      userId: z.string().describe("User ID"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        contests: z.array(z.object({
          id: z.string(),
          name: z.string(),
          slug: z.string(),
          prizePool: z.number(),
          startDate: z.string().nullable(),
          endDate: z.string().nullable(),
          status: z.string(),
          images: z.array(z.object({
            url: z.string(),
            caption: z.string().nullable(),
          })),
          participantCount: z.number(),
          totalVotes: z.number(),
          userVoteCount: z.number().describe("Votes cast by this user in this contest"),
        })),
      }),
      "Available contests retrieved successfully",
    ),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse("User not found"),
  },
});

// Get Contest Participants for Voting
export const getContestParticipants = createRoute({
  path: "/voter/contest/{contestId}/participants",
  method: "get",
  tags,
  summary: "Get Contest Participants",
  description: "Get list of models participating in a contest for voting",
  request: {
    params: z.object({
      contestId: z.string().describe("Contest ID"),
    }),
    query: z.object({
      userId: z.string().optional().describe("User ID to get vote counts"),
      sortBy: z.enum(["votes", "recent", "name"]).optional().default("votes"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        participants: z.array(z.object({
          profileId: z.string(),
          contestParticipationId: z.string(),
          modelName: z.string(),
          username: z.string().nullable(),
          bio: z.string().nullable(),
          avatarUrl: z.string().nullable(),
          coverImageUrl: z.string().nullable(),
          totalVotes: z.number(),
          rank: z.number(),
          userVoteCount: z.number().describe("Votes cast by requesting user"),
          joinedAt: z.string(),
        })),
      }),
      "Contest participants retrieved successfully",
    ),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse("Contest not found"),
  },
});

// Get Voter Progress
export const getVoterProgress = createRoute({
  path: "/voter/{userId}/progress",
  method: "get",
  tags,
  summary: "Get Voter Progress",
  description: "Get detailed voting history and progress",
  request: {
    params: z.object({
      userId: z.string().describe("User ID"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        totalVotes: z.number(),
        votingHistory: z.array(z.object({
          date: z.string(),
          voteCount: z.number(),
          contestName: z.string(),
        })),
      }),
      "Voter progress retrieved successfully",
    ),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse("User not found"),
  },
});

export type GetVoterStatsRoute = typeof getVoterStats;
export type GetAvailableContestsRoute = typeof getAvailableContests;
export type GetContestParticipantsRoute = typeof getContestParticipants;
export type GetVoterProgressRoute = typeof getVoterProgress;
