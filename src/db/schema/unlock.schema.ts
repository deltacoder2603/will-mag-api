import { z } from "zod";

import { Unlock_Content_Type } from "@/generated/prisma";

export const UnlockedContentSelectSchema = z.object({
  id: z.string(),
  profileId: z.string(),
  contentType: z.nativeEnum(Unlock_Content_Type),
  title: z.string(),
  description: z.string().nullable(),
  contentUrl: z.string().nullable(),
  mediaId: z.string().nullable(),
  voteThreshold: z.number(),
  unlockedAt: z.date(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const UnlockedContentInsertSchema = z.object({
  profileId: z.string(),
  contentType: z.nativeEnum(Unlock_Content_Type),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  contentUrl: z.string().url().optional(),
  mediaId: z.string().optional(),
  voteThreshold: z.number().positive(),
  isActive: z.boolean().optional().default(true),
});

export const UnlockProgressSchema = z.object({
  totalVotes: z.number(),
  unlocks: z.array(
    z.object({
      type: z.string(),
      title: z.string(),
      description: z.string().nullable(),
      voteThreshold: z.number(),
      isUnlocked: z.boolean(),
      progress: z.number().min(0).max(100),
      unlockedAt: z.string().nullable(),
      contentUrl: z.string().nullable(),
    }),
  ),
});

export const UnlockedContentResponseSchema = z.object({
  id: z.string(),
  contentType: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  contentUrl: z.string().nullable(),
  voteThreshold: z.number(),
  unlockedAt: z.string(),
  isActive: z.boolean(),
});

