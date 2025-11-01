import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";

export interface UserStakingData {
  wallet: string;
  total_staked: number;
  total_rewards_claimed: number;
  total_pending_rewards: number;
  total_rewards_all_time: number;
  last_claimed: any;
  created_at: any;
}

export interface StakeData {
  id: string;
  amount: number;
  lock_period: "flexible" | "30" | "90";
  start_date: any;
  unlock_date: any;
  status: "active" | "unstaking" | "completed";
  rewards_earned: number;
  pending_rewards: number;
  total_rewards: number;
}

export interface GlobalMetrics {
  totalValueLocked: number;
  totalStakers: number;
  activeStakes: number;
}

export interface StakingDataResponse {
  user: UserStakingData | null;
  stakes: StakeData[];
  metrics: GlobalMetrics;
}

/**
 * Hook to fetch and manage user staking data
 */
export function useStakingData() {
  const { account, isConnected } = useWeb3();
  const [data, setData] = useState<StakingDataResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStakingData = async () => {
    if (!account || !isConnected) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/user-stakes?wallet=${account}`);

      if (!response.ok) {
        throw new Error("Failed to fetch staking data");
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      console.error("Error fetching staking data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStakingData();

    // Refresh every 30 seconds
    const interval = setInterval(fetchStakingData, 30000);

    return () => clearInterval(interval);
  }, [account, isConnected]);

  return {
    data,
    loading,
    error,
    refetch: fetchStakingData,
    user: data?.user || null,
    stakes: data?.stakes || [],
    metrics: data?.metrics || { totalValueLocked: 0, totalStakers: 0, activeStakes: 0 },
  };
}

/**
 * Hook to fetch rewards for a specific stake
 */
export function useStakeRewards(stakeId: string | null) {
  const { account, isConnected } = useWeb3();
  const [rewards, setRewards] = useState<{
    pending: number;
    earned: number;
    total: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRewards = async () => {
    if (!account || !isConnected || !stakeId) {
      setRewards(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/claim-rewards?wallet=${account}`);

      if (!response.ok) {
        throw new Error("Failed to fetch rewards");
      }

      const result = await response.json();
      const stakeReward = result.stakes.find((s: any) => s.stakeId === stakeId);

      if (stakeReward) {
        setRewards({
          pending: stakeReward.pending,
          earned: stakeReward.earned,
          total: stakeReward.total,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      console.error("Error fetching rewards:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRewards();

    // Refresh every 30 seconds
    const interval = setInterval(fetchRewards, 30000);

    return () => clearInterval(interval);
  }, [account, isConnected, stakeId]);

  return {
    rewards,
    loading,
    error,
    refetch: fetchRewards,
  };
}
