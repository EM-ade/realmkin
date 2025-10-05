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
  const [unifiedBalance, setUnifiedBalance] = useState<number | null>(null);
  const [discordUnlinking, setDiscordUnlinking] = useState(false);
  const [showDiscordMenu, setShowDiscordMenu] = useState(false);
  const [userRewards, setUserRewards] = useState<UserRewards | null>(null);

  const walletDisplayValue = useMemo(() => {
    const fb = userRewards ? userRewards.totalRealmkin : null;
    const uni = typeof unifiedBalance === "number" ? unifiedBalance : null;
    if (fb !== null && uni !== null) {
      return Math.max(fb, uni);
    }
    if (uni !== null) {
      return uni;
    }
    if (fb !== null) {
      return fb;
    }
    return 0;
  }, [userRewards, unifiedBalance]);

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

  // Fetch unified balance
  useEffect(() => {
    async function fetchUnifiedBalance() {
      try {
        const auth = getAuth();
        if (!auth.currentUser) {
          setUnifiedBalance(null);
          return;
        }
        const token = await auth.currentUser.getIdToken();
        const res = await fetch(`${gatekeeperBase}/api/balance`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!res.ok) {
          setUnifiedBalance(null);
          return;
        }
        const data = await res.json();
        if (typeof data?.balance === 'number') {
          setUnifiedBalance(data.balance);
        } else {
          setUnifiedBalance(null);
        }
      } catch {
        setUnifiedBalance(null);
      }
    }
    fetchUnifiedBalance();
  }, [user?.uid, gatekeeperBase]);

  useEffect(() => {
    if (!discordLinked) {
      setShowDiscordMenu(false);
    }
  }, [discordLinked]);

  return (
    <nav className="hidden lg:block w-full border-b border-[#404040]/30 bg-[#0B0B09]/95 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo */}
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-10 h-10">
              <Image
                src="/realmkin-logo.png"
                alt="Realmkin Logo"
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            </div>
            <h1 className="font-bold text-base uppercase tracking-wider gold-gradient-text">
              THE REALMKIN
            </h1>
          </Link>

          {/* Center: Navigation Links */}
          <div className="flex items-center gap-8">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm uppercase tracking-wider ${
                    isActive
                      ? "bg-[#DA9C2F] text-black font-semibold"
                      : "text-[#DA9C2F] hover:bg-[#DA9C2F]/10"
                  }`}
                >
                  <Image src={item.icon} alt={item.label} width={16} height={16} className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Right: Wallet Controls */}
          <div className="flex items-center gap-3">
            {isConnected && account && pathname === '/wallet' && (
              <>
                {/* Wallet Balance - Only on wallet page */}
                <div className="bg-[#0B0B09] pl-3 pr-1 py-2 rounded-lg border border-[#404040] flex-initial min-w-[180px]">
                  <div className="text-[#DA9C2F] font-medium text-sm whitespace-nowrap flex items-center gap-2">
                    <Image
                      src="/wallet.jpeg"
                      alt="Wallet Logo"
                      width={16}
                      height={16}
                      className="w-6 h-6 object-contain"
                    />
                    <span>{formattedWalletBalance}</span>
                  </div>
                </div>

                {/* Discord Link Status / Connect Button */}
                <div className="relative">
                  <button
                    onClick={() => {
                      if (!discordLinked) {
                        handleDiscordConnect();
                        return;
                      }
                      setShowDiscordMenu((v) => !v);
                    }}
                    disabled={discordConnecting}
                    className={`flex items-center justify-between gap-2 bg-[#0B0B09] px-3 py-2 rounded-lg border ${discordLinked ? 'border-[#2E7D32] text-emerald-400' : 'border-[#404040] text-[#DA9C2F] hover:bg-[#1a1a1a]'} font-medium text-sm transition-colors whitespace-nowrap`}
                  >
                    {discordLinked ? (
                      <>
                        <span>DISCORD LINKED</span>
                        <span className="ml-1 text-xs opacity-80">▼</span>
                      </>
                    ) : (
                      <span>{discordConnecting ? 'CONNECTING…' : 'CONNECT DISCORD'}</span>
                    )}
                  </button>
                  {discordLinked && showDiscordMenu && (
                    <div className="absolute right-0 mt-2 w-48 rounded-lg border border-[#404040] bg-[#0B0B09] shadow-xl z-20 animate-fade-in">
                      <button
                        onClick={async () => {
                          const success = await handleDiscordDisconnect();
                          if (success) {
                            setShowDiscordMenu(false);
                          }
                        }}
                        className="block w-full text-left px-3 py-2 text-[#DA9C2F] hover:bg-[#1a1a1a] rounded-lg"
                      >
                        {discordUnlinking ? 'DISCONNECTING…' : 'Disconnect'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Admin Link - Only on wallet page */}
                {userData?.admin && (
                  <Link
                    href="/admin"
                    className="bg-[#0B0B09] px-3 py-2 rounded-lg border border-[#404040] text-[#DA9C2F] font-medium text-sm hover:bg-[#1a1a1a] transition-colors text-center"
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
                className="bg-[#DA9C2F] text-black font-semibold px-4 py-2 rounded-lg hover:bg-[#ffbf00] transition-colors text-sm uppercase tracking-wider disabled:opacity-70"
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
