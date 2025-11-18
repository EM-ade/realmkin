import { getAuth } from "firebase/auth";

export interface ClaimResponse {
  success: boolean;
  txHash?: string;
  error?: string;
}

/**
 * Claim MKIN tokens and transfer them to the user's wallet using the new backend service
 * @param amount The amount of tokens to claim
 * @param walletAddress The destination wallet address
 * @returns ClaimResponse with success status and transaction details
 */
export async function claimTokens(
  amount: number,
  walletAddress: string,
): Promise<ClaimResponse> {
  try {
    // Validate inputs
    if (!amount || amount <= 0) {
      return {
        success: false,
        error: "Amount must be greater than 0",
      };
    }

    if (!walletAddress) {
      return {
        success: false,
        error: "Wallet address is required",
      };
    }

    // Get Firebase auth token for authentication
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      return {
        success: false,
        error: "User must be authenticated",
      };
    }

    const token = await user.getIdToken();

    // Get backend service URL from environment variables
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_SERVICE_URL || "http://localhost:3001";

    // Call the new backend service
    const response = await fetch(`${backendUrl}/api/claim`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        walletAddress: walletAddress,
        amount: Math.floor(amount),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error:
          errorData.error ||
          errorData.details?.error ||
          `HTTP error! status: ${response.status}`,
      };
    }

    const data = await response.json();

    if (data.success && data.data) {
      return {
        success: true,
        txHash: data.data.transactionSignature,
      };
    } else {
      return {
        success: false,
        error: data.error || data.details || "Failed to claim tokens",
      };
    }
  } catch (error) {
    console.error("Error claiming tokens:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Get claim history for a user
 * @param userId The user ID
 * @param limit The maximum number of claims to return
 * @returns Claim history
 */
export async function getClaimHistory(
  userId: string,
  limit: number = 10,
): Promise<unknown> {
  try {
    // Get Firebase auth token for authentication
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      throw new Error("User must be authenticated");
    }

    const token = await user.getIdToken();

    // Get backend service URL from environment variables
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_SERVICE_URL || "http://localhost:3001";

    // Call the new backend service
    const response = await fetch(`${backendUrl}/api/claim/status`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `HTTP error! status: ${response.status}`,
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching claim history:", error);
    throw error;
  }
}
