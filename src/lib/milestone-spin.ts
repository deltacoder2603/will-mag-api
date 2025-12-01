import { db } from "@/db";

/**
 * Calculate the next milestone based on current spending
 * Milestones: 50, 100, 200, 300, 400, 500, etc. (every 100 after 100)
 */
function getNextMilestone(currentSpent: number): number | null {
  if (currentSpent < 50) {
    return 50;
  }
  if (currentSpent < 100) {
    return 100;
  }
  // After 100, milestones are every 100
  const nextMilestone = Math.ceil(currentSpent / 100) * 100;
  return nextMilestone;
}

/**
 * Get all milestones that should have been reached but haven't been granted yet
 */
function getUnreachedMilestones(currentSpent: number, lastMilestoneReached: number | null): number[] {
  const milestones: number[] = [];
  
  // First milestone at 50
  if (currentSpent >= 50 && (lastMilestoneReached === null || lastMilestoneReached < 50)) {
    milestones.push(50);
  }
  
  // Second milestone at 100
  if (currentSpent >= 100 && (lastMilestoneReached === null || lastMilestoneReached < 100)) {
    milestones.push(100);
  }
  
  // After 100, milestones are every 100
  if (currentSpent >= 100) {
    // Start from the next milestone after the last one reached (or 200 if none reached yet)
    const startMilestone = lastMilestoneReached && lastMilestoneReached >= 100 
      ? lastMilestoneReached + 100 
      : 200;
    
    // Add all milestones from start to current spent (in steps of 100)
    for (let milestone = startMilestone; milestone <= currentSpent; milestone += 100) {
      milestones.push(milestone);
    }
  }
  
  return milestones;
}

/**
 * Check and grant milestone spins for a voter-model pair
 * This should be called after a payment is completed
 */
export async function checkAndGrantMilestoneSpins(
  voterId: string,
  modelId: string,
  paymentAmount: number,
): Promise<{ granted: boolean; milestoneReached: number | null }> {
  try {
    // Get or create milestone tracking record
    let milestone = await db.voterModelMilestone.findUnique({
      where: {
        voterId_modelId: {
          voterId,
          modelId,
        },
      },
    });

    if (!milestone) {
      // Create new milestone record
      milestone = await db.voterModelMilestone.create({
        data: {
          voterId,
          modelId,
          totalSpent: paymentAmount,
        },
      });
    } else {
      // Update total spent
      milestone = await db.voterModelMilestone.update({
        where: {
          id: milestone.id,
        },
        data: {
          totalSpent: {
            increment: paymentAmount,
          },
        },
      });
    }

    const currentSpent = milestone.totalSpent;
    const lastMilestoneReached = milestone.lastMilestoneReached;

    // Get all unreached milestones
    const unreachedMilestones = getUnreachedMilestones(currentSpent, lastMilestoneReached);

    if (unreachedMilestones.length === 0) {
      return { granted: false, milestoneReached: null };
    }

    // Grant spins for all reached milestones (typically just the latest one, but handle multiple if needed)
    const latestMilestone = Math.max(...unreachedMilestones);

    // Create a free spin prize for each milestone reached
    for (const milestoneAmount of unreachedMilestones) {
      await db.activeSpinPrize.create({
        data: {
          profileId: voterId,
          prizeType: "FREE_RETRY_SPIN",
          prizeValue: 1,
          isActive: true,
          isClaimed: false,
        },
      });
    }

    // Update milestone record with the latest milestone reached
    await db.voterModelMilestone.update({
      where: {
        id: milestone.id,
      },
      data: {
        lastMilestoneReached: latestMilestone,
        lastMilestoneReachedAt: new Date(),
      },
    });

    return { granted: true, milestoneReached: latestMilestone };
  } catch (error) {
    console.error("Error checking and granting milestone spins:", error);
    // Don't throw - we don't want payment processing to fail if milestone check fails
    return { granted: false, milestoneReached: null };
  }
}

/**
 * Get milestone progress for a voter-model pair
 */
export async function getMilestoneProgress(
  voterId: string,
  modelId: string,
): Promise<{
  totalSpent: number;
  lastMilestoneReached: number | null;
  nextMilestone: number | null;
  progressToNext: number;
} | null> {
  const milestone = await db.voterModelMilestone.findUnique({
    where: {
      voterId_modelId: {
        voterId,
        modelId,
      },
    },
  });

  if (!milestone) {
    return {
      totalSpent: 0,
      lastMilestoneReached: null,
      nextMilestone: 50,
      progressToNext: 0,
    };
  }

  const nextMilestone = getNextMilestone(milestone.totalSpent);
  const progressToNext = nextMilestone
    ? Math.min((milestone.totalSpent / nextMilestone) * 100, 100)
    : 0;

  return {
    totalSpent: milestone.totalSpent,
    lastMilestoneReached: milestone.lastMilestoneReached,
    nextMilestone,
    progressToNext,
  };
}

