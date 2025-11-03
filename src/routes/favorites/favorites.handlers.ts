import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "@/types/types";

import { db } from "@/db";
import { sendErrorResponse } from "@/helpers/send-error-response";

import type {
  AddFavoriteRoute,
  RemoveFavoriteRoute,
  GetFavoritesRoute,
  CheckFavoriteRoute,
} from "./favorites.routes";

/**
 * Add a model to favorites
 */
export const addFavorite: AppRouteHandler<AddFavoriteRoute> = async (c) => {
  const { voterId, modelId } = c.req.valid("json");

  // Validate both profiles exist
  const [voter, model] = await Promise.all([
    db.profile.findUnique({ where: { id: voterId } }),
    db.profile.findUnique({ where: { id: modelId } }),
  ]);

  if (!voter || !model) {
    return sendErrorResponse(c, "notFound", "Profile not found");
  }

  // Check if already favorited
  const existing = await db.favorite.findUnique({
    where: {
      voterId_modelId: {
        voterId,
        modelId,
      },
    },
  });

  if (existing) {
    return sendErrorResponse(c, "conflict", "Model already in favorites");
  }

  // Create favorite
  const favorite = await db.favorite.create({
    data: {
      voterId,
      modelId,
    },
  });

  return c.json(
    {
      id: favorite.id,
      voterId: favorite.voterId,
      modelId: favorite.modelId,
      createdAt: favorite.createdAt.toISOString(),
    },
    HttpStatusCodes.CREATED,
  );
};

/**
 * Remove a model from favorites
 */
export const removeFavorite: AppRouteHandler<RemoveFavoriteRoute> = async (c) => {
  const { voterId, modelId } = c.req.valid("param");

  const favorite = await db.favorite.findUnique({
    where: {
      voterId_modelId: {
        voterId,
        modelId,
      },
    },
  });

  if (!favorite) {
    return sendErrorResponse(c, "notFound", "Favorite not found");
  }

  await db.favorite.delete({
    where: { id: favorite.id },
  });

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};

/**
 * Get all favorite models for a voter
 */
export const getFavorites: AppRouteHandler<GetFavoritesRoute> = async (c) => {
  const { voterId } = c.req.valid("param");

  // Validate voter exists
  const voter = await db.profile.findUnique({ where: { id: voterId } });
  if (!voter) {
    return sendErrorResponse(c, "notFound", "Profile not found");
  }

  // Get favorites with model details
  const favorites = await db.favorite.findMany({
    where: { voterId },
    include: {
      model: {
        include: {
          user: {
            select: {
              name: true,
              image: true,
            },
          },
          stats: true,
          contestParticipations: {
            where: {
              contest: {
                status: "ACTIVE",
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Transform data for frontend
  const formattedFavorites = favorites.map((fav) => ({
    id: fav.id,
    modelId: fav.modelId,
    modelName: fav.model.user?.name || "Unknown Model",
    modelImage: fav.model.user?.image || null,
    modelBio: fav.model.bio || null,
    location: fav.model.city && fav.model.country
      ? `${fav.model.city}, ${fav.model.country}`
      : fav.model.city || fav.model.country || null,
    totalVotes: (fav.model.stats?.freeVotes || 0) + (fav.model.stats?.paidVotes || 0),
    activeContests: fav.model.contestParticipations.length,
    createdAt: fav.createdAt.toISOString(),
  }));

  return c.json(
    {
      favorites: formattedFavorites,
    },
    HttpStatusCodes.OK,
  );
};

/**
 * Check if a model is favorited
 */
export const checkFavorite: AppRouteHandler<CheckFavoriteRoute> = async (c) => {
  const { voterId, modelId } = c.req.valid("param");

  const favorite = await db.favorite.findUnique({
    where: {
      voterId_modelId: {
        voterId,
        modelId,
      },
    },
  });

  return c.json(
    {
      isFavorite: !!favorite,
      favoriteId: favorite?.id || null,
    },
    HttpStatusCodes.OK,
  );
};

