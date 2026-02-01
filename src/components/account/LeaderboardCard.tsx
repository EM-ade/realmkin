"use client";

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
}

export default function LeaderboardCard({
  title,
  entries,
  userRank,
  loading,
}: LeaderboardCardProps) {
  return (
    <section className="bg-[#111111] rounded-2xl p-5 border border-[#27272a]">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
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

      {/* List */}
      {loading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {entries.map((entry) => {
            const medals: Record<number, string> = {
              1: "🥇",
              2: "🥈", 
              3: "🥉"
            };
            const medal = medals[entry.rank];
            
            return (
              <li key={entry.rank} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  {/* Medal */}
                  <div className="w-[40px] h-[40px] rounded-full bg-gradient-to-br from-[#facc15]/20 to-[#f59e0b]/20 border border-[#facc15]/30 flex items-center justify-center">
                    <span className="text-2xl">{medal || `#${entry.rank}`}</span>
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
