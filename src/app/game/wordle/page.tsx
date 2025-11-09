"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import DesktopNavigation from "@/components/DesktopNavigation";
import withAuthGuard from "@/components/withAuthGuard";
import MobileMenuOverlay from "@/components/MobileMenuOverlay";
import SocialLinks from "@/components/SocialLinks";
import { useAuth } from "@/contexts/AuthContext";
import { useWeb3 } from "@/contexts/Web3Context";
import { useIsMobile } from "@/hooks/useIsMobile";
import GameWordleClient from "./GameWordleClient";

const EtherealParticles = dynamic(
  () => import("@/components/MagicalAnimations").then((mod) => mod.EtherealParticles),
  { ssr: false }
);

const ConstellationBackground = dynamic(
  () => import("@/components/MagicalAnimations").then((mod) => mod.ConstellationBackground),
  { ssr: false }
);

function RealmkinWordlePage() {
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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(244,199,82,0.18),rgba(5,3,2,0.96))]" aria-hidden="true" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#050302]/30 via-transparent to-[#050302]" aria-hidden="true" />
      {!isMobile && <EtherealParticles />}
      {!isMobile && <ConstellationBackground />}

      <DesktopNavigation />

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

        <div className="w-auto flex-shrink-0">
          <button
            onClick={() => setShowMobileActions((v) => !v)}
            className="flex items-center gap-2 bg-[#0B0B09] px-3 py-2 rounded-lg border border-[#404040] text-[#DA9C2F] font-medium text-sm hover:bg-[#1a1a1a] transition-colors"
            aria-expanded={showMobileActions}
            aria-haspopup="true"
          >
            <span className={`text-xs transition-transform ${showMobileActions ? "rotate-180" : ""}`}>⋯</span>
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-12 px-5 pb-16 pt-10 lg:px-10">
        <section className="relative overflow-hidden rounded-3xl border border-[#DA9C2F]/25 bg-[#0B0B09]/80 px-6 py-8 shadow-[0_35px_80px_rgba(0,0,0,0.55)] backdrop-blur-sm md:px-10 md:py-12">
          <div className="absolute -right-20 top-1/2 hidden h-80 w-80 -translate-y-1/2 rounded-full bg-[#DA9C2F]/15 blur-3xl lg:block" aria-hidden="true" />
          <div className="absolute -top-24 left-6 h-48 w-48 rounded-full border border-[#DA9C2F]/30 bg-[#DA9C2F]/5 blur-2xl" aria-hidden="true" />

          <div className="flex flex-col items-start gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.5em] text-[#DA9C2F]/70">Arcade Nexus / Direct Access</p>
              <h2 className="text-2xl font-bold uppercase tracking-[0.28em] text-[#F4C752] md:text-4xl">Wordle of the Void</h2>
              <p className="text-sm text-white/70 md:text-base">
                You&apos;ve stepped into the hidden lexicon. These puzzles are tuned for early explorers while we refine rewards and lore integration. Choose your difficulty tier and decode the Realmkin ciphers.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-[#DA9C2F]/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-[#DA9C2F]">
                  Direct Access Only
                </span>
                <span className="rounded-full bg-[#DA9C2F]/10 px-4 py-2 text-xs uppercase tracking-[0.32em] text-[#F4C752]/70">
                  Rewards Coming Soon
                </span>
              </div>
            </div>

            <div className="relative flex w-full max-w-xs items-center justify-center self-stretch rounded-3xl border border-[#DA9C2F]/40 bg-[#050302]/60 p-6 shadow-inner shadow-[#DA9C2F]/20 lg:max-w-sm">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#DA9C2F]/15 via-transparent to-transparent" aria-hidden="true" />
              <Image
                src="/wordle.png"
                alt="Realmkin Wordle glyph"
                width={260}
                height={260}
                className="relative z-10 h-auto w-40 opacity-80 drop-shadow-[0_0_40px_rgba(218,156,47,0.45)] lg:w-52"
                priority
              />
            </div>
          </div>
        </section>

        <GameWordleClient />

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

export default withAuthGuard(RealmkinWordlePage);
