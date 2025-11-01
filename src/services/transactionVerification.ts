import { Connection, PublicKey, Transaction } from "@solana/web3.js";

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const STAKING_WALLET = process.env.NEXT_PUBLIC_STAKING_WALLET_ADDRESS || "";
const TOKEN_MINT = process.env.NEXT_PUBLIC_TOKEN_MINT || "";

export interface TransactionVerification {
  isValid: boolean;
  txSignature: string;
  sender: string;
  recipient: string;
  amount: number;
  timestamp: number;
  error?: string;
}

/**
 * Verify a Solana transaction signature and extract transfer details
 */
export async function verifyTransaction(
  txSignature: string
): Promise<TransactionVerification> {
  try {
    const connection = new Connection(RPC_URL, "confirmed");
    
    // Wait a moment for transaction to be indexed
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get transaction details with retries
    let tx = null;
    for (let i = 0; i < 3; i++) {
      try {
        tx = await connection.getParsedTransaction(txSignature, "finalized");
        if (tx) break;
      } catch (e) {
        if (i < 2) await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    if (!tx) {
      return {
        isValid: false,
        txSignature,
        sender: "",
        recipient: "",
        amount: 0,
        timestamp: 0,
        error: "Transaction not found after retries",
      };
    }

    // Extract transaction info
    const blockTime = tx.blockTime || 0;
    const instructions = tx.transaction.message.instructions;
    
    let sender = "";
    let recipient = "";
    let amount = 0;
    let found = false;

    // Look for token transfer instruction
    for (const instruction of instructions) {
      if ("parsed" in instruction && instruction.parsed?.type === "transfer") {
        const parsed = instruction.parsed;
        sender = parsed.info?.source || "";
        recipient = parsed.info?.destination || "";
        amount = (parsed.info?.tokenAmount?.uiAmount || 0);
        found = true;
        break;
      }
    }

    if (!found) {
      return {
        isValid: false,
        txSignature,
        sender: "",
        recipient: "",
        amount: 0,
        timestamp: blockTime,
        error: "No token transfer found in transaction",
      };
    }

    // Verify recipient is the staking wallet
    const isValidRecipient = recipient === STAKING_WALLET;

    return {
      isValid: isValidRecipient && amount > 0,
      txSignature,
      sender,
      recipient,
      amount,
      timestamp: blockTime,
    };
  } catch (error) {
    console.error("Transaction verification error:", error);
    return {
      isValid: false,
      txSignature,
      sender: "",
      recipient: "",
      amount: 0,
      timestamp: 0,
      error: error instanceof Error ? error.message : "Verification failed",
    };
  }
}

/**
 * Verify multiple transactions
 */
export async function verifyTransactions(
  txSignatures: string[]
): Promise<TransactionVerification[]> {
  return Promise.all(txSignatures.map(verifyTransaction));
}

/**
 * Check if a transaction has been confirmed
 */
export async function isTransactionConfirmed(txSignature: string): Promise<boolean> {
  try {
    const connection = new Connection(RPC_URL, "confirmed");
    const status = await connection.getSignatureStatus(txSignature);
    return status.value?.confirmationStatus === "confirmed" || status.value?.confirmationStatus === "finalized";
  } catch (error) {
    console.error("Error checking transaction confirmation:", error);
    return false;
  }
}
