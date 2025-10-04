"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useWeb3 } from "@/contexts/Web3Context";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { formatAddress } from "@/utils/formatAddress";

const LOCK_OPTIONS = [
  { label: "Flexible", value: "flexible" },
  { label: "30 Days", value: "30" },
  { label: "90 Days", value: "90" },
];

const BOOST_PRESETS = [
  { label: "25%", value: 0.25 },
  { label: "50%", value: 0.5 },
  { label: "100%", value: 1 },
];

const NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "The Void", href: "#", disabled: true },
  { label: "Fusion", href: "#", disabled: true },
  { label: "Staking", href: "/staking", current: true },
];

export default function StakingPage() {
  const [amount, setAmount] = useState("");
  const [selectedLock, setSelectedLock] = useState("flexible");
  const [selectedBoost, setSelectedBoost] = useState<number | null>(null);
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

  const mockWallet = useMemo(
    () => ({
      address: "0x1234...ABCD",
      balance: 1234,
      staked: 500,
      rewards: 25,
    }),
    []
  );

  const mockMetrics = useMemo(
    () => ({
      totalValueLocked: 123456,
      totalStakers: 4321,
    }),
    []
  );

  return (
    <div className="relative min-h-screen bg-[#050302] text-[#f4c752]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-16 pt-10 lg:px-10">
        <header className="flex flex-col gap-4">
          <div className="flex flex-row items-center justify-between gap-3">
            <Link href="/" className="flex items-center space-x-3">
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
            </Link>

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

          <nav className="flex items-center gap-6 text-xs uppercase tracking-[0.28em] text-[#f7dca1]/70">
            {/* {NAV_ITEMS.map((item) => {
              const isCurrent = item.current;
              const isDisabled = item.disabled;
              const classes = [
                "transition-colors",
                isCurrent ? "text-[#f4c752]" : "",
                isDisabled ? "cursor-default opacity-40" : "hover:text-[#f4c752]",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={classes}
                  aria-current={isCurrent ? "page" : undefined}
                  aria-disabled={isDisabled || undefined}
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
                </nav>

                <div className="px-5 py-4 border-t border-[#1f1f1f]">
                  <div className="flex items-center justify-end gap-3 w-full">
                    <div
                      className={`relative h-10 w-16 rounded-full border transition-all duration-300 ease-out ${isConnected ? "border-[#DA9C2F] bg-[#DA9C2F]" : "border-[#DA9C2F] bg-[#0B0B09]"}`}
                      aria-hidden="true"
                    >
                      <div
                        className={`absolute top-1 h-8 w-8 rounded-full border border-[#DA9C2F] bg-black transition-all duration-300 ease-out ${isConnected ? "right-1" : "left-1"}`}
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
                      <span>{isConnected ? "Connected" : isConnecting ? "Connecting…" : "Connect Wallet"}</span>
                      <span className="flex items-center gap-2 text-xs text-[#DA9C2F]">
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

        <main className="flex flex-col gap-10">
          <section className="flex flex-col items-center gap-4 text-center">
            <h1
              className="text-4xl font-bold uppercase tracking-[0.18em] text-[#f4c752] sm:text-5xl"
              style={{ fontFamily: "var(--font-amnestia)" }}
            >
              Stake Your $MKIN, Multiply Your Rewards
            </h1>
            <p className="max-w-2xl text-base text-[#f7dca1]/85 sm:text-lg">
              Lock your $MKIN and earn boosted yields from The Void treasury.
            </p>
            <button className="mt-2 rounded-full bg-[#f4c752] px-8 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-black shadow-[0_10px_30px_rgba(244,199,82,0.35)] transition hover:scale-[1.02]">
              Start Staking
            </button>
          </section>

          <section className="staking-card staking-card--compact overflow-hidden">
            <div className="flex flex-col md:flex-row">
              <div className="staking-card-section">
                <h2 className="staking-card-title">Wallet</h2>
                <div className="mt-5 space-y-5 text-[#f7dca1]">
                  <div>
                    <p className="staking-label">Address</p>
                    <p className="staking-value">{mockWallet.address}</p>
                  </div>
                  <div>
                    <p className="staking-label">Wallet Balance</p>
                    <p className="staking-value">{mockWallet.balance} $MKIN</p>
                  </div>
                  <div>
                    <p className="staking-label">Staked Balance</p>
                    <p className="staking-value">{mockWallet.staked} $MKIN</p>
                  </div>
                  <div>
                    <p className="staking-label">Rewards Earned</p>
                    <p className="staking-value">{mockWallet.rewards} $MKIN</p>
                  </div>
                </div>
              </div>

              <div className="staking-card-section">
                <h2 className="staking-card-title">Stake / Unstake</h2>
                <div className="mt-5 flex flex-col gap-4">
                  <input
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    className="rounded-xl bg-black/45 px-4 py-3 text-sm text-[#f7dca1] placeholder:text-[#f7dca1]/40 focus:outline-none focus:ring-2 focus:ring-[#f4c752]/60"
                    placeholder="Enter $MKIN amount"
                    type="number"
                    min="0"
                  />
                  <div className="flex items-center justify-between gap-2">
                    {BOOST_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => setSelectedBoost(preset.value)}
                        className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold uppercase tracking-[0.2em] transition ${
                          selectedBoost === preset.value
                            ? "border-[#f4c752] bg-[#f4c752] text-black"
                            : "border-[#f4c752]/40 bg-black/40 text-[#f7dca1]/80 hover:border-[#f4c752]/70"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <button className="flex-1 rounded-xl bg-[#f4c752] py-3 text-sm font-semibold uppercase tracking-[0.28em] text-black transition hover:scale-[1.01]">
                      Stake $MKIN
                    </button>
                    <button className="flex-1 rounded-xl border border-[#f4c752]/50 bg-black/40 py-3 text-sm font-semibold uppercase tracking-[0.28em] text-[#f7dca1] transition hover:border-[#f4c752]/80">
                      Unstake $MKIN
                    </button>
                  </div>
                </div>
              </div>

              <div className="staking-card-section">
                <h2 className="staking-card-title">Rewards & Metrics</h2>
                <div className="mt-5 flex flex-col gap-6">
                  <div className="relative mx-auto flex h-32 w-32 items-center justify-center rounded-full border-2 border-[#f4c752]/40 bg-black/25 shadow-[0_0_30px_rgba(244,199,82,0.18)]">
                    <div className="text-center">
                      <p className="text-sm uppercase tracking-[0.26em] text-[#f7dca1]/60">xx %</p>
                      <p className="text-xs uppercase tracking+[0.32em] text-[#f7dca1]/45">APY Boost</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="staking-label">Total Value Locked</p>
                      <p className="staking-value">${mockMetrics.totalValueLocked.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="staking-label">Total Stakers</p>
                      <p className="staking-value">{mockMetrics.totalStakers.toLocaleString()} wallets</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="staking-card">
            <div className="staking-card-body grid gap-6 md:grid-cols-2">
              <div className="flex flex-col gap-4">
                <h3 className="staking-card-title">Locking Options</h3>
                <div className="flex flex-wrap gap-3">
                  {LOCK_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSelectedLock(option.value)}
                      className={`rounded-xl border px-4 py-2 text-sm font-semibold uppercase tracking-[0.22em] transition ${
                        selectedLock === option.value
                          ? "border-[#f4c752] bg-[#f4c752] text-black"
                          : "border-[#f4c752]/50 bg-black/40 text-[#f7dca1]/80 hover:border-[#f4c752]/70"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <h3 className="staking-card-title">Rewards Timeline</h3>
                <div className="h-3 w-full rounded-full border border-[#f4c752]/40 bg-black/40">
                  <div className="h-full w-4/5 rounded-full bg-gradient-to-r from-[#f4c752] via-[#f4c752]/80 to-[#f4c752]/40 shadow-[0_0_18px_rgba(244,199,82,0.45)]" />
                </div>
                <p className="text-xs uppercase tracking-[0.2em] text-[#f7dca1]/60">
                  Payouts every 7 days based on selected lock duration.
                </p>
              </div>
            </div>
          </section>

          <footer className="staking-card items-center text-center">
            <div className="staking-card-body flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <p className="text-sm uppercase tracking-[0.24em] text-[#f7dca1]/70">
                Powered by $MKIN — The lifeblood of The Void
              </p>
              <div className="flex justify-center gap-4 text-xs uppercase tracking-[0.22em] text-[#f7dca1]/70">
                <Link href="#" className="flex items-center gap-2 transition hover:text-[#f4c752]">
                  <span>👥</span>
                  <span>Discord</span>
                </Link>
                <Link href="#" className="flex items-center gap-2 transition hover:text-[#f4c752]">
                  <span>📄</span>
                  <span>Whitepaper</span>
                </Link>
              </div>
            </div>
          </footer>
        </main>
      </div>

      <style jsx>{`
        .staking-card {
          background: linear-gradient(180deg, rgba(12, 8, 3, 0.95) 0%, rgba(6, 4, 1, 0.92) 100%);
          border: 1px solid rgba(244, 199, 82, 0.25);
          border-radius: 24px;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.4);
          padding: 24px;
        }

        .staking-card--compact {
          padding: 0;
        }

        .staking-card-section {
          flex: 1;
          padding: 24px;
        }

        .staking-card--compact .staking-card-section + .staking-card-section {
          border-top: 1px solid rgba(244, 199, 82, 0.18);
        }

        @media (min-width: 768px) {
          .staking-card--compact .staking-card-section + .staking-card-section {
            border-top: none;
            border-left: 1px solid rgba(244, 199, 82, 0.18);
          }
        }

        .staking-card-title {
          font-family: var(--font-gothic-cg);
          letter-spacing: 0.26em;
          text-transform: uppercase;
          font-size: 0.85rem;
          color: rgba(247, 220, 161, 0.75);
        }

        .staking-card-body {
          margin-top: 18px;
          color: #f7dca1;
        }

        .staking-label {
          font-size: 0.7rem;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: rgba(247, 220, 161, 0.6);
        }

        .staking-value {
          margin-top: 6px;
          font-size: 1rem;
          font-weight: 600;
          letter-spacing: 0.12em;
          color: #f4c752;
        }
      `}</style>
    </div>
  );
}
