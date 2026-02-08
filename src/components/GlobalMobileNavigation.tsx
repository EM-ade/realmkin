"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { useWeb3 } from "@/contexts/Web3Context";
import { useDiscord } from "@/contexts/DiscordContext";
import { NAV_ITEMS } from "@/config/navigation";
import MobileMenuOverlay from "@/components/MobileMenuOverlay";
import DynamicIsland from "@/components/DynamicIsland";

export default function GlobalMobileNavigation() {
  const [showMobileActions, setShowMobileActions] = useState(false);

  // Connect hooks here to pass to the overlay (centralized management)
  const { user, userData } = useAuth();
  const {
    isConnected,
    account,
    isConnecting,
    connectWallet,
    disconnectWallet,
  } = useWeb3();
  const {
    discordLinked,
    discordConnecting,
    discordUnlinking,
    connectDiscord,
    disconnectDiscord,
  } = useDiscord();
  const gatekeeperBase =
    process.env.NEXT_PUBLIC_GATEKEEPER_BASE || "https://gatekeeper-bmvu.onrender.com";

  const handleDiscordConnect = () => {
    if (user) connectDiscord(user);
    else window.location.href = "/api/discord/login";
  };

  const handleDiscordDisconnect = async () => {
    if (user) await disconnectDiscord(user);
  };

  return (
    <>
      <header className="lg:hidden flex items-center justify-between px-4 py-3 relative z-40 bg-[#050302]/80 backdrop-blur-md border-b border-[#DA9C2F]/10">
        {/* Left: Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 relative">
            <Image
              src="/realmkin-logo.png"
              alt="Realmkin"
              fill
              className="object-contain"
              priority
            />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#DA9C2F] hidden sm:block">
            Realmkin
          </span>
        </Link>

        {/* Center: Dynamic Island (Mobile Mode) */}
        <div className="absolute inset-0 flex items-start justify-center pt-3 pointer-events-none">
          <DynamicIsland mobile={true} />
        </div>

        {/* Right: Hamburger */}
        <button
          onClick={() => setShowMobileActions(true)}
          className="flex items-center justify-center w-8 h-8 rounded-lg border border-[#404040] text-[#DA9C2F] hover:bg-[#1a1a1a] transition-colors"
          aria-label="Open menu"
        >
          <span className="text-lg">☰</span>
        </button>
      </header>

      {/* Reused Mobile Menu Overlay */}
      <MobileMenuOverlay
        isOpen={showMobileActions}
        onClose={() => setShowMobileActions(false)}
        menuItems={NAV_ITEMS}
        isAdmin={userData?.admin}
        isConnected={isConnected}
        account={account}
        isConnecting={isConnecting}
        discordLinked={discordLinked}
        discordConnecting={discordConnecting}
        discordUnlinking={discordUnlinking}
        onDiscordConnect={handleDiscordConnect}
        onDiscordDisconnect={handleDiscordDisconnect}
        onConnectWallet={connectWallet}
        onDisconnectWallet={disconnectWallet}
      />
    </>
  );
}
