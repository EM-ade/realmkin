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

// New Components
import { useRealmkinStaking } from "@/hooks/useRealmkinStaking";
import { MiningConsole } from "@/components/staking/MiningConsole";
import { BoosterSlot } from "@/components/staking/BoosterSlot";
import { LeaderboardWidget } from "@/components/staking/LeaderboardWidget";
import { StakingControls } from "@/components/staking/StakingControls";
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

  const {
    discordLinked,
    discordConnecting,
    discordUnlinking,
    connectDiscord,
    disconnectDiscord,
  } = useDiscord();

  const gatekeeperBase =
    process.env.NEXT_PUBLIC_GATEKEEPER_BASE || "https://gatekeeper-bmvu.onrender.com";

  // Use the real staking hook
  const {
    user: stakingUser,
    pool: stakingPool,
    walletBalance,
    isRewardsPaused,
    loading: stakingLoading,
    isStaking,
    isClaiming,
    stake: performStake,
    unstake: performUnstake,
    claim: performClaim,
    refresh: refreshStakingData,
  } = useRealmkinStaking();

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
    if (isStaking) return;
    await performStake(amount);
  };

  const handleUnstake = async (amount: number) => {
    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }
    if (isClaiming) return;
    await performUnstake(amount);
  };

  const handleClaim = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }
    if (isClaiming) return;
    await performClaim();
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

      {/* Desktop Header / Top Bar
      <div className="hidden lg:flex w-full max-w-7xl mx-auto px-10 pt-10 justify-between items-center mb-10">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-12 h-12 relative transition-transform group-hover:scale-110">
              <Image src="/realmkin-logo.png" alt="Logo" fill className="object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg tracking-[0.2em] uppercase text-[#f4c752]">Realmkin</span>
              <span className="text-xs tracking-[0.4em] text-[#f7dca1]/50 uppercase">Mining</span>
            </div>
          </Link>
        </div>

        <button
          onClick={handleConnectClick}
          className="px-6 py-2 bg-[#f4c752]/10 border border-[#f4c752]/40 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-[#f4c752] hover:text-black transition-all"
        >
          {isConnected && account ? formatAddress(account) : "Connect Wallet"}
        </button>
      </div> */}

      <main className="w-full max-w-7xl mx-auto my-10 px-6 lg:px-10 pb-20">
        {/* Page Title */}
        <div className="text-center mb-12 lg:mb-16">
          <h1 className="text-3xl md:text-5xl font-bold uppercase tracking-[0.2em] mb-4 text-[#f4c752]">
            Realmkin Mining
          </h1>
          <p className="text-[#f7dca1]/60 text-sm md:text-base tracking-wider max-w-2xl mx-auto">
            Stake your $MKIN tokens to start mining rewards automatically. Boost
            your rate with Realmkin NFTs.
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
                    {(stakingUser?.principal || 0).toLocaleString()} MKIN
                  </div>
                </div>
                <div>
                  <div className="text-[#f7dca1]/40 text-[10px] uppercase tracking-wider">
                    Est. Weekly
                  </div>
                  <div className="text-xl font-bold text-[#f4c752]">
                    {(
                      (stakingUser?.totalMiningRate || 0) *
                      60 *
                      60 *
                      24 *
                      7
                    ).toFixed(4)}{" "}
                    SOL
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-black/40 border border-[#f4c752]/20 rounded-xl p-6">
              <h3 className="text-[#f7dca1]/60 text-xs uppercase tracking-[0.2em] mb-4 font-medium">
                Global Stats
              </h3>
              <div>
                <div className="text-[#f7dca1]/40 text-[10px] uppercase tracking-wider">
                  Total Staked (Pool)
                </div>
                <div className="text-xl font-bold text-[#f4c752]">
                  {(stakingPool?.totalStaked || 0).toLocaleString()} MKIN
                </div>
              </div>
            </div>
          </div>

          {/* Center Column: Mining Console & Actions */}
          <div className="lg:col-span-6 space-y-8">
            <MiningConsole
              stakingRate={stakingUser?.totalMiningRate || 0}
              unclaimedRewards={stakingUser?.pendingRewards || 0}
              onClaim={handleClaim}
              isRewardsPaused={isRewardsPaused}
            />

            <StakingControls
              stakedAmount={stakingUser?.principal || 0}
              walletBalance={walletBalance}
              tokenSymbol="MKIN"
              onStake={handleStake}
              onUnstake={handleUnstake}
            />
          </div>

          {/* Right Column: Leaderboard & Boosters */}
          <div className="lg:col-span-3 flex flex-col-reverse lg:flex-col gap-6">
            <LeaderboardWidget type="rewards" />

            <div className="bg-black/40 border border-[#f4c752]/20 rounded-xl p-6">
              <h3 className="text-[#f7dca1]/60 text-xs uppercase tracking-[0.2em] mb-4 font-medium">
                Active Boosters
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {(stakingUser?.activeBoosters || []).map((booster: any) => (
                  <BoosterSlot key={booster.id} booster={booster} />
                ))}
                <BoosterSlot /> {/* Empty slot for "Add Booster" */}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default StakingPage;
