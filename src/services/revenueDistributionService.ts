import { getAuth } from "firebase/auth";
import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";

const GATEKEEPER_BASE =
  process.env.NEXT_PUBLIC_GATEKEEPER_BASE || "https://gatekeeper-bmvu.onrender.com";

// Token mints
const EMPIRE_MINT = new PublicKey("EmpirdtfUMfBQXEjnNmTngeimjfizfuSBD3TN9zqzydj");
const MKIN_MINT = new PublicKey("BKDGf6DnDHK87GsZpdWXyBqiNdcNb6KnoFcYbWPUhJLA"); // Mainnet MKIN mint - must match backend

// Claim fee in USD (updated to include $0.90 site fee)
const CLAIM_FEE_USD = 1.00; // $0.10 base + $0.90 site fee

export interface RevenueEligibility {
  eligible: boolean;
  reason?: string;
  distributionId?: string;
  amountSol?: number;
  amountEmpire?: number;
  amountMkin?: number;
  amountUsd?: number;
  claimFeeUsd?: number;
  expiresAt?: string;
  nftCount?: number;
  weight?: number;
  claimedAt?: string;
}

export interface RevenueClaim {
  distributionId: string;
  amountSol: number;
  amountEmpire: number;
  amountMkin: number;
  nftCount: number;
  weight: number;
  amountUsd: number;
  payoutTx: string;
  claimedAt: string;
  status: string;
}

export interface RevenueClaimHistory {
  claims: RevenueClaim[];
  total: number;
}

export interface RevenueClaimResponse {
  success: boolean;
  amountSol?: number;
  amountEmpire?: number;
  amountMkin?: number;
  amountUsd?: number;
  payoutSignature?: string;
  feeSignature?: string;
  timestamp?: string;
  accountsCreated?: string[];
  error?: string;
}

export interface TokenAccountStatus {
  empire: {
    exists: boolean;
    address: string;
  };
  mkin: {
    exists: boolean;
    address: string;
  };
}

export interface ClaimFeeEstimate {
  baseFeeUsd: number;
  accountCreationFeeUsd: number;
  totalFeeUsd: number;
  totalFeeSol: number;
  accountsToCreate: {
    empire: boolean;
    mkin: boolean;
  };
}

/**
 * Check if the current user is eligible for revenue distribution
 */
export async function checkEligibility(): Promise<RevenueEligibility> {
  const auth = getAuth();
  if (!auth.currentUser) {
    throw new Error("User not authenticated");
  }

  const token = await auth.currentUser.getIdToken();

  const response = await fetch(
    `${GATEKEEPER_BASE}/api/revenue-distribution/check-eligibility`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to check eligibility");
  }

  return response.json();
}

/**
 * Claim revenue distribution
 * @param feeSignature - Solana transaction signature for the fee payment
 * @param distributionId - The distribution ID to claim
 */
export async function claimRevenue(
  feeSignature: string,
  distributionId: string
): Promise<RevenueClaimResponse> {
  const auth = getAuth();
  if (!auth.currentUser) {
    throw new Error("User not authenticated");
  }

  const token = await auth.currentUser.getIdToken();

  const response = await fetch(
    `${GATEKEEPER_BASE}/api/revenue-distribution/claim`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        feeSignature,
        distributionId,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to claim revenue");
  }

  return response.json();
}

/**
 * Get user's revenue claim history
 */
export async function getClaimHistory(): Promise<RevenueClaimHistory> {
  const auth = getAuth();
  if (!auth.currentUser) {
    throw new Error("User not authenticated");
  }

  const token = await auth.currentUser.getIdToken();

  const response = await fetch(
    `${GATEKEEPER_BASE}/api/revenue-distribution/history`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get claim history");
  }

  return response.json();
}

/**
 * Check token account status for a wallet
 */
export async function checkTokenAccounts(
  walletAddress: string
): Promise<TokenAccountStatus> {
  try {
    const heliusApiKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
    const rpcUrl = heliusApiKey
      ? `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`
      : process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
    const connection = new Connection(rpcUrl, "confirmed");

    const userPubkey = new PublicKey(walletAddress);

    // Get associated token addresses
    const empireAta = await getAssociatedTokenAddress(EMPIRE_MINT, userPubkey);
    const mkinAta = await getAssociatedTokenAddress(MKIN_MINT, userPubkey);

    // Check if accounts exist
    const [empireAccount, mkinAccount] = await Promise.all([
      connection.getAccountInfo(empireAta),
      connection.getAccountInfo(mkinAta),
    ]);

    return {
      empire: {
        exists: !!empireAccount,
        address: empireAta.toBase58(),
      },
      mkin: {
        exists: !!mkinAccount,
        address: mkinAta.toBase58(),
      },
    };
  } catch (error) {
    console.error("Error checking token accounts:", error);
    // Assume accounts don't exist on error
    return {
      empire: { exists: false, address: "" },
      mkin: { exists: false, address: "" },
    };
  }
}

/**
 * Get SOL price in USD
 */
async function getSolPrice(): Promise<number> {
  try {
    // Use backend service to get SOL price
    const response = await fetch(`${GATEKEEPER_BASE}/api/sol-price`);
    if (response.ok) {
      const data = await response.json();
      return data.price || 100; // Default fallback
    }
  } catch (error) {
    console.error("Error fetching SOL price:", error);
  }
  return 100; // Fallback price
}

/**
 * Calculate total claim fee including token account creation
 * UPDATED: Use backend calculation for consistency with backend verification
 */
export async function calculateClaimFee(
  walletAddress: string
): Promise<ClaimFeeEstimate> {
  try {
    const auth = getAuth();
    if (!auth.currentUser) {
      throw new Error("User not authenticated");
    }

    const token = await auth.currentUser.getIdToken();

    // Get fee estimate from backend (ensures consistency)
    const response = await fetch(
      `${GATEKEEPER_BASE}/api/revenue-distribution/calculate-fee`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      // Fallback to local calculation if backend unavailable
      console.warn("Backend fee calculation failed, using local calculation");
      return calculateClaimFeeLocal(walletAddress);
    }

    const data = await response.json();

    console.log("💵 Fee estimate from backend:", {
      baseFeeUsd: data.baseFeeUsd,
      accountCreationFeeUsd: data.accountCreationFeeUsd,
      totalFeeUsd: data.totalFeeUsd,
      totalFeeSol: data.totalFeeSol,
      solPrice: data.solPrice,
      accountsToCreate: data.accountsToCreate,
    });

    return {
      baseFeeUsd: data.baseFeeUsd,
      accountCreationFeeUsd: data.accountCreationFeeUsd,
      totalFeeUsd: data.totalFeeUsd,
      totalFeeSol: data.totalFeeSol,
      accountsToCreate: {
        empire: data.accountsToCreate.empire,
        mkin: data.accountsToCreate.mkin,
      },
    };
  } catch (error) {
    console.error("Error calculating claim fee from backend:", error);
    // Fallback to local calculation
    return calculateClaimFeeLocal(walletAddress);
  }
}

/**
 * Local fallback fee calculation
 */
async function calculateClaimFeeLocal(
  walletAddress: string
): Promise<ClaimFeeEstimate> {
  try {
    const TOKEN_ACCOUNT_CREATION_FEE_USD = 1.00; // $1.00 per account
    const solPrice = await getSolPrice();

    const accounts = await checkTokenAccounts(walletAddress);
    let accountCreationCount = 0;

    if (!accounts.empire.exists) accountCreationCount++;
    if (!accounts.mkin.exists) accountCreationCount++;

    const accountCreationFeeUsd = accountCreationCount * TOKEN_ACCOUNT_CREATION_FEE_USD;
    const totalFeeUsd = CLAIM_FEE_USD + accountCreationFeeUsd;
    const totalFeeSol = totalFeeUsd / solPrice;

    return {
      baseFeeUsd: CLAIM_FEE_USD,
      accountCreationFeeUsd,
      totalFeeUsd,
      totalFeeSol,
      accountsToCreate: {
        empire: !accounts.empire.exists,
        mkin: !accounts.mkin.exists,
      },
    };
  } catch (error) {
    console.error("Error calculating claim fee locally:", error);
    // Return base fee as fallback
    const solPrice = await getSolPrice();
    return {
      baseFeeUsd: CLAIM_FEE_USD,
      accountCreationFeeUsd: 0,
      totalFeeUsd: CLAIM_FEE_USD,
      totalFeeSol: CLAIM_FEE_USD / solPrice,
      accountsToCreate: {
        empire: false,
        mkin: false,
      },
    };
  }
}

/**
 * Helper to format distribution month from ID
 * Example: revenue_dist_2026_02 -> "February 2026"
 */
export function formatDistributionMonth(distributionId: string): string {
  const match = distributionId.match(/revenue_dist_(\d{4})_(\d{2})/);
  if (!match) return distributionId;

  const year = match[1];
  const month = parseInt(match[2], 10);
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return `${monthNames[month - 1]} ${year}`;
}
