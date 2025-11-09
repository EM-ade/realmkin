import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  createTransferInstruction,
} from "@solana/spl-token";

// Initialize Admin SDK
admin.initializeApp();
const db = admin.firestore();

// ENV CONFIG (set via Firebase env:config:set or use defineSecret for v2)
const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const TOKEN_MINT = new PublicKey(process.env.SOLANA_TOKEN_MINT || "");
const STAKING_PRIVATE_KEY = JSON.parse(Buffer.from(process.env.SOLANA_STAKING_PRIVATE_KEY || "", "base64").toString()) as number[];

const connection = new Connection(RPC_URL, "confirmed");
const stakingKeypair = Keypair.fromSecretKey(new Uint8Array(STAKING_PRIVATE_KEY));

/**
 * On stake doc updated -> if status changed to "unstaking" send tokens back
 */
export const processUnstake = onDocumentUpdated("stakes/{stakeId}", async (event) => {
    const change = event.data;
    if (!change) return null;
    
    const before = change.before.data();
    const after = change.after.data();

    if (!before || !after) return null;

    // Only act on transition active->unstaking
    if (before.status !== "unstaking" && after.status === "unstaking") {
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
          amount * Math.pow(10, parseInt(process.env.TOKEN_DECIMALS || "6")),
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
