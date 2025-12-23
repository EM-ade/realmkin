import { getAuth } from "firebase/auth";

const GATEKEEPER_URL =
  process.env.NEXT_PUBLIC_GATEKEEPER_URL || "https://gatekeeper-bot.fly.dev";

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
    const res = await fetch(`${GATEKEEPER_URL}/api/staking/overview`, {
      headers,
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
    const res = await fetch(`${GATEKEEPER_URL}/api/staking/calculate-fee`, {
      method: "POST",
      headers,
      body: JSON.stringify({ amount, feePercent }),
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
    const res = await fetch(`${GATEKEEPER_URL}/api/staking/stake`, {
      method: "POST",
      headers,
      body: JSON.stringify({ amount, txSignature, feeSignature }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Stake failed");
    }
    return res.json();
  },

  async claim(txSignature: string) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${GATEKEEPER_URL}/api/staking/claim`, {
      method: "POST",
      headers,
      body: JSON.stringify({ txSignature }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Claim failed");
    }
    return res.json();
  },

  async unstake(amount: number, txSignature: string) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${GATEKEEPER_URL}/api/staking/unstake`, {
      method: "POST",
      headers,
      body: JSON.stringify({ amount, txSignature }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Unstake failed");
    }
    return res.json();
  },
};
