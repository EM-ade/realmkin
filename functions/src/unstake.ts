import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  createTransferInstruction,
} from "@solana/spl-token";

// Define secrets
const SOLANA_RPC_URL = defineSecret("SOLANA_RPC_URL");
const SOLANA_TOKEN_MINT = defineSecret("SOLANA_TOKEN_MINT");
const TOKEN_DECIMALS = defineSecret("TOKEN_DECIMALS");
const SOLANA_STAKING_PRIVATE_KEY = defineSecret("SOLANA_STAKING_PRIVATE_KEY");
const BACKEND_URL = defineSecret("BACKEND_URL");

// Initialize Admin SDK
admin.initializeApp();
const db = admin.firestore();

// Initialize with error handling
let connection: Connection;
let stakingKeypair: Keypair | null = null;
let TOKEN_MINT: PublicKey;
let rpcUrl: string;
let tokenDecimals: number;

// These will be initialized when the function runs with secrets
function initializeSolanaConfig(rpcUrlValue: string, tokenMintValue: string, privateKeyValue?: string) {
  try {
    rpcUrl = rpcUrlValue || "https://api.devnet.solana.com";
    TOKEN_MINT = new PublicKey(tokenMintValue || "11111111111111111111111111111111");
    connection = new Connection(rpcUrl, "confirmed");
    tokenDecimals = parseInt(process.env.TOKEN_DECIMALS || "9");
    
    if (privateKeyValue) {
      const STAKING_PRIVATE_KEY = JSON.parse(Buffer.from(privateKeyValue, "base64").toString()) as number[];
      stakingKeypair = Keypair.fromSecretKey(new Uint8Array(STAKING_PRIVATE_KEY));
    } else {
      console.warn("Warning: SOLANA_STAKING_PRIVATE_KEY not set. Unstake function will not work.");
    }
  } catch (e) {
    console.error("Error initializing Solana configuration:", e);
  }
}

/**
 * On stake doc updated -> if status changed to "unstaking" send tokens back
 */
export const processUnstake = onDocumentUpdated(
  { document: "stakes/{stakeId}", secrets: [SOLANA_RPC_URL, SOLANA_TOKEN_MINT, TOKEN_DECIMALS, SOLANA_STAKING_PRIVATE_KEY, BACKEND_URL] },
  async (event) => {
    const change = event.data;
    if (!change) return null;
    
    // Initialize Solana config with secrets
    initializeSolanaConfig(
      SOLANA_RPC_URL.value(),
      SOLANA_TOKEN_MINT.value(),
      SOLANA_STAKING_PRIVATE_KEY.value()
    );
    
    const before = change.before.data();
    const after = change.after.data();

    if (!before || !after) return null;

    // Only act on transition active->unstaking
    if (before.status !== "unstaking" && after.status === "unstaking") {
      // Check if staking keypair is available
      if (!stakingKeypair) {
        console.error("Staking keypair not configured. Cannot process unstake.");
        return null;
      }

      const amount = after.amount as number;
      const userWallet = new PublicKey(after.wallet);

      try {
        // Get ATA addresses
        const stakingATA = await getAssociatedTokenAddress(TOKEN_MINT, stakingKeypair.publicKey);
        const userATA = await getAssociatedTokenAddress(TOKEN_MINT, userWallet);

        // Create transfer instruction
        const instruction = createTransferInstruction(
          stakingATA,
          userATA,
          stakingKeypair.publicKey,
          amount * Math.pow(10, tokenDecimals),
          [],
          TOKEN_PROGRAM_ID
        );

        const transaction = new Transaction();
        transaction.add(instruction);
        transaction.feePayer = stakingKeypair.publicKey;
        transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

        transaction.sign(stakingKeypair);
        const signature = await sendAndConfirmTransaction(connection, transaction, [stakingKeypair]);

        // Mark stake completed
        await change.after.ref.update({ status: "completed", updated_at: admin.firestore.Timestamp.now() });

        // Call completeUnstake helper to update TVL etc.
        const backendUrl = process.env.BACKEND_URL || "";
        await fetch(`${backendUrl}/unstake/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stakeId: event.params.stakeId, txSignature: signature }),
        });
      } catch (err) {
        console.error("Unstake processing failed", err);
      }
    }
    return null;
  });
