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
  currentMilestone: z.object({
    level: z.number(),
    name: z.string(),
    votesRequired: z.number(),
    isUnlocked: z.boolean(),
  }).nullable(),
  nextMilestone: z.object({
    level: z.number(),
    name: z.string(),
    votesRequired: z.number(),
    votesRemaining: z.number(),
    progress: z.number(),
  }).nullable(),
  achievements: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    icon: z.string(),
    unlockedAt: z.string().nullable(),
    isUnlocked: z.boolean(),
  })),
  unlockedRewards: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    type: z.enum(["PHOTO", "VIDEO", "AUDIO", "CALL", "MERCH"]),
    unlockedAt: z.string(),
    accessUrl: z.string().nullable(),
    accessCode: z.string().nullable(),
  })),
  spinWheelData: z.object({
    availableSpins: z.number(),
    lastSpinAt: z.string().nullable(),
    totalSpins: z.number(),
  }),
});

// Get Voter Statistics
export const getVoterStats = createRoute({
  path: "/voter/{userId}/stats",
  method: "get",
  tags,
  summary: "Get Voter Statistics",
  description: "Get comprehensive statistics for a voter including votes, milestones, achievements, and rewards",
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

// Spin Wheel
export const spinWheel = createRoute({
  path: "/voter/{userId}/spin",
  method: "post",
  tags,
  summary: "Spin the Reward Wheel",
  description: "Spin the wheel to win prizes (requires available spins)",
  request: {
    params: z.object({
      userId: z.string().describe("User ID"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        prize: z.object({
          id: z.string(),
          name: z.string(),
          type: z.enum(["VOTES", "BADGE", "UNLOCK", "DISCOUNT", "SPIN"]),
          value: z.number(),
          description: z.string(),
        }),
        spinsRemaining: z.number(),
      }),
      "Wheel spun successfully",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({ message: z.string() }),
      "No spins available",
    ),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse("User not found"),
  },
});

// Get Voter Progress
export const getVoterProgress = createRoute({
  path: "/voter/{userId}/progress",
  method: "get",
  tags,
  summary: "Get Voter Progress",
  description: "Get detailed progress tracking including milestones and achievements",
  request: {
    params: z.object({
      userId: z.string().describe("User ID"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        totalVotes: z.number(),
        milestones: z.array(z.object({
          level: z.number(),
          name: z.string(),
          votesRequired: z.number(),
          reward: z.string(),
          isUnlocked: z.boolean(),
          unlockedAt: z.string().nullable(),
        })),
        progressToNext: z.object({
          currentVotes: z.number(),
          nextMilestone: z.number(),
          votesNeeded: z.number(),
          percentComplete: z.number(),
        }),
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
export type SpinWheelRoute = typeof spinWheel;
export type GetVoterProgressRoute = typeof getVoterProgress;
