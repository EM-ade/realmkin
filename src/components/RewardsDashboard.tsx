"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { rewardsService, ClaimRecord } from "@/services/rewardsService";

interface RewardsDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RewardsDashboard({
  isOpen,
  onClose,
}: RewardsDashboardProps) {
  const { user } = useAuth();
  const [claimHistory, setClaimHistory] = useState<ClaimRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchClaimHistory = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const history = await rewardsService.getClaimHistory(user.uid, 20);
      setClaimHistory(history);
    } catch (error) {
      console.error("Error fetching claim history:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen && user) {
      fetchClaimHistory();
    }
  }, [isOpen, user, fetchClaimHistory]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#2b1c3b] border-4 border-[#d3b136] rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-[#d3b136]">
          <h2
            className="text-2xl font-bold text-white text-glow"
            style={{ fontFamily: "var(--font-gothic-cg)" }}
          >
            REWARDS DASHBOARD
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:text-[#d3b136] text-2xl font-bold transition-colors"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#d3b136]"></div>
              <span className="ml-3 text-white">Loading claim history...</span>
            </div>
          ) : claimHistory.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white mb-4">
                Recent Claims
              </h3>
              {claimHistory.map((claim) => (
                <div
                  key={claim.id}
                  className="border-2 border-[#d3b136] bg-[#1a0f2e] p-4 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-white font-bold">
                      {rewardsService.formatMKIN(claim.amount)}
                    </div>
                    <div className="text-gray-400 text-sm">
                      {claim.claimedAt && !isNaN(claim.claimedAt.getTime()) 
                        ? claim.claimedAt.toLocaleDateString()
                        : "Date unavailable"
                      }
                    </div>
                  </div>
                  <div className="text-gray-300 text-sm">
                    {claim.nftCount} NFTs • {claim.weeksClaimed.toFixed(2)}{" "}
                    weeks
                  </div>
                  <div className="text-gray-400 text-xs mt-1">
                    Wallet: {claim.walletAddress.slice(0, 8)}...
                    {claim.walletAddress.slice(-8)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">💰</div>
              <p className="text-gray-400">No claims yet</p>
              <p className="text-gray-500 text-sm mt-2">
                Your reward claims will appear here
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t-2 border-[#d3b136] bg-[#1a0f2e]">
          <div className="text-center">
            <p className="text-gray-300 text-sm">
              Earn ₥200 per NFT per week • Minimum claim: ₥1
            </p>
            <p className="text-gray-400 text-xs mt-1">
              Claims are processed weekly
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
