"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useWeb3 } from "@/contexts/Web3Context";
import { useNFT } from "@/contexts/NFTContext";
import NFTViewer3D from "@/components/NFTViewer3D";
import DesktopNavigation from "@/components/DesktopNavigation";
import { NFTMetadata } from "@/services/nftService";
import { getAuth } from "firebase/auth";
import { rewardsService, UserRewards } from "@/services/rewardsService";

// Lazy load background effects for better performance
const EtherealParticles = dynamic(
  () => import("@/components/MagicalAnimations").then(mod => mod.EtherealParticles),
  { ssr: false }
);
const ConstellationBackground = dynamic(
  () => import("@/components/MagicalAnimations").then(mod => mod.ConstellationBackground),
  { ssr: false }
);

// Sample NFT data for testing
const SAMPLE_NFTS: NFTMetadata[] = [
  {
    id: "test-nft-1",
    name: "WardenKin Warrior #1234",
    description: "A legendary warrior from The Void",
    image: "/realmkin-1.webp",
    contractAddress: "test",
    tokenId: "1234",
    rarity: "LEGENDARY",
    power: 950,
    modelUrl: "/models/test-nft.glb", // 3D Model - Place your GLB file here
    attributes: [
      { trait_type: "Class", value: "Warrior" },
      { trait_type: "Element", value: "Fire" },
      { trait_type: "Rarity", value: "Legendary" }
    ]
  },
  {
    id: "test-nft-2",
    name: "WardenKin Mage #5678",
    description: "An epic mage wielding ice magic",
    image: "/realmkin-1.webp",
    contractAddress: "test",
    tokenId: "5678",
    rarity: "EPIC",
    power: 720,
    attributes: [
      { trait_type: "Class", value: "Mage" },
      { trait_type: "Element", value: "Ice" },
      { trait_type: "Rarity", value: "Epic" }
    ]
  },
  {
    id: "test-nft-3",
    name: "WardenKin Rogue #9012",
    description: "A rare rogue master of shadows",
    image: "/realmkin-1.webp",
    contractAddress: "test",
    tokenId: "9012",
    rarity: "RARE",
    power: 580,
    attributes: [
      { trait_type: "Class", value: "Rogue" },
      { trait_type: "Element", value: "Shadow" },
      { trait_type: "Rarity", value: "Rare" }
    ]
  }
];

export default function MyNFTPage() {
  const { user, userData } = useAuth();
  const { account, isConnected, connectWallet, disconnectWallet, isConnecting } = useWeb3();
  const { nfts, isLoading: nftsLoading, error: nftsError, refreshNFTs } = useNFT();

  // Selected NFT for 3D viewer
  const [selectedNFT, setSelectedNFT] = useState<NFTMetadata | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [showGallery, setShowGallery] = useState(true);
  
  // Test mode state
  const [testMode, setTestMode] = useState(false);

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
      { label: "Home", href: "/", icon: "/dashboard.webp" },
      { label: "Wallet", href: "/wallet", icon: "/wallet.webp" },
      { label: "Staking", href: "/staking", icon: "/staking.webp" },
      { label: "Game", href: "/game", icon: "/game.webp" },
      { label: "My NFT", href: "/my-nft", icon: "/flex-model.webp" },
      { label: "Merches", href: "/merches", icon: "/merches.webp" },
    ],
    []
  );
  
  // Merge test NFTs with real NFTs when test mode is enabled
  const displayNFTs = useMemo(() => {
    return testMode ? [...SAMPLE_NFTS, ...nfts] : nfts;
  }, [testMode, nfts]);

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
      <div className="min-h-screen bg-[#050302] relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(244,199,82,0.15),rgba(5,3,2,0.95))]" aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#050302]/30 via-transparent to-[#050302]" aria-hidden="true" />
        <EtherealParticles />
        <ConstellationBackground />

        {/* Mobile Header */}
        <header className="lg:hidden flex flex-row justify-between items-center gap-3 p-4 md:p-6 animate-fade-in relative z-20">
          <div className="flex items-center space-x-3">
            <div className="w-14 h-14 animate-float">
              <Image
                src="/realmkin-logo.webp"
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

        {/* Desktop Navigation */}
        <DesktopNavigation />

        {/* Mobile Menu Modal */}
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
                        src="/realmkin-logo.webp"
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

                {isConnected && account && (
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
                        className="flex-1 flex items-center justify-between gap-3 rounded-2xl border border-[#DA9C2F] bg-black px-4 py-3 text-sm font-medium text-[#DA9C2F] transition-colors hover:bg-[#1a1a1a] disabled:opacity-70"
                      >
                        <span>{discordLinked ? 'Disconnect Discord' : discordConnecting ? 'Connecting…' : 'Connect Discord'}</span>
                        <span className="text-xs text-[#DA9C2F] opacity-70">{discordLinked ? 'Linked' : 'Secure'}</span>
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
                )}
              </div>
            </div>
          </>
        )}

        {/* Main Content */}
        <main className="relative z-10 px-4 md:px-6 lg:px-10 pb-12 max-w-7xl mx-auto mt-10">
          {/* Page Title */}
          <div className="mb-8 animate-fade-in text-center lg:text-left">
            <h2 className="text-4xl md:text-5xl font-bold uppercase tracking-[0.1em] mb-3" style={{ fontFamily: "var(--font-amnestia)", color: "#f4c752", textShadow: "0 0 24px rgba(244, 199, 82, 0.3)" }}>
              My NFT Collection
            </h2>
            <p className="text-[#f7dca1]/80 text-base md:text-lg">
              View your NFTs in stunning 3D • <span className="text-[#f4c752] font-semibold">{displayNFTs.length}</span> {displayNFTs.length === 1 ? 'NFT' : 'NFTs'} owned
              {testMode && <span className="ml-2 text-xs bg-[#f4c752] text-black px-2 py-1 rounded-full font-bold">TEST MODE</span>}
            </p>
          </div>

          {/* Main Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* NFT Gallery Sidebar */}
            <div className={`lg:col-span-1 ${showGallery ? 'block' : 'hidden lg:block'}`}>
              <div className="bg-[#1b1205]/95 border border-[#f4c752]/25 rounded-2xl p-6 h-[300px] lg:h-[calc(100vh-280px)] overflow-y-auto shadow-[0_20px_50px_rgba(0,0,0,0.4)] hover:border-[#f4c752]/40 transition-all">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-[#f4c752]">Your NFTs</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setTestMode(!testMode)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                        testMode
                          ? 'bg-[#f4c752] text-black shadow-md'
                          : 'bg-[#2a1f0a] text-[#f4c752] border border-[#f4c752]/30 hover:bg-[#3a2f1a]'
                      }`}
                      title="Toggle test NFTs"
                    >
                      {testMode ? '🧪 Test ON' : '🧪 Test'}
                    </button>
                    <button
                      onClick={refreshNFTs}
                      className="text-[#f4c752] hover:text-[#ffe9b5] transition-all hover:scale-110"
                      title="Refresh NFTs"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  </div>
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
                  <div className="text-center text-red-400 py-12">
                    <div className="text-4xl mb-3">⚠️</div>
                    <p className="text-sm">{nftsError}</p>
                  </div>
                ) : displayNFTs.length === 0 ? (
                  <div className="text-center text-[#f7dca1]/60 py-12">
                    <div className="text-5xl mb-4">🎭</div>
                    <p className="text-base font-semibold mb-2 text-[#f4c752]">No NFTs found</p>
                    <p className="text-sm">Connect your wallet to view your collection</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
                    {displayNFTs.map((nft, index) => (
                      <button
                        key={`${nft.id}-${index}`}
                        onClick={() => setSelectedNFT(nft)}
                        className={`group relative rounded-xl overflow-hidden border-2 transition-all duration-300 ${
                          selectedNFT?.id === nft.id
                            ? 'border-[#f4c752] shadow-lg shadow-[#f4c752]/30 scale-[1.02]'
                            : 'border-[#f4c752]/20 hover:border-[#f4c752]/60 hover:scale-[1.02] hover:shadow-md hover:shadow-[#f4c752]/20'
                        }`}
                      >
                        <div className="aspect-square relative bg-gradient-to-br from-[#2a1f0a] to-[#1a1205]">
                          {nft.image ? (
                            <Image
                              src={nft.image}
                              alt={nft.name}
                              fill
                              className="object-cover transition-transform duration-300 group-hover:scale-105"
                              sizes="(max-width: 768px) 50vw, 200px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-4xl opacity-50">
                              🎭
                            </div>
                          )}
                        </div>
                        <div className="p-3 bg-gradient-to-b from-[#1b1205] to-[#0f0902]">
                          <p className="text-xs font-semibold text-[#f4c752] truncate mb-1">{nft.name}</p>
                          <p
                            className="text-[10px] font-bold uppercase tracking-wider"
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
              <div className="bg-[#1b1205]/95 border border-[#f4c752]/25 rounded-2xl p-0 h-[500px] lg:h-[calc(100vh-280px)] relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.4)] hover:border-[#f4c752]/40 transition-all">
                <NFTViewer3D key={selectedNFT?.id} nft={selectedNFT} autoRotate={autoRotate} />

                {/* Control Panel */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-[#1b1205]/95 backdrop-blur-md border border-[#f4c752]/30 rounded-xl px-5 py-3 shadow-lg">
                  <button
                    onClick={() => setAutoRotate(!autoRotate)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                      autoRotate
                        ? 'bg-[#f4c752] text-black shadow-md shadow-[#f4c752]/30'
                        : 'bg-[#2a1f0a] text-[#f4c752] border border-[#f4c752]/30 hover:bg-[#3a2f1a] hover:border-[#f4c752]/50'
                    }`}
                    title={autoRotate ? 'Stop rotation' : 'Auto rotate'}
                  >
                    {autoRotate ? '⏸ Pause' : '▶ Rotate'}
                  </button>

                  <button
                    onClick={() => setShowGallery(!showGallery)}
                    className="lg:hidden px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#2a1f0a] text-[#f4c752] border border-[#f4c752]/30 hover:bg-[#3a2f1a] hover:border-[#f4c752]/50 transition-all duration-300"
                  >
                    {showGallery ? 'Hide Gallery' : 'Show Gallery'}
                  </button>

                  <div className="hidden md:block text-xs text-[#f7dca1]/70 ml-2 font-medium">
                    {selectedNFT?.modelUrl ? 'Drag to rotate • Scroll to zoom' : 'Scroll to zoom • Pan to move'}
                  </div>
                </div>

                {/* NFT Info Overlay */}
                {selectedNFT && (
                  <div className="absolute top-4 left-4 bg-[#1b1205]/95 backdrop-blur-md border border-[#f4c752]/30 rounded-xl px-5 py-4 max-w-xs shadow-lg">
                    <h3 className="text-[#f4c752] font-bold text-lg mb-2">{selectedNFT.name}</h3>
                    <p
                      className="text-sm font-bold uppercase tracking-wider mb-3"
                      style={{ color: getRarityColor(selectedNFT.rarity || '') }}
                    >
                      {selectedNFT.rarity || 'COMMON'}
                    </p>
                    {selectedNFT.power && (
                      <p className="text-sm text-[#f7dca1]/80">
                        Power: <span className="text-[#f4c752] font-bold">{selectedNFT.power}</span>
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
