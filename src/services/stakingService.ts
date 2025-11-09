import { Connection, PublicKey } from "@solana/web3.js";
import { calculateStakeWeight } from "../config/staking.config";
import { verifyTransaction } from "./transactionVerification";
import {
  createStake as fbCreateStake,
  getUserStakes as fbGetUserStakes,
  getGlobalMetrics as fbGetGlobalMetrics,
  claimStakeRewards,
  initiateUnstake,
  calculatePendingRewards,
} from "./firebaseStakingService";

export interface StakeInfo {
  stakeEntry: string;
  id: string;
  amount: number;
  duration: number;
  stakeTimestamp: number;
  unlockTime: number;
  weight: number;
  rewards: number;
  nonce: number;
  lockPeriod: "flexible" | "30" | "60" | "90";
  isUnlocked: boolean;
  daysUntilUnlock: number;
}

export interface GlobalMetrics {
  totalValueLocked: number;
  totalStakers: number;
  rewardPoolBalance: number;
}

class StakingService {
  private connection: Connection;
  
  constructor() {
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
    this.connection = new Connection(rpcUrl, "confirmed");
  }
  
  /**
   * Stake tokens - Creates a new stake in Firebase
   * 
   */
  async stake(
    uid: string,
    wallet: { publicKey?: { toString?: () => string } } | string,
    amount: number,
    lockPeriod: "flexible" | "30" | "60" | "90",
    txSignature: string
  ): Promise<{ txId: string; stakeEntry: string }> {
    try {
      // 1. Verify the on-chain transfer really happened
      const verification = await verifyTransaction(txSignature);
      if (!verification.isValid) {
        throw new Error(
          `Invalid stake transaction: ${verification.error || "failed validation"}`
        );
      }

      // 2. Persist stake record in Firestore
      const walletAddress = typeof wallet === 'string' 
        ? wallet 
        : (wallet.publicKey?.toString?.() || '');
      const stakeRecord = await fbCreateStake(
        uid,
        walletAddress,
        amount,
        lockPeriod,
        txSignature
      );

      return {
        txId: txSignature,
        stakeEntry: stakeRecord.id,
      };
    } catch (error) {
      console.error("Staking service error:", error);
      throw error;
    }
  }
  
  /**
   * Claim rewards from a stake
   * 
   * @param wallet - User's wallet
   * @param stakeEntry - Stake entry ID
   * @returns Transaction ID and rewards claimed
   */
  async claimRewards(
    uid: string,
    wallet: { publicKey?: { toString?: () => string } } | string,
    stakeEntry: string
  ): Promise<{ txId: string; rewardsClaimed: number }> {
    try {
      const rewardsClaimed = await claimStakeRewards(uid, stakeEntry);
      return {
        txId: `claim-${stakeEntry}-${Date.now()}`,
        rewardsClaimed,
      };
    } catch (error) {
      console.error("Error claiming rewards:", error);
      throw error;
    }
  }
  
  /**
   * Unstake tokens
   * 
   * @param wallet - User's wallet
   * @param stakeEntry - Stake entry ID
   * @returns Transaction ID and amount returned
   */
  async unstake(
    uid: string,
    wallet: { publicKey?: { toString?: () => string } } | string,
    stakeEntry: string
  ): Promise<{ txId: string; amountReturned: number }> {
    try {
      await initiateUnstake(uid, stakeEntry);
      
      // Get the stake to return the amount
      const walletAddress = typeof wallet === 'string' ? wallet : (wallet.publicKey?.toString?.() || '');
      const stakes = await fbGetUserStakes(walletAddress);
      const stake = stakes.find((s) => s.id === stakeEntry);
      
      return {
        txId: `unstake-${stakeEntry}-${Date.now()}`,
        amountReturned: stake?.amount || 0,
      };
    } catch (error) {
      console.error("Error unstaking:", error);
      throw error;
    }
  }
  
  /**
   * Get user's stakes
   * 
   * @param walletAddress - User's wallet address
   * @returns Array of stake info
   */
  async getUserStakes(uid: string): Promise<StakeInfo[]> {
    try {
      const fbStakes = await fbGetUserStakes(uid);
      
      const now = Date.now() / 1000;
      return fbStakes.map((stake) => {
        const daysUntilUnlock = Math.max(0, Math.ceil((stake.unlock_date.seconds - now) / 86400));
        return {
          stakeEntry: stake.id,
          id: stake.id,
          amount: stake.amount,
          duration: stake.unlock_date.seconds - stake.start_date.seconds,
          stakeTimestamp: stake.start_date.seconds,
          unlockTime: stake.unlock_date.seconds,
          weight: calculateStakeWeight(stake.unlock_date.seconds - stake.start_date.seconds),
          rewards: stake.rewards_earned + calculatePendingRewards(stake, now),
          nonce: 0,
          lockPeriod: stake.lock_period,
          isUnlocked: now >= stake.unlock_date.seconds,
          daysUntilUnlock,
        };
      });
    } catch (error) {
      console.error("Error getting user stakes:", error);
      return [];
    }
  }
  
  /**
   * Get global staking metrics
   * 
   * @returns Global metrics
   */
  async getGlobalMetrics(): Promise<GlobalMetrics> {
    try {
      const metrics = await fbGetGlobalMetrics();
      return {
        totalValueLocked: metrics.totalValueLocked,
        totalStakers: metrics.totalStakers,
        rewardPoolBalance: 0, // Would be calculated from reward fund
      };
    } catch (error) {
      console.error("Error getting global metrics:", error);
      return {
        totalValueLocked: 0,
        totalStakers: 0,
        rewardPoolBalance: 0,
      };
    }
  }
  
  /**
   * Get user's token balance
   * 
   * @param walletAddress - User's wallet address
   * @returns Token balance in token amount
   */
  async getTokenBalance(walletAddress: string): Promise<number> {
    try {
      const publicKey = new PublicKey(walletAddress);
      const tokenMint = new PublicKey(process.env.NEXT_PUBLIC_TOKEN_MINT || "");
      
      // Get token accounts for this wallet
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(publicKey, {
        mint: tokenMint,
      });

      if (tokenAccounts.value.length === 0) {
        return 0;
      }

      // Sum up all token account balances
      let totalBalance = 0;
      for (const account of tokenAccounts.value) {
        const balance = account.account.data.parsed?.info?.tokenAmount?.uiAmount || 0;
        totalBalance += balance;
      }

      return totalBalance;
    } catch (error) {
      console.error("Error getting token balance:", error);
      return 0;
    }
  }
}

export const stakingService = new StakingService();