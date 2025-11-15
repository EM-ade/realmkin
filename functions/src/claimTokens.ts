import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Connection, PublicKey, Transaction, Keypair } from "@solana/web3.js";
import {
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import { sendAndConfirmTransaction } from "@solana/web3.js";

const db = admin.firestore();

interface ClaimRequest {
  amount: number;
  walletAddress: string;
  claimType: string;
}

interface ClaimResponse {
  success: boolean;
  txHash?: string;
  error?: string;
}

export const claimTokens = functions.https.onCall(
  async (request): Promise<ClaimResponse> => {
    // Verify user is authenticated
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated"
      );
    }

    const userId = request.auth.uid;
    const { amount, walletAddress, claimType } = request.data as ClaimRequest;

    // Validate inputs
    if (!amount || amount <= 0) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Amount must be greater than 0"
      );
    }

    if (!walletAddress) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Wallet address is required"
      );
    }

    // Validate Solana wallet address early
    try {
      new PublicKey(walletAddress);
    } catch {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Invalid Solana wallet address"
      );
    }

    try {
      // Use transaction for atomic balance update
      const result = await db.runTransaction(async (transaction) => {
        // Get user's current balance
        const userRef = db.collection("users").doc(userId);
        const userDoc = await transaction.get(userRef);

        if (!userDoc.exists) {
          throw new functions.https.HttpsError(
            "not-found",
            "User not found"
          );
        }

        const userData = userDoc.data();
        const currentBalance = userData?.totalRealmkin || 0;

        // Check sufficient balance
        if (amount > currentBalance) {
          throw new functions.https.HttpsError(
            "failed-precondition",
            "Insufficient balance"
          );
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
    } catch (error) {
      console.error("Claim error:", error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError(
        "internal",
        error instanceof Error ? error.message : "Claim failed"
      );
    }
  }
);

async function transferMKINTokens(
  toWalletAddress: string,
  amount: number
): Promise<string> {
  const solanaRpcUrl = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
  const mkinTokenMint = process.env.MKIN_TOKEN_MINT;
  const gatekeeperKeypairJson = process.env.GATEKEEPER_KEYPAIR;

  if (!mkinTokenMint || !gatekeeperKeypairJson) {
    throw new Error("Missing Solana configuration");
  }

  const connection = new Connection(solanaRpcUrl);
  const gatekeeperKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(gatekeeperKeypairJson))
  );

  const tokenMint = new PublicKey(mkinTokenMint);
  const toWallet = new PublicKey(toWalletAddress);

  // Get associated token accounts
  const fromTokenAccount = await getAssociatedTokenAddress(
    tokenMint,
    gatekeeperKeypair.publicKey
  );
  const toTokenAccount = await getAssociatedTokenAddress(tokenMint, toWallet);

  // Create transfer instruction
  const instruction = createTransferCheckedInstruction(
    fromTokenAccount,
    tokenMint,
    toTokenAccount,
    gatekeeperKeypair.publicKey,
    Math.floor(amount * 10 ** 6), // Assuming 6 decimals
    6
  );

  // Create and send transaction
  const transaction = new Transaction().add(instruction);
  transaction.feePayer = gatekeeperKeypair.publicKey;

  const txHash = await sendAndConfirmTransaction(connection, transaction, [
    gatekeeperKeypair,
  ]);

  return txHash;
}

export const getClaimHistory = functions.https.onCall(
  async (request) => {
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated"
      );
    }

    const userId = request.auth.uid;
    const limit = (request.data as { limit?: number }).limit || 10;

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
    } catch (error) {
      console.error("Fetch history error:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to fetch claim history"
      );
    }
  }
);
