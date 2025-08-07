import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp,
  query,
  where,
  getDocs,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
  private readonly WEEKLY_RATE_PER_NFT = 0.37; // $0.37 per NFT per week
  private readonly MILLISECONDS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
  private readonly MIN_CLAIM_AMOUNT = 0.01; // Minimum $0.01 to claim

  /**
   * Initialize or update user rewards data
   */
  async initializeUserRewards(
    userId: string, 
    walletAddress: string, 
    nftCount: number
  ): Promise<UserRewards> {
    const userRewardsRef = doc(db, 'userRewards', userId);
    const existingDoc = await getDoc(userRewardsRef);

    const now = new Date();
    const weeklyRate = nftCount * this.WEEKLY_RATE_PER_NFT;

    if (existingDoc.exists()) {
      // Update existing record
      const existingData = existingDoc.data() as UserRewards;
      
      // Calculate pending rewards based on time elapsed
      const calculation = this.calculatePendingRewards(existingData, nftCount);
      
      const updatedData: Partial<UserRewards> = {
        totalNFTs: nftCount,
        weeklyRate,
        pendingRewards: calculation.pendingAmount,
        lastCalculated: now,
        updatedAt: now,
        walletAddress, // Update in case wallet changed
      };

      await updateDoc(userRewardsRef, updatedData);
      
      return {
        ...existingData,
        ...updatedData,
      } as UserRewards;
    } else {
      // Create new record
      const newUserRewards: UserRewards = {
        userId,
        walletAddress,
        totalNFTs: nftCount,
        weeklyRate,
        totalEarned: 0,
        totalClaimed: 0,
        pendingRewards: 0,
        lastCalculated: now,
        lastClaimed: null,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(userRewardsRef, newUserRewards);
      return newUserRewards;
    }
  }

  /**
   * Calculate pending rewards for a user
   */
  calculatePendingRewards(userRewards: UserRewards, currentNFTCount: number): RewardsCalculation {
    const now = new Date();
    const lastCalculated = userRewards.lastCalculated;
    const timeElapsed = now.getTime() - lastCalculated.getTime();
    const weeksElapsed = timeElapsed / this.MILLISECONDS_PER_WEEK;
    
    // Use current NFT count for calculation
    const weeklyRate = currentNFTCount * this.WEEKLY_RATE_PER_NFT;
    const newRewards = weeksElapsed * weeklyRate;
    const totalPending = userRewards.pendingRewards + newRewards;
    
    // Calculate next claim date (1 week from last claim or creation)
    const lastClaimDate = userRewards.lastClaimed || userRewards.createdAt;
    const nextClaimDate = new Date(lastClaimDate.getTime() + this.MILLISECONDS_PER_WEEK);
    const canClaim = totalPending >= this.MIN_CLAIM_AMOUNT && now >= nextClaimDate;

    return {
      totalNFTs: currentNFTCount,
      weeklyRate,
      weeksElapsed,
      pendingAmount: totalPending,
      canClaim,
      nextClaimDate: canClaim ? null : nextClaimDate,
    };
  }

  /**
   * Get user rewards data
   */
  async getUserRewards(userId: string): Promise<UserRewards | null> {
    const userRewardsRef = doc(db, 'userRewards', userId);
    const docSnap = await getDoc(userRewardsRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data() as UserRewards;
      // Convert Firestore timestamps to Date objects
      return {
        ...data,
        lastCalculated: data.lastCalculated instanceof Date ? data.lastCalculated : new Date(data.lastCalculated),
        lastClaimed: data.lastClaimed ? (data.lastClaimed instanceof Date ? data.lastClaimed : new Date(data.lastClaimed)) : null,
        createdAt: data.createdAt instanceof Date ? data.createdAt : new Date(data.createdAt),
        updatedAt: data.updatedAt instanceof Date ? data.updatedAt : new Date(data.updatedAt),
      };
    }
    
    return null;
  }

  /**
   * Process a reward claim
   */
  async claimRewards(userId: string, walletAddress: string): Promise<ClaimRecord> {
    const userRewards = await this.getUserRewards(userId);
    if (!userRewards) {
      throw new Error('User rewards not found');
    }

    const calculation = this.calculatePendingRewards(userRewards, userRewards.totalNFTs);
    
    if (!calculation.canClaim) {
      throw new Error('No rewards available to claim');
    }

    if (calculation.pendingAmount < this.MIN_CLAIM_AMOUNT) {
      throw new Error(`Minimum claim amount is $${this.MIN_CLAIM_AMOUNT}`);
    }

    const now = new Date();
    const claimAmount = Math.floor(calculation.pendingAmount * 100) / 100; // Round to 2 decimal places

    // Create claim record
    const claimRecord: ClaimRecord = {
      id: `${userId}_${now.getTime()}`,
      userId,
      walletAddress,
      amount: claimAmount,
      nftCount: userRewards.totalNFTs,
      claimedAt: now,
      weeksClaimed: calculation.weeksElapsed,
    };

    // Save claim record
    const claimRef = doc(db, 'claimRecords', claimRecord.id);
    await setDoc(claimRef, claimRecord);

    // Update user rewards
    const updatedUserRewards: Partial<UserRewards> = {
      totalClaimed: userRewards.totalClaimed + claimAmount,
      totalEarned: userRewards.totalEarned + claimAmount,
      pendingRewards: 0, // Reset pending rewards
      lastClaimed: now,
      lastCalculated: now,
      updatedAt: now,
    };

    const userRewardsRef = doc(db, 'userRewards', userId);
    await updateDoc(userRewardsRef, updatedUserRewards);

    return claimRecord;
  }

  /**
   * Get user's claim history
   */
  async getClaimHistory(userId: string, limitCount: number = 10): Promise<ClaimRecord[]> {
    const claimsQuery = query(
      collection(db, 'claimRecords'),
      where('userId', '==', userId),
      orderBy('claimedAt', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(claimsQuery);
    return querySnapshot.docs.map(doc => {
      const data = doc.data() as ClaimRecord;
      return {
        ...data,
        claimedAt: data.claimedAt instanceof Date ? data.claimedAt : new Date(data.claimedAt),
      };
    });
  }

  /**
   * Format currency for display
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  /**
   * Calculate time until next claim
   */
  getTimeUntilNextClaim(nextClaimDate: Date): string {
    const now = new Date();
    const timeDiff = nextClaimDate.getTime() - now.getTime();
    
    if (timeDiff <= 0) return 'Available now';
    
    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }
}

export const rewardsService = new RewardsService();
