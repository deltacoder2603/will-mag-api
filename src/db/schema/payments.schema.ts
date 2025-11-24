import { z } from "zod";

import { Payment_Status } from "@/generated/prisma";

// ===== PAY VOTE REQUEST/RESPONSE =====
export const PayVoteRequestSchema = z.object({
  voteeId: z.string(),
  voterId: z.string(),
  contestId: z.string(),
  voteCount: z.coerce.number().int().positive(),
});

export const PayVoteResponseSchema = z.object({
  url: z.string(),
});

// ===== STRIPE METADATA =====
export const PaymentMetadataSchema = PayVoteRequestSchema.extend({
  paymentId: z.string(),
  type: z.string().default("MODEL_VOTE"),
});

// ===== PAYMENT SCHEMA =====
export const PaymentSchema = z.object({
  id: z.string(),
  amount: z.number(),
  status: z.nativeEnum(Payment_Status),
  stripeSessionId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  payer: z.object({
    id: z.string(),
    user: z.object({
      name: z.string().nullable(),
      username: z.string().nullable(),
      image: z.string().nullable(),
    }),
  }),
  model: z.object({
    id: z.string(),
    user: z.object({
      name: z.string().nullable(),
      username: z.string().nullable(),
      image: z.string().nullable(),
    }),
  }),
  contest: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
  }).nullable(),
  comment: z.string().nullable(),
  voteCount: z.number().nullable(),
});

// ===== TYPE EXPORTS =====
export type PayVoteRequest = z.infer<typeof PayVoteRequestSchema>;
export type PayVoteResponse = z.infer<typeof PayVoteResponseSchema>;
export type PaymentMetadata = z.infer<typeof PaymentMetadataSchema>;
export type Payment = z.infer<typeof PaymentSchema>;
