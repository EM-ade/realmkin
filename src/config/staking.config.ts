import { BN } from "@coral-xyz/anchor";

export const STAKING_CONFIG = {
  // Fixed staking parameters
  FIXED_APR: 30, // 30% annual percentage rate (fixed)
  BASE_MINING_RATE: 0.000000009512937595, // ~9.51e-9 SOL per second per MKIN staked (achieves 30% APR)

  // Mining Boosters (increase mining rate above base)
  BOOSTER_MULTIPLIERS: {
    realmkin_1_1: 1.25, // Realmkin 1/1 (lowest boost) - 25% increase
    customized_1_1: 1.5, // Customized 1/1 (mid-tier boost) - 50% increase
    realmkin_miner: 2.0, // Realmkin Miner (top-tier boost) - 100% increase
  },

  // Legacy fields (kept for backward compatibility)
  LOCK_PERIODS: {
    flexible: 0, // No lock
    "30": 30 * 86400, // 30 days
    "60": 60 * 86400, // 60 days
    "90": 90 * 86400, // 90 days
  },

  MAX_WEIGHT: new BN(2_000_000_000), // 2x max multiplier
  MIN_DURATION: new BN(0), // Flexible (0 seconds)
  MAX_DURATION: new BN(90 * 86400), // 90 days

  REWARD_POOL_ALLOCATION: 0.3, // 30% of transfer fees
  LIQUIDITY_POOL_ALLOCATION: 0.7, // 70% of transfer fees
} as const;

/**
 * Calculate mining rewards based on fixed rate
 *
 * @param stakedAmount - Amount of MKIN staked
 * @param durationSeconds - Duration staked in seconds
 * @param boosterMultiplier - Booster multiplier (1.0 = no boost, 1.25-2.0 = with boost)
 * @returns Total SOL rewards
 */
export function calculateMiningRewards(
  stakedAmount: number,
  durationSeconds: number,
  boosterMultiplier: number = 1.0
): number {
  const baseRewards =
    stakedAmount * durationSeconds * STAKING_CONFIG.BASE_MINING_RATE;
  return baseRewards * boosterMultiplier;
}

/**
 * Calculate mining rate (SOL per second)
 *
 * @param stakedAmount - Amount of MKIN staked
 * @param boosterMultiplier - Booster multiplier (1.0 = no boost)
 * @returns SOL per second
 */
export function calculateMiningRate(
  stakedAmount: number,
  boosterMultiplier: number = 1.0
): number {
  return stakedAmount * STAKING_CONFIG.BASE_MINING_RATE * boosterMultiplier;
}

/**
 * Get booster multiplier by type
 *
 * @param boosterType - Type of booster
 * @returns Multiplier value
 */
export function getBoosterMultiplier(boosterType: string): number {
  const type = boosterType.toLowerCase();

  if (type.includes("realmkin_miner") || type.includes("miner")) {
    return STAKING_CONFIG.BOOSTER_MULTIPLIERS.realmkin_miner;
  } else if (type.includes("customized") || type.includes("custom")) {
    return STAKING_CONFIG.BOOSTER_MULTIPLIERS.customized_1_1;
  } else if (type.includes("realmkin") || type.includes("1/1")) {
    return STAKING_CONFIG.BOOSTER_MULTIPLIERS.realmkin_1_1;
  }

  return 1.0; // No boost
}

/**
 * Calculate estimated rewards for a stake (LEGACY - kept for backward compatibility)
 *
 * @param amount - Amount staked
 * @param durationDays - Duration in days
 * @param apy - Annual percentage yield
 * @returns Estimated rewards
 */
export function estimateRewards(
  amount: number,
  durationDays: number,
  apy: number
): number {
  // Use new fixed-rate calculation
  return calculateMiningRewards(amount, durationDays * 86400, 1.0);
}

/**
 * Get APY (always returns fixed 30% APR)
 */
export function getAPYForLockPeriod(
  lockPeriod: "flexible" | "30" | "60" | "90"
): number {
  return STAKING_CONFIG.FIXED_APR;
}

/**
 * Get duration in seconds for a lock period
 */
export function getDurationForLockPeriod(
  lockPeriod: "flexible" | "30" | "60" | "90"
): number {
  return STAKING_CONFIG.LOCK_PERIODS[lockPeriod];
}

/**
 * Format duration for display
 */
export function formatDuration(seconds: number): string {
  if (seconds === 0) return "Flexible";
  const days = Math.floor(seconds / 86400);
  if (days === 1) return "1 day";
  return `${days} days`;
}

/**
 * Calculate unlock time
 */
export function calculateUnlockTime(
  stakeTimestamp: number,
  durationSeconds: number
): Date {
  return new Date((stakeTimestamp + durationSeconds) * 1000);
}

/**
 * Check if stake is unlocked
 */
export function isStakeUnlocked(
  stakeTimestamp: number,
  durationSeconds: number
): boolean {
  const unlockTime = stakeTimestamp + durationSeconds;
  return now >= unlockTime;
}

/**
 * Calculate stake weight based on duration
 * Currently returns 1.0 as the APR is fixed
 *
 * @param durationSeconds - Duration in seconds
 * @returns Weight multiplier
 */
export function calculateStakeWeight(durationSeconds: number): number {
  return 1.0;
}
