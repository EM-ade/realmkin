"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { FaDiscord, FaRegFileAlt } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { useWeb3 } from "@/contexts/Web3Context";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { formatAddress } from "@/utils/formatAddress";

const NAV_LINKS = [
  { key: "home", label: "Home", href: "/" },
  { key: "void", label: "The Void", href: "#", disabled: true },
  { key: "fusion", label: "Fusion", href: "#", disabled: true },
  { key: "staking", label: "Staking", href: "/staking" },
  { key: "game", label: "Game", href: "/game" },
  { key: "merches", label: "Merches", href: "/merches" },
];

const MOBILE_MENU_ITEMS = [
  { label: "Home", href: "/", icon: "/dashboard.png" },
  { label: "Wallet", href: "/wallet", icon: "/wallet.png" },
  { label: "Staking", href: "/staking", icon: "/staking.png" },
  { label: "Game", href: "/game", icon: "/game.png" },
  { label: "My NFT", href: "/my-nft", icon: "/flex-model.png" },
  { label: "Merches", href: "/merches", icon: "/merches.png" },
];

type ComingSoonTemplateProps = {
  current: "game" | "merches";
};

export default function ComingSoonTemplate({ current }: ComingSoonTemplateProps) {
  const [showMobileActions, setShowMobileActions] = useState(false);
  const mobileActionsRef = useRef<HTMLDivElement | null>(null);

  const {
    connectWallet,
    disconnectWallet,
    isConnected,
    isConnecting,
    account,
  } = useWeb3();
  const { setVisible: setWalletModalVisible } = useWalletModal();

  useEffect(() => {
    if (!showMobileActions) return;

    const handlePointer = (event: MouseEvent) => {
      if (!mobileActionsRef.current?.contains(event.target as Node)) {
        setShowMobileActions(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowMobileActions(false);
      }
    };

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showMobileActions]);

  const formattedAddress = account ? formatAddress(account, 4, 4) : null;

  const handleConnectClick = async () => {
    try {
      if (isConnected) {
        await disconnectWallet();
      } else {
        if (setWalletModalVisible) {
          setWalletModalVisible(true);
        } else {
          await connectWallet();
        }
      }
    } catch (error) {
      console.error("Wallet interaction failed", error);
    } finally {
      setShowMobileActions(false);
    }
  };

  const navItems = useMemo(
    () =>
      NAV_LINKS.map((item) => ({
        ...item,
        current: item.key === current,
      })),
    [current]
  );

  return (
    <div className="relative min-h-screen bg-[#050302] text-[#f4c752] overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(244,199,82,0.2),rgba(5,3,2,0.95))]" aria-hidden="true" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#050302]/30 via-transparent to-[#050302]" aria-hidden="true" />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-20 pt-10 lg:px-10">
        <header className="flex flex-col gap-4">
          <div className="flex flex-row items-center justify-between gap-3">
            {/* <Link href="/" className="flex items-center space-x-3">
              <div className="w-14 h-14 animate-float">
                <Image
                  src="/realmkin-logo.png"
                  alt="Realmkin Logo"
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                />
              </div>
              <h1 className="font-bold text-lg w-1/2 uppercase tracking-wider gold-gradient-text">
                THE REALMKIN
              </h1>
            </Link> */}

            <div className="hidden items-center gap-3 md:flex">
              {isConnected && formattedAddress && (
                <span className="rounded-xl border border-[#f4c752]/25 bg-black/30 px-3 py-1 text-xs uppercase tracking-[0.26em] text-[#f7dca1]/70">
                  {formattedAddress}
                </span>
              )}
              <button
                onClick={handleConnectClick}
                disabled={isConnecting}
                className="rounded-full border border-[#f4c752] bg-[#f4c752] px-5 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-black transition hover:scale-[1.03] disabled:opacity-70"
              >
                {isConnected ? "Disconnect" : isConnecting ? "Connecting…" : "Connect Wallet"}
              </button>
            </div>

            <div className="md:hidden">
              <button
                onClick={() => setShowMobileActions((value) => !value)}
                className="flex items-center gap-2 bg-[#0B0B09] px-3 py-2 rounded-lg border border-[#404040] text-[#DA9C2F] font-medium text-sm hover:bg-[#1a1a1a] transition-colors"
                aria-expanded={showMobileActions}
                aria-haspopup="true"
              >
                <span className={`text-xs transition-transform ${showMobileActions ? "rotate-180" : ""}`}>...</span>
              </button>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-5 text-xs uppercase tracking-[0.28em] text-[#f7dca1]/70">
            {/* {navItems.map((item) => {
              const classes = [
                "transition-colors",
                item.current ? "text-[#f4c752]" : "",
                item.disabled ? "cursor-default opacity-40" : "hover:text-[#f4c752]",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={classes}
                  aria-current={item.current ? "page" : undefined}
                  aria-disabled={item.disabled || undefined}
                >
                  {item.label}
                </Link>
              );
            })} */}
          </nav>
        </header>

        {isConnected && account && showMobileActions && (
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
                  {MOBILE_MENU_ITEMS.map((item) => (
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
                </nav>

                <div className="px-5 py-4 border-t border-[#1f1f1f]">
                  <div className="flex items-center justify-end gap-3 w-full">
                    <div
                      className={`relative h-10 w-16 rounded-full border transition-all duration-300 ease-out ${
                        isConnected ? "border-[#DA9C2F] bg-[#DA9C2F]" : "border-[#DA9C2F] bg-[#0B0B09]"
                      }`}
                      aria-hidden="true"
                    >
                      <div
                        className={`absolute top-1 h-8 w-8 rounded-full transition-all duration-300 ease-out ${
                          isConnected ? "right-1 bg-[#DA9C2F] border border-[#0B0B09]" : "left-1 bg-[#0B0B09] border border-[#DA9C2F]"
                        }`}
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
                      className={`flex-1 flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition-colors ${
                        isConnected
                          ? "bg-[#DA9C2F] text-black border-[#DA9C2F] hover:bg-[#f0b94a]"
                          : "bg-[#0B0B09] text-[#DA9C2F] border-[#DA9C2F] hover:bg-[#1a1a1a]"
                      }`}
                    >
                      <span>{isConnected ? "Connected" : isConnecting ? "Connecting…" : "Connect Wallet"}</span>
                      <span className={`flex items-center gap-2 text-xs ${isConnected ? "text-black" : "text-[#DA9C2F]"}`}>
                        <Image src="/wallet.png" alt="Wallet connect" width={16} height={16} className="w-4 h-4" />
                        {isConnecting ? "Loading…" : isConnected ? "Synced" : "Secure"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        <main className="flex flex-1 flex-col items-center justify-center gap-10 mt-20 text-center">
          <div className="relative flex w-full max-w-2xl flex-col items-center gap-8 rounded-3xl border border-[#f4c752]/25 bg-[#0c0903]/95 px-10 py-16 shadow-[0_40px_90px_rgba(0,0,0,0.55)]">
            <div className="absolute -top-28 flex h-40 w-40 items-center justify-center rounded-full bg-[#f4c752]/10 border border-[#f4c752]/40 shadow-[0_20px_45px_rgba(244,199,82,0.35)]">
              <Image
                src="/realmkin.png"
                alt="Realmkin seal"
                width={220}
                height={220}
                className="h-36 w-36 object-contain"
                priority
              />
            </div>

            <div className="mt-20 space-y-3">
              <h2 className="text-5xl font-bold text-[#f4c752]" style={{ fontFamily: "var(--font-amnestia)" }}>
                Coming Soon
              </h2>
              <p className="text-lg text-[#f7dca1]/85">
                This realm is not yet unlocked.
                <br />
                Stay tuned, warrior.
              </p>
            </div>

            <div className="flex w-full flex-col gap-4">
              <button className="rounded-full bg-[#f4c752] px-8 py-4 text-sm font-semibold uppercase tracking-[0.32em] text-black shadow-[0_14px_40px_rgba(244,199,82,0.35)] transition hover:scale-[1.03]">
                Notify Me
              </button>
              <Link
                href="/"
                className="rounded-full border border-[#f4c752]/60 bg-transparent px-8 py-4 text-sm font-semibold uppercase tracking-[0.32em] text-[#f4c752] transition hover:bg-[#f4c752]/10"
              >
                Back to Home
              </Link>
            </div>

            <div className="flex items-center justify-center gap-6 text-[#f7dca1]/70 text-base uppercase tracking-[0.22em]">
              <a
                href="https://discord.gg/vwwbjFb4vQ"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 transition hover:text-[#f4c752]"
              >
                <FaDiscord className="text-xl" />
                
              </a>
              <span>•</span>
              <a
                href="https://x.com/therealmkin?t=4GSXlbvQ_t3Tkz-VilvuNg&s=09"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 transition hover:text-[#f4c752]"
              >
                <FaXTwitter className="text-xl" />
                
              </a>
              <span>•</span>
              <a
                href="/TheRealmkinWhitePaper.pdf"
                className="flex items-center gap-2 transition hover:text-[#f4c752]"
              >
                <FaRegFileAlt className="text-lg" />
                
              </a>
            </div>
          </div>

          <p className="text-xs uppercase tracking-[0.24em] text-[#f7dca1]/65">
            Powered by $MKIN — The lifeblood of The Void.
          </p>
        </main>
      </div>
    </div>
  );
}
