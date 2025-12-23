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
        const data = await getGoal();
        setGoal(data);
      } catch (error) {
        console.error("Failed to fetch goal:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchGoal();

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchGoal, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !goal) {
    return null; // Or a loading skeleton
  }

  const progress = Math.min((goal.current / goal.target) * 100, 100);
  const isExpandedWidth = mobile ? 320 : 380;
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
            className="fixed inset-0 bg-black/40 z-[9999] pointer-events-auto cursor-default"
            onClick={() => setIsExpanded(false)}
          />
        )}
      </AnimatePresence>

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
          className="bg-black/90 border border-[#DA9C2F]/30 shadow-2xl overflow-hidden cursor-pointer relative backdrop-blur-sm"
          style={{
            transformOrigin: "top center",
            WebkitFontSmoothing: "antialiased",
            backgroundColor: "rgba(17, 17, 17, 0.95)", // Semi-transparent dark
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(218, 156, 47, 0.2)",
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
                  } rounded-full bg-[#DA9C2F] animate-pulse`}
                />
                <span
                  className={`${
                    mobile ? "text-[10px]" : "text-[11px]"
                  } font-bold text-[#DA9C2F] whitespace-nowrap uppercase tracking-wider`}
                >
                  {goal.current}/{goal.target} NFTs
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
                  <div className="text-[11px] font-bold text-[#DA9C2F]/80 uppercase tracking-[0.25em] mb-2">
                    COMMUNITY GOAL
                  </div>
                  <div className="text-[18px] font-bold text-[#DA9C2F] uppercase tracking-[0.15em]">
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
                  <div className="flex justify-between text-[11px] text-white/70 tracking-widest">
                    <span>Progress</span>
                    <span className="text-[#DA9C2F]">
                      {goal.current} / {goal.target} MINTED
                    </span>
                  </div>
                </div>

                {/* Top Contributors Rewards */}
                <div className="space-y-3">
                  <div className="text-center">
                    <div className="text-[10px] font-bold text-[#DA9C2F]/80 uppercase tracking-[0.2em] mb-3">
                      —— Top Contributors Rewards ——
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-[11px] text-white/90 tracking-wide">
                      <span className="text-[#DA9C2F] font-bold">1st:</span> 3 Weeks ×2 Booster
                    </div>
                    <div className="text-[11px] text-white/90 tracking-wide">
                      <span className="text-[#DA9C2F] font-bold">2nd:</span> 2 Weeks ×2 Booster
                    </div>
                    <div className="text-[11px] text-white/90 tracking-wide">
                      <span className="text-[#DA9C2F] font-bold">3rd:</span> 1 Week ×2 Booster
                    </div>
                  </div>
                </div>

                {/* Next Goal */}
                <div className="space-y-2 border-t border-[#DA9C2F]/20 pt-4">
                  <div className="text-center">
                    <div className="text-[10px] font-bold text-[#DA9C2F]/80 uppercase tracking-[0.2em] mb-2">
                      —— Next Goal ——
                    </div>
                    <div className="text-[10px] text-white/60 tracking-wide">
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
