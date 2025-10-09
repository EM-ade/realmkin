// Leaderboard Type Definitions

export type GameType = "wordle" | "2048" | "traitCrush" | "wordBlast" | "checkers" | "poker";

export type LeaderboardCategory = "totalScore" | "streak" | (string & Record<never, never>);

export type Difficulty = "simple" | "intermediate" | "hard" | "advanced";

export interface LeaderboardEntry {
  userId: string;
  username: string;
  rank: number;
  value: number;
  valueLabel?: string;
  avatarUrl?: string;
  gamesPlayed?: number;
  breakdown?: Record<string, number>;
  lastUpdated?: number;
}

export interface LeaderboardTabConfig {
  key: LeaderboardCategory;
  label: string;
  icon?: string;
  description?: string;
  valueSuffix?: string;
  valuePrefix?: string;
}

export interface LeaderboardMeta {
  periodLabel?: string;
  periodRange?: string;
  countdownLabel?: string;
  timestamp?: number;
}

export interface LeaderboardSummary {
  totalPlayers?: number;
  totalGames?: number;
  userRank?: number;
  userValue?: number;
  userValueLabel?: string;
}
