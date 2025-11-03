import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";
import { createMessageObjectSchema } from "stoker/openapi/schemas";

import { createPaginatedResponseSchema, PaginationQuerySchema } from "@/lib/queries/query.schema";

const tags = ["Referrals"];

// Generate Referral Code Route
export const generateReferralCode = createRoute({
  path: "/referrals/{userId}/code",
  method: "post",
  tags,
  request: {
    params: z.object({
      userId: z.string(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        referralCode: z.string(),
        referralLink: z.string(),
      }),
      "Referral code generated/retrieved successfully",
    ),
    [HttpStatusCodes.CREATED]: jsonContent(
      z.object({
        referralCode: z.string(),
        referralLink: z.string(),
      }),
      "New referral code created",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      createMessageObjectSchema("User not found"),
      "User not found",
    ),
  },
});

// Generate Social Media Sharing URLs Route
export const generateSocialSharingUrls = createRoute({
  path: "/referrals/{userId}/social-sharing",
  method: "post",
  tags,
  request: {
    params: z.object({
      userId: z.string(),
    }),
    body: jsonContent(
      z.object({
        customMessage: z.string().optional(),
        platform: z.enum(["twitter", "facebook", "instagram", "whatsapp", "telegram", "linkedin", "email"]).optional(),
      }),
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        referralCode: z.string(),
        referralLink: z.string(),
        sharingUrls: z.object({
          twitter: z.string().optional(),
          facebook: z.string().optional(),
          instagram: z.string().optional(),
          whatsapp: z.string().optional(),
          telegram: z.string().optional(),
          linkedin: z.string().optional(),
          email: z.string().optional(),
        }),
        defaultMessage: z.string(),
      }),
      "Social sharing URLs generated successfully",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      createMessageObjectSchema("User not found"),
      "User not found",
    ),
  },
});

// Process Referral Route
export const processReferral = createRoute({
  path: "/referrals/process",
  method: "post",
  tags,
  request: {
    body: jsonContent(
      z.object({
        userId: z.string(),
        referralCode: z.string(),
      }),
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        success: z.boolean(),
        message: z.string(),
        bonusVotesAwarded: z.number(),
        referrerNewCount: z.number(),
      }),
      "Referral processed successfully",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      createMessageObjectSchema("User not found"),
      "User not found",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createMessageObjectSchema("Bad request"),
      "Bad request",
    ),
  },
});

// Get Referral Stats Route
export const getReferralStats = createRoute({
  path: "/referrals/{userId}/stats",
  method: "get",
  tags,
  request: {
    params: z.object({
      userId: z.string(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        referralCode: z.string().nullable(),
        referralLink: z.string().nullable(),
        totalReferrals: z.number(),
        referrals: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            joinedAt: z.string(),
          }),
        ),
        currentTier: z
          .object({
            count: z.number(),
            name: z.string(),
            reward: z.string(),
          })
          .nullable(),
        nextTier: z
          .object({
            count: z.number(),
            name: z.string(),
            reward: z.string(),
          })
          .nullable(),
        progress: z
          .object({
            current: z.number(),
            needed: z.number(),
            remaining: z.number(),
            percentage: z.number(),
          })
          .nullable(),
      }),
      "Referral statistics",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      createMessageObjectSchema("User not found"),
      "User not found",
    ),
  },
});

// Referral Leaderboard Route
export const getReferralLeaderboard = createRoute({
  path: "/referrals/leaderboard",
  method: "get",
  tags,
  summary: "Get referral leaderboard",
  description: "Get a paginated leaderboard of models ranked by their referral count",
  request: {
    query: PaginationQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createPaginatedResponseSchema(
        z.object({
          rank: z.number().describe("The rank position of this model"),
          userId: z.string().describe("The user/model ID"),
          profileId: z.string().nullable().describe("The profile ID if exists"),
          username: z.string().nullable().describe("The model's username"),
          name: z.string().describe("The model's name"),
          profileImage: z.string().nullable().describe("The model's profile image URL"),
          referralCode: z.string().nullable().describe("The model's referral code"),
          totalReferrals: z.number().describe("Total number of successful referrals"),
          currentTier: z
            .object({
              count: z.number(),
              name: z.string(),
              reward: z.string(),
            })
            .nullable()
            .describe("Current tier information"),
        }),
      ),
      "The referral leaderboard for models",
    ),
  },
});

export type GenerateReferralCodeRoute = typeof generateReferralCode;
export type GenerateSocialSharingUrlsRoute = typeof generateSocialSharingUrls;
export type ProcessReferralRoute = typeof processReferral;
export type GetReferralStatsRoute = typeof getReferralStats;
export type GetReferralLeaderboardRoute = typeof getReferralLeaderboard;

