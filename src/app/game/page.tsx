"use client";

import { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import withAuthGuard from "@/components/withAuthGuard";
import MobileMenuOverlay from "@/components/MobileMenuOverlay";
import SocialLinks from "@/components/SocialLinks";
import GameCard, { type GameCardProps } from "@/components/GameCard";
import Leaderboard from "@/components/leaderboard/Leaderboard";
import { useAuth } from "@/contexts/AuthContext";
import { useWeb3 } from "@/contexts/Web3Context";
import { useIsMobile } from "@/hooks/useIsMobile";
import { LeaderboardCategory, LeaderboardTabConfig, LeaderboardEntry } from "@/types/leaderboard";
import { leaderboardService } from "@/services/leaderboardService";

const EtherealParticles = dynamic(
  () => import("@/components/MagicalAnimations").then((mod) => mod.EtherealParticles),
  { ssr: false }
);

const ConstellationBackground = dynamic(
  () => import("@/components/MagicalAnimations").then((mod) => mod.ConstellationBackground),
  { ssr: false }
);

type GameDefinition = {
  title: string;
  description: string;
  imageSrc?: string | null;
  eta?: string;
  href?: string;
  status?: GameCardProps["status"];
};

function GamePage() {
  const { userData, user } = useAuth();
  const { connectWallet, disconnectWallet, account, isConnected, isConnecting } = useWeb3();
  const isMobile = useIsMobile();
  const [showMobileActions, setShowMobileActions] = useState(false);
  const [activeLeaderboardTab, setActiveLeaderboardTab] = useState<LeaderboardCategory>("totalScore");
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(true);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);

  const games = useMemo<GameDefinition[]>(
    () => [
      {
        title: "Wordle",
        description: "Daily cipher challenge harnessing the power of the Void.",
        imageSrc: "/wordle.png",
        eta: "Temporarily Offline",
        status: "coming-soon",
      },
      {
        title: "Trait Crush",
        description: "Align traits and trigger cascading combos for MKIN rewards.",
        imageSrc: "/trait-crush.png",
        href: "/game/trait-crush",
        status: "new",
      },
      {
        title: "2048",
        description: "Merge arcane tiles to awaken legendary Realmkin relics.",
        imageSrc: "/2048.png",
        href: "/game/2048",
        status: "new",
      },
      {
        title: "Word Blast",
        description: "Fast-paced spellcasting with letters—charge, blast, conquer.",
        imageSrc: "/block-blast.png",
        eta: "Phase III",
      },
      {
        title: "Checkers",
        description: "Classic strategy reimagined with celestial battlefields.",
        imageSrc: "/checkers.png",
        eta: "Phase IV",
      },
      {
        title: "Poker",
        description: "Multiverse poker tables where legends wager their fate.",
        imageSrc: "/poker.png",
        eta: "Phase IV",
      },
    ],
    []
  );

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

  // Leaderboard configuration
  const leaderboardTabs: LeaderboardTabConfig[] = [
    {
      key: "totalScore",
      label: "Total Score",
      icon: "📊",
      description: "Combined points from all games",
    },
    {
      key: "streak",
      label: "Streak",
      icon: "🔥",
      description: "Consecutive days played",
      valueSuffix: " days",
    },
  ];

  // Load leaderboard data
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const loadLeaderboard = async () => {
      setIsLoadingLeaderboard(true);
      setLeaderboardError(null);

      try {
        // Initialize leaderboard (check for monthly reset)
        await leaderboardService.checkAndPerformMonthlyReset();

        // Subscribe to real-time updates
        unsubscribe = leaderboardService.subscribeToLeaderboard(
          activeLeaderboardTab as "totalScore" | "streak",
          100,
          (entries) => {
            setLeaderboardEntries(entries);
            setIsLoadingLeaderboard(false);
          }
        );
      } catch (error) {
        console.error("Failed to load leaderboard:", error);
        setLeaderboardError("Failed to load leaderboard data");
        setIsLoadingLeaderboard(false);

        // Fallback to mock data on error
        setLeaderboardEntries([
          {
            userId: "mock1",
            username: "CipherMaster",
            rank: 1,
            value: 2450,
            gamesPlayed: 12,
            breakdown: { wordle: 850, "2048": 1600 },
          },
          {
            userId: "mock2",
            username: "VoidWalker",
            rank: 2,
            value: 2180,
            gamesPlayed: 15,
            breakdown: { wordle: 920, "2048": 1260 },
          },
        ]);
      }
    };

    loadLeaderboard();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [activeLeaderboardTab]);

  // Calculate summary stats
  const leaderboardSummary = useMemo(() => {
    const totalPlayers = leaderboardEntries.length;
    const totalGames = leaderboardEntries.reduce((sum, entry) => sum + (entry.gamesPlayed || 0), 0);
    const userEntry = leaderboardEntries.find(entry => entry.userId === user?.uid);

    return {
      totalPlayers,
      totalGames,
      userRank: userEntry?.rank || undefined,
      userValue: userEntry?.value || 0,
      userValueLabel: userEntry?.valueLabel,
    };
  }, [leaderboardEntries, user?.uid]);

  // Generate metadata
  const leaderboardMetadata = useMemo(() => {
    const now = new Date();
    const currentMonth = now.toLocaleString('default', { month: 'long', year: 'numeric' });
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const daysUntilReset = Math.ceil((nextMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      periodLabel: currentMonth,
      periodRange: `${currentMonth.split(' ')[0]} 1 - ${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`,
      countdownLabel: `Resets in ${daysUntilReset} days`,
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050302]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(244,199,82,0.18),rgba(5,3,2,0.96))]" aria-hidden="true" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#050302]/30 via-transparent to-[#050302]" aria-hidden="true" />
      {!isMobile && <EtherealParticles />}
      {!isMobile && <ConstellationBackground />}


      <header className="lg:hidden flex flex-row justify-between items-center gap-3 p-4 md:p-6 animate-fade-in relative z-20">
        <div className="flex items-center space-x-3">
          <div className="w-14 h-14 animate-float">
            <Image
              src="/realmkin-logo.png"
              alt="Realmkin Logo"
              width={48}
              height={48}
              className="w-full h-full object-cover"
              priority
            />
          </div>
          <h1 className="font-bold text-lg uppercase tracking-wider gold-gradient-text">
            THE REALMKIN
          </h1>
        </div>

        {/* Mobile menu button - always visible */}
        <div className="w-auto flex-shrink-0">
          <button
            onClick={() => setShowMobileActions((v) => !v)}
            className="flex items-center gap-2 bg-[#0B0B09] px-3 py-2 rounded-lg border border-[#404040] text-[#DA9C2F] font-medium text-sm hover:bg-[#1a1a1a] transition-colors"
            aria-expanded={showMobileActions}
            aria-haspopup="true"
          >
            <span className={`text-xs transition-transform ${showMobileActions ? 'rotate-180' : ''}`}>⋯</span>
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-10 px-5 pb-16 pt-10 lg:px-10">
        <section className="relative overflow-hidden rounded-3xl border border-[#DA9C2F]/25 bg-[#0B0B09]/80 px-6 py-8 shadow-[0_35px_80px_rgba(0,0,0,0.55)] backdrop-blur-sm md:px-10 md:py-12">
          <div className="absolute -right-16 top-1/2 hidden h-80 w-80 -translate-y-1/2 rounded-full bg-[#DA9C2F]/10 blur-3xl lg:block" aria-hidden="true" />
          <div className="absolute -top-24 left-6 h-48 w-48 rounded-full border border-[#DA9C2F]/30 bg-[#DA9C2F]/5 blur-2xl" aria-hidden="true" />

          <div className="flex flex-col items-start gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.5em] text-[#DA9C2F]/70">Arcade Nexus</p>
              <h2 className="text-2xl font-bold uppercase tracking-[0.28em] text-[#F4C752] md:text-4xl">
                Unlock the Realmkin Arcade
              </h2>
              <p className="text-sm text-white/70 md:text-base">
                Claim your seat at the nexus of play-to-earn adventures. Every game listed below is forging in the Void and will arrive with exclusive MKIN rewards.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-[#DA9C2F]/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-[#DA9C2F]">
                  Coming Soon
                </span>
                <span className="rounded-full bg-[#DA9C2F]/10 px-4 py-2 text-xs uppercase tracking-[0.32em] text-[#F4C752]/70">
                  6 Game Worlds
                </span>
              </div>
            </div>

            <div className="relative flex w-full max-w-xs items-center justify-center self-stretch rounded-3xl border border-[#DA9C2F]/40 bg-[#050302]/60 p-6 shadow-inner shadow-[#DA9C2F]/20 lg:max-w-sm">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#DA9C2F]/15 via-transparent to-transparent" aria-hidden="true" />
              <Image
                src="/realmkin.png"
                alt="Realmkin emblem"
                width={260}
                height={260}
                className="relative z-10 h-auto w-40 opacity-80 drop-shadow-[0_0_40px_rgba(218,156,47,0.45)] lg:w-52"
                priority
              />
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 text-center text-[10px] uppercase tracking-[0.32em] text-white/55 md:text-xs">
            <div className="rounded-2xl border border-[#DA9C2F]/20 bg-black/40 px-4 py-3">
              <p className="text-[#F4C752]">6</p>
              <p>Playable Realms</p>
            </div>
            <div className="rounded-2xl border border-[#DA9C2F]/20 bg-black/40 px-4 py-3">
              <p className="text-[#F4C752]">MKIN</p>
              <p>Reward Ecosystem</p>
            </div>
            {/* <div className="rounded-2xl border border-[#DA9C2F]/20 bg-black/40 px-4 py-3">
              <p className="text-[#F4C752]">Q1-Q4</p>
              <p>Rollout Timeline</p>
            </div> */}
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.42em] text-[#DA9C2F]/70">Game Library</p>
              <h3 className="text-xl font-semibold uppercase tracking-[0.24em] text-[#F4C752] md:text-2xl">
                Command Your Next Challenge
              </h3>
            </div>
            {/* <button
              className="inline-flex items-center justify-center rounded-full border border-[#DA9C2F]/40 bg-[#0B0B09] px-5 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-[#DA9C2F] opacity-70"
              disabled
            >
              Notifications Coming Soon
            </button> */}
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5">
            {games.map((game) => (
              <GameCard
                key={game.title}
                title={game.title}
                description={game.description}
                imageSrc={game.imageSrc ?? undefined}
                // eta={game.eta}
                href={game.href}
                status={game.status}
              />
            ))}
          </div>
        </section>

        {/* Leaderboard Section */}
        <section>
          <Leaderboard
            title="Monthly Champions"
            subtitle="Compete across all realms for ultimate glory"
            highlightUserId={user?.uid}
            entries={leaderboardEntries}
            tabs={leaderboardTabs}
            activeTab={activeLeaderboardTab}
            onTabChange={setActiveLeaderboardTab}
            metadata={leaderboardMetadata}
            summary={leaderboardSummary}
            isLoading={isLoadingLeaderboard}
            emptyState={
              leaderboardError ? (
                <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-red-500/30 bg-red-900/20 px-6 py-10 text-center">
                  <p className="text-sm font-semibold uppercase tracking-[0.28em] text-red-400">
                    Connection Error
                  </p>
                  <p className="text-xs leading-relaxed text-white/60">
                    {leaderboardError}. Showing fallback data.
                  </p>
                </div>
              ) : undefined
            }
          />
        </section>

        <section className="flex flex-col items-center gap-3 text-center">
          <p className="text-xs uppercase tracking-[0.32em] text-white/55">Join our community</p>
          <SocialLinks variant="light" className="flex-row justify-center gap-4" />
        </section>
      </main>

      <MobileMenuOverlay
        isOpen={showMobileActions}
        onClose={() => setShowMobileActions(false)}
        menuItems={mobileMenuItems}
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

export default GamePage;
