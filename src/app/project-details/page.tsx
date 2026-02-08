'use client';

import React, { useRef, useState } from 'react';
import { useScroll, useTransform, motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import MobileMenuOverlay from '@/components/MobileMenuOverlay';
import { useAuth } from "@/contexts/AuthContext";
import { useWeb3 } from "@/contexts/Web3Context";
import { useDiscord } from "@/contexts/DiscordContext";
import { NAV_ITEMS } from "@/config/navigation";

import HeroSection from './components/HeroSection';
import ProjectDeck from './components/ProjectDeck';
import TokenCarousel from './components/TokenCarousel';
import EcosystemStories from './components/EcosystemStories';
import WhitepaperSheet from './components/WhitepaperSheet';
import StickyFooter from './components/StickyFooter';


export default function ProjectDetailsPage() {
    const [isWhitepaperOpen, setIsWhitepaperOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const { user, userData } = useAuth();
    const { account, isConnected, connectWallet, disconnectWallet, isConnecting } = useWeb3();
    const { discordLinked, connectDiscord, disconnectDiscord, discordConnecting, discordUnlinking } = useDiscord();

    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    const gatekeeperBase = process.env.NEXT_PUBLIC_GATEKEEPER_BASE || "https://gatekeeper-bmvu.onrender.com";

    // Scroll Progress for the whole page/container
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    });

    // Scroll Progress specifically for the Content Section Trigger
    // Start: top 100% (start of content meets end of viewport)
    // End: top 20% (start of content meets 20% from top of viewport)
    const { scrollYProgress: contentProgress } = useScroll({
        target: contentRef,
        offset: ["start end", "start 0.2"]
    });

    // Animation Logic
    const overlayOpacity = useTransform(contentProgress, [0, 1], [0, 0.5]);
    const blurFilter = useTransform(contentProgress, [0, 1], ["blur(0px)", "blur(10px)"]);

    return (
        <div ref={containerRef} className="relative w-full min-h-screen bg-[#080806] text-white selection:bg-[#DA9C2F] selection:text-black">
            {/* Mobile Header - Standardized */}
            <header className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-[#050302]/90 to-transparent">
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
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="flex items-center gap-2 bg-[#0B0B09] px-3 py-2 rounded-lg border border-[#404040] text-[#DA9C2F] font-medium text-sm hover:bg-[#1a1a1a] transition-colors"
                >
                    <span className="text-xs">⋯</span>
                </button>
            </header>

            <MobileMenuOverlay
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
                menuItems={NAV_ITEMS}
                isAdmin={userData?.admin}
                isConnected={isConnected}
                account={account}
                isConnecting={isConnecting}
                discordLinked={discordLinked}
                discordConnecting={discordConnecting}
                discordUnlinking={discordUnlinking}
                onDiscordConnect={() => user && connectDiscord(user)}
                onDiscordDisconnect={() => user && disconnectDiscord(user)}
                onConnectWallet={connectWallet}
                onDisconnectWallet={disconnectWallet}
            />

            {/* Fixed Viewport (Z-Index: 0) */}
            <HeroSection blur={blurFilter} overlayOpacity={overlayOpacity} />

            {/* Scroll Container (Z-Index: 10) */}
            <main className="relative z-10 w-full">
                {/* Spacer Section (100vh) */}
                <div className="w-full h-screen pointer-events-none" />

                {/* Content Section (Trigger) */}
                <div ref={contentRef} className="relative">
                    <ProjectDeck />

                    <TokenCarousel />

                    <EcosystemStories onOpenWhitepaper={() => setIsWhitepaperOpen(true)} />
                </div>
            </main>

            <WhitepaperSheet isOpen={isWhitepaperOpen} onClose={() => setIsWhitepaperOpen(false)} />

            <StickyFooter />
        </div>
    );
}
