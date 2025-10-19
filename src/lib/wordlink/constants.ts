import { DifficultyConfig, DifficultyTier } from './types';

// Rare letters that give bonus points
export const RARE_LETTERS = ['Q', 'X', 'Z', 'J'];

// Common vowels
export const VOWELS = ['A', 'E', 'I', 'O', 'U'];

// Common consonants (weighted by frequency)
export const CONSONANTS = [
  'T', 'N', 'S', 'R', 'H', 'L', 'D', 'C', 'M', 'F',
  'P', 'G', 'W', 'Y', 'B', 'V', 'K', 'J', 'X', 'Q', 'Z'
];

// Scoring constants
export const POINTS = {
  THREE_LETTER: 10,
  FOUR_LETTER: 25,
  COMBO_BONUS: 5,
  SPEED_BONUS: 10,
  RARE_LETTER_BONUS: 15,
  GRID_MASTERY_BONUS: 100,
  TIME_BONUS: 5, // seconds
};

// Speed bonus threshold (milliseconds)
export const SPEED_THRESHOLD = 2000;

// Game timing
export const INITIAL_TIME = 90; // seconds
export const WARNING_TIME = 15; // seconds

// Circle configuration - favor 5 letters for more 4-letter words
export const MIN_LETTERS = 5;
export const MAX_LETTERS = 5;

// Difficulty configurations
export const DIFFICULTY_CONFIGS: Record<DifficultyTier, DifficultyConfig> = {
  easy: {
    vowelPercentage: 0.40, // Lower vowels = fewer 3-letter words
    rareLetterCount: 0,
    minWords: 3, // Minimum words to generate
    timeBonus: 5,
  },
  medium: {
    vowelPercentage: 0.40,
    rareLetterCount: 1,
    minWords: 5,
    timeBonus: 5,
  },
  hard: {
    vowelPercentage: 0.40,
    rareLetterCount: 1,
    minWords: 7,
    timeBonus: 5,
  },
  expert: {
    vowelPercentage: 0.40,
    rareLetterCount: 2,
    minWords: 10,
    timeBonus: 5,
  },
};

// Difficulty progression thresholds
export const DIFFICULTY_THRESHOLDS = {
  easy: 0,
  medium: 3,
  hard: 6,
  expert: 10,
};

// Get difficulty tier based on grids cleared
export function getDifficultyTier(gridsCleared: number): DifficultyTier {
  if (gridsCleared >= DIFFICULTY_THRESHOLDS.expert) return 'expert';
  if (gridsCleared >= DIFFICULTY_THRESHOLDS.hard) return 'hard';
  if (gridsCleared >= DIFFICULTY_THRESHOLDS.medium) return 'medium';
  return 'easy';
}
