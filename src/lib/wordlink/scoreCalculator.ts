import { FoundWord, Letter, WordBonuses } from './types';
import { POINTS, RARE_LETTERS, SPEED_THRESHOLD } from './constants';

/**
 * Calculate points for a word with bonuses
 */
export function calculateWordScore(
  word: string,
  letters: Letter[],
  path: number[],
  multiplier: number,
  lastWordTime: number
): { points: number; bonuses: WordBonuses } {
  // Base points
  let basePoints = word.length === 3 ? POINTS.THREE_LETTER : POINTS.FOUR_LETTER;
  
  // Check for rare letters
  const rareLetterCount = word.split('').filter(char => 
    RARE_LETTERS.includes(char.toUpperCase())
  ).length;
  
  // Check for speed bonus
  const currentTime = Date.now();
  const timeSinceLastWord = currentTime - lastWordTime;
  const hasSpeedBonus = lastWordTime > 0 && timeSinceLastWord < SPEED_THRESHOLD;
  
  // Calculate bonuses
  const bonuses: WordBonuses = {
    speed: hasSpeedBonus,
    rareLetters: rareLetterCount,
    combo: multiplier,
  };
  
  // Calculate total points
  let totalPoints = basePoints;
  
  // Add combo bonus
  if (multiplier > 0) {
    totalPoints += POINTS.COMBO_BONUS * multiplier;
  }
  
  // Add speed bonus
  if (hasSpeedBonus) {
    totalPoints += POINTS.SPEED_BONUS;
  }
  
  // Add rare letter bonus
  if (rareLetterCount > 0) {
    totalPoints += POINTS.RARE_LETTER_BONUS * rareLetterCount;
  }
  
  return { points: totalPoints, bonuses };
}

/**
 * Update session statistics with a new word
 */
export function updateSessionStats(
  currentStats: {
    totalWords: number;
    bestWord: FoundWord | null;
    longestStreak: number;
    highScore: number;
  },
  newWord: FoundWord,
  currentMultiplier: number,
  currentScore: number
): {
  totalWords: number;
  bestWord: FoundWord | null;
  longestStreak: number;
  highScore: number;
} {
  return {
    totalWords: currentStats.totalWords + 1,
    bestWord: !currentStats.bestWord || newWord.points > currentStats.bestWord.points
      ? newWord
      : currentStats.bestWord,
    longestStreak: Math.max(currentStats.longestStreak, currentMultiplier),
    highScore: Math.max(currentStats.highScore, currentScore),
  };
}

/**
 * Check if a letter is rare
 */
export function isRareLetter(char: string): boolean {
  return RARE_LETTERS.includes(char.toUpperCase());
}
