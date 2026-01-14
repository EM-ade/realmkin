import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

const RPC_URL = 
  process.env.NEXT_PUBLIC_HELIUS_MAINNET_RPC_URL || 
  process.env.NEXT_PUBLIC_SOLANA_MAINNET_RPC_URL || 
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 
  "https://api.mainnet-beta.solana.com";
const STAKING_WALLET = process.env.NEXT_PUBLIC_STAKING_WALLET_ADDRESS || "";
// Use the correct environment variable names based on network
const isDevnet = process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'devnet';
const TOKEN_MINT = isDevnet
  ? process.env.NEXT_PUBLIC_MKIN_TOKEN_MINT_DEVNET || 'CARXmxarjsCwvzpmjVB2x4xkAo8fMgsAVUBPREoUGyZm'
  : process.env.NEXT_PUBLIC_MKIN_TOKEN_MINT_MAINNET || 'BKDGf6DnDHK87GsZpdWXyBqiNdcNb6KnoFcYbWPUhJLA';
const TOKEN_DECIMALS = parseInt(process.env.NEXT_PUBLIC_TOKEN_DECIMALS || "6");

export interface StakingTransactionResult {
  success: boolean;
  txSignature: string;
  error?: string;
}

/**
 * Create and send a staking transaction
 * Transfers tokens from user's wallet to the staking wallet
 */
export async function createStakingTransaction(
  userWallet: { publicKey: PublicKey; signTransaction: (tx: Transaction) => Promise<Transaction> },
  amount: number
): Promise<StakingTransactionResult> {
  try {
    if (!userWallet || !userWallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    if (!STAKING_WALLET || !TOKEN_MINT) {
      throw new Error("Staking configuration not set");
    }

    const connection = new Connection(RPC_URL, "confirmed");
    const userPublicKey = userWallet.publicKey;
    const stakingWalletPublicKey = new PublicKey(STAKING_WALLET);
    const tokenMintPublicKey = new PublicKey(TOKEN_MINT);

    // Get user's token account
    const userTokenAccount = await getAssociatedTokenAddress(
      tokenMintPublicKey,
      userPublicKey
    );

    // Get staking wallet's token account
    const stakingTokenAccount = await getAssociatedTokenAddress(
      tokenMintPublicKey,
      stakingWalletPublicKey
    );

    // Create transaction
    const transaction = new Transaction();

    // Convert amount to smallest unit (considering decimals)
    const amountInSmallestUnit = Math.floor(amount * Math.pow(10, TOKEN_DECIMALS));

    // Add transfer instruction
    const transferInstruction = createTransferInstruction(
      userTokenAccount,
      stakingTokenAccount,
      userPublicKey,
      amountInSmallestUnit,
      [],
      TOKEN_PROGRAM_ID
    );

    transaction.add(transferInstruction);

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash("confirmed");
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = userPublicKey;

    // Sign transaction
    const signedTransaction = await userWallet.signTransaction(transaction);

    // Send transaction
    const txSignature = await connection.sendRawTransaction(
      signedTransaction.serialize(),
      { skipPreflight: true }
    );

    // Wait for confirmation
    await connection.confirmTransaction(txSignature, "finalized");

    return {
      success: true,
      txSignature,
    };
  } catch (error) {
    console.error("Error creating staking transaction:", error);
    return {
      success: false,
      txSignature: "",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Create and send an unstaking transaction (withdrawal)
 * Transfers tokens from staking wallet back to user
 * Note: This requires the staking wallet to be controlled by the backend
 */
export async function createUnstakingTransaction(
  userWallet: { publicKey: PublicKey; signTransaction: (tx: Transaction) => Promise<Transaction> },
  amount: number
): Promise<StakingTransactionResult> {
  try {
    if (!userWallet || !userWallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    if (!STAKING_WALLET || !TOKEN_MINT) {
      throw new Error("Staking configuration not set");
    }

    // In a real implementation, the backend would handle this transaction
    // The frontend would call an API endpoint to trigger the withdrawal
    // For now, we'll return an error indicating this needs backend support

    throw new Error(
      "Unstaking must be processed by the backend. Call POST /api/unstake with action='complete' after backend processes the withdrawal."
    );
  } catch (error) {
    console.error("Error creating unstaking transaction:", error);
    return {
      success: false,
      txSignature: "",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Record a stake in the backend
 */
export async function recordStakeInBackend(
  uid: string,
  wallet: string,
  amount: number,
  lockPeriod: "flexible" | "30" | "60" | "90",
  txSignature: string
): Promise<{ success: boolean; stakeId?: string; error?: string }> {
  try {
    const response = await fetch("/api/stake", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        uid,
        wallet,
        amount,
        lockPeriod,
        txSignature,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to record stake");
    }

    return {
      success: true,
      stakeId: data.stakeId,
    };
  } catch (error) {
    console.error("Error recording stake:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Claim rewards for a stake
 */
export async function claimRewardsFromBackend(
  uid: string,
  wallet: string,
  stakeId: string
): Promise<{ success: boolean; rewardsClaimed?: number; error?: string }> {
  try {
    const response = await fetch("/api/claim-rewards", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        uid,
        wallet,
        stakeId,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to claim rewards");
    }

    return {
      success: true,
      rewardsClaimed: data.rewardsClaimed,
    };
  } catch (error) {
    console.error("Error claiming rewards:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Initiate unstaking request
 */
export async function initiateUnstakingRequest(
  uid: string,
  wallet: string,
  stakeId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch("/api/unstake", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        uid,
        wallet,
        stakeId,
        action: "initiate",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to initiate unstake");
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error initiating unstake:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
