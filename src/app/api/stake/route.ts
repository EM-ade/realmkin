import { NextRequest, NextResponse } from "next/server";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/config/firebaseAdmin";

// Admin SDK is initialized centrally in src/config/firebaseAdmin.ts

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

    // Compose stake record (server timestamp via admin)
    const now = Timestamp.now();
    const idSuffix = Math.random().toString(36).slice(2, 11);
    const stakeId = `${wallet}-${Date.now()}-${idSuffix}`;

    // Determine unlock date
    const durationDays = lockPeriod === "flexible" ? 0 : Number(lockPeriod);
    const unlockSeconds = now.seconds + durationDays * 24 * 60 * 60;
    const unlockDate = new Timestamp(unlockSeconds, now.nanoseconds);

    const stakeRecord = {
      id: stakeId,
      wallet,
      amount,
      lock_period: lockPeriod as "flexible" | "30" | "60" | "90",
      start_date: now,
      unlock_date: unlockDate,
      status: "active" as const,
      rewards_earned: 0,
      last_reward_update: now,
      tx_signature: txSignature,
    };

    // Admin writes bypass rules
    const batch = adminDb.batch();

    // Ensure users/{wallet} doc exists with baseline counters
    const userWalletRef = adminDb.collection("users").doc(wallet);
    batch.set(
      userWalletRef,
      {
        wallet,
        total_staked: FieldValue.increment(amount),
        total_rewards: FieldValue.increment(0),
        last_claimed: null,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
        is_active: true,
      },
      { merge: true }
    );

    // Create stake under users/{uid}/stakes/{stakeId}
    const stakeRef = adminDb.collection("users").doc(uid).collection("stakes").doc(stakeId);
    batch.set(stakeRef, stakeRecord);

    await batch.commit();

    return NextResponse.json(
      {
        success: true,
        stakeId,
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

    // Read stakes via Admin SDK (no rules issues)
    const snap = await adminDb.collection("users").doc(uid).collection("stakes").get();
    const stakes = snap.docs.map((d) => d.data());

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
