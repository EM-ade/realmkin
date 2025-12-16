"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { useWeb3 } from "@/contexts/Web3Context";
import { useDiscord } from "@/contexts/DiscordContext";
import { useState, useEffect, useMemo, useCallback } from "react";
import { notifySuccess, notifyError } from "@/utils/toastNotifications";
import { rewardsService, UserRewards } from "@/services/rewardsService";
import { db } from "@/config/firebase";
import { collection, query, where, getDocs, limit, doc, setDoc } from "firebase/firestore";

const NAV_ITEMS = [
  { label: "Home", href: "/", icon: "/dashboard.png" },
  { label: "Wallet", href: "/wallet", icon: "/wallet.png" },
  { label: "My NFTs", href: "/my-nft", icon: "/flex-model.png" },
  { label: "Staking", href: "/staking", icon: "/staking.png" },
  { label: "Marketplace", href: "/marketplace", icon: "/marketplace.png" },
  { label: "Game", href: "/game", icon: "/game.png" },
  { label: "Merches", href: "/merches", icon: "/merches.png" },
];

const ADMIN_NAV_ITEMS = [
  { label: "Admin", href: "/admin", icon: "/admin.png" },
];

export default function GlobalNavigation() {
  const pathname = usePathname();
  const { user, userData } = useAuth();
  const { account, isConnected, connectWallet, disconnectWallet, isConnecting } = useWeb3();
  const { discordLinked, connectDiscord, disconnectDiscord, discordConnecting, discordUnlinking, checkDiscordStatus } = useDiscord();
  const [userRewards, setUserRewards] = useState<UserRewards | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const gatekeeperBase = process.env.NEXT_PUBLIC_GATEKEEPER_BASE || "https://gatekeeper-bot.fly.dev";

  // Check Discord status on mount
  useEffect(() => {
    if (user?.uid) {
      checkDiscordStatus(user.uid, gatekeeperBase);
    }
  }, [user?.uid, gatekeeperBase, checkDiscordStatus]);

  const formattedBalance = useMemo(
    () => userRewards ? `${rewardsService.formatMKIN(userRewards.totalRealmkin)} MKIN` : "0.00 MKIN",
    [userRewards]
  );

  const handleWalletDisconnect = useCallback(async () => {
    try {
      await disconnectWallet();
      // Don't unlink Discord - keep it linked so user can reconnect wallet later
      notifySuccess("Wallet disconnected");
    } catch (error) {
      notifyError("Failed to disconnect wallet");
    }
  }, [disconnectWallet]);

  const handleDiscordDisconnect = useCallback(async () => {
    try {
      if (!user) {
        notifyError("You must be logged in to disconnect Discord");
        return;
      }
      await disconnectDiscord(user, gatekeeperBase);
      notifySuccess("Discord disconnected");
    } catch (error) {
      notifyError("Failed to disconnect Discord");
    }
  }, [disconnectDiscord, user, gatekeeperBase]);

  // Ensure users/{uid}.username exists if a mapping already exists in usernames/{name}
  useEffect(() => {
    const ensureUsernameOnUserDoc = async () => {
      try {
        if (!user?.uid) return;
        // If userData already has username, nothing to do
        if (userData?.username) return;
        // Look up mapping by uid in usernames collection
        const q = query(collection(db, "usernames"), where("uid", "==", user.uid), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const foundName = snap.docs[0].id;
          // Merge username into users/{uid}
          await setDoc(doc(db, "users", user.uid), { username: foundName, updatedAt: new Date() }, { merge: true });
        }
      } catch (e) {
        // Non-fatal; onboarding wizard will handle if needed
        console.debug("Username ensure in nav skipped:", e);
      }
    };
    ensureUsernameOnUserDoc();
  }, [user?.uid, userData?.username]);

  // Hide nav on login page
  if (pathname === "/login" || pathname?.startsWith("/discord")) {
    return null;
  }

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden lg:flex fixed top-0 left-0 right-0 z-40 items-center justify-between px-8 py-4 bg-gradient-to-b from-[#050302]/95 to-[#050302]/80 backdrop-blur-md border-b border-[#DA9C2F]/10">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <Image src="/realmkin-logo.png" alt="Realmkin" width={40} height={40} />
          <span className="font-bold text-[#DA9C2F] uppercase tracking-wider">Realmkin</span>
        </Link>

        {/* Nav Items */}
        <div className="flex items-center gap-6">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm font-medium transition-colors ${pathname === item.href
                  ? "text-[#DA9C2F]"
                  : "text-white/60 hover:text-[#DA9C2F]"
                }`}
            >
              {item.label}
            </Link>
          ))}
          {userData?.admin && (
            <Link
              href="/admin"
              className={`text-sm font-medium transition-colors ${pathname === "/admin"
                  ? "text-[#DA9C2F]"
                  : "text-white/60 hover:text-[#DA9C2F]"
                }`}
            >
              Admin
            </Link>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          {/* {isConnected && (
            <div className="text-xs text-white/60 px-3 py-1 rounded-lg bg-[#DA9C2F]/10">
              {formattedBalance}
            </div>
          )} */}
          {discordLinked ? (
            <button
              onClick={handleDiscordDisconnect}
              disabled={discordUnlinking}
              className="px-4 py-2 rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 text-sm font-medium transition-colors disabled:opacity-60"
            >
              {discordUnlinking ? "Disconnecting Discord..." : "Disconnect Discord"}
            </button>
          ) : (
            <button
              onClick={() => {
                if (user) {
                  connectDiscord(user);
                }
              }}
              disabled={discordConnecting || !user}
              className="px-4 py-2 rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 text-sm font-medium transition-colors disabled:opacity-60"
            >
              {discordConnecting ? "Connecting Discord..." : "Connect Discord"}
            </button>
          )}
          {isConnected ? (
            <button
              onClick={handleWalletDisconnect}
              className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm font-medium transition-colors"
            >
              Disconnect
            </button>
          ) : (
            <button
              id="connect-wallet-btn"
              onClick={connectWallet}
              disabled={isConnecting}
              className="px-4 py-2 rounded-lg bg-[#DA9C2F] text-black hover:bg-[#ffbf00] text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isConnecting ? "Connecting..." : "Connect"}
            </button>
          )}
        </div>
      </nav>


      {/* Spacer for fixed nav */}
      <div className="hidden lg:block h-16" />
    </>
  );
}
