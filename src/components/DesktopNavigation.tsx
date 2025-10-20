"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { useWeb3 } from "@/contexts/Web3Context";
import { getAuth } from "firebase/auth";
import { rewardsService, UserRewards } from "@/services/rewardsService";
import { useCallback, useEffect, useMemo, useState } from "react";

const NAV_ITEMS = [
  { label: "Home", href: "/", icon: "/dashboard.png" },
  { label: "Wallet", href: "/wallet", icon: "/wallet.png" },
  { label: "My NFTs", href: "/my-nft", icon: "/flex-model.png" },
  { label: "Staking", href: "/staking", icon: "/staking.png" },
  { label: "Game", href: "/game", icon: "/game.png" },
  { label: "Merches", href: "/merches", icon: "/merches.png" },
];

export default function DesktopNavigation() {
  const pathname = usePathname();
  const { user, userData } = useAuth();
  const { account, isConnected, connectWallet, disconnectWallet, isConnecting } = useWeb3();
  
  // Discord and balance states
  const [discordLinked, setDiscordLinked] = useState<boolean>(false);
  const gatekeeperBase = process.env.NEXT_PUBLIC_GATEKEEPER_BASE || "https://gatekeeper-bot.fly.dev";
  const [discordConnecting, setDiscordConnecting] = useState(false);
  const [discordUnlinking, setDiscordUnlinking] = useState(false);
  const [showDiscordMenu, setShowDiscordMenu] = useState(false);
  const [userRewards, setUserRewards] = useState<UserRewards | null>(null);

  const walletDisplayValue = useMemo(() => {
    return userRewards ? userRewards.totalRealmkin : 0;
  }, [userRewards]);

  const formattedWalletBalance = useMemo(
    () => `${rewardsService.formatMKIN(walletDisplayValue)} MKIN`,
    [walletDisplayValue]
  );

  const handleDiscordConnect = useCallback(() => {
    if (discordLinked || discordConnecting) return;
    setDiscordConnecting(true);
    if (typeof window !== "undefined") {
      window.location.assign("/api/discord/login");
    }
  }, [discordLinked, discordConnecting]);

  const handleDiscordDisconnect = useCallback(async (): Promise<boolean> => {
    if (discordUnlinking) return false;
    try {
      setDiscordUnlinking(true);
      const auth = getAuth();
      if (!auth.currentUser) {
        return false;
      }
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${gatekeeperBase}/api/link/discord`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to disconnect');
      setDiscordLinked(false);
      setShowDiscordMenu(false);
      try {
        localStorage.removeItem('realmkin_discord_linked');
      } catch {}
      return true;
    } catch (error) {
      console.error(error);
      return false;
    } finally {
      setDiscordUnlinking(false);
    }
  }, [discordUnlinking, gatekeeperBase]);

  // Fetch Discord link status
  useEffect(() => {
    async function checkLink() {
      try {
        const auth = getAuth();
        if (!auth.currentUser) {
          try {
            const cachedLinked = localStorage.getItem("realmkin_discord_linked");
            setDiscordLinked(cachedLinked === "true");
          } catch {
            setDiscordLinked(false);
          }
          return;
        }
        const token = await auth.currentUser.getIdToken();
        const res = await fetch(`${gatekeeperBase}/api/link/status`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!res.ok) {
          try {
            const cachedLinked = localStorage.getItem("realmkin_discord_linked");
            setDiscordLinked(cachedLinked === "true");
          } catch {
            setDiscordLinked(false);
          }
          return;
        }
        const data = await res.json();
        setDiscordLinked(Boolean(data?.linked));
      } catch {
        try {
          const cachedLinked = localStorage.getItem("realmkin_discord_linked");
          setDiscordLinked(cachedLinked === "true");
        } catch {
          setDiscordLinked(false);
        }
      }
    }
    checkLink();
  }, [user?.uid, gatekeeperBase]);

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
      setShowDiscordMenu(false);
    }
  }, [discordLinked]);

  return (
    <nav className="hidden lg:block w-full bg-[#0B0B09]/95 backdrop-blur-sm sticky top-0 z-40 border-b border-[#DA9C2F]/15">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 xl:px-10 py-3">
          {/* Left: Logo */}
          <div className="flex items-center">
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

          {/* Center: Navigation Links */}
          <div className="flex items-center gap-2 xl:gap-4">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all text-xs uppercase tracking-[0.3em] xl:px-6 xl:text-sm ${
                    isActive
                      ? "bg-[#DA9C2F] text-black font-semibold"
                      : "text-[#DA9C2F] hover:bg-[#DA9C2F]/10"
                  }`}
                >
                  {/* <Image src={item.icon} alt={item.label} width={20} height={20} className="w-5 h-5" /> */}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Right: Wallet Controls */}
          <div className="flex items-center gap-4 xl:gap-6">
            {isConnected && account && (
              <>
                {/* Dynamic Connect Button with Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => {
                      // If both are connected, clicking the button should show the menu
                      // If only one is connected, clicking should disconnect that one
                      if (isConnected && discordLinked) {
                        setShowDiscordMenu((v) => !v);
                      } else if (isConnected && !discordLinked) {
                        disconnectWallet();
                      } else if (!isConnected && discordLinked) {
                        handleDiscordDisconnect();
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
                          ? 'Disconnect Wallet'
                          : !isConnected && discordLinked
                            ? 'Disconnect Discord'
                            : 'Connect'}
                    </span>
                    <span className="text-[10px] xl:text-xs opacity-80">▼</span>
                  </button>
                  {/* Dropdown - only show when both are connected */}
                  {showDiscordMenu && isConnected && discordLinked && (
                    <div className="absolute right-0 mt-2 w-48 rounded-lg border border-[#404040] bg-[#0B0B09] shadow-xl z-20 animate-fade-in">
                      {/* Discord Option */}
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
    </nav>
  );
}
