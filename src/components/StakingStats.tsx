"use client";

import { useStakingData } from "@/hooks/useStakingData";
import { formatCurrency, daysUntilUnlock, getLockPeriodLabel } from "@/utils/stakingHelpers";

export function StakingStats() {
  const { user, stakes, metrics, loading } = useStakingData();

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-20 bg-gray-700 rounded-lg" />
        <div className="h-20 bg-gray-700 rounded-lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-8 text-gray-400">
        Connect your wallet to view staking statistics
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* User Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-[#0c0803] to-[#060401] border border-[#f4c752]/25 rounded-lg p-6">
          <p className="text-sm text-[#f7dca1]/60 uppercase tracking-wider mb-2">
            Total Staked
          </p>
          <p className="text-3xl font-bold text-[#f4c752]">
            {user.total_staked.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
          <p className="text-xs text-[#f7dca1]/40 mt-2">$MKIN</p>
        </div>

        <div className="bg-gradient-to-br from-[#0c0803] to-[#060401] border border-[#f4c752]/25 rounded-lg p-6">
          <p className="text-sm text-[#f7dca1]/60 uppercase tracking-wider mb-2">
            Total Rewards
          </p>
          <p className="text-3xl font-bold text-[#f4c752]">
            {user.total_rewards_all_time.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
          <p className="text-xs text-[#f7dca1]/40 mt-2">
            {user.total_rewards_claimed.toFixed(2)} claimed + {user.total_pending_rewards.toFixed(2)} pending
          </p>
        </div>
      </div>

      {/* Global Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0B0B09] border border-[#404040] rounded-lg p-4">
          <p className="text-xs text-[#f7dca1]/60 uppercase tracking-wider mb-1">
            Total Value Locked
          </p>
          <p className="text-2xl font-bold text-[#f4c752]">
            {metrics.totalValueLocked.toLocaleString("en-US", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
          </p>
        </div>

        <div className="bg-[#0B0B09] border border-[#404040] rounded-lg p-4">
          <p className="text-xs text-[#f7dca1]/60 uppercase tracking-wider mb-1">
            Total Stakers
          </p>
          <p className="text-2xl font-bold text-[#f4c752]">
            {metrics.totalStakers.toLocaleString()}
          </p>
        </div>

        <div className="bg-[#0B0B09] border border-[#404040] rounded-lg p-4">
          <p className="text-xs text-[#f7dca1]/60 uppercase tracking-wider mb-1">
            Active Stakes
          </p>
          <p className="text-2xl font-bold text-[#f4c752]">
            {metrics.activeStakes.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Stakes List */}
      {stakes.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-[#f7dca1] uppercase tracking-wider">
            Your Stakes
          </h3>
          {stakes.map((stake) => (
            <div
              key={stake.id}
              className="bg-[#0B0B09] border border-[#404040] rounded-lg p-4"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-sm font-semibold text-[#f4c752]">
                    {stake.amount.toFixed(2)} $MKIN
                  </p>
                  <p className="text-xs text-[#f7dca1]/60">
                    {getLockPeriodLabel(stake.lock_period)}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${
                    stake.status === "active"
                      ? "bg-green-500/20 text-green-400"
                      : stake.status === "unstaking"
                      ? "bg-yellow-500/20 text-yellow-400"
                      : "bg-gray-500/20 text-gray-400"
                  }`}
                >
                  {stake.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-[#f7dca1]/60">Earned Rewards</p>
                  <p className="text-[#f4c752] font-semibold">
                    {stake.rewards_earned.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-[#f7dca1]/60">Pending Rewards</p>
                  <p className="text-[#f4c752] font-semibold">
                    {stake.pending_rewards.toFixed(2)}
                  </p>
                </div>
              </div>

              {stake.status === "active" && daysUntilUnlock(stake.unlock_date) > 0 && (
                <div className="mt-3 pt-3 border-t border-[#404040]">
                  <p className="text-xs text-[#f7dca1]/60">
                    Unlocks in {daysUntilUnlock(stake.unlock_date)} days
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
