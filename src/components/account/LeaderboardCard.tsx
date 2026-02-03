"use client";

import { useState } from "react";

interface LeaderboardEntry {
  rank: number;
  username: string;
  score: number;
  nftCount?: number;
  avatarUrl?: string;
}

interface LeaderboardCardProps {
  title: string;
  entries: LeaderboardEntry[];
  userRank?: number;
  loading?: boolean;
  onRefresh?: () => Promise<void>; // NEW: Refresh callback
  showRefreshButton?: boolean; // NEW: Show refresh button for secondary market only
}

export default function LeaderboardCard({
  title,
  entries,
  userRank,
  loading,
  onRefresh,
  showRefreshButton = false,
}: LeaderboardCardProps) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!onRefresh || refreshing) return;
    
    setRefreshing(true);
    try {
      await onRefresh();
    } catch (error) {
      console.error("Error refreshing leaderboard:", error);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <section className="bg-[#111111] rounded-2xl p-5 border border-[#27272a]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-yellow-500"
            fill="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M18.375 2.25c-1.035 0-1.875.84-1.875 1.875v15.75c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V4.125c0-1.035-.84-1.875-1.875-1.875h-.75zM9.75 8.625c0-1.035-.84-1.875-1.875-1.875h-.75c-1.035 0-1.875.84-1.875 1.875v11.25c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V8.625zM3 13.125c0-1.035-.84-1.875-1.875-1.875h-.75C.375 11.25 0 12.09 0 13.125v6.75c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875v-6.75z" />
          </svg>
          <h2 className="text-white font-semibold">{title}</h2>
        </div>

        {/* Refresh Button */}
        {showRefreshButton && onRefresh && (
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className={`
              p-2 rounded-lg transition-all duration-200
              ${refreshing || loading
                ? 'bg-gray-800 cursor-not-allowed opacity-50'
                : 'bg-gray-800 hover:bg-gray-700 active:scale-95'
              }
            `}
            title="Refresh leaderboard data"
          >
            <svg
              className={`w-4 h-4 text-yellow-500 ${refreshing ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {entries.map((entry) => {
            // Medal colors for top 3
            const rankColors: Record<number, { border: string; bg: string }> = {
              1: { border: "border-yellow-500", bg: "from-yellow-500/20 to-yellow-600/20" },
              2: { border: "border-gray-400", bg: "from-gray-400/20 to-gray-500/20" },
              3: { border: "border-amber-600", bg: "from-amber-600/20 to-amber-700/20" }
            };
            const colors = rankColors[entry.rank] || { 
              border: "border-[#facc15]/30", 
              bg: "from-[#facc15]/20 to-[#f59e0b]/20" 
            };
            
            // Avatar URL - use user's avatar or default realmkin logo
            const avatarUrl = entry.avatarUrl || "/realmkin-logo.png";
            
            return (
              <li key={entry.rank} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  {/* Rank Badge (outside circle) */}
                  <div className="relative flex items-center gap-2">
                    {/* Rank Number */}
                    <div className={`w-8 h-8 rounded-md bg-gradient-to-br ${colors.bg} border ${colors.border} flex items-center justify-center`}>
                      <span className="text-sm font-bold text-yellow-500">#{entry.rank}</span>
                    </div>
                    
                    {/* Avatar */}
                    <div className={`w-[56px] h-[56px] rounded-full bg-gradient-to-br ${colors.bg} border-2 ${colors.border} flex items-center justify-center overflow-hidden relative`}>
                      <img 
                        src={avatarUrl}
                        alt={entry.username}
                        className="w-full h-full object-cover"
                        style={{ imageRendering: '-webkit-optimize-contrast' }}
                        loading="lazy"
                        onError={(e) => {
                          // Fallback to realmkin logo if image fails to load
                          e.currentTarget.src = "/realmkin-logo.png";
                        }}
                      />
                    </div>
                  </div>
                  
                  <span className="text-gray-200 text-sm font-medium">{entry.username}</span>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <span className="text-[#facc15] text-base font-bold">
                    {(entry.nftCount || entry.score).toLocaleString()}
                  </span>
                  <span className="text-gray-500 text-[10px] uppercase tracking-wider">
                    NFTs
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Footer */}
      {userRank && (
        <div className="border-t border-gray-800 mt-4 pt-4 text-center">
          <p className="text-gray-400 text-xs font-medium">
            Your Rank: <span className="text-yellow-400 font-bold">#{userRank}</span>
          </p>
        </div>
      )}
    </section>
  );
}
