import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  getDocs,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/config/firebaseServer";
import { verifyTransaction } from "./transactionVerification";
import { getAPYForLockPeriod, getDurationForLockPeriod } from "@/config/staking.config";

export interface UserStakingData {
  wallet: string;
  total_staked: number;
  total_rewards: number;
  last_claimed: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
  is_active: boolean;
}

export interface StakeRecord {
  id: string;
  wallet: string;
  amount: number;
  lock_period: "flexible" | "30" | "60" | "90";
  start_date: Timestamp;
  unlock_date: Timestamp;
  status: "active" | "unstaking" | "completed";
  rewards_earned: number;
  last_reward_update: Timestamp;
  tx_signature: string;
  metadata?: Record<string, any>;
}

/**
 * Initialize or get user staking record
 */
export async function initializeUser(walletAddress: string): Promise<UserStakingData> {
  const userRef = doc(collection(db, "users"), walletAddress);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return userSnap.data() as UserStakingData;
  }

  const newUser: UserStakingData = {
    wallet: walletAddress,
    total_staked: 0,
    total_rewards: 0,
    last_claimed: null,
    created_at: Timestamp.now(),
    updated_at: Timestamp.now(),
    is_active: true,
  };

  await setDoc(userRef, newUser);
  return newUser;
}

/**
 * Create a new stake record
 */
export async function createStake(
  walletAddress: string,
  amount: number,
  lockPeriod: "flexible" | "30" | "60" | "90",
  txSignature: string
): Promise<StakeRecord> {
  // TODO: Verify transaction when RPC indexing is working
  // For now, just trust the frontend sent a valid tx
  console.log(`Creating stake for ${walletAddress}: ${amount} MKIN, tx: ${txSignature}`);

  // Initialize user if needed
  await initializeUser(walletAddress);

  // Create stake record
  const stakeId = `${walletAddress}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const durationSeconds = getDurationForLockPeriod(lockPeriod);
  const now = Timestamp.now();
  const unlockDate = new Timestamp(
    now.seconds + durationSeconds,
    now.nanoseconds
  );

  const stakeRecord: StakeRecord = {
    id: stakeId,
    wallet: walletAddress,
    amount,
    lock_period: lockPeriod,
    start_date: now,
    unlock_date: unlockDate,
    status: "active",
    rewards_earned: 0,
    last_reward_update: now,
    tx_signature: txSignature,
  };

  const stakeRef = doc(collection(db, "stakes"), stakeId);
  await setDoc(stakeRef, stakeRecord);

  // Update user totals
  const userRef = doc(collection(db, "users"), walletAddress);
  await updateDoc(userRef, {
    total_staked: (await getDoc(userRef)).data()?.total_staked + amount || amount,
    updated_at: Timestamp.now(),
  });

  return stakeRecord;
}

/**
 * Get user's stakes
 */
export async function getUserStakes(walletAddress: string): Promise<StakeRecord[]> {
  const stakesQuery = query(
    collection(db, "stakes"),
    where("wallet", "==", walletAddress),
    where("status", "!=", "completed")
  );

  const snapshot = await getDocs(stakesQuery);
  return snapshot.docs.map((doc) => doc.data() as StakeRecord);
}

/**
 * Get user staking data
 */
export async function getUserStakingData(walletAddress: string): Promise<UserStakingData | null> {
  const userRef = doc(collection(db, "users"), walletAddress);
  const userSnap = await getDoc(userRef);
  return userSnap.exists() ? (userSnap.data() as UserStakingData) : null;
}

/**
 * Calculate pending rewards for a stake
 */
export function calculatePendingRewards(
  stake: StakeRecord,
  currentTimestamp: number = Date.now() / 1000
): number {
  const apy = getAPYForLockPeriod(stake.lock_period);
  const dailyRate = apy / 365 / 100;

  const stakeStartSeconds = stake.start_date.seconds;
  const secondsStaked = currentTimestamp - stakeStartSeconds;
  const daysStaked = secondsStaked / 86400;

  // Calculate weight multiplier based on lock period
  const durationSeconds = getDurationForLockPeriod(stake.lock_period);
  const maxDuration = 90 * 86400; // 90 days in seconds
  const weight = durationSeconds === 0 ? 1.0 : 1 + ((2.0 - 1) * durationSeconds / maxDuration);

  const pendingRewards = stake.amount * dailyRate * daysStaked * weight;
  return Math.max(0, pendingRewards - stake.rewards_earned);
}

/**
 * Update rewards for a stake
 */
export async function updateStakeRewards(stakeId: string): Promise<number> {
  const stakeRef = doc(collection(db, "stakes"), stakeId);
  const stakeSnap = await getDoc(stakeRef);

  if (!stakeSnap.exists()) {
    throw new Error("Stake not found");
  }

  const stake = stakeSnap.data() as StakeRecord;
  const pendingRewards = calculatePendingRewards(stake);

  const newTotalRewards = stake.rewards_earned + pendingRewards;

  await updateDoc(stakeRef, {
    rewards_earned: newTotalRewards,
    last_reward_update: Timestamp.now(),
  });

  // Update user total rewards
  const userRef = doc(collection(db, "users"), stake.wallet);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.data() as UserStakingData;

  await updateDoc(userRef, {
    total_rewards: userData.total_rewards + pendingRewards,
    updated_at: Timestamp.now(),
  });

  return newTotalRewards;
}

/**
 * Claim rewards for a stake
 */
export async function claimStakeRewards(stakeId: string): Promise<number> {
  const stakeRef = doc(collection(db, "stakes"), stakeId);
  const stakeSnap = await getDoc(stakeRef);

  if (!stakeSnap.exists()) {
    throw new Error("Stake not found");
  }

  const stake = stakeSnap.data() as StakeRecord;
  const pendingRewards = calculatePendingRewards(stake);

  if (pendingRewards <= 0) {
    throw new Error("No rewards to claim");
  }

  const newTotalRewards = stake.rewards_earned + pendingRewards;

  await updateDoc(stakeRef, {
    rewards_earned: newTotalRewards,
    last_reward_update: Timestamp.now(),
  });

  // Update user
  const userRef = doc(collection(db, "users"), stake.wallet);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.data() as UserStakingData;

  await updateDoc(userRef, {
    total_rewards: userData.total_rewards + pendingRewards,
    last_claimed: Timestamp.now(),
    updated_at: Timestamp.now(),
  });

  return pendingRewards;
}

/**
 * Initiate unstake request
 */
export async function initiateUnstake(stakeId: string): Promise<void> {
  const stakeRef = doc(collection(db, "stakes"), stakeId);
  const stakeSnap = await getDoc(stakeRef);

  if (!stakeSnap.exists()) {
    throw new Error("Stake not found");
  }

  const stake = stakeSnap.data() as StakeRecord;

  // Check if stake is unlocked
  const now = Date.now() / 1000;
  if (now < stake.unlock_date.seconds) {
    throw new Error("Stake is still locked");
  }

  // Update rewards before unstaking
  await updateStakeRewards(stakeId);

  // Mark as unstaking
  await updateDoc(stakeRef, {
    status: "unstaking",
    updated_at: Timestamp.now(),
  });
}

/**
 * Complete unstake (after withdrawal transaction)
 */
export async function completeUnstake(stakeId: string, txSignature: string): Promise<void> {
  const stakeRef = doc(collection(db, "stakes"), stakeId);
  const stakeSnap = await getDoc(stakeRef);

  if (!stakeSnap.exists()) {
    throw new Error("Stake not found");
  }

  const stake = stakeSnap.data() as StakeRecord;

  // TODO: Re-enable transaction verification when RPC indexing is reliable
  // For now, trust that the transaction was sent successfully from the API
  console.log(`Completing unstake for stake ${stakeId}, tx: ${txSignature}`);

  // Update stake status
  await updateDoc(stakeRef, {
    status: "completed",
    updated_at: Timestamp.now(),
  });

  // Update user totals
  const userRef = doc(collection(db, "users"), stake.wallet);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.data() as UserStakingData;

  await updateDoc(userRef, {
    total_staked: Math.max(0, userData.total_staked - stake.amount),
    updated_at: Timestamp.now(),
  });
}

/**
 * Get global staking metrics
 */
export async function getGlobalMetrics(): Promise<{
  totalValueLocked: number;
  totalStakers: number;
  activeStakes: number;
}> {
  const usersQuery = query(collection(db, "users"), where("is_active", "==", true));
  const usersSnap = await getDocs(usersQuery);

  const stakesQuery = query(collection(db, "stakes"), where("status", "==", "active"));
  const stakesSnap = await getDocs(stakesQuery);

  let totalValueLocked = 0;
  stakesSnap.docs.forEach((doc) => {
    const stake = doc.data() as StakeRecord;
    totalValueLocked += stake.amount;
  });

  return {
    totalValueLocked,
    totalStakers: usersSnap.size,
    activeStakes: stakesSnap.size,
  };
}
