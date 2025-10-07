import { BOARD_KEY_PREFIX, STATS_KEY_PREFIX, COMPLETION_KEY_PREFIX } from "./constants";
import type { Difficulty, WordleBoardState, WordleStats, WordleCompletion } from "./types";

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

class MemoryStorage implements StorageLike {
  private map = new Map<string, string>();

  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }
}

function resolveStorage(): StorageLike {
  if (typeof window === "undefined") {
    return new MemoryStorage();
  }

  try {
    const storage = window.localStorage;
    const key = "realmkin-wordle-test";
    storage.setItem(key, "1");
    storage.removeItem(key);
    return storage;
  } catch (error) {
    return new MemoryStorage();
  }
}

const storage = resolveStorage();

function buildBoardKey(difficulty: Difficulty): string {
  return `${BOARD_KEY_PREFIX}-${difficulty}`;
}

function buildStatsKey(difficulty: Difficulty): string {
  return `${STATS_KEY_PREFIX}-${difficulty}`;
}

function buildCompletionKey(difficulty: Difficulty): string {
  return `${COMPLETION_KEY_PREFIX}-${difficulty}`;
}

export function loadBoardState(difficulty: Difficulty): WordleBoardState | null {
  const raw = storage.getItem(buildBoardKey(difficulty));
  if (!raw) return null;

  try {
    return JSON.parse(raw) as WordleBoardState;
  } catch (error) {
    storage.removeItem(buildBoardKey(difficulty));
    return null;
  }
}

export function saveBoardState(state: WordleBoardState): void {
  try {
    storage.setItem(buildBoardKey(state.difficulty), JSON.stringify(state));
  } catch (error) {
    // Ignore errors (e.g., storage quota)
  }
}

export function clearBoardState(difficulty: Difficulty): void {
  storage.removeItem(buildBoardKey(difficulty));
}

export function loadStats(difficulty: Difficulty): WordleStats {
  const raw = storage.getItem(buildStatsKey(difficulty));
  if (!raw) {
    return {
      gamesPlayed: 0,
      gamesWon: 0,
      currentStreak: 0,
      maxStreak: 0,
      lastPlayed: null,
    } satisfies WordleStats;
  }

  try {
    const parsed = JSON.parse(raw) as WordleStats;
    return {
      gamesPlayed: parsed.gamesPlayed ?? 0,
      gamesWon: parsed.gamesWon ?? 0,
      currentStreak: parsed.currentStreak ?? 0,
      maxStreak: parsed.maxStreak ?? 0,
      lastPlayed: parsed.lastPlayed ?? null,
    } satisfies WordleStats;
  } catch (error) {
    storage.removeItem(buildStatsKey(difficulty));
    return {
      gamesPlayed: 0,
      gamesWon: 0,
      currentStreak: 0,
      maxStreak: 0,
      lastPlayed: null,
    } satisfies WordleStats;
  }
}

export function saveStats(difficulty: Difficulty, stats: WordleStats): void {
  try {
    storage.setItem(buildStatsKey(difficulty), JSON.stringify(stats));
  } catch (error) {
    // Ignore
  }
}

export function loadCompletion(difficulty: Difficulty): WordleCompletion | null {
  const raw = storage.getItem(buildCompletionKey(difficulty));
  if (!raw) return null;

  try {
    return JSON.parse(raw) as WordleCompletion;
  } catch (error) {
    storage.removeItem(buildCompletionKey(difficulty));
    return null;
  }
}

export function saveCompletion(difficulty: Difficulty, completion: WordleCompletion): void {
  try {
    storage.setItem(buildCompletionKey(difficulty), JSON.stringify(completion));
  } catch (error) {
    // ignore
  }
}

export function clearCompletion(difficulty: Difficulty): void {
  storage.removeItem(buildCompletionKey(difficulty));
}
