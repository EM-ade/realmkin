import { Connection, PublicKey } from "@solana/web3.js";
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
   * @param wallet - User's wallet
   * @param amount - Amount to stake (in MKIN)
   * @param lockPeriod - Lock period selection
   * @param nonce - Unique nonce for this stake (used for tx signature generation)
   * @returns Transaction ID and stake entry address
   */
  async stake(
    wallet: any,
    amount: number,
    lockPeriod: "flexible" | "30" | "90",
    nonce: number = 0
  ): Promise<{ txId: string; stakeEntry: string }> {
    try {
      // In a real implementation, the frontend would:
      // 1. Create a transaction to send tokens to the staking wallet
      // 2. Sign and send it
      // 3. Get the transaction signature
      // 4. Pass it to the backend API
      
      // For now, we throw an error indicating the frontend needs to handle the transaction
      throw new Error(
        "Frontend must create and sign a transaction to send tokens to the staking wallet, then call POST /api/stake with the txSignature"
      );
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
    wallet: any,
    stakeEntry: string
  ): Promise<{ txId: string; rewardsClaimed: number }> {
    try {
      const rewardsClaimed = await claimStakeRewards(stakeEntry);
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
    wallet: any,
    stakeEntry: string
  ): Promise<{ txId: string; amountReturned: number }> {
    try {
      await initiateUnstake(stakeEntry);
      
      // Get the stake to return the amount
      const stakes = await fbGetUserStakes(wallet.publicKey?.toString() || "");
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
  async getUserStakes(walletAddress: string): Promise<StakeInfo[]> {
    try {
      const fbStakes = await fbGetUserStakes(walletAddress);
      
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
          weight: stake.lock_period === "flexible" ? 1.0 : stake.lock_period === "30" ? 1.5 : stake.lock_period === "60" ? 1.75 : 2.0,
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