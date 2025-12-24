"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useAuth } from "@/contexts/AuthContext";
import withAuthGuard from "@/components/withAuthGuard";
import { useWeb3 } from "@/contexts/Web3Context";
import { useNFT } from "@/contexts/NFTContext";
import { useOnboarding } from "@/contexts/OnboardingContext";
import SocialLinks from "@/components/SocialLinks";
import QuickAccessCard from "@/components/QuickAccessCard";
import FeatureShowcase from "@/components/FeatureShowcase";
import { useIsMobile } from "@/hooks/useIsMobile";
import { rewardsService, UserRewards } from "@/services/rewardsService";
// MobileMenu and NAV_ITEMS removed as they are handled globally now

// Lazy load background effects for better performance
const EtherealParticles = dynamic(
  () =>
    import("@/components/MagicalAnimations").then(
      (mod) => mod.EtherealParticles
    ),
  { ssr: false }
);
const ConstellationBackground = dynamic(
  () =>
    import("@/components/MagicalAnimations").then(
      (mod) => mod.ConstellationBackground
    ),
  { ssr: false }
);

// Lazy load carousel
const NFTCarousel = dynamic(() => import("@/components/NFTCarousel"), {
  ssr: false,
});

function Home() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const {
    connectWallet,
    disconnectWallet,
    account,
    isConnected,
    isConnecting,
  } = useWeb3();
  const { nfts } = useNFT();
  const { setIsNewUser, startOnboarding, setStartingStep } = useOnboarding();
  const isMobile = useIsMobile();

  const [showMobileActions, setShowMobileActions] = useState(false);
  const [userRewards, setUserRewards] = useState<UserRewards | null>(null);
  const [discordLinked, setDiscordLinked] = useState<boolean>(false);
  const [discordConnecting, setDiscordConnecting] = useState(false);
  const [discordUnlinking, setDiscordUnlinking] = useState(false);
  const gatekeeperBase =
    process.env.NEXT_PUBLIC_GATEKEEPER_BASE || "https://gatekeeper-bmvu.onrender.com";

  // Handle wallet connection with onboarding fallback
  const handleConnectWallet = useCallback(async () => {
    // Check if user is new (no username set)
    // userData is fetched from Firestore, so this is the source of truth
    if (userData && !userData.username) {
      // Trigger onboarding for new users via context (no localStorage)
      setIsNewUser(true);
      setStartingStep("username"); // Skip wallet step since they're already connected
      startOnboarding();
      router.push("/onboarding");
      return;
    }

    // Otherwise proceed with normal wallet connection
    await connectWallet();
  }, [
    userData,
    connectWallet,
    router,
    setIsNewUser,
    setStartingStep,
    startOnboarding,
  ]);

  // Fetch user rewards from Firebase
  useEffect(() => {
    async function fetchUserRewards() {
      if (!user?.uid) {
        setUserRewards(null);
        return;
      }
      try {
        const rewards = await rewardsService.getUserRewards(user.uid);
        setUserRewards(rewards);
      } catch (error) {
        console.error("Error fetching user rewards:", error);
        setUserRewards(null);
      }
    }
    fetchUserRewards();
  }, [user?.uid]);

  // Check Discord link status
  useEffect(() => {
    async function checkDiscordLink() {
      if (user?.uid) {
        try {
          const response = await fetch(
            `${gatekeeperBase}/api/discord/status/${user.uid}`
          );
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
    // Open OAuth flow in a new tab to avoid navigating away from the app
    const win = window.open(
      "/api/discord/login",
      "_blank",
      "noopener,noreferrer"
    );
    if (!win) {
      // Fallback if pop-up blocked
      window.location.href = "/api/discord/login";
    }
  }, [user?.uid]);

  const handleDiscordDisconnect = useCallback(async () => {
    if (!user?.uid) return;
    setDiscordUnlinking(true);
    try {
      // Acquire Firebase ID token for authenticated DELETE call
      const token = await user.getIdToken();
      const response = await fetch(`${gatekeeperBase}/api/link/discord`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`Failed to disconnect (${response.status}) ${text}`);
      }
      setDiscordLinked(false);
    } catch (error) {
      console.error("Error unlinking Discord:", error);
    } finally {
      setDiscordUnlinking(false);
    }
  }, [user, gatekeeperBase]);

  // When wallet is disconnected, keep Discord linked
  const handleWalletDisconnect = useCallback(async () => {
    try {
      await disconnectWallet();
      // Don't unlink Discord - keep it linked for reconnection
    } catch (error) {
      console.error("Wallet disconnect error:", error);
    }
  }, [disconnectWallet]);

  // Calculate stats
  const nftCount = nfts?.length || 0;
  const balanceDisplay = userRewards
    ? userRewards.totalRealmkin.toFixed(2)
    : "0.00";

  // Mobile menu items

  return (
    <div className="min-h-screen bg-[#050302] relative overflow-hidden">
      {/* Background Effects - Desktop only */}
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(244,199,82,0.15),rgba(5,3,2,0.95))]"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-gradient-to-b from-[#050302]/30 via-transparent to-[#050302]"
        aria-hidden="true"
      />
      {!isMobile && <EtherealParticles />}
      {!isMobile && <ConstellationBackground />}

      {/* Mobile Header is now global in layout.tsx */}

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
              onClick={handleConnectWallet}
              disabled={isConnecting}
              className="w-full bg-[#DA9C2F] text-black font-bold py-4 rounded-xl uppercase tracking-wider hover:bg-[#f0b94a] transition-all duration-300 shadow-lg shadow-[#DA9C2F]/30"
            >
              {isConnecting ? "Connecting..." : "🔗 Connect Wallet"}
            </button>
          ) : (
            <button
              onClick={() => router.push("/wallet")}
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
              stat="2 Live"
              href="/game"
              isNew
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

        {/* Feature Showcase */}
        <FeatureShowcase />

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
        <section className="text-center flex flex-col items-center mb-20 lg:mb-6">
          <div className="flex flex-row items-center justify-between w-full max-w-md mb-2">
            <h4 className="text-white/50 text-xs uppercase tracking-wider">
              Join Our Community
            </h4>
          </div>
          <SocialLinks
            variant="light"
            className="flex-row justify-between w-full max-w-md"
          />
        </section>
      </main>
    </div>
  );
}

export default Home;
