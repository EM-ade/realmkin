import React, { useState, useEffect } from "react";
import { fetchTop3Miners } from "@/services/leaderboardService";
import type { LeaderboardEntry } from "@/types/leaderboard";

interface LeaderboardWidgetProps {
  entries?: LeaderboardEntry[]; // Made optional since we'll fetch data internally
  type?: "rewards" | "staked";
}

export function LeaderboardWidget({ entries: propEntries, type = "rewards" }: LeaderboardWidgetProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLeaderboardData() {
      if (propEntries && propEntries.length > 0) {
        // Use provided entries if available
        setEntries(propEntries);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await fetchTop3Miners(type);
        setEntries(data);
      } catch (err) {
        console.error("Failed to fetch top miners:", err);
        setError("Failed to load leaderboard");
        setEntries([]); // Empty state
      } finally {
        setLoading(false);
      }
    }

    fetchLeaderboardData();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchLeaderboardData, 30000);
    return () => clearInterval(interval);
  }, [propEntries, type]);
  return (
    <div className="bg-black/40 border border-[#f4c752]/20 rounded-xl p-6">
      <h3 className="text-[#f7dca1]/60 text-xs uppercase tracking-[0.2em] mb-4 font-medium">
        Top Miners (Weekly)
      </h3>

      <div className="space-y-3">
        {loading ? (
          // Loading state
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-black/10 rounded-lg animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-[#f4c752]/20 rounded-full"></div>
                  <div className="w-20 h-4 bg-[#f7dca1]/20 rounded"></div>
                </div>
                <div className="w-16 h-4 bg-[#f4c752]/20 rounded"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          // Error state
          <div className="text-center py-6">
            <p className="text-[#f7dca1]/40 text-xs">
              {error}
            </p>
          </div>
        ) : entries.length === 0 ? (
          // Empty state
          <div className="text-center py-6">
            <p className="text-[#f7dca1]/40 text-xs">
              No miners yet this week
            </p>
            <p className="text-[#f7dca1]/20 text-xs mt-1">
              Start staking to join!
            </p>
          </div>
        ) : (
          // Data state
          entries.slice(0, 3).map((entry) => {
            // Extract amount from valueLabel or use value
            const amount = entry.valueLabel || entry.value.toString();
            const medals = ["🥇", "🥈", "🥉"];
            
            return (
              <div
                key={entry.userId}
                className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-transparent hover:border-[#f4c752]/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`
                    w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold
                    ${
                      entry.rank === 1
                        ? "bg-[#f4c752] text-black"
                        : entry.rank === 2
                        ? "bg-[#f4c752]/70 text-black"
                        : entry.rank === 3
                        ? "bg-[#f4c752]/40 text-black"
                        : "bg-[#333] text-[#888]"
                    }
                  `}
                  >
                    {medals[entry.rank - 1] || entry.rank}
                  </div>
                  <span className="text-[#f7dca1] text-sm font-medium">
                    {entry.username}
                  </span>
                </div>
                <div className="text-[#f4c752] text-sm font-mono">
                  {amount}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-[#f4c752]/10 text-center">
        <button className="text-[#f7dca1]/40 text-xs uppercase tracking-widest hover:text-[#f4c752] transition-colors">
          View Full Leaderboard
        </button>
      </div>
    </div>
  );
}
