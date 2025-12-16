"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import withAuthGuard from "@/components/withAuthGuard";
import MobileMenuOverlay from "@/components/MobileMenuOverlay";
import SocialLinks from "@/components/SocialLinks";
import { useAuth } from "@/contexts/AuthContext";
import { useWeb3 } from "@/contexts/Web3Context";
import { useIsMobile } from "@/hooks/useIsMobile";
import GameTraitCrushClient from "./GameTraitCrushClient";

const EtherealParticles = dynamic(
  () => import("@/components/MagicalAnimations").then((mod) => mod.EtherealParticles),
  { ssr: false }
);

const ConstellationBackground = dynamic(
  () => import("@/components/MagicalAnimations").then((mod) => mod.ConstellationBackground),
  { ssr: false }
);

function TraitCrushPage() {
  const { userData } = useAuth();
  const { connectWallet, disconnectWallet, account, isConnected, isConnecting } = useWeb3();
  const isMobile = useIsMobile();
  const [showMobileActions, setShowMobileActions] = useState(false);

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
    <div className="relative min-h-screen overflow-hidden bg-[#050302]">
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(244,199,82,0.16),rgba(5,3,2,0.96))]"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-gradient-to-b from-[#050302]/30 via-transparent to-[#050302]"
        aria-hidden="true"
      />
      {!isMobile && <EtherealParticles />}
      {!isMobile && <ConstellationBackground />}

      <header className="relative z-20 flex items-center justify-between gap-3 p-4 md:p-6 lg:hidden">
        <div className="flex items-center space-x-3">
          <div className="h-14 w-14 animate-float">
            <Image
              src="/realmkin-logo.png"
              alt="Realmkin Logo"
              width={56}
              height={56}
              className="h-full w-full object-cover"
              priority
            />
          </div>
          <h1 className="gold-gradient-text text-lg font-bold uppercase tracking-[0.38em]">
            THE REALMKIN
          </h1>
        </div>

        <button
          onClick={() => setShowMobileActions((value) => !value)}
          className="flex items-center gap-2 rounded-lg border border-[#404040] bg-[#0B0B09] px-3 py-2 text-sm font-medium text-[#DA9C2F] transition hover:bg-[#1a1a1a]"
          aria-expanded={showMobileActions}
          aria-haspopup="true"
        >
          <span className={`text-xs transition-transform ${showMobileActions ? "rotate-180" : ""}`}>⋯</span>
        </button>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 pb-16 pt-6 lg:gap-8 lg:px-10 lg:pt-8">
        {/* <section className="relative overflow-hidden rounded-3xl border border-[#DA9C2F]/25 bg-[#0B0B09]/80 px-6 py-6 shadow-[0_35px_80px_rgba(0,0,0,0.55)] backdrop-blur-sm md:px-8 md:py-8">
          <div
            className="absolute -right-16 top-1/2 hidden h-72 w-72 -translate-y-1/2 rounded-full bg-[#DA9C2F]/15 blur-3xl lg:block"
            aria-hidden="true"
          />
          <div
            className="absolute -top-24 left-6 h-48 w-48 rounded-full border border-[#DA9C2F]/30 bg-[#DA9C2F]/5 blur-2xl"
            aria-hidden="true"
          />

          <div className="flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl space-y-3">
              <div className="flex items-center gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.45em] text-[#DA9C2F]/70">
                  Arcade Nexus / Feature Release
                </p>
                <span className="rounded-full bg-[#DA9C2F]/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.38em] text-[#F4C752]">
                  New Arena
                </span>
              </div>
              <h2 className="text-2xl font-bold uppercase tracking-[0.28em] text-[#F4C752] md:text-3xl">
                Trait Crush Ritual Grid
              </h2>
              <p className="text-sm text-white/70 md:text-base">
                Rally matching traits to shatter arcane sigils and trigger cascading combos. Select your
                realm difficulty, weave precise swaps, and cascade your way up the unified leaderboard.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-[#DA9C2F]/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-[#DA9C2F]">
                  Combo-Focused
                </span>
                <span className="rounded-full bg-[#DA9C2F]/10 px-4 py-2 text-xs uppercase tracking-[0.32em] text-[#F4C752]/70">
                  Leaderboard Linked
                </span>
              </div>
            </div>

            <div className="relative flex w-full max-w-xs items-center justify-center self-stretch rounded-3xl border border-[#DA9C2F]/40 bg-[#050302]/60 p-4 shadow-inner shadow-[#DA9C2F]/20 lg:max-w-xs">
              <div
                className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#DA9C2F]/18 via-transparent to-transparent"
                aria-hidden="true"
              />
              <Image
                src="/trait-crush.png"
                alt="Trait Crush cluster"
                width={200}
                height={200}
                className="relative z-10 h-auto w-32 opacity-85 drop-shadow-[0_0_35px_rgba(218,156,47,0.45)] lg:w-40"
                priority
              />
            </div>
          </div>
        </section> */}

        <GameTraitCrushClient />

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

export default TraitCrushPage;
