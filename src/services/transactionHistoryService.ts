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

// Cache for transaction history to prevent excessive reads
interface CacheEntry {
  data: TransactionRecord[];
  timestamp: number;
  lastDoc: QueryDocumentSnapshot | null;
}

const transactionCache = new Map<string, CacheEntry>();
const CACHE_DURATION = 30 * 1000; // 30 seconds cache

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
 * Fetches from both transactionHistory (frontend) and staking_transactions (backend)
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
    const requestedLimit = options?.limit || 50;
    
    // Create cache key from userId and options
    const cacheKey = `${userId}_${options?.type || 'all'}_${options?.status || 'all'}_${requestedLimit}`;
    
    // Check cache first
    const cached = transactionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`💾 Using cached transactions (age: ${Math.floor((Date.now() - cached.timestamp) / 1000)}s)`);
      return { transactions: cached.data, lastDoc: cached.lastDoc };
    }
    
    // Fetch from frontend transaction history collection
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
    q = query(q, limit(requestedLimit));

    // Pagination
    if (options?.startAfterDoc) {
      q = query(q, startAfter(options.startAfterDoc));
    }

    // Fetch frontend transactions
    const [frontendSnapshot, stakingSnapshot] = await Promise.all([
      getDocs(q),
      fetchStakingTransactions(userId, options)
    ]);

    // Map frontend transactions
    const frontendTransactions = frontendSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as TransactionRecord[];

    // Merge and sort all transactions by timestamp
    const allTransactions = [...frontendTransactions, ...stakingSnapshot]
      .sort((a, b) => {
        const aTime = a.timestamp?.toMillis?.() || 0;
        const bTime = b.timestamp?.toMillis?.() || 0;
        return bTime - aTime; // Descending order (newest first)
      })
      .slice(0, requestedLimit); // Apply limit after merging

    const lastDoc = frontendSnapshot.docs[frontendSnapshot.docs.length - 1] || null;

    console.log(`📊 Fetched ${frontendTransactions.length} frontend + ${stakingSnapshot.length} staking = ${allTransactions.length} total transactions`);

    // Store in cache
    transactionCache.set(cacheKey, {
      data: allTransactions,
      timestamp: Date.now(),
      lastDoc,
    });

    return { transactions: allTransactions, lastDoc };
  } catch (error) {
    console.error("Error getting transaction history:", error);
    return { transactions: [], lastDoc: null };
  }
}

/**
 * Fetch staking transactions from backend collection
 */
async function fetchStakingTransactions(
  userId: string,
  options?: {
    type?: TransactionType;
    status?: TransactionStatus;
    limit?: number;
  }
): Promise<TransactionRecord[]> {
  try {
    console.log(`🔍 Fetching staking transactions for user: ${userId}`);
    
    // Fetch from backend staking_transactions collection
    const stakingRef = collection(db, "staking_transactions");
    let q = query(
      stakingRef,
      where("user_id", "==", userId),
      orderBy("timestamp", "desc"),
      limit(options?.limit || 50)
    );

    const snapshot = await getDocs(q);
    console.log(`📦 Found ${snapshot.docs.length} staking transactions in Firestore`);
    
    // Map staking transactions to TransactionRecord format
    const stakingTransactions: TransactionRecord[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      const type = data.type as string;
      
      // Map backend transaction type to frontend type
      let mappedType: TransactionType;
      if (type === "STAKE") mappedType = "stake";
      else if (type === "CLAIM") mappedType = "staking_claim";
      else if (type === "UNSTAKE") mappedType = "unstake";
      else mappedType = type.toLowerCase() as TransactionType;

      // Determine status - backend logs don't have explicit status field
      // If payout_signature exists or status is COMPLETED, it's success
      const status: TransactionStatus = 
        data.payout_signature || data.status === "COMPLETED" 
          ? "success" 
          : data.status === "PENDING_RECOVERY" || data.error_message
          ? "failed"
          : "success"; // Default to success if transaction was logged

      // Determine token type based on transaction type
      let token: TokenType;
      if (type === "STAKE" || type === "UNSTAKE") {
        token = "MKIN";
      } else if (type === "CLAIM") {
        token = "SOL";
      } else {
        token = data.token || "MKIN";
      }

      // Get amount based on transaction type
      let amount = 0;
      if (type === "STAKE" || type === "UNSTAKE") {
        amount = data.amount_mkin || data.amount || 0;
      } else if (type === "CLAIM") {
        amount = data.amount_sol || data.amount || 0;
      }

      return {
        id: doc.id,
        type: mappedType,
        status,
        amount,
        token,
        timestamp: data.timestamp || Timestamp.now(),
        txSignature: data.signature || data.payout_signature || data.fee_tx,
        errorMessage: data.error_message,
        metadata: {
          feeAmount: data.fee_amount_sol || data.fee_amount_mkin_value,
          feePaid: data.fee_amount_sol,
          stakeId: data.user_id,
          ...(data.fee_tx && { feeTxSignature: data.fee_tx }),
          ...(data.payout_signature && { payoutSignature: data.payout_signature }),
        },
      };
    });

    // Apply type filter if specified
    if (options?.type) {
      return stakingTransactions.filter(tx => tx.type === options.type);
    }

    // Apply status filter if specified
    if (options?.status) {
      return stakingTransactions.filter(tx => tx.status === options.status);
    }

    return stakingTransactions;
  } catch (error) {
    console.error("Error fetching staking transactions:", error);
    return [];
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
