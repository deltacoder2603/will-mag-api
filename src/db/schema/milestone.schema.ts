import { z } from "zod";

import { Milestone_Type } from "@/generated/prisma";

export const MilestoneSelectSchema = z.object({
  id: z.string(),
  profileId: z.string(),
  type: z.nativeEnum(Milestone_Type),
  threshold: z.number(),
  currentValue: z.number(),
  isNotified: z.boolean(),
  notifiedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const MilestoneInsertSchema = z.object({
  profileId: z.string(),
  type: z.nativeEnum(Milestone_Type),
  threshold: z.number().positive(),
  currentValue: z.number().nonnegative(),
  isNotified: z.boolean().optional().default(false),
});

export const MilestoneResponseSchema = z.object({
  id: z.string(),
  type: z.string(),
  threshold: z.number(),
  currentValue: z.number(),
  unlockedAt: z.string(),
  isNotified: z.boolean(),
});

export const MilestoneProgressSchema = z.object({
  totalVotes: z.number(),
  milestones: z.array(
    z.object({
      threshold: z.number(),
      name: z.string(),
      description: z.string(),
      icon: z.string(),
      reward: z.string(),
      isUnlocked: z.boolean(),
      progress: z.number().min(0).max(100),
      unlockedAt: z.string().nullable(),
    }),
  ),
  nextMilestone: z
    .object({
      threshold: z.number(),
      name: z.string(),
      votesNeeded: z.number(),
      progress: z.number(),
    })
    .nullable(),
});

