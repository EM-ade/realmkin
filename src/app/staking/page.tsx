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
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getAssociatedTokenAddress, getAccount } from "@solana/spl-token";

import { useRealmkinStaking } from "@/hooks/useRealmkinStaking";
import { useNftStaking } from "@/hooks/useNftStaking";
import { MiningConsole } from "@/components/staking/MiningConsole";
import { ActiveBoosters } from "@/components/staking/ActiveBoosters";
import { LeaderboardWidget } from "@/components/staking/LeaderboardWidget";
import { StakingControls } from "@/components/staking/StakingControls";
import { toast } from "react-hot-toast";

type StakingTab = "token" | "nft";

function StakingPage() {
  const [showMobileActions, setShowMobileActions] = useState(false);
  const [activeTab, setActiveTab] = useState<StakingTab>("token");
  const [selectedNfts, setSelectedNfts] = useState<string[]>([]);

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

  // Token Staking Hook
  const {
    user: stakingUser,
    pool: stakingPool,
    walletBalance,
    isRewardsPaused,
    loading: stakingLoading,
    isStaking: isTokenStaking,
    isClaiming: isTokenClaiming,
    stake: performStake,
    unstake: performUnstake,
    claim: performClaim,
    refresh: refreshStakingData,
  } = useRealmkinStaking();

  // NFT Staking Hook
  const nftStaking = useNftStaking();

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
    if (isTokenStaking) return;
    await performStake(amount);
  };

  const handleUnstake = async (amount: number) => {
    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }
    if (isTokenClaiming) return;
    await performUnstake(amount);
  };

  const handleClaim = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }
    if (isTokenClaiming) return;
    await performClaim();
  };

  // Handle NFT stake (with fee payment enabled)
  const handleNftStake = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }
    if (selectedNfts.length === 0) {
      toast.error("Select at least one NFT to stake");
      return;
    }

    // Call stakeNfts with payFee = true to pay the fee
    const result = await nftStaking.stakeNfts(selectedNfts, undefined, true);
    
    if (result.success) {
      setSelectedNfts([]); // Clear selection after successful stake
      toast.success(`Successfully staked ${result.staked?.length || 0} NFT(s)!`);
    } else {
      toast.error(result.error || "Stake failed");
    }
  };

  // Clear selection when switching tabs
  const handleTabChange = (tab: StakingTab) => {
    setActiveTab(tab);
    setSelectedNfts([]);
  };

  // Quick select percentage handler
  const handleSelectPercent = (percent: number) => {
    const walletNfts = nftStaking.walletNfts;
    const count = Math.ceil(walletNfts.length * percent);
    const selectedMints = walletNfts.slice(0, count).map((nft: any) => nft.mint);
    setSelectedNfts(selectedMints);
  };

  // Render Token Staking Content
  const renderTokenStaking = () => (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Column: User Stats & Global Stats */}
      <div className="lg:col-span-2 space-y-6 animate-fade-in-up">
        <div className="bg-black/40 border border-[#f4c752]/20 rounded-xl p-6 hover-border-glow">
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
                  (stakingUser?.displayMiningRate ||
                    stakingUser?.totalMiningRate ||
                    0) *
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

        <div className="bg-black/40 border border-[#f4c752]/20 rounded-xl p-6 hover-border-glow">
          <h3 className="text-[#f7dca1]/60 text-xs uppercase tracking-[0.2em] mb-4 font-medium">
            Global Stats
          </h3>
          <div>
            <div className="text-[#f7dca1]/40 text-[10px] uppercase tracking-wider">
              Total Staked (Pool)
            </div>
            <div className="text-xl font-bold text-[#f4c752]">
              {(stakingPool?.totalStaked / 2500000 || 0).toLocaleString()} MKIN
            </div>
          </div>
        </div>
      </div>

      {/* Center Column: Mining Console & Actions - Centered */}
      <div className="lg:col-span-6 flex flex-col items-center space-y-8 animate-scale-in animation-delay-200">
        <div className="w-full max-w-3xl">
          <MiningConsole
            stakingRate={
              stakingUser?.displayMiningRate ||
              stakingUser?.totalMiningRate ||
              0
            }
            unclaimedRewards={stakingUser?.pendingRewards || 0}
            onClaim={handleClaim}
            isRewardsPaused={isRewardsPaused}
            activeBoosters={stakingUser?.activeBoosters || []}
            boosterMultiplier={stakingUser?.boosterMultiplier || 1.0}
          />
        </div>

        <div className="w-full max-w-3xl">
          <StakingControls
            stakedAmount={stakingUser?.principal || 0}
            walletBalance={walletBalance}
            tokenSymbol="MKIN"
            onStake={handleStake}
            onUnstake={handleUnstake}
          />
        </div>
      </div>

      {/* Right Column: Leaderboard & Boosters */}
      <div className="lg:col-span-4 flex flex-col-reverse lg:flex-col gap-6 animate-slide-in-right animation-delay-400">
        <LeaderboardWidget type="staked" />

        <ActiveBoosters
          boosters={stakingUser?.activeBoosters || []}
          isDetecting={stakingLoading}
          onRefresh={async () => {
            if (isConnected && uid) {
              await refreshStakingData();
            }
          }}
          lastUpdated={
            stakingUser?.activeBoosters?.[0]?.detectedAt
              ? new Date(stakingUser.activeBoosters[0].detectedAt)
              : null
          }
        />
      </div>
    </div>
  );

  // Render NFT Staking Content
  const renderNftStaking = () => {
    const rewardPerNft = nftStaking.poolStats?.currentRewardPerNft || nftStaking.poolStats?.estimatedRewardPerNft || 0;
    const totalPool = nftStaking.poolStats?.totalPool || 0;
    const totalStaked = nftStaking.poolStats?.totalNftsStaked || 0;
    const feePerNft = nftStaking.poolStats?.feePerNft || 0.30;
    const periodStatus = nftStaking.poolStats?.periodStatus || "open";
    const periodMessage = nftStaking.poolStats?.periodMessage || "";
    const isStakingOpen = periodStatus === "open" && nftStaking.poolStats?.stakingEnabled !== false;
    const isStakingDisabled = nftStaking.poolStats?.stakingEnabled === false;
    const isStakingClosed = periodStatus === "closed";

    console.log("📊 NFT Staking Stats:", {
      periodStatus,
      periodStart: nftStaking.poolStats?.periodStart,
      periodEnd: nftStaking.poolStats?.periodEnd,
      stakingEnabled: nftStaking.poolStats?.stakingEnabled,
      isStakingOpen,
      isStakingDisabled,
      isStakingClosed
    });

    return (
      <div className="space-y-8">
        {/* Pool Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-black/40 border border-[#f4c752]/20 rounded-xl p-4">
            <div className="text-[#f7dca1]/40 text-[10px] uppercase tracking-wider mb-1">
              Token Pool
            </div>
            <div className="text-lg font-bold text-[#f4c752]">
              {totalPool.toLocaleString()} $MKIN
            </div>
          </div>
          <div className="bg-black/40 border border-[#f4c752]/20 rounded-xl p-4">
            <div className="text-[#f7dca1]/40 text-[10px] uppercase tracking-wider mb-1">
              NFTs Staked
            </div>
            <div className="text-lg font-bold text-[#f4c752]">
              {totalStaked}
            </div>
          </div>
          <div className="bg-black/40 border border-[#f4c752]/20 rounded-xl p-4">
            <div className="text-[#f7dca1]/40 text-[10px] uppercase tracking-wider mb-1">
              Period Status
            </div>
            <div className={`text-lg font-bold ${isStakingOpen ? 'text-green-400' : isStakingClosed ? 'text-red-400' : 'text-yellow-400'}`}>
              {periodStatus === "open" ? "Open" : periodStatus === "closed" ? "Closed" : "Upcoming"}
            </div>
          </div>
          <div className="bg-black/40 border border-[#f4c752]/20 rounded-xl p-4">
            <div className="text-[#f7dca1]/40 text-[10px] uppercase tracking-wider mb-1">
              Your Est. Reward
            </div>
            <div className="text-lg font-bold text-[#f4c752]">
              {nftStaking.totalEstimatedReward.toFixed(2)} $MKIN
            </div>
          </div>
        </div>

        {/* Staked NFTs Section */}
        {nftStaking.stakedNfts.length > 0 && (
          <div className="bg-black/40 border border-[#f4c752]/20 rounded-xl p-6">
            <h3 className="text-[#f7dca1]/60 text-xs uppercase tracking-[0.2em] mb-4 font-medium">
              Your Staked NFTs ({nftStaking.stakedNfts.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {nftStaking.stakedNfts.map((nft: any) => {
                const unlockDate = new Date(nft.unlockAt);
                const now = new Date();
                const daysRemaining = Math.ceil((unlockDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                const isUnlockable = daysRemaining <= 0;

                return (
                  <div key={nft.id} className="bg-black/60 border border-[#f4c752]/20 rounded-lg p-4">
                    <div className="flex gap-3">
                      <div className="w-16 h-16 bg-[#f4c752]/10 rounded-lg flex-shrink-0 overflow-hidden">
                        {nft.content?.metadata?.image ? (
                          <img 
                            src={nft.content.metadata.image} 
                            alt={nft.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#f4c752]/30">
                            NFT
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[#f4c752] text-sm font-medium truncate">
                          {nft.name || nft.nftMint?.slice(0, 8) + "..."}
                        </div>
                        <div className="text-[#f7dca1]/40 text-[10px] uppercase">
                          {nft.collectionId}
                        </div>
                        <div className="text-[#f7dca1]/60 text-xs mt-1">
                          {isUnlockable ? (
                            <span className="text-green-400">Ready to claim!</span>
                          ) : (
                            <span>{daysRemaining} days remaining</span>
                          )}
                        </div>
                        <div className="text-[#f7dca1]/40 text-[10px] mt-1">
                          Earn: {nft.estimatedReward?.toFixed(2) || rewardPerNft.toFixed(2)} $MKIN
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => nftStaking.unstakeNft(nft.nftMint)}
                      disabled={nftStaking.isUnstaking}
                      className="w-full mt-3 py-2 bg-[#f4c752]/10 border border-[#f4c752]/30 text-[#f4c752] text-xs uppercase tracking-wider rounded hover:bg-[#f4c752]/20 disabled:opacity-50"
                    >
                      Unstake {daysRemaining > 0 && "(forfeits reward)"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Claimable Rewards */}
        {nftStaking.totalClaimable > 0 && (
          <div className="bg-black/40 border border-[#f4c752]/20 rounded-xl p-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-[#f7dca1]/60 text-xs uppercase tracking-[0.2em] mb-1 font-medium">
                  Claimable Rewards
                </h3>
                <div className="text-2xl font-bold text-[#f4c752]">
                  {nftStaking.totalClaimable.toFixed(2)} $MKIN
                </div>
              </div>
              <button
                onClick={() => nftStaking.claimRewards()}
                disabled={nftStaking.isClaiming}
                className="py-3 px-8 bg-[#f4c752] text-black font-bold uppercase tracking-widest text-xs rounded-lg hover:bg-[#f4c752]/90 disabled:opacity-50"
              >
                Claim All
              </button>
            </div>
          </div>
        )}

        {/* Available NFTs to Stake */}
        <div className="bg-black/40 border border-[#f4c752]/20 rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-[#f7dca1]/60 text-xs uppercase tracking-[0.2em] font-medium">
                Available NFTs ({selectedNfts.length} of {nftStaking.walletNfts.length} selected)
              </h3>
              <p className="text-[#f7dca1]/40 text-xs mt-1">
                Click on the NFTs you want to stake
              </p>
            </div>
            <div className="flex gap-2">
              {!isConnected || nftStaking.walletNfts.length === 0 ? null : (
                <>
                  <button
                    onClick={() => handleSelectPercent(0.25)}
                    className="py-1 px-2 bg-[#f4c752]/10 border border-[#f4c752]/30 text-[#f4c752] text-xs uppercase tracking-wider rounded hover:bg-[#f4c752]/20"
                  >
                    25%
                  </button>
                  <button
                    onClick={() => handleSelectPercent(0.5)}
                    className="py-1 px-2 bg-[#f4c752]/10 border border-[#f4c752]/30 text-[#f4c752] text-xs uppercase tracking-wider rounded hover:bg-[#f4c752]/20"
                  >
                    50%
                  </button>
                  <button
                    onClick={() => handleSelectPercent(1)}
                    className="py-1 px-2 bg-[#f4c752]/10 border border-[#f4c752]/30 text-[#f4c752] text-xs uppercase tracking-wider rounded hover:bg-[#f4c752]/20"
                  >
                    All
                  </button>
                </>
              )}
              {selectedNfts.length > 0 && isStakingOpen && (
                <button
                  onClick={handleNftStake}
                  className="py-1 px-3 bg-[#f4c752] text-black text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-[#f4c752]/90"
                >
                  Stake {selectedNfts.length} NFT${selectedNfts.length > 1 ? 's' : ''} (${(selectedNfts.length * (nftStaking.poolStats?.feePerNft || 0.20)).toFixed(2)})
                </button>
              )}
            </div>
          </div>
          
          {!isConnected ? (
            <div className="text-center py-8">
              <p className="text-[#f7dca1]/60 mb-4">Connect your wallet to see available NFTs</p>
              <button
                onClick={handleConnectClick}
                className="py-3 px-8 bg-[#f4c752] text-black font-bold uppercase tracking-widest text-xs rounded-lg hover:bg-[#f4c752]/90"
              >
                Connect Wallet
              </button>
            </div>
          ) : nftStaking.walletNfts.length === 0 ? (
            <div className="text-center py-8 text-[#f7dca1]/40">
              No eligible NFTs found in your wallet
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {nftStaking.walletNfts.map((nft: any) => {
                const isSelected = selectedNfts.includes(nft.mint);
                return (
                  <div 
                    key={nft.mint} 
                    className={`bg-black/60 border rounded-lg p-3 cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-[#f4c752] bg-[#f4c752]/10' 
                        : 'border-[#f4c752]/20 hover:border-[#f4c752]/40'
                    }`}
                    onClick={() => {
                      setSelectedNfts(prev => 
                        isSelected 
                          ? prev.filter(m => m !== nft.mint)
                          : [...prev, nft.mint]
                      );
                    }}
                  >
                    <div className="w-full aspect-square bg-[#f4c752]/10 rounded-lg mb-2 overflow-hidden relative">
                      {nft.image ? (
                        <img src={nft.image} alt={nft.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#f4c752]/30 text-xs">
                          NFT
                        </div>
                      )}
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-[#f4c752] rounded-full flex items-center justify-center">
                          <span className="text-black text-xs font-bold">✓</span>
                        </div>
                      )}
                    </div>
                    <div className="text-[#f4c752] text-xs font-medium truncate">
                      {nft.name || nft.mint?.slice(0, 6) + "..."}
                    </div>
                    <div className="text-[#f7dca1]/40 text-[10px] uppercase">
                      {nft.collection}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Fee Info */}
        <div className="bg-black/40 border border-[#f4c752]/20 rounded-xl p-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-[#f7dca1]/60">Staking Fee</span>
            <span className="text-[#f4c752]">${feePerNft.toFixed(2)} per NFT</span>
          </div>
          <div className="flex justify-between items-center text-sm mt-2">
            <span className="text-[#f7dca1]/60">Staking Period</span>
            <span className="text-[#f4c752]">
              {nftStaking.poolStats?.periodStart && nftStaking.poolStats?.periodEnd
                ? `${nftStaking.poolStats.periodStart} - ${nftStaking.poolStats.periodEnd}`
                : "30 days"
              }
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative min-h-screen bg-[#050302] text-[#f4c752] font-sans selection:bg-[#f4c752] selection:text-black">
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
          uid && disconnectDiscord({ uid } as any)
        }
        onConnectWallet={connectWallet}
        onDisconnectWallet={disconnectWallet}
      />

      <main className="w-full max-w-7xl mx-auto my-10 px-6 lg:px-10 pb-20">
        {/* Page Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-5xl font-bold uppercase tracking-[0.2em] mb-4 text-[#f4c752]">
            Realmkin Mining
          </h1>
          
          {/* Tab Switcher */}
          <div className="flex justify-center gap-2 mb-4">
            <button
              onClick={() => handleTabChange("token")}
              className={`px-6 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${
                activeTab === "token"
                  ? "bg-[#f4c752] text-black"
                  : "bg-[#f4c752]/10 text-[#f4c752] border border-[#f4c752]/30 hover:bg-[#f4c752]/20"
              }`}
            >
              Token Staking
            </button>
            <button
              onClick={() => handleTabChange("nft")}
              className={`px-6 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${
                activeTab === "nft"
                  ? "bg-[#f4c752] text-black"
                  : "bg-[#f4c752]/10 text-[#f4c752] border border-[#f4c752]/30 hover:bg-[#f4c752]/20"
              }`}
            >
              NFT Staking
            </button>
          </div>

          {/* Tab Description */}
          <p className="text-[#f7dca1]/60 text-sm md:text-base tracking-wider max-w-2xl mx-auto">
            {activeTab === "token" 
              ? "Stake your $MKIN tokens to start mining rewards automatically. Boost your rate with Realmkin NFTs."
              : `Stake your Realmkin NFTs to earn ${(nftStaking.poolStats?.currentRewardPerNft || nftStaking.poolStats?.estimatedRewardPerNft || 0).toFixed(2)} $MKIN per NFT. ${nftStaking.poolStats?.periodMessage || `Lock until ${nftStaking.poolStats?.periodEnd || 'March 30, 2025'}.`} $0.30 fee per NFT.`
            }
          </p>
        </div>

        {/* Tab Content */}
        {activeTab === "token" ? renderTokenStaking() : renderNftStaking()}
      </main>
    </div>
  );
}

export default StakingPage;