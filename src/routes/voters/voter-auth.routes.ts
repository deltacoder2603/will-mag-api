import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";

import { BadRequestResponse, UnauthorizedResponse } from "@/lib/openapi.responses";

const tags = ["Voter Auth"];

// Voter Sign Up with Email
export const voterSignUpEmail = createRoute({
  path: "/voter/auth/signup",
  method: "post",
  tags,
  summary: "Voter Sign Up (Email/Password)",
  description: "Create a new voter account with email and password. Automatically sets user type to VOTER and creates profile.",
  request: {
    body: jsonContentRequired(
      z.object({
        email: z.string().email().describe("User's email address"),
        password: z.string().min(6).describe("Password (minimum 6 characters)"),
        name: z.string().describe("User's full name"),
        username: z.string().min(3).max(100).optional().describe("Username (optional, generated from email if not provided)"),
      }),
      "Voter sign up credentials",
    ),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      z.object({
        user: z.object({
          id: z.string(),
          email: z.string(),
          name: z.string(),
          username: z.string().nullable(),
          type: z.literal("VOTER"),
          profileId: z.string().nullable(),
        }),
        session: z.object({
          token: z.string(),
          expiresAt: z.number(),
        }),
      }),
      "Voter account created successfully",
    ),
    [HttpStatusCodes.BAD_REQUEST]: BadRequestResponse("Email already exists or invalid data"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(
        z.object({
          email: z.string().email(),
          password: z.string().min(6),
          name: z.string(),
        }),
      ),
      "Validation error",
    ),
  },
});

// Voter Sign In with Email
export const voterSignInEmail = createRoute({
  path: "/voter/auth/signin",
  method: "post",
  tags,
  summary: "Voter Sign In (Email/Password)",
  description: "Sign in as a voter with email and password. Ensures user type is VOTER and profile exists.",
  request: {
    body: jsonContentRequired(
      z.object({
        email: z.string().email().describe("User's email address"),
        password: z.string().describe("User's password"),
      }),
      "Voter sign in credentials",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        user: z.object({
          id: z.string(),
          email: z.string(),
          name: z.string(),
          username: z.string().nullable(),
          type: z.string(),
          profileId: z.string().nullable(),
        }),
        session: z.object({
          token: z.string(),
          expiresAt: z.number(),
        }),
      }),
      "Signed in successfully",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse("Invalid email or password"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(
        z.object({
          email: z.string().email(),
          password: z.string(),
        }),
      ),
      "Validation error",
    ),
  },
});

// Voter Sign In with Google OAuth
export const voterSignInGoogle = createRoute({
  path: "/voter/auth/google",
  method: "post",
  tags,
  summary: "Voter Sign In (Google OAuth)",
  description: "Initiate Google OAuth sign-in for voters. Returns redirect URL to Google's OAuth page.",
  request: {
    body: jsonContentRequired(
      z.object({
        callbackUrl: z.string().url().optional().describe("URL to redirect after successful authentication"),
      }),
      "OAuth configuration",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        url: z.string().url().describe("Google OAuth authorization URL"),
      }),
      "OAuth URL generated successfully",
    ),
    [HttpStatusCodes.BAD_REQUEST]: BadRequestResponse("Invalid callback URL"),
  },
});

// Voter OAuth Callback
export const voterOAuthCallback = createRoute({
  path: "/voter/auth/callback/google",
  method: "get",
  tags,
  summary: "Voter OAuth Callback",
  description: "Handle Google OAuth callback for voters. Sets user type to VOTER and creates profile.",
  request: {
    query: z.object({
      code: z.string().describe("OAuth authorization code"),
      state: z.string().optional().describe("OAuth state parameter"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        user: z.object({
          id: z.string(),
          email: z.string(),
          name: z.string(),
          username: z.string().nullable(),
          type: z.literal("VOTER"),
          profileId: z.string().nullable(),
        }),
        session: z.object({
          token: z.string(),
          expiresAt: z.number(),
        }),
      }),
      "OAuth authentication successful",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse("OAuth authentication failed"),
    [HttpStatusCodes.BAD_REQUEST]: BadRequestResponse("Invalid OAuth code"),
  },
});

// Check Voter Session
export const checkVoterSession = createRoute({
  path: "/voter/auth/session",
  method: "get",
  tags,
  summary: "Check Voter Session",
  description: "Verify current voter session and return user information",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        user: z.object({
          id: z.string(),
          email: z.string(),
          name: z.string(),
          username: z.string().nullable(),
          type: z.string(),
          profileId: z.string().nullable(),
          image: z.string().nullable(),
        }),
        session: z.object({
          token: z.string(),
          expiresAt: z.number(),
        }),
      }),
      "Session is valid",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse("No active session"),
  },
});

export type VoterSignUpEmailRoute = typeof voterSignUpEmail;
export type VoterSignInEmailRoute = typeof voterSignInEmail;
export type VoterSignInGoogleRoute = typeof voterSignInGoogle;
export type VoterOAuthCallbackRoute = typeof voterOAuthCallback;
export type CheckVoterSessionRoute = typeof checkVoterSession;

