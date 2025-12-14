import "server-only";
import { db } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

// Types (mirrored from client service for consistency)
export interface UserRewards {
    userId: string;
    walletAddress: string;
    totalNFTs: number;
    weeklyRate: number;
    bonusWeeklyRate?: number;
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
    userId: string;
    walletAddress: string;
    type: "claim" | "withdraw" | "transfer";
    amount: number;
    description: string;
    recipientAddress?: string;
}

class ServerRewardsService {
    private readonly WEEKLY_RATE_PER_NFT = 0;
    private readonly MILLISECONDS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
    private readonly MIN_CLAIM_AMOUNT = 1;
    private readonly MAX_CLAIM_AMOUNT = 100000;

    private convertToValidDate(timestamp: unknown, fallbackDate: Date): Date {
        try {
            if (timestamp instanceof Date) {
                return isNaN(timestamp.getTime()) ? fallbackDate : timestamp;
            }
            // Firestore Timestamp object
            if (
                timestamp &&
                typeof timestamp === "object" &&
                "toDate" in timestamp &&
                typeof (timestamp as { toDate: () => Date }).toDate === "function"
            ) {
                const date = (timestamp as { toDate: () => Date }).toDate();
                return isNaN(date.getTime()) ? fallbackDate : date;
            }
            if (
                timestamp &&
                (typeof timestamp === "string" || typeof timestamp === "number")
            ) {
                const date = new Date(timestamp);
                return isNaN(date.getTime()) ? fallbackDate : date;
            }
            return fallbackDate;
        } catch (error) {
            return fallbackDate;
        }
    }

    calculatePendingRewards(
        userRewards: UserRewards,
        currentNFTCount: number
    ): RewardsCalculation {
        const claimDate = userRewards.lastClaimed || userRewards.createdAt;

        const now = new Date();
        const weeklyRate = userRewards.weeklyRate || 0;
        const lastClaimDate = this.convertToValidDate(claimDate, now);

        const timeSinceLastClaim = now.getTime() - lastClaimDate.getTime();
        const weeksElapsed = Math.floor(
            timeSinceLastClaim / this.MILLISECONDS_PER_WEEK
        );

        let nextClaimDate;
        if (
            now.getTime() >
            lastClaimDate.getTime() + weeksElapsed * this.MILLISECONDS_PER_WEEK
        ) {
            const remainingTime =
                this.MILLISECONDS_PER_WEEK -
                (timeSinceLastClaim % this.MILLISECONDS_PER_WEEK);
            nextClaimDate = new Date(now.getTime() + remainingTime);
        } else {
            nextClaimDate = new Date(
                lastClaimDate.getTime() +
                (weeksElapsed + 1) * this.MILLISECONDS_PER_WEEK
            );
        }

        const accumulatedReward = weeklyRate * weeksElapsed;
        const canClaim = weeksElapsed >= 1 && accumulatedReward >= this.MIN_CLAIM_AMOUNT;

        return {
            totalNFTs: currentNFTCount,
            weeklyRate,
            weeksElapsed,
            pendingAmount: accumulatedReward,
            canClaim,
            nextClaimDate: canClaim ? null : nextClaimDate,
        };
    }

    async getUserRewards(userId: string): Promise<UserRewards | null> {
        const docSnap = await db.collection("userRewards").doc(userId).get();

        if (docSnap.exists) {
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

    async claimRewards(userId: string, walletAddress: string): Promise<ClaimRecord> {
        return await db.runTransaction(async (transaction) => {
            const userRewardsRef = db.collection("userRewards").doc(userId);
            const userRewardsDoc = await transaction.get(userRewardsRef);

            if (!userRewardsDoc.exists) {
                throw new Error("User rewards not found");
            }

            const currentUserRewards = userRewardsDoc.data() as UserRewards;

            if (currentUserRewards.walletAddress !== walletAddress) {
                throw new Error("Wallet address mismatch");
            }

            const currentCalculation = this.calculatePendingRewards(
                currentUserRewards,
                currentUserRewards.totalNFTs
            );

            if (!currentCalculation.canClaim) {
                throw new Error("Claim no longer available");
            }

            const now = new Date();
            const claimAmount = Math.floor(currentCalculation.pendingAmount * 100) / 100;

            const claimRecord: ClaimRecord = {
                id: `${userId}_${now.getTime()}_${Math.random().toString(36).substr(2, 9)}`,
                userId,
                walletAddress,
                amount: claimAmount,
                nftCount: currentUserRewards.totalNFTs,
                claimedAt: now,
                weeksClaimed: currentCalculation.weeksElapsed,
            };

            const claimRef = db.collection("claimRecords").doc(claimRecord.id);
            transaction.set(claimRef, claimRecord);

            const updatedUserRewards = {
                totalClaimed: (currentUserRewards.totalClaimed || 0) + claimAmount,
                totalEarned: (currentUserRewards.totalEarned || 0) + claimAmount,
                totalRealmkin: (currentUserRewards.totalRealmkin || 0) + claimAmount,
                pendingRewards: 0,
                lastClaimed: now,
                lastCalculated: now,
                updatedAt: now,
            };

            transaction.update(userRewardsRef, updatedUserRewards);

            return claimRecord;
        });
    }

    async saveTransactionHistory(data: TransactionHistory): Promise<void> {
        try {
            await db.collection("transactionHistory").add({
                ...data,
                createdAt: new Date(),
            });
        } catch (error) {
            console.error("Error saving transaction history:", error);
            // Don't throw, just log - history is secondary
        }
    }

    formatMKIN(amount: number): string {
        return new Intl.NumberFormat("en-US", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(amount);
    }
}

export const serverRewardsService = new ServerRewardsService();
