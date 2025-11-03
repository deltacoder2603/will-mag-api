import * as HttpStatusCodes from "stoker/http-status-codes";
import * as XLSX from "xlsx";

import type { Prisma } from "@/generated/prisma";
import type { AppRouteHandler } from "@/types/types";

import { db } from "@/db";
import { sendErrorResponse } from "@/helpers/send-error-response";

import type { ExportModelDataRoute } from "./model-export.routes";

export const exportModelData: AppRouteHandler<ExportModelDataRoute> = async (c) => {
  const { format, includeInactive, contestId } = c.req.valid("query");
  try {
    // Build where clause for filtering
    const whereClause: Prisma.ProfileWhereInput = {
      user: {
        type: "MODEL",
        isActive: includeInactive ? undefined : true,
      },
    };

    // Get all model profiles with comprehensive data
    const profiles = await db.profile.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            displayUsername: true,
            email: true,
            image: true,
            createdAt: true,
            isActive: true,
          },
        },
        coverImage: {
          select: {
            url: true,
          },
        },
        bannerImage: {
          select: {
            url: true,
          },
        },
        rank: {
          select: {
            manualRank: true,
            computedRank: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        stats: {
          select: {
            freeVotes: true,
            paidVotes: true,
            weightedScore: true,
            lastUpdated: true,
          },
        },
        contestParticipations: {
          where: contestId ? { contestId } : {},
          include: {
            contest: {
              select: {
                id: true,
                name: true,
                description: true,
                prizePool: true,
                startDate: true,
                endDate: true,
                status: true,
                slug: true,
                isFeatured: true,
                isVerified: true,
                winnerProfileId: true,
              },
            },
            coverImage: {
              select: {
                url: true,
              },
            },
          },
        },
        votesReceived: {
          where: contestId ? { contestId } : {},
          select: {
            id: true,
            voterId: true,
            type: true,
            count: true,
            createdAt: true,
            contestId: true,
            contest: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        contestWon: contestId
          ? {
              where: { id: contestId },
              select: {
                id: true,
                name: true,
                prizePool: true,
                endDate: true,
              },
            }
          : {
              select: {
                id: true,
                name: true,
                prizePool: true,
                endDate: true,
              },
            },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Process data for Excel export
    const exportData = profiles.map((profile) => {
      // Calculate contest-specific vote statistics
      const contestVoteStats = profile.contestParticipations.map((participation) => {
        const contestVotes = profile.votesReceived.filter(
          vote => vote.contestId === participation.contestId,
        );

        const freeVotes = contestVotes
          .filter(vote => vote.type === "FREE")
          .reduce((sum, vote) => sum + vote.count, 0);

        const paidVotes = contestVotes
          .filter(vote => vote.type === "PAID")
          .reduce((sum, vote) => sum + vote.count, 0);

        const totalVotes = freeVotes + paidVotes;

        // Calculate rank in this contest
        const contestRank = participation.contest.winnerProfileId === profile.id
          ? 1
          : (participation.contest.status === "COMPLETED" ? "Completed" : "Active");

        return {
          "Contest ID": participation.contest.id,
          "Contest Name": participation.contest.name,
          "Contest Status": participation.contest.status,
          "Contest Start Date": participation.contest.startDate.toISOString().split("T")[0],
          "Contest End Date": participation.contest.endDate.toISOString().split("T")[0],
          "Contest Prize Pool": participation.contest.prizePool,
          "Contest Slug": participation.contest.slug,
          "Participation Status": participation.isParticipating ? "Active" : "Inactive",
          "Participation Approved": participation.isApproved,
          "Participation Created At": participation.createdAt.toISOString().split("T")[0],
          "Free Votes Received": freeVotes,
          "Paid Votes Received": paidVotes,
          "Total Votes Received": totalVotes,
          "Contest Rank": contestRank,
          "Is Winner": participation.contest.winnerProfileId === profile.id,
        };
      });

      // Calculate overall statistics
      const totalFreeVotes = profile.votesReceived
        .filter(vote => vote.type === "FREE")
        .reduce((sum, vote) => sum + vote.count, 0);

      const totalPaidVotes = profile.votesReceived
        .filter(vote => vote.type === "PAID")
        .reduce((sum, vote) => sum + vote.count, 0);

      const totalContestsParticipated = profile.contestParticipations.length;
      const totalContestsWon = profile.contestWon.length;

      return {
        // Profile Information
        "Profile ID": profile.id,
        "Name": profile.user.name,
        "Username": profile.user.username || "",
        "Display Username": profile.user.displayUsername || "",
        "Email": profile.user.email,
        "Bio": profile.bio || "",
        "Address": profile.address,
        "City": profile.city || "",
        "Country": profile.country || "",
        "Postal Code": profile.postalCode || "",
        "Date Of Birth": profile.dateOfBirth?.toISOString().split("T")[0] || "",
        "Gender": profile.gender || "",
        "Phone": profile.phone || "",
        "Instagram": profile.instagram || "",
        "TikTok": profile.tiktok || "",
        "YouTube": profile.youtube || "",
        "Facebook": profile.facebook || "",
        "Twitter": profile.twitter || "",
        "LinkedIn": profile.linkedin || "",
        "Website": profile.website || "",
        "Other": profile.other || "",
        "Hobbies And Passions": profile.hobbiesAndPassions || "",
        "Paid Voter Message": profile.paidVoterMessage || "",
        "Free Voter Message": profile.freeVoterMessage || "",
        "Onboarded At": profile.createdAt.toISOString().split("T")[0],
        "User Created At": profile.user.createdAt.toISOString().split("T")[0],
        "Is Active": profile.user.isActive,

        // Ranking Information
        "Rank": profile.rank?.manualRank || profile.rank?.computedRank || "N/A",
        "Is Manual Rank": !!profile.rank?.manualRank,
        "Rank Created At": profile.rank?.createdAt?.toISOString().split("T")[0] || "",

        // Statistics
        "Total Free Votes": totalFreeVotes,
        "Total Paid Votes": totalPaidVotes,
        "Total Votes Received": totalFreeVotes + totalPaidVotes,
        "Stats Last Updated": profile.stats?.lastUpdated?.toISOString().split("T")[0] || "",

        // Contest Statistics
        "Total Contests Participated": totalContestsParticipated,
        "Total Contests Won": totalContestsWon,

        // Contest Details (will be expanded in separate sheets)
        "contestDetails": contestVoteStats,
      };
    });

    // Create Excel workbook
    const workbook = XLSX.utils.book_new();

    // Main data sheet
    const mainData = exportData.map((profile) => {
      const { contestDetails, ...mainProfileData } = profile;
      return mainProfileData;
    });

    const mainSheet = XLSX.utils.json_to_sheet(mainData);
    XLSX.utils.book_append_sheet(workbook, mainSheet, "Model Profiles");

    // Contest details sheet
    const contestDetailsData = exportData.flatMap(profile =>
      profile.contestDetails.map(contest => ({
        "Profile ID": profile["Profile ID"],
        "Name": profile.Name,
        "Username": profile.Username,
        "Email": profile.Email,
        ...contest,
      })),
    );

    if (contestDetailsData.length > 0) {
      const contestSheet = XLSX.utils.json_to_sheet(contestDetailsData);
      XLSX.utils.book_append_sheet(workbook, contestSheet, "Contest Details");
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `model-export-${timestamp}.${format === "excel" ? "xlsx" : "csv"}`;

    let fileBuffer: Uint8Array;
    let contentType: string;

    if (format === "excel") {
      fileBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    } else {
      // For CSV, we'll export the main data only
      const csvData = XLSX.utils.sheet_to_csv(mainSheet);
      fileBuffer = new TextEncoder().encode(csvData);
      contentType = "text/csv";
    }

    // Set response headers
    c.header("Content-Type", contentType);
    c.header("Content-Disposition", `attachment; filename="${filename}"`);
    c.header("Content-Length", fileBuffer.length.toString());

    return c.body(new Uint8Array(fileBuffer), HttpStatusCodes.OK);
  } catch (error) {
    console.error("Export error:", error);
    return sendErrorResponse(c, "badRequest", "Failed to generate export file");
  }
};
