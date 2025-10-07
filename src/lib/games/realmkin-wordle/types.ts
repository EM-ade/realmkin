export type Difficulty = "simple" | "intermediate" | "advanced";

export type LetterStatus = "correct" | "present" | "absent";

export interface EvaluatedLetter {
  letter: string;
  status: LetterStatus;
}

export interface WordleBoardState {
  dateKey: string;
  solution: string;
  guesses: string[];
  currentGuess: string;
  difficulty: Difficulty;
  gameState: "playing" | "won" | "lost";
  locked?: boolean;
}

export interface WordleStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  lastPlayed: string | null;
}

export interface WordleEvaluation {
  letters: EvaluatedLetter[];
}

export type KeyboardStatusMap = Record<string, LetterStatus>;

export interface WordleCompletion {
  dateKey: string;
  outcome: "won" | "lost";
  timestamp: number;
}
