"use client";

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  createContext,
  useContext,
  type ReactNode,
} from "react";
import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import {
  buildKeyboardStatuses,
  evaluateGuess,
  getAllWordCounts,
  getDailySolution,
  getValidGuessSet,
  isValidGuess,
  normalizeGuess,
} from "@/lib/games/realmkin-wordle/wordService";
import {
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  MAX_ATTEMPTS,
  WORD_LENGTH,
} from "@/lib/games/realmkin-wordle/constants";
import type {
  Difficulty,
  KeyboardStatusMap,
  LetterStatus,
  WordleBoardState,
  WordleCompletion,
  WordleStats,
} from "@/lib/games/realmkin-wordle/types";
import {
  clearBoardState,
  clearCompletion,
  loadBoardState,
  loadCompletion,
  loadStats,
  saveBoardState,
  saveCompletion,
  saveStats,
} from "@/lib/games/realmkin-wordle/storage";
import { useAuth } from "@/contexts/AuthContext";
import { calculateWordlePoints } from "@/lib/scoring";
import { leaderboardService } from "@/services/leaderboardService";
import "./wordle-animations.css";

const ALERT_TIMEOUT_MS = 2400;

const KEYBOARD_LAYOUT = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "DELETE"],
];

const TILE_STATUS_CLASSES: Record<LetterStatus, string> = {
  correct: "bg-[#538d4e] border-[#538d4e] text-white",
  present: "bg-[#b59f3b] border-[#b59f3b] text-white",
  absent: "bg-[#3a3a3c] border-[#3a3a3c] text-white",
};

const KEY_STATUS_CLASSES: Record<LetterStatus, string> = {
  correct: "bg-[#538d4e] text-white border border-[#538d4e]",
  present: "bg-[#b59f3b] text-white border border-[#b59f3b]",
  absent: "bg-[#3a3a3c] text-white border border-[#3a3a3c]",
};

const KEY_DEFAULT_CLASS = "border border-[#565758] bg-[#818384] text-white";
const TILE_BASE_CLASS = "cell flex items-center justify-center rounded-xl border-2 font-bold uppercase text-white";

type AlertTone = "info" | "success" | "error";

interface AlertMessage {
  tone: AlertTone;
  message: string;
}

interface CompletionBannerContextValue {
  showBanner: (content: ReactNode) => void;
  clearBanner: () => void;
}

const CompletionBannerContext = createContext<CompletionBannerContextValue | null>(null);

function CompletionBanner({
  content,
  onDismiss,
}: {
  content: ReactNode | null;
  onDismiss: () => void;
}) {
  return (
    <AnimatePresence>
      {content ? (
        <motion.div
          className="pointer-events-auto fixed bottom-6 left-1/2 z-40 w-[min(90vw,400px)] -translate-x-1/2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
        >
          <div className="rounded-3xl border border-[#DA9C2F]/40 bg-[#0E0905]/95 p-4 text-sm text-white shadow-[0_30px_80px_rgba(0,0,0,0.55)]">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">{content}</div>
              <button
                type="button"
                className="text-white/60 transition hover:text-white"
                aria-label="Dismiss success banner"
                onClick={onDismiss}
              >
                ✕
              </button>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function SuccessBanner({ difficulty, nextReset }: { difficulty: Difficulty; nextReset: string }) {
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-[0.32em] text-[#75d4cc]">Cipher Cleared</p>
      <p className="text-sm leading-relaxed text-white/80">
        You mastered the {DIFFICULTY_LABELS[difficulty]} realm. A fresh sigil descends at <span className="text-[#F4C752]">{nextReset}</span>.
      </p>
    </div>
  );
}

function getNextResetTime(): string {
  const now = new Date();
  const utcMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  return utcMidnight.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function useCompletionBanner() {
  const context = useContext(CompletionBannerContext);
  if (!context) throw new Error("useCompletionBanner must be used within GameContent context");
  return context;
}

interface AlertContextValue {
  showAlert: (message: string, tone?: AlertTone, persist?: boolean) => void;
}

const AlertContext = createContext<AlertContextValue | null>(null);

const AlertProvider = ({ children }: { children: React.ReactNode }) => {
  const [alert, setAlert] = useState<AlertMessage | null>(null);
  const [banner, setBanner] = useState<ReactNode | null>(null);

  const showAlert = useCallback((message: string, tone: AlertTone = "info", persist = false) => {
    setAlert({ message, tone });
    if (!persist) {
      window.setTimeout(() => setAlert(null), ALERT_TIMEOUT_MS);
    }
  }, []);

  const showBanner = useCallback((content: ReactNode) => {
    setBanner(content);
  }, []);

  const clearBanner = useCallback(() => setBanner(null), []);

  return (
    <AlertContext.Provider value={{ showAlert }}>
      <CompletionBannerContext.Provider value={{ showBanner, clearBanner }}>
        {children}
        <AlertBanner alert={alert} />
        <CompletionBanner content={banner} onDismiss={clearBanner} />
      </CompletionBannerContext.Provider>
    </AlertContext.Provider>
  );
};

const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) throw new Error("useAlert must be used within AlertProvider");
  return context.showAlert;
};

const AlertBanner = ({ alert }: { alert: AlertMessage | null }) => {
  return (
    <div className="pointer-events-none fixed top-20 left-1/2 z-50 -translate-x-1/2">
      <AnimatePresence>
        {alert ? (
          <motion.div
            key={alert.message}
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
            className={clsx(
              "rounded-2xl px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] shadow-[0_18px_45px_rgba(0,0,0,0.45)]",
              alert.tone === "success" && "bg-[#538d4e] text-white",
              alert.tone === "error" && "bg-[#3a3a3c] text-white",
              alert.tone === "info" && "bg-[#DA9C2F] text-[#050302]"
            )}
          >
            {alert.message}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

const wordCounts = getAllWordCounts();
const validGuessCount = getValidGuessSet().size;

function initializeBoard(difficulty: Difficulty): WordleBoardState {
  const persisted = loadBoardState(difficulty);
  const { solution, dateKey } = getDailySolution(difficulty);
  const completion = loadCompletion(difficulty);
  const locked = completion?.dateKey === dateKey;

  if (
    persisted &&
    persisted.dateKey === dateKey &&
    persisted.solution === solution &&
    persisted.difficulty === difficulty
  ) {
    return {
      ...persisted,
      locked,
    };
  }

  const fresh: WordleBoardState = {
    dateKey,
    solution,
    guesses: [],
    currentGuess: "",
    difficulty,
    gameState: "playing",
    locked,
  };

  saveBoardState(fresh);
  return fresh;
}

function updateStatsAfterGame(
  stats: WordleStats,
  difficulty: Difficulty,
  outcome: "won" | "lost",
  dateKey: string
): WordleStats {
  const next: WordleStats = {
    gamesPlayed: stats.gamesPlayed + 1,
    gamesWon: outcome === "won" ? stats.gamesWon + 1 : stats.gamesWon,
    currentStreak: outcome === "won" ? stats.currentStreak + 1 : 0,
    maxStreak:
      outcome === "won"
        ? Math.max(stats.maxStreak, stats.currentStreak + 1)
        : stats.maxStreak,
    lastPlayed: dateKey,
  };

  saveStats(difficulty, next);
  return next;
}

function formatWinRate(stats: WordleStats): string {
  if (stats.gamesPlayed === 0) return "0%";
  return `${Math.round((stats.gamesWon / stats.gamesPlayed) * 100)}%`;
}

function getKeyboardStatuses(evaluations: ReturnType<typeof evaluateGuess>[]): KeyboardStatusMap {
  const map = buildKeyboardStatuses(evaluations);
  const keyboard: KeyboardStatusMap = {};
  map.forEach((value, key) => {
    keyboard[key] = value;
  });
  return keyboard;
}

const TILE_SIZE_CLASSES = "h-14 w-14 sm:h-16 sm:w-16 xl:h-[70px] xl:w-[70px]";

const KEY_CLASSES = {
  base: "rounded-lg px-[6px] py-2.5 sm:px-3 sm:py-4 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.18em] transition-colors duration-150",
  action: "px-3 sm:px-5",
};

export default function GameWordleClient() {
  return (
    <AlertProvider>
      <GameContent />
    </AlertProvider>
  );
}

function GameContent() {
  const { user, userData } = useAuth();
  const showAlert = useAlert();
  const { showBanner, clearBanner } = useCompletionBanner();
  const [difficulty, setDifficulty] = useState<Difficulty>("simple");
  const [board, setBoard] = useState<WordleBoardState>(() => initializeBoard("simple"));
  const [stats, setStats] = useState<WordleStats>(() => loadStats("simple"));
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [shakeRowIndex, setShakeRowIndex] = useState<number | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);
  const [completions, setCompletions] = useState<Record<Difficulty, WordleCompletion | null>>(() => {
    // Return empty state during SSR to avoid hydration mismatch
    if (typeof window === "undefined") {
      return { simple: null, intermediate: null, advanced: null };
    }
    const entries = DIFFICULTIES.map((diff) => [diff, loadCompletion(diff)]) as Array<[
      Difficulty,
      WordleCompletion | null
    ]>;
    return Object.fromEntries(entries) as Record<Difficulty, WordleCompletion | null>;
  });

  const currentGuessRef = useRef(board.currentGuess);
  const difficultyRef = useRef(difficulty);

  // Hydration effect
  useEffect(() => {
    setIsHydrated(true);
    // Load completions after hydration
    const entries = DIFFICULTIES.map((diff) => [diff, loadCompletion(diff)]) as Array<[
      Difficulty,
      WordleCompletion | null
    ]>;
    setCompletions(Object.fromEntries(entries) as Record<Difficulty, WordleCompletion | null>);
  }, []);

  useEffect(() => {
    currentGuessRef.current = board.currentGuess;
  }, [board.currentGuess]);

  useEffect(() => {
    difficultyRef.current = difficulty;
  }, [difficulty]);

  useEffect(() => {
    if (board.locked) return;
    const completion = loadCompletion(board.difficulty);
    if (completion?.dateKey === board.dateKey) {
      setBoard((prev) => ({ ...prev, locked: true }));
    }
  }, [board.dateKey, board.difficulty, board.locked]);

  // Removed auto-opening info modal - users can manually open it via the info button

  useEffect(() => {
    if (shakeRowIndex === null) return;
    const timer = window.setTimeout(() => setShakeRowIndex(null), 600);
    return () => window.clearTimeout(timer);
  }, [shakeRowIndex]);

  const evaluations = useMemo(() => {
    return board.guesses.map((guess) => evaluateGuess(board.solution, guess));
  }, [board.guesses, board.solution]);

  const keyboardStatuses = useMemo(() => getKeyboardStatuses(evaluations), [evaluations]);

  const resetForDifficulty = useCallback((nextDifficulty: Difficulty) => {
    const nextBoard = initializeBoard(nextDifficulty);
    const nextStats = loadStats(nextDifficulty);
    setBoard(nextBoard);
    setStats(nextStats);
    setShakeRowIndex(null);
    currentGuessRef.current = nextBoard.currentGuess;
    clearBanner();
  }, [clearBanner]);

  const handleDifficultyChange = useCallback(
    (next: Difficulty) => {
      const completion = completions[next];
      const todayKey = getDailySolution(next).dateKey;

      setDifficulty(next);
      resetForDifficulty(next);

      if (completion?.dateKey === todayKey) {
        setBoard(initializeBoard(next));
      }
    },
    [completions, resetForDifficulty]
  );

  const updateBoard = useCallback((updater: (prev: WordleBoardState) => WordleBoardState) => {
    setBoard((prev) => {
      const next = updater(prev);
      saveBoardState(next);
      currentGuessRef.current = next.currentGuess;
      return next;
    });
  }, []);

  const handleSubmitGuess = useCallback(() => {
    if (board.gameState !== "playing" || board.locked) return;
    const normalizedGuess = normalizeGuess(currentGuessRef.current);

    if (normalizedGuess.length < WORD_LENGTH) {
      setShakeRowIndex(board.guesses.length);
      showAlert("Not enough glyphs", "error");
      return;
    }

    if (!isValidGuess(normalizedGuess)) {
      setShakeRowIndex(board.guesses.length);
      showAlert("Not in lexicon", "error");
      return;
    }

    const nextGuess = normalizedGuess.toUpperCase();
    const isWin = nextGuess === board.solution.toUpperCase();
    const isLastAttempt = board.guesses.length + 1 === MAX_ATTEMPTS;

    updateBoard((prev) => ({
      ...prev,
      guesses: [...prev.guesses, nextGuess],
      currentGuess: "",
    }));

    const complete = async (outcome: "won" | "lost") => {
      const completion: WordleCompletion = {
        dateKey: board.dateKey,
        outcome,
        timestamp: Date.now(),
      };
      saveCompletion(board.difficulty, completion);
      setCompletions((prev) => ({ ...prev, [board.difficulty]: completion }));
      updateBoard((prev) => ({ ...prev, locked: true, gameState: outcome === "won" ? "won" : "lost" }));
      setStats((prev) => updateStatsAfterGame(prev, board.difficulty, outcome, board.dateKey));
      
      // Submit score to leaderboard if user won
      if (outcome === "won" && user && userData?.username && !isSubmittingScore) {
        setIsSubmittingScore(true);
        try {
          const attempts = board.guesses.length + 1; // +1 for the current winning guess
          
          // Get current streak for bonus calculation
          const currentStreak = stats.currentStreak;
          
          const points = calculateWordlePoints(
            attempts,
            board.difficulty,
            currentStreak,
            true
          );
          
          await leaderboardService.submitScore(
            user.uid,
            userData.username,
            points,
            "wordle"
          );

          // Update streak (user played today)
          await leaderboardService.updateStreak(user.uid, userData.username);

          console.log(`Wordle score submitted: ${attempts} attempts → ${points} points`);
        } catch (error) {
          console.error("Failed to submit Wordle score:", error);
        } finally {
          setIsSubmittingScore(false);
        }
      }
      
      window.setTimeout(() => setIsStatsOpen(true), 900);
    };

    if (isWin) {
      showAlert("Cipher cracked!", "success");
      showBanner(
        <SuccessBanner
          difficulty={board.difficulty}
          nextReset={getNextResetTime()}
        />
      );
      complete("won");
      return;
    }

    if (isLastAttempt) {
      showAlert(`The sigil was ${board.solution.toUpperCase()}`, "error");
      complete("lost");
      return;
    }

    setShakeRowIndex(null);
  }, [board, showAlert, updateBoard]);

  const handleKeyInput = useCallback(
    (key: string) => {
      if (board.gameState !== "playing" || board.locked) return;

      if (key === "ENTER") {
        handleSubmitGuess();
        return;
      }

      if (key === "DELETE") {
        updateBoard((prev) => {
          if (prev.currentGuess.length === 0) return prev;
          return {
            ...prev,
            currentGuess: prev.currentGuess.slice(0, -1),
          };
        });
        return;
      }

      if (/^[A-Z]$/.test(key) && currentGuessRef.current.length < WORD_LENGTH) {
        updateBoard((prev) => ({
          ...prev,
          currentGuess: prev.currentGuess + key.toLowerCase(),
        }));
      }
    },
    [board.gameState, board.locked, handleSubmitGuess, updateBoard]
  );

  const handlePhysicalKeyboard = useCallback(
    (event: KeyboardEvent) => {
      if (isInfoOpen || isStatsOpen) return;
      if (event.key === "Backspace") {
        event.preventDefault();
        handleKeyInput("DELETE");
        return;
      }

      if (event.key === "Enter") {
        handleKeyInput("ENTER");
        return;
      }

      const key = event.key.toUpperCase();
      handleKeyInput(key);
    },
    [handleKeyInput, isInfoOpen, isStatsOpen]
  );

  useEffect(() => {
    window.addEventListener("keydown", handlePhysicalKeyboard);
    return () => window.removeEventListener("keydown", handlePhysicalKeyboard);
  }, [handlePhysicalKeyboard]);

  const handleResetPuzzle = useCallback(() => {
    const diff = difficultyRef.current;
    clearBoardState(diff);
    clearCompletion(diff);
    setCompletions((prev) => ({ ...prev, [diff]: null }));
    resetForDifficulty(diff);
    clearBanner();
  }, [resetForDifficulty]);

  const winRate = useMemo(() => formatWinRate(stats), [stats]);

  const lockedCompletion = completions[board.difficulty];
  const isRealmLocked = useMemo(
    () => board.locked && lockedCompletion?.dateKey === board.dateKey,
    [board.locked, lockedCompletion, board.dateKey]
  );

  const lockedOverlayReset = useMemo(() => getNextResetTime(), [board.dateKey]);

  const renderTile = useCallback(
    (rowIndex: number, columnIndex: number) => {
      const guess = board.guesses[rowIndex];
      const evaluation = evaluations[rowIndex];
      const letter = guess ? guess[columnIndex] ?? "" : "";
      const isEvaluated = Boolean(guess);
      const status = evaluation?.letters[columnIndex]?.status;
      const isActiveRow = rowIndex === board.guesses.length;
      const currentLetter = board.currentGuess[columnIndex] ?? "";
      const displayLetter = isEvaluated ? letter : isActiveRow ? currentLetter : "";
      const renderedLetter = displayLetter ? displayLetter.toUpperCase() : "";

      return (
        <div
          key={`tile-${rowIndex}-${columnIndex}`}
          className={clsx(
            TILE_BASE_CLASS,
            TILE_SIZE_CLASSES,
            "bg-[#121213] border-[#3a3a3c] text-2xl sm:text-[2rem]",
            displayLetter && !isEvaluated && "animate-type-in border-[#565758]",
            isEvaluated && status && [
              "animate-flip",
              status,
              TILE_STATUS_CLASSES[status],
            ],
            shakeRowIndex === rowIndex && "animate-shake"
          )}
          style={{ animationDelay: isEvaluated ? `${columnIndex * 0.32}s` : undefined }}
        >
          <span
            className={clsx(
              "tracking-[0.18em]",
              isEvaluated && "animate-flip-letter"
            )}
            style={{ animationDelay: isEvaluated ? `${columnIndex * 0.32}s` : undefined }}
          >
            {renderedLetter}
          </span>
        </div>
      );
    },
    [board.currentGuess, board.guesses, evaluations, shakeRowIndex]
  );

  return (
    <div className="min-h-screen bg-[#050302] text-white rounded-xl">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 pb-10 pt-6 sm:gap-8">
        <HeaderBar
          difficulty={difficulty}
          completions={isHydrated ? completions : { simple: null, intermediate: null, advanced: null }}
          onDifficultyChange={handleDifficultyChange}
          onOpenInfo={() => setIsInfoOpen(true)}
          onOpenStats={() => setIsStatsOpen(true)}
        />

        <main className="relative flex flex-1 flex-col items-center gap-6">
          {isRealmLocked && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center px-4">
              <div className="absolute inset-0 rounded-[36px] bg-black/75 backdrop-blur-sm" />
              <div className="relative max-w-md space-y-4 rounded-3xl border border-[#DA9C2F]/35 bg-[#050302]/95 px-6 py-6 text-center text-white shadow-[0_30px_90px_rgba(0,0,0,0.6)]">
                <h3 className="text-sm font-semibold uppercase tracking-[0.28em] text-[#F4C752]">Realm Sealed</h3>
                <p className="text-sm leading-relaxed text-white/80">
                  You have already deciphered the {DIFFICULTY_LABELS[board.difficulty]} realm today. A fresh sigil awakens at <span className="text-[#F4C752]">{lockedOverlayReset}</span>.
                </p>
                <p className="text-[11px] uppercase tracking-[0.32em] text-[#DA9C2F]/80">Try another realm in the meantime.</p>
              </div>
            </div>
          )}
          <div className={clsx(
            "w-full max-w-xl rounded-[36px] border border-[#DA9C2F]/20 bg-[#0B0B09]/80 px-4 py-5 sm:px-7 sm:py-8 shadow-[0_30px_60px_rgba(0,0,0,0.45)] backdrop-blur",
            isRealmLocked && "pointer-events-none opacity-60"
          )}>
            <div className="grid gap-2 sm:gap-3">
              {Array.from({ length: MAX_ATTEMPTS }).map((_, rowIndex) => (
                <div
                  key={`row-${rowIndex}`}
                  className="grid grid-cols-5 gap-2 sm:gap-3"
                >
                  {Array.from({ length: WORD_LENGTH }).map((__, columnIndex) =>
                    renderTile(rowIndex, columnIndex)
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className={clsx(isRealmLocked && "pointer-events-none opacity-60")}
          >
            <KeyboardPanel
              keyboardStatuses={keyboardStatuses}
              onKeyInput={handleKeyInput}
              locked={board.locked}
            />
          </div>

          <footer className="flex flex-col items-center gap-1 text-center text-[10px] uppercase tracking-[0.32em] text-white/55">
            <span>
              Word pools: {wordCounts.simple} simple • {wordCounts.intermediate} intermediate • {wordCounts.advanced} advanced
            </span>
            <span>{validGuessCount} total valid guesses</span>
          </footer>
        </main>
      </div>

      <StatsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        stats={stats}
        difficulty={difficulty}
        board={board}
        onReset={handleResetPuzzle}
        winRate={winRate}
      />

      <InfoModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        completions={completions}
        currentDifficulty={difficulty}
        dateKey={board.dateKey}
      />
    </div>
  );
}

function HeaderBar({
  difficulty,
  completions,
  onDifficultyChange,
  onOpenInfo,
  onOpenStats,
}: {
  difficulty: Difficulty;
  completions: Record<Difficulty, WordleCompletion | null>;
  onDifficultyChange: (difficulty: Difficulty) => void;
  onOpenInfo: () => void;
  onOpenStats: () => void;
}) {
  const todayKeys = useMemo(() => {
    const entries = DIFFICULTIES.map((diff) => [diff, getDailySolution(diff).dateKey]) as Array<[
      Difficulty,
      string
    ]>;
    return Object.fromEntries(entries) as Record<Difficulty, string>;
  }, []);

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 rounded-[36px] border border-[#DA9C2F]/20 bg-[#0B0B09]/80 px-4 py-3 shadow-[0_20px_40px_rgba(0,0,0,0.4)] backdrop-blur">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenInfo}
          className="h-9 w-9 rounded-full border border-[#DA9C2F]/40 text-[#DA9C2F] transition hover:bg-[#DA9C2F]/10 hover:text-[#F4C752]"
          aria-label="How to play"
        >
          ℹ️
        </button>
        <h1 className="text-lg font-semibold uppercase tracking-[0.28em] text-[#F4C752] sm:text-xl">
          Realmkin Wordle
        </h1>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {DIFFICULTIES.map((diff) => {
          const completion = completions[diff];
          const locked = completion?.dateKey === todayKeys[diff];
          return (
            <button
              key={diff}
              type="button"
              onClick={() => onDifficultyChange(diff)}
              className={clsx(
                "rounded-full px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.28em] transition",
                difficulty === diff
                  ? "bg-[#DA9C2F] text-black"
                  : "border border-[#DA9C2F]/40 text-[#DA9C2F] hover:bg-[#DA9C2F]/12",
                locked && "border-dashed border-[#DA9C2F]/50 text-[#DA9C2F]/70"
              )}
            >
              {DIFFICULTY_LABELS[diff]}
              {locked ? " • Complete" : ""}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onOpenStats}
        className="h-9 w-9 rounded-full border border-[#DA9C2F]/40 text-[#DA9C2F] transition hover:bg-[#DA9C2F]/10 hover:text-[#F4C752]"
        aria-label="View statistics"
      >
        📊
      </button>
    </header>
  );
}

function KeyboardPanel({
  keyboardStatuses,
  onKeyInput,
  locked,
}: {
  keyboardStatuses: KeyboardStatusMap;
  onKeyInput: (key: string) => void;
  locked: boolean | undefined;
}) {
  return (
    <section className="w-full max-w-xl rounded-[36px] border border-[#DA9C2F]/20 bg-[#090705]/85 px-3 py-4 shadow-[0_20px_50px_rgba(0,0,0,0.45)] backdrop-blur">
      <div className="flex flex-col items-center gap-2 sm:gap-3">
        {KEYBOARD_LAYOUT.map((row, rowIndex) => (
          <div key={`keyboard-row-${rowIndex}`} className="flex w-full justify-center gap-1 sm:gap-2">
            {row.map((key) => {
              const status = keyboardStatuses[key];
              const isAction = key === "ENTER" || key === "DELETE";
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onKeyInput(key)}
                  disabled={locked}
                  className={clsx(
                    KEY_CLASSES.base,
                    isAction && KEY_CLASSES.action,
                    status ? KEY_STATUS_CLASSES[status] : KEY_DEFAULT_CLASS,
                    locked && "cursor-not-allowed opacity-50"
                  )}
                >
                  {key === "DELETE" ? "⌫" : key}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}

function StatsModal({
  isOpen,
  onClose,
  stats,
  difficulty,
  board,
  onReset,
  winRate,
}: {
  isOpen: boolean;
  onClose: () => void;
  stats: WordleStats;
  difficulty: Difficulty;
  board: WordleBoardState;
  onReset: () => void;
  winRate: string;
}) {
  const hasResult = board.gameState === "won" || board.gameState === "lost";

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="relative mx-4 w-full max-w-md overflow-hidden rounded-3xl border border-[#DA9C2F]/25 bg-[#050302]/95 p-6 shadow-[0_40px_120px_rgba(0,0,0,0.65)]"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-3 text-white/60 transition hover:text-white"
              aria-label="Close stats"
            >
              ✕
            </button>
            <div className="space-y-5 text-white">
              <header className="space-y-1 text-center">
                <p className="text-xs uppercase tracking-[0.38em] text-[#DA9C2F]/70">
                  {DIFFICULTY_LABELS[difficulty]} Realm
                </p>
                <h2 className="text-xl font-bold uppercase tracking-[0.24em] text-[#F4C752]">
                  Cipher Ledger
                </h2>
              </header>

              <section className="grid grid-cols-2 gap-3">
                <StatBlock label="Games Played" value={stats.gamesPlayed} />
                <StatBlock label="Games Won" value={stats.gamesWon} />
                <StatBlock label="Win Rate" value={winRate} />
                <StatBlock label="Current Streak" value={stats.currentStreak} />
                <StatBlock label="Max Streak" value={stats.maxStreak} className="col-span-2" />
              </section>

              {hasResult && (
                <p className="rounded-2xl border border-[#DA9C2F]/25 bg-[#1E1206]/70 p-4 text-center text-xs uppercase tracking-[0.28em] text-[#F4C752]">
                  {board.gameState === "won" ? "The sigil yields to your insight." : `The sigil was ${board.solution.toUpperCase()}`}
                </p>
              )}

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    onReset();
                    onClose();
                  }}
                  className="w-full rounded-full bg-[#DA9C2F] px-5 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-[#050302] transition hover:bg-[#f4c752]"
                >
                  Reset Today’s Puzzle
                </button>
                <p className="text-[11px] text-white/55">
                  Resetting clears progress for the current day on this difficulty. A fresh sigil arrives at midnight UTC.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function StatBlock({ label, value, className }: { label: string; value: number | string; className?: string }) {
  return (
    <div
      className={clsx(
        "rounded-2xl border border-[#DA9C2F]/20 bg-[#0B0B09]/70 p-4 text-center",
        className
      )}
    >
      <p className="text-[11px] uppercase tracking-[0.28em] text-white/55">{label}</p>
      <p className="mt-2 text-xl font-semibold text-[#F4C752]">{value}</p>
    </div>
  );
}

function InfoModal({
  isOpen,
  onClose,
  completions,
  currentDifficulty,
  dateKey,
}: {
  isOpen: boolean;
  onClose: () => void;
  completions: Record<Difficulty, WordleCompletion | null>;
  currentDifficulty: Difficulty;
  dateKey: string;
}) {
  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="relative mx-4 w-full max-w-lg rounded-3xl border border-[#DA9C2F]/25 bg-[#050302]/95 shadow-[0_40px_120px_rgba(0,0,0,0.65)]"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-3 text-white/60 transition hover:text-white"
              aria-label="Close how to play"
            >
              ✕
            </button>
            <div className="max-h-[85vh] overflow-y-auto px-4 py-6 sm:px-6">
              <div className="space-y-6 text-white/80">
                <header className="space-y-2 text-center">
                  <p className="text-[11px] uppercase tracking-[0.32em] text-[#DA9C2F]/70 sm:text-xs">Codex</p>
                  <h2 className="text-lg font-bold uppercase tracking-[0.2em] text-[#F4C752] sm:text-xl">
                    How to Play
                  </h2>
                </header>

                <p className="text-sm leading-relaxed sm:text-base">
                  Decipher the five-letter sigil in six attempts. After each guess, tiles change colour to reveal proximity to the secret word. A true Cipherwright only needs a handful of tries.
                </p>

                <div className="rounded-2xl border border-[#DA9C2F]/20 bg-[#120C07]/60 p-4 sm:p-5">
                  <p className="text-center text-[11px] uppercase tracking-[0.32em] text-[#DA9C2F]/80 sm:text-xs">Tile Legend</p>
                  <ul className="mt-3 space-y-3 text-[12px] leading-relaxed uppercase tracking-[0.24em] text-white/70">
                    <li className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-[#75d4cc]">Emerald</span>
                      <span className="flex-1 text-white/70">tiles mark letters in the correct position.</span>
                    </li>
                    <li className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-[#f4c752]">Golden</span>
                      <span className="flex-1 text-white/70">tiles reveal letters present elsewhere.</span>
                    </li>
                    <li className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-white/60">Umbral</span>
                      <span className="flex-1 text-white/70">tiles signify letters absent from the sigil.</span>
                    </li>
                  </ul>
                </div>

                <p className="text-sm leading-relaxed sm:text-base">
                  Each realm difficulty expands the lexicon. Complete a realm to unlock another the next day. Sigils refresh at midnight UTC.
                </p>

                <div className="rounded-2xl border border-[#DA9C2F]/20 bg-[#0E0905]/70 p-4 sm:p-5 text-[12px] uppercase tracking-[0.24em] text-white/70">
                  <p className="text-center text-[#DA9C2F]/75">{dateKey} Status</p>
                  <div className="mt-4 space-y-3">
                    {DIFFICULTIES.map((diff) => {
                      const completion = completions[diff];
                      const label = DIFFICULTY_LABELS[diff];
                      const isCurrent = diff === currentDifficulty;

                      if (completion?.dateKey === dateKey) {
                        return (
                          <div key={diff} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#DA9C2F]/15 bg-black/20 px-3 py-2 text-[11px] sm:text-xs">
                            <span className="font-semibold text-white/85">
                              {label}
                              {isCurrent ? " • Current" : ""}
                            </span>
                            <span className={clsx(
                              "text-[11px] sm:text-xs",
                              completion.outcome === "won" ? "text-[#75d4cc]" : "text-[#f2a0a0]"
                            )}>
                              {completion.outcome === "won" ? "Completed" : "Locked"}
                            </span>
                          </div>
                        );
                      }

                      return (
                        <div key={diff} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-transparent px-3 py-2 text-[11px] sm:text-xs">
                          <span className="font-semibold text-white/80">
                            {label}
                            {isCurrent ? " • Current" : ""}
                          </span>
                          <span className="text-[#75d4cc]">Available</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}