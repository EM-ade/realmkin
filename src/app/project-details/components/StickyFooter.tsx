'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function StickyFooter() {
    return (
        <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            transition={{ delay: 2, duration: 0.8, type: "spring" }}
            className="fixed bottom-0 left-0 right-0 z-40 p-4 md:hidden"
        >
            <div className="flex gap-4 p-4 rounded-2xl bg-[#0B0B09]/80 backdrop-blur-xl border border-[#DA9C2F]/20 shadow-2xl">
                <button
                    onClick={() => window.open('https://discord.gg/vwwbjFb4vQ', '_blank')}
                    className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold uppercase tracking-wider text-sm hover:bg-white/10 transition-colors"
                >
                    Discord
                </button>
                <button
                    onClick={() => window.open('https://www.nftlaunch.app/mint/realmkin', '_blank')}
                    className="flex-1 py-3 rounded-xl bg-[#DA9C2F] text-black font-black uppercase tracking-wider text-sm shadow-[0_0_20px_rgba(218,156,47,0.4)] hover:bg-[#F0B342] transition-colors"
                >
                    Mint Now
                </button>
            </div>
        </motion.div>
    );
}
