import { BN } from "@coral-xyz/anchor";

export const STAKING_CONFIG = {
  // Lock periods in seconds
  LOCK_PERIODS: {
    flexible: 0,              // No lock
    "30": 30 * 86400,         // 30 days
    "60": 60 * 86400,         // 60 days
    "90": 90 * 86400,         // 90 days
  },
  
  // APY rates (annual percentage yield) - INCREASED BY 300% FOR TESTING
  APY_RATES: {
    flexible: 20,             // 5% * 4 = 20% APY
    "30": 48,                 // 12% * 4 = 48% APY
    "60": 64,                 // 16% * 4 = 64% APY
    "90": 100,                // 25% * 4 = 100% APY
  },
  
  // Weight configuration for Streamflow
  MAX_WEIGHT: new BN(2_000_000_000),  // 2x max multiplier
  MIN_DURATION: new BN(0),             // Flexible (0 seconds)
  MAX_DURATION: new BN(90 * 86400),    // 90 days
  
  // Reward distribution (30% of transfer fees go to rewards)
  REWARD_POOL_ALLOCATION: 0.30,        // 30% of transfer fees
  LIQUIDITY_POOL_ALLOCATION: 0.70,     // 70% of transfer fees
} as const;

/**
 * Calculate stake weight based on duration
 * Weight determines reward multiplier
 * 
 * @param durationSeconds - Stake duration in seconds
 * @returns Weight multiplier (1.0 to 2.0)
 */
export function calculateStakeWeight(durationSeconds: number): number {
  const maxDuration = STAKING_CONFIG.MAX_DURATION.toNumber();
  const maxWeight = 2.0;
  
  if (durationSeconds === 0) return 1.0; // Flexible staking = 1x
  
  // Linear interpolation between 1x and 2x
  return 1 + ((maxWeight - 1) * durationSeconds / maxDuration);
}

/**
 * Calculate estimated rewards for a stake
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
  const dailyRate = apy / 365 / 100;
  const weight = calculateStakeWeight(durationDays * 86400);
  return amount * dailyRate * durationDays * weight;
}

/**
 * Get APY for a specific lock period
 */
export function getAPYForLockPeriod(lockPeriod: "flexible" | "30" | "60" | "90"): number {
  return STAKING_CONFIG.APY_RATES[lockPeriod];
}

/**
 * Get duration in seconds for a lock period
 */
export function getDurationForLockPeriod(lockPeriod: "flexible" | "30" | "60" | "90"): number {
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
export function calculateUnlockTime(stakeTimestamp: number, durationSeconds: number): Date {
  return new Date((stakeTimestamp + durationSeconds) * 1000);
}

/**
 * Check if stake is unlocked
 */
export function isStakeUnlocked(stakeTimestamp: number, durationSeconds: number): boolean {
  const unlockTime = stakeTimestamp + durationSeconds;
  const now = Math.floor(Date.now() / 1000);
  return now >= unlockTime;
}
