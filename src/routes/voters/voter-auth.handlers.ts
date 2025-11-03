import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "@/types/types";

import { db } from "@/db";
import env from "@/env";
import { sendErrorResponse } from "@/helpers/send-error-response";
import { auth } from "@/lib/auth";
import { generateUniqueUsernameFromEmail } from "@/utils/username";

import type { CheckVoterSessionRoute, VoterOAuthCallbackRoute, VoterSignInEmailRoute, VoterSignInGoogleRoute, VoterSignUpEmailRoute } from "./voter-auth.routes";

/**
 * Voter Sign Up with Email/Password
 */
export const voterSignUpEmail: AppRouteHandler<VoterSignUpEmailRoute> = async (c) => {
  const { email, password, name, username } = c.req.valid("json");

  try {
    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return sendErrorResponse(c, "badRequest", "Email already exists");
    }

    // Generate username if not provided
    let finalUsername = username;
    if (!finalUsername) {
      finalUsername = await generateUniqueUsernameFromEmail(
        email,
        async (uname) => {
          const exists = await db.user.findFirst({
            where: { username: uname },
          });
          return !!exists;
        },
      );
    }

    // Sign up using better-auth
    const result = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name,
        username: finalUsername,
        // @ts-ignore - better-auth types don't include custom fields
        type: "VOTER",
      },
    });

    if (!result || !result.user) {
      return sendErrorResponse(c, "badRequest", "Failed to create account");
    }

    // Ensure user type is VOTER and profile exists
    const [updatedUser, profile] = await db.$transaction([
      db.user.update({
        where: { id: result.user.id },
        data: { type: "VOTER" },
        select: {
          id: true,
          email: true,
          name: true,
          username: true,
          type: true,
        },
      }),
      db.profile.upsert({
        where: { userId: result.user.id },
        create: {
          userId: result.user.id,
          address: "",
        },
        update: {},
        select: { id: true },
      }),
    ]);

    return c.json(
      {
        user: {
          ...updatedUser,
          type: "VOTER" as const,
          profileId: profile.id,
        },
        session: {
          token: result.session?.token || "",
          expiresAt: result.session?.expiresAt || 0,
        },
      },
      HttpStatusCodes.CREATED,
    );
  } catch (error: any) {
    console.error("Voter signup error:", error);
    return sendErrorResponse(c, "badRequest", error.message || "Failed to create voter account");
  }
};

/**
 * Voter Sign In with Email/Password
 */
export const voterSignInEmail: AppRouteHandler<VoterSignInEmailRoute> = async (c) => {
  const { email, password } = c.req.valid("json");

  try {
    // Sign in using better-auth
    const result = await auth.api.signInEmail({
      body: {
        email,
        password,
      },
    });

    if (!result || !result.user) {
      return sendErrorResponse(c, "unauthorized", "Invalid email or password");
    }

    // Ensure user type is VOTER and profile exists
    const user = await db.user.findUnique({
      where: { id: result.user.id },
      select: {
        id: true,
        type: true,
        profile: {
          select: { id: true },
        },
      },
    });

    if (!user) {
      return sendErrorResponse(c, "notFound", "User not found");
    }

    // Update to VOTER type if not set and create profile
    let profileId = user.profile?.id;
    if (!user.type || user.type !== "VOTER" || !profileId) {
      const [, profile] = await db.$transaction([
        db.user.update({
          where: { id: result.user.id },
          data: { type: "VOTER" },
        }),
        db.profile.upsert({
          where: { userId: result.user.id },
          create: {
            userId: result.user.id,
            address: "",
          },
          update: {},
          select: { id: true },
        }),
      ]);
      profileId = profile.id;
    }

    return c.json(
      {
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          username: result.user.username || null,
          type: "VOTER",
          profileId,
        },
        session: {
          token: result.session?.token || "",
          expiresAt: result.session?.expiresAt || 0,
        },
      },
      HttpStatusCodes.OK,
    );
  } catch (error: any) {
    console.error("Voter signin error:", error);
    return sendErrorResponse(c, "unauthorized", "Invalid email or password");
  }
};

/**
 * Voter Sign In with Google OAuth (Initiate)
 */
export const voterSignInGoogle: AppRouteHandler<VoterSignInGoogleRoute> = async (c) => {
  const { callbackUrl } = c.req.valid("json");

  try {
    const baseCallbackUrl = callbackUrl || `${env.PUBLIC_APP_URL}/voter/dashboard`;

    // Generate Google OAuth URL with voter-specific callback
    const oauthUrl = `${env.PUBLIC_APP_URL}/api/v1/auth/sign-in/social?provider=google&callbackURL=${encodeURIComponent(baseCallbackUrl)}&userType=VOTER`;

    return c.json(
      {
        url: oauthUrl,
      },
      HttpStatusCodes.OK,
    );
  } catch (error: any) {
    console.error("Google OAuth initiation error:", error);
    return sendErrorResponse(c, "badRequest", "Failed to initiate Google sign-in");
  }
};

/**
 * Voter OAuth Callback Handler
 */
export const voterOAuthCallback: AppRouteHandler<VoterOAuthCallbackRoute> = async (c) => {
  const { code, state } = c.req.valid("query");

  try {
    // This would typically be handled by better-auth's callback mechanism
    // We'll check the session and ensure voter profile exists

    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (!session || !session.user) {
      return sendErrorResponse(c, "unauthorized", "OAuth authentication failed");
    }

    // Ensure user is VOTER type and has profile
    const [user, profile] = await db.$transaction([
      db.user.update({
        where: { id: session.user.id },
        data: { type: "VOTER" },
        select: {
          id: true,
          email: true,
          name: true,
          username: true,
        },
      }),
      db.profile.upsert({
        where: { userId: session.user.id },
        create: {
          userId: session.user.id,
          address: "",
        },
        update: {},
        select: { id: true },
      }),
    ]);

    return c.json(
      {
        user: {
          ...user,
          type: "VOTER" as const,
          profileId: profile.id,
        },
        session: {
          token: session.session.token,
          expiresAt: new Date(session.session.expiresAt).getTime(),
        },
      },
      HttpStatusCodes.OK,
    );
  } catch (error: any) {
    console.error("OAuth callback error:", error);
    return sendErrorResponse(c, "unauthorized", "OAuth authentication failed");
  }
};

/**
 * Check Voter Session
 */
export const checkVoterSession: AppRouteHandler<CheckVoterSessionRoute> = async (c) => {
  try {
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (!session || !session.user) {
      return sendErrorResponse(c, "unauthorized", "No active session");
    }

    // Ensure user has VOTER type and profile
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        type: true,
        image: true,
        profile: {
          select: { id: true },
        },
      },
    });

    if (!user) {
      return sendErrorResponse(c, "notFound", "User not found");
    }

    // Ensure profile exists for voters
    let profileId = user.profile?.id;
    if (!profileId) {
      const profile = await db.profile.create({
        data: {
          userId: user.id,
          address: "",
        },
        select: { id: true },
      });
      profileId = profile.id;

      // Update user type to VOTER if not set
      if (!user.type) {
        await db.user.update({
          where: { id: user.id },
          data: { type: "VOTER" },
        });
      }
    }

    return c.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
          type: user.type || "VOTER",
          profileId,
          image: user.image,
        },
        session: {
          token: session.session.token,
          expiresAt: new Date(session.session.expiresAt).getTime(),
        },
      },
      HttpStatusCodes.OK,
    );
  } catch (error: any) {
    console.error("Session check error:", error);
    return sendErrorResponse(c, "unauthorized", "Invalid session");
  }
};

