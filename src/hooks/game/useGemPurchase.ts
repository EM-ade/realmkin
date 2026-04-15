"use client";

/**
 * useGemPurchase — Updated gem purchase hook with NEW pricing.
 *
 * This hook now delegates to useSolanaPayment for the actual SOL payment flow.
 * Kept as a separate hook for backwards compatibility with existing components
 * that may still import it.
 *
 * NEW PRICING:
 *   Handful: 80 gems / $0.15
 *   Pouch:   200 gems / $0.30
 *   Chest:   475 gems / $0.65
 */

import { useSolanaPayment, GEM_PACKS } from "./useSolanaPayment";
import { useGameState } from "@/stores/gameStore";
import { useXPSystem } from "./useXPSystem";
import { useCallback } from "react";

export { GEM_PACKS } from "./useSolanaPayment";

export function useGemPurchase() {
  const { initiateGemPurchase, verifyAndCreditGems, isPurchasing, error, clearError } =
    useSolanaPayment();
  const addResources = useGameState((state) => state.addResources);

  const buyGems = useCallback(
    async (packId: string): Promise<boolean> => {
      clearError();

      const pack = GEM_PACKS.find((p) => p.id === packId);
      if (!pack) return false;

      // Fetch SOL price
      let solPrice: number;
      try {
        const res = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
        );
        const data = await res.json();
        solPrice = data.solana?.usd ?? 150;
      } catch {
        solPrice = 150;
      }

      const solAmount = pack.usdPrice / solPrice;

      // Initiate payment
      const result = await initiateGemPurchase(packId as any, solAmount);
      if ("error" in result) {
        if (result.error !== "cancelled") {
          console.error("[GemPurchase] Payment error:", result.error);
        }
        return false;
      }

      // For backwards compat: we need the player ID
      // This hook doesn't have access to the player context
      // The calling component should handle verification + gem crediting
      // via verifyAndCreditGems separately

      // Optimistic update (will be confirmed by server)
      addResources({ gems: pack.gems });
      useXPSystem.getState().awardXP("first_gem_spend");

      return true;
    },
    [initiateGemPurchase, addResources, clearError]
  );

  return { buyGems, isPurchasing, error };
}
