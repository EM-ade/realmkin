"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useWeb3 } from "./Web3Context";
import { stakingService, StakeInfo, GlobalMetrics } from "@/services/stakingService";

interface StakingContextType {
  // User data
  stakes: StakeInfo[];
  totalStaked: number;
  totalRewards: number;
  walletBalance: number;
  
  // Global metrics
  globalTVL: number;
  totalStakers: number;
  rewardPoolBalance: number;
  
  // Actions
  createStake: (amount: number, lockPeriod: "flexible" | "30" | "60" | "90") => Promise<{ txId: string; stakeEntry: string }>;
  claimRewards: (stakeEntry: string) => Promise<{ txId: string }>;
  unstake: (stakeEntry: string) => Promise<{ txId: string }>;
  refreshStakes: () => Promise<void>;
  
  // State
  isLoading: boolean;
  error: string | null;
}

const StakingContext = createContext<StakingContextType>({
  stakes: [],
  totalStaked: 0,
  totalRewards: 0,
  walletBalance: 0,
  globalTVL: 0,
  totalStakers: 0,
  rewardPoolBalance: 0,
  createStake: async () => ({ txId: "", stakeEntry: "" }),
  claimRewards: async () => ({ txId: "" }),
  unstake: async () => ({ txId: "" }),
  refreshStakes: async () => {},
  isLoading: false,
  error: null,
});

export const useStaking = () => useContext(StakingContext);

export function StakingProvider({ children }: { children: ReactNode }) {
  const { account, isConnected } = useWeb3();
  const [stakes, setStakes] = useState<StakeInfo[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [globalMetrics, setGlobalMetrics] = useState<GlobalMetrics>({
    totalValueLocked: 0,
    totalStakers: 0,
    rewardPoolBalance: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Load stakes and balance when wallet connects
  useEffect(() => {
    if (isConnected && account) {
      refreshStakes();
      loadGlobalMetrics();
      loadWalletBalance();
    } else {
      setStakes([]);
      setWalletBalance(0);
    }
  }, [isConnected, account]);
  
  // Poll for real-time balance updates every 10 seconds
  useEffect(() => {
    if (!isConnected || !account) return;
    
    const interval = setInterval(() => {
      loadWalletBalance();
    }, 10000);
    
    return () => clearInterval(interval);
  }, [isConnected, account]);
  
  const refreshStakes = async () => {
    if (!account) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const userStakes = await stakingService.getUserStakes(account);
      setStakes(userStakes);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load stakes";
      setError(errorMessage);
      console.error("Error loading stakes:", err);
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadGlobalMetrics = async () => {
    try {
      const metrics = await stakingService.getGlobalMetrics();
      setGlobalMetrics(metrics);
    } catch (err) {
      console.error("Error loading global metrics:", err);
    }
  };
  
  const loadWalletBalance = async () => {
    if (!account) return;
    
    try {
      const balance = await stakingService.getTokenBalance(account);
      setWalletBalance(balance);
    } catch (err) {
      console.error("Error loading wallet balance:", err);
    }
  };
  
  const createStake = async (
    amount: number, 
    lockPeriod: "flexible" | "30" | "90"
  ): Promise<{ txId: string; stakeEntry: string }> => {
    if (!account) throw new Error("Wallet not connected");
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Import transaction utilities
      const { createStakingTransaction, recordStakeInBackend } = await import("@/utils/stakingTransactions");
      
      // Get the wallet adapter
      const wallet = (window as any).solana;
      if (!wallet) throw new Error("Wallet not found");
      
      // Step 1: Create and send the staking transaction
      const txResult = await createStakingTransaction(wallet, amount);
      
      if (!txResult.success) {
        throw new Error(txResult.error || "Failed to create staking transaction");
      }
      
      // Step 2: Record the stake in Firebase backend
      const stakeResult = await recordStakeInBackend(
        account,
        amount,
        lockPeriod,
        txResult.txSignature
      );
      
      if (!stakeResult.success) {
        throw new Error(stakeResult.error || "Failed to record stake");
      }
      
      // Refresh stakes and metrics
      await refreshStakes();
      await loadGlobalMetrics();
      
      return {
        txId: txResult.txSignature,
        stakeEntry: stakeResult.stakeId || "",
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to stake";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  const claimRewards = async (stakeEntry: string): Promise<{ txId: string }> => {
    if (!account) throw new Error("Wallet not connected");
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { claimRewardsFromBackend } = await import("@/utils/stakingTransactions");
      
      const result = await claimRewardsFromBackend(account, stakeEntry);
      
      if (!result.success) {
        throw new Error(result.error || "Failed to claim rewards");
      }
      
      // Refresh stakes
      await refreshStakes();
      
      return { txId: `claim-${stakeEntry}-${Date.now()}` };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to claim rewards";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  const unstake = async (stakeEntry: string): Promise<{ txId: string }> => {
    if (!account) throw new Error("Wallet not connected");
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { initiateUnstakingRequest } = await import("@/utils/stakingTransactions");
      
      const result = await initiateUnstakingRequest(account, stakeEntry);
      
      if (!result.success) {
        throw new Error(result.error || "Failed to initiate unstake");
      }
      
      // Refresh stakes and metrics
      await refreshStakes();
      await loadGlobalMetrics();
      
      return { txId: `unstake-${stakeEntry}-${Date.now()}` };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to unstake";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  const totalStaked = stakes.reduce((sum, stake) => sum + stake.amount, 0);
  const totalRewards = stakes.reduce((sum, stake) => sum + stake.rewards, 0);
  
  const value: StakingContextType = {
    stakes,
    totalStaked,
    totalRewards,
    walletBalance,
    globalTVL: globalMetrics.totalValueLocked,
    totalStakers: globalMetrics.totalStakers,
    rewardPoolBalance: globalMetrics.rewardPoolBalance,
    createStake,
    claimRewards,
    unstake,
    refreshStakes,
    isLoading,
    error,
  };
  
  return <StakingContext.Provider value={value}>{children}</StakingContext.Provider>;
}
