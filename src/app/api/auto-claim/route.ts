import { NextRequest, NextResponse } from 'next/server';
import { rewardsService } from '@/services/rewardsService';
import { db } from '@/lib/firebase';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    // Basic authentication check
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET_TOKEN;

    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🤖 Starting external auto claim for all users...');

    // Get all user rewards documents
    const userRewardsRef = collection(db, "userRewards");
    const q = query(userRewardsRef);
    const querySnapshot = await getDocs(q);

    let totalClaims = 0;
    let totalAmount = 0;
    const now = new Date();

    // Process users in batches to avoid timeout
    const batchSize = 20;
    const docs = querySnapshot.docs;

    const results = [];

    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = docs.slice(i, i + batchSize);
      console.log(`🔄 Processing batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(docs.length/batchSize)}`);

      const batchPromises = batch.map(async (docSnap) => {
        const userData = docSnap.data();
        const userId = docSnap.id;

        try {
          // Check if user has pending rewards using the rewards service
          const userRewards = await rewardsService.getUserRewards(userId);
          
          if (!userRewards) {
            return { userId, amount: 0, success: false, error: 'User rewards not found' };
          }

          const calculation = rewardsService.calculatePendingRewards(userRewards, userRewards.totalNFTs || 0);

          if (calculation.canClaim && calculation.pendingAmount > 0) {
            // Use the rewards service to process the claim
            const claimRecord = await rewardsService.claimRewards(userId, userRewards.walletAddress || '');

            // Update transaction history
            await rewardsService.saveTransactionHistory({
              userId,
              walletAddress: userRewards.walletAddress,
              type: "claim" as const,
              amount: claimRecord.amount,
              description: `Auto-claimed ${rewardsService.formatMKIN(claimRecord.amount)} via external cron`
            });

            return {
              userId,
              amount: claimRecord.amount,
              success: true
            };
          }

          return { userId, amount: 0, success: false, reason: 'No pending rewards' };

        } catch (error) {
          console.error(`❌ Failed to auto-claim for user ${userId}:`, error);
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

    console.log(`🤖 External auto claiming completed. ${totalClaims} claims processed, total ₥${totalAmount} distributed.`);

    return NextResponse.json({
      success: true,
      claimsProcessed: totalClaims,
      totalAmountDistributed: totalAmount,
      timestamp: now.toISOString(),
      details: results
    });

  } catch (error) {
    console.error("Error during external auto claiming:", error);
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
    message: 'Auto-claim endpoint is running',
    timestamp: new Date().toISOString(),
    environment: {
      hasCronSecret: !!process.env.CRON_SECRET_TOKEN,
      nodeEnv: process.env.NODE_ENV
    }
  });
}