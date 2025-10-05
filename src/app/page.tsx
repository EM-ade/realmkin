"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useWeb3 } from "@/contexts/Web3Context";
import { formatAddress } from "@/utils/formatAddress";
import SocialLinks from "@/components/SocialLinks";
import NFTCarousel from "@/components/NFTCarousel";
import DesktopNavigation from "@/components/DesktopNavigation";
import React from "react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { getAuth } from "firebase/auth";
import { rewardsService, UserRewards } from "@/services/rewardsService";

export default function Home() {
  // Discord link status
  const [discordLinked, setDiscordLinked] = useState<boolean>(false);
  const gatekeeperBase = process.env.NEXT_PUBLIC_GATEKEEPER_BASE || "https://gatekeeper-bot.fly.dev";
  const [discordConnecting, setDiscordConnecting] = useState(false);
  const [unifiedBalance, setUnifiedBalance] = useState<number | null>(null);
  const [discordUnlinking, setDiscordUnlinking] = useState(false);
  const [showDiscordMenu, setShowDiscordMenu] = useState(false);
  const [showMobileActions, setShowMobileActions] = useState(false);
  const mobileActionsRef = useRef<HTMLDivElement | null>(null);
  const backgroundVideoRef = useRef<HTMLVideoElement | null>(null);
  const [userRewards, setUserRewards] = useState<UserRewards | null>(null);

  const router = useRouter();
  const { user, userData } = useAuth();
  const {
    connectWallet,
    account: walletAddress,
    disconnectWallet,
    isConnected,
    isConnecting,
  } = useWeb3();
  const { setVisible: setWalletModalVisible } = useWalletModal();

  // Check if user is logged in, redirect to login if not
  useEffect(() => {
    if (!user && !isConnected) {
      router.push('/login');
    }
  }, [user, isConnected, router]);

  useEffect(() => {
    const video = backgroundVideoRef.current;
    if (!video) return;

    const playVideo = () => {
      try {
        const maybePromise = video.play();
        if (maybePromise !== undefined) {
          maybePromise.catch(() => {
            /* Ignore autoplay restrictions */
          });
        }
      } catch {
        /* Ignore playback errors */
      }
    };

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      playVideo();
      return;
    }

    video.addEventListener("loadeddata", playVideo);

    return () => {
      video.removeEventListener("loadeddata", playVideo);
    };
  }, []);


  useEffect(() => {
    if (!isConnected) {
      setShowMobileActions(false);
      setShowDiscordMenu(false);
    }
  }, [isConnected]);

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
    if (!discordLinked) {
      setShowDiscordMenu(false);
    }
  }, [discordLinked]);

  useEffect(() => {
    if (!isConnected) {
      setShowMobileActions(false);
    }
  }, [isConnected]);

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

  const handleDiscordConnect = () => {
    if (discordLinked || discordConnecting) return;
    setDiscordConnecting(true);
    if (typeof window !== "undefined") {
      window.location.assign("/api/discord/login");
    }
  };

  const handleDiscordDisconnect = async (): Promise<boolean> => {
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
  };

  // Navigation items for the dashboard
  const navigationItems = [
    { label: "Wallet", href: "/wallet", icon: "/wallet.png", description: "Manage your tokens and transactions" },
    { label: "My NFTs", href: "/my-nft", icon: "/flex-model.png", description: "View and manage your WardenKin collection" },
    { label: "Staking", href: "#", icon: "/staking.png", description: "Stake your tokens to earn rewards", disabled: true },
    { label: "Game", href: "#", icon: "/game.png", description: "Enter The Void and battle", disabled: true },
    { label: "Merches", href: "#", icon: "/merches.png", description: "Official Realmkin merchandise", disabled: true },
  ];

  return (
    <div className="min-h-screen min-h-[100dvh] relative overflow-hidden bg-[#865900]">
      {/* Background Video */}
      <video
        ref={backgroundVideoRef}
        className="absolute inset-0 w-full h-full object-cover"
        preload="none"
        poster="/Loading-Screen-poster.jpg"
        loop
        muted
        playsInline
        style={{ objectFit: "cover" }}
      >
        <source src="/Loading-Screen.webm" type="video/webm" />
        <source src="/Loading-Screen.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-[#865900] opacity-80"></div>
      <div
        className="absolute inset-0 mix-blend-screen"
        style={{
          background:
            "radial-gradient(circle at center, rgba(236, 187, 27, 0.85) 0%, rgba(236, 187, 27, 0.65) 35%, rgba(134, 89, 0, 0.5) 70%, rgba(134, 89, 0, 0.9) 100%)",
        }}
      ></div>
      <div className="absolute inset-0 bg-gradient-to-br from-[#865900]/90 via-[#b47a0a]/75 to-[#6a4700]/85 mix-blend-multiply"></div>
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="home-aurora aurora-one"></div>
        <div className="home-aurora aurora-two"></div>
        <div className="home-aurora aurora-three"></div>
      </div>

      {/* Content Wrapper */}
      <div className="relative min-h-screen flex flex-col">
        {/* Mobile Header */}
        <header className="lg:hidden relative z-10 flex flex-row justify-between items-center gap-3 p-6 text-black">
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
            <h1 className="font-bold text-lg uppercase tracking-wider text-black" style={{ fontFamily: "var(--font-amnestia)" }}>
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

                {isConnected && walletAddress && (
                  <div className="px-5 py-4 border-t border-[#1f1f1f]">
                    <div className="flex flex-col gap-3">
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
                        className="w-full flex items-center justify-between gap-3 rounded-2xl border border-[#DA9C2F] bg-[#0B0B09] px-4 py-3 text-sm font-medium text-[#DA9C2F] transition-colors hover:bg-[#151515] disabled:opacity-70"
                      >
                        <span>{discordLinked ? 'Disconnect Discord' : discordConnecting ? 'Connecting…' : 'Connect Discord'}</span>
                        <span className="text-xs opacity-70">{discordLinked ? 'Linked' : 'Secure'}</span>
                      </button>

                      <div className="flex items-center justify-between gap-3 w-full">
                        <div
                          className="relative h-10 w-16 rounded-full border border-[#DA9C2F] bg-[#DA9C2F] transition-all duration-300 ease-out"
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
                          className="flex-1 flex items-center justify-between gap-3 rounded-2xl border border-[#DA9C2F] bg-[#0B0B09] px-4 py-3 text-sm font-medium text-[#DA9C2F] transition-colors hover:bg-[#151515] disabled:opacity-70"
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
      <main className={`relative z-10 flex-1 flex flex-col items-center justify-center px-6 lg:px-12 xl:px-16 py-12 transition-opacity duration-300 ${showMobileActions ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div className="text-center text-black mb-12 space-y-3 max-w-3xl">
          <h2
            className="home-heading text-5xl sm:text-5xl lg:text-6xl font-extrabold tracking-[0.1em]"
            style={{ fontFamily: "var(--font-amnestia)" }}
          >
            WELCOME TO
          </h2>
          <h3
            className="home-heading-delay text-5xl sm:text-4xl lg:text-5xl font-extrabold tracking-[0.1em]"
            style={{ fontFamily: "var(--font-amnestia)" }}
          >
            THE REALM
          </h3>
          <p className="text-xl sm:text-xl font-medium">
            Own your power. Summon your WardenKin. Forge your legacy.
          </p>
        </div>

        {/* Main Content Container */}
        <div className="w-full max-w-7xl mx-auto animate-fade-in-up px-4 lg:px-0">
          <div className="home-card bg-[#1b1205]/95 border border-black/40 rounded-2xl shadow-[0_35px_80px_rgba(0,0,0,0.45)] px-6 lg:px-12 py-12">
            
            {/* Welcome Section */}
            <div className="text-center mb-12">
              <h3 className="text-3xl font-bold text-[#f4c752] mb-4" style={{ fontFamily: "var(--font-amnestia)" }}>
                WELCOME TO THE REALM
              </h3>
              <p className="text-lg text-[#f7dca1] leading-relaxed max-w-3xl mx-auto">
                Battle in The Void — a nonstop PvE arena. Train your warriors to Fight, Fuse, and Revive. 
                Earn XP, Kill Coins, and ₥KIN. Level up, claim rewards, and rise on the leaderboard.
              </p>
            </div>

            {/* Featured NFTs */}
            <div className="mb-12">
              <NFTCarousel />
            </div>

            {/* Navigation Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {navigationItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.disabled ? "#" : item.href}
                  className={`group relative bg-gradient-to-br from-[#2a1f0a] to-[#1a1205] border-2 border-[#f4c752]/30 rounded-xl p-6 transition-all duration-300 hover:border-[#f4c752] hover:shadow-lg hover:shadow-[#f4c752]/20 ${
                    item.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02]'
                  }`}
                >
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-12 h-12 rounded-lg bg-[#f4c752]/10 flex items-center justify-center group-hover:bg-[#f4c752]/20 transition-colors">
                      <Image
                        src={item.icon}
                        alt={`${item.label} icon`}
                        width={24}
                        height={24}
                        className="w-6 h-6 object-contain"
                      />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-[#f4c752] group-hover:text-[#ffe9b5] transition-colors" style={{ fontFamily: "var(--font-amnestia)" }}>
                        {item.label}
                        {item.disabled && <span className="text-sm ml-2 text-[#f4c752]/60">(Coming Soon)</span>}
                      </h4>
                    </div>
                  </div>
                  <p className="text-[#f7dca1]/80 text-sm leading-relaxed">
                    {item.description}
                  </p>
                  {!item.disabled && (
                    <div className="absolute top-4 right-4 text-[#f4c752]/60 group-hover:text-[#f4c752] transition-colors">
                      →
                    </div>
                  )}
                </Link>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="border-t border-[#f4c752]/20 pt-8">
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {!isConnected ? (
                  <Link
                    href="/login"
                    className="bg-[#DA9C2F] text-black font-bold py-3 px-8 rounded-xl border border-[#DA9C2F] transition-transform duration-200 hover:scale-[1.02] text-center uppercase tracking-widest"
                    style={{ fontFamily: "var(--font-amnestia)" }}
                  >
                    Connect Wallet
                  </Link>
                ) : (
                  <>
                    <button
                      onClick={() => router.push('/wallet')}
                      className="bg-[#DA9C2F] text-black font-bold py-3 px-8 rounded-xl border border-[#DA9C2F] transition-transform duration-200 hover:scale-[1.02] uppercase tracking-widest"
                      style={{ fontFamily: "var(--font-amnestia)" }}
                    >
                      View Wallet
                    </button>
                    <button
                      onClick={() => router.push('/my-nft')}
                      className="bg-black/80 text-[#DA9C2F] font-bold py-3 px-8 rounded-xl border border-[#DA9C2F] transition-colors duration-200 hover:bg-black uppercase tracking-widest"
                      style={{ fontFamily: "var(--font-amnestia)" }}
                    >
                      My NFTs
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

        {/* Footer - Social Links */}
        <footer className={`relative z-10 text-center p-6 lg:p-8 transition-opacity duration-300 ${showMobileActions ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <SocialLinks />
        </footer>

        {/* AnimatedRoadmap and AnimatedWhitepaper temporarily disabled */}
      </div>
      <style jsx>{`
        .home-aurora {
          position: absolute;
          width: 60vw;
          height: 60vw;
          min-width: 420px;
          min-height: 420px;
          filter: blur(120px);
          opacity: 0.3;
          border-radius: 50%;
          mix-blend-mode: screen;
          animation: auroraMove 16s ease-in-out infinite;
        }

        .aurora-one {
          background: radial-gradient(circle, rgba(255,212,121,0.55) 0%, rgba(134,89,0,0) 70%);
          top: -15%;
          left: -10%;
        }

        .aurora-two {
          background: radial-gradient(circle, rgba(255,242,191,0.5) 0%, rgba(134,89,0,0) 70%);
          bottom: -20%;
          right: -15%;
          animation-delay: 4s;
        }

        .aurora-three {
          background: radial-gradient(circle, rgba(255,175,64,0.45) 0%, rgba(134,89,0,0) 70%);
          top: 30%;
          right: -25%;
          animation-delay: 8s;
        }

        @keyframes auroraMove {
          0%, 100% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          50% {
            transform: translate3d(-5%, 6%, 0) scale(1.15);
          }
        }

        .home-heading {
          animation: headingReveal 1s ease-out forwards;
          opacity: 0;
        }

        .home-heading-delay {
          animation: headingReveal 1s ease-out forwards;
          animation-delay: 0.25s;
          opacity: 0;
        }

        @keyframes headingReveal {
          0% {
            opacity: 0;
            transform: translateY(12px);
            text-shadow: none;
          }
          100% {
            opacity: 1;
            transform: translateY(0);
            text-shadow: 0 0 24px rgba(255, 207, 92, 0.45);
          }
        }

        .home-card {
          position: relative;
          animation: cardGlow 6s ease-in-out infinite;
        }

        .home-card::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: linear-gradient(135deg, rgba(255, 221, 128, 0.2), rgba(255, 165, 0, 0.05));
          opacity: 0;
          pointer-events: none;
          animation: cardAura 6s ease-in-out infinite;
        }

        @keyframes cardGlow {
          0%, 100% {
            box-shadow: 0 25px 60px rgba(0, 0, 0, 0.4);
          }
          50% {
            box-shadow: 0 35px 80px rgba(255, 196, 77, 0.35);
          }
        }

        @keyframes cardAura {
          0%, 100% {
            opacity: 0.08;
          }
          50% {
            opacity: 0.22;
          }
        }
      `}</style>
    </div>
  );
}
