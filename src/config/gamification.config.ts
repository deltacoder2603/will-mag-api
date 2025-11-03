/**
 * Gamification Configuration
 * Centralized configuration for milestones, tiers, and rewards
 * This can be moved to database later for dynamic configuration
 */

import { Milestone_Type } from "@/generated/prisma";

export interface MilestoneConfig {
  type: Milestone_Type;
  threshold: number;
  name: string;
  description: string;
  icon: string;
  reward: string;
  sortOrder: number;
}

export interface ReferralTierConfig {
  minReferrals: number;
  maxReferrals: number | null;
  tierName: string;
  tierLevel: number;
  reward: string;
  description: string;
  icon: string;
  color: string;
}

/**
 * Vote Milestone Configurations
 * Defines all vote count milestones and their rewards
 */
export const VOTE_MILESTONE_CONFIGS: MilestoneConfig[] = [
  {
    type: Milestone_Type.VOTE_COUNT,
    threshold: 100,
    name: "Unlock Exclusive Photo",
    description: "Reach 100 votes to unlock exclusive photo content",
    icon: "Camera",
    reward: "Exclusive Photo Access",
    sortOrder: 1,
  },
  {
    type: Milestone_Type.VOTE_COUNT,
    threshold: 200,
    name: "Unlock Video/Audio Message",
    description: "Reach 200 votes to unlock video/audio message content",
    icon: "Video",
    reward: "Video/Audio Message Access",
    sortOrder: 2,
  },
  {
    type: Milestone_Type.VOTE_COUNT,
    threshold: 500,
    name: "Unlock Private Call",
    description: "Reach 500 votes to unlock private call feature",
    icon: "Phone",
    reward: "Private Call Access",
    sortOrder: 3,
  },
  {
    type: Milestone_Type.VOTE_COUNT,
    threshold: 1000,
    name: "Unlock Signed Merch / Magazine",
    description: "Reach 1000 votes to unlock signed merchandise and magazine feature",
    icon: "Gift",
    reward: "Signed Merch / Magazine Feature",
    sortOrder: 4,
  },
];

/**
 * Referral Tier Configurations
 * Defines all referral tiers and their rewards
 */
export const REFERRAL_TIER_CONFIGS: ReferralTierConfig[] = [
  {
    minReferrals: 0,
    maxReferrals: 4,
    tierName: "Starter",
    tierLevel: 0,
    reward: "Welcome to the referral program",
    description: "Start inviting friends to earn rewards",
    icon: "UserPlus",
    color: "gray",
  },
  {
    minReferrals: 5,
    maxReferrals: 9,
    tierName: "Bronze",
    tierLevel: 1,
    reward: "Bronze Package - 10 bonus votes",
    description: "Refer 5 friends to unlock Bronze tier rewards",
    icon: "Award",
    color: "orange",
  },
  {
    minReferrals: 10,
    maxReferrals: 19,
    tierName: "Silver",
    tierLevel: 2,
    reward: "Silver Package - 25 bonus votes + Featured placement",
    description: "Refer 10 friends to unlock Silver tier rewards",
    icon: "Medal",
    color: "silver",
  },
  {
    minReferrals: 20,
    maxReferrals: 49,
    tierName: "Gold",
    tierLevel: 3,
    reward: "Gold Exclusive Package - 50 bonus votes + VIP badge",
    description: "Refer 20 friends to unlock Gold tier rewards",
    icon: "Trophy",
    color: "gold",
  },
  {
    minReferrals: 50,
    maxReferrals: 99,
    tierName: "Platinum",
    tierLevel: 4,
    reward: "Platinum VIP Package - 100 bonus votes + Premium features",
    description: "Refer 50 friends to unlock Platinum tier rewards",
    icon: "Star",
    color: "blue",
  },
  {
    minReferrals: 100,
    maxReferrals: null,
    tierName: "Diamond",
    tierLevel: 5,
    reward: "Diamond Elite Package - 250 bonus votes + Magazine feature + Exclusive perks",
    description: "Refer 100 friends to unlock the ultimate Diamond tier",
    icon: "Crown",
    color: "purple",
  },
];

/**
 * Helper function to get current tier based on referral count
 */
export function getCurrentTier(referralCount: number): ReferralTierConfig | null {
  const eligibleTiers = REFERRAL_TIER_CONFIGS.filter(
    (tier) =>
      referralCount >= tier.minReferrals &&
      (tier.maxReferrals === null || referralCount <= tier.maxReferrals)
  );

  return eligibleTiers.length > 0 ? eligibleTiers[eligibleTiers.length - 1] : null;
}

/**
 * Helper function to get next tier based on current referral count
 */
export function getNextTier(referralCount: number): ReferralTierConfig | null {
  const nextTiers = REFERRAL_TIER_CONFIGS.filter(
    (tier) => tier.minReferrals > referralCount
  );

  return nextTiers.length > 0 ? nextTiers[0] : null;
}

/**
 * Helper function to get milestone thresholds array
 */
export function getMilestoneThresholds(): number[] {
  return VOTE_MILESTONE_CONFIGS.map(config => config.threshold);
}

/**
 * Helper function to get milestone config by threshold
 */
export function getMilestoneConfig(threshold: number): MilestoneConfig | undefined {
  return VOTE_MILESTONE_CONFIGS.find(config => config.threshold === threshold);
}
