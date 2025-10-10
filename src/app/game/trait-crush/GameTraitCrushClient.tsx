"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { calculateTraitCrushPoints } from "@/lib/scoring";
import { leaderboardService } from "@/services/leaderboardService";
import { useIsMobile } from "@/hooks/useIsMobile";
import "./trait-crush-animations.css";

// Game constants
const BOARD_SIZE_DESKTOP = 6;
const BOARD_SIZE_MOBILE = 6;
const TRAITS = ["Strength", "Wisdom", "Agility", "Vitality", "Spirit", "Fortune"];

// Animation timing constants (in milliseconds)
const ANIMATION_TIMINGS = {
  CRUSH: 500,      // Tile crushing animation duration
  SLIDE: 800,      // Tile sliding/falling animation duration
  POP_IN: 400,     // New tile pop-in animation duration
  CRUSH_DELAY: 550,   // Wait time after crushing
  SLIDE_DELAY: 850,   // Wait time after sliding
  POP_IN_DELAY: 450,  // Wait time after pop-in
};
// Removed TRAIT_COLORS - all tiles use same neutral background

const TRAIT_IMAGES: Record<string, string> = {
  Strength: "/strength.png",
  Wisdom: "/wisdom.png",
  Agility: "/agility.png",
  Vitality: "/vitality.png",
  Spirit: "/spirit.png",
  Fortune: "/fortune.png",
};

type Difficulty = "simple" | "intermediate" | "hard";

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  simple: "Novice",
  intermediate: "Adept",
  hard: "Master",
};

const DIFFICULTIES: Difficulty[] = ["simple", "intermediate", "hard"];

const DIFFICULTY_TIME_LIMITS: Record<Difficulty, number> = {
  simple: 180, // 3 minutes
  intermediate: 120, // 2 minutes
  hard: 90, // 1.5 minutes
};

const ALERT_TIMEOUT_MS = 2000;

type AlertTone = "info" | "success" | "error";

interface AlertMessage {
  tone: AlertTone;
  message: string;
}

function AlertBanner({ alert }: { alert: AlertMessage | null }) {
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
}

interface Tile {
  id: string;
  trait: string;
  row: number;
  col: number;
  isCrushing?: boolean;
  isNew?: boolean;
}

interface GameState {
  board: Tile[][];
  score: number;
  moves: number;
  combos: number;
  difficulty: Difficulty;
  gameOver: boolean;
  isProcessing: boolean;
  timeRemaining: number;
}

function randomTrait(): string {
  return TRAITS[Math.floor(Math.random() * TRAITS.length)];
}

function createEmptyBoard(size: number): Tile[][] {
  const board: Tile[][] = [];
  for (let r = 0; r < size; r++) {
    const row: Tile[] = [];
    for (let c = 0; c < size; c++) {
      row.push({
        id: `${r}-${c}`,
        trait: randomTrait(),
        row: r,
        col: c,
      });
    }
    board.push(row);
  }
  return board;
}

export default function GameTraitCrushClient() {
  const { user, userData } = useAuth();
  const isMobile = useIsMobile();
  const boardSize = isMobile ? BOARD_SIZE_MOBILE : BOARD_SIZE_DESKTOP;
  const [difficulty, setDifficulty] = useState<Difficulty>("simple");
  const [gameState, setGameState] = useState<GameState>(() => ({
    board: createEmptyBoard(isMobile ? BOARD_SIZE_MOBILE : BOARD_SIZE_DESKTOP),
    score: 0,
    moves: 0,
    combos: 0,
    difficulty: "simple",
    gameOver: false,
    isProcessing: false,
    timeRemaining: DIFFICULTY_TIME_LIMITS["simple"],
  }));
  const [selectedTile, setSelectedTile] = useState<Tile | null>(null);
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [alert, setAlert] = useState<AlertMessage | null>(null);
  const [highScore, setHighScore] = useState<number>(0);
  const processingRef = useRef(false);
  const alertTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showAlert = useCallback((message: string, tone: AlertTone = "info") => {
    // Clear any existing alert first
    if (alertTimeoutRef.current) {
      clearTimeout(alertTimeoutRef.current);
      alertTimeoutRef.current = null;
    }
    setAlert({ message, tone });
    alertTimeoutRef.current = setTimeout(() => {
      setAlert(null);
      alertTimeoutRef.current = null;
    }, ALERT_TIMEOUT_MS);
  }, []);

  // Clear alert when processing starts
  useEffect(() => {
    if (gameState.isProcessing && alert) {
      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current);
        alertTimeoutRef.current = null;
      }
      setAlert(null);
    }
  }, [gameState.isProcessing, alert]);

  useEffect(() => {
    return () => {
      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current);
      }
    };
  }, []);

  // Fetch user's high score on mount
  useEffect(() => {
    const fetchHighScore = async () => {
      if (!user) return;
      
      try {
        const scoreDoc = await leaderboardService.getUserScore(user.uid);
        if (scoreDoc) {
          const traitCrushRawScore = scoreDoc.rawScores?.traitCrush || 0;
          setHighScore(traitCrushRawScore);
        }
      } catch (error) {
        console.error("Failed to fetch high score:", error);
      }
    };

    fetchHighScore();
  }, [user]);

  // Update high score display when game ends with new high score
  useEffect(() => {
    if (gameState.gameOver && gameState.score > 0) {
      if (gameState.score > highScore) {
        setHighScore(gameState.score);
      }
    }
  }, [gameState.gameOver, gameState.score, highScore]);

  // Handle game over (declared early for use in timer effect)
  const handleGameOver = useCallback(async () => {
    if (gameState.gameOver || isSubmittingScore) return;

    setGameState(prev => ({ ...prev, gameOver: true }));
    setShowStats(true);

    // Submit score to leaderboard
    if (user && userData?.username && gameState.score > 0) {
      setIsSubmittingScore(true);
      try {
        const points = calculateTraitCrushPoints(
          gameState.score,
          gameState.difficulty,
          gameState.combos
        );

        await leaderboardService.submitScore(
          user.uid,
          userData.username,
          points,
          "traitCrush",
          gameState.score // Pass raw game score
        );

        // Update streak
        await leaderboardService.updateStreak(user.uid, userData.username);

        console.log(`Trait Crush score submitted: ${gameState.score} → ${points} points`);
      } catch (error) {
        console.error("Failed to submit Trait Crush score:", error);
      } finally {
        setIsSubmittingScore(false);
      }
    }
  }, [gameState, user, userData, isSubmittingScore]);

  // Timer countdown
  useEffect(() => {
    if (gameState.gameOver || gameState.timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setGameState(prev => {
        const newTime = prev.timeRemaining - 1;
        
        // Auto-end game when time runs out
        if (newTime <= 0) {
          return { ...prev, timeRemaining: 0, gameOver: true };
        }
        
        return { ...prev, timeRemaining: newTime };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState.gameOver, gameState.timeRemaining]);

  // Auto-submit score when time runs out
  useEffect(() => {
    if (gameState.timeRemaining === 0 && !gameState.gameOver) {
      showAlert("Time's up!", "info");
      setTimeout(() => {
        handleGameOver();
      }, 500);
    }
  }, [gameState.timeRemaining, gameState.gameOver, handleGameOver, showAlert]);

  // Check for matches and crush them (Candy Crush style)
  const checkAndCrushMatches = useCallback((board: Tile[][]): { newBoard: Tile[][], matchCount: number } => {
    let matchCount = 0;
    const newBoard = board.map(row => row.map(tile => ({ ...tile, isCrushing: false, isNew: false })));
    const size = board.length;

    // Check horizontal matches (rows)
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size - 2; c++) {
        const tile1 = newBoard[r][c];
        const tile2 = newBoard[r][c + 1];
        const tile3 = newBoard[r][c + 2];

        // Match if all three traits are the same and not blank
        if (tile1.trait === tile2.trait && 
            tile2.trait === tile3.trait && 
            tile1.trait !== "blank") {
          tile1.isCrushing = true;
          tile2.isCrushing = true;
          tile3.isCrushing = true;
          matchCount += 3;
        }
      }
    }

    // Check vertical matches (columns)
    for (let c = 0; c < size; c++) {
      for (let r = 0; r < size - 2; r++) {
        const tile1 = newBoard[r][c];
        const tile2 = newBoard[r + 1][c];
        const tile3 = newBoard[r + 2][c];

        // Match if all three traits are the same and not blank
        if (tile1.trait === tile2.trait && 
            tile2.trait === tile3.trait && 
            tile1.trait !== "blank") {
          tile1.isCrushing = true;
          tile2.isCrushing = true;
          tile3.isCrushing = true;
          matchCount += 3;
        }
      }
    }

    // Mark crushing tiles as blank after animation
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (newBoard[r][c].isCrushing) {
          newBoard[r][c].trait = "blank";
        }
      }
    }

    return { newBoard, matchCount };
  }, []);

  // Slide tiles down to fill blanks
  const slideTraits = useCallback((board: Tile[][]): Tile[][] => {
    const newBoard = board.map(row => row.map(tile => ({ ...tile })));
    const size = board.length;

    for (let c = 0; c < size; c++) {
      let writeIndex = size - 1;
      for (let r = size - 1; r >= 0; r--) {
        if (newBoard[r][c].trait !== "blank") {
          if (writeIndex !== r) {
            newBoard[writeIndex][c].trait = newBoard[r][c].trait;
            newBoard[r][c].trait = "blank";
          }
          writeIndex--;
        }
      }
    }

    return newBoard;
  }, []);

  // Generate new traits at the top
  const generateNewTraits = useCallback((board: Tile[][]): Tile[][] => {
    const newBoard = board.map(row => row.map(tile => ({ ...tile, isCrushing: false, isNew: false })));
    const size = board.length;

    // Only fill blank spaces at the TOP of each column
    // After sliding, blanks should only be at the top
    for (let c = 0; c < size; c++) {
      for (let r = 0; r < size; r++) {
        if (newBoard[r][c].trait === "blank") {
          newBoard[r][c].trait = randomTrait();
          newBoard[r][c].isNew = true; // Mark as new for animation
        } else {
          // Stop checking this column once we hit a non-blank tile
          // (all blanks should be at the top after sliding)
          break;
        }
      }
    }

    return newBoard;
  }, []);

  // Check if a move is valid (creates a match)
  const isValidMove = useCallback((board: Tile[][]): boolean => {
    const { matchCount } = checkAndCrushMatches(board);
    return matchCount > 0;
  }, [checkAndCrushMatches]);

  // Check if any valid moves exist on the board
  const hasValidMoves = useCallback((board: Tile[][]): boolean => {
    const size = board.length;
    
    // Try every possible adjacent swap
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        // Try swapping with right neighbor
        if (c < size - 1) {
          const testBoard = board.map(row => row.map(tile => ({ ...tile })));
          const temp = testBoard[r][c].trait;
          testBoard[r][c].trait = testBoard[r][c + 1].trait;
          testBoard[r][c + 1].trait = temp;
          
          if (isValidMove(testBoard)) {
            return true;
          }
        }
        
        // Try swapping with bottom neighbor
        if (r < size - 1) {
          const testBoard = board.map(row => row.map(tile => ({ ...tile })));
          const temp = testBoard[r][c].trait;
          testBoard[r][c].trait = testBoard[r + 1][c].trait;
          testBoard[r + 1][c].trait = temp;
          
          if (isValidMove(testBoard)) {
            return true;
          }
        }
      }
    }
    
    return false;
  }, [isValidMove]);

  // Reshuffle board by redistributing existing traits
  const reshuffleBoard = useCallback((board: Tile[][]): Tile[][] => {
    const size = board.length;
    const traits: string[] = [];
    
    // Collect all non-blank traits
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (board[r][c].trait !== "blank") {
          traits.push(board[r][c].trait);
        }
      }
    }
    
    // Shuffle traits array
    for (let i = traits.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [traits[i], traits[j]] = [traits[j], traits[i]];
    }
    
    // Redistribute shuffled traits
    const newBoard = board.map(row => row.map(tile => ({ ...tile })));
    let traitIndex = 0;
    
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (newBoard[r][c].trait !== "blank") {
          newBoard[r][c].trait = traits[traitIndex++];
        }
      }
    }
    
    return newBoard;
  }, []);

  // Handle tile swap
  const handleTileSwap = useCallback((tile: Tile) => {
    if (gameState.isProcessing || gameState.gameOver) return;

    if (!selectedTile) {
      setSelectedTile(tile);
      return;
    }

    // Check if same tile clicked
    if (selectedTile.id === tile.id) {
      setSelectedTile(null);
      return;
    }

    // Check if tiles are adjacent
    const rowDiff = Math.abs(selectedTile.row - tile.row);
    const colDiff = Math.abs(selectedTile.col - tile.col);
    const isAdjacent = (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);

    if (!isAdjacent) {
      setSelectedTile(tile);
      return;
    }

    // Don't swap blank tiles
    if (selectedTile.trait === "blank" || tile.trait === "blank") {
      setSelectedTile(null);
      return;
    }

    // Swap tiles
    const newBoard = gameState.board.map(row => row.map(t => ({ ...t })));
    const temp = newBoard[selectedTile.row][selectedTile.col].trait;
    newBoard[selectedTile.row][selectedTile.col].trait = newBoard[tile.row][tile.col].trait;
    newBoard[tile.row][tile.col].trait = temp;

    // Check if valid move
    if (!isValidMove(newBoard)) {
      showAlert("No match! Try again", "error");
      setSelectedTile(null);
      return;
    }

    // Valid move - update state
    setGameState(prev => ({
      ...prev,
      board: newBoard,
      moves: prev.moves + 1,
      isProcessing: true,
    }));
    setSelectedTile(null);
  }, [gameState, selectedTile, isValidMove, showAlert]);

  // Auto-detect and process matches (Candy Crush style - continuous checking)
  useEffect(() => {
    if (gameState.gameOver) return;
    
    const interval = setInterval(() => {
      if (gameState.isProcessing || processingRef.current) return;
      
      // Check if there are any matches on the current board
      const testBoard = gameState.board.map(row => row.map(tile => ({ ...tile })));
      const { matchCount } = checkAndCrushMatches(testBoard);
      
      if (matchCount > 0 && !gameState.isProcessing) {
        // Trigger processing to clear matches
        setGameState(prev => ({ ...prev, isProcessing: true }));
      }
    }, 100); // Check every 100ms like Candy Crush
    
    return () => clearInterval(interval);
  }, [gameState.board, gameState.gameOver, gameState.isProcessing, checkAndCrushMatches]);

  // Check for no valid moves and reshuffle if needed
  useEffect(() => {
    if (gameState.gameOver || gameState.isProcessing) return;
    
    // Check if board has no valid moves
    if (!hasValidMoves(gameState.board)) {
      console.log("No valid moves detected - reshuffling board");
      showAlert("No moves available! Reshuffling...", "info");
      
      // Reshuffle until we get a board with valid moves
      let newBoard = reshuffleBoard(gameState.board);
      let attempts = 0;
      const maxAttempts = 10;
      
      while (!hasValidMoves(newBoard) && attempts < maxAttempts) {
        newBoard = reshuffleBoard(newBoard);
        attempts++;
      }
      
      setGameState(prev => ({ ...prev, board: newBoard }));
    }
  }, [gameState.board, gameState.gameOver, gameState.isProcessing, hasValidMoves, reshuffleBoard, showAlert]);

  // Process matches continuously
  useEffect(() => {
    if (!gameState.isProcessing || processingRef.current) return;

    processingRef.current = true;

    const processMatches = async () => {
      await new Promise(resolve => setTimeout(resolve, 200));

      let currentBoard = gameState.board;
      let totalMatchCount = 0;
      let comboCount = 0;

      // Keep processing until no more matches
      while (true) {
        const { newBoard, matchCount } = checkAndCrushMatches(currentBoard);
        
        if (matchCount === 0) break;

        totalMatchCount += matchCount;
        comboCount++;
        currentBoard = newBoard;

        // Wait for crushing animation to complete (400ms)
        await new Promise(resolve => setTimeout(resolve, 450));

        currentBoard = slideTraits(currentBoard);
        // Wait for sliding animation to complete (600ms)
        await new Promise(resolve => setTimeout(resolve, 650));

        currentBoard = generateNewTraits(currentBoard);
        // Wait for pop-in animation to complete (300ms)
        await new Promise(resolve => setTimeout(resolve, 350));
      }

      if (totalMatchCount > 0) {
        const points = totalMatchCount * 10 * (comboCount > 1 ? comboCount : 1);
        
        setGameState(prev => ({
          ...prev,
          board: currentBoard,
          score: prev.score + points,
          combos: prev.combos + (comboCount > 1 ? 1 : 0),
          isProcessing: false,
        }));

        if (comboCount > 1) {
          showAlert(`${comboCount}x Combo! +${points}`, "success");
        }
      } else {
        setGameState(prev => ({
          ...prev,
          board: currentBoard,
          isProcessing: false,
        }));
      }

      processingRef.current = false;
    };

    processMatches();
  }, [gameState.isProcessing, gameState.board, checkAndCrushMatches, slideTraits, generateNewTraits, showAlert]);

  // Handle difficulty change
  const handleDifficultyChange = useCallback((newDifficulty: Difficulty) => {
    setDifficulty(newDifficulty);
    setGameState({
      board: createEmptyBoard(boardSize),
      score: 0,
      moves: 0,
      combos: 0,
      difficulty: newDifficulty,
      gameOver: false,
      isProcessing: false,
      timeRemaining: DIFFICULTY_TIME_LIMITS[newDifficulty],
    });
    setSelectedTile(null);
  }, [boardSize]);

  // Handle new game
  const handleNewGame = useCallback(() => {
    setGameState({
      board: createEmptyBoard(boardSize),
      score: 0,
      moves: 0,
      combos: 0,
      difficulty: difficulty,
      gameOver: false,
      isProcessing: false,
      timeRemaining: DIFFICULTY_TIME_LIMITS[difficulty],
    });
    setSelectedTile(null);
    setShowStats(false);
  }, [difficulty, boardSize]);

  return (
    <div className="flex w-full flex-col gap-8 text-white">
      <div className="flex flex-col gap-6 rounded-3xl border border-[#DA9C2F]/25 bg-[#0B0B09]/80 p-6 shadow-[0_30px_60px_rgba(0,0,0,0.45)] backdrop-blur-sm md:flex-row md:items-start md:justify-between md:p-8">
        <div className="space-y-4 md:max-w-lg">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.42em] text-[#DA9C2F]/70">Realmkin Challenge</p>
            <h1 className="text-2xl font-bold uppercase tracking-[0.28em] text-[#F4C752] md:text-3xl">Trait Crush</h1>
          </div>
          <p className="text-sm leading-relaxed text-white/70 md:text-base">
            Align traits, collapse sigil chains, and forge cascading combos. Each match builds momentum toward
            leaderboard glory across the Realmkin nexus.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-[0.32em] text-white/50">Difficulty:</span>
            {DIFFICULTIES.map((diff) => (
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
                {DIFFICULTY_LABELS[diff]}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleNewGame}
              className="rounded-full bg-[#DA9C2F] px-5 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-[#050302] transition hover:bg-[#f4c752]"
            >
              New Game
            </button>
            <button
              type="button"
              onClick={handleGameOver}
              disabled={gameState.gameOver || gameState.score === 0}
              className="rounded-full border border-[#DA9C2F]/40 px-5 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-[#DA9C2F] transition hover:bg-[#DA9C2F]/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              End Game
            </button>
            <button
              type="button"
              onClick={() => setShowStats(true)}
              className="rounded-full border border-[#DA9C2F]/40 px-5 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-white/80 transition hover:bg-white/10"
            >
              View Stats
            </button>
          </div>
        </div>

        <div className="flex flex-row gap-3 md:flex-col">
          <div className="rounded-2xl border border-[#DA9C2F]/30 bg-[#050302]/80 px-5 py-4 text-center">
            <p className="text-xs uppercase tracking-[0.32em] text-white/60">Time</p>
            <p className={clsx(
              "mt-2 text-2xl font-bold",
              gameState.timeRemaining <= 10 ? "text-red-500 animate-pulse" : "text-[#F4C752]"
            )}>
              {Math.floor(gameState.timeRemaining / 60)}:{String(gameState.timeRemaining % 60).padStart(2, '0')}
            </p>
          </div>
          <div className="rounded-2xl border border-[#DA9C2F]/30 bg-[#050302]/80 px-5 py-4 text-center">
            <p className="text-xs uppercase tracking-[0.32em] text-white/60">Score</p>
            <p className="mt-2 text-2xl font-bold text-[#F4C752]">{gameState.score}</p>
          </div>
          <div className="rounded-2xl border border-[#DA9C2F]/30 bg-[#050302]/80 px-5 py-4 text-center">
            <p className="text-xs uppercase tracking-[0.32em] text-white/60">High Score</p>
            <p className="mt-2 text-2xl font-bold text-[#DA9C2F]">{highScore}</p>
          </div>
          <div className="rounded-2xl border border-[#DA9C2F]/30 bg-[#050302]/80 px-5 py-4 text-center">
            <p className="text-xs uppercase tracking-[0.32em] text-white/60">Combos</p>
            <p className="mt-2 text-2xl font-bold text-[#DA9C2F]">{gameState.combos}</p>
          </div>
        </div>
      </div>

      <div className="relative rounded-3xl border border-[#DA9C2F]/20 bg-[#0B0B09]/80 p-5 shadow-[0_30px_60px_rgba(0,0,0,0.45)] backdrop-blur-sm">
        <div className="grid gap-1 sm:gap-2" style={{ gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))` }}>
          {gameState.board.map((row) =>
            row.map((tile) => (
              <motion.button
                key={tile.id}
                type="button"
                onClick={() => handleTileSwap(tile)}
                disabled={gameState.isProcessing || gameState.gameOver}
                layout
                transition={{
                  layout: {
                    duration: ANIMATION_TIMINGS.SLIDE / 1000,
                    ease: [0.25, 0.8, 0.25, 1],
                  },
                }}
                className={clsx(
                  "relative aspect-square rounded-lg border-2 bg-[#1a1612]/80 border-[#DA9C2F]/20 overflow-hidden trait-tile",
                  tile.trait === "blank" && "opacity-0",
                  tile.isCrushing && "trait-crush",
                  tile.isNew && "trait-pop-in",
                  selectedTile?.id === tile.id && "selected ring-4 ring-[#F4C752] border-[#F4C752]",
                  !gameState.isProcessing && !gameState.gameOver && "cursor-pointer",
                  (gameState.isProcessing || gameState.gameOver) && "cursor-not-allowed opacity-70"
                )}
                whileHover={{ scale: gameState.isProcessing || gameState.gameOver ? 1 : 1.05 }}
                whileTap={{ scale: gameState.isProcessing || gameState.gameOver ? 1 : 0.95 }}
              >
                {tile.trait !== "blank" && (
                  <Image
                    src={TRAIT_IMAGES[tile.trait]}
                    alt={tile.trait}
                    width={80}
                    height={80}
                    className="h-full w-full object-contain p-1"
                    draggable={false}
                  />
                )}
              </motion.button>
            ))
          )}
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 text-center text-xs uppercase tracking-[0.28em] text-white/55 md:flex-row md:justify-center">
        <span>Swap adjacent traits to forge chains.</span>
        <span className="hidden md:inline">•</span>
        <span>Combos award bonus points.</span>
      </div>

      <AnimatePresence>
        {showStats && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowStats(false)}
          >
            <motion.div
              className="relative mx-4 w-full max-w-md overflow-hidden rounded-3xl border border-[#DA9C2F]/25 bg-[#050302]/95 p-6 shadow-[0_40px_120px_rgba(0,0,0,0.65)]"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setShowStats(false)}
                className="absolute right-4 top-3 text-white/60 transition hover:text-white"
                aria-label="Close stats"
              >
                ✕
              </button>
              <div className="space-y-5 text-white">
                <header className="space-y-1 text-center">
                  <p className="text-xs uppercase tracking-[0.38em] text-[#DA9C2F]/70">{DIFFICULTY_LABELS[difficulty]} Realm</p>
                  <h2 className="text-xl font-bold uppercase tracking-[0.24em] text-[#F4C752]">Game Stats</h2>
                </header>

                <section className="space-y-3">
                  <div className="rounded-2xl border border-[#DA9C2F]/20 bg-[#0B0B09]/70 p-4 text-center">
                    <p className="text-xs uppercase tracking-[0.28em] text-white/55">Final Score</p>
                    <p className="mt-2 text-3xl font-semibold text-[#F4C752]">{gameState.score}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-[#DA9C2F]/20 bg-[#0B0B09]/70 p-4 text-center">
                      <p className="text-xs uppercase tracking-[0.28em] text-white/55">Moves</p>
                      <p className="mt-2 text-xl font-semibold text-[#F4C752]">{gameState.moves}</p>
                    </div>
                    <div className="rounded-2xl border border-[#DA9C2F]/20 bg-[#0B0B09]/70 p-4 text-center">
                      <p className="text-xs uppercase tracking-[0.28em] text-white/55">Combos</p>
                      <p className="mt-2 text-xl font-semibold text-[#F4C752]">{gameState.combos}</p>
                    </div>
                  </div>
                </section>

                {gameState.gameOver && (
                  <p className="rounded-2xl border border-[#DA9C2F]/25 bg-[#1E1206]/70 p-4 text-center text-xs uppercase tracking-[0.28em] text-[#F4C752]">
                    Score submitted to leaderboard!
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowStats(false);
                    handleNewGame();
                  }}
                  className="w-full rounded-full bg-[#DA9C2F] px-5 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-[#050302] transition hover:bg-[#f4c752]"
                >
                  Play Again
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AlertBanner alert={alert} />
    </div>
  );
}
