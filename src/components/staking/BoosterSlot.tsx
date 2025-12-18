import React from 'react';
import Image from 'next/image';
import { Booster } from '@/hooks/useMiningData';

interface BoosterSlotProps {
    booster?: Booster;
    onClick?: () => void;
}

export function BoosterSlot({ booster, onClick }: BoosterSlotProps) {
    return (
        <div
            onClick={onClick}
            className="relative aspect-square rounded-xl bg-black/40 border border-[#f4c752]/20 hover:border-[#f4c752]/50 transition-all cursor-pointer group overflow-hidden flex items-center justify-center"
        >
            {booster ? (
                <>
                    <div className="absolute inset-0">
                        {/* Placeholder for actual image */}
                        <div className="w-full h-full bg-gradient-to-br from-[#f4c752]/10 to-black" />
                    </div>
                    <div className="z-10 text-center p-2">
                        <div className="text-[#f4c752] font-bold text-sm uppercase tracking-wider">{booster.name}</div>
                        <div className="text-[#f7dca1]/60 text-xs mt-1">+{booster.boostPercent}% Rate</div>
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
