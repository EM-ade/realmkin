import { Difficulty } from "@/types/leaderboard";

// Difficulty multipliers for 2048
const DIFFICULTY_2048_MULTIPLIERS: Record<Difficulty, number> = {
  simple: 1.0,
  intermediate: 1.3,
  hard: 1.6,
  advanced: 1.6, // Same as hard for 2048
};

// Difficulty multipliers for Wordle
const DIFFICULTY_WORDLE_MULTIPLIERS: Record<Difficulty, number> = {
  simple: 1.0,
  intermediate: 1.5,
  advanced: 2.0,
  hard: 2.0, // Same as advanced for Wordle
};

// Base points for Wordle by number of attempts
const WORDLE_BASE_POINTS: Record<number, number> = {
  1: 300, // Perfect
  2: 250, // Excellent
  3: 200, // Very Good
  4: 150, // Good
  5: 100, // Decent
  6: 50,  // Just Made It
};

// Wordle bonuses
const WORDLE_DAILY_BONUS = 20;
const WORDLE_STREAK_BONUS = 50;
const WORDLE_STREAK_THRESHOLD = 3;

/**
 * Calculate points for a 2048 game
 * Formula: (Game Score ÷ 10) × Difficulty Multiplier
 */
export function calculate2048Points(gameScore: number, difficulty: Difficulty): number {
  if (gameScore <= 0) return 0;
  
  const multiplier = DIFFICULTY_2048_MULTIPLIERS[difficulty] || 1.0;
  const points = (gameScore / 10) * multiplier;
  
  return Math.round(points);
}

/**
 * Calculate points for a Wordle game
 * Formula: (Base Points × Difficulty Multiplier) + Daily Bonus + Streak Bonus
 */
export function calculateWordlePoints(
  attempts: number,
  difficulty: Difficulty,
  currentStreak: number = 0,
  won: boolean = true
): number {
  if (!won || attempts < 1 || attempts > 6) return 0;
  
  const basePoints = WORDLE_BASE_POINTS[attempts] || 0;
  const multiplier = DIFFICULTY_WORDLE_MULTIPLIERS[difficulty] || 1.0;
  
  let points = basePoints * multiplier;
  
  // Add daily completion bonus
  points += WORDLE_DAILY_BONUS;
  
  // Add streak bonus if applicable
  if (currentStreak >= WORDLE_STREAK_THRESHOLD) {
    points += WORDLE_STREAK_BONUS;
  }
  
  return Math.round(points);
}

/**
 * Calculate points for future games (placeholder implementations)
 */

export function calculateTraitCrushPoints(
  score: number,
  difficulty: Difficulty,
  combos: number = 0
): number {
  // Placeholder implementation
  const basePoints = Math.floor(score / 100);
  const multiplier = DIFFICULTY_2048_MULTIPLIERS[difficulty]; // Reuse 2048 multipliers
  const comboBonus = combos * 10;
  
  return Math.round((basePoints * multiplier) + comboBonus);
}

export function calculateWordBlastPoints(
  wordsFound: number,
  difficulty: Difficulty,
  timeBonus: number = 0
): number {
  // Placeholder implementation
  const basePoints = wordsFound * 15;
  const multiplier = DIFFICULTY_WORDLE_MULTIPLIERS[difficulty]; // Reuse Wordle multipliers
  
  return Math.round((basePoints * multiplier) + timeBonus);
}

export function calculateCheckersPoints(
  won: boolean,
  difficulty: Difficulty,
  movesCount: number = 0
): number {
  // Placeholder implementation
  if (!won) return 50; // Participation points
  
  const basePoints = 300;
  const multiplier = DIFFICULTY_2048_MULTIPLIERS[difficulty];
  const efficiencyBonus = Math.max(0, 100 - movesCount); // Fewer moves = more points
  
  return Math.round((basePoints * multiplier) + efficiencyBonus);
}

export function calculatePokerPoints(
  placement: number,
  totalPlayers: number,
  buyInTier: "low" | "medium" | "high" = "low"
): number {
  // Placeholder implementation
  const tierMultipliers = { low: 1.0, medium: 1.5, high: 2.0 };
  const multiplier = tierMultipliers[buyInTier];
  
  // Points based on placement (higher is better)
  const placementPoints = Math.max(0, totalPlayers - placement + 1) * 10;
  
  return Math.round(placementPoints * multiplier);
}

/**
 * Utility functions for score validation and formatting
 */

export function validateScore(points: number): boolean {
  return Number.isFinite(points) && points >= 0 && points <= 100000; // Max 100k points per game
}

export function formatScore(points: number): string {
  if (points >= 1000000) {
    return `${(points / 1000000).toFixed(1)}M`;
  } else if (points >= 1000) {
    return `${(points / 1000).toFixed(1)}k`;
  }
  return points.toString();
}

export function formatScoreWithCommas(points: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(points));
}

/**
 * Get expected score ranges for balancing
 */
export function getExpectedScoreRange(gameType: string, difficulty: Difficulty): { min: number; max: number } {
  switch (gameType) {
    case "2048":
      const multiplier2048 = DIFFICULTY_2048_MULTIPLIERS[difficulty];
      return {
        min: Math.round(100 * multiplier2048),   // Score of 1000
        max: Math.round(1500 * multiplier2048), // Score of 15000
      };
      
    case "wordle":
      const multiplierWordle = DIFFICULTY_WORDLE_MULTIPLIERS[difficulty];
      return {
        min: Math.round((50 + WORDLE_DAILY_BONUS) * multiplierWordle),  // 6 attempts
        max: Math.round((300 + WORDLE_DAILY_BONUS + WORDLE_STREAK_BONUS) * multiplierWordle), // 1 attempt with streak
      };
      
    default:
      return { min: 100, max: 500 }; // Default range
  }
}

/**
 * Test functions for scoring system validation
 */
export function runScoringTests(): void {
  if (process.env.NODE_ENV !== "development") return;
  
  console.group("🎯 Scoring System Tests");
  
  // Test 2048 scoring
  console.log("2048 Tests:");
  console.log("Simple 2048:", calculate2048Points(2048, "simple")); // Expected: 205
  console.log("Intermediate 4096:", calculate2048Points(4096, "intermediate")); // Expected: 533
  console.log("Hard 8192:", calculate2048Points(8192, "hard")); // Expected: 1311
  
  // Test Wordle scoring
  console.log("\nWordle Tests:");
  console.log("Simple 3 attempts:", calculateWordlePoints(3, "simple", 0)); // Expected: 220
  console.log("Advanced 2 attempts:", calculateWordlePoints(2, "advanced", 0)); // Expected: 520
  console.log("Advanced 1 attempt + streak:", calculateWordlePoints(1, "advanced", 5)); // Expected: 670
  
  // Test score formatting
  console.log("\nFormatting Tests:");
  console.log("1234 →", formatScore(1234)); // Expected: 1.2k
  console.log("1234567 →", formatScore(1234567)); // Expected: 1.2M
  console.log("1234 with commas →", formatScoreWithCommas(1234)); // Expected: 1,234
  
  console.groupEnd();
}

// Auto-run tests in development
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  // Delay to avoid blocking initial render
  setTimeout(runScoringTests, 1000);
}
