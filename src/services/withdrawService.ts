/**
 * Withdrawal Service
 * Handles fee-based MKIN token withdrawals to user's Solana wallet
 * 
 * Flow:
 * 1. Call initiate() to get fee transaction
 * 2. User signs transaction with wallet
 * 3. Send transaction to Solana blockchain
 * 4. Call complete() with transaction signature
 */

import { getAuth } from "firebase/auth";
import { Transaction, Connection, VersionedTransaction } from "@solana/web3.js";
import {
  createPendingTransaction,
  completeTransaction,
  failTransaction,
} from "./transactionHistoryService";

const GATEKEEPER_URL = process.env.NEXT_PUBLIC_GATEKEEPER_BASE || "https://gatekeeper-bmvu.onrender.com";

export interface InitiateWithdrawalResponse {
  success: boolean;
  feeTransaction?: string; // Base64 serialized transaction
  feeAmountSol?: number;
  feeAmountUsd?: number;
  solPrice?: number;
  error?: string;
}

export interface CompleteWithdrawalResponse {
  success: boolean;
  txHash?: string;
  newBalance?: number;
  message?: string;
  error?: string;
  refunded?: boolean;
}

/**
 * Step 1: Initiate withdrawal - Get fee transaction to sign
 */
export async function initiateWithdrawal(
  amount: number,
  walletAddress: string
): Promise<InitiateWithdrawalResponse> {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      return {
        success: false,
        error: "User must be authenticated",
      };
    }

    const token = await user.getIdToken();

    const response = await fetch(`${GATEKEEPER_URL}/api/withdraw/initiate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        amount: Math.floor(amount),
        walletAddress,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP error! status: ${response.status}`,
      };
    }

    return data;
  } catch (error) {
    console.error("Error initiating withdrawal:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Step 2: Complete withdrawal after fee payment
 */
export async function completeWithdrawal(
  feeSignature: string,
  amount: number,
  walletAddress: string
): Promise<CompleteWithdrawalResponse> {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    return {
      success: false,
      error: "User must be authenticated",
    };
  }

  // Create pending transaction log
  let transactionId: string | null = null;
  try {
    transactionId = await createPendingTransaction(user.uid, {
      type: "withdrawal",
      amount: Math.floor(amount),
      token: "MKIN",
      recipient: walletAddress,
      metadata: {
        feeSignature,
      },
    });
  } catch (logError) {
    console.error("Error logging transaction:", logError);
    // Continue with withdrawal even if logging fails
  }

  try {
    const token = await user.getIdToken();

    const response = await fetch(`${GATEKEEPER_URL}/api/withdraw/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        feeSignature,
        amount: Math.floor(amount),
        walletAddress,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Log failed transaction
      if (transactionId) {
        await failTransaction(user.uid, transactionId, new Error(data.error || `HTTP error! status: ${response.status}`));
      }

      return {
        success: false,
        error: data.error || `HTTP error! status: ${response.status}`,
        message: data.message,
        refunded: data.refunded,
      };
    }

    // Log successful transaction
    if (transactionId && data.txHash) {
      await completeTransaction(user.uid, transactionId, data.txHash, {
        newBalance: data.newBalance,
      });
    }

    return data;
  } catch (error) {
    console.error("Error completing withdrawal:", error);
    
    // Log failed transaction
    if (transactionId) {
      await failTransaction(user.uid, transactionId, error);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Helper: Deserialize transaction from base64
 */
export function deserializeTransaction(serializedTx: string): Transaction {
  const buffer = Buffer.from(serializedTx, "base64");
  return Transaction.from(buffer);
}

/**
 * Helper: Send transaction to Solana network
 */
export async function sendTransaction(
  connection: Connection,
  transaction: Transaction | VersionedTransaction,
  options?: { skipPreflight?: boolean }
): Promise<string> {
  // Transaction should already be signed by user's wallet
  const signature = await connection.sendRawTransaction(
    transaction.serialize(),
    {
      skipPreflight: options?.skipPreflight || false,
      preflightCommitment: "confirmed",
    }
  );

  // Wait for confirmation
  await connection.confirmTransaction(signature, "confirmed");

  return signature;
}

export const withdrawService = {
  initiateWithdrawal,
  completeWithdrawal,
  deserializeTransaction,
  sendTransaction,
};
