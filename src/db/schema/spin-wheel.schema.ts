import { z } from "zod";

// Enum for reward types
export const SpinRewardTypeSchema = z.enum([
  "BONUS_VOTES",
  "VOTE_MULTIPLIER",
  "PERSONAL_MESSAGE",
  "INSTAGRAM_FEATURE",
  "EXCLUSIVE_BADGE",
  "MAGAZINE_FOLLOW_BACK",
  "DIGITAL_BOUDOIR_ACCESS",
  "BTS_VIDEO_LINK",
  "VOTE_MULTIPLIER_TOKEN",
  "FREE_RETRY_SPIN",
  "MEET_GREET_DISCOUNT",
]);

export type SpinRewardType = z.infer<typeof SpinRewardTypeSchema>;

// Schema for creating a spin wheel reward
export const CreateSpinWheelRewardSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().min(1),
  icon: z.string().max(100),
  probability: z.number().min(0).max(100),
  popupMessage: z.string().min(1),
  rewardType: SpinRewardTypeSchema,
  rewardValue: z.number().int().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

// Schema for updating a spin wheel reward
export const UpdateSpinWheelRewardSchema = CreateSpinWheelRewardSchema.partial();

// Schema for spinning the wheel
export const SpinWheelRequestSchema = z.object({
  profileId: z.string().cuid(),
});

// Schema for getting spin history
export const GetSpinHistoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// Schema for getting active prizes
export const GetActivePrizesQuerySchema = z.object({
  includeExpired: z.coerce.boolean().default(false),
});

// Schema for claiming a prize
export const ClaimPrizeRequestSchema = z.object({
  prizeId: z.string().cuid(),
});

