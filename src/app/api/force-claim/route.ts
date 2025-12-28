import { NextRequest, NextResponse } from 'next/server';
import { serverRewardsService } from '@/services/serverRewardsService';
import { db } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    // Basic authentication check
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET_TOKEN;

    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('⚡ Starting FORCE claim for all users (bypassing weekly cadence)...');

    // Get all user rewards documents using Admin SDK
    const userRewardsRef = db.collection("userRewards");
    const snapshot = await userRewardsRef.get();

    let totalClaims = 0;
    let totalAmount = 0;
    const now = new Date();

    // Process users in batches to avoid timeout
    const batchSize = 20;
    const docs = snapshot.docs;

    const results = [];

    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = docs.slice(i, i + batchSize);
      console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(docs.length / batchSize)}`);

      const batchPromises = batch.map(async (docSnap) => {
        const userId = docSnap.id;

        try {
          // Check if user has pending rewards using the server rewards service
          const userRewards = await serverRewardsService.getUserRewards(userId);

          if (!userRewards) {
            return { userId, amount: 0, success: false, error: 'User rewards not found' };
          }

          // FORCE CLAIM: Use the stored pendingRewards directly from the database
          // This bypasses the time-based calculation entirely
          const storedPendingRewards = userRewards.pendingRewards || 0;
          
          if (storedPendingRewards > 0) {
            // Process the claim directly using a transaction (bypassing service validation)
            try {
              const claimAmount = Math.floor(storedPendingRewards * 100) / 100;
              const now = new Date();
              
              await db.runTransaction(async (transaction) => {
                const userRewardsRef = db.collection("userRewards").doc(userId);
                const userRewardsDoc = await transaction.get(userRewardsRef);

                if (!userRewardsDoc.exists) {
                  throw new Error("User rewards not found in transaction");
                }

                const currentUserRewards = userRewardsDoc.data();
                const currentPendingRewards = currentUserRewards?.pendingRewards || 0;

                // Double-check pending rewards haven't changed
                if (currentPendingRewards <= 0) {
                  throw new Error("No pending rewards available");
                }

                // Create claim record
                const claimRecordId = `${userId}_${now.getTime()}_${Math.random().toString(36).substr(2, 9)}`;
                const claimRecord = {
                  id: claimRecordId,
                  userId,
                  walletAddress: userRewards.walletAddress || '',
                  amount: claimAmount,
                  nftCount: userRewards.totalNFTs || 0,
                  claimedAt: now,
                  weeksClaimed: 0, // Force claim doesn't wait for weeks
                };

                const claimRef = db.collection("claimRecords").doc(claimRecordId);
                transaction.set(claimRef, claimRecord);

                // Update user rewards
                transaction.update(userRewardsRef, {
                  totalClaimed: (currentUserRewards?.totalClaimed || 0) + claimAmount,
                  totalEarned: (currentUserRewards?.totalEarned || 0) + claimAmount,
                  totalRealmkin: (currentUserRewards?.totalRealmkin || 0) + claimAmount,
                  pendingRewards: 0,
                  lastClaimed: now,
                  lastCalculated: now,
                  updatedAt: now,
                });
              });

              // Update transaction history
              await serverRewardsService.saveTransactionHistory({
                userId,
                walletAddress: userRewards.walletAddress,
                type: "claim" as const,
                amount: claimAmount,
                description: `Force-claimed ${serverRewardsService.formatMKIN(claimAmount)} (bypassed weekly cadence)`
              });

              return {
                userId,
                amount: claimAmount,
                weeksElapsed: 0,
                success: true
              };
            } catch (transactionError) {
              console.error(`Transaction error for user ${userId}:`, transactionError);
              return {
                userId,
                amount: 0,
                success: false,
                error: transactionError instanceof Error ? transactionError.message : 'Transaction failed'
              };
            }
          }

          return { userId, amount: 0, success: false, reason: 'No pending rewards' };

        } catch (error) {
          console.error(`❌ Failed to force-claim for user ${userId}:`, error);
          return {
            userId,
            amount: 0,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      const successfulClaims = batchResults.filter(result => result.success);

      totalClaims += successfulClaims.length;
      totalAmount += successfulClaims.reduce((sum, result) => sum + (result.amount || 0), 0);

      results.push(...batchResults);
    }

    console.log(`⚡ Force claiming completed. ${totalClaims} claims processed, total ₥${totalAmount} distributed.`);

    return NextResponse.json({
      success: true,
      claimsProcessed: totalClaims,
      totalAmountDistributed: totalAmount,
      timestamp: now.toISOString(),
      note: 'Force claim bypassed weekly cadence check',
      details: results
    });

  } catch (error) {
    console.error("Error during force claiming:", error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Force-claim endpoint is running',
    timestamp: new Date().toISOString(),
    warning: 'This endpoint bypasses weekly cadence checks',
    environment: {
      hasCronSecret: !!process.env.CRON_SECRET_TOKEN,
      hasFirebaseAdmin: !!process.env.FIREBASE_PRIVATE_KEY,
      nodeEnv: process.env.NODE_ENV
    }
  });
}
