"use client";

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { Connection, PublicKey, AccountInfo as SolanaAccountInfo, Transaction } from "@solana/web3.js";
import { StakingError } from "@/errors/StakingError";
import { getAssociatedTokenAddress } from "@solana/spl-token";
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
  refreshAll: () => Promise<void>;
  
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
  refreshAll: async () => {},
  isLoading: false,
  error: null,
});

export const useStaking = () => useContext(StakingContext);

export function StakingProvider({ children }: { children: ReactNode }) {
  const { account, isConnected, uid } = useWeb3();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, account]);
  
  // Real-time wallet balance via websocket subscription
  useEffect(() => {
    if (!isConnected || !account) return;

    // Use Helius RPC URL if available, fall back to standard RPC
    const rpcUrl = process.env.NEXT_PUBLIC_HELIUS_MAINNET_RPC_URL || process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
    const connection = new Connection(rpcUrl, "confirmed");
    let subId: number | null = null;

    (async () => {
      try {
        // Use the correct environment variable names based on network
        const isDevnet = process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'devnet';
        const tokenMintAddress = isDevnet
          ? process.env.NEXT_PUBLIC_MKIN_TOKEN_MINT_DEVNET || 'CARXmxarjsCwvzpmjVB2x4xkAo8fMgsAVUBPREoUGyZm'
          : process.env.NEXT_PUBLIC_MKIN_TOKEN_MINT_MAINNET || 'BKDGf6DnDHK87GsZpdWXyBqiNdcNb6KnoFcYbWPUhJLA';
        const tokenMint = new PublicKey(tokenMintAddress);
        const ata = await getAssociatedTokenAddress(tokenMint, new PublicKey(account));
        subId = connection.onAccountChange(
          ata,
          (info: SolanaAccountInfo<Buffer>) => {
            try {
              const data = info.data;
              if (data && data.length >= 64) {
                const uiAmount = Number(data.readBigUInt64LE(64)) / 1e6;
                setWalletBalance(uiAmount);
              }
            } catch (err) {
              console.error("Error parsing token account data:", err);
            }
          },
          "confirmed"
        );
      } catch (err) {
        console.error("Websocket balance listener error", err);
      }
    })();

    // Cleanup on disconnect
    return () => {
      if (subId !== null) connection.removeAccountChangeListener(subId);
    };
  }, [isConnected, account]);
  
  const refreshStakes = async () => {
    if (!account || !uid) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const userStakes = await stakingService.getUserStakes(uid);
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
    lockPeriod: "flexible" | "30" | "60" | "90"
  ): Promise<{ txId: string; stakeEntry: string }> => {
    if (!account || !uid) throw new StakingError("WALLET_NOT_CONNECTED");
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Import transaction utilities
      const { createStakingTransaction, recordStakeInBackend } = await import("@/utils/stakingTransactions");
      
      // Get the wallet adapter
      interface SolanaWallet {
        publicKey: PublicKey;
        signTransaction: (tx: Transaction) => Promise<Transaction>;
      }
      const wallet = (window as { solana?: SolanaWallet }).solana;
      if (!wallet) throw new Error("Wallet not found");
      
      // Step 1: Create and send the staking transaction
      const txResult = await createStakingTransaction(wallet, amount);
      
      if (!txResult.success) {
        throw new Error(txResult.error || "Failed to create staking transaction");
      }
      
      // Step 2: Record the stake in Firebase backend
      const stakeResult = await recordStakeInBackend(
        uid,
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
    if (!account || !uid) throw new StakingError("WALLET_NOT_CONNECTED");
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { claimRewardsFromBackend } = await import("@/utils/stakingTransactions");
      
      const result = await claimRewardsFromBackend(uid, account, stakeEntry);
      
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
    if (!account || !uid) throw new StakingError("WALLET_NOT_CONNECTED");

    try {
      const result = await stakingService.unstake(uid, account, stakeEntry);

      // Refresh stakes and metrics
      await refreshStakes();
      await loadGlobalMetrics();

      return { txId: result.txId };
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

  // Combined refresh helper
  const refreshAll = async () => {
    setIsLoading(true);
    try {
      await Promise.all([refreshStakes(), loadGlobalMetrics(), loadWalletBalance()]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to refresh all";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
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
    refreshAll,
    isLoading,
    error,
  };
  
  return <StakingContext.Provider value={value}>{children}</StakingContext.Provider>;
}
