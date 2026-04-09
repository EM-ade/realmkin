"use client";

/**
 * KingdomGameClient — Client component that renders the Phaser Kingdom game
 * with all its UI overlays, wrapped in the appropriate providers.
 *
 * Uses Realmkin's existing wallet connection (Web3Context) and bridges it
 * to the game's auth system via GameAuthProvider.
 */

import dynamic from "next/dynamic";
import { GameAuthProvider } from "@/components/game/providers/GameAuthProvider";
import { LoadingProvider } from "@/context/LoadingContext";

// Dynamically import the game app wrapper with SSR disabled
// This prevents Phaser from crashing during Next.js server-side rendering
const GameApp = dynamic(
  () => import("@/components/game/KingdomApp").then((mod) => mod.KingdomApp),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen w-full items-center justify-center bg-stone-900">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#DA9C2F] border-t-transparent" />
          <p className="text-sm font-medium uppercase tracking-widest text-[#DA9C2F]">
            Loading Kingdom...
          </p>
        </div>
      </div>
    ),
  }
);

export default function KingdomGameClient() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#1a1a2e]">
      {/* Game wrapper — full viewport */}
      <div className="relative z-10 h-screen w-full">
        <GameAuthProvider>
          <LoadingProvider>
            <GameApp />
          </LoadingProvider>
        </GameAuthProvider>
      </div>
    </div>
  );
}
