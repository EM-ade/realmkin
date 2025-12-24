"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { useWeb3 } from "@/contexts/Web3Context";
import { useDiscord } from "@/contexts/DiscordContext";
import { getAuth } from "firebase/auth";
import { rewardsService, UserRewards } from "@/services/rewardsService";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { NAV_ITEMS } from "@/config/navigation";


export default function DesktopNavigation() {
    const pathname = usePathname();
    const { user, userData } = useAuth();
    const { account, isConnected, connectWallet, disconnectWallet, isConnecting } = useWeb3();

    // Use Discord context for proper popup handling
    const {
        discordLinked,
        discordConnecting,
        discordUnlinking,
        connectDiscord,
        disconnectDiscord,
        checkDiscordStatus
    } = useDiscord();

    const gatekeeperBase = process.env.NEXT_PUBLIC_GATEKEEPER_BASE || "https://gatekeeper-bmvu.onrender.com";
    const [showDiscordMenu, setShowDiscordMenu] = useState(false);
    const [userRewards, setUserRewards] = useState<UserRewards | null>(null);
    const [hideDiscordNotice, setHideDiscordNotice] = useState(false);

    useEffect(() => {
        try {
            const val = localStorage.getItem('realmkin_hide_discord_notice');
            setHideDiscordNotice(val === '1');
        } catch { }
    }, []);

    const dismissDiscordNotice = useCallback(() => {
        setHideDiscordNotice(true);
        try { localStorage.setItem('realmkin_hide_discord_notice', '1'); } catch { }
    }, []);

    const walletDisplayValue = useMemo(() => {
        return userRewards ? userRewards.totalRealmkin : 0;
    }, [userRewards]);

    const formattedWalletBalance = useMemo(
        () => `${rewardsService.formatMKIN(walletDisplayValue)} MKIN`,
        [walletDisplayValue]
    );

    const handleDiscordConnect = useCallback(() => {
        if (discordLinked || discordConnecting || !user) return;
        // Use context method which opens in popup
        connectDiscord(user);
    }, [discordLinked, discordConnecting, user, connectDiscord]);

    const handleDiscordDisconnect = useCallback(async (): Promise<boolean> => {
        if (discordUnlinking || !user) return false;
        try {
            // Use context method for disconnect
            await disconnectDiscord(user, gatekeeperBase);
            setShowDiscordMenu(false);
            return true;
        } catch (error) {
            console.error(error);
            return false;
        }
    }, [discordUnlinking, user, disconnectDiscord, gatekeeperBase]);

    // Check Discord status on mount
    useEffect(() => {
        if (user?.uid) {
            checkDiscordStatus(user.uid, gatekeeperBase);
        }
    }, [user?.uid, gatekeeperBase, checkDiscordStatus]);

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
                console.error('Error fetching user rewards:', error);
                setUserRewards(null);
            }
        }
        fetchUserRewards();
    }, [user?.uid]);

    useEffect(() => {
        if (!discordLinked) {
        }
    }, [discordLinked]);

    return (
        <nav className="hidden lg:block w-full bg-[#0B0B09]/95 backdrop-blur-sm sticky top-0 z-40 border-b border-[#DA9C2F]/15">
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 xl:px-10 py-3">
                {/* Discord not linked notice */}
                {isConnected && !discordLinked && !hideDiscordNotice && (
                    <div className="mb-2 flex items-center justify-between rounded-lg border border-[#DA9C2F]/30 bg-[#141414] px-3 py-2">
                        <span className="text-xs text-[#DA9C2F]">
                            Discord not connected — roles will not be assigned.
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleDiscordConnect}
                                disabled={discordConnecting}
                                className="rounded bg-[#DA9C2F] px-2 py-1 text-[10px] font-semibold text-black hover:bg-[#ffbf00] disabled:opacity-60"
                            >
                                {discordConnecting ? 'CONNECTING…' : 'CONNECT DISCORD'}
                            </button>
                            <button
                                onClick={dismissDiscordNotice}
                                className="rounded px-2 py-1 text-[12px] text-[#DA9C2F]/80 hover:text-[#DA9C2F]"
                                aria-label="Dismiss"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                )}
                <div className="flex items-center gap-4">
                    {/* Left: Logo */}
                    <div className="flex items-center flex-1 min-w-0">
                        <Link href="/" className="flex items-center gap-3">
                            <div className="w-12 h-10 xl:w-16 xl:h-12">
                                <Image
                                    src="/realmkin-logo.png"
                                    alt="Realmkin Logo"
                                    width={40}
                                    height={40}
                                    className="h-full w-full object-contain"
                                />
                            </div>
                            <h1 className="font-bold text-sm uppercase tracking-[0.35em] gold-gradient-text xl:text-base">
                                THE REALMKIN
                            </h1>
                        </Link>
                    </div>

                    {/* Right: Wallet Controls */}
                    <div className="flex items-center justify-end gap-4 xl:gap-6 flex-1 min-w-0">
                        {/* Simple Discord Button */}
                        <a
                            href={process.env.NEXT_PUBLIC_DISCORD_URL || "https://discord.gg/realmkin"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 bg-[#5865F2] hover:bg-[#4752c4] px-3 py-2 rounded-xl text-white text-xs font-medium transition-colors xl:text-sm"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
                            </svg>
                            <span>Discord</span>
                        </a>

                        {isConnected && account && (
                            <>
                                {/* Dynamic Connect Button with Dropdown */}
                                <div className="relative">
                                    <button
                                        onClick={() => {
                                            // If both are connected, clicking the button should show the menu
                                            // If only wallet is connected, show menu to allow Discord connection or wallet disconnect
                                            if (isConnected && discordLinked) {
                                                setShowDiscordMenu((v) => !v);
                                            } else if (isConnected && !discordLinked) {
                                                setShowDiscordMenu((v) => !v);
                                            } else {
                                                setShowDiscordMenu((v) => !v);
                                            }
                                        }}
                                        className={`flex items-center justify-between gap-2 bg-[#0B0B09] px-3 py-2 rounded-xl border ${isConnected && discordLinked ? 'border-[#2E7D32] text-emerald-400' : 'border-[#404040] text-[#DA9C2F] hover:bg-[#1a1a1a]'} font-medium text-xs transition-colors whitespace-nowrap min-w-[130px] xl:text-sm`}
                                    >
                                        <span>
                                            {isConnected && discordLinked
                                                ? 'Connected'
                                                : isConnected && !discordLinked
                                                    ? 'Wallet Connected'
                                                    : 'Connect'}
                                        </span>
                                        <span className="text-[10px] xl:text-xs opacity-80">▼</span>
                                    </button>
                                    {/* Dropdown - show for all states */}
                                    {showDiscordMenu && isConnected && (
                                        <div className="absolute right-0 mt-2 w-48 rounded-lg border border-[#404040] bg-[#0B0B09] shadow-xl z-20 animate-fade-in">
                                            {/* Discord Option - Show connect or disconnect based on state */}
                                            {discordLinked ? (
                                                <button
                                                    onClick={() => {
                                                        handleDiscordDisconnect();
                                                        setShowDiscordMenu(false);
                                                    }}
                                                    disabled={discordUnlinking}
                                                    className="block w-full text-left px-3 py-2 text-[#DA9C2F] hover:bg-[#1a1a1a] rounded-lg text-xs"
                                                >
                                                    {discordUnlinking ? 'DISCONNECTING…' : 'Disconnect Discord'}
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        handleDiscordConnect();
                                                        setShowDiscordMenu(false);
                                                    }}
                                                    disabled={discordConnecting}
                                                    className="block w-full text-left px-3 py-2 text-[#DA9C2F] hover:bg-[#1a1a1a] rounded-lg text-xs"
                                                >
                                                    {discordConnecting ? 'CONNECTING…' : 'Connect Discord'}
                                                </button>
                                            )}
                                            {/* Wallet Option */}
                                            <button
                                                onClick={() => {
                                                    disconnectWallet();
                                                    setShowDiscordMenu(false);
                                                }}
                                                disabled={isConnecting}
                                                className="block w-full text-left px-3 py-2 text-[#DA9C2F] hover:bg-[#1a1a1a] rounded-lg whitespace-nowrap text-xs"
                                            >
                                                {isConnecting ? 'DISCONNECTING...' : 'Disconnect Wallet'}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Admin Link - Show on all pages */}
                                {userData?.admin && (
                                    <Link
                                        href="/admin"
                                        className="bg-[#0B0B09] px-3 py-2 rounded-xl border border-[#404040] text-[#DA9C2F] font-medium text-xs hover:bg-[#1a1a1a] transition-colors text-center min-w-[90px] xl:text-sm xl:px-4"
                                    >
                                        ADMIN
                                    </Link>
                                )}
                            </>
                        )}

                        {/* Connect Wallet Button (when not connected) */}
                        {!isConnected && (
                            <button
                                onClick={connectWallet}
                                disabled={isConnecting}
                                className="bg-[#DA9C2F] text-black font-semibold px-3 py-2 rounded-xl hover:bg-[#ffbf00] transition-colors text-xs uppercase tracking-[0.35em] disabled:opacity-70 xl:text-sm xl:px-5"
                            >
                                {isConnecting ? 'CONNECTING...' : 'CONNECT WALLET'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
