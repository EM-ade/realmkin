"use client";

/**
 * useSolanaPayment — Frontend hook for initiating SOL payments
 *
 * Pattern: Creates transaction → user signs → waits for confirmation
 * → returns signature for server-side verification.
 */

import { useState } from "react";
import {
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";

export interface GemPack {
  id: "handful" | "pouch" | "chest";
  name: string;
  gems: number;
  usdPrice: number;
  displayName: string;
}

export const GEM_PACKS: GemPack[] = [
  {
    id: "handful",
    name: "Handful",
    gems: 80,
    usdPrice: 0.15,
    displayName: "Handful",
  },
  {
    id: "pouch",
    name: "Pouch",
    gems: 200,
    usdPrice: 0.30,
    displayName: "Pouch",
  },
  {
    id: "chest",
    name: "Chest",
    gems: 475,
    usdPrice: 0.65,
    displayName: "Chest",
  },
];

const TREASURY_WALLET_STR = process.env.NEXT_PUBLIC_TREASURY_WALLET || "11111111111111111111111111111111";

let TREASURY_WALLET: PublicKey;
try {
  TREASURY_WALLET = new PublicKey(TREASURY_WALLET_STR);
} catch {
  TREASURY_WALLET = new PublicKey("11111111111111111111111111111111");
}

export function useSolanaPayment() {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [purchasingPackId, setPurchasingPackId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isPurchasing = (id: string) => purchasingPackId === id;

  /**
   * Initiates a gem purchase by creating and signing a SOL transfer.
   * Returns the transaction signature for server-side verification.
   */
  const initiateGemPurchase = async (
    packId: GemPack["id"],
    solAmount: number
  ): Promise<{ signature: string } | { error: string }> => {
    if (!publicKey) {
      return { error: "Please connect your wallet first." };
    }

    const lamports = Math.floor(solAmount * LAMPORTS_PER_SOL);

    try {
      setPurchasingPackId(packId);
      setError(null);

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: TREASURY_WALLET,
          lamports,
        })
      );

      const {
        context: { slot: minContextSlot },
        value: { blockhash, lastValidBlockHeight },
      } = await connection.getLatestBlockhashAndContext();

      const signature = await sendTransaction(transaction, connection, {
        minContextSlot,
      });

      const confirmation = await connection.confirmTransaction({
        blockhash,
        lastValidBlockHeight,
        signature,
      });

      if (confirmation.value.err) {
        throw new Error("Transaction failed to confirm.");
      }

      return { signature };
    } catch (err: any) {
      if (err.message?.includes("User rejected") || err.message?.includes("User denied")) {
        return { error: "cancelled" };
      }
      console.error("[SolanaPayment] Transaction failed:", err);
      setError(err.message || "Transaction failed.");
      return { error: err.message || "Transaction failed." };
    } finally {
      setPurchasingPackId(null);
    }
  };

  /**
   * Sends the confirmed tx signature to the server for verification
   * and gem crediting.
   */
  const verifyAndCreditGems = async (
    signature: string,
    packId: GemPack["id"],
    playerId: string,
    solAmount: number
  ): Promise<
    | { success: true; gemsAdded: number; newBalance: number; packName: string }
    | { success: false; error: string }
  > => {
    try {
      setPurchasingPackId(packId); // Keep loading state during verification
      const verifyRes = await fetch("/api/game/purchase-gems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signature,
          packId,
          playerId,
          solAmount,
        }),
      });

      const data = await verifyRes.json();

      if (!verifyRes.ok) {
        return { success: false, error: data.error || "Purchase failed" };
      }

      return {
        success: true,
        gemsAdded: data.gemsAdded,
        newBalance: data.newBalance,
        packName: data.packName,
      };
    } catch (err) {
      console.error("[SolanaPayment] Verification request failed:", err);
      return {
        success: false,
        error: "Network error. Please contact support if gems were not credited.",
      };
    } finally {
      setPurchasingPackId(null);
    }
  };

  return {
    initiateGemPurchase,
    verifyAndCreditGems,
    isPurchasing,
    error,
    clearError: () => setError(null),
  };
}
