"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { GameEngine, GameSnapshot } from "@/lib/games/realmkin-2048/engine";
import type { Direction, TileSnapshot } from "@/lib/games/realmkin-2048/types";
import { useAuth } from "@/contexts/AuthContext";
import { calculate2048Points } from "@/lib/scoring";
import { leaderboardService } from "@/services/leaderboardService";
import type { Difficulty as LeaderboardDifficulty } from "@/types/leaderboard";

const SWIPE_THRESHOLD = 24;

type Difficulty = "simple" | "intermediate" | "hard";

const DIFFICULTY_CONFIG: Record<Difficulty, { gridSize: number; label: string }> = {
  simple: { gridSize: 4, label: "Simple" },
  intermediate: { gridSize: 5, label: "Intermediate" },
  hard: { gridSize: 6, label: "Hard" },
};

const KEY_TO_DIRECTION: Record<string, Direction> = {
  ArrowUp: 0,
  ArrowRight: 1,
  ArrowDown: 2,
  ArrowLeft: 3,
  w: 0,
  W: 0,
  d: 1,
  D: 1,
  s: 2,
  S: 2,
  a: 3,
  A: 3,
};

type AnimatedTile = TileSnapshot & {
  isNew: boolean;
  wasMerged: boolean;
};

const TILE_COLORS: Record<number, string> = {
  2: "bg-[#2F1F14]/70 text-[#F4C752]",
  4: "bg-[#3A281A]/80 text-[#F4C752]",
  8: "bg-[#7A3E1D] text-white",
  16: "bg-[#93511E] text-white",
  32: "bg-[#AD6721] text-white",
  64: "bg-[#C67D23] text-white",
  128: "bg-[#DA9C2F] text-[#14100A]",
  256: "bg-[#E2B751] text-[#14100A]",
  512: "bg-[#E9C86C] text-[#14100A]",
  1024: "bg-[#F0D886] text-[#14100A]",
  2048: "bg-[#F6E7A2] text-[#14100A]",
};

function formatScore(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

export default function Game2048Client() {
  const { user, userData } = useAuth();
  const [difficulty, setDifficulty] = useState<Difficulty>("simple");
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const tileCacheRef = useRef<Map<number, TileSnapshot>>(new Map());
  const [animatedTiles, setAnimatedTiles] = useState<AnimatedTile[]>([]);
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);
  const lastSubmittedScoreRef = useRef<number>(0);

  const gridSize = DIFFICULTY_CONFIG[difficulty].gridSize;

  useEffect(() => {
    const engine = new GameEngine({
      size: gridSize,
      onChange: (state) => {
        setSnapshot(state);
      },
    });
    engineRef.current = engine;
    setSnapshot(engine.getSnapshot());

    return () => {
      engineRef.current = null;
    };
  }, [gridSize]);

  const move = useCallback((direction: Direction) => {
    engineRef.current?.move(direction);
  }, []);

  useEffect(() => {
    if (!snapshot) {
      setAnimatedTiles([]);
      tileCacheRef.current = new Map();
      return;
    }

    const previousTiles = tileCacheRef.current;
    const nextTiles: AnimatedTile[] = snapshot.tiles.map((tile) => ({
      ...tile,
      isNew: !previousTiles.has(tile.id),
      wasMerged: tile.mergedFromIds.length > 0,
    }));

    setAnimatedTiles(nextTiles);
    tileCacheRef.current = new Map(snapshot.tiles.map((tile) => [tile.id, tile]));
  }, [snapshot]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!snapshot) return;
      if ((event.target as HTMLElement | null)?.tagName === "INPUT") return;
      const direction = KEY_TO_DIRECTION[event.key];
      if (direction === undefined) return;
      event.preventDefault();
      move(direction);
    };

    window.addEventListener("keydown", handleKeyDown, { passive: false });
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [move, snapshot]);

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      const touch = event.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (!touchStartRef.current) return;
      if (event.changedTouches.length !== 1) {
        touchStartRef.current = null;
        return;
      }

      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      touchStartRef.current = null;

      if (Math.abs(deltaX) < SWIPE_THRESHOLD && Math.abs(deltaY) < SWIPE_THRESHOLD) {
        return;
      }

      let direction: Direction;
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        direction = deltaX > 0 ? 1 : 3;
      } else {
        direction = deltaY > 0 ? 2 : 0;
      }

      move(direction);
    };

    board.addEventListener("touchstart", handleTouchStart, { passive: true });
    board.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      board.removeEventListener("touchstart", handleTouchStart);
      board.removeEventListener("touchend", handleTouchEnd);
    };
  }, [move]);

  const isLoading = snapshot == null;

  const status = useMemo(() => {
    if (!snapshot) {
      return {
        message: "",
        variant: "idle" as const,
      };
    }

    if (snapshot.over && !snapshot.keepPlaying) {
      return {
        message: "The Void devoured your run. Try again, champion.",
        variant: "lost" as const,
      };
    }

    if (snapshot.won && !snapshot.keepPlaying) {
      return {
        message: "Legendary relic awakened! Continue crafting your legacy?",
        variant: "won" as const,
      };
    }

    return {
      message: "Merge arcane tiles to reach 2048.",
      variant: "idle" as const,
    };
  }, [snapshot]);

  const handleRestart = useCallback(() => {
    engineRef.current?.restart();
  }, []);

  const handleDifficultyChange = useCallback((newDifficulty: Difficulty) => {
    setDifficulty(newDifficulty);
  }, []);

  const handleContinue = useCallback(() => {
    engineRef.current?.continueGame();
  }, []);

  // Submit score to leaderboard when game ends
  const submitScoreToLeaderboard = useCallback(async (finalScore: number) => {
    if (!user || !userData?.username || isSubmittingScore) return;
    if (finalScore <= lastSubmittedScoreRef.current) return; // Only submit if score improved

    setIsSubmittingScore(true);
    try {
      // Map 2048 difficulty to leaderboard difficulty
      const leaderboardDifficulty: LeaderboardDifficulty = difficulty === "simple" 
        ? "simple" 
        : difficulty === "intermediate" 
        ? "intermediate" 
        : "hard";

      const points = calculate2048Points(finalScore, leaderboardDifficulty);
      
      await leaderboardService.submitScore(
        user.uid,
        userData.username,
        points,
        "2048"
      );

      // Update streak (user played today)
      await leaderboardService.updateStreak(user.uid, userData.username);

      lastSubmittedScoreRef.current = finalScore;
      console.log(`Score submitted: ${finalScore} → ${points} points`);
    } catch (error) {
      console.error("Failed to submit score:", error);
    } finally {
      setIsSubmittingScore(false);
    }
  }, [user, userData, difficulty, isSubmittingScore]);

  // Watch for game over and submit score
  useEffect(() => {
    if (snapshot?.over && !snapshot.keepPlaying && snapshot.score > 0) {
      // Game ended, submit score
      submitScoreToLeaderboard(snapshot.score);
    }
  }, [snapshot?.over, snapshot?.keepPlaying, snapshot?.score, submitScoreToLeaderboard]);

  return (
    <div className="flex w-full flex-col gap-8 text-white">
      <div className="flex flex-col gap-6 rounded-3xl border border-[#DA9C2F]/25 bg-[#0B0B09]/80 p-6 shadow-[0_30px_60px_rgba(0,0,0,0.45)] backdrop-blur-sm md:flex-row md:items-start md:justify-between md:p-8">
        <div className="space-y-4 md:max-w-lg">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[#DA9C2F]/70">Realmkin Challenge</p>
            <h1 className="text-2xl font-bold uppercase tracking-[0.28em] text-[#F4C752] md:text-3xl">2048: Relic Forge</h1>
          </div>
          <p className="text-sm leading-relaxed text-white/70 md:text-base">
            Summon numbered sigils, weave them into greater power, and chase the mythical 2048 artifact.
            Powerups are dormant while their enchantments are reforged.
          </p>
          <p className={clsx("text-sm font-medium", status.variant === "won" && "text-[#F4C752]", status.variant === "lost" && "text-[#F26C6C]", status.variant === "idle" && "text-white/60")}> {status.message} </p>
          
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-[0.32em] text-white/50">Difficulty:</span>
            {(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map((diff) => (
              <button
                key={diff}
                type="button"
                onClick={() => handleDifficultyChange(diff)}
                className={clsx(
                  "rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.28em] transition",
                  difficulty === diff
                    ? "bg-[#DA9C2F] text-[#050302]"
                    : "border border-[#DA9C2F]/40 text-[#DA9C2F] hover:bg-[#DA9C2F]/10"
                )}
              >
                {DIFFICULTY_CONFIG[diff].label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleRestart}
              className="rounded-full bg-[#DA9C2F] px-5 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-[#050302] transition hover:bg-[#f4c752]"
            >
              New Game
            </button>
            {snapshot?.won && !snapshot.keepPlaying && (
              <button
                type="button"
                onClick={handleContinue}
                className="rounded-full border border-[#DA9C2F]/60 px-5 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-[#DA9C2F] transition hover:bg-[#DA9C2F]/10"
              >
                Keep Going
              </button>
            )}
            {snapshot?.over && !snapshot.keepPlaying && (
              <button
                type="button"
                onClick={handleRestart}
                className="rounded-full border border-[#DA9C2F]/30 px-5 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-white/80 transition hover:bg-white/10"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-row gap-3 md:flex-col">
          <div className="rounded-2xl border border-[#DA9C2F]/30 bg-[#050302]/80 px-5 py-4 text-center">
            <p className="text-xs uppercase tracking-[0.32em] text-white/60">Score</p>
            <p className="mt-2 text-2xl font-bold text-[#F4C752]">{formatScore(snapshot?.score ?? 0)}</p>
          </div>
          <div className="rounded-2xl border border-[#DA9C2F]/30 bg-[#050302]/80 px-5 py-4 text-center">
            <p className="text-xs uppercase tracking-[0.32em] text-white/60">Best</p>
            <p className="mt-2 text-2xl font-bold text-[#DA9C2F]">{formatScore(snapshot?.bestScore ?? 0)}</p>
          </div>
        </div>
      </div>

      <div className="relative flex flex-col gap-6 rounded-3xl border border-[#DA9C2F]/25 bg-[#0B0B09]/80 p-5 shadow-[0_30px_60px_RGBA(0,0,0,0.45)] backdrop-blur-sm md:p-8">
        <div
          ref={boardRef}
          className="relative mx-auto w-full max-w-xl select-none touch-none"
          style={{ touchAction: "none" }}
        >
          <div className="relative aspect-square">
            <div className="absolute inset-0 rounded-[32px] bg-[#120C07]/90" />
            <div className="absolute inset-0 p-5">
              <div
                className="grid h-full w-full gap-3"
                style={{
                  gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`,
                }}
              >
                {Array.from({ length: gridSize * gridSize }).map((_, index) => (
                  <div
                    key={index}
                    className="rounded-[20px] border border-[#DA9C2F]/10 bg-[#1A120C]/70"
                  />
                ))}
              </div>
              <div className="pointer-events-none absolute inset-0 p-5">
                <motion.div
                  layout
                  className="grid h-full w-full gap-3"
                  style={{
                    gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
                    gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`,
                  }}
                >
                  <AnimatePresence initial={false} mode="popLayout">
                    {animatedTiles.map((tile) => (
                      <motion.div
                        key={tile.id}
                        layout
                        className={clsx(
                          "flex h-full w-full items-center justify-center rounded-[20px] font-bold tracking-wider shadow-[0_16px_28px_rgba(0,0,0,0.35)]",
                          gridSize === 4 && "text-2xl",
                          gridSize === 5 && "text-xl",
                          gridSize === 6 && "text-lg",
                          TILE_COLORS[tile.value] ?? "bg-[#F6E7A2] text-[#14100A]"
                        )}
                        style={{
                          gridColumnStart: tile.x + 1,
                          gridRowStart: tile.y + 1,
                        }}
                        custom={tile}
                        initial={{
                          scale: tile.isNew ? 0.6 : 1,
                          opacity: tile.isNew ? 0.6 : 1,
                        }}
                        animate={{
                          scale: tile.wasMerged ? [1, 1.12, 1] : 1,
                          opacity: 1,
                        }}
                        exit={{ scale: 0.6, opacity: 0 }}
                        transition={{
                          layout: { duration: 0.18, ease: "easeInOut" },
                          scale: tile.wasMerged
                            ? { duration: 0.28, ease: "easeOut", times: [0, 0.5, 1] }
                            : { duration: 0.16, ease: "easeOut" },
                          opacity: { duration: 0.12, ease: "easeOut" },
                        }}
                      >
                        {tile.value}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              </div>
            </div>
            {(snapshot?.won && !snapshot.keepPlaying) || (snapshot?.over && !snapshot.keepPlaying) ? (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-[32px] bg-[#0B0B09]/80">
                <p className="text-lg font-semibold uppercase tracking-[0.28em] text-[#F4C752]">
                  {snapshot?.won ? "Victory" : "Defeat"}
                </p>
                <p className="px-8 text-center text-sm text-white/75 md:text-base">{status.message}</p>
              </div>
            ) : null}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-[32px] bg-[#0B0B09]/80">
                <span className="text-sm uppercase tracking-[0.32em] text-white/60">Calibrating...</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 text-center text-xs uppercase tracking-[0.28em] text-white/45 md:flex-row md:justify-center">
          <span>Use Arrow Keys or WASD to command the tiles.</span>
          <span className="hidden md:inline">•</span>
          <span>Swipe on touch devices to weave moves.</span>
        </div>
      </div>
    </div>
  );
}
