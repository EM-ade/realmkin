import { getAuth } from "firebase/auth";

export interface StakeResponse {
  success: boolean;
  stakeId?: string;
  error?: string;
}

/**
 * Stake an NFT using the new backend service
 * @param nftId The NFT ID to stake
 * @param walletAddress The user's wallet address
 * @returns StakeResponse with success status and stake ID
 */
export async function stakeNFT(
  nftId: string,
  walletAddress: string
): Promise<StakeResponse> {
  try {
    // Validate inputs
    if (!nftId) {
      return {
        success: false,
        error: "NFT ID is required",
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
      process.env.NEXT_PUBLIC_BACKEND_SERVICE_URL ||
      "https://gatekeeper-bot.fly.dev";

    // Call the new backend service
    const response = await fetch(`${backendUrl}/api/staking/stake`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        userId: user.uid,
        nftId: nftId,
        walletAddress: walletAddress,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || `HTTP error! status: ${response.status}`,
      };
    }

    const data = await response.json();

    if (data.success) {
      return {
        success: true,
        stakeId: data.stakeId,
      };
    } else {
      return {
        success: false,
        error: data.error || "Failed to stake NFT",
      };
    }
  } catch (error) {
    console.error("Error staking NFT:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Unstake an NFT using the new backend service
 * @param stakeId The stake ID to unstake
 * @returns StakeResponse with success status and stake ID
 */
export async function unstakeNFT(stakeId: string): Promise<StakeResponse> {
  try {
    // Validate inputs
    if (!stakeId) {
      return {
        success: false,
        error: "Stake ID is required",
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
      process.env.NEXT_PUBLIC_BACKEND_SERVICE_URL ||
      "https://gatekeeper-bot.fly.dev";

    // Call the new backend service
    const response = await fetch(`${backendUrl}/api/staking/unstake`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        userId: user.uid,
        stakeId: stakeId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || `HTTP error! status: ${response.status}`,
      };
    }

    const data = await response.json();

    if (data.success) {
      return {
        success: true,
        stakeId: data.stakeId,
      };
    } else {
      return {
        success: false,
        error: data.error || "Failed to unstake NFT",
      };
    }
  } catch (error) {
    console.error("Error unstaking NFT:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Get staking history for a user
 * @param userId The user ID
 * @param limit The maximum number of stakes to return
 * @returns Staking history
 */
export async function getStakingHistory(
  userId: string,
  limit: number = 10
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
      process.env.NEXT_PUBLIC_BACKEND_SERVICE_URL ||
      "https://gatekeeper-bot.fly.dev";

    // Call the new backend service
    const response = await fetch(
      `${backendUrl}/api/staking/history/${userId}?limit=${limit}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `HTTP error! status: ${response.status}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching staking history:", error);
    throw error;
  }
}
