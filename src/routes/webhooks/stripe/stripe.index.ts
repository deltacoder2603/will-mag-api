// import type z from "zod";

import { Hono } from "hono";
import Stripe from "stripe";

import { db } from "@/db";
import { PaymentMetadataSchema } from "@/db/schema/payments.schema";
import env from "@/env";
import { Icon, Notification_Type } from "@/generated/prisma";
import { checkAndGrantMilestoneSpins } from "@/lib/milestone-spin";
import { updateProfileStatsOnVote } from "@/lib/profile-stats";
import { stripe } from "@/lib/stripe";

// Import email queue system
import { publishEvent } from "../../../../email/queue/eventBus.js";

const webhookSecret = env.STRIPE_WEBHOOK_SECRET!;

const stripeWebhookRouter = new Hono();

stripeWebhookRouter.post("/api/v1/webhooks/stripe", async (c) => {
  const signature = c.req.header("stripe-signature");

  if (!signature) {
    // console.error("❌ Missing Stripe signature header");
    return c.text("Missing Stripe signature", 400);
  }

  let rawBody: string;
  try {
    rawBody = await c.req.text();
  } catch {
    // console.error("❌ Failed to read request body:", error);
    return c.text("Failed to read request body", 400);
  }

  try {
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

    switch (event.type) {
      case "checkout.session.completed":
        sessionCompleted(event);
        break;
      case "checkout.session.expired":
        sessionExpired(event);
        break;
      // case "payment_intent.succeeded":
      //   console.log("✅ Payment intent succeeded:", event.data.object);
      //   // Handle successful payment logic here
      //   break;
      // case "payment_intent.payment_failed":
      //   console.log("❌ Payment intent failed:", event.data.object);
      //   // Handle failed payment logic here
      //   break;
      default:
        // console.log(`⚠️ Unhandled event type: ${event.type}`);
        break;
    }

    return c.text("Success", 200);
  } catch (err) {
    console.error("❌ Stripe signature verification failed:", err);

    if (err instanceof Stripe.errors.StripeSignatureVerificationError) {
      // console.error("🔍 Signature verification details:");
      // console.error("- Error message:", err.message);
      // console.error("- Received signature:", signature);
      // console.error("- Webhook secret used:", `${webhookSecret.substring(0, 10)}...`);
    }

    return c.text("Webhook Error: Invalid signature", 400);
  }
});

export default stripeWebhookRouter;


async function sessionCompleted(event: Stripe.Event) {
  const eventObject = event.data.object as Stripe.Checkout.Session;

  if (!eventObject.metadata) {
    throw new Error("Missing metadata in checkout session");
  }

  // Handle model vote purchase
  const metadata = PaymentMetadataSchema.parse({
    ...eventObject.metadata,
    voteCount: Number.parseInt(eventObject.metadata.voteCount || "1"),
  });
  // console.log("metadata", metadata);

  // Extract comment from custom fields if available
  const comment = eventObject.custom_fields?.find(field => field.key === "comment")?.text?.value || null;

  const totalVoteCount = metadata.voteCount;

  await db.$transaction(async (tx) => {
    const existingPayment = await tx.payment.findUnique({
      where: { id: metadata.paymentId },
    });

    if (!existingPayment)
      return;

    if (existingPayment.status === "COMPLETED" || existingPayment.status === "FAILED")
      return;

    // update payment status and store comment
    await tx.payment.update({
      where: { id: metadata.paymentId },
      data: {
        status: "COMPLETED",
        stripeSessionId: eventObject.id,
        intendedComment: comment,
      },
    });
    // create vote with multiplied count
    await tx.vote.create({
      data: {
        voteeId: metadata.voteeId,
        voterId: metadata.voterId,
        contestId: metadata.contestId,
        type: "PAID",
        paymentId: metadata.paymentId,
        count: totalVoteCount,
        comment,
      },
    });
  });

  // Update ProfileStats for the votee (outside transaction to avoid conflicts)
  // Use totalVoteCount (multiplied) for accurate stats
  await updateProfileStatsOnVote(metadata.voteeId, "PAID", totalVoteCount);

  // Check and grant milestone spins for the voter-model pair
  // Get payment amount from the completed payment
  const completedPayment = await db.payment.findUnique({
    where: { id: metadata.paymentId },
    select: { amount: true },
  });

  if (completedPayment) {
    const milestoneResult = await checkAndGrantMilestoneSpins(
      metadata.voterId,
      metadata.voteeId,
      completedPayment.amount,
    );

    // Notify the voter if they reached a milestone
    if (milestoneResult.granted && milestoneResult.milestoneReached) {
      try {
        await db.notification.create({
          data: {
            profileId: metadata.voterId,
            title: "Milestone Reached! 🎉",
            message: `You've spent $${milestoneResult.milestoneReached} on this model! You've earned a free spin!`,
            type: Notification_Type.SYSTEM,
            icon: Icon.SUCCESS,
            action: "/spin-wheel",
          },
        });
      } catch (error) {
        console.error("Failed to create milestone notification:", error);
      }
    }
  }

  // Notify the votee that they received paid votes
  try {
    const voter = await db.profile.findUnique({
      where: { id: metadata.voterId },
      select: { user: { select: { name: true, username: true, email: true } } },
    });

    const voterName = voter?.user?.name ?? "Someone";
    const voterUsername = voter?.user?.username;
    const votesLabel = totalVoteCount === 1 ? "paid vote" : "paid votes";

    await db.notification.create({
      data: {
        profileId: metadata.voteeId,
        title: "Paid vote received",
        message: `${voterName} sent you ${totalVoteCount} ${votesLabel}`,
        type: Notification_Type.VOTE_PREMIUM,
        icon: Icon.SUCCESS,
        action: voterUsername ? `/profile/${voterUsername}` : undefined,
      },
    });

    // Send vote confirmation email for paid votes (async, non-blocking)
    if (voter?.user?.email) {
      const votee = await db.profile.findUnique({
        where: { id: metadata.voteeId },
        select: { user: { select: { name: true, username: true } } },
      });

      publishEvent.voteCreated({
        voterEmail: voter.user.email,
        modelName: votee?.user?.username ?? votee?.user?.name ?? "Model",
        modelId: metadata.voteeId,
      }).catch((err) => {
        console.error("Failed to queue vote confirmation email:", err);
      });
    }
  } catch {}
}

async function sessionExpired(event: Stripe.Event) {
  const eventObject = event.data.object as Stripe.Checkout.Session;

  if (!eventObject.metadata) {
    throw new Error("Missing metadata in checkout session");
  }

  const comment = eventObject.custom_fields?.find(field => field.key === "comment")?.text?.value || null;

  const metadata = PaymentMetadataSchema.parse({
    ...eventObject.metadata,
    voteCount: Number.parseInt(eventObject.metadata.voteCount || "0"),
  });

  await db.payment.update({
    where: { id: metadata.paymentId },
    data: {
      status: "FAILED",
      stripeSessionId: eventObject.id,
      intendedComment: comment,
    },
  });
}
