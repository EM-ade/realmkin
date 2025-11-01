import { NextRequest, NextResponse } from "next/server";
import {
  getUserStakingData,
  getUserStakes,
  calculatePendingRewards,
  getGlobalMetrics,
} from "@/services/firebaseStakingService";

export async function GET(request: NextRequest) {
  try {
    const wallet = request.nextUrl.searchParams.get("wallet");

    if (!wallet) {
      return NextResponse.json(
        { error: "Missing wallet parameter" },
        { status: 400 }
      );
    }

    // Get user data
    const userData = await getUserStakingData(wallet);
    
    if (!userData) {
      return NextResponse.json(
        {
          success: true,
          user: null,
          stakes: [],
          message: "User not found",
        },
        { status: 200 }
      );
    }

    // Get user stakes
    const stakes = await getUserStakes(wallet);

    // Calculate pending rewards for each stake
    const stakesWithRewards = stakes.map((stake) => {
      const pendingRewards = calculatePendingRewards(stake);
      return {
        id: stake.id,
        amount: stake.amount,
        lock_period: stake.lock_period,
        start_date: stake.start_date,
        unlock_date: stake.unlock_date,
        status: stake.status,
        rewards_earned: stake.rewards_earned,
        pending_rewards: pendingRewards,
        total_rewards: stake.rewards_earned + pendingRewards,
      };
    });

    // Get global metrics
    const metrics = await getGlobalMetrics();

    // Calculate totals
    const totalStaked = stakesWithRewards.reduce((sum, s) => sum + s.amount, 0);
    const totalRewardsClaimed = userData.total_rewards;
    const totalPendingRewards = stakesWithRewards.reduce((sum, s) => sum + s.pending_rewards, 0);

    return NextResponse.json(
      {
        success: true,
        user: {
          wallet: userData.wallet,
          total_staked: totalStaked,
          total_rewards_claimed: totalRewardsClaimed,
          total_pending_rewards: totalPendingRewards,
          total_rewards_all_time: totalRewardsClaimed + totalPendingRewards,
          last_claimed: userData.last_claimed,
          created_at: userData.created_at,
        },
        stakes: stakesWithRewards,
        metrics,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching user stakes:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
