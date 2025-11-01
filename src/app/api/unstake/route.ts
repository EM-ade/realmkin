import { NextRequest, NextResponse } from "next/server";
import { initiateUnstake, completeUnstake, getUserStakes } from "@/services/firebaseStakingService";
import { Connection, PublicKey, Transaction, Keypair } from "@solana/web3.js";
import { createTransferInstruction, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallet, stakeId, txSignature, action } = body;

    // Validate input
    if (!wallet || !stakeId) {
      return NextResponse.json(
        { error: "Missing required fields: wallet, stakeId" },
        { status: 400 }
      );
    }

    if (action === "initiate") {
      // Initiate unstake request
      await initiateUnstake(stakeId);

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
        const stakes = await getUserStakes(wallet);
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
        const rewardsToReturn = isUnlocked ? stake.rewards_earned : 0;

        // Create transfer transaction from treasury wallet
        const connection = new Connection(
          process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
          "confirmed"
        );

        const stakingWalletPublicKey = new PublicKey(process.env.NEXT_PUBLIC_STAKING_WALLET_ADDRESS!);
        const userPublicKey = new PublicKey(wallet);
        const tokenMintPublicKey = new PublicKey(process.env.NEXT_PUBLIC_TOKEN_MINT!);
        const TOKEN_DECIMALS = parseInt(process.env.NEXT_PUBLIC_TOKEN_DECIMALS || "9");

        // Get token accounts
        const stakingTokenAccount = await getAssociatedTokenAddress(tokenMintPublicKey, stakingWalletPublicKey);
        const userTokenAccount = await getAssociatedTokenAddress(tokenMintPublicKey, userPublicKey);

        // Create transaction
        const transaction = new Transaction();
        const amountInSmallestUnit = Math.floor(amountToReturn * Math.pow(10, TOKEN_DECIMALS));
        const rewardsInSmallestUnit = Math.floor(rewardsToReturn * Math.pow(10, TOKEN_DECIMALS));

        // Transfer principal
        transaction.add(
          createTransferInstruction(
            stakingTokenAccount,
            userTokenAccount,
            stakingWalletPublicKey,
            amountInSmallestUnit,
            [],
            TOKEN_PROGRAM_ID
          )
        );

        // Transfer rewards if any
        if (rewardsInSmallestUnit > 0) {
          transaction.add(
            createTransferInstruction(
              stakingTokenAccount,
              userTokenAccount,
              stakingWalletPublicKey,
              rewardsInSmallestUnit,
              [],
              TOKEN_PROGRAM_ID
            )
          );
        }

        // Get recent blockhash
        const { blockhash } = await connection.getLatestBlockhash("confirmed");
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = stakingWalletPublicKey;

        // Sign with treasury keypair from environment
        const treasuryPrivateKeyBase64 = process.env.TREASURY_PRIVATE_KEY;
        if (!treasuryPrivateKeyBase64) {
          throw new Error("TREASURY_PRIVATE_KEY not configured");
        }

        const secretKeyBytes = Buffer.from(treasuryPrivateKeyBase64, "base64");
        const treasuryKeypair = Keypair.fromSecretKey(secretKeyBytes);
        transaction.sign(treasuryKeypair);

        // Send transaction immediately
        const txSignature = await connection.sendRawTransaction(transaction.serialize(), { skipPreflight: true });
        
        // Mark as unstaked in Firebase immediately (don't wait for confirmation)
        await completeUnstake(stakeId, txSignature);

        return NextResponse.json(
          {
            success: true,
            message: "Unstake processing",
            stakeId,
            txSignature,
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
