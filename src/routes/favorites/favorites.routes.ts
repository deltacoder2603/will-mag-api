import { createRoute } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";
import { z } from "zod";

const tags = ["Favorites"];

export const addFavoriteRoute = createRoute({
  path: "/favorites",
  method: "post",
  tags,
  summary: "Add a model to favorites",
  description: "Add a model to the voter's favorites list",
  request: {
    body: jsonContent(
      z.object({
        voterId: z.string().cuid(),
        modelId: z.string().cuid(),
      }),
      "Favorite data",
    ),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      z.object({
        id: z.string(),
        voterId: z.string(),
        modelId: z.string(),
        createdAt: z.string(),
      }),
      "Favorite added successfully",
    ),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      createErrorSchema(z.literal("CONFLICT")),
      "Model already in favorites",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      createErrorSchema(z.literal("NOT_FOUND")),
      "Profile not found",
    ),
  },
});

export const removeFavoriteRoute = createRoute({
  path: "/favorites/:voterId/:modelId",
  method: "delete",
  tags,
  summary: "Remove a model from favorites",
  description: "Remove a model from the voter's favorites list",
  request: {
    params: z.object({
      voterId: z.string().cuid(),
      modelId: z.string().cuid(),
    }),
  },
  responses: {
    [HttpStatusCodes.NO_CONTENT]: {
      description: "Favorite removed successfully",
    },
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      createErrorSchema(z.literal("NOT_FOUND")),
      "Favorite not found",
    ),
  },
});

export const getFavoritesRoute = createRoute({
  path: "/favorites/:voterId",
  method: "get",
  tags,
  summary: "Get favorite models for a voter",
  description: "Retrieves all favorited models for a specific voter",
  request: {
    params: z.object({
      voterId: z.string().cuid(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        favorites: z.array(
          z.object({
            id: z.string(),
            modelId: z.string(),
            modelName: z.string(),
            modelImage: z.string().nullable(),
            modelBio: z.string().nullable(),
            location: z.string().nullable(),
            totalVotes: z.number(),
            activeContests: z.number(),
            createdAt: z.string(),
          }),
        ),
      }),
      "Favorites list",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      createErrorSchema(z.literal("NOT_FOUND")),
      "Profile not found",
    ),
  },
});

export const checkFavoriteRoute = createRoute({
  path: "/favorites/check/:voterId/:modelId",
  method: "get",
  tags,
  summary: "Check if a model is favorited",
  description: "Check if a specific model is in the voter's favorites",
  request: {
    params: z.object({
      voterId: z.string().cuid(),
      modelId: z.string().cuid(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        isFavorite: z.boolean(),
        favoriteId: z.string().nullable(),
      }),
      "Favorite status",
    ),
  },
});

export type AddFavoriteRoute = typeof addFavoriteRoute;
export type RemoveFavoriteRoute = typeof removeFavoriteRoute;
export type GetFavoritesRoute = typeof getFavoritesRoute;
export type CheckFavoriteRoute = typeof checkFavoriteRoute;

