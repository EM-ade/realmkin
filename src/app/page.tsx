"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useAuth } from "@/contexts/AuthContext";
import { useWeb3 } from "@/contexts/Web3Context";
import { useNFT } from "@/contexts/NFTContext";
import SocialLinks from "@/components/SocialLinks";
import QuickAccessCard from "@/components/QuickAccessCard";
import DesktopNavigation from "@/components/DesktopNavigation";
import MobileMenuOverlay from "@/components/MobileMenuOverlay";
import { useIsMobile } from "@/hooks/useIsMobile";
import { getAuth } from "firebase/auth";
import { rewardsService, UserRewards } from "@/services/rewardsService";

// Lazy load background effects for better performance
const EtherealParticles = dynamic(
  () => import("@/components/MagicalAnimations").then(mod => mod.EtherealParticles),
  { ssr: false }
);
const ConstellationBackground = dynamic(
  () => import("@/components/MagicalAnimations").then(mod => mod.ConstellationBackground),
  { ssr: false }
);

// Lazy load carousel
const NFTCarousel = dynamic(() => import("@/components/NFTCarousel"), {
  ssr: false,
});

export default function Home() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const { connectWallet, account, isConnected, isConnecting } = useWeb3();
  const { nfts } = useNFT();
  const isMobile = useIsMobile();

  const [showMobileActions, setShowMobileActions] = useState(false);
  const [unifiedBalance, setUnifiedBalance] = useState<number | null>(null);
  const [discordLinked, setDiscordLinked] = useState<boolean>(false);
  const [discordConnecting, setDiscordConnecting] = useState(false);
  const [discordUnlinking, setDiscordUnlinking] = useState(false);
  const gatekeeperBase = process.env.NEXT_PUBLIC_GATEKEEPER_BASE || "https://gatekeeper-bot.fly.dev";

  // Fetch unified balance (same as wallet page)
  useEffect(() => {
    async function fetchUnifiedBalance() {
      if (user?.uid) {
        try {
          const response = await fetch(`${gatekeeperBase}/api/balance/${user.uid}`);
          if (response.ok) {
            const data = await response.json();
            setUnifiedBalance(data.balance || 0);
          }
        } catch (error) {
          console.error("Error fetching balance:", error);
          setUnifiedBalance(null);
        }
      } else {
        setUnifiedBalance(null);
      }
    }
    fetchUnifiedBalance();
  }, [user?.uid, gatekeeperBase]);

  // Check Discord link status
  useEffect(() => {
    async function checkDiscordLink() {
      if (user?.uid) {
        try {
          const response = await fetch(`${gatekeeperBase}/api/discord/status/${user.uid}`);
          if (response.ok) {
            const data = await response.json();
            setDiscordLinked(data.linked || false);
          }
        } catch (error) {
          console.error("Error checking Discord status:", error);
        }
      }
    }
    checkDiscordLink();
  }, [user?.uid, gatekeeperBase]);

  // Discord handlers
  const handleDiscordConnect = useCallback(() => {
    if (!user?.uid) return;
    setDiscordConnecting(true);
    const authUrl = `${gatekeeperBase}/api/discord/auth?userId=${user.uid}`;
    window.location.href = authUrl;
  }, [user?.uid, gatekeeperBase]);

  const handleDiscordDisconnect = useCallback(async () => {
    if (!user?.uid) return;
    setDiscordUnlinking(true);
    try {
      const response = await fetch(`${gatekeeperBase}/api/discord/unlink/${user.uid}`, {
        method: "POST",
      });
      if (response.ok) {
        setDiscordLinked(false);
      }
    } catch (error) {
      console.error("Error unlinking Discord:", error);
    } finally {
      setDiscordUnlinking(false);
    }
  }, [user?.uid, gatekeeperBase]);

  // Calculate stats
  const nftCount = nfts?.length || 0;
  const balanceDisplay = unifiedBalance === null ? "…" : (unifiedBalance ?? 0).toFixed(2);

  // Mobile menu items
  const mobileMenuItems = useMemo(
    () => [
      { label: "Home", href: "/", icon: "/dashboard.png" },
      { label: "Wallet", href: "/wallet", icon: "/wallet.png" },
      { label: "Staking", href: "/staking", icon: "/staking.png" },
      { label: "Game", href: "/game", icon: "/game.png" },
      { label: "My NFT", href: "/my-nft", icon: "/flex-model.png" },
      { label: "Merches", href: "/merches", icon: "/merches.png" },
    ],
    []
  );

  return (
    <div className="min-h-screen bg-[#050302] relative overflow-hidden">
      {/* Background Effects - Desktop only */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(244,199,82,0.15),rgba(5,3,2,0.95))]" aria-hidden="true" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#050302]/30 via-transparent to-[#050302]" aria-hidden="true" />
      {!isMobile && <EtherealParticles />}
      {!isMobile && <ConstellationBackground />}

      {/* Desktop Navigation */}
      <DesktopNavigation />

      {/* Mobile Header - Compact */}
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

      {/* Main Content */}
      <main className="relative z-10 px-4 lg:px-10 pb-6 max-w-7xl mx-auto">
        {/* Hero Section - Compact */}
        <section className="text-center py-8 md:py-12 lg:py-16">
          <h2 className="text-2xl lg:text-4xl font-bold uppercase tracking-wider text-[#DA9C2F] mb-2">
            Welcome to The Void
          </h2>
          <p className="text-white/70 text-sm lg:text-base">
            Your gateway to adventure • Collect • Battle • Earn
          </p>
        </section>

        {/* Primary CTA */}
        <section className="mb-6">
          {!isConnected ? (
            <button
              onClick={connectWallet}
              disabled={isConnecting}
              className="w-full bg-[#DA9C2F] text-black font-bold py-4 rounded-xl uppercase tracking-wider hover:bg-[#f0b94a] transition-all duration-300 shadow-lg shadow-[#DA9C2F]/30"
            >
              {isConnecting ? "Connecting..." : "🔗 Connect Wallet"}
            </button>
          ) : (
            <button
              onClick={() => router.push('/wallet')}
              className="w-full bg-[#DA9C2F] text-black font-bold py-4 rounded-xl uppercase tracking-wider hover:bg-[#f0b94a] transition-all duration-300 shadow-lg shadow-[#DA9C2F]/30"
            >
              ⚡ Enter Dashboard
            </button>
          )}
        </section>

        {/* Quick Access Grid */}
        <section className="mb-6">
          <h3 className="text-[#DA9C2F] text-sm font-bold uppercase tracking-wider mb-3">
            Quick Access
          </h3>
          <div className="grid grid-cols-3 gap-2 lg:gap-4">
            {/* Row 1 */}
            <QuickAccessCard
              icon="🎭"
              iconSrc="/flex-model.png"
              label="My NFTs"
              stat={`${nftCount}`}
              href="/my-nft"
            />
            <QuickAccessCard
              icon="💰"
              iconSrc="/wallet.png"
              label="Wallet"
              stat={`${balanceDisplay} $`}
              href="/wallet"
            />
            <QuickAccessCard
              icon="⚔️"
              iconSrc="/game.png"
              label="Game"
              stat="Soon"
              href="/game"
              disabled
            />

            {/* Row 2 */}
            <QuickAccessCard
              icon="📊"
              iconSrc="/staking.png"
              label="Staking"
              stat="Soon"
              href="/staking"
              disabled
            />
            <QuickAccessCard
              icon="🛍️"
              iconSrc="/merches.png"
              label="Merch"
              stat="Soon"
              href="/merches"
              disabled
            />
            {/* Empty div for grid alignment */}
            <div className="h-[100px]"></div>
          </div>
        </section>

        {/* Featured NFT Carousel */}
        <section className="mb-6">
          <h3 className="text-[#DA9C2F] text-sm font-bold uppercase tracking-wider mb-3">
            Featured NFTs
          </h3>
          <div className="h-[350px] rounded-xl overflow-hidden border border-[#DA9C2F]/30">
            <NFTCarousel />
          </div>
        </section>

        {/* Social Links */}
        <section className="text-center flex flex-col items-center">
          <div className="flex flex-row items-center justify-between w-full max-w-md mb-2">
          <h4 className="text-white/50 text-xs uppercase tracking-wider">
            Join Our Community
          </h4>
          </div>
          <SocialLinks variant="light" className="flex-row justify-between w-full max-w-md" />
        </section>
      </main>

      {/* Mobile Menu Overlay */}
      <MobileMenuOverlay
        isOpen={showMobileActions}
        onClose={() => setShowMobileActions(false)}
        menuItems={mobileMenuItems}
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
        onDisconnectWallet={() => {}}
      />
    </div>
  );
}
