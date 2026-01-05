import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { fetchTop3Miners, fetchTop10Miners } from "@/services/leaderboardService";
import type { LeaderboardEntry } from "@/types/leaderboard";

interface LeaderboardWidgetProps {
  entries?: LeaderboardEntry[]; // Made optional since we'll fetch data internally
  type?: "rewards" | "staked";
}

export function LeaderboardWidget({ entries: propEntries, type = "rewards" }: LeaderboardWidgetProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [top10Entries, setTop10Entries] = useState<LeaderboardEntry[]>([]);
  const [loadingTop10, setLoadingTop10] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    async function fetchLeaderboardData() {
      if (propEntries && propEntries.length > 0) {
        // Use provided entries if available
        if (isMounted) {
          setEntries(propEntries);
          setLoading(false);
        }
        return;
      }

      // Don't fetch if we already have data
      if (entries.length > 0) {
        return;
      }

      try {
        if (isMounted) {
          setLoading(true);
          setError(null);
        }
        const data = await fetchTop3Miners(type);
        if (isMounted) {
          setEntries(data);
        }
      } catch (err) {
        console.error("Failed to fetch top miners:", err);
        if (isMounted) {
          setError("Failed to load leaderboard");
          setEntries([]); // Empty state
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchLeaderboardData();
    
    // Refresh every 12 hours (43200000 ms = 12 * 60 * 60 * 1000)
    const interval = setInterval(() => {
      // Force refetch by clearing entries first
      setEntries([]);
      fetchLeaderboardData();
    }, 43200000);
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [type]); // Removed propEntries and entries from deps

  const handleViewFullLeaderboard = async () => {
    setShowModal(true);
    setLoadingTop10(true);
    try {
      const data = await fetchTop10Miners(type);
      setTop10Entries(data);
    } catch (err) {
      console.error("Failed to fetch top 10 miners:", err);
    } finally {
      setLoadingTop10(false);
    }
  };
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
        <button 
          onClick={handleViewFullLeaderboard}
          className="text-[#f7dca1]/40 text-xs uppercase tracking-widest hover:text-[#f4c752] transition-colors"
        >
          View Full Leaderboard
        </button>
      </div>

      {/* Modal - Using Portal to render at document root */}
      {showModal && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-[9999] flex items-center justify-center p-8 animate-fade-in"
          style={{ margin: 0, top: 0, left: 0, right: 0, bottom: 0 }}
          onClick={() => setShowModal(false)}
        >
          <div 
            className="bg-[#0a0a08] border-2 border-[#f4c752]/40 rounded-2xl w-full max-w-5xl h-[90vh] overflow-hidden animate-scale-in shadow-[0_0_50px_rgba(244,199,82,0.3)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-8 border-b border-[#f4c752]/20 bg-gradient-to-r from-[#f4c752]/5 to-transparent">
              <div>
                <h2 className="text-[#f4c752] text-3xl font-bold uppercase tracking-wider">
                  Top 10 Miners
                </h2>
                <p className="text-[#f7dca1]/60 text-sm mt-1">
                  {type === "staked" ? "Weekly Rankings by Staked Amount" : "Weekly Rankings by Rewards Earned"}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-[#f7dca1]/60 hover:text-[#f4c752] transition-all p-2 hover:bg-[#f4c752]/10 rounded-lg active-scale"
              >
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-8 overflow-y-auto h-[calc(90vh-200px)]">
              {loadingTop10 ? (
                <div className="space-y-3">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-5 bg-black/20 rounded-xl animate-pulse">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#f4c752]/20 rounded-full"></div>
                        <div className="w-40 h-5 bg-[#f7dca1]/20 rounded"></div>
                      </div>
                      <div className="w-32 h-5 bg-[#f4c752]/20 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : top10Entries.length === 0 ? (
                <div className="text-center py-20">
                  <div className="text-6xl mb-4">🏆</div>
                  <p className="text-[#f7dca1]/60 text-xl mb-2">No miners yet</p>
                  <p className="text-[#f7dca1]/40 text-base">Be the first to start mining!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {top10Entries.map((entry) => {
                    const amount = entry.valueLabel || entry.value.toString();
                    const medals = ["🥇", "🥈", "🥉"];
                    
                    return (
                      <div
                        key={entry.userId}
                        className={`flex items-center justify-between p-5 rounded-xl border transition-all hover-lift ${
                          entry.rank <= 3
                            ? 'bg-[#f4c752]/10 border-[#f4c752]/40'
                            : 'bg-black/30 border-[#f4c752]/15 hover:border-[#f4c752]/30'
                        }`}
                      >
                        <div className="flex items-center gap-5">
                          <div
                            className={`
                              w-12 h-12 flex items-center justify-center rounded-full text-lg font-bold
                              ${
                                entry.rank === 1
                                  ? "bg-[#f4c752] text-black scale-110 shadow-[0_0_20px_rgba(244,199,82,0.5)]"
                                  : entry.rank === 2
                                  ? "bg-[#f4c752]/70 text-black scale-105 shadow-[0_0_15px_rgba(244,199,82,0.3)]"
                                  : entry.rank === 3
                                  ? "bg-[#f4c752]/50 text-black shadow-[0_0_10px_rgba(244,199,82,0.2)]"
                                  : "bg-[#1a1a1a] text-[#999] border border-[#333]"
                              }
                            `}
                          >
                            {medals[entry.rank - 1] || `#${entry.rank}`}
                          </div>
                          <div>
                            <span className="text-[#f7dca1] text-lg font-semibold block">
                              {entry.username}
                            </span>
                            {entry.rank <= 3 && (
                              <span className="text-[#f4c752]/70 text-sm font-medium">
                                {entry.rank === 1 ? '👑 Champion' : entry.rank === 2 ? '🥈 Runner-up' : '🥉 Third Place'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[#f4c752] text-xl font-mono font-bold">
                            {amount}
                          </div>
                          <div className="text-[#f7dca1]/50 text-sm font-medium">
                            {type === "staked" ? "MKIN Staked" : "SOL Earned"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-[#f4c752]/20 bg-black/30">
              <div className="flex items-center justify-center gap-2 text-[#f7dca1]/50 text-sm">
                <svg className="w-4 h-4 animate-breathe" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                <span>Rankings update every 12 hours</span>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
