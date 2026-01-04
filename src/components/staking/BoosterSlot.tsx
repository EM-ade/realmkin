import React from 'react';
import Image from 'next/image';

interface BoosterSlotProps {
    booster?: {
        type: string;
        name: string;
        multiplier: number;
        category: string;
        mints: string[];
        detectedAt: Date;
    };
    onClick?: () => void;
}

export function BoosterSlot({ booster, onClick }: BoosterSlotProps) {
    const getBoosterColor = (category: string) => {
        switch (category) {
            case 'random_1_1':
                return 'from-blue-500/20 to-blue-600';
            case 'custom_1_1':
                return 'from-purple-500/20 to-purple-600';
            case 'solana_miner':
                return 'from-orange-500/20 to-orange-600';
            default:
                return 'from-gray-500/20 to-gray-600';
        }
    };

    const getBoosterIcon = (category: string) => {
        switch (category) {
            case 'random_1_1':
                return '🎲';
            case 'custom_1_1':
                return '🎨';
            case 'solana_miner':
                return '⛏️';
            default:
                return '✨';
        }
    };

    return (
        <div
            onClick={onClick}
            className="relative aspect-square rounded-xl bg-black/40 border border-[#f4c752]/20 hover:border-[#f4c752]/50 transition-all cursor-pointer group overflow-hidden flex items-center justify-center"
        >
            {booster ? (
                <>
                    <div className="absolute inset-0">
                        <div className={`w-full h-full bg-gradient-to-br ${getBoosterColor(booster.category)}`} />
                    </div>
                    <div className="z-10 text-center p-2">
                        <div className="flex items-center justify-center gap-1 mb-1">
                            <span className="text-lg">{getBoosterIcon(booster.category)}</span>
                            <div className="text-[#f4c752] font-bold text-sm uppercase tracking-wider">{booster.name}</div>
                        </div>
                        <div className="text-[#f7dca1]/60 text-xs">×{booster.multiplier}x Multiplier</div>
                        <div className="text-[#f7dca1]/40 text-xs mt-1">
                            {booster.mints.length} NFT{booster.mints.length === 1 ? '' : 's'} detected
                        </div>
                    </div>
                    <div className="absolute top-2 right-2 px-2 py-0.5 bg-[#f4c752] text-black text-[10px] font-bold uppercase rounded-full">
                        Active
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-center gap-2 text-[#f7dca1]/30 group-hover:text-[#f4c752]/60 transition-colors">
                    <span className="text-2xl">+</span>
                    <span className="text-xs uppercase tracking-widest">Add Booster</span>
                </div>
            )}
        </div>
    );
}
