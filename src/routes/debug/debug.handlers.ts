import * as HttpStatusCodes from "stoker/http-status-codes";
import type { AppRouteHandler } from "@/types/types";
import { db } from "@/db";
import type { DebugUserProfileRoute } from "./debug.routes";

export const debugUserProfile: AppRouteHandler<DebugUserProfileRoute> = async (c) => {
  const user = c.get("user");
  
  if (!user) {
    return c.json({ error: "Not authenticated" }, HttpStatusCodes.UNAUTHORIZED);
  }

  // Get user's profile
  const profile = await db.profile.findUnique({
    where: { userId: user.id },
    select: { id: true, userId: true },
  });

  // Get vote data if profile exists
  let votes = { totalVotes: 0, voteRecords: 0 };
  let milestones: any[] = [];

  if (profile) {
    // Get total votes
    const voteAggregate = await db.vote.aggregate({
      where: { voteeId: profile.id },
      _sum: { count: true },
    });

    // Get vote record count
    const voteCount = await db.vote.count({
      where: { voteeId: profile.id },
    });

    // Get milestones
    milestones = await db.milestone.findMany({
      where: { profileId: profile.id },
      select: { id: true, threshold: true, createdAt: true },
    });

    votes = {
      totalVotes: voteAggregate._sum.count || 0,
      voteRecords: voteCount,
    };
  }

  return c.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      profileId: user.profileId,
    },
    profile: profile ? {
      id: profile.id,
      userId: profile.userId,
    } : null,
    votes,
    milestones,
  }, HttpStatusCodes.OK);
};
