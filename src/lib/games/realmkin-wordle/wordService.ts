import simpleWords from "./data/words-simple.json" assert { type: "json" };
import intermediateWords from "./data/words-intermediate.json" assert { type: "json" };
import advancedWords from "./data/words-advanced.json" assert { type: "json" };
import validGuesses from "./data/words-valid.json" assert { type: "json" };
import { DIFFICULTIES, WORDLE_EPOCH, WORD_LENGTH } from "./constants";
import type { Difficulty, EvaluatedLetter, LetterStatus, WordleEvaluation } from "./types";

const DIFFICULTY_WORDS: Record<Difficulty, readonly string[]> = {
  simple: simpleWords,
  intermediate: intermediateWords,
  advanced: advancedWords,
};

const DIFFICULTY_OFFSETS: Record<Difficulty, number> = {
  simple: 0,
  intermediate: 10_000,
  advanced: 20_000,
};

const VALID_GUESS_SET = new Set(validGuesses);

export function getWordList(difficulty: Difficulty): readonly string[] {
  return DIFFICULTY_WORDS[difficulty];
}

export function getValidGuessSet(): ReadonlySet<string> {
  return VALID_GUESS_SET;
}

export function daysSinceEpoch(date: Date): number {
  const diff = date.getTime() - WORDLE_EPOCH.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function getDailySolution(difficulty: Difficulty, date: Date = new Date()) {
  const wordList = getWordList(difficulty);
  const days = daysSinceEpoch(date);
  const offset = DIFFICULTY_OFFSETS[difficulty];
  const index = ((days + offset) % wordList.length + wordList.length) % wordList.length;
  const solution = wordList[index];

  return {
    solution,
    index,
    dateKey: formatDateKey(date),
  };
}

export function isValidGuess(guess: string): boolean {
  const normalized = guess.toLowerCase();
  return normalized.length === WORD_LENGTH && VALID_GUESS_SET.has(normalized);
}

export function evaluateGuess(solution: string, guess: string): WordleEvaluation {
  const evaluation: EvaluatedLetter[] = [];
  const solutionLetters = solution.split("");
  const guessLetters = guess.toLowerCase().split("");

  const letterCounts = new Map<string, number>();
  for (const letter of solutionLetters) {
    letterCounts.set(letter, (letterCounts.get(letter) ?? 0) + 1);
  }

  const statuses: LetterStatus[] = new Array(WORD_LENGTH).fill("absent");

  // First pass for correct letters
  for (let i = 0; i < WORD_LENGTH; i += 1) {
    if (guessLetters[i] === solutionLetters[i]) {
      statuses[i] = "correct";
      letterCounts.set(guessLetters[i], (letterCounts.get(guessLetters[i]) ?? 0) - 1);
    }
  }

  // Second pass for present letters
  for (let i = 0; i < WORD_LENGTH; i += 1) {
    if (statuses[i] === "correct") continue;
    const currentLetter = guessLetters[i];
    const remaining = letterCounts.get(currentLetter) ?? 0;
    if (remaining > 0 && solutionLetters.includes(currentLetter)) {
      statuses[i] = "present";
      letterCounts.set(currentLetter, remaining - 1);
    }
  }

  for (let i = 0; i < WORD_LENGTH; i += 1) {
    evaluation.push({
      letter: guessLetters[i],
      status: statuses[i],
    });
  }

  return { letters: evaluation };
}

export function buildKeyboardStatuses(evaluations: WordleEvaluation[]): Map<string, LetterStatus> {
  const keyboard = new Map<string, LetterStatus>();
  for (const evaluation of evaluations) {
    for (const { letter, status } of evaluation.letters) {
      const upper = letter.toUpperCase();
      const previousStatus = keyboard.get(upper);

      if (!previousStatus) {
        keyboard.set(upper, status);
        continue;
      }

      if (previousStatus === "correct") {
        continue;
      }

      if (previousStatus === "present" && status === "correct") {
        keyboard.set(upper, status);
        continue;
      }

      if (previousStatus === "absent" && status !== "absent") {
        keyboard.set(upper, status);
        continue;
      }
    }
  }
  return keyboard;
}

export function normalizeGuess(guess: string): string {
  return guess.trim().toLowerCase().slice(0, WORD_LENGTH);
}

export function getAllWordCounts() {
  return {
    simple: DIFFICULTY_WORDS.simple.length,
    intermediate: DIFFICULTY_WORDS.intermediate.length,
    advanced: DIFFICULTY_WORDS.advanced.length,
    validGuesses: VALID_GUESS_SET.size,
  };
}

export function isSupportedDifficulty(value: string): value is Difficulty {
  return (DIFFICULTIES as readonly string[]).includes(value);
}
