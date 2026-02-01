import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { getAuth } from "firebase/auth";
import {
  createPendingTransaction,
  completeTransaction,
  failTransaction,
} from "./transactionHistoryService";

export interface ClaimResponse {
  success: boolean;
  txHash?: string;
  error?: string;
}

/**
 * Claim MKIN tokens and transfer them to the user's wallet
 * @param amount The amount of tokens to claim
 * @param walletAddress The destination wallet address
 * @returns ClaimResponse with success status and transaction details
 */
export async function claimTokens(
  amount: number,
  walletAddress: string
): Promise<ClaimResponse> {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    return {
      success: false,
      error: "User must be authenticated"
    };
  }

  // Validate inputs
  if (!amount || amount <= 0) {
    return {
      success: false,
      error: "Amount must be greater than 0"
    };
  }

  if (!walletAddress) {
    return {
      success: false,
      error: "Wallet address is required"
    };
  }

  // Create pending transaction log
  let transactionId: string | null = null;
  try {
    transactionId = await createPendingTransaction(user.uid, {
      type: "claim",
      amount: amount,
      token: "MKIN",
      recipient: walletAddress,
    });
  } catch (logError) {
    console.error("Error logging transaction:", logError);
  }

  try {
    // Call Cloud Function directly
    const claimTokensFunction = httpsCallable(functions, "enhancedClaimTokens");
    const result = await claimTokensFunction({
      amount: amount,
      walletAddress: walletAddress,
      claimType: "withdraw",
    });

    const data = result.data as { success: boolean; txHash?: string; error?: string };

    if (data.success) {
      // Log successful transaction
      if (transactionId && data.txHash) {
        await completeTransaction(user.uid, transactionId, data.txHash);
      }

      return {
        success: true,
        txHash: data.txHash
      };
    } else {
      // Log failed transaction
      if (transactionId) {
        await failTransaction(user.uid, transactionId, new Error(data.error || "Failed to claim tokens"));
      }

      return {
        success: false,
        error: data.error || "Failed to claim tokens"
      };
    }
  } catch (error) {
    console.error("Error claiming tokens:", error);
    
    // Log failed transaction
    if (transactionId) {
      await failTransaction(user.uid, transactionId, error);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}
