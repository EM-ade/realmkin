"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { useWeb3 } from "@/contexts/Web3Context";
import { useDiscord } from "@/contexts/DiscordContext";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { notifySuccess, notifyError } from "@/utils/toastNotifications";
import { rewardsService, UserRewards } from "@/services/rewardsService";
import { db } from "@/config/firebase";
import { collection, query, where, getDocs, limit, doc, setDoc } from "firebase/firestore";
import { NAV_ITEMS, ADMIN_NAV_ITEMS } from "@/config/navigation";


export default function GlobalNavigation() {
    const pathname = usePathname();
    const { user, userData } = useAuth();
    const { account, isConnected, connectWallet, disconnectWallet, isConnecting } = useWeb3();
    const { discordLinked, connectDiscord, disconnectDiscord, discordConnecting, discordUnlinking, checkDiscordStatus } = useDiscord();
    const [userRewards, setUserRewards] = useState<UserRewards | null>(null);
    const [showMenu, setShowMenu] = useState(false);
    const gatekeeperBase = process.env.NEXT_PUBLIC_GATEKEEPER_BASE || "https://gatekeeper-bot.fly.dev";

    // Dropdown state
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const mainNavItems = useMemo(() => NAV_ITEMS.filter(item => !item.group), []);
    const ecosystemItems = useMemo(() => NAV_ITEMS.filter(item => item.group === "Ecosystem"), []);

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
                    {mainNavItems.map((item) => (
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

                    {/* Ecosystem Dropdown */}
                    <div
                        className="relative h-full flex items-center"
                        ref={dropdownRef}
                        onMouseEnter={() => setIsDropdownOpen(true)}
                        onMouseLeave={() => setIsDropdownOpen(false)}
                    >
                        <button
                            className={`flex items-center gap-1 text-sm font-medium transition-colors ${ecosystemItems.some(item => pathname === item.href)
                                    ? "text-[#DA9C2F]"
                                    : "text-white/60 hover:text-[#DA9C2F]"
                                }`}
                        >
                            <span>Ecosystem</span>
                            <span className={`transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""} text-[10px]`}>▼</span>
                        </button>

                        {isDropdownOpen && (
                            <div className="absolute top-full left-0 mt-0 w-48 rounded-xl bg-[#0B0B09] border border-[#DA9C2F]/20 shadow-xl overflow-hidden z-50 animate-fade-in">
                                <div className="py-1">
                                    {ecosystemItems.map((item) => {
                                        const isActive = pathname === item.href;
                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                onClick={() => setIsDropdownOpen(false)}
                                                className={`flex items-center gap-3 px-4 py-3 transition-colors ${isActive
                                                    ? "bg-[#DA9C2F]/10 text-[#DA9C2F]"
                                                    : "text-[#DA9C2F]/80 hover:bg-[#DA9C2F]/5 hover:text-[#DA9C2F]"
                                                    }`}
                                            >
                                                <Image
                                                    src={item.icon}
                                                    alt={item.label}
                                                    width={16}
                                                    height={16}
                                                    className="w-4 h-4 object-contain opacity-80"
                                                />
                                                <span className="text-xs uppercase tracking-wider font-medium">{item.label}</span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
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
