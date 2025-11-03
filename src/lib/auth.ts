import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { adminClient } from "better-auth/client/plugins";
import { bearer, customSession, openAPI, username } from "better-auth/plugins";

import type { User_Type } from "@/generated/prisma";

import { db } from "@/db";
import env from "@/env";
import { sendEmailAction } from "@/helpers/send-email-action";
import { generateUsernameFromEmail } from "@/utils/username";

export const auth = betterAuth({
  appName: "Swing Magazine",
  database: prismaAdapter(db, {
    provider: "mysql",
  }),
  basePath: "/api/v1/auth",
  baseURL: env.PUBLIC_APP_URL,
  trustedOrigins: ["http://localhost:3001", "http://localhost:3000", "http://localhost:5173", "http://localhost:8080", "https://app.swingboudoirmag.com", env.PUBLIC_APP_URL],
  emailAndPassword: {
    requireEmailVerification: false,
    enabled: true,
    minPasswordLength: 6,
    autoSignIn: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmailAction({
        to: user.email,
        subject: "Reset your password",
        meta: {
          description: "Please click the link below to reset your password.",
          link: String(url),
        },
      });
    },
  },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID!,
      clientSecret: env.GOOGLE_CLIENT_SECRET!,
      accessType: "offline",
      prompt: "select_account consent",
      mapProfileToUser(profile) {
        // Validate and clean the profile picture URL
        let imageUrl: string | null = null;
        if (profile.picture && typeof profile.picture === 'string') {
          try {
            const url = new URL(profile.picture);
            // Ensure it's HTTPS and from Google
            if (url.protocol === 'https:' && url.hostname.includes('googleusercontent.com')) {
              imageUrl = url.toString();
            }
          } catch {
            // If URL parsing fails, leave as null
            imageUrl = null;
          }
        }

        return {
          email: profile.email,
          name: profile.name,
          image: imageUrl || undefined,
          username: generateUsernameFromEmail(profile.email),
          displayUsername: profile.name,
        };
      },

    },
  },
  username: {
    enabled: true,
  },

  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          try {
            // For OAuth users, type might not be set, so we default to VOTER
            let userType = (user as any).type;
            
            // If type is missing or invalid, set it to VOTER
            if (!userType || (userType !== "MODEL" && userType !== "VOTER")) {
              await db.user.update({
                where: { id: user.id },
                data: { type: "VOTER" },
              });
              userType = "VOTER";
            }
            
            // Create profile for VOTER users
            if (userType === "VOTER") {
              // Check if profile already exists before creating
              const existingProfile = await db.profile.findUnique({
                where: { userId: user.id },
              });
              
              if (!existingProfile) {
                await db.profile.create({
                  data: {
                    userId: user.id,
                    address: "",
                  },
                });
              }
            }
          } catch (error) {
            console.error("Error in user create hook:", error);
            // Don't throw - let the user creation succeed even if profile creation fails
            // The user can always update their type later
          }
        },
      },
    },
  },
  user: {
    additionalFields: {
      role: {
        type: ["USER", "ADMIN", "MODERATOR"],
        input: false,
      },
      type: {
        type: ["MODEL", "VOTER"],
        input: true,
        required: false, // Not required during OAuth, will default to VOTER in hooks
      },
      emailVerified: {
        type: "date",
        input: false,
      },
      profileId: { type: "string", required: false, input: false },

    },
  },
  session: {
    expiresIn: 30 * 24 * 60 * 60,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
    additionalFields: {
      role: { type: ["USER", "ADMIN", "MODERATOR"], input: false },
      type: { type: ["MODEL", "VOTER"], input: false },
      profileId: { type: "string", required: false, input: false },
    },
  },
  plugins: [
    customSession(async ({ user, session }) => {
      let profile = await db.profile.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });

      // If profile doesn't exist and user is VOTER (or type not set), create it
      if (!profile) {
        const userType = (user as any).type || "VOTER";
        if (userType === "VOTER") {
          try {
            profile = await db.profile.create({
              data: {
                userId: user.id,
                address: "",
              },
              select: { id: true },
            });
            
            // Also update user type to VOTER if not set
            if (!(user as any).type) {
              await db.user.update({
                where: { id: user.id },
                data: { type: "VOTER" },
              });
            }
          } catch (error) {
            console.error("Failed to create profile for user:", user.id, error);
          }
        }
      }

      return {
        user: {
          ...user,
          profileId: profile?.id || null,
          type: ((user as any).type || "VOTER") as User_Type,
        },
        session: {
          ...session,
          profileId: profile?.id || null,
          type: ((user as any).type || "VOTER") as User_Type,
        },
      };
    }),
    username({
      minUsernameLength: 3,
      maxUsernameLength: 100,
      usernameValidator: (username) => {
        if (username === "admin") {
          return false;
        }
        return true;
      },
    }),
    adminClient(),
    openAPI(),
    bearer(),
  ],
  advanced: {
    database: {
      generateId: false,
    },
    crossSubDomainCookies: {
      enabled: true,
    },
  },
  logger: {
    disabled: false,
    level: env.NODE_ENV === "development" ? "debug" : "error",
    log: (level, message, ...args) => {
      // Custom logging implementation - more verbose in development
      if (level === "error") {
        console.error(`[Better Auth ${level.toUpperCase()}] ${message}`, ...args);
      } else if (env.NODE_ENV === "development") {
        console.warn(`[Better Auth ${level.toUpperCase()}] ${message}`, ...args);
      }
    },
  },

});
