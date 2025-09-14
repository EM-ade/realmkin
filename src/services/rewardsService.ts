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
  runTransaction,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getAuth } from "firebase/auth";

// Types
export interface UserRewards {
  userId: string;
  walletAddress: string;
  totalNFTs: number;
  weeklyRate: number;
  totalEarned: number;
  totalClaimed: number;
  totalRealmkin: number;
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
  transactionHash?: string;
}

export interface RewardsCalculation {
  totalNFTs: number;
  weeklyRate: number;
  weeksElapsed: number;
  pendingAmount: number;
  canClaim: boolean;
  nextClaimDate: Date | null;
}

export interface TransactionHistory {
  id: string;
  userId: string;
  walletAddress: string;
  type: "claim" | "withdraw" | "transfer";
  amount: number;
  description: string;
  recipientAddress?: string;
  createdAt: Date;
}

class RewardsService {
  private readonly WEEKLY_RATE_PER_NFT = 200;
  private readonly PREMIUM_WEEKLY_RATE_PER_NFT = 300; // New premium contract rate
  private readonly PREMIUM_CONTRACT_ADDRESS = "0xbb03b613Ede925f17E3ffc437592C66C7c78E317";
  private readonly MILLISECONDS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
  private readonly MIN_CLAIM_AMOUNT = 1;
  private readonly NEW_NFT_BONUS = 200;
  private readonly MAX_CLAIM_AMOUNT = 100000;
  private readonly RATE_LIMIT_WINDOW = 60 * 1000;
  private readonly MAX_CLAIMS_PER_WINDOW = 3;

  // Mirror a delta to the unified ledger via Gatekeeper API (client-side only)
  private async postLedger(delta: number, reason: string, refId: string): Promise<void> {
    try {
      const base = process.env.NEXT_PUBLIC_GATEKEEPER_BASE || "https://gatekeeper-bot.fly.dev";
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      await fetch(`${base}/api/ledger`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ delta: Math.trunc(delta), reason, refId }),
      });
    } catch (e) {
      console.warn("Failed to post ledger entry:", e);
    }
  }

  private convertToValidDate(timestamp: unknown, fallbackDate: Date): Date {
    try {
      if (timestamp instanceof Date) {
        return isNaN(timestamp.getTime()) ? fallbackDate : timestamp;
      }
      
      if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp && typeof (timestamp as { toDate: () => Date }).toDate === 'function') {
        const date = (timestamp as { toDate: () => Date }).toDate();
        return isNaN(date.getTime()) ? fallbackDate : date;
      }
      
      if (timestamp && (typeof timestamp === 'string' || typeof timestamp === 'number')) {
        const date = new Date(timestamp);
        return isNaN(date.getTime()) ? fallbackDate : date;
      }
      
      return fallbackDate;
    } catch (error) {
      console.warn("Error converting timestamp to Date:", error, "Using fallback date:", fallbackDate.toISOString());
      return fallbackDate;
    }
  }

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
      count <= 10000 &&
      Number.isInteger(count)
    );
  }

  private async checkRateLimit(userId: string): Promise<void> {
    const rateLimitRef = doc(db, "rateLimits", userId);
    const rateLimitDoc = await getDoc(rateLimitRef);

    const now = Date.now();

    if (rateLimitDoc.exists()) {
      const data = rateLimitDoc.data();
      const windowStart = data.windowStart || 0;
      const attempts = data.attempts || 0;

      if (now - windowStart < this.RATE_LIMIT_WINDOW) {
        if (attempts >= this.MAX_CLAIMS_PER_WINDOW) {
          throw new Error("Rate limit exceeded. Please wait before trying again.");
        }

        await updateDoc(rateLimitRef, {
          attempts: attempts + 1,
          lastAttempt: now,
        });
      } else {
        await setDoc(rateLimitRef, {
          windowStart: now,
          attempts: 1,
          lastAttempt: now,
        });
      }
    } else {
      await setDoc(rateLimitRef, {
        windowStart: now,
        attempts: 1,
        lastAttempt: now,
      });
    }
  }

  // Calculate weekly rate based on NFT contract addresses (frontend-only)
  private calculateWeeklyRate(nfts: Array<{contractAddress: string}>): number {
    let totalWeeklyRewards = 0;

    nfts.forEach(nft => {
      // Check if it's the premium contract
      if (nft.contractAddress === '0xbb03b613Ede925f17E3ffc437592C66C7c78E317') {
        totalWeeklyRewards += 300; // Premium weekly rate
      } else {
        totalWeeklyRewards += 200; // Standard weekly rate
      }
    });

    return totalWeeklyRewards;
  }

  async initializeUserRewards(
    userId: string,
    walletAddress: string,
    nftCount: number,
    nfts: Array<{contractAddress: string}> = []
  ): Promise<UserRewards> {
    const userRewardsRef = doc(db, "userRewards", userId);
    const existingDoc = await getDoc(userRewardsRef);

    const now = new Date();
    const weeklyRate = nfts.length > 0 ? this.calculateWeeklyRate(nfts) : nftCount * this.WEEKLY_RATE_PER_NFT;

    if (existingDoc.exists()) {
      const existingData = existingDoc.data() as UserRewards;

      const processedData: UserRewards = {
        ...existingData,
        totalNFTs: existingData.totalNFTs || 0,
        weeklyRate: existingData.weeklyRate || 0,
        totalEarned: existingData.totalEarned || 0,
        totalClaimed: existingData.totalClaimed || 0,
        totalRealmkin: existingData.totalRealmkin || 0,
        pendingRewards: existingData.pendingRewards || 0,
        lastCalculated: this.convertToValidDate(existingData.lastCalculated, now),
        lastClaimed: existingData.lastClaimed 
          ? this.convertToValidDate(existingData.lastClaimed, now)
          : null,
        createdAt: this.convertToValidDate(existingData.createdAt, now),
        updatedAt: this.convertToValidDate(existingData.updatedAt, now),
      };

      const previousNFTCount = processedData.totalNFTs;
      const newNFTsAcquired = Math.max(0, nftCount - previousNFTCount);
      const newNFTBonus = newNFTsAcquired * this.NEW_NFT_BONUS;
      const weeklyRewards = nfts.length > 0 ? this.calculateWeeklyRate(nfts) : nftCount * this.WEEKLY_RATE_PER_NFT;

      const updatedData: Partial<UserRewards> = {
        totalNFTs: nftCount,
        weeklyRate,
        totalRealmkin: (processedData.totalRealmkin || 0) + newNFTBonus,
        pendingRewards: weeklyRewards,
        lastCalculated: now,
        updatedAt: now,
        walletAddress,
      };

      if (newNFTsAcquired > 0) {
        console.log(`🎉 New NFT bonus: ${newNFTsAcquired} NFTs × ₥${this.NEW_NFT_BONUS} = ₥${newNFTBonus}`);
      }

      await updateDoc(userRewardsRef, updatedData);

      return {
        ...processedData,
        ...updatedData,
      } as UserRewards;
    } else {
      const welcomeBonus = nftCount * this.NEW_NFT_BONUS;
      const weeklyRewards = nfts.length > 0 ? this.calculateWeeklyRate(nfts) : nftCount * this.WEEKLY_RATE_PER_NFT;
      const totalInitialRewards = weeklyRewards + welcomeBonus;

      const newUserRewards: UserRewards = {
        userId,
        walletAddress,
        totalNFTs: nftCount,
        weeklyRate,
        totalEarned: 0,
        totalClaimed: 0,
        totalRealmkin: 0,
        pendingRewards: totalInitialRewards,
        lastCalculated: now,
        lastClaimed: null,
        createdAt: now,
        updatedAt: now,
      };

      if (nftCount > 0) {
        console.log(`🎁 Welcome bonus: ${nftCount} NFTs × ₥${this.NEW_NFT_BONUS} = ₥${welcomeBonus}`);
        console.log(`⛏️ Weekly mining rewards: ₥${weeklyRewards} (varies by contract)`);
        console.log(`💰 Total initial rewards: ₥${totalInitialRewards}`);
      }

      await setDoc(userRewardsRef, newUserRewards);
      return newUserRewards;
    }
  }

  private rewardCalculationCache = new Map<string, RewardsCalculation>();

  calculatePendingRewards(
    userRewards: UserRewards,
    currentNFTCount: number,
    bypassWaitTime: boolean = false
  ): RewardsCalculation {
    if (!this.validateNFTCount(currentNFTCount)) {
      console.error("Invalid NFT count:", currentNFTCount);
      throw new Error("Invalid NFT count provided");
    }

    const claimDate = userRewards.lastClaimed || userRewards.createdAt;
    const claimDateTime = claimDate instanceof Date ? claimDate.getTime() : new Date().getTime();

    const cacheKey = `${userRewards.userId}_${currentNFTCount}_${claimDateTime}_${bypassWaitTime}`;

    if (this.rewardCalculationCache.has(cacheKey)) {
      return this.rewardCalculationCache.get(cacheKey)!;
    }

    const now = new Date();
    const weeklyRate = currentNFTCount * this.WEEKLY_RATE_PER_NFT;
    const lastClaimDate = this.convertToValidDate(claimDate, now);

    const timeSinceLastClaim = now.getTime() - lastClaimDate.getTime();
    const weeksElapsed = Math.floor(timeSinceLastClaim / this.MILLISECONDS_PER_WEEK);

    let nextClaimDate;
    if (now.getTime() > lastClaimDate.getTime() + (weeksElapsed * this.MILLISECONDS_PER_WEEK)) {
      const remainingTime = this.MILLISECONDS_PER_WEEK - (timeSinceLastClaim % this.MILLISECONDS_PER_WEEK);
      nextClaimDate = new Date(now.getTime() + remainingTime);
    } else {
      nextClaimDate = new Date(
        lastClaimDate.getTime() + (weeksElapsed + 1) * this.MILLISECONDS_PER_WEEK
      );
    }

    const accumulatedReward = weeklyRate * weeksElapsed;
    const canClaim = (bypassWaitTime || weeksElapsed >= 1) && accumulatedReward >= this.MIN_CLAIM_AMOUNT;

    const result = {
      totalNFTs: currentNFTCount,
      weeklyRate,
      weeksElapsed,
      pendingAmount: accumulatedReward,
      canClaim,
      nextClaimDate: canClaim ? null : nextClaimDate,
    };

    this.rewardCalculationCache.set(cacheKey, result);
    return result;
  }

  async getUserRewards(userId: string): Promise<UserRewards | null> {
    const userRewardsRef = doc(db, "userRewards", userId);
    const docSnap = await getDoc(userRewardsRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as UserRewards;
      const now = new Date();
      
      return {
        ...data,
        totalNFTs: data.totalNFTs || 0,
        weeklyRate: data.weeklyRate || 0,
        totalEarned: data.totalEarned || 0,
        totalClaimed: data.totalClaimed || 0,
        pendingRewards: data.pendingRewards || 0,
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

  async claimRewards(
    userId: string,
    walletAddress: string,
    bypassWaitTime: boolean = false
  ): Promise<ClaimRecord> {
    if (!this.validateUserId(userId)) {
      throw new Error("Invalid user ID");
    }

    if (!this.validateWalletAddress(walletAddress)) {
      throw new Error("Invalid wallet address");
    }

    await this.checkRateLimit(userId);

    const userRewards = await this.getUserRewards(userId);
    if (!userRewards) {
      throw new Error("User rewards not found");
    }

    if (userRewards.walletAddress !== walletAddress) {
      throw new Error("Wallet address mismatch");
    }

    const calculation = this.calculatePendingRewards(
      userRewards,
      userRewards.totalNFTs,
      bypassWaitTime
    );

    if (!calculation.canClaim) {
      throw new Error("No rewards available to claim");
    }

    if (calculation.pendingAmount < this.MIN_CLAIM_AMOUNT) {
      throw new Error(`Minimum claim amount is ₥${this.MIN_CLAIM_AMOUNT}`);
    }

    const now = new Date();
    const claimAmount = Math.floor(calculation.pendingAmount * 100) / 100;

    if (!this.validateAmount(claimAmount)) {
      throw new Error("Invalid claim amount calculated");
    }

    const claimRecord = await runTransaction(db, async (transaction) => {
      const userRewardsRef = doc(db, "userRewards", userId);
      const userRewardsDoc = await transaction.get(userRewardsRef);

      if (!userRewardsDoc.exists()) {
        throw new Error("User rewards not found in transaction");
      }

      const currentUserRewards = userRewardsDoc.data() as UserRewards;

      const currentCalculation = this.calculatePendingRewards(
        currentUserRewards,
        currentUserRewards.totalNFTs,
        bypassWaitTime
      );

      if (!currentCalculation.canClaim) {
        throw new Error("Claim no longer available");
      }

      const claimRecord: ClaimRecord = {
        id: `${userId}_${now.getTime()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        walletAddress,
        amount: claimAmount,
        nftCount: currentUserRewards.totalNFTs,
        claimedAt: now,
        weeksClaimed: currentCalculation.weeksElapsed,
      };

      const claimRef = doc(db, "claimRecords", claimRecord.id);
      transaction.set(claimRef, claimRecord);

      const updatedUserRewards: Partial<UserRewards> = {
        totalClaimed: currentUserRewards.totalClaimed + claimAmount,
        totalEarned: currentUserRewards.totalEarned + claimAmount,
        totalRealmkin: (currentUserRewards.totalRealmkin || 0) + claimAmount,
        pendingRewards: 0,
        lastClaimed: now,
        lastCalculated: now,
        updatedAt: now,
      };

      transaction.update(userRewardsRef, updatedUserRewards);

      return claimRecord;
    });

    // Mirror to unified ledger (credit claimed amount)
    try {
      const refId = `claim:${userId}:${now.getTime()}`;
      await this.postLedger(claimAmount, "claim", refId);
    } catch {}

    return claimRecord;
  }

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

  async saveTransactionHistory(transaction: Omit<TransactionHistory, "id" | "createdAt">): Promise<void> {
    const now = new Date();
    const transactionId = `${transaction.userId}_${now.getTime()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const transactionRef = doc(db, "transactionHistory", transactionId);
    
    await setDoc(transactionRef, {
      ...transaction,
      id: transactionId,
      createdAt: now,
    });
  }

  async getTransactionHistory(
    userId: string,
    limitCount: number = 10
  ): Promise<TransactionHistory[]> {
    const transactionsQuery = query(
      collection(db, "transactionHistory"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(transactionsQuery);
    const now = new Date();
    return querySnapshot.docs.map((doc) => {
      const data = doc.data() as TransactionHistory;
      return {
        ...data,
        createdAt: this.convertToValidDate(data.createdAt, now),
      };
    });
  }

  async getTransactionHistoryByWallet(
    walletAddress: string,
    limitCount: number = 10
  ): Promise<TransactionHistory[]> {
    const transactionsQuery = query(
      collection(db, "transactionHistory"),
      where("walletAddress", "==", walletAddress),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(transactionsQuery);
    const now = new Date();
    return querySnapshot.docs.map((doc) => {
      const data = doc.data() as TransactionHistory;
      return {
        ...data,
        createdAt: this.convertToValidDate(data.createdAt, now),
      };
    });
  }

  async transferMKIN(
    senderUserId: string,
    recipientUserId: string,
    amount: number
  ): Promise<void> {
    if (!this.validateUserId(senderUserId)) {
      throw new Error("Invalid sender user ID");
    }

    if (!this.validateUserId(recipientUserId)) {
      throw new Error("Invalid recipient user ID");
    }

    if (!this.validateAmount(amount)) {
      throw new Error("Invalid transfer amount");
    }

    if (senderUserId === recipientUserId) {
      throw new Error("Cannot transfer to yourself");
    }

    await runTransaction(db, async (transaction) => {
      const senderRef = doc(db, "userRewards", senderUserId);
      const senderDoc = await transaction.get(senderRef);

      if (!senderDoc.exists()) {
        throw new Error("Sender rewards not found");
      }

      const senderRewards = senderDoc.data() as UserRewards;

      if (senderRewards.totalRealmkin < amount) {
        throw new Error("Insufficient funds for transfer");
      }

      const recipientRef = doc(db, "userRewards", recipientUserId);
      const recipientDoc = await transaction.get(recipientRef);

      if (!recipientDoc.exists()) {
        throw new Error("Recipient rewards not found");
      }

      const recipientRewards = recipientDoc.data() as UserRewards;

      const now = new Date();

      transaction.update(senderRef, {
        totalRealmkin: senderRewards.totalRealmkin - amount,
        updatedAt: now,
      });

      transaction.update(recipientRef, {
        totalRealmkin: (recipientRewards.totalRealmkin || 0) + amount,
        updatedAt: now,
      });

      const transferRecord = {
        id: `${senderUserId}_${recipientUserId}_${now.getTime()}_${Math.random().toString(36).substr(2, 9)}`,
        senderUserId,
        recipientUserId,
        amount,
        transferredAt: now,
      };

      const transferRef = doc(db, "transferRecords", transferRecord.id);
      transaction.set(transferRef, transferRecord);
    });
  }

  async getUserIdByWallet(walletAddress: string): Promise<string | null> {
    try {
      const walletDoc = await getDoc(
        doc(db, "wallets", walletAddress.toLowerCase())
      );

      if (!walletDoc.exists()) {
        return null;
      }

      const walletData = walletDoc.data();
      return walletData.uid || null;
    } catch (error) {
      console.error("Error getting user ID by wallet:", error);
      return null;
    }
  }

  formatMKIN(amount: number): string {
    return (
      "₥" +
      new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(amount)
    );
  }

  formatCurrency(amount: number): string {
    return this.formatMKIN(amount);
  }

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
