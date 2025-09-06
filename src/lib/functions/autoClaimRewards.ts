import { db } from "@/lib/firebase";
import { collection, getDocs, doc, runTransaction } from "firebase/firestore";
import { UserRewards, ClaimRecord } from "@/services/rewardsService";

const WEEKLY_RATE_PER_NFT = 200;
const MILLISECONDS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
const MIN_CLAIM_AMOUNT = 1;

/**
 * Convert any timestamp to a valid Date object
 */
function convertToValidDate(timestamp: unknown, fallbackDate: Date): Date {
  try {
    if (timestamp instanceof Date) {
      return isNaN(timestamp.getTime()) ? fallbackDate : timestamp;
    }
    
    if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp && typeof (timestamp as { toDate: () => Date }).toDate === 'function') {
      const date = (timestamp as { toDate: () => Date }).toDate();
      return isNaN(date.getTime()) ? fallbackDate : date;
    }
    
    if (timestamp && (typeof timestamp === 'string' || typeof timestamp === 'number')) {
      const date = new Date(timestamp);
      return isNaN(date.getTime()) ? fallbackDate : date;
    }
    
    return fallbackDate;
  } catch (error) {
    console.warn("Error converting timestamp to Date:", error, "Using fallback date:", fallbackDate.toISOString());
    return fallbackDate;
  }
}

/**
 * Calculate pending rewards for a user (similar to rewardsService but simplified for server-side)
 */
function calculatePendingRewards(userRewards: UserRewards): { pendingAmount: number; canClaim: boolean } {
  const now = new Date();
  const weeklyRate = userRewards.totalNFTs * WEEKLY_RATE_PER_NFT;
  
  const lastClaimDate = convertToValidDate(userRewards.lastClaimed || userRewards.createdAt, now);
  const timeSinceLastClaim = now.getTime() - lastClaimDate.getTime();
  const weeksElapsed = Math.floor(timeSinceLastClaim / MILLISECONDS_PER_WEEK);

  const accumulatedReward = weeklyRate * weeksElapsed;
  const canClaim = weeksElapsed >= 1 && accumulatedReward >= MIN_CLAIM_AMOUNT;

  return {
    pendingAmount: accumulatedReward,
    canClaim
  };
}

/**
 * Automatic reward claiming function for all users
 */
async function autoClaimRewards() {
  try {
    console.log("🤖 Starting automatic reward claiming for all users...");

    // Get all user rewards documents
    const userRewardsRef = collection(db, "userRewards");
    const querySnapshot = await getDocs(userRewardsRef);

    let totalClaims = 0;
    let totalAmount = 0;
    const now = new Date();

    // Process each user's rewards
    for (const docSnap of querySnapshot.docs) {
      const userData = docSnap.data();
      
      // Convert to proper UserRewards object with valid dates
      const userRewards: UserRewards = {
        ...userData,
        userId: docSnap.id,
        totalNFTs: userData.totalNFTs || 0,
        weeklyRate: userData.weeklyRate || 0,
        totalEarned: userData.totalEarned || 0,
        totalClaimed: userData.totalClaimed || 0,
        totalRealmkin: userData.totalRealmkin || 0,
        pendingRewards: userData.pendingRewards || 0,
        lastCalculated: convertToValidDate(userData.lastCalculated, now),
        lastClaimed: userData.lastClaimed ? convertToValidDate(userData.lastClaimed, now) : null,
        createdAt: convertToValidDate(userData.createdAt, now),
        updatedAt: convertToValidDate(userData.updatedAt, now),
        walletAddress: userData.walletAddress || ''
      };

      // Calculate pending rewards
      const calculation = calculatePendingRewards(userRewards);

      if (calculation.canClaim && calculation.pendingAmount > 0) {
        try {
          // Process the claim in a transaction
          await runTransaction(db, async (transaction) => {
            const userRewardsRef = doc(db, "userRewards", docSnap.id);
            const userRewardsDoc = await transaction.get(userRewardsRef);

            if (!userRewardsDoc.exists()) {
              throw new Error("User rewards not found in transaction");
            }

            const currentUserRewards = userRewardsDoc.data() as UserRewards;
            const currentCalculation = calculatePendingRewards(currentUserRewards);

            if (!currentCalculation.canClaim) {
              throw new Error("Claim no longer available");
            }

            const claimAmount = Math.floor(currentCalculation.pendingAmount * 100) / 100;

            // Create claim record
            const claimRecord: ClaimRecord = {
              id: `${docSnap.id}_${now.getTime()}_${Math.random().toString(36).substr(2, 9)}`,
              userId: docSnap.id,
              walletAddress: currentUserRewards.walletAddress,
              amount: claimAmount,
              nftCount: currentUserRewards.totalNFTs,
              claimedAt: now,
              weeksClaimed: Math.floor(currentCalculation.pendingAmount / (currentUserRewards.totalNFTs * WEEKLY_RATE_PER_NFT))
            };

            const claimRef = doc(db, "claimRecords", claimRecord.id);
            transaction.set(claimRef, claimRecord);

            // Update user rewards
            transaction.update(userRewardsRef, {
              totalClaimed: (currentUserRewards.totalClaimed || 0) + claimAmount,
              totalEarned: (currentUserRewards.totalEarned || 0) + claimAmount,
              totalRealmkin: (currentUserRewards.totalRealmkin || 0) + claimAmount,
              pendingRewards: 0,
              lastClaimed: now,
              lastCalculated: now,
              updatedAt: now,
            });
          });

          totalClaims++;
          totalAmount += calculation.pendingAmount;
          console.log(`✅ Auto-claimed ₥${calculation.pendingAmount} for user ${docSnap.id}`);

        } catch (error) {
          console.error(`❌ Failed to auto-claim for user ${docSnap.id}:`, error);
        }
      }
    }

    console.log(`🤖 Automatic claiming completed. ${totalClaims} claims processed, total ₥${totalAmount} distributed.`);
    return {
      success: true,
      claimsProcessed: totalClaims,
      totalAmountDistributed: totalAmount
    };

  } catch (error) {
    console.error("Error during automatic reward claiming:", error);
    throw error;
  }
}

export default autoClaimRewards;
