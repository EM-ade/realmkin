import React from 'react';

interface MiningConsoleProps {
    stakingRate: number;
    unclaimedRewards: number;
    onClaim: () => void;
}

export function MiningConsole({ stakingRate, unclaimedRewards, onClaim }: MiningConsoleProps) {
    return (
        <div className="flex flex-col items-center justify-center p-8 bg-black/40 border border-[#f4c752]/30 rounded-2xl shadow-[0_0_30px_rgba(244,199,82,0.1)] relative overflow-hidden group">
            {/* Background Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#f4c752]/5 to-transparent opacity-50 pointer-events-none" />

            <h2 className="text-[#f7dca1]/60 text-sm uppercase tracking-[0.3em] mb-6 z-10 font-medium">
                Mining Console
            </h2>

            <div className="flex flex-col items-center gap-2 mb-8 z-10">
                <div className="text-[#f7dca1]/80 text-xs uppercase tracking-widest">Current Staking Rate</div>
                <div className="flex items-center gap-2 text-[#f4c752] text-2xl font-bold font-mono">
                    <span className="animate-pulse">⚡</span>
                    <span>{stakingRate.toFixed(5)} MKIN/s</span>
                </div>
            </div>

            <div className="flex flex-col items-center gap-2 mb-8 z-10">
                <div className="text-[#f7dca1]/80 text-xs uppercase tracking-widest">Unclaimed Rewards</div>
                <div className="text-4xl md:text-5xl font-bold text-white font-mono tracking-tight drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                    {unclaimedRewards.toFixed(4)} <span className="text-lg text-[#f4c752]">MKIN</span>
                </div>
            </div>

            <button
                onClick={onClaim}
                className="z-10 px-8 py-3 bg-[#f4c752] text-black font-bold uppercase tracking-[0.2em] rounded-full hover:scale-105 hover:shadow-[0_0_20px_rgba(244,199,82,0.4)] transition-all active:scale-95"
            >
                Claim Rewards
            </button>
        </div>
    );
}
