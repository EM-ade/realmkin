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
exports.getClaimHistory = exports.claimTokens = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const web3_js_2 = require("@solana/web3.js");
const db = admin.firestore();
exports.claimTokens = functions.https.onCall(async (request) => {
    // Verify user is authenticated
    if (!request.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
    }
    const userId = request.auth.uid;
    const { amount, walletAddress, claimType } = request.data;
    // Validate inputs
    if (!amount || amount <= 0) {
        throw new functions.https.HttpsError("invalid-argument", "Amount must be greater than 0");
    }
    if (!walletAddress) {
        throw new functions.https.HttpsError("invalid-argument", "Wallet address is required");
    }
    // Validate Solana wallet address early
    try {
        new web3_js_1.PublicKey(walletAddress);
    }
    catch {
        throw new functions.https.HttpsError("invalid-argument", "Invalid Solana wallet address");
    }
    try {
        // Use transaction for atomic balance update
        const result = await db.runTransaction(async (transaction) => {
            // Get user's current balance
            const userRef = db.collection("users").doc(userId);
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                throw new functions.https.HttpsError("not-found", "User not found");
            }
            const userData = userDoc.data();
            const currentBalance = userData?.totalRealmkin || 0;
            // Check sufficient balance
            if (amount > currentBalance) {
                throw new functions.https.HttpsError("failed-precondition", "Insufficient balance");
            }
            // Update balance atomically
            transaction.update(userRef, {
                totalRealmkin: currentBalance - amount,
                lastClaimDate: admin.firestore.FieldValue.serverTimestamp(),
            });
            return currentBalance;
        });
        // Initiate Solana transfer in parallel (non-blocking)
        // This runs async without waiting, making the response instant
        transferMKINTokens(walletAddress, amount)
            .then((txHash) => {
            // Record claim after transfer succeeds
            db.collection("claims").add({
                userId,
                amount,
                walletAddress,
                transactionHash: txHash,
                status: "completed",
                claimType,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                completedAt: admin.firestore.FieldValue.serverTimestamp(),
            }).catch((err) => {
                console.error("Failed to record claim:", err);
            });
        })
            .catch((err) => {
            console.error("Solana transfer failed:", err);
            // Optionally: reverse the balance deduction
            db.collection("users").doc(userId).update({
                totalRealmkin: admin.firestore.FieldValue.increment(amount),
            }).catch((reverseErr) => {
                console.error("Failed to reverse balance:", reverseErr);
            });
        });
        // Return immediately with pending status
        return {
            success: true,
            txHash: "pending", // Will be updated in background
        };
    }
    catch (error) {
        console.error("Claim error:", error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError("internal", error instanceof Error ? error.message : "Claim failed");
    }
});
async function transferMKINTokens(toWalletAddress, amount) {
    const solanaRpcUrl = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
    const mkinTokenMint = process.env.MKIN_TOKEN_MINT;
    const gatekeeperKeypairJson = process.env.GATEKEEPER_KEYPAIR;
    if (!mkinTokenMint || !gatekeeperKeypairJson) {
        throw new Error("Missing Solana configuration");
    }
    const connection = new web3_js_1.Connection(solanaRpcUrl);
    const gatekeeperKeypair = web3_js_1.Keypair.fromSecretKey(Buffer.from(JSON.parse(gatekeeperKeypairJson)));
    const tokenMint = new web3_js_1.PublicKey(mkinTokenMint);
    const toWallet = new web3_js_1.PublicKey(toWalletAddress);
    // Get associated token accounts
    const fromTokenAccount = await (0, spl_token_1.getAssociatedTokenAddress)(tokenMint, gatekeeperKeypair.publicKey);
    const toTokenAccount = await (0, spl_token_1.getAssociatedTokenAddress)(tokenMint, toWallet);
    // Create transfer instruction
    const instruction = (0, spl_token_1.createTransferCheckedInstruction)(fromTokenAccount, tokenMint, toTokenAccount, gatekeeperKeypair.publicKey, Math.floor(amount * 10 ** 6), // Assuming 6 decimals
    6);
    // Create and send transaction
    const transaction = new web3_js_1.Transaction().add(instruction);
    transaction.feePayer = gatekeeperKeypair.publicKey;
    const txHash = await (0, web3_js_2.sendAndConfirmTransaction)(connection, transaction, [
        gatekeeperKeypair,
    ]);
    return txHash;
}
exports.getClaimHistory = functions.https.onCall(async (request) => {
    if (!request.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
    }
    const userId = request.auth.uid;
    const limit = request.data.limit || 10;
    try {
        const claims = await db
            .collection("claims")
            .where("userId", "==", userId)
            .orderBy("createdAt", "desc")
            .limit(limit)
            .get();
        return {
            claims: claims.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate(),
                completedAt: doc.data().completedAt?.toDate(),
            })),
        };
    }
    catch (error) {
        console.error("Fetch history error:", error);
        throw new functions.https.HttpsError("internal", "Failed to fetch claim history");
    }
});
//# sourceMappingURL=claimTokens.js.map