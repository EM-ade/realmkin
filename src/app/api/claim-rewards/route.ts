import { NextRequest, NextResponse } from "next/server";
import { claimStakeRewards, getUserStakingData, calculatePendingRewards, getUserStakes } from "@/services/firebaseStakingService";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, wallet, stakeId } = body;

    // Validate input
    if (!uid || !wallet || !stakeId) {
      return NextResponse.json(
        { error: "Missing required fields: uid, wallet, stakeId" },
        { status: 400 }
      );
    }

    // Claim rewards
    const rewardsClaimed = await claimStakeRewards(uid, stakeId);

    return NextResponse.json(
      {
        success: true,
        rewardsClaimed,
        message: "Rewards claimed successfully",
        stakeId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error claiming rewards:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const uid = request.nextUrl.searchParams.get("uid");
    const wallet = request.nextUrl.searchParams.get("wallet");

    if (!uid || !wallet) {
      return NextResponse.json(
        { error: "Missing uid and/or wallet parameter" },
        { status: 400 }
      );
    }

    // Get user data and stakes
    const userData = await getUserStakingData(wallet);
    const stakes = await getUserStakes(uid);

    // Calculate total pending rewards
    let totalPendingRewards = 0;
    const stakeRewards = stakes.map((stake) => {
      const pending = calculatePendingRewards(stake);
      totalPendingRewards += pending;
      return {
        stakeId: stake.id,
        pending,
        earned: stake.rewards_earned,
        total: stake.rewards_earned + pending,
      };
    });

    return NextResponse.json(
      {
        success: true,
        wallet,
        totalRewardsClaimed: userData?.total_rewards || 0,
        totalPendingRewards,
        lastClaimed: userData?.last_claimed,
        stakes: stakeRewards,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching rewards:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
