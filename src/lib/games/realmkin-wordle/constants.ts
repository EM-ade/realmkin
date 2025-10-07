import type { Difficulty } from "./types";

export const WORD_LENGTH = 5;
export const MAX_ATTEMPTS = 6;

export const DIFFICULTIES: Difficulty[] = ["simple", "intermediate", "advanced"];

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  simple: "Simple",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export const WORDLE_EPOCH = new Date(Date.UTC(2024, 0, 1));

export const BOARD_KEY_PREFIX = "realmkin-wordle-board";
export const STATS_KEY_PREFIX = "realmkin-wordle-stats";
export const COMPLETION_KEY_PREFIX = "realmkin-wordle-completed";
