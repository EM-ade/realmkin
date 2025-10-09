"use client";

import { ReactNode, useMemo } from "react";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import {
  LeaderboardCategory,
  LeaderboardEntry,
  LeaderboardMeta,
  LeaderboardSummary,
  LeaderboardTabConfig,
} from "@/types/leaderboard";
import LeaderboardTabs from "./LeaderboardTabs";
import LeaderboardEntryRow from "./LeaderboardEntry";

interface LeaderboardProps {
  title?: string;
  subtitle?: string;
  highlightUserId?: string;
  entries: LeaderboardEntry[];
  tabs: LeaderboardTabConfig[];
  activeTab: LeaderboardCategory;
  onTabChange?: (tab: LeaderboardCategory) => void;
  metadata?: LeaderboardMeta;
  summary?: LeaderboardSummary;
  isLoading?: boolean;
  emptyState?: ReactNode;
  className?: string;
  headerActions?: ReactNode;
  onViewArchive?: () => void;
}

const DEFAULT_EMPTY_STATE = (
  <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-[#DA9C2F]/30 bg-[#120C07]/60 px-6 py-10 text-center">
    <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#F4C752]">
      No champions yet
    </p>
    <p className="text-xs leading-relaxed text-white/60">
      Play your first game to claim a spot on this month&apos;s leaderboard.
    </p>
  </div>
);

export default function Leaderboard({
  title = "Monthly Leaderboard",
  subtitle,
  highlightUserId,
  entries,
  tabs,
  activeTab,
  onTabChange,
  metadata,
  summary,
  isLoading = false,
  emptyState = DEFAULT_EMPTY_STATE,
  className,
  headerActions,
  onViewArchive,
}: LeaderboardProps) {
  const activeTabConfig = useMemo(
    () => tabs.find((tab) => tab.key === activeTab) ?? tabs[0],
    [tabs, activeTab]
  );

  return (
    <section
      className={clsx(
        "relative w-full overflow-hidden rounded-[40px] border border-[#DA9C2F]/20 bg-[#050302]/92 shadow-[0_45px_120px_rgba(0,0,0,0.65)] backdrop-blur",
        className
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(244,199,82,0.07),_transparent)]" aria-hidden="true" />
      <div className="absolute -top-32 right-10 h-72 w-72 rounded-full bg-[#DA9C2F]/12 blur-[140px]" aria-hidden="true" />

      <div className="relative flex flex-col gap-8 p-6 lg:flex-row lg:p-8 xl:p-10">
        <div className="flex-1 space-y-6">
          <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.38em] text-[#DA9C2F]/70">
                {metadata?.periodLabel ?? "Current Month"}
              </p>
              <h2 className="text-2xl font-bold uppercase tracking-[0.3em] text-[#F4C752] md:text-3xl">
                {title}
              </h2>
              {subtitle ? (
                <p className="text-xs uppercase tracking-[0.28em] text-white/45">{subtitle}</p>
              ) : null}
            </div>

            <div className="flex flex-col items-start gap-3 md:items-end">
              <LeaderboardTabs tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} />
              <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.32em] text-white/40">
                {metadata?.periodRange ? <span>{metadata.periodRange}</span> : null}
                {metadata?.countdownLabel ? (
                  <span className="rounded-full border border-[#DA9C2F]/40 px-3 py-1 text-[#DA9C2F]">
                    {metadata.countdownLabel}
                  </span>
                ) : null}
                {headerActions}
              </div>
            </div>
          </header>

          <div className="relative rounded-[28px] border border-[#DA9C2F]/25 bg-[#0B0B09]/85 p-4 sm:p-5">
            <div className="absolute inset-0 rounded-[28px] bg-gradient-to-br from-[#DA9C2F]/10 via-transparent to-transparent" aria-hidden="true" />
            <div className="relative">
              <AnimatePresence initial={false} mode="wait">
                {isLoading ? (
                  <motion.ul
                    key="loading"
                    className="space-y-2"
                    initial={{ opacity: 0.6 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {Array.from({ length: 6 }).map((_, index) => (
                      <li
                        key={`skeleton-${index}`}
                        className="flex items-center gap-4 rounded-2xl border border-[#DA9C2F]/15 bg-[#120C07]/70 px-4 py-4"
                      >
                        <div className="h-10 w-10 animate-pulse rounded-2xl bg-[#DA9C2F]/20" />
                        <div className="flex h-10 w-10 animate-pulse rounded-full border border-[#DA9C2F]/15 bg-[#DA9C2F]/15" />
                        <div className="flex flex-1 flex-col gap-2">
                          <div className="h-3 w-1/3 animate-pulse rounded-full bg-white/20" />
                          <div className="h-2 w-1/4 animate-pulse rounded-full bg-white/10" />
                        </div>
                        <div className="h-4 w-16 animate-pulse rounded-full bg-[#DA9C2F]/20" />
                      </li>
                    ))}
                  </motion.ul>
                ) : entries.length === 0 ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                  >
                    {emptyState}
                  </motion.div>
                ) : (
                  <motion.ul
                    key="content"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-2"
                  >
                    {entries.map((entry, index) => (
                      <LeaderboardEntryRow
                        key={`${entry.userId}-${entry.rank}`}
                        entry={entry}
                        highlight={entry.userId === highlightUserId}
                        showDivider={index !== entries.length - 1}
                        valueSuffix={activeTabConfig?.valueSuffix}
                        valuePrefix={activeTabConfig?.valuePrefix}
                        showGamesPlayed={activeTab === "totalScore"}
                      />
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <aside className="w-full max-w-sm space-y-4 rounded-[32px] border border-[#DA9C2F]/20 bg-[#0B0B09]/80 p-5 shadow-[0_30px_80px_rgba(0,0,0,0.55)]">
          <h3 className="text-sm font-semibold uppercase tracking-[0.32em] text-[#F4C752]">Ledger Overview</h3>
          <div className="grid grid-cols-1 gap-3">
            <SummaryCard label="Total Players" value={summary?.totalPlayers ?? 0} />
            <SummaryCard label="Games Logged" value={summary?.totalGames ?? 0} />
            <SummaryCard
              label="Your Rank"
              value={summary?.userRank ? `#${summary.userRank}` : "—"}
              accent
            />
            <SummaryCard
              label={activeTabConfig?.label ?? "Score"}
              value={summary?.userValueLabel ?? summary?.userValue ?? "—"}
              helper="keeps updating as you play"
            />
          </div>

          <div className="rounded-2xl border border-[#DA9C2F]/25 bg-[#120C07]/50 px-4 py-5 text-[11px] uppercase tracking-[0.32em] text-white/50">
            <p className="text-[#DA9C2F]">Monthly Reset</p>
            <p className="mt-2 text-white/70">
              Scores refresh at midnight UTC on the first day of each month.
            </p>
            {onViewArchive ? (
              <button
                type="button"
                className="mt-4 w-full rounded-full border border-[#DA9C2F]/40 px-4 py-2 text-xs font-semibold text-[#DA9C2F] transition hover:bg-[#DA9C2F]/15"
                onClick={onViewArchive}
              >
                View Past Champions
              </button>
            ) : null}
          </div>
        </aside>
      </div>
    </section>
  );
}

interface SummaryCardProps {
  label: string;
  value: ReactNode;
  helper?: string;
  accent?: boolean;
}

function SummaryCard({ label, value, helper, accent = false }: SummaryCardProps) {
  return (
    <div
      className={clsx(
        "rounded-2xl border px-4 py-3",
        accent ? "border-[#F4C752]/60 bg-[#F4C752]/10" : "border-[#DA9C2F]/25 bg-[#120C07]/60"
      )}
    >
      <p
        className={clsx(
          "text-[11px] uppercase tracking-[0.32em]",
          accent ? "text-[#F4C752]" : "text-[#DA9C2F]/80"
        )}
      >
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold tracking-[0.2em] text-white">{value}</p>
      {helper ? <p className="mt-2 text-[10px] uppercase tracking-[0.28em] text-white/35">{helper}</p> : null}
    </div>
  );
}
