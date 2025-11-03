import { Hono } from "hono";
import { hc } from "hono/client";

import configureOpenAPI from "@/lib/configure-open-api";
import createApp, { createBaseAPIRouter } from "@/lib/create-app";
import adminNotifications from "@/routes/admin/admin-notifications.index";
import adminVotes from "@/routes/admin/admin-votes.index";
import adminProfileStats from "@/routes/admin/profile-stats.index";
import analytics from "@/routes/analytics/analytics.index";
import auth from "@/routes/auth/auth.index";
import awards from "@/routes/awards/award.index";
import cache from "@/routes/cache/cache.index";
import contestParticipation from "@/routes/contests/contest-participation.index";
import contest from "@/routes/contests/contest.index";
import exportRouter from "@/routes/export/export.index";
import images from "@/routes/images/image.index";
import index from "@/routes/index.route";
import notification from "@/routes/notifications/notification.index";
import payment from "@/routes/payments/payments.index";
import profile from "@/routes/profiles/profile.index";
import ranks from "@/routes/ranks/ranks.index";
import referral from "@/routes/referrals/referral.index";
import search from "@/routes/search/search.index";
import uploadthing from "@/routes/upload/uploadthing.index";
import user from "@/routes/users/user.index";
import voteMultiplier from "@/routes/votes/vote-multiplier.index";
import vote from "@/routes/votes/vote.index";
import milestone from "@/routes/milestones/milestone.index";
import achievement from "@/routes/achievements/achievement.index";
import unlock from "@/routes/unlocks/unlock.index";
import debug from "@/routes/debug/debug.index";
import voter from "@/routes/voters/voter.index";
import spinWheel from "@/routes/spin-wheel/spin-wheel.index";
import favorites from "@/routes/favorites/favorites.index";

import stripeWebhookRouter from "./routes/webhooks/stripe/stripe.index";
import emailWebhookRouter from "./routes/webhooks/email/email.index";

const server = createApp();
configureOpenAPI(server);

const routes = [index, auth, user, profile, notification, contest, awards, contestParticipation, vote, voteMultiplier, ranks, payment, uploadthing, search, analytics, adminVotes, adminNotifications, adminProfileStats, images, exportRouter, cache, referral, milestone, achievement, unlock, debug, voter, spinWheel, favorites] as const;

routes.forEach((route) => {
  server.route("/api/v1", route);
});

server.route("/", stripeWebhookRouter).route("/", emailWebhookRouter);

export type AppType = (typeof routes)[number];

export default server;

// Export the client for external use
export const client = hc<AppType>("http://localhost:8787/");
