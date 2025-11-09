import { NextRequest, NextResponse } from "next/server";
import { initiateUnstake, completeUnstake, getUserStakes, calculatePendingRewards } from "@/services/firebaseStakingService";
import { Connection, PublicKey, Transaction, Keypair, sendAndConfirmTransaction } from "@solana/web3.js";
import { createTransferInstruction, getAssociatedTokenAddress, getOrCreateAssociatedTokenAccount, TOKEN_PROGRAM_ID } from "@solana/spl-token";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, wallet, stakeId, txSignature, action } = body;

    // Validate input
    if (!uid || !wallet || !stakeId) {
      return NextResponse.json(
        { error: "Missing required fields: uid, wallet, stakeId" },
        { status: 400 }
      );
    }

    if (action === "initiate") {
      // Initiate unstake request
      await initiateUnstake(uid, stakeId);

      return NextResponse.json(
        {
          success: true,
          message: "Unstake initiated. Please complete the withdrawal transaction.",
          stakeId,
        },
        { status: 200 }
      );
    } else if (action === "complete") {
      try {
        // Get stake details
        const stakes = await getUserStakes(uid);
        const stake = stakes.find((s) => s.id === stakeId);

        if (!stake) {
          return NextResponse.json(
            { error: "Stake not found" },
            { status: 404 }
          );
        }

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
        const pendingRewards = calculatePendingRewards(stake, now);
        const totalRewardsEarned = stake.rewards_earned + pendingRewards;
        const rewardsToReturn = isUnlocked ? totalRewardsEarned : 0;

        // Create transfer transaction from treasury wallet
        const connection = new Connection(
          process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
          "confirmed"
        );

        // Load treasury (staking) keypair from env and validate against configured public address
        const treasuryPrivateKeyBase64 = process.env.TREASURY_PRIVATE_KEY;
        if (!treasuryPrivateKeyBase64) {
          throw new Error("TREASURY_PRIVATE_KEY not configured");
        }
        const secretKeyBytes = Buffer.from(treasuryPrivateKeyBase64, "base64");
        const treasuryKeypair = Keypair.fromSecretKey(secretKeyBytes);

        const configuredStakingPubkey = process.env.NEXT_PUBLIC_STAKING_WALLET_ADDRESS;
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
        const tokenMintPublicKey = new PublicKey(process.env.NEXT_PUBLIC_TOKEN_MINT!);
        const TOKEN_DECIMALS = parseInt(process.env.NEXT_PUBLIC_TOKEN_DECIMALS || "9");

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
        const amountInSmallestUnit = Math.floor(amountToReturn * Math.pow(10, TOKEN_DECIMALS));
        const rewardsInSmallestUnit = Math.floor(rewardsToReturn * Math.pow(10, TOKEN_DECIMALS));

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
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
        transaction.recentBlockhash = blockhash;

        // Check treasury balance first
        const treasuryBalance = await connection.getBalance(treasuryKeypair.publicKey);
        console.log(`Treasury balance: ${treasuryBalance / 1e9} SOL`);
        
        if (treasuryBalance < 10000000) { // Less than 0.01 SOL
          console.error(`Treasury wallet has insufficient SOL: ${treasuryBalance / 1e9} SOL`);
          console.error(`Treasury address: ${treasuryKeypair.publicKey.toBase58()}`);
          return NextResponse.json(
            { 
              error: "Treasury wallet has insufficient SOL for transaction fees",
              treasuryAddress: treasuryKeypair.publicKey.toBase58(),
              currentBalance: treasuryBalance / 1e9,
              requiredBalance: 0.01
            },
            { status: 500 }
          );
        }

        // Send and confirm (no skipPreflight) so we only return a valid, landed signature
        const confirmedSig = await sendAndConfirmTransaction(connection, transaction, [treasuryKeypair], {
          commitment: "confirmed",
        });

        // Mark as unstaked in Firebase after confirmation
        await completeUnstake(uid, stakeId, confirmedSig);

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
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
