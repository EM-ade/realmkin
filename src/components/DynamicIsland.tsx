"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getGoal, type Goal } from "@/services/goalService";

export default function DynamicIsland({
  mobile = false,
  className = "",
}: {
  mobile?: boolean;
  className?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch goal data on mount
  useEffect(() => {
    async function fetchGoal() {
      try {
        console.log("🎯 DynamicIsland: Fetching goal data...");
        const data = await getGoal();
        console.log("🎯 DynamicIsland: Goal data received:", data);
        setGoal(data);
      } catch (error) {
        console.error("🎯 DynamicIsland: Failed to fetch goal:", error);
        // Still show component with default data
      } finally {
        setLoading(false);
      }
    }
    fetchGoal();

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchGoal, 30000);
    return () => clearInterval(interval);
  }, []);

  // Show component even if loading, with default data
  const displayGoal = goal || {
    id: "default",
    title: "Mint 100 NFTs",
    description: "Complete this goal to activate staking rewards",
    current: 0,
    target: 100,
    isCompleted: false,
    createdAt: null,
    updatedAt: null,
  };

  const progress = Math.min((displayGoal.current / displayGoal.target) * 100, 100);
  const isExpandedWidth = mobile ? 320 : 380;
  const isCollapsedWidth = mobile ? 140 : 180;

  return (
    <>

      <div
        className={`
        flex justify-center items-center pointer-events-auto
        ${isExpanded ? "z-[20000]" : "z-40"}
        ${className}
      `}
      >
        <motion.div
          animate={{
            width: isExpanded ? isExpandedWidth : isCollapsedWidth,
            height: isExpanded ? "auto" : mobile ? 32 : 36,
            borderRadius: isExpanded ? 20 : 50,
          }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 35,
          }}
          className="border border-[#F4C752]/50 shadow-2xl overflow-hidden cursor-pointer relative"
          style={{
            transformOrigin: "top center",
            WebkitFontSmoothing: "antialiased",
            backgroundColor: "#1a1a1a",
            background: "#1a1a1a",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px #F4C752, inset 0 1px 0 rgba(244, 199, 82, 0.3)",
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
                  mobile ? "gap-2 px-3" : "gap-3 px-4"
                } h-full w-full`}
                style={{ height: mobile ? 32 : 36 }}
              >
                <div
                  className={`${
                    mobile ? "w-1.5 h-1.5" : "w-2 h-2"
                  } rounded-full bg-[#F4C752] animate-pulse shadow-sm shadow-[#F4C752]/50`}
                />
                <span
                  className={`${
                    mobile ? "text-[10px]" : "text-[11px]"
                  } font-bold text-[#F4C752] whitespace-nowrap uppercase tracking-wider`}
                >
                  {loading ? "Loading..." : `${displayGoal.current}/${displayGoal.target} NFTs`}
                </span>
                <div
                  className={`${
                    mobile ? "w-8" : "w-12"
                  } h-1.5 bg-[#333]/50 rounded-full overflow-hidden`}
                >
                  <div
                    className="h-full bg-gradient-to-r from-[#DA9C2F] to-[#F4C752] rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </motion.div>
            ) : (
              // Expanded State
              <motion.div
                key="expanded"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-6 flex flex-col gap-6"
              >
                {/* Header */}
                <div className="text-center">
                  <div className="text-[11px] font-bold text-[#F4C752] uppercase tracking-[0.25em] mb-2">
                    COMMUNITY GOAL
                  </div>
                  <div className="text-[18px] font-bold text-[#F4C752] uppercase tracking-[0.15em]">
                    100 REALMKIN NFTs
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-3">
                  <div className="w-full h-2 bg-[#333]/50 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 1, ease: "circOut" }}
                      className="h-full bg-gradient-to-r from-[#DA9C2F] to-[#F4C752] rounded-full"
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-white/90 tracking-widest">
                    <span>Progress</span>
                    <span className="text-[#F4C752]">
                      {displayGoal.current} / {displayGoal.target} MINTED
                    </span>
                  </div>
                </div>

                {/* Top Contributors Rewards */}
                <div className="space-y-3">
                  <div className="text-center">
                    <div className="text-[10px] font-bold text-[#F4C752]/90 uppercase tracking-[0.2em] mb-3">
                      —— Top Contributors Rewards ——
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-[11px] text-white/95 tracking-wide">
                      <span className="text-[#F4C752] font-bold">1st:</span> 3 Weeks ×2 Booster
                    </div>
                    <div className="text-[11px] text-white/95 tracking-wide">
                      <span className="text-[#F4C752] font-bold">2nd:</span> 2 Weeks ×2 Booster
                    </div>
                    <div className="text-[11px] text-white/95 tracking-wide">
                      <span className="text-[#F4C752] font-bold">3rd:</span> 1 Week ×2 Booster
                    </div>
                  </div>
                </div>

                {/* Mint Button */}
                <div className="pt-2">
                  <a
                    href="https://www.nftlaunch.app/mint/realmkin"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 bg-gradient-to-r from-[#F4C752] to-[#DA9C2F] hover:from-[#F4C752]/90 hover:to-[#DA9C2F]/90 text-black font-bold text-[12px] uppercase tracking-[0.15em] rounded-xl text-center transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 group"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span>Mint Now</span>
                    <span className="group-hover:translate-x-0.5 transition-transform">↗</span>
                  </a>
                </div>

                {/* Next Goal */}
                <div className="space-y-2 border-t border-[#F4C752]/20 pt-4">
                  <div className="text-center">
                    <div className="text-[10px] font-bold text-[#F4C752]/90 uppercase tracking-[0.2em] mb-2">
                      —— Next Goal ——
                    </div>
                    <div className="text-[10px] text-white/80 tracking-wide">
                      Unlocks after this goal is completed.
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </>
  );
}
