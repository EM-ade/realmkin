"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { useWeb3 } from "@/contexts/Web3Context";
import MobileMenuOverlay from "@/components/MobileMenuOverlay";
import HeroComingSoon from "@/components/marketplace/HeroComingSoon";
import InfoCard from "@/components/marketplace/InfoCard";
import FeatureHighlights from "@/components/marketplace/FeatureHighlights";
import InteractiveListingDemo from "@/components/marketplace/InteractiveListingDemo";
import FeeBurnBadge from "@/components/marketplace/FeeBurnBadge";

export default function MarketplaceComingSoonPage() {
  const { userData } = useAuth();
  const { isConnected, connectWallet, disconnectWallet, account, isConnecting } = useWeb3();
  const [showMobileActions, setShowMobileActions] = useState(false);

  const mobileMenuItems = useMemo(
    () => [
      { label: "Home", href: "/", icon: "/dashboard.png" },
      { label: "Wallet", href: "/wallet", icon: "/wallet.png" },
      { label: "My NFT", href: "/my-nft", icon: "/flex-model.png" },
      { label: "Staking", href: "/staking", icon: "/staking.png" },
      { label: "Marketplace", href: "/marketplace", icon: "/marketplace.png" },
      { label: "Game", href: "/game", icon: "/game.png" },
      { label: "Merches", href: "/merches", icon: "/merches.png" },
    ],
    []
  );

  return (
    <main className="min-h-screen bg-[var(--background)]">
      {/* Mobile Header - mirrors other pages */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 relative z-20">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10">
            <Image
              src="/realmkin-logo.png"
              alt="Realmkin Logo"
              width={40}
              height={40}
              className="w-full h-full object-cover"
              priority
            />
          </div>
          <h1 className="text-sm font-bold uppercase tracking-wider text-[#DA9C2F]">
            THE REALMKIN
          </h1>
        </div>
        <button
          onClick={() => setShowMobileActions((v) => !v)}
          className="flex items-center gap-2 bg-[#0B0B09] px-3 py-2 rounded-lg border border-[#404040] text-[#DA9C2F] font-medium text-sm hover:bg-[#1a1a1a] transition-colors"
          aria-expanded={showMobileActions}
          aria-haspopup="true"
        >
          <span className={`text-xs transition-transform ${showMobileActions ? 'rotate-180' : ''}`}>⋯</span>
        </button>
      </header>

      <HeroComingSoon />
      <FeatureHighlights />
      <InteractiveListingDemo />
      <FeeBurnBadge />
      <InfoCard />

      {/* Mobile Menu Overlay */}
      <MobileMenuOverlay
        isOpen={showMobileActions}
        onClose={() => setShowMobileActions(false)}
        menuItems={mobileMenuItems}
        isAdmin={userData?.admin}
        isConnected={isConnected}
        account={account}
        onConnectWallet={connectWallet}
        onDisconnectWallet={disconnectWallet}
      />
    </main>
  );
}
