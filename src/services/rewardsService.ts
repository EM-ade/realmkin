import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// Types
export interface UserRewards {
  userId: string;
  walletAddress: string;
  totalNFTs: number;
  weeklyRate: number; // $0.37 per NFT per week
  totalEarned: number;
  totalClaimed: number;
  pendingRewards: number;
  lastCalculated: Date;
  lastClaimed: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClaimRecord {
  id: string;
  userId: string;
  walletAddress: string;
  amount: number;
  nftCount: number;
  claimedAt: Date;
  weeksClaimed: number;
  transactionHash?: string; // For future blockchain integration
}

export interface RewardsCalculation {
  totalNFTs: number;
  weeklyRate: number;
  weeksElapsed: number;
  pendingAmount: number;
  canClaim: boolean;
  nextClaimDate: Date | null;
}

class RewardsService {
  private readonly WEEKLY_RATE_PER_NFT = 200; // 200 MKIN per NFT per week
  private readonly MILLISECONDS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
  private readonly MIN_CLAIM_AMOUNT = 1; // Minimum 1 MKIN to claim
  private readonly NEW_NFT_BONUS = 200; // 200 MKIN bonus for each new NFT acquired
  private readonly MAX_CLAIM_AMOUNT = 100000; // Maximum claim amount for security
  private readonly RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute rate limit window
  private readonly MAX_CLAIMS_PER_WINDOW = 3; // Max 3 claim attempts per minute



  /**
   * Convert timestamp to valid Date object with fallback
   */
  private convertToValidDate(timestamp: any, fallbackDate: Date): Date {
    try {
      if (timestamp instanceof Date) {
        return isNaN(timestamp.getTime()) ? fallbackDate : timestamp;
      }
      
      if (timestamp && typeof timestamp === 'object' && timestamp.toDate) {
        // Handle Firestore Timestamp
        const date = timestamp.toDate();
        return isNaN(date.getTime()) ? fallbackDate : date;
      }
      
      if (timestamp) {
        const date = new Date(timestamp);
        return isNaN(date.getTime()) ? fallbackDate : date;
      }
      
      return fallbackDate;
    } catch (error) {
      console.warn("Error converting timestamp to Date:", error, "Using fallback date:", fallbackDate.toISOString());
      return fallbackDate;
    }
  }

  /**
   * Security validation methods
   */
  private validateUserId(userId: string): boolean {
    return (
      typeof userId === "string" && userId.length > 0 && userId.length <= 128
    );
  }

  private validateWalletAddress(address: string): boolean {
    return (
      typeof address === "string" &&
      address.length >= 32 &&
      address.length <= 44 &&
      /^[A-Za-z0-9]+$/.test(address)
    );
  }

  private validateAmount(amount: number): boolean {
    return (
      typeof amount === "number" &&
      amount >= this.MIN_CLAIM_AMOUNT &&
      amount <= this.MAX_CLAIM_AMOUNT &&
      Number.isFinite(amount)
    );
  }

  private validateNFTCount(count: number): boolean {
    return (
      typeof count === "number" &&
      count >= 0 &&
      count <= 10000 && // Reasonable upper limit
      Number.isInteger(count)
    );
  }

  /**
   * Rate limiting check
   */
  private async checkRateLimit(userId: string): Promise<void> {
    const rateLimitRef = doc(db, "rateLimits", userId);
    const rateLimitDoc = await getDoc(rateLimitRef);

    const now = Date.now();

    if (rateLimitDoc.exists()) {
      const data = rateLimitDoc.data();
      const windowStart = data.windowStart || 0;
      const attempts = data.attempts || 0;

      // Check if we're still in the same window
      if (now - windowStart < this.RATE_LIMIT_WINDOW) {
        if (attempts >= this.MAX_CLAIMS_PER_WINDOW) {
          throw new Error(
            "Rate limit exceeded. Please wait before trying again."
          );
        }

        // Increment attempts in current window
        await updateDoc(rateLimitRef, {
          attempts: attempts + 1,
          lastAttempt: now,
        });
      } else {
        // Start new window
        await setDoc(rateLimitRef, {
          windowStart: now,
          attempts: 1,
          lastAttempt: now,
        });
      }
    } else {
      // First attempt
      await setDoc(rateLimitRef, {
        windowStart: now,
        attempts: 1,
        lastAttempt: now,
      });
    }
  }

  /**
   * Initialize or update user rewards data
   */
  async initializeUserRewards(
    userId: string,
    walletAddress: string,
    nftCount: number
  ): Promise<UserRewards> {
    const userRewardsRef = doc(db, "userRewards", userId);
    const existingDoc = await getDoc(userRewardsRef);

    const now = new Date();
    const weeklyRate = nftCount * this.WEEKLY_RATE_PER_NFT;

    if (existingDoc.exists()) {
      // Update existing record
      const existingData = existingDoc.data() as UserRewards;

      // Convert Firestore timestamps to Date objects and ensure numeric fields are initialized
      const processedData: UserRewards = {
        ...existingData,
        // Ensure numeric fields are properly initialized
        totalNFTs: existingData.totalNFTs || 0,
        weeklyRate: existingData.weeklyRate || 0,
        totalEarned: existingData.totalEarned || 0,
        totalClaimed: existingData.totalClaimed || 0,
        pendingRewards: existingData.pendingRewards || 0,
        // Convert timestamps with validation
        lastCalculated: this.convertToValidDate(existingData.lastCalculated, now),
        lastClaimed: existingData.lastClaimed 
          ? this.convertToValidDate(existingData.lastClaimed, now)
          : null,
        createdAt: this.convertToValidDate(existingData.createdAt, now),
        updatedAt: this.convertToValidDate(existingData.updatedAt, now),
      };

      // Check for new NFTs and add bonus
      const previousNFTCount = processedData.totalNFTs;
      const newNFTsAcquired = Math.max(0, nftCount - previousNFTCount);
      const newNFTBonus = newNFTsAcquired * this.NEW_NFT_BONUS;

      // Give full weekly amount for current NFT count
      const weeklyRewards = nftCount * this.WEEKLY_RATE_PER_NFT;
      const totalPendingRewards = weeklyRewards + newNFTBonus;

      console.log("🔧 Updating rewards for user:", userId);
      console.log("🔧 Weekly rewards:", weeklyRewards, "New NFT bonus:", newNFTBonus);

      const updatedData: Partial<UserRewards> = {
        totalNFTs: nftCount,
        weeklyRate,
        pendingRewards: totalPendingRewards,
        lastCalculated: now,
        updatedAt: now,
        walletAddress, // Update in case wallet changed
      };

      // Log new NFT bonus if applicable
      if (newNFTsAcquired > 0) {
        console.log(
          `🎉 New NFT bonus: ${newNFTsAcquired} NFTs × ₥${this.NEW_NFT_BONUS} = ₥${newNFTBonus}`
        );
      }

      await updateDoc(userRewardsRef, updatedData);

      return {
        ...processedData,
        ...updatedData,
      } as UserRewards;
    } else {
      // Create new record with welcome bonus for initial NFTs
      const welcomeBonus = nftCount * this.NEW_NFT_BONUS;

      const newUserRewards: UserRewards = {
        userId,
        walletAddress,
        totalNFTs: nftCount,
        weeklyRate,
        totalEarned: 0,
        totalClaimed: 0,
        pendingRewards: welcomeBonus, // Give bonus for initial NFTs
        lastCalculated: now,
        lastClaimed: null,
        createdAt: now,
        updatedAt: now,
      };

      // Log welcome bonus
      if (nftCount > 0) {
        console.log(
          `🎁 Welcome bonus: ${nftCount} NFTs × ₥${this.NEW_NFT_BONUS} = ₥${welcomeBonus}`
        );
      }

      await setDoc(userRewardsRef, newUserRewards);
      return newUserRewards;
    }
  }

  /**
   * Calculate pending rewards for a user
   */
  calculatePendingRewards(
    userRewards: UserRewards,
    currentNFTCount: number
  ): RewardsCalculation {
    // Validate inputs
    if (!this.validateNFTCount(currentNFTCount)) {
      console.error("Invalid NFT count:", currentNFTCount);
      throw new Error("Invalid NFT count provided");
    }
    const now = new Date();
    
    // Ensure numeric fields are properly initialized
    const pendingRewards = userRewards.pendingRewards || 0;
    const totalEarned = userRewards.totalEarned || 0;
    const totalClaimed = userRewards.totalClaimed || 0;

    // Calculate weekly rate (200 MKIN per NFT per week)
    const weeklyRate = currentNFTCount * this.WEEKLY_RATE_PER_NFT;

    // Calculate next claim date (1 week from last claim or creation)
    const claimDate = userRewards.lastClaimed || userRewards.createdAt;
    const lastClaimDate = this.convertToValidDate(claimDate, now);
    
    const nextClaimDate = new Date(
      lastClaimDate.getTime() + this.MILLISECONDS_PER_WEEK
    );
    
    // Check if user can claim (must meet time constraint and minimum amount)
    const canClaim = now >= nextClaimDate && pendingRewards >= this.MIN_CLAIM_AMOUNT;

    // Debug logging to track calculations
    console.log("🔧 Rewards calculation debug:", {
      currentNFTCount,
      weeklyRate,
      pendingRewards,
      canClaim,
      nextClaimDate: nextClaimDate.toISOString(),
      now: now.toISOString()
    });

    return {
      totalNFTs: currentNFTCount,
      weeklyRate,
      weeksElapsed: 1, // Always 1 week since we give full amount
      pendingAmount: pendingRewards, // Use existing pending rewards
      canClaim,
      nextClaimDate: canClaim ? null : nextClaimDate,
    };
  }

  /**
   * Get user rewards data
   */
  async getUserRewards(userId: string): Promise<UserRewards | null> {
    const userRewardsRef = doc(db, "userRewards", userId);
    const docSnap = await getDoc(userRewardsRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as UserRewards;
      const now = new Date();
      
      // Convert Firestore timestamps to Date objects and ensure numeric fields are initialized
      return {
        ...data,
        // Ensure numeric fields are properly initialized
        totalNFTs: data.totalNFTs || 0,
        weeklyRate: data.weeklyRate || 0,
        totalEarned: data.totalEarned || 0,
        totalClaimed: data.totalClaimed || 0,
        pendingRewards: data.pendingRewards || 0,
        // Convert timestamps with validation
        lastCalculated: this.convertToValidDate(data.lastCalculated, now),
        lastClaimed: data.lastClaimed 
          ? this.convertToValidDate(data.lastClaimed, now)
          : null,
        createdAt: this.convertToValidDate(data.createdAt, now),
        updatedAt: this.convertToValidDate(data.updatedAt, now),
      };
    }

    return null;
  }

  /**
   * Process a reward claim with security validations
   */
  async claimRewards(
    userId: string,
    walletAddress: string
  ): Promise<ClaimRecord> {
    // Security validations
    if (!this.validateUserId(userId)) {
      throw new Error("Invalid user ID");
    }

    if (!this.validateWalletAddress(walletAddress)) {
      throw new Error("Invalid wallet address");
    }

    // Rate limiting check
    await this.checkRateLimit(userId);

    const userRewards = await this.getUserRewards(userId);
    if (!userRewards) {
      throw new Error("User rewards not found");
    }

    // Verify wallet address matches user's registered wallet
    if (userRewards.walletAddress !== walletAddress) {
      throw new Error("Wallet address mismatch");
    }

    const calculation = this.calculatePendingRewards(
      userRewards,
      userRewards.totalNFTs
    );

    if (!calculation.canClaim) {
      throw new Error("No rewards available to claim");
    }

    if (calculation.pendingAmount < this.MIN_CLAIM_AMOUNT) {
      throw new Error(`Minimum claim amount is ₥${this.MIN_CLAIM_AMOUNT}`);
    }

    const now = new Date();
    const claimAmount = Math.floor(calculation.pendingAmount * 100) / 100; // Round to 2 decimal places

    // Additional security validation
    if (!this.validateAmount(claimAmount)) {
      throw new Error("Invalid claim amount calculated");
    }

    // Use transaction for atomic operations
    const claimRecord = await runTransaction(db, async (transaction) => {
      // Re-check user rewards in transaction to prevent race conditions
      const userRewardsRef = doc(db, "userRewards", userId);
      const userRewardsDoc = await transaction.get(userRewardsRef);

      if (!userRewardsDoc.exists()) {
        throw new Error("User rewards not found in transaction");
      }

      const currentUserRewards = userRewardsDoc.data() as UserRewards;

      // Re-validate claim eligibility
      const currentCalculation = this.calculatePendingRewards(
        currentUserRewards,
        currentUserRewards.totalNFTs
      );

      if (!currentCalculation.canClaim) {
        throw new Error("Claim no longer available");
      }

      // Create claim record
      const claimRecord: ClaimRecord = {
        id: `${userId}_${now.getTime()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`,
        userId,
        walletAddress,
        amount: claimAmount,
        nftCount: currentUserRewards.totalNFTs,
        claimedAt: now,
        weeksClaimed: currentCalculation.weeksElapsed,
      };

      // Save claim record
      const claimRef = doc(db, "claimRecords", claimRecord.id);
      transaction.set(claimRef, claimRecord);

      // Update user rewards
      const updatedUserRewards: Partial<UserRewards> = {
        totalClaimed: currentUserRewards.totalClaimed + claimAmount,
        totalEarned: currentUserRewards.totalEarned + claimAmount,
        pendingRewards: 0, // Reset pending rewards
        lastClaimed: now,
        lastCalculated: now,
        updatedAt: now,
      };

      transaction.update(userRewardsRef, updatedUserRewards);

      return claimRecord;
    });

    return claimRecord;
  }

  /**
   * Get user's claim history
   */
  async getClaimHistory(
    userId: string,
    limitCount: number = 10
  ): Promise<ClaimRecord[]> {
    const claimsQuery = query(
      collection(db, "claimRecords"),
      where("userId", "==", userId),
      orderBy("claimedAt", "desc"),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(claimsQuery);
    const now = new Date();
    return querySnapshot.docs.map((doc) => {
      const data = doc.data() as ClaimRecord;
      return {
        ...data,
        claimedAt: this.convertToValidDate(data.claimedAt, now),
      };
    });
  }

  /**
   * Get claim history by wallet address (useful for off-chain management)
   */
  async getClaimHistoryByWallet(
    walletAddress: string,
    limitCount: number = 10
  ): Promise<ClaimRecord[]> {
    const claimsQuery = query(
      collection(db, "claimRecords"),
      where("walletAddress", "==", walletAddress),
      orderBy("claimedAt", "desc"),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(claimsQuery);
    const now = new Date();
    return querySnapshot.docs.map((doc) => {
      const data = doc.data() as ClaimRecord;
      return {
        ...data,
        claimedAt: this.convertToValidDate(data.claimedAt, now),
      };
    });
  }

  /**
   * Get total claimed amount by wallet address
   */
  async getTotalClaimedByWallet(walletAddress: string): Promise<number> {
    const claimsQuery = query(
      collection(db, "claimRecords"),
      where("walletAddress", "==", walletAddress)
    );

    const querySnapshot = await getDocs(claimsQuery);
    return querySnapshot.docs.reduce((total, doc) => {
      const data = doc.data() as ClaimRecord;
      return total + data.amount;
    }, 0);
  }

  /**
   * Format MKIN tokens for display
   */
  formatMKIN(amount: number): string {
    return (
      "₥" +
      new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(amount)
    );
  }

  /**
   * Format currency for display (kept for backward compatibility)
   */
  formatCurrency(amount: number): string {
    return this.formatMKIN(amount);
  }

  /**
   * Calculate time until next claim
   */
  getTimeUntilNextClaim(nextClaimDate: Date): string {
    const now = new Date();
    const timeDiff = nextClaimDate.getTime() - now.getTime();

    if (timeDiff <= 0) return "Available now";

    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }
}

export const rewardsService = new RewardsService();
