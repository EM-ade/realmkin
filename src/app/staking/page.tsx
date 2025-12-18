"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import withAuthGuard from "@/components/withAuthGuard";
import Image from "next/image";
import Link from "next/link";
import { useWeb3 } from "@/contexts/Web3Context";
import { useStaking } from "@/contexts/StakingContext";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { formatAddress } from "@/utils/formatAddress";
import { getAPYForLockPeriod, estimateRewards } from "@/config/staking.config";
import { toast } from "react-hot-toast";
import { StakingError, errorMessages } from "@/errors/StakingError";
import MobileMenuOverlay from "@/components/MobileMenuOverlay";
import { NAV_ITEMS } from "@/config/navigation";
import { useDiscord } from "@/contexts/DiscordContext";

import { useAuth } from "@/contexts/AuthContext";

const LOCK_OPTIONS: Array<{ label: string; value: "flexible" | "30" | "60" | "90" }> = [
  { label: "Flexible", value: "flexible" },
  { label: "30 Days", value: "30" },
  { label: "60 Days", value: "60" },
  { label: "90 Days", value: "90" },
];

const BOOST_PRESETS = [
  { label: "25%", value: 0.25 },
  { label: "50%", value: 0.5 },
  { label: "100%", value: 1 },
];


function StakingPage() {
  const [amount, setAmount] = useState("");
  const [selectedLock, setSelectedLock] = useState<"flexible" | "30" | "60" | "90">("flexible");
  const [selectedBoost, setSelectedBoost] = useState(0);
  const [isStaking, setIsStaking] = useState(false);
  const [isUnstaking, setIsUnstaking] = useState(false);
  const [showMobileActions, setShowMobileActions] = useState(false);
  const mobileActionsRef = useRef<HTMLDivElement | null>(null);

  const { userData } = useAuth();

  const {
    connectWallet,
    disconnectWallet,
    isConnected,
    isConnecting,
    account,
    uid,
  } = useWeb3();

  const {
    discordLinked,
    discordConnecting,
    discordUnlinking,
    connectDiscord,
    disconnectDiscord,
  } = useDiscord();

  const gatekeeperBase = process.env.NEXT_PUBLIC_GATEKEEPER_BASE || "https://gatekeeper-bot.fly.dev";

  const {
    stakes,
    totalStaked,
    totalRewards,
    walletBalance,
    globalTVL,
    totalStakers,
    refreshAll,
    createStake,
  } = useStaking();

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


  // Calculate estimated rewards based on current inputs
  const estimatedRewards = useMemo(() => {
    if (!amount || isNaN(parseFloat(amount))) return 0;
    const lockDays = selectedLock === "flexible" ? 0 : selectedLock === "30" ? 30 : selectedLock === "60" ? 60 : 90;
    const apy = getAPYForLockPeriod(selectedLock);
    return estimateRewards(parseFloat(amount), lockDays, apy);
  }, [amount, selectedLock]);

  // Handle stake button click
  const handleStake = async () => {
    if (!amount || isStaking) return;

    let toastId: string | undefined;
    setIsStaking(true);
    try {
      toastId = toast.loading("Processing stake…", { duration: Infinity }) as unknown as string;
      const result = await createStake(parseFloat(amount), selectedLock);
      console.log("Stake created:", result);
      if (toastId) {
        toast.success(`Stake successful!\n\nTransaction ID: ${result.stakeEntry}\n\nYour ${selectedLock === "flexible" ? "flexible" : selectedLock + "-day"} stake of ${amount} $MKIN is now earning rewards!\n\nAPY: ${getAPYForLockPeriod(selectedLock)}%`, { id: toastId, duration: 5000 });
      }
      setAmount("");
      setSelectedBoost(0);
    } catch (error) {
      console.error("Stake failed:", error);
      const msg = error instanceof StakingError ? errorMessages[error.code] : errorMessages.UNKNOWN;
      toast.error(msg, toastId ? { id: toastId } : undefined);
    } finally {
      setIsStaking(false);
    }
  };
  // Handle unstake button click
  const handleUnstake = async (stakeEntry: string) => {
    if (isUnstaking || !account || !uid) {
      toast.error("Please ensure your wallet is connected and you are authenticated.");
      return;
    }

    const stakeToUnstake = stakes.find(s => s.stakeEntry === stakeEntry);
    if (!stakeToUnstake) {
      toast.error("Stake not found");
      return;
    }

    // Calculate penalty if locked
    let penaltyPercent = 0;
    if (!stakeToUnstake.isUnlocked) {
      if (stakeToUnstake.lockPeriod === "flexible") {
        // No penalty for flexible
        penaltyPercent = 0;
      } else if (stakeToUnstake.lockPeriod === "30") {
        penaltyPercent = 10;
      } else if (stakeToUnstake.lockPeriod === "60") {
        penaltyPercent = 15;
      } else if (stakeToUnstake.lockPeriod === "90") {
        penaltyPercent = 20;
      }
    }

    const penalty = (stakeToUnstake.amount * penaltyPercent) / 100;
    const amountToReturn = stakeToUnstake.amount - penalty;
    const rewardsToReturn = stakeToUnstake.isUnlocked ? stakeToUnstake.rewards : 0;

    let confirmMessage = `Unstake ${stakeToUnstake.amount} $MKIN?\n\n`;
    if (stakeToUnstake.isUnlocked) {
      confirmMessage += `✅ Lock period ended\n\nYou will receive:\n- ${amountToReturn.toFixed(2)} $MKIN (principal)\n- ${rewardsToReturn.toFixed(2)} $MKIN (rewards)\n- Total: ${(amountToReturn + rewardsToReturn).toFixed(2)} $MKIN`;
    } else {
      confirmMessage += `⚠️ Early unstake penalty: ${penaltyPercent}%\n\nYou will receive:\n- ${amountToReturn.toFixed(2)} $MKIN (after ${penaltyPercent}% penalty)\n- $0 in rewards (forfeited)\n\nPenalty amount: ${penalty.toFixed(2)} $MKIN`;
    }

    const confirmed = confirm(confirmMessage);
    if (!confirmed) return;

    setIsUnstaking(true);
    try {
      // Call API to unstake and transfer tokens
      const response = await fetch("/api/unstake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid,
          wallet: account,
          stakeId: stakeEntry,
          action: "complete",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to unstake");
      }

      // Immediate success feedback
      toast.success(`Unstake initiated!\nTx: ${data.txSignature.slice(0, 20)}…\n\nYou will receive:\n- ${data.amountReturned.toFixed(2)} $MKIN (principal)\n- ${data.rewardsReturned.toFixed(2)} $MKIN (rewards)\n\nTokens arriving in your wallet now!`);
    } catch (error) {
      console.error("Unstake failed:", error);
      toast.error(`Unstaking failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsUnstaking(false);
    }
  };

  // Handle boost preset click (sets amount as % of balance)
  const handleBoostPreset = (preset: number) => {
    setSelectedBoost(preset);
    // Use real wallet balance
    setAmount((walletBalance * preset).toString());
  };

  // Wallet data for display
  const walletData = useMemo(
    () => ({
      address: account ? formatAddress(account, 4, 4) : "Not connected",
      balance: walletBalance,
      staked: totalStaked,
      rewards: totalRewards,
    }),
    [account, walletBalance, totalStaked, totalRewards]
  );

  const metrics = useMemo(
    () => ({
      totalValueLocked: globalTVL,
      totalStakers: totalStakers,
    }),
    [globalTVL, totalStakers]
  );

  return (
    <div className="relative min-h-screen bg-[#050302] text-[#f4c752]">
      {/* Mobile Header */}
      <header className="lg:hidden mx-auto w-full max-w-6xl px-6 pt-10 lg:px-10">
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
            <h1 className="font-bold text-lg uppercase tracking-wider gold-gradient-text">
              THE REALMKIN
            </h1>
          </Link>

          {/* Mobile menu button - always visible */}
          <button
            onClick={() => setShowMobileActions((value) => !value)}
            className="flex items-center gap-2 bg-[#0B0B09] px-3 py-2 rounded-lg border border-[#404040] text-[#DA9C2F] font-medium text-sm hover:bg-[#1a1a1a] transition-colors"
            aria-expanded={showMobileActions}
            aria-haspopup="true"
          >
            <span className={`text-xs transition-transform ${showMobileActions ? "rotate-180" : ""}`}>⋯</span>
          </button>
        </div>
      </header>


      <MobileMenuOverlay
        isOpen={showMobileActions}
        onClose={() => setShowMobileActions(false)}
        menuItems={NAV_ITEMS}
        isAdmin={userData?.admin}
        isConnected={isConnected}
        account={account}
        isConnecting={isConnecting}
        discordLinked={discordLinked}
        discordConnecting={discordConnecting}
        discordUnlinking={discordUnlinking}
        onDiscordConnect={() => uid && connectDiscord({ uid } as any)}
        onDiscordDisconnect={() => uid && disconnectDiscord({ uid } as any, gatekeeperBase)}
        onConnectWallet={connectWallet}
        onDisconnectWallet={disconnectWallet}
      />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-16 pt-10 lg:px-10">

        <main className="flex flex-col gap-10 mt-6">
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

          <section className="staking-card staking-card--compact overflow-hidden relative">
            {/* Refresh button */}
            <button
              onClick={refreshAll}
              className="absolute right-5 top-5 flex items-center gap-2 rounded-lg border border-[#f4c752]/40 bg-black/30 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#f4c752] hover:bg-[#f4c752]/10"
            >
              <span className="h-3 w-3 rounded-full border-2 border-transparent border-t-[#f4c752] animate-spin" />
              Refresh
            </button>
            <div className="flex flex-col md:flex-row">
              <div className="staking-card-section">
                <h2 className="staking-card-title">Wallet</h2>
                <div className="mt-5 space-y-5 text-[#f7dca1]">
                  <div>
                    <p className="staking-label">Address</p>
                    <p className="staking-value">{walletData.address}</p>
                  </div>
                  <div>
                    <p className="staking-label">Wallet Balance</p>
                    <p className="staking-value">{walletData.balance} $MKIN</p>
                  </div>
                  <div>
                    <p className="staking-label">Staked Balance</p>
                    <p className="staking-value">{walletData.staked.toFixed(2)} $MKIN</p>
                  </div>
                  <div>
                    <p className="staking-label">Rewards Earned</p>
                    <p className="staking-value">{walletData.rewards.toFixed(2)} $MKIN</p>
                  </div>
                </div>
              </div>

              <div className="staking-card-section">
                <h2 className="staking-card-title">Stake</h2>
                <div className="mt-5 flex flex-col gap-4">
                  <input
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    className="rounded-xl bg-black/45 px-4 py-3 text-sm text-[#f7dca1] placeholder:text-[#f7dca1]/40 focus:outline-none focus:ring-2 focus:ring-[#f4c752]/60"
                    placeholder="Enter $MKIN amount"
                    type="number"
                    min="0"
                  />
                  <select
                    value={selectedLock}
                    onChange={(e) => setSelectedLock(e.target.value as "flexible" | "30" | "60" | "90")}
                    className="rounded-xl bg-black/45 px-4 py-3 text-sm text-[#f7dca1] focus:outline-none focus:ring-2 focus:ring-[#f4c752]/60"
                  >
                    <option value="flexible">Flexible (20% APY)</option>
                    <option value="30">30 Days (48% APY)</option>
                    <option value="60">60 Days (64% APY)</option>
                    <option value="90">90 Days (100% APY)</option>
                  </select>
                  <div className="flex items-center justify-between gap-2">
                    {BOOST_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => handleBoostPreset(preset.value)}
                        className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold uppercase tracking-[0.2em] transition ${selectedBoost === preset.value
                          ? "border-[#f4c752] bg-[#f4c752] text-black"
                          : "border-[#f4c752]/40 bg-black/40 text-[#f7dca1]/80 hover:border-[#f4c752]/70"
                          }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleStake}
                    disabled={!isConnected || isStaking || !amount}
                    className="w-full rounded-xl bg-[#f4c752] py-3 text-sm font-semibold uppercase tracking-[0.28em] text-black transition hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isStaking ? "Staking..." : "Stake $MKIN"}
                  </button>
                </div>
              </div>


              <div className="staking-card-section">
                <h2 className="staking-card-title">Your Stakes</h2>
                <div className="mt-5 flex flex-col gap-4">
                  {stakes.length === 0 ? (
                    <p className="text-sm text-[#f7dca1]/60">No active stakes yet. Start staking to earn rewards!</p>
                  ) : (
                    stakes.map((stake) => (
                      <div key={stake.id} className="rounded-xl bg-black/45 p-4 border border-[#f4c752]/30">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="text-sm text-[#f7dca1]/80">
                              {stake.amount} $MKIN • {stake.lockPeriod === "flexible" ? "Flexible" : `${stake.lockPeriod}-day`}
                            </p>
                            <p className="text-xs text-[#f7dca1]/50 mt-1">
                              Rewards: {stake.rewards.toFixed(2)} $MKIN
                            </p>
                            <p className="text-xs text-[#f7dca1]/50">
                              {stake.isUnlocked ? (
                                <span className="text-[#90EE90]">✅ Unlocked - Ready to unstake</span>
                              ) : (
                                <span className="text-[#FFB6C1]">🔒 Locked for {stake.daysUntilUnlock} days</span>
                              )}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleUnstake(stake.stakeEntry)}
                          disabled={isUnstaking}
                          className="w-full rounded-lg bg-[#f4c752]/20 border border-[#f4c752]/50 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#f7dca1] transition hover:bg-[#f4c752]/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isUnstaking ? "Processing..." : stake.isUnlocked ? "Unstake" : `Unstake (${stake.lockPeriod === "30" ? "10" : stake.lockPeriod === "60" ? "15" : "20"}% penalty)`}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="staking-card-section">
                <h2 className="staking-card-title">Rewards & Metrics</h2>
                <div className="mt-5 flex flex-col gap-6">
                  <div className="relative mx-auto flex h-32 w-32 items-center justify-center rounded-full border-2 border-[#f4c752]/40 bg-black/25 shadow-[0_0_30px_rgba(244,199,82,0.18)]">
                    <div className="text-center">
                      <p className="text-sm uppercase tracking-[0.26em] text-[#f7dca1]/60">{getAPYForLockPeriod(selectedLock)}%</p>
                      <p className="text-xs uppercase tracking+[0.32em] text-[#f7dca1]/45">APY</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="staking-label">Total Value Locked</p>
                      <p className="staking-value">{metrics.totalValueLocked.toLocaleString()} $MKIN</p>
                    </div>
                    <div>
                      <p className="staking-label">Total Stakers</p>
                      <p className="staking-value">{metrics.totalStakers.toLocaleString()} wallets</p>
                    </div>
                    {estimatedRewards > 0 && (
                      <div>
                        <p className="staking-label">Estimated Rewards</p>
                        <p className="staking-value">{estimatedRewards.toFixed(2)} $MKIN</p>
                      </div>
                    )}
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
                      className={`rounded-xl border px-4 py-2 text-sm font-semibold uppercase tracking-[0.22em] transition ${selectedLock === option.value
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

export default StakingPage;
