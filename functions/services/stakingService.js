"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStakingHistory = exports.processUnstake = exports.processStake = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
/**
 * Process staking of an NFT
 */
exports.processStake = functions.https.onCall(async (request) => {
    // Verify user is authenticated
    if (!request.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
    }
    const userId = request.auth.uid;
    const { nftId, walletAddress } = request.data;
    // Validate inputs
    if (!nftId) {
        throw new functions.https.HttpsError("invalid-argument", "NFT ID is required");
    }
    if (!walletAddress) {
        throw new functions.https.HttpsError("invalid-argument", "Wallet address is required");
    }
    try {
        // Check if NFT is already staked
        const existingStakeQuery = await db
            .collection("stakes")
            .where("nftId", "==", nftId)
            .where("status", "==", "active")
            .limit(1)
            .get();
        if (!existingStakeQuery.empty) {
            throw new functions.https.HttpsError("already-exists", "This NFT is already staked");
        }
        // Create stake record
        const stakeRef = await db.collection("stakes").add({
            userId,
            nftId,
            walletAddress,
            status: "active",
            stakedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastRewardUpdate: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Update NFT ownership status
        await db.collection("nfts").doc(nftId).update({
            staked: true,
            stakedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`Successfully staked NFT ${nftId} for user ${userId}`);
        return {
            success: true,
            stakeId: stakeRef.id
        };
    }
    catch (error) {
        console.error("Stake error:", error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError("internal", error instanceof Error ? error.message : "Staking failed");
    }
});
/**
 * Process unstaking of an NFT
 */
exports.processUnstake = functions.https.onCall(async (request) => {
    // Verify user is authenticated
    if (!request.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
    }
    const userId = request.auth.uid;
    const { stakeId } = request.data;
    // Validate inputs
    if (!stakeId) {
        throw new functions.https.HttpsError("invalid-argument", "Stake ID is required");
    }
    try {
        // Get stake record
        const stakeRef = db.collection("stakes").doc(stakeId);
        const stakeDoc = await stakeRef.get();
        if (!stakeDoc.exists) {
            throw new functions.https.HttpsError("not-found", "Stake record not found");
        }
        const stakeData = stakeDoc.data();
        // Verify ownership
        if (stakeData?.userId !== userId) {
            throw new functions.https.HttpsError("permission-denied", "You don't have permission to unstake this NFT");
        }
        // Update stake record
        await stakeRef.update({
            status: "unstaked",
            unstakedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Update NFT ownership status
        await db.collection("nfts").doc(stakeData.nftId).update({
            staked: false,
            unstakedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`Successfully unstaked NFT ${stakeData.nftId} for user ${userId}`);
        return {
            success: true,
            stakeId: stakeRef.id
        };
    }
    catch (error) {
        console.error("Unstake error:", error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError("internal", error instanceof Error ? error.message : "Unstaking failed");
    }
});
/**
 * Get staking history for a user
 */
exports.getStakingHistory = functions.https.onCall(async (request) => {
    if (!request.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
    }
    const userId = request.auth.uid;
    const limit = request.data.limit || 10;
    try {
        const stakes = await db
            .collection("stakes")
            .where("userId", "==", userId)
            .orderBy("stakedAt", "desc")
            .limit(limit)
            .get();
        return {
            stakes: stakes.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
                stakedAt: doc.data().stakedAt?.toDate(),
                unstakedAt: doc.data().unstakedAt?.toDate(),
                lastRewardUpdate: doc.data().lastRewardUpdate?.toDate(),
            })),
        };
    }
    catch (error) {
        console.error("Fetch staking history error:", error);
        throw new functions.https.HttpsError("internal", "Failed to fetch staking history");
    }
});
//# sourceMappingURL=stakingService.js.map