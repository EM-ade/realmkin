import { NextRequest, NextResponse } from "next/server";
import { createStake, getUserStakes } from "@/services/firebaseStakingService";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, wallet, amount, lockPeriod, txSignature } = body;

    // Validate input
    if (!uid || !wallet || !amount || !lockPeriod || !txSignature) {
      return NextResponse.json(
        { error: "Missing required fields: uid, wallet, amount, lockPeriod, txSignature" },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than 0" },
        { status: 400 }
      );
    }

    if (!["flexible", "30", "60", "90"].includes(lockPeriod)) {
      return NextResponse.json(
        { error: "Invalid lock period. Must be 'flexible', '30', '60', or '90'" },
        { status: 400 }
      );
    }

    // Create stake
    const stakeRecord = await createStake(uid, wallet, amount, lockPeriod, txSignature);

    return NextResponse.json(
      {
        success: true,
        stakeId: stakeRecord.id,
        message: "Stake recorded successfully",
        stake: stakeRecord,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating stake:", error);
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

    if (!uid) {
      return NextResponse.json(
        { error: "Missing uid parameter" },
        { status: 400 }
      );
    }

    const stakes = await getUserStakes(uid);

    return NextResponse.json(
      {
        success: true,
        uid,
        stakes,
        count: stakes.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching stakes:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
