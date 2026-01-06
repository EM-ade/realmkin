import React, { useState, useEffect, useRef } from "react";

interface Booster {
  type: string;
  name: string;
  multiplier: number;
  category?: string;
  mints: string[];
  detectedAt: Date | string;
}

interface MiningConsoleProps {
  stakingRate: number; // SOL per second
  unclaimedRewards: number; // Current pending rewards from server
  onClaim: () => void;
  lastUpdateTime?: number; // Server timestamp of last update
  stakeStartTime?: number; // When user first staked (milliseconds)
  totalClaimedSol?: number; // Total SOL claimed lifetime
  isRewardsPaused?: boolean; // Whether rewards are paused (goal not completed)
  activeBoosters?: Booster[]; // Active boosters for the user
  boosterMultiplier?: number; // Total stacked multiplier
}

export function MiningConsole({
  stakingRate = 0,
  unclaimedRewards = 0,
  onClaim,
  lastUpdateTime,
  stakeStartTime,
  totalClaimedSol = 0,
  isRewardsPaused = false,
  activeBoosters = [],
  boosterMultiplier = 1.0,
}: MiningConsoleProps) {
  const [liveRewards, setLiveRewards] = useState(unclaimedRewards);
  const [actualRate, setActualRate] = useState(0); // Rate derived from server deltas
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Store previous server values to calculate actual rate
  const prevServerValueRef = useRef(unclaimedRewards);
  const prevServerTimeRef = useRef(Date.now());

  // Derive actual rate from server data changes
  useEffect(() => {
    const now = Date.now();

    // Update state
    setLiveRewards(unclaimedRewards);

    // PRIORITIZE explicitly provided rate from backend
    if (stakingRate > 0) {
      setActualRate(stakingRate);
    } else {
      // Fallback: Calculate actual rate from server delta
      const serverValueDelta = unclaimedRewards - prevServerValueRef.current;
      const serverTimeDelta = (now - prevServerTimeRef.current) / 1000;

      let derivedRate = 0;
      if (serverTimeDelta > 0 && serverValueDelta >= 0) {
        derivedRate = serverValueDelta / serverTimeDelta;
      }
      setActualRate(derivedRate);
    }

    // Store for next comparison (still needed for fallback)
    prevServerValueRef.current = unclaimedRewards;
    prevServerTimeRef.current = now;
  }, [unclaimedRewards, stakingRate]);

  // Live counter - increments every second using ACTUAL rate from server
  useEffect(() => {
    if (actualRate <= 0) {
      return;
    }

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Update once per second using actual derived rate
    const updateInterval = 1000; // 1 second
    const incrementPerUpdate = actualRate; // Actual rate from server deltas

    intervalRef.current = setInterval(() => {
      setLiveRewards((prev) => {
        const newValue = prev + incrementPerUpdate;
        // Only log occasionally to reduce spam
        if (Math.random() < 0.1) {
          console.log(
            `⏱️ Counter tick: ${prev.toFixed(12)} → ${newValue.toFixed(
              12
            )} (+${incrementPerUpdate.toFixed(15)}/sec)`
          );
        }
        return newValue;
      });
    }, updateInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [actualRate]);

  // Format rewards with appropriate decimals
  const formatRewards = (value: number) => {
    if (value < 0.000001) return value.toFixed(12);
    if (value < 0.001) return value.toFixed(9);
    if (value < 1) return value.toFixed(6);
    return value.toFixed(4);
  };

  const formatRate = (value: number) => {
    if (value < 0.000000001) return value.toFixed(15);
    if (value < 0.000001) return value.toFixed(12);
    return value.toFixed(9);
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-black/40 border border-[#f4c752]/30 rounded-2xl shadow-[0_0_30px_rgba(244,199,82,0.1)] relative overflow-hidden group hover-border-glow animate-glow-pulse">
      {/* Background Glow Effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#f4c752]/5 to-transparent opacity-50 pointer-events-none" />

      <h2 className="text-[#f7dca1]/60 text-sm uppercase tracking-[0.3em] mb-6 z-10 font-medium">
        Mining Console
      </h2>

      <div className="flex flex-col items-center gap-2 mb-8 z-10">
        <div className="text-[#f7dca1]/80 text-xs uppercase tracking-widest flex items-center gap-2">
          Current Mining Rate
        </div>
        <div className="flex items-center gap-2 text-[#f4c752] text-2xl font-bold font-mono">
          <span className="animate-pulse">⚡</span>
          <span>{formatRate(actualRate)} SOL/s</span>
        </div>
        {actualRate > 0 && (
          <div className="text-xs text-[#f7dca1]/40">
            ~{(actualRate * 86400).toFixed(6)} SOL/day
          </div>
        )}
        
        {/* Booster Multiplier Display */}
        {(boosterMultiplier > 1.0 || (activeBoosters && activeBoosters.length > 0)) && (
          <div className="mt-2 pt-2 border-t border-[#f4c752]/20">
            <div className="text-[#f7dca1]/60 text-xs uppercase tracking-widest mb-2">
              Booster Multipliers
            </div>
            <div className="flex flex-col gap-1">
              {activeBoosters?.map((booster, index) => (
                <div key={index} className="flex items-center justify-between text-xs">
                  <span className="text-[#f7dca1]/80">{booster.name}</span>
                  <span className="text-[#f4c752] font-mono">×{booster.multiplier}</span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-1 border-t border-[#f4c752]/20">
                <span className="text-[#f7dca1]/60">Total Multiplier</span>
                <span className="text-[#f4c752] font-bold font-mono">{boosterMultiplier.toFixed(3)}x</span>
              </div>
              {stakingRate === 0 && (
                <div className="text-xs text-[#f7dca1]/40 mt-2 text-center">
                  ⚠️ Stake tokens to activate booster multiplier
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-2 mb-8 z-10">
        <div className="text-[#f7dca1]/80 text-xs uppercase tracking-widest flex items-center gap-2">
          Unclaimed Rewards
          {isRewardsPaused ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/20 rounded text-yellow-400 text-[10px]">
              <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></span>
              PAUSED
            </span>
          ) : actualRate > 0 ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded text-green-400 text-[10px]">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
              LIVE
            </span>
          ) : null}
        </div>
        <div className="text-4xl md:text-5xl font-bold text-white font-mono tracking-tight drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
          {formatRewards(liveRewards)}{" "}
          <span className="text-lg text-[#f4c752]">SOL</span>
        </div>
        {isRewardsPaused ? (
          <div className="text-xs text-yellow-400/80 text-center max-w-xs">
            Complete the NFT launch goal to activate rewards
          </div>
        ) : actualRate > 0 ? (
          <div className="text-xs text-[#f7dca1]/40">
            Year total: ~{(actualRate * 365 * 24 * 60 * 60).toFixed(4)} SOL
          </div>
        ) : null}
      </div>

      <button
        onClick={onClaim}
        disabled={liveRewards <= 0 || isRewardsPaused}
        className={`z-10 px-8 py-3 font-bold uppercase tracking-[0.2em] rounded-full transition-all active-scale ${
          liveRewards > 0
            ? "bg-[#f4c752] text-black hover-scale hover:shadow-[0_0_20px_rgba(244,199,82,0.4)]"
            : "bg-gray-800 text-gray-500 cursor-not-allowed"
        }`}
      >
        {liveRewards > 0 ? "Claim Rewards" : "No Rewards"}
      </button>
      {liveRewards > 0 && (
        <div className="text-xs text-[#f7dca1]/60 mt-2 z-10">
          💡 $2 fee applies when claiming
        </div>
      )}
    </div>
  );
}
