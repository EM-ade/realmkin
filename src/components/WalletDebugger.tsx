"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { nftService, NFTCollection } from "@/services/nftService";
import { rewardsService, UserRewards } from "@/services/rewardsService";

interface RewardsCalculation {
  totalNFTs: number;
  weeklyRate: number;
  weeksElapsed: number;
  pendingAmount: number;
  canClaim: boolean;
  nextClaimDate: Date | null;
}

interface DebugInfo {
  walletAddress: string;
  nftsFound: number;
  contractAddresses: string[];
  contractConfigs: Array<{ contractAddress: string; config: Record<string, unknown> }>;
  calculationDetails: Record<string, unknown>;
  userRewards: UserRewards | null;
}

export default function WalletDebugger() {
  const { user } = useAuth();
  const [walletAddress, setWalletAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [rewardsCalculation, setRewardsCalculation] = useState<RewardsCalculation | null>(null);
  const [nfts, setNfts] = useState<Array<{ contractAddress: string; name?: string }>>([]);

  const fetchWalletData = useCallback(async () => {
    if (!walletAddress.trim()) {
      setError("Please enter a wallet address");
      return;
    }

    setIsLoading(true);
    setError(null);
    setDebugInfo(null);
    setRewardsCalculation(null);
    setNfts([]);

    try {
      console.log("🔍 Fetching data for wallet:", walletAddress);

      // Fetch NFTs for the specified wallet
      const nftCollection = await nftService.fetchAllContractNFTs(walletAddress);
      setNfts(nftCollection.nfts);

      console.log("📦 NFTs found:", nftCollection.nfts.length);
      console.log("📋 Contract addresses:", [...new Set(nftCollection.nfts.map(nft => nft.contractAddress))]);

      // Initialize/update rewards based on NFT count and contract types
      if (user) {
        try {
          const rewards = await rewardsService.initializeUserRewards(
            user.uid,
            walletAddress,
            nftCollection.nfts.length,
            nftCollection.nfts,
          );

          // Calculate current pending rewards with contract-aware calculation
          const calculation = rewardsService.calculatePendingRewards(
            rewards,
            nftCollection.nfts.length,
          );
          setRewardsCalculation(calculation);

          // Load contract configs for debug info
          const configs = await rewardsService.loadContractConfigs();
          const contractConfigs = Array.from(configs.entries()).map(([addr, cfg]) => ({
            contractAddress: addr,
            config: cfg
          }));

          setDebugInfo({
            walletAddress,
            nftsFound: nftCollection.nfts.length,
            contractAddresses: [...new Set(nftCollection.nfts.map(nft => nft.contractAddress))],
            contractConfigs,
            calculationDetails: {
              weeklyRate: rewards.weeklyRate,
              totalNFTs: rewards.totalNFTs,
              lastClaimed: rewards.lastClaimed,
              createdAt: rewards.createdAt
            },
            userRewards: rewards
          });

        } catch (error) {
          console.error("Error initializing rewards:", error);
          setError("Failed to calculate rewards: " + (error instanceof Error ? error.message : String(error)));
        }
      } else {
        setError("User not authenticated");
      }
    } catch (error) {
      console.error("Error fetching wallet data:", error);
      setError("Failed to fetch wallet data: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress, user]);

  const handleReloadConfigs = async () => {
    if (!user || !walletAddress) return;
    
    setIsLoading(true);
    try {
      console.log("🔄 Manually reloading contract configs...");
      await rewardsService.reloadContractConfigs();
      await fetchWalletData();
      console.log("✅ Configs reloaded and rewards recalculated");
    } catch (error) {
      console.error("Error reloading configs:", error);
      setError("Failed to reload configs: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Wallet Address Input */}
      <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 mb-6 border border-white/10">
        <h2 className="text-xl font-semibold mb-4">Wallet Mining Rate Debugger</h2>
        <div className="flex gap-4">
          <input
            type="text"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            placeholder="Enter Solana wallet address (e.g., 7saRfPotj6uGoXC2txwEmdpZyzT2eRRZEXnfy372PD7)"
            className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-[#DA9C2F]"
          />
          <button
            onClick={fetchWalletData}
            disabled={isLoading}
            className="bg-[#DA9C2F] hover:bg-[#C48C27] disabled:bg-[#DA9C2F]/50 text-white px-6 py-3 rounded-lg font-semibold transition-all"
          >
            {isLoading ? "Loading..." : "Analyze Wallet"}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6">
          <p className="text-red-300 font-semibold">Error</p>
          <p className="text-red-200 text-sm">{error}</p>
        </div>
      )}

      {/* Results */}
      {debugInfo && rewardsCalculation && (
        <div className="space-y-6">
          {/* Mining Rate Summary */}
          <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
            <h2 className="text-xl font-semibold mb-4">Mining Rate Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/10 rounded-lg p-4">
                <p className="text-white/70 text-sm">Wallet Address</p>
                <p className="font-mono text-sm break-all">{debugInfo.walletAddress}</p>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <p className="text-white/70 text-sm">NFTs Found</p>
                <p className="text-2xl font-bold text-[#DA9C2F]">{debugInfo.nftsFound}</p>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <p className="text-white/70 text-sm">Weekly Mining Rate</p>
                <p className="text-2xl font-bold text-[#DA9C2F]">{rewardsCalculation.weeklyRate} MKIN/week</p>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <p className="text-white/70 text-sm">Pending Rewards</p>
                <p className="text-2xl font-bold text-[#DA9C2F]">{rewardsCalculation.pendingAmount} MKIN</p>
              </div>
            </div>
          </div>

          {/* Contract Configuration Details */}
          <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
            <h2 className="text-xl font-semibold mb-4">Contract Configuration Details</h2>
            
            <div className="mb-4">
              <p className="text-white/70 text-sm mb-2">Contract Addresses Found in Wallet:</p>
              <div className="space-y-2">
                {debugInfo.contractAddresses.map((addr, index) => (
                  <div key={index} className="bg-white/10 rounded-lg p-3">
                    <p className="font-mono text-xs break-all">{addr}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <p className="text-white/70 text-sm mb-2">Available Contract Configurations:</p>
              <div className="space-y-3">
                {debugInfo.contractConfigs.map((config, index) => (
                  <div key={index} className="bg-white/10 rounded-lg p-4">
                    <p className="font-mono text-xs break-all mb-2">Contract: {config.contractAddress}</p>
                    <pre className="text-xs bg-black/30 p-2 rounded overflow-x-auto">
                      {JSON.stringify(config.config, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleReloadConfigs}
              disabled={isLoading}
              className="bg-[#DA9C2F] hover:bg-[#C48C27] disabled:bg-[#DA9C2F]/50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            >
              {isLoading ? "⟳ Reloading..." : "🔄 Reload Contract Configs"}
            </button>
          </div>

          {/* Calculation Details */}
          <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
            <h2 className="text-xl font-semibold mb-4">Calculation Details</h2>
            <pre className="text-xs bg-black/30 p-4 rounded overflow-x-auto">
              {JSON.stringify({
                rewardsCalculation,
                userRewards: debugInfo.userRewards,
                calculationDetails: debugInfo.calculationDetails
              }, null, 2)}
            </pre>
          </div>

          {/* NFTs List */}
          <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
            <h2 className="text-xl font-semibold mb-4">NFTs Found ({nfts.length})</h2>
            <div className="space-y-3">
              {nfts.map((nft, index) => (
                <div key={index} className="bg-white/10 rounded-lg p-3">
                  <p className="font-mono text-xs break-all">Contract: {nft.contractAddress}</p>
                  <p className="text-white/70 text-xs">Name: {nft.name || "Unknown"}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
