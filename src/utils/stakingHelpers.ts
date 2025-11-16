/**
 * Format token amount with decimals
 */
export function formatTokenAmount(amount: number, decimals: number = 6): string {
  return (amount / Math.pow(10, decimals)).toFixed(2);
}

/**
 * Parse token amount to smallest unit
 */
export function parseTokenAmount(amount: number, decimals: number = 6): number {
  return Math.floor(amount * Math.pow(10, decimals));
}

/**
 * Format date to readable string
 */
export function formatDate(timestamp: unknown): string {
  if (!timestamp) return "N/A";
  
  const date = (timestamp as { toDate?: () => Date }).toDate ? (timestamp as { toDate: () => Date }).toDate() : new Date(timestamp as string | number);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Calculate days until unlock
 */
export function daysUntilUnlock(unlockTimestamp: unknown): number {
  if (!unlockTimestamp) return 0;
  
  const unlockDate = (unlockTimestamp as { toDate?: () => Date }).toDate ? (unlockTimestamp as { toDate: () => Date }).toDate() : new Date(unlockTimestamp as string | number);
  const now = new Date();
  const diffMs = unlockDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
}

/**
 * Check if stake is locked
 */
export function isStakeLocked(unlockTimestamp: unknown): boolean {
  return daysUntilUnlock(unlockTimestamp) > 0;
}

/**
 * Get lock period label
 */
export function getLockPeriodLabel(lockPeriod: string): string {
  const labels: Record<string, string> = {
    flexible: "Flexible (No Lock)",
    "30": "30 Days",
    "90": "90 Days",
  };
  return labels[lockPeriod] || lockPeriod;
}

/**
 * Get APY for lock period
 */
export function getAPYForPeriod(lockPeriod: string): number {
  const apyRates: Record<string, number> = {
    flexible: 5,
    "30": 12,
    "90": 25,
  };
  return apyRates[lockPeriod] || 5;
}

/**
 * Format percentage
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`;
}

/**
 * Format currency
 */
export function formatCurrency(amount: number, symbol: string = "$"): string {
  return `${symbol}${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Validate Solana wallet address
 */
export function isValidSolanaAddress(address: string): boolean {
  try {
    // Solana addresses are base58 encoded and typically 32-44 characters
    // More thorough validation than basic length/character checks
    if (!address || address.length < 32 || address.length > 44) return false;
    
    // Check if it contains only valid base58 characters
    const base58Regex = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;
    return base58Regex.test(address);
  } catch {
    return false;
  }
}

/**
 * Shorten wallet address for display
 */
export function shortenAddress(address: string, chars: number = 4): string {
  if (!address) return "";
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Calculate total rewards including pending
 */
export function calculateTotalRewards(
  earnedRewards: number,
  pendingRewards: number
): number {
  return earnedRewards + pendingRewards;
}

/**
 * Get status badge color
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: "bg-green-500",
    unstaking: "bg-yellow-500",
    completed: "bg-gray-500",
  };
  return colors[status] || "bg-gray-500";
}

/**
 * Get status badge text
 */
export function getStatusText(status: string): string {
  const texts: Record<string, string> = {
    active: "Active",
    unstaking: "Unstaking",
    completed: "Completed",
  };
  return texts[status] || status;
}

/**
 * Calculate estimated annual rewards
 */
export function estimateAnnualRewards(
  stakedAmount: number,
  lockPeriod: string
): number {
  const apy = getAPYForPeriod(lockPeriod);
  return stakedAmount * (apy / 100);
}

/**
 * Calculate estimated monthly rewards
 */
export function estimateMonthlyRewards(
  stakedAmount: number,
  lockPeriod: string
): number {
  return estimateAnnualRewards(stakedAmount, lockPeriod) / 12;
}

/**
 * Calculate estimated daily rewards
 */
export function estimateDailyRewards(
  stakedAmount: number,
  lockPeriod: string
): number {
  return estimateAnnualRewards(stakedAmount, lockPeriod) / 365;
}
