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
import {
  createPendingTransaction,
  completeTransaction,
  failTransaction,
} from "./transactionHistoryService";

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
    const rpcUrl =
      process.env.NEXT_PUBLIC_HELIUS_MAINNET_RPC_URL ||
      process.env.NEXT_PUBLIC_SOLANA_MAINNET_RPC_URL ||
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
      "https://api.mainnet-beta.solana.com";
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
    // Create pending transaction log
    let transactionId: string | null = null;
    try {
      transactionId = await createPendingTransaction(uid, {
        type: "stake",
        amount: amount,
        token: "MKIN",
        metadata: {
          lockPeriod,
          duration: lockPeriod === "flexible" ? 0 : parseInt(lockPeriod) * 86400,
        },
      });
    } catch (logError) {
      console.error("Error logging transaction:", logError);
    }

    try {
      // 1. Verify the on-chain transfer really happened
      const verification = await verifyTransaction(txSignature);
      if (!verification.isValid) {
        throw new Error(
          `Invalid stake transaction: ${
            verification.error || "failed validation"
          }`
        );
      }

      // 2. Persist stake record in Firestore
      const walletAddress =
        typeof wallet === "string"
          ? wallet
          : wallet.publicKey?.toString?.() || "";
      const stakeRecord = await fbCreateStake(
        uid,
        walletAddress,
        amount,
        lockPeriod,
        txSignature
      );

      // Log successful transaction
      if (transactionId) {
        await completeTransaction(uid, transactionId, txSignature, {
          stakeId: stakeRecord.id,
        });
      }

      return {
        txId: txSignature,
        stakeEntry: stakeRecord.id,
      };
    } catch (error) {
      console.error("Staking service error:", error);
      
      // Log failed transaction
      if (transactionId) {
        await failTransaction(uid, transactionId, error);
      }
      
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
    // Create pending transaction log
    let transactionId: string | null = null;
    try {
      transactionId = await createPendingTransaction(uid, {
        type: "staking_claim",
        amount: 0, // Will be updated with actual rewards
        token: "MKIN",
        metadata: {
          stakeId: stakeEntry,
        },
      });
    } catch (logError) {
      console.error("Error logging transaction:", logError);
    }

    try {
      const rewardsClaimed = await claimStakeRewards(uid, stakeEntry);
      const txId = `claim-${stakeEntry}-${Date.now()}`;

      // Log successful transaction with actual rewards amount
      if (transactionId) {
        await completeTransaction(uid, transactionId, txId, {
          stakeId: stakeEntry,
        });
        // Update the amount
        const { updateDoc, doc } = await import("firebase/firestore");
        const { db } = await import("@/config/firebase");
        await updateDoc(doc(db, `transactionHistory/${uid}/transactions/${transactionId}`), {
          amount: rewardsClaimed,
        });
      }

      return {
        txId,
        rewardsClaimed,
      };
    } catch (error) {
      console.error("Error claiming rewards:", error);
      
      // Log failed transaction
      if (transactionId) {
        await failTransaction(uid, transactionId, error);
      }
      
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
    // Get the stake amount first
    const walletAddress =
      typeof wallet === "string"
        ? wallet
        : wallet.publicKey?.toString?.() || "";
    const stakes = await fbGetUserStakes(walletAddress);
    const stake = stakes.find((s) => s.id === stakeEntry);
    const amount = stake?.amount || 0;

    // Create pending transaction log
    let transactionId: string | null = null;
    try {
      transactionId = await createPendingTransaction(uid, {
        type: "unstake",
        amount: amount,
        token: "MKIN",
        metadata: {
          stakeId: stakeEntry,
        },
      });
    } catch (logError) {
      console.error("Error logging transaction:", logError);
    }

    try {
      await initiateUnstake(uid, stakeEntry);
      const txId = `unstake-${stakeEntry}-${Date.now()}`;

      // Log successful transaction
      if (transactionId) {
        await completeTransaction(uid, transactionId, txId, {
          stakeId: stakeEntry,
        });
      }

      return {
        txId,
        amountReturned: amount,
      };
    } catch (error) {
      console.error("Error unstaking:", error);
      
      // Log failed transaction
      if (transactionId) {
        await failTransaction(uid, transactionId, error);
      }
      
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
        const daysUntilUnlock = Math.max(
          0,
          Math.ceil((stake.unlock_date.seconds - now) / 86400)
        );
        return {
          stakeEntry: stake.id,
          id: stake.id,
          amount: stake.amount,
          duration: stake.unlock_date.seconds - stake.start_date.seconds,
          stakeTimestamp: stake.start_date.seconds,
          unlockTime: stake.unlock_date.seconds,
          weight: calculateStakeWeight(
            stake.unlock_date.seconds - stake.start_date.seconds
          ),
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
      
      // Use the correct environment variable names based on network
      const isDevnet = process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'devnet';
      const tokenMintAddress = isDevnet
        ? process.env.NEXT_PUBLIC_MKIN_TOKEN_MINT_DEVNET || 'CARXmxarjsCwvzpmjVB2x4xkAo8fMgsAVUBPREoUGyZm'
        : process.env.NEXT_PUBLIC_MKIN_TOKEN_MINT_MAINNET || 'BKDGf6DnDHK87GsZpdWXyBqiNdcNb6KnoFcYbWPUhJLA';
      
      if (!tokenMintAddress) {
        console.error("Token mint address not configured");
        return 0;
      }
      
      const tokenMint = new PublicKey(tokenMintAddress);

      // Get token accounts for this wallet
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        publicKey,
        {
          mint: tokenMint,
        }
      );

      if (tokenAccounts.value.length === 0) {
        return 0;
      }

      // Sum up all token account balances
      let totalBalance = 0;
      for (const account of tokenAccounts.value) {
        const balance =
          account.account.data.parsed?.info?.tokenAmount?.uiAmount || 0;
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
