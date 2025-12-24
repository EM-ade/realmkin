import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

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
  try {
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

    // Call Cloud Function directly
    const claimTokensFunction = httpsCallable(functions, "enhancedClaimTokens");
    const result = await claimTokensFunction({
      amount: amount,
      walletAddress: walletAddress,
      claimType: "withdraw",
    });

    const data = result.data as { success: boolean; txHash?: string; error?: string };

    if (data.success) {
      return {
        success: true,
        txHash: data.txHash
      };
    } else {
      return {
        success: false,
        error: data.error || "Failed to claim tokens"
      };
    }
  } catch (error) {
    console.error("Error claiming tokens:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}
