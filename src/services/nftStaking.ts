import { getAuth } from "firebase/auth";
import environmentConfig from "../config/environment";

const apiConfig = environmentConfig.apiConfig;
const GATEKEEPER_URL = apiConfig.gatekeeperUrl;

async function getAuthHeaders() {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      throw new Error("Not authenticated");
    }
    const token = await user.getIdToken();
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  } catch (e) {
    console.error("Error getting auth headers:", e);
    throw e;
  }
}

export const NftStakingAPI = {
  // Get pool stats (no auth required)
  async getPoolStats() {
    const res = await fetch(`${GATEKEEPER_URL}/api/nft-staking/pool`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch pool stats: ${res.status}`);
    }
    return res.json();
  },

  // Get user's staking stats (requires auth)
  async getUserStats() {
    const headers = await getAuthHeaders();
    const res = await fetch(`${GATEKEEPER_URL}/api/nft-staking/me`, {
      headers,
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch user stats: ${res.status}`);
    }
    return res.json();
  },

  // Get available NFTs in user's wallet
  async getWalletNfts() {
    const headers = await getAuthHeaders();
    const res = await fetch(`${GATEKEEPER_URL}/api/nft-staking/wallet`, {
      headers,
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch wallet NFTs: ${res.status}`);
    }
    return res.json();
  },

  // Calculate staking fee
  async calculateFee(nftCount: number) {
    const res = await fetch(`${GATEKEEPER_URL}/api/nft-staking/calculate-fee`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nftCount }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      throw new Error(`Failed to calculate fee: ${res.status}`);
    }
    return res.json();
  },

  // Stake NFTs
  async stakeNfts(nftMints: string[], feeSignature: string) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${GATEKEEPER_URL}/api/nft-staking/stake`, {
      method: "POST",
      headers,
      body: JSON.stringify({ nftMints, feeSignature }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to stake NFTs: ${res.status} ${errorText}`);
    }
    return res.json();
  },

  // Unstake NFT
  async unstakeNft(nftMint: string) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${GATEKEEPER_URL}/api/nft-staking/unstake`, {
      method: "POST",
      headers,
      body: JSON.stringify({ nftMint }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to unstake NFT: ${res.status} ${errorText}`);
    }
    return res.json();
  },

  // Claim rewards
  async claimRewards() {
    const headers = await getAuthHeaders();
    const res = await fetch(`${GATEKEEPER_URL}/api/nft-staking/claim`, {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to claim rewards: ${res.status} ${errorText}`);
    }
    return res.json();
  },
};

export default NftStakingAPI;