"use client";

import clsx from "clsx";
import { LeaderboardCategory, LeaderboardTabConfig } from "@/types/leaderboard";

interface LeaderboardTabsProps {
  tabs: LeaderboardTabConfig[];
  activeTab: LeaderboardCategory;
  onTabChange?: (tab: LeaderboardCategory) => void;
  className?: string;
}

export default function LeaderboardTabs({ tabs, activeTab, onTabChange, className }: LeaderboardTabsProps) {
  return (
    <div
      className={clsx(
        "inline-flex items-center gap-2 rounded-full border border-[#DA9C2F]/25 bg-[#0B0B09]/80 p-1",
        className
      )}
      role="tablist"
      aria-label="Leaderboard categories"
    >
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange?.(tab.key)}
            className={clsx(
              "flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.28em] transition",
              isActive
                ? "bg-[#DA9C2F] text-[#050302] shadow-[0_12px_28px_rgba(218,156,47,0.25)]"
                : "text-[#DA9C2F] hover:bg-[#DA9C2F]/10"
            )}
          >
            {tab.icon ? <span className="text-sm">{tab.icon}</span> : null}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
