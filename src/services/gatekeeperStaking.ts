import { getAuth } from "firebase/auth";
import environmentConfig from "../config/environment";

// Validate environment configuration
try {
  environmentConfig.validateRequiredEnvVars();
  console.log("✅ Frontend environment configuration validated");
} catch (error) {
  console.error("❌ Frontend environment validation failed:", error instanceof Error ? error.message : String(error));
}

const apiConfig = environmentConfig.apiConfig;
const GATEKEEPER_URL = apiConfig.gatekeeperUrl;

console.log(`🌐 Using Gatekeeper URL: ${GATEKEEPER_URL}`);

async function getAuthHeaders() {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      throw new Error("Not authenticated - user must be logged in");
    }
    const token = await user.getIdToken();
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  } catch (e) {
    console.error("Error getting auth headers:", e);
    throw e; // Re-throw instead of returning empty headers
  }
}

export const StakingAPI = {
  async getOverview() {
    const headers = await getAuthHeaders();
    const res = await fetch(`${GATEKEEPER_URL}${apiConfig.endpoints.staking}/overview`, {
      headers,
      signal: AbortSignal.timeout(apiConfig.timeout),
    });
    if (!res.ok) {
      const errorText = await res.text();
      console.error("Overview fetch failed:", res.status, errorText);
      throw new Error(
        `Failed to fetch staking overview: ${res.status} ${errorText}`
      );
    }
    return res.json();
  },

  async calculateFee(amount: number, feePercent: number = 5) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${GATEKEEPER_URL}${apiConfig.endpoints.staking}/calculate-fee`, {
      method: "POST",
      headers,
      body: JSON.stringify({ amount, feePercent }),
      signal: AbortSignal.timeout(apiConfig.timeout),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Fee calculation failed");
    }
    return res.json() as Promise<{
      feeInSol: number;
      feeInMkin: number;
      feePercent: number;
      mkinPriceUsd: number;
      solPriceUsd: number;
    }>;
  },

  async stake(amount: number, txSignature: string, feeSignature: string) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${GATEKEEPER_URL}${apiConfig.endpoints.staking}/stake`, {
      method: "POST",
      headers,
      body: JSON.stringify({ amount, txSignature, feeSignature }),
      signal: AbortSignal.timeout(apiConfig.timeout),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Stake failed");
    }
    return res.json();
  },

  async claim(txSignature: string) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${GATEKEEPER_URL}${apiConfig.endpoints.staking}/claim`, {
      method: "POST",
      headers,
      body: JSON.stringify({ txSignature }),
      signal: AbortSignal.timeout(apiConfig.timeout),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Claim failed");
    }
    return res.json();
  },

  async unstake(amount: number, txSignature: string) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${GATEKEEPER_URL}${apiConfig.endpoints.staking}/unstake`, {
      method: "POST",
      headers,
      body: JSON.stringify({ amount, txSignature }),
      signal: AbortSignal.timeout(apiConfig.timeout),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Unstake failed");
    }
    return res.json();
  },

  async refreshBoosters() {
    const headers = await getAuthHeaders();
    const res = await fetch(`${GATEKEEPER_URL}${apiConfig.endpoints.boosters}/refresh`, {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(apiConfig.timeout),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Booster refresh failed");
    }
    return res.json();
  },

  async getBoostersWithMetadata() {
    const headers = await getAuthHeaders();
    const res = await fetch(`${GATEKEEPER_URL}${apiConfig.endpoints.boosters}/with-metadata`, {
      headers,
      signal: AbortSignal.timeout(apiConfig.timeout),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to fetch boosters with metadata");
    }
    return res.json() as Promise<{
      success: boolean;
      data: {
        activeBoosters: Array<{
          type: string;
          name: string;
          multiplier: number;
          category?: string;
          mints: string[];
          detectedAt: Date | string;
          nftDetails?: Array<{
            mint: string;
            name: string;
            image: string | null;
            symbol?: string;
            description?: string;
            attributes?: Array<{ trait_type: string; value: string }>;
          }>;
        }>;
        stackedMultiplier: number;
        nftDetails: Array<{
          mint: string;
          name: string;
          image: string | null;
        }>;
        boosterCount: number;
        lastUpdated: string | null;
      };
    }>;
  },
};
