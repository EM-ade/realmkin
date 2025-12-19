import React from 'react';
import { LeaderboardEntry } from '@/hooks/useMiningData';

interface LeaderboardWidgetProps {
    entries: LeaderboardEntry[];
}

export function LeaderboardWidget({ entries }: LeaderboardWidgetProps) {
    return (
        <div className="bg-black/40 border border-[#f4c752]/20 rounded-xl p-6">
            <h3 className="text-[#f7dca1]/60 text-xs uppercase tracking-[0.2em] mb-4 font-medium">
                Top Miners (Weekly)
            </h3>

            <div className="space-y-3">
                {entries.map((entry) => (
                    <div key={entry.rank} className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-transparent hover:border-[#f4c752]/10 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className={`
                w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold
                ${entry.rank === 1 ? 'bg-[#f4c752] text-black' :
                                    entry.rank === 2 ? 'bg-[#f4c752]/70 text-black' :
                                        entry.rank === 3 ? 'bg-[#f4c752]/40 text-black' : 'bg-[#333] text-[#888]'}
              `}>
                                {entry.rank}
                            </div>
                            <span className="text-[#f7dca1] text-sm font-medium">{entry.username}</span>
                        </div>
                        <div className="text-[#f4c752] text-sm font-mono">
                            {entry.amountMined.toFixed(4)} SOL
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-4 pt-4 border-t border-[#f4c752]/10 text-center">
                <button className="text-[#f7dca1]/40 text-xs uppercase tracking-widest hover:text-[#f4c752] transition-colors">
                    View Full Leaderboard
                </button>
            </div>
        </div>
    );
}
