import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createTransferCheckedInstruction,
  getAccount,
} from "@solana/spl-token";
import { STAKING_CONFIG } from "@/config/staking.config";

/**
 * Top up the reward pool with collected fees
 * This should be called periodically (e.g., weekly) to fund staking rewards
 *
 * @param connection - Solana connection
 * @param adminWallet - Admin wallet with authority
 * @param amount - Amount to transfer (in MKIN, not lamports)
 * @returns Transaction signature
 */
export async function topUpRewardPool(
  connection: Connection,
  adminWallet: {
    publicKey: PublicKey;
    sendTransaction: (tx: Transaction, conn: Connection) => Promise<string>;
  },
  amount: number
): Promise<string> {
  const stakePoolAddress = process.env.NEXT_PUBLIC_STAKING_POOL_ADDRESS;
  const mkinMint = process.env.NEXT_PUBLIC_MKIN_TOKEN_MINT;

  if (!stakePoolAddress || !mkinMint) {
    throw new Error("Staking pool or token mint not configured");
  }

  const stakePoolPubKey = new PublicKey(stakePoolAddress);
  const mintPubKey = new PublicKey(mkinMint);

  // Get reward pool ATA (owned by stake pool PDA)
  const rewardPoolAta = getAssociatedTokenAddressSync(
    mintPubKey,
    stakePoolPubKey,
    true // allowOwnerOffCurve for PDA
  );

  // Get admin's token account
  const adminTokenAccount = getAssociatedTokenAddressSync(
    mintPubKey,
    adminWallet.publicKey
  );

  // Create transfer instruction
  const transferIx = createTransferCheckedInstruction(
    adminTokenAccount,
    mintPubKey,
    rewardPoolAta,
    adminWallet.publicKey,
    amount * 1e9, // Convert to lamports (9 decimals)
    9 // decimals
  );

  // Build and send transaction
  const transaction = new Transaction().add(transferIx);
  const signature = await adminWallet.sendTransaction(transaction, connection);

  await connection.confirmTransaction(signature, "confirmed");

  console.log("Reward pool topped up:", {
    amount,
    signature,
  });

  return signature;
}

/**
 * Calculate weekly rewards from collected fees
 *
 * @param totalFeesCollected - Total fees collected from transfers
 * @returns Amount to allocate to reward pool
 */
export function calculateWeeklyRewards(totalFeesCollected: number): number {
  return totalFeesCollected * STAKING_CONFIG.REWARD_POOL_ALLOCATION;
}

/**
 * Get reward pool balance
 *
 * @param connection - Solana connection
 * @returns Current reward pool balance
 */
export async function getRewardPoolBalance(
  connection: Connection
): Promise<number> {
  const stakePoolAddress = process.env.NEXT_PUBLIC_STAKING_POOL_ADDRESS;
  const mkinMint = process.env.NEXT_PUBLIC_MKIN_TOKEN_MINT;

  if (!stakePoolAddress || !mkinMint) {
    throw new Error("Staking pool or token mint not configured");
  }

  const stakePoolPubKey = new PublicKey(stakePoolAddress);
  const mintPubKey = new PublicKey(mkinMint);

  // Get reward pool ATA
  const rewardPoolAta = getAssociatedTokenAddressSync(
    mintPubKey,
    stakePoolPubKey,
    true
  );

  try {
    const accountInfo = await getAccount(connection, rewardPoolAta);
    return Number(accountInfo.amount) / 1e9; // Convert from lamports
  } catch (error) {
    console.error("Error fetching reward pool balance:", error);
    return 0;
  }
}

/**
 * Calculate recommended reward pool top-up amount
 * Based on current TVL and APY rates
 *
 * @param totalValueLocked - Current TVL
 * @param daysToFund - Number of days to fund
 * @returns Recommended top-up amount
 */
export function calculateRecommendedTopUp(
  totalValueLocked: number,
  daysToFund: number = 7
): number {
  // Use fixed 30% APR (ROI)
  const avgAPY = STAKING_CONFIG.FIXED_APR;

  // Calculate daily rewards needed
  const dailyRate = avgAPY / 365 / 100;
  const dailyRewards = totalValueLocked * dailyRate;

  // Total for the period
  return dailyRewards * daysToFund;
}

/**
 * Check if reward pool needs top-up
 *
 * @param connection - Solana connection
 * @param totalValueLocked - Current TVL
 * @param minDaysCovered - Minimum days the pool should cover
 * @returns Whether top-up is needed and recommended amount
 */
export async function checkRewardPoolHealth(
  connection: Connection,
  totalValueLocked: number,
  minDaysCovered: number = 7
): Promise<{
  needsTopUp: boolean;
  currentBalance: number;
  recommendedTopUp: number;
  daysCovered: number;
}> {
  const currentBalance = await getRewardPoolBalance(connection);
  const recommendedTopUp = calculateRecommendedTopUp(
    totalValueLocked,
    minDaysCovered
  );

  // Calculate how many days current balance covers
  const dailyRewards = recommendedTopUp / minDaysCovered;
  const daysCovered = dailyRewards > 0 ? currentBalance / dailyRewards : 0;

  return {
    needsTopUp: daysCovered < minDaysCovered,
    currentBalance,
    recommendedTopUp: Math.max(0, recommendedTopUp - currentBalance),
    daysCovered,
  };
}
