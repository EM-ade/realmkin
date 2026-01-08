import { NextRequest, NextResponse } from "next/server";
import { db as adminDb, Timestamp, FieldValue } from "@/lib/firebase-admin";
import {
  Connection,
  PublicKey,
  Transaction,
  Keypair,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  createTransferInstruction,
  getOrCreateAssociatedTokenAccount,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  getAPYForLockPeriod,
  getDurationForLockPeriod,
} from "@/config/staking.config";

interface StakeData {
  lock_period: "flexible" | "30" | "60" | "90";
  start_date: { seconds: number };
  unlock_date: { seconds: number };
  amount: number;
  rewards_earned?: number;
  wallet: string;
}

function calcPendingRewards(stake: StakeData, nowSeconds: number): number {
  const apy = getAPYForLockPeriod(stake.lock_period);
  const dailyRate = apy / 365 / 100;
  const secondsStaked = nowSeconds - stake.start_date.seconds;
  const daysStaked = secondsStaked / 86400;
  const weight =
    getDurationForLockPeriod(stake.lock_period) === 0
      ? 1.0
      : 1 +
        ((2.0 - 1) * getDurationForLockPeriod(stake.lock_period)) /
          getDurationForLockPeriod("90");
  const accrued = stake.amount * dailyRate * daysStaked * weight;
  return Math.max(0, accrued - (stake.rewards_earned || 0));
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      uid: string;
      wallet: string;
      stakeId: string;
      txSignature?: string;
      action: string;
    };
    const { uid, wallet, stakeId, action } = body;

    // Validate input
    if (!uid || !wallet || !stakeId) {
      return NextResponse.json(
        { error: "Missing required fields: uid, wallet, stakeId" },
        { status: 400 }
      );
    }

    if (action === "initiate") {
      // Load stake via Admin SDK
      const stakeRef = adminDb
        .collection("users")
        .doc(uid)
        .collection("stakes")
        .doc(stakeId);
      const stakeSnap = await stakeRef.get();
      if (!stakeSnap.exists) {
        return NextResponse.json({ error: "Stake not found" }, { status: 404 });
      }
      const stake = stakeSnap.data() as StakeData;
      const now = Math.floor(Date.now() / 1000);
      if (now < stake.unlock_date.seconds) {
        return NextResponse.json(
          { error: "Stake is still locked" },
          { status: 400 }
        );
      }

      // Optional: update rewards before marking unstaking
      const pending = calcPendingRewards(stake, now);
      await stakeRef.update({
        rewards_earned: (stake.rewards_earned || 0) + pending,
        last_reward_update: Timestamp.now(),
        status: "unstaking",
      });

      return NextResponse.json(
        {
          success: true,
          message:
            "Unstake initiated. Please complete the withdrawal transaction.",
          stakeId,
        },
        { status: 200 }
      );
    } else if (action === "complete") {
      try {
        // Load stake document directly
        const stakeRef = adminDb
          .collection("users")
          .doc(uid)
          .collection("stakes")
          .doc(stakeId);
        const stakeSnap = await stakeRef.get();
        if (!stakeSnap.exists) {
          return NextResponse.json(
            { error: "Stake not found" },
            { status: 404 }
          );
        }
        const stake = stakeSnap.data() as StakeData;

        // Calculate amounts to return
        const now = Math.floor(Date.now() / 1000);
        const isUnlocked = now >= stake.unlock_date.seconds;

        let penaltyPercent = 0;
        if (!isUnlocked) {
          if (stake.lock_period === "30") penaltyPercent = 10;
          else if (stake.lock_period === "60") penaltyPercent = 15;
          else if (stake.lock_period === "90") penaltyPercent = 20;
        }

        const penalty = (stake.amount * penaltyPercent) / 100;
        const amountToReturn = stake.amount - penalty;

        // Calculate pending rewards that have accrued since last update
        const pendingRewards = calcPendingRewards(stake, now);
        const totalRewardsEarned = (stake.rewards_earned || 0) + pendingRewards;
        const rewardsToReturn = isUnlocked ? totalRewardsEarned : 0;

        // Create transfer transaction from treasury wallet
        const connection = new Connection(
          process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
            "https://api.mainnet-beta.solana.com",
          "confirmed"
        );

        // Load treasury (staking) keypair from env and validate against configured public address
        const treasuryPrivateKeyBase64 = process.env.TREASURY_PRIVATE_KEY;
        if (!treasuryPrivateKeyBase64) {
          throw new Error("TREASURY_PRIVATE_KEY not configured");
        }
        const secretKeyBytes = Buffer.from(treasuryPrivateKeyBase64, "base64");
        const treasuryKeypair = Keypair.fromSecretKey(secretKeyBytes);

        const configuredStakingPubkey =
          process.env.NEXT_PUBLIC_STAKING_WALLET_ADDRESS;
        if (!configuredStakingPubkey) {
          throw new Error("NEXT_PUBLIC_STAKING_WALLET_ADDRESS not configured");
        }
        const stakingWalletPublicKey = new PublicKey(configuredStakingPubkey);

        // Ensure the private key corresponds to the configured public key to avoid invalid signatures
        if (!treasuryKeypair.publicKey.equals(stakingWalletPublicKey)) {
          throw new Error(
            `Configured staking public key does not match TREASURY_PRIVATE_KEY. Expected ${stakingWalletPublicKey.toBase58()}, got ${treasuryKeypair.publicKey.toBase58()}`
          );
        }

        const userPublicKey = new PublicKey(wallet);
        // Use the correct environment variable names based on network
        const isDevnet = process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'devnet';
        const tokenMintAddress = isDevnet
          ? process.env.NEXT_PUBLIC_MKIN_TOKEN_MINT_DEVNET || 'CARXmxarjsCwvzpmjVB2x4xkAo8fMgsAVUBPREoUGyZm'
          : process.env.NEXT_PUBLIC_MKIN_TOKEN_MINT_MAINNET || 'BKDGf6DnDHK87GsZpdWXyBqiNdcNb6KnoFcYbWPUhJLA';
        const tokenMintPublicKey = new PublicKey(tokenMintAddress);
        const TOKEN_DECIMALS = parseInt(
          process.env.NEXT_PUBLIC_TOKEN_DECIMALS || "9"
        );

        // Ensure source (funding) and destination (user) token accounts exist
        // Staking (source) ATA – should exist; create if missing just in case
        const stakingAta = await getOrCreateAssociatedTokenAccount(
          connection,
          treasuryKeypair,
          tokenMintPublicKey,
          treasuryKeypair.publicKey
        );

        // User (destination) ATA – create if missing
        const userAta = await getOrCreateAssociatedTokenAccount(
          connection,
          treasuryKeypair, // payer
          tokenMintPublicKey,
          userPublicKey
        );

        // Build transaction
        const transaction = new Transaction();
        const amountInSmallestUnit = Math.floor(
          amountToReturn * Math.pow(10, TOKEN_DECIMALS)
        );
        const rewardsInSmallestUnit = Math.floor(
          rewardsToReturn * Math.pow(10, TOKEN_DECIMALS)
        );

        // Transfer principal
        transaction.add(
          createTransferInstruction(
            stakingAta.address,
            userAta.address,
            treasuryKeypair.publicKey,
            amountInSmallestUnit,
            [],
            TOKEN_PROGRAM_ID
          )
        );

        // Transfer rewards if any
        if (rewardsInSmallestUnit > 0) {
          transaction.add(
            createTransferInstruction(
              stakingAta.address,
              userAta.address,
              treasuryKeypair.publicKey,
              rewardsInSmallestUnit,
              [],
              TOKEN_PROGRAM_ID
            )
          );
        }

        // Set fee payer and recent blockhash
        transaction.feePayer = treasuryKeypair.publicKey;
        const { blockhash, lastValidBlockHeight } =
          await connection.getLatestBlockhash("confirmed");
        transaction.recentBlockhash = blockhash;

        // Check treasury balance first
        const treasuryBalance = await connection.getBalance(
          treasuryKeypair.publicKey
        );

        if (treasuryBalance < 10000000) {
          // Less than 0.01 SOL
          return NextResponse.json(
            {
              error:
                "Treasury wallet has insufficient SOL for transaction fees",
            },
            { status: 500 }
          );
        }

        // Send and confirm (no skipPreflight) so we only return a valid, landed signature
        const confirmedSig = await sendAndConfirmTransaction(
          connection,
          transaction,
          [treasuryKeypair],
          {
            commitment: "confirmed",
          }
        );

        // Mark as unstaked and update user totals via Admin SDK
        await stakeRef.update({
          status: "completed",
          updated_at: Timestamp.now(),
        });

        const userWalletRef = adminDb.collection("users").doc(stake.wallet);
        await userWalletRef.set(
          {
            total_staked: FieldValue.increment(-stake.amount),
            updated_at: Timestamp.now(),
          },
          { merge: true }
        );

        return NextResponse.json(
          {
            success: true,
            message: "Unstake completed",
            stakeId,
            txSignature: confirmedSig,
            amountReturned: amountToReturn,
            rewardsReturned: rewardsToReturn,
          },
          { status: 200 }
        );
      } catch (innerError) {
        console.error("Error in complete unstake:", innerError);
        throw innerError;
      }
    } else {
      return NextResponse.json(
        { error: "Invalid action. Must be 'initiate' or 'complete'" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error processing unstake:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
