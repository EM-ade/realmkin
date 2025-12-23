"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function DynamicIsland({
  mobile = false,
  className = "",
}: {
  mobile?: boolean;
  className?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Mock Data for Design Phase
  const goal = {
    title: "NFT Launch Phase 1",
    current: 42,
    target: 100,
    unit: "Sold",
    isPaused: true, // Simulating the "Mining Paused" state
  };

  const progress = Math.min((goal.current / goal.target) * 100, 100);
  const isExpandedWidth = mobile ? 240 : 260;
  const isCollapsedWidth = mobile ? 140 : 180;

  return (
    <>
      {/* Backdrop for Expanded State */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[9999] pointer-events-auto cursor-default"
            onClick={() => setIsExpanded(false)}
          />
        )}
      </AnimatePresence>

      <div
        className={`
        flex justify-center items-center pointer-events-auto
        ${isExpanded ? "z-[10000]" : "z-40"}
        ${className}
      `}
      >
        <motion.div
          layout
          initial={{ borderRadius: 50 }}
          animate={{
            width: isExpanded ? isExpandedWidth : isCollapsedWidth,
            height: isExpanded ? "auto" : mobile ? 32 : 36,
            borderRadius: isExpanded ? 24 : 50,
          }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 30,
          }}
          className="bg-[#0B0B09]/95 backdrop-blur-2xl border border-[#DA9C2F]/40 shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden cursor-pointer relative"
          style={{
            transformOrigin: "top center",
          }}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <AnimatePresence mode="wait">
            {!isExpanded ? (
              // Collapsed State
              <motion.div
                key="collapsed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`flex items-center justify-center ${
                  mobile ? "gap-2 px-2" : "gap-3 px-4"
                } h-full w-full`}
              >
                <div
                  className={`${
                    mobile ? "w-1.5 h-1.5" : "w-2 h-2"
                  } rounded-full bg-[#DA9C2F] animate-pulse shadow-[0_0_10px_#DA9C2F]`}
                />
                <span
                  className={`${
                    mobile ? "text-[10px]" : "text-xs"
                  } font-bold text-[#DA9C2F] whitespace-nowrap uppercase tracking-wider`}
                >
                  Goal: {goal.current}/{goal.target}
                </span>
                <div
                  className={`${
                    mobile ? "w-8" : "w-12"
                  } h-1 bg-[#DA9C2F]/20 rounded-full overflow-hidden`}
                >
                  <div
                    className="h-full bg-[#DA9C2F]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </motion.div>
            ) : (
              // Expanded State
              <motion.div
                key="expanded"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-5 flex flex-col gap-5"
              >
                <div className="space-y-4">
                  <div>
                    <h4 className="text-[11px] font-bold text-[#DA9C2F] uppercase tracking-[0.2em] mb-3 text-center">
                      Mint 100 NFTS
                    </h4>
                    <div className="w-full h-3.5 bg-[#DA9C2F]/10 rounded-full overflow-hidden border border-[#DA9C2F]/20">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 1, ease: "circOut" }}
                        className="h-full bg-gradient-to-r from-[#DA9C2F] to-[#F4C752] shadow-[0_0_15px_rgba(218,156,47,0.6)]"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-white/90 tracking-widest">
                    <span>PROGRESS</span>
                    <span className="text-[#DA9C2F]">
                      {goal.current} / {goal.target} SOLD
                    </span>
                  </div>
                </div>

                <a
                  href="https://www.nftlaunch.app/mint/realmkin"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 bg-[#DA9C2F] hover:bg-[#F4C752] text-black font-black text-xs uppercase tracking-[0.1em] rounded-xl text-center transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  Mint Now ↗
                </a>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </>
  );
}
