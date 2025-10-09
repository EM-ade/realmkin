"use client";

import clsx from "clsx";
import Image from "next/image";
import { LeaderboardEntry } from "@/types/leaderboard";

const DEFAULT_AVATAR = "/realmkin-logo.png";

const RANK_EMOJIS: Record<number, string> = {
  1: "🥇",
  2: "🥈",
  3: "🥉",
};

interface LeaderboardEntryProps {
  entry: LeaderboardEntry;
  highlight?: boolean;
  showDivider?: boolean;
  valueSuffix?: string;
  valuePrefix?: string;
  showGamesPlayed?: boolean;
}

function formatBreakdownKey(key: string) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/[-_]/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

export default function LeaderboardEntryRow({
  entry,
  highlight = false,
  showDivider = true,
  valueSuffix,
  valuePrefix,
  showGamesPlayed = false,
}: LeaderboardEntryProps) {
  const displayValue =
    entry.valueLabel ?? `${valuePrefix ?? ""}${entry.value.toLocaleString()}${valueSuffix ?? ""}`;
  const medal = RANK_EMOJIS[entry.rank];
  const avatarSrc = entry.avatarUrl && entry.avatarUrl.trim().length > 0 ? entry.avatarUrl : DEFAULT_AVATAR;

  const breakdownLabel = entry.breakdown
    ? Object.entries(entry.breakdown)
        .slice(0, 2)
        .map(([key, value]) => `${formatBreakdownKey(key)}: ${value}`)
        .join(" • ")
    : null;

  return (
    <li
      className={clsx(
        "flex flex-col rounded-2xl border border-transparent transition hover:border-[#DA9C2F]/25",
        highlight ? "bg-[#DA9C2F]/10" : "bg-[#0e0905]/80"
      )}
    >
      <div className="flex items-center gap-4 px-4 py-3">
        <div
          className={clsx(
            "flex h-10 w-10 items-center justify-center rounded-2xl border text-lg font-semibold text-[#F4C752]",
            highlight
              ? "border-[#F4C752] bg-[#F4C752]/10"
              : "border-[#DA9C2F]/40 bg-[#DA9C2F]/10"
          )}
        >
          {medal ?? `#${entry.rank}`}
        </div>

        <div className="flex items-center gap-3">
          {/* <div className="relative h-10 w-10 overflow-hidden rounded-full border border-[#DA9C2F]/25 bg-[#0B0B09]">
            <Image
              src={avatarSrc}
              alt={entry.username}
              fill
              sizes="40px"
              className="object-cover"
            />
          </div> */}

          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.26em] text-[#F4C752]">
              {entry.username}
            </p>
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.32em] text-white/45">
              {highlight ? <span className="text-[#75d4cc]">You</span> : null}
              {/* {entry.gamesPlayed != null ? <span>{`${entry.gamesPlayed} games`}</span> : null} */}
              {/* {breakdownLabel ? <span>{breakdownLabel}</span> : null} */}
            </div>
          </div>
        </div>

        <div className="ml-auto flex flex-col items-end gap-1">
          <span className="text-lg font-bold tracking-[0.18em] text-[#DA9C2F]">{displayValue}</span>
          {showGamesPlayed && entry.gamesPlayed != null ? (
            <span className="text-[10px] uppercase tracking-[0.28em] text-white/40">
              {entry.gamesPlayed} games
            </span>
          ) : null}
        </div>
      </div>

      {showDivider ? (
        <div className="mx-4 mb-2 border-b border-[#DA9C2F]/10" aria-hidden="true" />
      ) : null}
    </li>
  );
}
