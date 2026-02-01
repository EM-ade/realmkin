import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  Timestamp,
  startAfter,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/config/firebase";

// Transaction types
export type TransactionType =
  | "withdrawal"
  | "transfer"
  | "claim"
  | "stake"
  | "unstake"
  | "staking_claim"
  | "revenue_share";

// Transaction status
export type TransactionStatus = "success" | "failed" | "pending";

// Token types
export type TokenType = "MKIN" | "SOL" | "EMPIRE";

// Transaction metadata
export interface TransactionMetadata {
  distributionId?: string; // For revenue_share
  stakeId?: string; // For stake/unstake
  feeAmount?: number;
  feePaid?: number;
  accountsCreated?: string[]; // Token accounts created
  boosterId?: string; // For staking with booster
  duration?: number; // Staking duration
  recipient?: string; // For transfers
  [key: string]: any;
}

// Transaction record
export interface TransactionRecord {
  id?: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  token: TokenType;
  timestamp: Timestamp;
  txSignature?: string;
  recipient?: string;
  errorCode?: string;
  errorMessage?: string; // User-friendly error
  technicalError?: string; // Developer-level error
  metadata?: TransactionMetadata;
}

// User-friendly error messages
const ERROR_MESSAGES: Record<string, string> = {
  INSUFFICIENT_BALANCE: "You don't have enough balance to complete this transaction",
  WALLET_NOT_CONNECTED: "Please connect your wallet first",
  TRANSACTION_TIMEOUT: "Transaction took too long and was cancelled. Please try again",
  USER_REJECTED: "You cancelled the transaction",
  USER_REJECTED_REQUEST: "You cancelled the transaction",
  NETWORK_ERROR: "Network connection issue. Please check your internet and try again",
  TOKEN_ACCOUNT_NOT_FOUND: "Token account not found. Please try again",
  INVALID_RECIPIENT: "The recipient wallet address is invalid",
  INVALID_AMOUNT: "Please enter a valid amount",
  INSUFFICIENT_SOL_FOR_FEE: "You don't have enough SOL to pay the transaction fee",
  TRANSACTION_FAILED: "Transaction failed. Please try again",
  BLOCKHASH_NOT_FOUND: "Network is busy. Please try again in a moment",
  SIMULATION_FAILED: "Transaction simulation failed. Please check your balance and try again",
  ALREADY_CLAIMED: "You have already claimed this reward",
  NOT_ELIGIBLE: "You are not eligible for this reward",
  EXPIRED_ALLOCATION: "This allocation has expired",
  INVALID_SIGNATURE: "Invalid transaction signature",
  TREASURY_INSUFFICIENT_BALANCE: "Treasury has insufficient balance. Please contact support",
  STAKING_POOL_FULL: "Staking pool is currently full. Please try again later",
  MINIMUM_STAKE_NOT_MET: "Amount is below the minimum stake requirement",
  STAKE_NOT_FOUND: "Stake position not found",
  UNSTAKE_TOO_EARLY: "Cannot unstake before the lock period ends",
  UNKNOWN_ERROR: "An unexpected error occurred. Please try again or contact support",
};

// Get user-friendly error message
export function getFriendlyErrorMessage(error: any): {
  errorCode: string;
  errorMessage: string;
  technicalError: string;
} {
  const technicalError = error?.message || String(error);

  // Check for known error patterns
  if (technicalError.includes("User rejected")) {
    return {
      errorCode: "USER_REJECTED",
      errorMessage: ERROR_MESSAGES.USER_REJECTED,
      technicalError,
    };
  }

  if (technicalError.includes("insufficient")) {
    if (technicalError.toLowerCase().includes("sol")) {
      return {
        errorCode: "INSUFFICIENT_SOL_FOR_FEE",
        errorMessage: ERROR_MESSAGES.INSUFFICIENT_SOL_FOR_FEE,
        technicalError,
      };
    }
    return {
      errorCode: "INSUFFICIENT_BALANCE",
      errorMessage: ERROR_MESSAGES.INSUFFICIENT_BALANCE,
      technicalError,
    };
  }

  if (technicalError.includes("timeout") || technicalError.includes("timed out")) {
    return {
      errorCode: "TRANSACTION_TIMEOUT",
      errorMessage: ERROR_MESSAGES.TRANSACTION_TIMEOUT,
      technicalError,
    };
  }

  if (technicalError.includes("network") || technicalError.includes("fetch failed")) {
    return {
      errorCode: "NETWORK_ERROR",
      errorMessage: ERROR_MESSAGES.NETWORK_ERROR,
      technicalError,
    };
  }

  if (technicalError.includes("blockhash not found")) {
    return {
      errorCode: "BLOCKHASH_NOT_FOUND",
      errorMessage: ERROR_MESSAGES.BLOCKHASH_NOT_FOUND,
      technicalError,
    };
  }

  if (technicalError.includes("simulation failed")) {
    return {
      errorCode: "SIMULATION_FAILED",
      errorMessage: ERROR_MESSAGES.SIMULATION_FAILED,
      technicalError,
    };
  }

  if (technicalError.includes("already claimed")) {
    return {
      errorCode: "ALREADY_CLAIMED",
      errorMessage: ERROR_MESSAGES.ALREADY_CLAIMED,
      technicalError,
    };
  }

  if (technicalError.includes("not eligible")) {
    return {
      errorCode: "NOT_ELIGIBLE",
      errorMessage: ERROR_MESSAGES.NOT_ELIGIBLE,
      technicalError,
    };
  }

  if (technicalError.includes("expired")) {
    return {
      errorCode: "EXPIRED_ALLOCATION",
      errorMessage: ERROR_MESSAGES.EXPIRED_ALLOCATION,
      technicalError,
    };
  }

  // Default to unknown error
  return {
    errorCode: "UNKNOWN_ERROR",
    errorMessage: ERROR_MESSAGES.UNKNOWN_ERROR,
    technicalError,
  };
}

/**
 * Log a transaction to Firebase
 */
export async function logTransaction(
  userId: string,
  transaction: Omit<TransactionRecord, "id">
): Promise<string> {
  try {
    const transactionsRef = collection(db, `transactionHistory/${userId}/transactions`);
    const docRef = await addDoc(transactionsRef, {
      ...transaction,
      timestamp: transaction.timestamp || Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error logging transaction:", error);
    throw error;
  }
}

/**
 * Update transaction status
 */
export async function updateTransactionStatus(
  userId: string,
  transactionId: string,
  status: TransactionStatus,
  updates?: Partial<TransactionRecord>
): Promise<void> {
  try {
    const transactionRef = doc(db, `transactionHistory/${userId}/transactions/${transactionId}`);
    await updateDoc(transactionRef, {
      status,
      ...updates,
    });
  } catch (error) {
    console.error("Error updating transaction status:", error);
    throw error;
  }
}

/**
 * Get transaction by ID
 */
export async function getTransactionById(
  userId: string,
  transactionId: string
): Promise<TransactionRecord | null> {
  try {
    const transactionRef = doc(db, `transactionHistory/${userId}/transactions/${transactionId}`);
    const transactionDoc = await getDoc(transactionRef);

    if (!transactionDoc.exists()) {
      return null;
    }

    return {
      id: transactionDoc.id,
      ...transactionDoc.data(),
    } as TransactionRecord;
  } catch (error) {
    console.error("Error getting transaction:", error);
    return null;
  }
}

/**
 * Get transaction history with filters
 */
export async function getTransactionHistory(
  userId: string,
  options?: {
    type?: TransactionType;
    status?: TransactionStatus;
    limit?: number;
    startAfterDoc?: QueryDocumentSnapshot;
  }
): Promise<{
  transactions: TransactionRecord[];
  lastDoc: QueryDocumentSnapshot | null;
}> {
  try {
    const transactionsRef = collection(db, `transactionHistory/${userId}/transactions`);
    let q = query(transactionsRef, orderBy("timestamp", "desc"));

    // Apply filters
    if (options?.type) {
      q = query(q, where("type", "==", options.type));
    }

    if (options?.status) {
      q = query(q, where("status", "==", options.status));
    }

    // Apply limit
    if (options?.limit) {
      q = query(q, limit(options.limit));
    }

    // Pagination
    if (options?.startAfterDoc) {
      q = query(q, startAfter(options.startAfterDoc));
    }

    const snapshot = await getDocs(q);
    const transactions = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as TransactionRecord[];

    const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;

    return { transactions, lastDoc };
  } catch (error) {
    console.error("Error getting transaction history:", error);
    return { transactions: [], lastDoc: null };
  }
}

/**
 * Search transactions by signature or recipient
 */
export async function searchTransactions(
  userId: string,
  searchTerm: string
): Promise<TransactionRecord[]> {
  try {
    const transactionsRef = collection(db, `transactionHistory/${userId}/transactions`);

    // Search by transaction signature
    const sigQuery = query(
      transactionsRef,
      where("txSignature", "==", searchTerm),
      orderBy("timestamp", "desc"),
      limit(20)
    );

    // Search by recipient (for transfers)
    const recipientQuery = query(
      transactionsRef,
      where("recipient", "==", searchTerm),
      orderBy("timestamp", "desc"),
      limit(20)
    );

    const [sigSnapshot, recipientSnapshot] = await Promise.all([
      getDocs(sigQuery),
      getDocs(recipientQuery),
    ]);

    // Combine results and deduplicate
    const transactionMap = new Map<string, TransactionRecord>();

    sigSnapshot.docs.forEach((doc) => {
      transactionMap.set(doc.id, { id: doc.id, ...doc.data() } as TransactionRecord);
    });

    recipientSnapshot.docs.forEach((doc) => {
      transactionMap.set(doc.id, { id: doc.id, ...doc.data() } as TransactionRecord);
    });

    return Array.from(transactionMap.values());
  } catch (error) {
    console.error("Error searching transactions:", error);
    return [];
  }
}

/**
 * Get transaction statistics
 */
export async function getTransactionStats(userId: string): Promise<{
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  pendingTransactions: number;
  totalWithdrawn: number;
  totalTransferred: number;
  totalClaimed: number;
}> {
  try {
    const transactionsRef = collection(db, `transactionHistory/${userId}/transactions`);
    const q = query(transactionsRef);
    const snapshot = await getDocs(q);

    let totalWithdrawn = 0;
    let totalTransferred = 0;
    let totalClaimed = 0;
    let successfulTransactions = 0;
    let failedTransactions = 0;
    let pendingTransactions = 0;

    snapshot.docs.forEach((doc) => {
      const tx = doc.data() as TransactionRecord;

      if (tx.status === "success") {
        successfulTransactions++;

        if (tx.type === "withdrawal") {
          totalWithdrawn += tx.amount;
        } else if (tx.type === "transfer") {
          totalTransferred += tx.amount;
        } else if (tx.type === "claim" || tx.type === "staking_claim" || tx.type === "revenue_share") {
          totalClaimed += tx.amount;
        }
      } else if (tx.status === "failed") {
        failedTransactions++;
      } else if (tx.status === "pending") {
        pendingTransactions++;
      }
    });

    return {
      totalTransactions: snapshot.size,
      successfulTransactions,
      failedTransactions,
      pendingTransactions,
      totalWithdrawn,
      totalTransferred,
      totalClaimed,
    };
  } catch (error) {
    console.error("Error getting transaction stats:", error);
    return {
      totalTransactions: 0,
      successfulTransactions: 0,
      failedTransactions: 0,
      pendingTransactions: 0,
      totalWithdrawn: 0,
      totalTransferred: 0,
      totalClaimed: 0,
    };
  }
}

// Helper function to create a pending transaction and return its ID for later updates
export async function createPendingTransaction(
  userId: string,
  transaction: Omit<TransactionRecord, "id" | "status" | "timestamp">
): Promise<string> {
  return await logTransaction(userId, {
    ...transaction,
    status: "pending",
    timestamp: Timestamp.now(),
  });
}

// Helper to complete a transaction (mark as success)
export async function completeTransaction(
  userId: string,
  transactionId: string,
  txSignature: string,
  metadata?: TransactionMetadata
): Promise<void> {
  await updateTransactionStatus(userId, transactionId, "success", {
    txSignature,
    metadata,
  });
}

// Helper to fail a transaction
export async function failTransaction(
  userId: string,
  transactionId: string,
  error: any
): Promise<void> {
  const { errorCode, errorMessage, technicalError } = getFriendlyErrorMessage(error);

  await updateTransactionStatus(userId, transactionId, "failed", {
    errorCode,
    errorMessage,
    technicalError,
  });
}
