const admin = require('firebase-admin');

const WEEKLY_RATE_PER_NFT = 200;
const MILLISECONDS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
const MIN_CLAIM_AMOUNT = 1;

/**
 * Convert any timestamp to a valid Date object
 */
function convertToValidDate(timestamp, fallbackDate) {
  try {
    if (timestamp instanceof Date) {
      return isNaN(timestamp.getTime()) ? fallbackDate : timestamp;
    }
    
    if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp && typeof timestamp.toDate === 'function') {
      const date = timestamp.toDate();
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
 * Calculate pending rewards for a user
 */
function calculatePendingRewards(userRewards) {
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
 * Automatic reward claiming function for all users with batch processing
 */
async function autoClaimRewards() {
  try {
    console.log("🤖 Starting automatic reward claiming for all users...");

    const db = admin.firestore();

    // Get all user rewards documents with pagination for better performance
    const userRewardsRef = db.collection("userRewards");
    const querySnapshot = await userRewardsRef.get();

    let totalClaims = 0;
    let totalAmount = 0;
    const now = new Date();
    const processedUsers = [];

    // Process users in batches to avoid timeout
    const batchSize = 50;
    const docs = querySnapshot.docs;

    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = docs.slice(i, i + batchSize);
      console.log(`🔄 Processing batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(docs.length/batchSize)}`);

      const batchPromises = batch.map(async (docSnap) => {
        const userData = docSnap.data();

        // Convert to proper UserRewards object with valid dates
        const userRewards = {
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
            await db.runTransaction(async (transaction) => {
              const userRewardsRef = db.collection("userRewards").doc(docSnap.id);
              const userRewardsDoc = await transaction.get(userRewardsRef);

              if (!userRewardsDoc.exists()) {
                throw new Error("User rewards not found in transaction");
              }

              const currentUserRewards = userRewardsDoc.data();
              const currentCalculation = calculatePendingRewards({
                ...currentUserRewards,
                lastClaimed: currentUserRewards.lastClaimed ? convertToValidDate(currentUserRewards.lastClaimed, now) : null,
                createdAt: convertToValidDate(currentUserRewards.createdAt, now)
              });

              if (!currentCalculation.canClaim) {
                throw new Error("Claim no longer available");
              }

              const claimAmount = Math.floor(currentCalculation.pendingAmount * 100) / 100;

              // Create claim record
              const claimRecord = {
                id: `${docSnap.id}_${now.getTime()}_${Math.random().toString(36).substr(2, 9)}`,
                userId: docSnap.id,
                walletAddress: currentUserRewards.walletAddress,
                amount: claimAmount,
                nftCount: currentUserRewards.totalNFTs,
                claimedAt: now,
                weeksClaimed: Math.floor(currentCalculation.pendingAmount / (currentUserRewards.totalNFTs * WEEKLY_RATE_PER_NFT)),
                autoClaimed: true,
                claimType: 'scheduled'
              };

              const claimRef = db.collection("claimRecords").doc(claimRecord.id);
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
                lastAutoClaim: now
              });
            });

            return {
              userId: docSnap.id,
              amount: calculation.pendingAmount,
              success: true
            };

          } catch (error) {
            console.error(`❌ Failed to auto-claim for user ${docSnap.id}:`, error);
            return {
              userId: docSnap.id,
              amount: 0,
              success: false,
              error: error.message
            };
          }
        }

        return null;
      });

      const batchResults = await Promise.all(batchPromises);
      const successfulClaims = batchResults.filter(result => result && result.success);

      totalClaims += successfulClaims.length;
      totalAmount += successfulClaims.reduce((sum, result) => sum + (result?.amount || 0), 0);
      processedUsers.push(...successfulClaims);
    }

    console.log(`🤖 Automatic claiming completed. ${totalClaims} claims processed, total ₥${totalAmount} distributed.`);
    return {
      success: true,
      claimsProcessed: totalClaims,
      totalAmountDistributed: totalAmount,
      processedUsers: processedUsers.length,
      timestamp: now.toISOString()
    };

  } catch (error) {
    console.error("Error during automatic reward claiming:", error);
    throw error;
  }
}

/**
 * Auto-claim rewards for a specific user (can be called from frontend)
 */
async function autoClaimForUser(userId, walletAddress) {
  try {
    console.log(`🤖 Starting auto claim for specific user: ${userId}`);

    const db = admin.firestore();
    const userRewardsRef = db.collection("userRewards").doc(userId);
    const userRewardsDoc = await userRewardsRef.get();

    if (!userRewardsDoc.exists()) {
      throw new Error("User rewards not found");
    }

    const userData = userRewardsDoc.data();
    const now = new Date();

    // Convert to proper UserRewards object
    const userRewards = {
      ...userData,
      userId: userId,
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

    // Verify wallet address matches
    if (userRewards.walletAddress !== walletAddress) {
      throw new Error("Wallet address mismatch");
    }

    // Calculate pending rewards
    const calculation = calculatePendingRewards(userRewards);

    if (!calculation.canClaim || calculation.pendingAmount < MIN_CLAIM_AMOUNT) {
      return {
        success: false,
        message: "No rewards available to claim",
        nextClaimDate: calculation.nextClaimDate?.toISOString(),
        canClaim: false
      };
    }

    // Process the claim
    await db.runTransaction(async (transaction) => {
      const claimAmount = Math.floor(calculation.pendingAmount * 100) / 100;

      // Create claim record
      const claimRecord = {
        id: `${userId}_${now.getTime()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: userId,
        walletAddress: walletAddress,
        amount: claimAmount,
        nftCount: userRewards.totalNFTs,
        claimedAt: now,
        weeksClaimed: Math.floor(calculation.pendingAmount / (userRewards.totalNFTs * WEEKLY_RATE_PER_NFT)),
        autoClaimed: true,
        claimType: 'user-triggered'
      };

      const claimRef = db.collection("claimRecords").doc(claimRecord.id);
      transaction.set(claimRef, claimRecord);

      // Update user rewards
      transaction.update(userRewardsRef, {
        totalClaimed: (userRewards.totalClaimed || 0) + claimAmount,
        totalEarned: (userRewards.totalEarned || 0) + claimAmount,
        totalRealmkin: (userRewards.totalRealmkin || 0) + claimAmount,
        pendingRewards: 0,
        lastClaimed: now,
        lastCalculated: now,
        updatedAt: now,
        lastAutoClaim: now
      });
    });

    console.log(`✅ Auto-claimed ₥${calculation.pendingAmount} for user ${userId}`);

    return {
      success: true,
      amount: calculation.pendingAmount,
      message: `Successfully claimed ₥${calculation.pendingAmount}`,
      timestamp: now.toISOString()
    };

  } catch (error) {
    console.error(`Error during auto claim for user ${userId}:`, error);
    throw error;
  }
}

module.exports = { autoClaimRewards, autoClaimForUser };
