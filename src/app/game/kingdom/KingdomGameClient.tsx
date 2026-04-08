"use client";

/**
 * KingdomGameClient — Client component that renders the Phaser Kingdom game
 * with all its UI overlays, wrapped in the appropriate providers.
 *
 * Uses Realmkin's existing wallet connection (Web3Context) and bridges it
 * to the game's auth system via GameAuthProvider.
 */

import { useEffect, useRef, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useWeb3 } from "@/contexts/Web3Context";
import { useAuth as useRealmkinAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import { GameAuthProvider } from "@/components/game/providers/GameAuthProvider";
import MobileMenuOverlay from "@/components/MobileMenuOverlay";
import SocialLinks from "@/components/SocialLinks";
import { NAV_ITEMS } from "@/config/navigation";

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
  const { userData, user } = useRealmkinAuth();
  const { connectWallet, disconnectWallet, account, isConnected, isConnecting } = useWeb3();
  const isMobile = useIsMobile();
  const [showMobileActions, setShowMobileActions] = useState(false);
  const [gameReady, setGameReady] = useState(false);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#1a1a2e]">
      {/* Game wrapper — full viewport */}
      <div className="relative z-10 h-screen w-full">
        <GameAuthProvider>
          <GameApp onGameReady={() => setGameReady(true)} />
        </GameAuthProvider>
      </div>

      {/* Minimal header for mobile — wallet info + menu */}
      {isMobile && (
        <header className="absolute left-0 right-0 top-0 z-30 flex items-center justify-between gap-3 p-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => (isConnected ? disconnectWallet() : connectWallet())}
              className="rounded-lg border border-[#DA9C2F]/40 bg-[#0B0B09]/90 px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-[#DA9C2F] backdrop-blur-sm"
            >
              {isConnected
                ? `${account?.slice(0, 4)}...${account?.slice(-4)}`
                : "Connect"}
            </button>
          </div>
          <button
            onClick={() => setShowMobileActions((v) => !v)}
            className="rounded-lg border border-[#404040] bg-[#0B0B09]/90 px-2 py-1.5 text-xs text-[#DA9C2F] backdrop-blur-sm"
          >
            ☰
          </button>
        </header>
      )}

      {/* Mobile menu overlay */}
      <MobileMenuOverlay
        isOpen={showMobileActions}
        onClose={() => setShowMobileActions(false)}
        menuItems={NAV_ITEMS}
        isAdmin={userData?.admin}
        isConnected={isConnected}
        account={account}
        isConnecting={isConnecting}
        onConnectWallet={connectWallet}
        onDisconnectWallet={disconnectWallet}
      />
    </div>
  );
}
