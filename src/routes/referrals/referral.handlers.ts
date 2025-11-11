import * as HttpStatusCodes from "stoker/http-status-codes";
import { nanoid } from "nanoid";

import type { AppRouteHandler } from "@/types/types";

import { db } from "@/db";
import { sendErrorResponse } from "@/helpers/send-error-response";
import { calculatePaginationMetadata } from "@/lib/queries/query.helper";
import { REFERRAL_TIER_CONFIGS, getCurrentTier, getNextTier } from "@/config/gamification.config";
import env from "@/env";

import type { GenerateReferralCodeRoute, GenerateSocialSharingUrlsRoute, ProcessReferralRoute, GetReferralStatsRoute, GetReferralLeaderboardRoute } from "./referral.routes";

// Import email queue
import { publishEvent } from "../../../email/queue/eventBus.js";

const frontendUrl = env.FRONTEND_URL.replace(/\/$/, "");

const buildReferralLink = (code: string) => `${frontendUrl}/register?ref=${code}`;

/**
 * Generate or get referral code for user
 */
export const generateReferralCode: AppRouteHandler<GenerateReferralCodeRoute> = async (c) => {
  const { userId } = c.req.valid("param");

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      referralCode: true,
      username: true,
    },
  });

  if (!user) {
    return sendErrorResponse(c, "notFound", "User not found");
  }

  // If user already has a referral code, return it
  if (user.referralCode) {
    return c.json({
      referralCode: user.referralCode,
      referralLink: buildReferralLink(user.referralCode),
    }, HttpStatusCodes.OK);
  }

  // Generate new referral code
  const referralCode = user.username || nanoid(10);

  await db.user.update({
    where: { id: userId },
    data: { referralCode },
  });

  return c.json({
    referralCode,
    referralLink: buildReferralLink(referralCode),
  }, HttpStatusCodes.CREATED);
};

/**
 * Generate social media sharing URLs for referral link
 */
export const generateSocialSharingUrls: AppRouteHandler<GenerateSocialSharingUrlsRoute> = async (c) => {
  const { userId } = c.req.valid("param");
  const { customMessage, platform } = c.req.valid("json");

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      referralCode: true,
      username: true,
      name: true,
    },
  });

  if (!user) {
    return sendErrorResponse(c, "notFound", "User not found");
  }

  // Generate referral code if user doesn't have one
  let referralCode = user.referralCode;
  if (!referralCode) {
    referralCode = user.username || nanoid(10);
    await db.user.update({
      where: { id: userId },
      data: { referralCode },
    });
  }

  const referralLink = buildReferralLink(referralCode);
  
  // Default sharing message
  const defaultMessage = customMessage || `Join me on Swing Magazine! Use my referral link to get started: ${referralLink}`;
  
  // Generate sharing URLs for different platforms
  const sharingUrls: Record<string, string> = {};
  
  // Twitter
  const twitterMessage = encodeURIComponent(defaultMessage);
  sharingUrls.twitter = `https://twitter.com/intent/tweet?text=${twitterMessage}`;
  
  // Facebook
  const facebookMessage = encodeURIComponent(defaultMessage);
  sharingUrls.facebook = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}&quote=${facebookMessage}`;
  
  // WhatsApp
  const whatsappMessage = encodeURIComponent(defaultMessage);
  sharingUrls.whatsapp = `https://wa.me/?text=${whatsappMessage}`;
  
  // Telegram
  const telegramMessage = encodeURIComponent(defaultMessage);
  sharingUrls.telegram = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${telegramMessage}`;
  
  // LinkedIn
  const linkedinMessage = encodeURIComponent(defaultMessage);
  sharingUrls.linkedin = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}&summary=${linkedinMessage}`;
  
  // Email
  const emailSubject = encodeURIComponent("Join me on Swing Magazine!");
  const emailBody = encodeURIComponent(defaultMessage);
  sharingUrls.email = `mailto:?subject=${emailSubject}&body=${emailBody}`;
  
  // Instagram (note: Instagram doesn't support direct URL sharing, so we provide the text to copy)
  sharingUrls.instagram = `instagram://library`; // This will open Instagram's library

  return c.json({
    referralCode,
    referralLink,
    sharingUrls,
    defaultMessage,
  }, HttpStatusCodes.OK);
};

/**
 * Process referral when new user signs up
 */
export const processReferral: AppRouteHandler<ProcessReferralRoute> = async (c) => {
  const { userId, referralCode } = c.req.valid("json");

  const [newUser, referrer] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, include: { profile: true } }),
    db.user.findUnique({ where: { referralCode }, include: { profile: true } }),
  ]);

  if (!newUser) {
    return sendErrorResponse(c, "notFound", "User not found");
  }

  if (!referrer) {
    return sendErrorResponse(c, "notFound", "Invalid referral code");
  }

  if (newUser.referredById) {
    return sendErrorResponse(c, "badRequest", "User already has a referrer");
  }

  // Link the referral and award bonus votes
  await db.$transaction(async (tx) => {
    // Update new user's referredBy
    await tx.user.update({
      where: { id: userId },
      data: { referredById: referrer.id },
    });

    // Increment referrer's count
    await tx.user.update({
      where: { id: referrer.id },
      data: { referralCount: { increment: 1 } },
    });

    // Award +50 bonus votes to referrer's profile
    if (referrer.profile) {
      await tx.profileStats.upsert({
        where: { profileId: referrer.profile.id },
        create: {
          profileId: referrer.profile.id,
          freeVotes: 50,
          weightedScore: 50,
        },
        update: {
          freeVotes: { increment: 50 },
          weightedScore: { increment: 50 },
        },
      });
    }
  });

  // Check for milestone and send email (async, non-blocking)
  const updatedReferrer = await db.user.findUnique({
    where: { id: referrer.id },
    select: { email: true, name: true, referralCount: true },
  });

  if (updatedReferrer) {
    // Check if user just hit a tier milestone using config
    const achievedTier = REFERRAL_TIER_CONFIGS.find(tier => tier.minReferrals === updatedReferrer.referralCount);

    if (achievedTier && updatedReferrer.email) {
      // User just hit a tier milestone!
      const nextTier = getNextTier(updatedReferrer.referralCount);
      
      publishEvent.referralMilestone({
        userEmail: updatedReferrer.email,
        userName: updatedReferrer.name,
        referralCount: updatedReferrer.referralCount,
        tierName: achievedTier.tierName,
        rewardName: achievedTier.reward,
        rewardId: `ref-${referrer.id}-${Date.now()}`,
        nextTierCount: nextTier?.minReferrals || null,
      }).catch((err) => {
        console.error("Failed to queue referral milestone email:", err);
      });
    }
  }

  return c.json({
    success: true,
    message: "Referral processed successfully",
    bonusVotesAwarded: 50,
    referrerNewCount: updatedReferrer?.referralCount || 0,
  }, HttpStatusCodes.OK);
};

/**
 * Get referral statistics for a user
 */
export const getReferralStats: AppRouteHandler<GetReferralStatsRoute> = async (c) => {
  const { userId } = c.req.valid("param");

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      referralCode: true,
      referralCount: true,
      referrals: {
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
      },
    },
  });

  if (!user) {
    return sendErrorResponse(c, "notFound", "User not found");
  }

  // Get tier info from configuration (helper functions fetch from REFERRAL_TIER_CONFIGS)
  const currentTier = getCurrentTier(user.referralCount);
  const nextTier = getNextTier(user.referralCount);

  return c.json({
    referralCode: user.referralCode,
    referralLink: user.referralCode ? buildReferralLink(user.referralCode) : null,
    totalReferrals: user.referralCount,
    referrals: user.referrals.map(r => ({
      id: r.id,
      name: r.name,
      joinedAt: r.createdAt.toISOString(),
    })),
    currentTier: currentTier ? {
      count: currentTier.minReferrals,
      name: currentTier.tierName,
      reward: currentTier.reward,
    } : null,
    nextTier: nextTier ? {
      count: nextTier.minReferrals,
      name: nextTier.tierName,
      reward: nextTier.reward,
    } : null,
    progress: nextTier
      ? {
        current: user.referralCount,
        needed: nextTier.minReferrals,
        remaining: nextTier.minReferrals - user.referralCount,
        percentage: Math.round((user.referralCount / nextTier.minReferrals) * 100),
      }
      : null,
  }, HttpStatusCodes.OK);
};

/**
 * Get referral leaderboard for all models
 * Shows models ranked by total referrals
 */
export const getReferralLeaderboard: AppRouteHandler<GetReferralLeaderboardRoute> = async (c) => {
  const { page = 1, limit = 20 } = c.req.valid("query");

  // Get all users with MODEL type and referral data, ordered by referralCount
  const [users, total] = await Promise.all([
    db.user.findMany({
      where: {
        type: "MODEL",
        referralCount: {
          gt: 0, // Only include models with at least 1 referral
        },
      },
      select: {
        id: true,
        username: true,
        name: true,
        image: true,
        referralCode: true,
        referralCount: true,
        profile: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        referralCount: "desc",
      },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.user.count({
      where: {
        type: "MODEL",
        referralCount: {
          gt: 0,
        },
      },
    }),
  ]);

  // Transform data with ranking and tier information from config
  const leaderboard = users.map((user, index) => {
    const currentTier = getCurrentTier(user.referralCount);

    return {
      rank: (page - 1) * limit + index + 1,
      userId: user.id,
      profileId: user.profile?.id || null,
      username: user.username,
      name: user.name,
      profileImage: user.image,
      referralCode: user.referralCode,
      totalReferrals: user.referralCount,
      currentTier: currentTier ? {
        count: currentTier.minReferrals,
        name: currentTier.tierName,
        reward: currentTier.reward,
      } : null,
    };
  });

  const pagination = calculatePaginationMetadata(total, page, limit);

  return c.json({ data: leaderboard, pagination }, HttpStatusCodes.OK);
};

