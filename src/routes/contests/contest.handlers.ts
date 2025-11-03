import * as HttpStatusCodes from "stoker/http-status-codes";

import type { Prisma } from "@/generated/prisma";
import type { AppRouteHandler } from "@/types/types";

import { db } from "@/db";
import { sendErrorResponse } from "@/helpers/send-error-response";
import { ContestCacheUtils, getCacheService } from "@/lib/cache";
import { calculatePaginationMetadata } from "@/lib/queries/query.helper";
import { utapi } from "@/lib/uploadthing";
import { generateUniqueSlug } from "@/utils/slugify";

import type { CreateRoute, GetAvailableContestsRoute, GetBySlugRoute, GetContestLeaderboardRoute, GetContestStatsRoute, GetJoinedContestsRoute, GetOneRoute, GetUpcomingContestsRoute, ListRoute, PatchRoute, RemoveContestImageRoute, RemoveRoute, ToggleVotingRoute, UploadContestImagesRoute } from "./contest.routes";

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const { page, limit, status, search } = c.req.valid("query");

  const result = await ContestCacheUtils.cacheContestList(
    page,
    limit,
    status,
    search ?? undefined,
    async () => {
      const now = new Date();
      let whereClause: Prisma.ContestWhereInput = {};

      // Apply status filtering
      switch (status) {
        case "active":
        case "booked":
          whereClause = {
            startDate: {
              lte: now,
            },
            endDate: {
              gte: now,
            },
          };
          break;
        case "upcoming":
          whereClause = {
            startDate: {
              gte: now,
            },
          };
          break;
        case "ended":
          whereClause = {
            endDate: {
              lt: now,
            },
          };
          break;
        case "all":
        default:
          // No filtering - return all contests
          whereClause = {};
          break;
      }

      if (search) {
        whereClause.OR = [
          { name: { contains: search } },
          { description: { contains: search } },
          { slug: { contains: search } },
        ];
      }

      const [contests, total] = await Promise.all([
        db.contest.findMany({
          where: whereClause,
          skip: (page - 1) * limit,
          take: limit,
          include: {
            images: {
              where: {
                status: 'COMPLETED'
              },
              select: {
                id: true,
                url: true,
                key: true,
                caption: true,

              },
            },
            awards: {
              orderBy: {
                createdAt: "asc",
              },
            },
          },
          orderBy: {
            startDate: "asc",
          },
        }),
        db.contest.count({
          where: whereClause,
        }),
      ]);

      const pagination = calculatePaginationMetadata(total, page, limit);

      return {
        data: contests,
        pagination,
      };
    },
    300, // 5 minutes cache
  );

  return c.json(result, HttpStatusCodes.OK);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const { awards, isFeatured, isVerified, isVotingEnabled, ...contest } = c.req.valid("json");

  const providedSlug = typeof contest.slug === "string" && contest.slug.trim().length > 0
    ? contest.slug.trim()
    : contest.name;

  // Ensure slug uniqueness by suffixing with an incrementing number if needed
  const uniqueSlug = await generateUniqueSlug(providedSlug, async (slug) => {
    const existing = await db.contest.findUnique({ where: { slug } });
    return !!existing;
  });

  const insertedContest = await db.contest.create({
    data: {
      ...contest,
      isFeatured: isFeatured ?? undefined,
      isVerified: isVerified ?? undefined,
      isVotingEnabled: isVotingEnabled ?? undefined,
      slug: uniqueSlug,
      awards: {
        createMany: {
          data: awards,
          skipDuplicates: true,
        },
      },
    },
    include: {
      awards: true,
    },
  });

  // Invalidate cache after creating contest
  const cache = getCacheService();
  await cache.invalidateGlobalCache("contest");

  return c.json(insertedContest, HttpStatusCodes.CREATED);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.valid("param");

  const contest = await ContestCacheUtils.cacheContestById(
    id,
    async () => {
      const contest = await db.contest.findUnique({
        where: { id },
        include: {
          images: true,
          awards: true,
        },
      });

      if (!contest) {
        return null;
      }

      return contest;
    },
    600, // 10 minutes cache
  );

  if (!contest) {
    return sendErrorResponse(c, "notFound", "Contest not found");
  }

  return c.json(contest, HttpStatusCodes.OK);
};

export const getBySlug: AppRouteHandler<GetBySlugRoute> = async (c) => {
  const { slug } = c.req.valid("param");

  const contest = await ContestCacheUtils.cacheContestBySlug(
    slug,
    async () => {
      const contest = await db.contest.findUnique({
        where: { slug },
        include: {
          images: true,
          awards: true,
        },
      });

      if (!contest) {
        return null;
      }

      return contest;
    },
    600, // 10 minutes cache
  );

  if (!contest) {
    return sendErrorResponse(c, "notFound", "Contest not found");
  }

  return c.json(contest, HttpStatusCodes.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const contestData = c.req.valid("json");

  const contest = await db.contest.findFirst({
    where: { id },
  });

  if (!contest) {
    return sendErrorResponse(c, "notFound", "Contest not found");
  }

  const trimmedSlug = contestData.slug?.trim();

  // Generate unique slug if slug is being updated
  let finalSlug = contest.slug; // Keep existing slug by default
  if (contestData.slug && trimmedSlug !== contest.slug) {
    const providedSlug = typeof contestData.slug === "string" && contestData.slug.trim().length > 0
      ? contestData.slug.trim()
      : contestData.name ?? contest.name;

    // Only generate new slug if it's different from current
    finalSlug = await generateUniqueSlug(providedSlug, async (slug) => {
      const existing = await db.contest.findFirst({
        where: {
          slug,
          id: { not: id }, // Exclude the current contest
        },
      });
      return !!existing;
    });
  }

  const updatedContest = await db.contest.update({
    where: { id },
    data: {
      ...contestData,
      slug: finalSlug,
      isFeatured: contestData.isFeatured ?? undefined,
      isVerified: contestData.isVerified ?? undefined,
      isVotingEnabled: contestData.isVotingEnabled ?? undefined,
      awards: {
        deleteMany: {
          contestId: id,
        },
        createMany: {
          data: contestData.awards || [],
          skipDuplicates: true,
        },
      },
    },
  });

  // Invalidate cache after updating contest
  const cache = getCacheService();
  await cache.invalidateContestCache(id, "update");
  await cache.invalidateGlobalCache("contest");

  return c.json(updatedContest, HttpStatusCodes.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
  const { id } = c.req.valid("param");

  const contest = await db.contest.findUnique({
    where: { id },
  });

  if (!contest) {
    return sendErrorResponse(c, "notFound", "Contest not found");
  }

  // Delete all related records first, then delete the contest
  await db.$transaction([
    db.contestParticipation.deleteMany({
      where: { contestId: id },
    }),
    db.vote.deleteMany({
      where: { contestId: id },
    }),
    db.contest.delete({
      where: { id },
    }),
  ]);

  // Invalidate cache after deleting contest
  const cache = getCacheService();
  await cache.invalidateContestCache(id, "update");
  await cache.invalidateGlobalCache("contest");

  return c.json({ message: "Contest deleted successfully" }, HttpStatusCodes.OK);
};

export const getUpcomingContests: AppRouteHandler<GetUpcomingContestsRoute> = async (c) => {
  const { page, limit } = c.req.valid("query");

  // Get all upcoming contests
  const now = new Date();

  const [contests, total] = await Promise.all([
    db.contest.findMany({
      where: {
        startDate: {
          gte: now,
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { startDate: "asc" },
      include: {
        awards: true,
        images: {
          where: {
            status: 'COMPLETED'
          },
          select: {
            id: true,
            url: true,
            key: true,
            caption: true,
          },
        },
      },
    }),
    db.contest.count({
      where: {
        startDate: {
          gte: now,
        },
      },
    }),
  ]);

  const pagination = calculatePaginationMetadata(total, page, limit);

  return c.json({
    data: contests,
    pagination,
  }, HttpStatusCodes.OK);
};

export const getAvailableContests: AppRouteHandler<GetAvailableContestsRoute> = async (c) => {
  const { page, limit } = c.req.valid("query");
  const { profileId } = c.req.valid("param");

  const profile = await db.profile.findFirst({
    where: { id: profileId },
  });

  if (!profile) {
    return sendErrorResponse(c, "notFound", "Profile not found");
  }

  const now = new Date();

  const [contests, total] = await Promise.all([
    db.contest.findMany({
      where: {
        endDate: {
          gte: now,
        },
        startDate: {
          gte: now,
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { startDate: "asc" },
      include: {
        awards: true,
        images: {
          where: {
            status: 'COMPLETED'
          },
          select: {
            id: true,
            url: true,
            key: true,
            caption: true,
          },
        },
      },
    }),
    db.contest.count({
      where: {
        endDate: {
          gte: now,
        },
        startDate: {
          gte: now,
        },
      },
    }),
  ]);

  const pagination = calculatePaginationMetadata(total, page, limit);

  return c.json({
    data: contests,
    pagination,
  }, HttpStatusCodes.OK);
};

export const getJoinedContests: AppRouteHandler<GetJoinedContestsRoute> = async (c) => {
  const { page, limit } = c.req.valid("query");
  const { profileId } = c.req.valid("param");

  const profile = await db.profile.findFirst({
    where: { id: profileId },
  });

  if (!profile) {
    return sendErrorResponse(c, "notFound", "Profile not found");
  }

  const [contests, total] = await Promise.all([
    db.contest.findMany({
      where: {
        contestParticipations: {
          some: {
            profileId: profile.id,
          },
        },
      },
      include: {
        awards: true,
        images: {
          where: {
            status: 'COMPLETED'
          },
          select: {
            id: true,
            url: true,
            key: true,
            caption: true,
          },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { startDate: "desc" },
    }),
    db.contest.count({
      where: {
        contestParticipations: {
          some: {
            profileId: profile.id,
          },
        },
      },
    }),
  ]);

  const pagination = calculatePaginationMetadata(total, page, limit);

  return c.json({
    data: contests,
    pagination,
  }, HttpStatusCodes.OK);
};

export const getContestStats: AppRouteHandler<GetContestStatsRoute> = async (c) => {
  const { id } = c.req.valid("param");

  const stats = await ContestCacheUtils.cacheContestStats(
    id,
    async () => {
      const contest = await db.contest.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          prizePool: true,
          startDate: true,
          endDate: true,
        },
      });

      if (!contest) {
        return null;
      }

      const now = new Date();
      const isActive = contest.startDate <= now && contest.endDate >= now;
      const daysRemaining = isActive ? Math.ceil((contest.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : undefined;

      // Aggregate votes
      const [totalVotesAgg, freeVotesAgg, paidVotesAgg] = await Promise.all([
        db.vote.aggregate({
          where: { contestId: id },
          _sum: { count: true },
        }),
        db.vote.aggregate({
          where: { contestId: id, type: "FREE" },
          _sum: { count: true },
        }),
        db.vote.aggregate({
          where: { contestId: id, type: "PAID" },
          _sum: { count: true },
        }),
      ]);

      const totalVotes = totalVotesAgg._sum.count || 0;
      const freeVotes = freeVotesAgg._sum.count || 0;
      const paidVotes = paidVotesAgg._sum.count || 0;

      // Calculate participation statistics
      // Count participants
      const [totalParticipants, approvedParticipants] = await Promise.all([
        db.contestParticipation.count({ where: { contestId: id } }),
        db.contestParticipation.count({ where: { contestId: id, isApproved: true, isParticipating: true } }),
      ]);

      const participationRate = totalParticipants > 0
        ? (approvedParticipants / totalParticipants) * 100
        : 0;

      const pendingParticipants = totalParticipants - approvedParticipants;

      return {
        contestId: contest.id,
        contestName: contest.name,
        totalParticipants,
        approvedParticipants,
        pendingParticipants,
        totalVotes,
        freeVotes,
        paidVotes,
        totalPrizePool: contest.prizePool,
        startDate: contest.startDate.toISOString(),
        endDate: contest.endDate.toISOString(),
        isActive,
        daysRemaining,
        participationRate: Math.round(participationRate * 100) / 100, // 2 decimals
      };
    },
    300, // 5 minutes cache
  );

  if (!stats) {
    return sendErrorResponse(c, "notFound", "Contest not found");
  }

  return c.json(stats, HttpStatusCodes.OK);
};

export const getContestLeaderboard: AppRouteHandler<GetContestLeaderboardRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const { page, limit } = c.req.valid("query");

  const result = await ContestCacheUtils.cacheContestLeaderboard(
    id,
    page,
    limit,
    async () => {
      const contest = await db.contest.findUnique({
        where: { id },
      });

      if (!contest) {
        return null;
      }

      const participants = await db.contestParticipation.findMany({
        where: {
          contestId: id,
          isParticipating: true,
        },
        include: {
          coverImage: true,
          profile: {
            include: {
              coverImage: {
                select: {
                  url: true,
                },
              },
              user: {
                select: {
                  id: true,
                  username: true,
                  displayUsername: true,
                  image: true,
                },
              },
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
      });

      const participantsWithVotes = await Promise.all(
        participants.map(async (participation) => {
          const [freeVotesResult, paidVotesResult] = await Promise.all([
            db.vote.aggregate({
              where: {
                contestId: id,
                voteeId: participation.profileId,
                type: "FREE",
              },
              _sum: {
                count: true,
              },
            }),
            db.vote.aggregate({
              where: {
                contestId: id,
                voteeId: participation.profileId,
                type: "PAID",
              },
              _sum: {
                count: true,
              },
            }),
          ]);

          const freeVotes = freeVotesResult._sum.count || 0;
          const paidVotes = paidVotesResult._sum.count || 0;

          return {
            rank: 0,
            profileId: participation.profileId,
            username: participation.profile.user.username || "",
            displayUsername: participation.profile.user.displayUsername,
            avatarUrl: participation.profile.coverImage?.url || participation.profile.user.image || null,
            bio: participation.profile.bio,
            totalVotes: freeVotes + paidVotes,
            freeVotes,
            paidVotes,
            isParticipating: participation.isParticipating || true,
            coverImage: participation.coverImage?.url || null,
            isApproved: participation.isApproved,
          };
        }),
      );

      // Sort by total votes (descending) and assign ranks
      participantsWithVotes.sort((a, b) => b.totalVotes - a.totalVotes);
      participantsWithVotes.forEach((participant, index) => {
        participant.rank = index + 1;
      });

      // Get total count for pagination
      const total = await db.contestParticipation.count({
        where: {
          contestId: id,
          isParticipating: true,
        },
      });

      const pagination = calculatePaginationMetadata(total, page, limit);

      return {
        data: participantsWithVotes,
        pagination,
      };
    },
    300, // 5 minutes cache
  );

  if (!result) {
    return sendErrorResponse(c, "notFound", "Contest not found");
  }

  return c.json(result, HttpStatusCodes.OK);
};

export const uploadContestImages: AppRouteHandler<UploadContestImagesRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const { files } = c.req.valid("form");

  // Handle both single file and array of files
  const fileArray = Array.isArray(files) ? files : [files];

  if (!fileArray || fileArray.length === 0) {
    return sendErrorResponse(c, "badRequest", "No files uploaded");
  }

  // Check if contest exists
  const contest = await db.contest.findUnique({
    where: { id },
    include: { images: true },
  });

  if (!contest) {
    return sendErrorResponse(c, "notFound", "Contest not found");
  }

  // Upload files using utapi
  const uploaded = await utapi.uploadFiles(fileArray, {
    concurrency: 8,
    acl: "public-read",
    contentDisposition: "inline",
  });

  if (!uploaded || uploaded.length === 0) {
    return sendErrorResponse(c, "badRequest", "Upload failed");
  }

  // Create media records for successfully uploaded files
  const mediaRecords = [];
  for (const upload of uploaded) {
    if (upload.data) {
      const media = await db.media.create({
        data: {
          key: upload.data.key,
          url: upload.data.ufsUrl,
          size: upload.data.size,
          name: upload.data.name,
          status: "COMPLETED",
          mediaType: "CONTEST_IMAGE",
          type: upload.data.type || "image/jpeg",
          contestId: contest.id,
        },
      });
      mediaRecords.push(media);
    }
  }

  if (mediaRecords.length === 0) {
    return sendErrorResponse(c, "badRequest", "No files were successfully uploaded");
  }

  // Get updated contest with all images
  const updatedContest = await db.contest.findUnique({
    where: { id },
    include: {
      images: true,
      awards: true,
    },
  });

  if (!updatedContest) {
    return sendErrorResponse(c, "notFound", "Contest not found after update");
  }

  return c.json(updatedContest, HttpStatusCodes.OK);
};

export const removeContestImage: AppRouteHandler<RemoveContestImageRoute> = async (c) => {
  const { id, imageId } = c.req.valid("param");

  // Check if contest exists
  const contest = await db.contest.findUnique({
    where: { id },
    include: { images: true },
  });

  if (!contest) {
    return sendErrorResponse(c, "notFound", "Contest not found");
  }

  // Check if image exists and belongs to this contest
  const image = await db.media.findFirst({
    where: {
      id: imageId,
      contestId: id,
    },
  });

  if (!image) {
    return sendErrorResponse(c, "notFound", "Image not found or does not belong to this contest");
  }

  try {
    // Delete from file storage
    await utapi.deleteFiles([image.key]);

    // Delete from database
    await db.media.delete({
      where: { id: imageId },
    });

    return c.json({ message: "Image removed successfully" }, HttpStatusCodes.OK);
  } catch (error) {
    console.error("Error removing contest image:", error);
    return sendErrorResponse(c, "badRequest", "Failed to remove image");
  }
};

export const toggleVoting: AppRouteHandler<ToggleVotingRoute> = async (c) => {
  const { id } = c.req.valid("param");

  // Check if contest exists
  const contest = await db.contest.findUnique({
    where: { id },
  });

  if (!contest) {
    return sendErrorResponse(c, "notFound", "Contest not found");
  }

  // Toggle the voting status
  const newVotingStatus = !contest.isVotingEnabled;

  // Update the contest with the new voting status
  const updatedContest = await db.contest.update({
    where: { id },
    data: {
      isVotingEnabled: newVotingStatus,
    },
  });

  // Invalidate cache after updating voting status
  const cache = getCacheService();
  await cache.invalidateContestCache(id, "update");

  const statusMessage = newVotingStatus ? "Voting enabled" : "Voting disabled";

  return c.json({
    message: `${statusMessage} for contest "${contest.name}"`,
    isVotingEnabled: updatedContest.isVotingEnabled,
  }, HttpStatusCodes.OK);
};
