const functions = require("firebase-functions");
const admin = require("firebase-admin");

// --- IMPORTANT FIX: Initialize the Firebase Admin SDK ---
admin.initializeApp();

/**
 * Daily reward calculation function
 * Runs every day to calculate and update rewards for all active stakes
 */
exports.dailyRewardCalculation = functions.scheduler.onSchedule("every day 00:00", async (context) => {
  try {
    console.log("🎯 Starting daily reward calculation...");

    const db = admin.firestore();
    // Get current time as Unix timestamp in seconds
    const now = Math.floor(Date.now() / 1000);

    // Get all active stakes
    const stakesSnapshot = await db
      .collection("stakes")
      .where("status", "==", "active")
      .get();

    console.log(`📊 Found ${stakesSnapshot.size} active stakes`);

    let updatedCount = 0;
    let totalRewardsDistributed = 0;

    // Process each stake
    // Note: For large numbers of stakes, consider using batch updates
    // and parallel processing (like Promise.all) for efficiency.
    for (const stakeDoc of stakesSnapshot.docs) {
      const stake = stakeDoc.data();
      const stakeId = stakeDoc.id; // Use the document ID for logging

      try {
        // Calculate pending rewards
        const pendingRewards = calculatePendingRewards(stake, now);

        if (pendingRewards > 0) {
          const rewardAmount = parseFloat(pendingRewards.toFixed(6)); // Truncate float precision for storage
          
          const batch = db.batch();
          const stakeRef = stakeDoc.ref;
          const userRef = db.collection("users").doc(stake.wallet);

          // 1. Update stake rewards
          batch.update(stakeRef, {
            rewards_earned: stake.rewards_earned + rewardAmount,
            last_reward_update: admin.firestore.Timestamp.now(),
          });

          // 2. Update user total rewards (using FieldValue.increment is safer for concurrency)
          batch.update(userRef, {
            total_rewards: admin.firestore.FieldValue.increment(rewardAmount),
            updated_at: admin.firestore.Timestamp.now(),
          });

          await batch.commit();

          updatedCount++;
          totalRewardsDistributed += rewardAmount;

          console.log(
            `✅ Updated stake ${stakeId}: +${rewardAmount.toFixed(6)} rewards`
          );
        }
      } catch (error) {
        console.error(`❌ Error updating stake ${stakeId}:`, error);
      }
    }

    console.log(
      `✨ Daily reward calculation complete: ${updatedCount} stakes updated, ${totalRewardsDistributed.toFixed(
        6
      )} total rewards distributed`
    );

    return null; // Return null for scheduled functions
  } catch (error) {
    console.error("❌ Error in daily reward calculation:", error);
    // Throwing the error ensures the function reports failure
    throw error;
  }
});

/**
 * Calculate pending rewards for a stake
 * @param {Object} stake - Stake document data
 * @param {number} currentTimestamp - Current Unix timestamp in seconds
 * @returns {number} Pending rewards amount
 */
function calculatePendingRewards(stake, currentTimestamp) {
  // APY rates based on lock period
  const apyRates = {
    flexible: 5,
    "30": 12,
    "90": 25,
  };

  const apy = apyRates[stake.lock_period] || 5;
  // Daily rate is APY / 365 days / 100 (to convert percentage)
  const dailyRate = apy / 365 / 100;

  // Calculate time staked since start_date or last_reward_update
  // Use last_reward_update if available, otherwise use start_date
  const lastUpdateSeconds = stake.last_reward_update?.seconds || stake.start_date.seconds;
  
  // Calculate the time difference in seconds since the last update
  const secondsSinceLastUpdate = currentTimestamp - lastUpdateSeconds;
  
  // We only want to calculate rewards for whole days passed since the last update.
  // We use Math.floor to only count full 24-hour periods (86400 seconds).
  // Note: This logic differs slightly from the original to ensure daily, discrete calculation.
  const daysToReward = Math.floor(secondsSinceLastUpdate / 86400);

  // If less than a full day has passed, or rewards were already calculated, return 0.
  if (daysToReward <= 0) {
    return 0;
  }
  
  // Calculate weight multiplier based on lock period
  // Original weight calculation seems overly complex for daily accrual, 
  // and it was calculating total rewards, not *daily* rewards.
  // For a daily calculation run by a scheduler, we should simplify to:
  // Rewards = Amount * Daily Rate * Weight * Days to Reward

  const lockPeriodWeight = {
    flexible: 1.0,
    "30": 1.25, // Example increased weight
    "90": 1.5,  // Example higher weight
  };

  const weight = lockPeriodWeight[stake.lock_period] || 1.0;

  // Calculate the new rewards for the whole days that have passed
  const newRewards = stake.amount * dailyRate * daysToReward * weight;

  // IMPORTANT: The original function returned (total_calculated_rewards - rewards_earned), 
  // which works for an on-demand, cumulative calculation.
  // Since the scheduler runs every 24h, the calculation is simpler:
  // Calculate rewards for the whole days that passed since the last update.
  return newRewards;
}

/**
 * Manual trigger endpoint for testing
 */
exports.manualDailyRewardCalculation = functions.https.onRequest(
  async (request, response) => {
    try {
      console.log("🎯 Manual daily reward calculation triggered");

      const db = admin.firestore();
      const now = Math.floor(Date.now() / 1000);

      const stakesSnapshot = await db
        .collection("stakes")
        .where("status", "==", "active")
        .get();

      let updatedCount = 0;
      let totalRewardsDistributed = 0;

      for (const stakeDoc of stakesSnapshot.docs) {
        const stake = stakeDoc.data();
        const stakeId = stakeDoc.id;

        try {
          // Note: Using the updated calculatePendingRewards logic here
          const pendingRewards = calculatePendingRewards(stake, now);

          if (pendingRewards > 0) {
            const rewardAmount = parseFloat(pendingRewards.toFixed(6));
            
            const batch = db.batch();
            const stakeRef = stakeDoc.ref;
            const userRef = db.collection("users").doc(stake.wallet);

            // 1. Update stake rewards
            batch.update(stakeRef, {
              rewards_earned: stake.rewards_earned + rewardAmount,
              last_reward_update: admin.firestore.Timestamp.now(),
            });

            // 2. Update user total rewards (safer with increment)
            batch.update(userRef, {
              total_rewards: admin.firestore.FieldValue.increment(rewardAmount),
              updated_at: admin.firestore.Timestamp.now(),
            });

            await batch.commit();

            updatedCount++;
            totalRewardsDistributed += rewardAmount;
          }
        } catch (error) {
          console.error(`Error updating stake ${stakeId}:`, error);
        }
      }

      response.status(200).json({
        success: true,
        stakesUpdated: updatedCount,
        totalRewardsDistributed: totalRewardsDistributed.toFixed(6),
      });
    } catch (error) {
      console.error("Error in manual reward calculation:", error);
      response.status(500).json({ error: error.message });
    }
  }
);
