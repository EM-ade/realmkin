"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useWeb3 } from "@/contexts/Web3Context";
import { useAuth } from "@/contexts/AuthContext";
import { useDiscord } from "@/contexts/DiscordContext";
import MobileMenuOverlay from "@/components/MobileMenuOverlay";
import { NAV_ITEMS } from "@/config/navigation";
import { formatAddress } from "@/utils/formatAddress";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

// New Components (Restored)
// import { useMiningData } from "@/hooks/useMiningData"; // Replaced with useRealmkinStaking
import { useRealmkinStaking } from "@/hooks/useRealmkinStaking";
import { MiningConsole } from "@/components/staking/MiningConsole";
import { BoosterSlot } from "@/components/staking/BoosterSlot";
import { LeaderboardWidget } from "@/components/staking/LeaderboardWidget";
import { StakingControls } from "@/components/staking/StakingControls";
import TransactionHistory from "@/components/staking/TransactionHistory";
import { toast } from "react-hot-toast";

function StakingPage() {
  const [showMobileActions, setShowMobileActions] = useState(false);

  const {
    connectWallet,
    disconnectWallet,
    isConnected,
    isConnecting,
    account,
    uid,
  } = useWeb3();

  const { userData } = useAuth();
  const { setVisible: setWalletModalVisible } = useWalletModal();
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const {
    discordLinked,
    discordConnecting,
    discordUnlinking,
    connectDiscord,
    disconnectDiscord,
  } = useDiscord();

  const gatekeeperBase =
    process.env.NEXT_PUBLIC_GATEKEEPER_BASE || "https://gatekeeper-bot.fly.dev";

  // Use the new hook instead of useMiningData
  // const miningData = useMiningData();
  const {
    data,
    user,
    pool,
    loading,
    stake,
    claim,
    unstake,
    isStaking,
    isClaiming,
    walletBalance,
  } = useRealmkinStaking();

  // Adapter to map new data to old UI expectations
  const miningData = {
    project: { token: { symbol: "MKIN" } },
    totalStaked: user?.principal || 0,
    stakingRate: 0, // Not calculated in frontend yet
    unclaimedRewards: user?.pendingRewards || 0,
    weeklyMined: 0, // Global stat not in current hook
    leaderboard: [], // Not implemented
    boosters: [], // Not implemented
  };

  const handleConnectClick = async () => {
    if (isConnected) {
      await disconnectWallet();
    } else {
      if (setWalletModalVisible) {
        setWalletModalVisible(true);
      } else {
        await connectWallet();
      }
    }
  };

  const handleStake = async (amount: number) => {
    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }
    await stake(amount);
  };

  const handleUnstake = async (amount: number) => {
    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }
    await unstake(amount);
  };

  const handleClaim = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }
    await claim();
  };

  return (
    <div className="relative min-h-screen bg-[#050302] text-[#f4c752] font-sans selection:bg-[#f4c752] selection:text-black">
      {/* Mobile Header */}
      <header className="lg:hidden mx-auto w-full max-w-7xl px-6 pt-8 pb-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 relative">
            <Image
              src="/realmkin-logo.png"
              alt="Logo"
              fill
              className="object-contain"
            />
          </div>
          <span className="font-bold text-sm tracking-widest uppercase text-[#f4c752]">
            Realmkin
          </span>
        </Link>
        <button
          onClick={() => setShowMobileActions(true)}
          className="p-2 text-[#f4c752] border border-[#f4c752]/20 rounded-lg"
        >
          <span className="text-xl">☰</span>
        </button>
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
        onDiscordDisconnect={() =>
          uid && disconnectDiscord({ uid } as any, gatekeeperBase)
        }
        onConnectWallet={connectWallet}
        onDisconnectWallet={disconnectWallet}
      />

      <main className="w-full max-w-7xl mx-auto my-10 px-6 lg:px-10 pb-20">
        {/* Page Title */}
        <div className="text-center mb-12 lg:mb-16">
          <h1 className="text-3xl md:text-5xl font-bold uppercase tracking-[0.2em] mb-4 text-[#f4c752]">
            Realmkin Mining
          </h1>
          <p className="text-[#f7dca1]/60 text-sm md:text-base tracking-wider max-w-2xl mx-auto">
            Stake your $MKIN tokens to earn a fixed 30% APR in SOL. Boost your mining rate with Realmkin NFTs.
          </p>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: User Stats & Global Stats */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-black/40 border border-[#f4c752]/20 rounded-xl p-6">
              <h3 className="text-[#f7dca1]/60 text-xs uppercase tracking-[0.2em] mb-4 font-medium">
                Your Stats
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="text-[#f7dca1]/40 text-[10px] uppercase tracking-wider">
                    Total Staked
                  </div>
                  <div className="text-xl font-bold text-[#f4c752]">
                    {miningData.totalStaked.toLocaleString()}{" "}
                    {miningData.project.token.symbol}
                  </div>
                </div>
                <div>
                  <div className="text-[#f7dca1]/40 text-[10px] uppercase tracking-wider">
                    Est. Weekly
                  </div>
                  <div className="text-xl font-bold text-[#f4c752]">
                    Dynamic
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-black/40 border border-[#f4c752]/20 rounded-xl p-6">
              <h3 className="text-[#f7dca1]/60 text-xs uppercase tracking-[0.2em] mb-4 font-medium">
                Global Stats
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="text-[#f7dca1]/40 text-[10px] uppercase tracking-wider">
                    Fixed APR
                  </div>
                  <div className="text-xl font-bold text-[#f4c752]">
                    30%
                  </div>
                </div>
                <div>
                  <div className="text-[#f7dca1]/40 text-[10px] uppercase tracking-wider">
                    Base Mining Rate
                  </div>
                  <div className="text-xs font-mono text-[#f4c752]">
                    ~0.822 SOL/day
                  </div>
                  <div className="text-[10px] text-[#f7dca1]/40 mt-1">
                    per 1000 MKIN staked
                  </div>
                </div>
                <div>
                  <div className="text-[#f7dca1]/40 text-[10px] uppercase tracking-wider">
                    Reward Pool
                  </div>
                  <div className="text-xl font-bold text-[#f4c752]">
                    {pool ? pool.rewardPool.toFixed(2) : "..."} SOL
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Center Column: Mining Console & Actions */}
          <div className="lg:col-span-6 space-y-8">
            <MiningConsole
              stakingRate={data?.user?.totalMiningRate || 0}
              unclaimedRewards={data?.user?.pendingRewards || 0}
              lastUpdateTime={data?.timestamp}
              stakeStartTime={data?.user?.stakeStartTime}
              totalClaimedSol={data?.user?.totalClaimedSol || 0}
              onClaim={handleClaim}
            />

            <StakingControls
              stakedAmount={miningData.totalStaked}
              walletBalance={walletBalance}
              tokenSymbol={miningData.project.token.symbol}
              onStake={handleStake}
              onUnstake={handleUnstake}
            />

            {/* Transaction History Section - Desktop */}
            <div className="hidden lg:block bg-black/40 border border-[#f4c752]/20 rounded-xl p-6">
              <h3 className="text-[#f7dca1]/60 text-xs uppercase tracking-[0.2em] mb-4 font-medium">
                Transaction History
              </h3>
              <TransactionHistory />
            </div>

            {/* Transaction History Button - Mobile */}
            <button
              onClick={() => setShowHistoryModal(true)}
              className="lg:hidden bg-black/40 border border-[#f4c752]/20 rounded-xl p-4 flex items-center justify-between hover:bg-black/60 transition-colors"
            >
              <span className="text-[#f7dca1]/60 text-xs uppercase tracking-[0.2em] font-medium">
                View Transaction History
              </span>
              <svg className="w-5 h-5 text-[#DA9C2F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Right Column: Leaderboard & Boosters */}
          <div className="lg:col-span-3 flex flex-col-reverse lg:flex-col gap-6">
            <LeaderboardWidget entries={miningData.leaderboard} />

            <div className="bg-black/40 border border-[#f4c752]/20 rounded-xl p-6">
              <h3 className="text-[#f7dca1]/60 text-xs uppercase tracking-[0.2em] mb-4 font-medium">
                Mining Boosters
              </h3>
              <div className="text-[#f7dca1]/40 text-xs mb-4">
                Increase your mining rate above the base 30% APR:
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-xs">
                  <span className="text-[#f7dca1]/60">Realmkin 1/1</span>
                  <span className="text-[#f4c752] font-bold">+25% (1.25x)</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#f7dca1]/60">Customized 1/1</span>
                  <span className="text-[#f4c752] font-bold">+50% (1.5x)</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#f7dca1]/60">Realmkin Miner</span>
                  <span className="text-[#f4c752] font-bold">+100% (2.0x)</span>
                </div>
              </div>
              {data?.user?.activeBoosters && data.user.activeBoosters.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {data.user.activeBoosters.map((booster: any, idx: number) => (
                    <BoosterSlot key={idx} booster={booster} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-[#f7dca1]/40 text-xs">
                  No boosters active. Coming soon!
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Transaction History Modal - Mobile */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-[#050302] border-t lg:border border-[#f4c752]/20 rounded-t-2xl lg:rounded-2xl w-full lg:max-w-4xl lg:max-h-[80vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#f4c752]/20">
              <h2 className="text-[#f4c752] text-xl font-semibold">Transaction History</h2>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-[#f4c752] hover:text-[#DA9C2F] transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <TransactionHistory isMobile={true} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StakingPage;
