// Letter in the circle
export interface Letter {
  char: string;
  index: number; // Position in circle (0-4)
  isSelected: boolean;
  isValidated: boolean;
  isRare: boolean; // Q, X, Z
}

// Bonus types for a found word
export interface WordBonuses {
  speed: boolean;
  rareLetters: number;
  combo: number;
}

// Found word with metadata
export interface FoundWord {
  word: string;
  points: number;
  timestamp: number;
  bonuses: WordBonuses;
}

// Session statistics
export interface SessionStats {
  totalWords: number;
  bestWord: FoundWord | null;
  longestStreak: number;
  highScore: number;
}

// Game status
export type GameStatus = 'idle' | 'playing' | 'paused' | 'ended';

// Difficulty tier
export type DifficultyTier = 'easy' | 'medium' | 'hard' | 'expert';

// Difficulty configuration
export interface DifficultyConfig {
  vowelPercentage: number;
  rareLetterCount: number;
  minWords: number;
  timeBonus: number;
}

// Complete game state
export interface GameState {
  letters: Letter[]; // Array of 4-5 letters in circle
  currentPath: number[]; // Indices of selected letters
  foundWords: FoundWord[];
  score: number;
  multiplier: number;
  timeRemaining: number;
  gameStatus: GameStatus;
  roundsCleared: number;
  currentDifficulty: DifficultyTier;
  totalWordsAvailable: number;
  lastWordTime: number;
  sessionStats: SessionStats;
}

// Letter generation result
export interface LetterSetResult {
  letters: Letter[];
  totalWords: number;
  validWords: Set<string>;
}

// Persistent storage
export interface PersistentStats {
  highScore: number;
  totalGamesPlayed: number;
  totalWordsFound: number;
  totalGridsCleared: number;
  bestStreak: number;
  lastPlayed: number;
}
