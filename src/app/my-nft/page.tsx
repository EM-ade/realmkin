"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useWeb3 } from "@/contexts/Web3Context";
import { useNFT } from "@/contexts/NFTContext";
import NFTViewer3D from "@/components/NFTViewer3D";
import { NFTMetadata } from "@/services/nftService";
import {
  EtherealParticles,
  ConstellationBackground,
} from "@/components/MagicalAnimations";
import { getAuth } from "firebase/auth";
import { rewardsService, UserRewards } from "@/services/rewardsService";

export default function MyNFTPage() {
  const { user, userData } = useAuth();
  const { account, isConnected, connectWallet, disconnectWallet, isConnecting } = useWeb3();
  const { nfts, isLoading: nftsLoading, error: nftsError, refreshNFTs } = useNFT();

  // Selected NFT for 3D viewer
  const [selectedNFT, setSelectedNFT] = useState<NFTMetadata | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [showGallery, setShowGallery] = useState(true);

  // Discord and mobile menu states
  const [discordLinked, setDiscordLinked] = useState<boolean>(false);
  const gatekeeperBase = process.env.NEXT_PUBLIC_GATEKEEPER_BASE || "https://gatekeeper-bot.fly.dev";
  const [discordConnecting, setDiscordConnecting] = useState(false);
  const [unifiedBalance, setUnifiedBalance] = useState<number | null>(null);
  const [discordUnlinking, setDiscordUnlinking] = useState(false);
  const [showDiscordMenu, setShowDiscordMenu] = useState(false);
  const [showMobileActions, setShowMobileActions] = useState(false);
  const mobileActionsRef = useRef<HTMLDivElement | null>(null);
  const [userRewards, setUserRewards] = useState<UserRewards | null>(null);

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
      setShowMobileActions(false);
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

  // Auto-select first NFT when NFTs load
  useEffect(() => {
    if (nfts.length > 0 && !selectedNFT) {
      setSelectedNFT(nfts[0]);
    }
  }, [nfts, selectedNFT]);

  // Page transition
  // Mobile menu handlers
  useEffect(() => {
    if (!showMobileActions) return;

    function handlePointer(event: MouseEvent) {
      if (!mobileActionsRef.current?.contains(event.target as Node)) {
        setShowMobileActions(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setShowMobileActions(false);
      }
    }

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showMobileActions]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const originalOverflow = document.body.style.overflow;

    if (showMobileActions) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }

    document.body.style.overflow = originalOverflow;

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [showMobileActions]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setShowMobileActions(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!discordLinked) {
      setShowDiscordMenu(false);
    }
  }, [discordLinked]);

  useEffect(() => {
    if (!isConnected) {
      setShowMobileActions(false);
    }
  }, [isConnected]);

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

  const getRarityColor = (rarity: string) => {
    switch (rarity?.toUpperCase()) {
      case "LEGENDARY":
        return "#d4af37";
      case "EPIC":
        return "#9333ea";
      case "RARE":
        return "#3b82f6";
      case "COMMON":
        return "#6b7280";
      default:
        return "#DA9C2F";
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#080806] relative overflow-hidden">
        <EtherealParticles />
        <ConstellationBackground />

        {/* Header Section */}
        <header className="flex flex-row justify-between items-center gap-3 p-4 md:p-6 animate-fade-in relative z-20">
          <div className="flex items-center space-x-3">
            <div className="w-14 h-14 animate-float">
              <Image
                src="/realmkin-logo.png"
                alt="Realmkin Logo"
                width={48}
                height={48}
                className="w-full h-full object-cover"
              />
            </div>
            <h1 className="font-bold text-lg uppercase tracking-wider gold-gradient-text">
              THE REALMKIN
            </h1>
          </div>

          {isConnected && account && (
            <div className="w-auto flex-shrink-0">
              <div className="flex flex-col md:flex-row items-end md:items-center gap-2 md:gap-3 w-full md:w-auto justify-end">
                <div className="flex w-full md:w-auto items-center justify-end gap-2">
                  {/* Mobile menu toggle */}
                  <div className="md:hidden">
                    <button
                      onClick={() => setShowMobileActions((v) => !v)}
                      className="flex items-center gap-2 bg-[#0B0B09] px-3 py-2 rounded-lg border border-[#404040] text-[#DA9C2F] font-medium text-sm hover:bg-[#1a1a1a] transition-colors"
                      aria-expanded={showMobileActions}
                      aria-haspopup="true"
                    >
                      <span className={`text-xs transition-transform ${showMobileActions ? 'rotate-180' : ''}`}>⋯</span>
                    </button>
                  </div>
                </div>

                {showMobileActions && (
                  <>
                    <div
                      className="fixed inset-0 z-40 bg-black/70 backdrop-blur-md"
                      onClick={() => setShowMobileActions(false)}
                    />
                    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                      <div
                        ref={mobileActionsRef}
                        className="w-full max-w-sm rounded-3xl bg-[#101010] border border-[#2a2a2a] shadow-2xl overflow-hidden animate-fade-in-up"
                      >
                        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1f1f1f]">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-[#1f1f1f] flex items-center justify-center">
                              <Image
                                src="/realmkin-logo.png"
                                alt="Realmkin"
                                width={36}
                                height={36}
                                className="w-9 h-9 object-contain"
                              />
                            </div>
                            <div className="text-left">
                              <div className="text-lg font-semibold tracking-wide text-[#DA9C2F] uppercase">Realmkin</div>
                            </div>
                          </div>
                          <button
                            onClick={() => setShowMobileActions(false)}
                            className="text-[#DA9C2F] text-xl font-bold"
                            aria-label="Close menu"
                          >
                            ×
                          </button>
                        </div>

                        <nav className="px-4 py-3 space-y-1.5">
                          {mobileMenuItems.map((item) => (
                            <Link
                              key={item.label}
                              href={item.href}
                              onClick={() => setShowMobileActions(false)}
                              className="flex items-center gap-3 px-3 py-1.5 rounded-2xl border border-transparent hover:border-[#2E2E2E] hover:bg-[#161616] transition-colors"
                            >
                              <span className="flex h-10 w-10 items-center justify-center">
                                <Image
                                  src={item.icon}
                                  alt={`${item.label} icon`}
                                  width={20}
                                  height={20}
                                  className="w-8 h-8 object-contain"
                                />
                              </span>
                              <span className="text-sm font-medium tracking-wide text-[#DA9C2F]">
                                {item.label}
                              </span>
                            </Link>
                          ))}
                          {userData?.admin && (
                            <Link
                              href="/admin"
                              onClick={() => setShowMobileActions(false)}
                              className="flex items-center gap-3 px-3 py-1.5 rounded-2xl border border-transparent hover:border-[#2E2E2E] hover:bg-[#161616] transition-colors"
                            >
                              <span className="flex h-10 w-10 items-center justify-center">
                                <Image
                                  src="/dashboard.png"
                                  alt="Admin icon"
                                  width={20}
                                  height={20}
                                  className="w-8 h-8 object-contain"
                                />
                              </span>
                              <span className="text-sm font-medium tracking-wide text-[#DA9C2F]">
                                Admin
                              </span>
                            </Link>
                          )}
                        </nav>

                        <div className="px-5 py-4 border-t border-[#1f1f1f]">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <button
                              onClick={() => {
                                if (!discordLinked) {
                                  handleDiscordConnect();
                                  return;
                                }
                                setShowDiscordMenu(false);
                                handleDiscordDisconnect();
                              }}
                              disabled={discordConnecting || discordUnlinking}
                              className={`flex-1 flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition-colors ${discordLinked ? 'bg-[#DA9C2F] text-black border-[#DA9C2F] hover:bg-[#f0b94a]' : 'bg-[#0B0B09] text-[#DA9C2F] border-[#DA9C2F] hover:bg-[#1a1a1a]'}`}
                            >
                              <span>{discordLinked ? 'Disconnect Discord' : discordConnecting ? 'Connecting…' : 'Connect Discord'}</span>
                              <span className="text-xs opacity-70">{discordLinked ? 'Linked' : 'Secure'}</span>
                            </button>

                            <div className="flex items-center justify-end gap-3 w-full sm:w-auto">
                              <div
                                className={`relative h-10 w-16 rounded-full border transition-all duration-300 ease-out ${isConnected ? 'border-[#DA9C2F] bg-[#DA9C2F]' : 'border-[#DA9C2F] bg-[#0B0B09]'}`}
                                aria-hidden="true"
                              >
                                <div
                                  className={`absolute top-1 h-8 w-8 rounded-full border border-[#DA9C2F] bg-black transition-all duration-300 ease-out ${isConnected ? 'right-1' : 'left-1'}`}
                                />
                              </div>
                              <button
                                onClick={() => {
                                  setShowMobileActions(false);
                                  if (isConnected) {
                                    disconnectWallet();
                                  } else {
                                    connectWallet();
                                  }
                                }}
                                disabled={isConnecting}
                                className="basis-[70%] flex items-center justify-between gap-3 rounded-2xl border border-[#DA9C2F] bg-[#0B0B09] px-4 py-3 text-sm font-medium text-[#DA9C2F] transition-colors hover:bg-[#151515] disabled:opacity-70"
                              >
                                <span>{isConnected ? 'Connected' : isConnecting ? 'Connecting…' : 'Connect Wallet'}</span>
                                <span className="flex items-center gap-2 text-xs text-[#DA9C2F]">
                                  <Image src="/wallet.png" alt="Wallet connect" width={16} height={16} className="w-4 h-4" />
                                  {isConnecting ? 'Loading…' : isConnected ? 'Synced' : 'Secure'}
                                </span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Desktop inline controls */}
                <div className="hidden md:flex items-center gap-3">
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

                  {/* Admin Link */}
                  {userData?.admin && (
                    <Link
                      href="/admin"
                      className="bg-[#0B0B09] px-3 py-2 rounded-lg border border-[#404040] text-[#DA9C2F] font-medium text-sm hover:bg-[#1a1a1a] transition-colors text-center"
                    >
                      ADMIN
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}
        </header>

        {/* Main Content */}
        <main className="relative z-10 px-4 md:px-6 pb-6">
          {/* Page Title */}
          <div className="mb-6 animate-fade-in">
            <h2 className="text-3xl md:text-4xl font-bold gold-gradient-text uppercase tracking-wider mb-2">
              My NFT Collection
            </h2>
            <p className="text-gray-400 text-sm">
              View your NFTs in stunning 3D • {nfts.length} {nfts.length === 1 ? 'NFT' : 'NFTs'} owned
            </p>
          </div>

          {/* Main Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* NFT Gallery Sidebar */}
            <div className={`lg:col-span-1 ${showGallery ? 'block' : 'hidden lg:block'}`}>
              <div className="card premium-card h-[300px] lg:h-[calc(100vh-280px)] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-label">YOUR NFTS</h3>
                  <button
                    onClick={refreshNFTs}
                    className="text-[#DA9C2F] hover:text-[#ffbf00] transition-colors"
                    title="Refresh NFTs"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>

                {nftsLoading ? (
                  <div className="flex items-center justify-center h-40">
                    <div className="loading-realmkin">
                      <div className="loading-realmkin-spinner"></div>
                      <div className="loading-realmkin-particles">
                        <div className="loading-realmkin-particle"></div>
                        <div className="loading-realmkin-particle"></div>
                        <div className="loading-realmkin-particle"></div>
                        <div className="loading-realmkin-particle"></div>
                      </div>
                    </div>
                  </div>
                ) : nftsError ? (
                  <div className="text-center text-red-400 py-8">
                    <p>{nftsError}</p>
                  </div>
                ) : nfts.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    <p className="mb-2">No NFTs found</p>
                    <p className="text-sm">Connect your wallet to view your collection</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
                    {nfts.map((nft, index) => (
                      <button
                        key={`${nft.id}-${index}`}
                        onClick={() => setSelectedNFT(nft)}
                        className={`relative rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${
                          selectedNFT?.id === nft.id
                            ? 'border-[#DA9C2F] shadow-lg shadow-[#DA9C2F]/30'
                            : 'border-[#404040] hover:border-[#DA9C2F]/50'
                        }`}
                      >
                        <div className="aspect-square relative bg-[#2d2d2d]">
                          {nft.image ? (
                            <Image
                              src={nft.image}
                              alt={nft.name}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 50vw, 200px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-4xl">
                              🎭
                            </div>
                          )}
                        </div>
                        <div className="p-2 bg-[#0B0B09]">
                          <p className="text-xs text-white truncate">{nft.name}</p>
                          <p
                            className="text-xs font-semibold"
                            style={{ color: getRarityColor(nft.rarity || '') }}
                          >
                            {nft.rarity || 'COMMON'}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 3D Viewer */}
            <div className="lg:col-span-3">
              <div className="card premium-card p-0 h-[500px] lg:h-[calc(100vh-280px)] relative overflow-hidden">
                <NFTViewer3D nft={selectedNFT} autoRotate={autoRotate} />

                {/* Control Panel */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-[#0B0B09]/90 backdrop-blur-sm border border-[#404040] rounded-lg px-4 py-2">
                  <button
                    onClick={() => setAutoRotate(!autoRotate)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      autoRotate
                        ? 'bg-[#DA9C2F] text-black'
                        : 'bg-[#2d2d2d] text-[#DA9C2F] hover:bg-[#3d3d3d]'
                    }`}
                    title={autoRotate ? 'Stop rotation' : 'Auto rotate'}
                  >
                    {autoRotate ? '⏸ Pause' : '▶ Rotate'}
                  </button>

                  <button
                    onClick={() => setShowGallery(!showGallery)}
                    className="lg:hidden px-3 py-1 rounded text-xs font-medium bg-[#2d2d2d] text-[#DA9C2F] hover:bg-[#3d3d3d] transition-colors"
                  >
                    {showGallery ? 'Hide Gallery' : 'Show Gallery'}
                  </button>

                  <div className="hidden md:block text-xs text-gray-400 ml-2">
                    Drag to rotate • Scroll to zoom
                  </div>
                </div>

                {/* NFT Info Overlay */}
                {selectedNFT && (
                  <div className="absolute top-4 left-4 bg-[#0B0B09]/90 backdrop-blur-sm border border-[#404040] rounded-lg px-4 py-3 max-w-xs">
                    <h3 className="text-white font-semibold mb-1">{selectedNFT.name}</h3>
                    <p
                      className="text-sm font-medium mb-2"
                      style={{ color: getRarityColor(selectedNFT.rarity || '') }}
                    >
                      {selectedNFT.rarity || 'COMMON'}
                    </p>
                    {selectedNFT.power && (
                      <p className="text-xs text-gray-400">
                        Power: <span className="text-[#DA9C2F] font-medium">{selectedNFT.power}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
