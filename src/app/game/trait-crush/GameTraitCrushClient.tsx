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

// Animation timing constants (in milliseconds) - Candy Crush style
const ANIMATION_TIMINGS = {
  SWAP: 200,       // Tile swap animation (fast like Candy Crush)
  CRUSH: 200,      // Tile crushing animation duration
  COLLAPSE: 200,   // Tile falling/collapsing animation
  REFILL: 200,     // New tile drop-in animation
  MATCH_CHECK: 100, // Brief pause for match detection
  GAME_LOOP: 100,  // Game loop interval (like Candy Crush)
};
// Removed TRAIT_COLORS - all tiles use same neutral background

const SWIPE_THRESHOLD = 24;

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
  isCrushing: boolean;
  isNew: boolean;
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

// Helper to check if placing a trait would create a match
function wouldCreateMatch(board: Tile[][], row: number, col: number, trait: string): boolean {
  const size = board.length;
  
  // Check horizontal (left and right)
  let horizontalCount = 1;
  // Count left
  for (let c = col - 1; c >= 0 && board[row][c]?.trait === trait; c--) {
    horizontalCount++;
  }
  // Count right
  for (let c = col + 1; c < size && board[row][c]?.trait === trait; c++) {
    horizontalCount++;
  }
  if (horizontalCount >= 3) return true;
  
  // Check vertical (up and down)
  let verticalCount = 1;
  // Count up
  for (let r = row - 1; r >= 0 && board[r][col]?.trait === trait; r--) {
    verticalCount++;
  }
  // Count down
  for (let r = row + 1; r < size && board[r][col]?.trait === trait; r++) {
    verticalCount++;
  }
  if (verticalCount >= 3) return true;
  
  return false;
}

function createEmptyBoard(size: number): Tile[][] {
  const board: Tile[][] = [];
  
  // Initialize empty board structure
  for (let r = 0; r < size; r++) {
    const row: Tile[] = [];
    for (let c = 0; c < size; c++) {
      row.push({
        id: `${r}-${c}`,
        trait: "",
        row: r,
        col: c,
        isCrushing: false,
        isNew: false,
      });
    }
    board.push(row);
  }
  
  // Fill board ensuring no starting matches
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      let trait = randomTrait();
      let attempts = 0;
      const maxAttempts = 20;
      
      // Keep trying until we find a trait that doesn't create a match
      while (wouldCreateMatch(board, r, c, trait) && attempts < maxAttempts) {
        trait = randomTrait();
        attempts++;
      }
      
      board[r][c].trait = trait;
    }
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
  const swipeStartRef = useRef<{ row: number; col: number; x: number; y: number } | null>(null);
  const skipClickRef = useRef(false);
  const gameLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dragStateRef = useRef<{
    colorBeingDragged: string | null;
    colorBeingReplaced: string | null;
    squareIdBeingDragged: number | null;
    squareIdBeingReplaced: number | null;
  }>({ colorBeingDragged: null, colorBeingReplaced: null, squareIdBeingDragged: null, squareIdBeingReplaced: null });
  const comboChainRef = useRef(0);

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

  // Check for 4-in-a-row matches (Candy Crush priority) - Don't blank immediately
  const checkRowForFour = useCallback((board: Tile[][]): { newBoard: Tile[][], matchCount: number } => {
    const newBoard = board.map(row => row.map(tile => ({ ...tile, isCrushing: tile.isCrushing ?? false, isNew: tile.isNew ?? false })));
    const size = board.length;
    let matchCount = 0;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size - 3; c++) {
        const rowOfFour = [c, c + 1, c + 2, c + 3];
        const decidedTrait = newBoard[r][c].trait;
        const isBlank = decidedTrait === "blank" || decidedTrait === "";
        
        if (!isBlank && rowOfFour.every(col => newBoard[r][col].trait === decidedTrait)) {
          rowOfFour.forEach(col => {
            newBoard[r][col].isCrushing = true;
            // Don't set to blank yet - keep visible during crush animation
          });
          matchCount += 4;
        }
      }
    }

    return { newBoard, matchCount };
  }, []);

  const checkColumnForFour = useCallback((board: Tile[][]): { newBoard: Tile[][], matchCount: number } => {
    const newBoard = board.map(row => row.map(tile => ({ ...tile, isCrushing: tile.isCrushing ?? false, isNew: tile.isNew ?? false })));
    const size = board.length;
    let matchCount = 0;

    for (let c = 0; c < size; c++) {
      for (let r = 0; r < size - 3; r++) {
        const columnOfFour = [r, r + 1, r + 2, r + 3];
        const decidedTrait = newBoard[r][c].trait;
        const isBlank = decidedTrait === "blank" || decidedTrait === "";
        
        if (!isBlank && columnOfFour.every(row => newBoard[row][c].trait === decidedTrait)) {
          columnOfFour.forEach(row => {
            newBoard[row][c].isCrushing = true;
            // Don't set to blank yet - keep visible during crush animation
          });
          matchCount += 4;
        }
      }
    }

    return { newBoard, matchCount };
  }, []);

  // Check for 3-in-a-row matches (after 4-match check) - Don't blank immediately
  const checkRowForThree = useCallback((board: Tile[][]): { newBoard: Tile[][], matchCount: number } => {
    const newBoard = board.map(row => row.map(tile => ({ ...tile, isCrushing: tile.isCrushing ?? false, isNew: tile.isNew ?? false })));
    const size = board.length;
    let matchCount = 0;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size - 2; c++) {
        const rowOfThree = [c, c + 1, c + 2];
        const decidedTrait = newBoard[r][c].trait;
        const isBlank = decidedTrait === "blank" || decidedTrait === "";
        
        if (!isBlank && rowOfThree.every(col => newBoard[r][col].trait === decidedTrait)) {
          rowOfThree.forEach(col => {
            newBoard[r][col].isCrushing = true;
            // Don't set to blank yet - keep visible during crush animation
          });
          matchCount += 3;
        }
      }
    }

    return { newBoard, matchCount };
  }, []);

  const checkColumnForThree = useCallback((board: Tile[][]): { newBoard: Tile[][], matchCount: number } => {
    const newBoard = board.map(row => row.map(tile => ({ ...tile, isCrushing: tile.isCrushing ?? false, isNew: tile.isNew ?? false })));
    const size = board.length;
    let matchCount = 0;

    for (let c = 0; c < size; c++) {
      for (let r = 0; r < size - 2; r++) {
        const columnOfThree = [r, r + 1, r + 2];
        const decidedTrait = newBoard[r][c].trait;
        const isBlank = decidedTrait === "blank" || decidedTrait === "";
        
        if (!isBlank && columnOfThree.every(row => newBoard[row][c].trait === decidedTrait)) {
          columnOfThree.forEach(row => {
            newBoard[row][c].isCrushing = true;
            // Don't set to blank yet - keep visible during crush animation
          });
          matchCount += 3;
        }
      }
    }

    return { newBoard, matchCount };
  }, []);

  // Combined match checking (Candy Crush order: 4s first, then 3s)
  const checkAndCrushMatches = useCallback((board: Tile[][]): { newBoard: Tile[][], matchCount: number, scorePoints: number } => {
    let currentBoard = board.map(row => row.map(tile => ({ ...tile, isCrushing: tile.isCrushing ?? false, isNew: tile.isNew ?? false })));
    let totalMatchCount = 0;
    let totalScorePoints = 0;

    // Check 4-in-a-row first (priority)
    const row4Result = checkRowForFour(currentBoard);
    currentBoard = row4Result.newBoard;
    if (row4Result.matchCount > 0) {
      totalMatchCount += row4Result.matchCount;
      totalScorePoints += row4Result.matchCount; // 1 point per tile in 4-match
    }

    const col4Result = checkColumnForFour(currentBoard);
    currentBoard = col4Result.newBoard;
    if (col4Result.matchCount > 0) {
      totalMatchCount += col4Result.matchCount;
      totalScorePoints += col4Result.matchCount; // 1 point per tile in 4-match
    }

    // Then check 3-in-a-row
    const row3Result = checkRowForThree(currentBoard);
    currentBoard = row3Result.newBoard;
    if (row3Result.matchCount > 0) {
      totalMatchCount += row3Result.matchCount;
      totalScorePoints += row3Result.matchCount; // 1 point per tile in 3-match
    }

    const col3Result = checkColumnForThree(currentBoard);
    currentBoard = col3Result.newBoard;
    if (col3Result.matchCount > 0) {
      totalMatchCount += col3Result.matchCount;
      totalScorePoints += col3Result.matchCount; // 1 point per tile in 3-match
    }

    return { newBoard: currentBoard, matchCount: totalMatchCount, scorePoints: totalScorePoints };
  }, [checkRowForFour, checkColumnForFour, checkRowForThree, checkColumnForThree]);

  // Slide tiles down to fill blanks (Candy Crush style)
  const slideTraits = useCallback((board: Tile[][]): Tile[][] => {
    const newBoard = board.map(row => row.map(tile => ({ ...tile, isCrushing: tile.isCrushing ?? false, isNew: tile.isNew ?? false })));
    const size = board.length;

    // Move candies down column by column
    for (let c = 0; c < size; c++) {
      let writeIndex = size - 1;
      // Start from bottom and move up
      for (let r = size - 1; r >= 0; r--) {
        if (newBoard[r][c].trait !== "blank" && newBoard[r][c].trait !== "") {
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

  // Generate new traits at the top (Candy Crush style)
  const generateNewTraits = useCallback((board: Tile[][]): Tile[][] => {
    const newBoard = board.map(row => row.map(tile => ({ ...tile, isCrushing: false, isNew: false })));
    const size = board.length;

    // Fill empty squares in the first row first
    for (let c = 0; c < size; c++) {
      if (newBoard[0][c].trait === "blank" || newBoard[0][c].trait === "") {
        newBoard[0][c].trait = randomTrait();
        newBoard[0][c].isNew = true;
      }
    }

    // Then fill remaining blanks from top to bottom
    for (let c = 0; c < size; c++) {
      for (let r = 0; r < size; r++) {
        if (newBoard[r][c].trait === "blank" || newBoard[r][c].trait === "") {
          newBoard[r][c].trait = randomTrait();
          newBoard[r][c].isNew = true;
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
          const testBoard = board.map(row => row.map(tile => ({ ...tile, isCrushing: tile.isCrushing ?? false, isNew: tile.isNew ?? false })));
          const temp = testBoard[r][c].trait;
          testBoard[r][c].trait = testBoard[r][c + 1].trait;
          testBoard[r][c + 1].trait = temp;
          
          if (isValidMove(testBoard)) {
            return true;
          }
        }
        
        // Try swapping with bottom neighbor
        if (r < size - 1) {
          const testBoard = board.map(row => row.map(tile => ({ ...tile, isCrushing: tile.isCrushing ?? false, isNew: tile.isNew ?? false })));
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
    const newBoard = board.map(row => row.map(tile => ({ ...tile, isCrushing: tile.isCrushing ?? false, isNew: tile.isNew ?? false })));
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

  const attemptSwap = useCallback((source: Tile, target: Tile) => {
    if (gameState.isProcessing || gameState.gameOver) return;

    const rowDiff = Math.abs(source.row - target.row);
    const colDiff = Math.abs(source.col - target.col);
    const isAdjacent = (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
    if (!isAdjacent) return;

    if (source.trait === "blank" || target.trait === "blank") {
      setSelectedTile(null);
      return;
    }

    const newBoard = gameState.board.map(row => row.map(t => ({ ...t, isCrushing: t.isCrushing ?? false, isNew: t.isNew ?? false })));
    const temp = newBoard[source.row][source.col].trait;
    newBoard[source.row][source.col].trait = newBoard[target.row][target.col].trait;
    newBoard[target.row][target.col].trait = temp;

    if (!isValidMove(newBoard)) {
      // Invalid move - revert the swap visually
      showAlert("No match! Try again", "error");
      setSelectedTile(null);
      
      // Briefly show the swap then revert
      setGameState(prev => ({ ...prev, board: newBoard }));
      setTimeout(() => {
        const revertBoard = gameState.board.map(row => row.map(t => ({ ...t, isCrushing: t.isCrushing ?? false, isNew: t.isNew ?? false })));
        setGameState(prev => ({ ...prev, board: revertBoard }));
      }, ANIMATION_TIMINGS.SWAP);
      return;
    }

    // Valid move - apply it and increment moves counter
    // Reset combo chain on new user move
    comboChainRef.current = 1; // Start at 1 for the initial match
    
    setGameState(prev => ({
      ...prev,
      board: newBoard,
      moves: prev.moves + 1,
    }));
    setSelectedTile(null);
  }, [gameState.board, gameState.gameOver, gameState.isProcessing, isValidMove, showAlert]);

  // Handle tile swap via taps/clicks
  const handleTileSwap = useCallback((tile: Tile) => {
    if (gameState.isProcessing || gameState.gameOver) return;

    if (!selectedTile) {
      setSelectedTile(tile);
      return;
    }

    if (selectedTile.id === tile.id) {
      setSelectedTile(null);
      return;
    }

    const rowDiff = Math.abs(selectedTile.row - tile.row);
    const colDiff = Math.abs(selectedTile.col - tile.col);
    const isAdjacent = (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);

    if (!isAdjacent) {
      setSelectedTile(tile);
      return;
    }

    attemptSwap(selectedTile, tile);
  }, [gameState.gameOver, gameState.isProcessing, selectedTile, attemptSwap]);

  const handleSwipe = useCallback((startRow: number, startCol: number, deltaX: number, deltaY: number) => {
    const board = gameState.board;
    const sourceTile = board[startRow]?.[startCol];
    if (!sourceTile) return;

    let targetRow = startRow;
    let targetCol = startCol;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      targetCol += deltaX > 0 ? 1 : -1;
    } else {
      targetRow += deltaY > 0 ? 1 : -1;
    }

    if (targetRow < 0 || targetRow >= boardSize || targetCol < 0 || targetCol >= boardSize) {
      return;
    }

    const targetTile = board[targetRow]?.[targetCol];
    if (!targetTile) return;

    attemptSwap(sourceTile, targetTile);
  }, [attemptSwap, gameState.board, boardSize]);

  // Continuous game loop (Candy Crush style) - runs every 100ms
  useEffect(() => {
    if (gameState.gameOver) {
      // Clear game loop when game is over
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      return;
    }

    // Start game loop
    gameLoopRef.current = setInterval(() => {
      setGameState(prev => {
        if (prev.isProcessing || prev.gameOver) return prev;

        // Check for matches
        const { newBoard, matchCount, scorePoints } = checkAndCrushMatches(prev.board);
        
        if (matchCount > 0) {
          // Matches found - update board and trigger processing
          return {
            ...prev,
            board: newBoard,
            score: prev.score + scorePoints,
            isProcessing: true,
          };
        }
        
        return prev;
      });
    }, ANIMATION_TIMINGS.GAME_LOOP);

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
    };
  }, [gameState.gameOver, checkAndCrushMatches]);

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
      const maxAttempts = 20; // Increased attempts
      
      while (!hasValidMoves(newBoard) && attempts < maxAttempts) {
        newBoard = reshuffleBoard(newBoard);
        attempts++;
      }
      
      // If still no valid moves after max attempts, regenerate entire board
      if (!hasValidMoves(newBoard)) {
        console.warn("Reshuffle failed, regenerating board");
        newBoard = createEmptyBoard(gameState.board.length);
        
        // Ensure regenerated board has valid moves
        let regenAttempts = 0;
        while (!hasValidMoves(newBoard) && regenAttempts < 5) {
          newBoard = createEmptyBoard(gameState.board.length);
          regenAttempts++;
        }
      }
      
      setGameState(prev => ({ ...prev, board: newBoard }));
    }
  }, [gameState.board, gameState.gameOver, gameState.isProcessing, hasValidMoves, reshuffleBoard, showAlert]);

  // Process cascading after matches are found
  useEffect(() => {
    if (!gameState.isProcessing || processingRef.current) return;

    processingRef.current = true;

    const processCascade = async () => {
      // Wait for crush animation to play
      await new Promise(resolve => setTimeout(resolve, ANIMATION_TIMINGS.CRUSH));

      // NOW set crushing tiles to blank (after animation)
      const blankedBoard = gameState.board.map(row => 
        row.map(tile => ({
          ...tile,
          trait: tile.isCrushing ? "blank" : tile.trait,
          isCrushing: false,
        }))
      );

      // Immediately slide tiles down (no gap)
      const slidBoard = slideTraits(blankedBoard);
      setGameState(prev => ({ ...prev, board: slidBoard }));
      
      // Wait for collapse animation
      await new Promise(resolve => setTimeout(resolve, ANIMATION_TIMINGS.COLLAPSE));

      // Generate new traits
      const refilledBoard = generateNewTraits(slidBoard);
      
      // Check if refill created new matches (for combo tracking)
      const { matchCount: newMatches } = checkAndCrushMatches(refilledBoard);
      
      if (newMatches > 0) {
        // Cascade continues - increment combo chain
        comboChainRef.current += 1;
      } else {
        // No more matches - show combo alert if chain > 1
        if (comboChainRef.current > 1) {
          const comboMultiplier = comboChainRef.current;
          showAlert(`${comboMultiplier}x Combo!`, "success");
          
          // Update combo counter in game state
          setGameState(prev => ({
            ...prev,
            board: refilledBoard,
            combos: prev.combos + 1,
            isProcessing: false,
          }));
        } else {
          setGameState(prev => ({ ...prev, board: refilledBoard, isProcessing: false }));
        }
        
        // Reset combo chain for next user move
        comboChainRef.current = 0;
        processingRef.current = false;
        return;
      }
      
      // Continue processing (cascade continues)
      setGameState(prev => ({ ...prev, board: refilledBoard, isProcessing: false }));
      processingRef.current = false;
    };

    processCascade();
  }, [gameState.isProcessing, gameState.board, slideTraits, generateNewTraits, checkAndCrushMatches, showAlert]);

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

        <div className="grid grid-cols-2 gap-3 md:flex md:flex-col">
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
        <div
          className="grid gap-1 sm:gap-2"
          style={{
            gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))`,
            touchAction: "none",
          }}
        >
          {gameState.board.map((row) =>
            row.map((tile) => (
              <motion.button
                key={tile.id}
                type="button"
                onClick={() => {
                  if (skipClickRef.current) {
                    skipClickRef.current = false;
                    return;
                  }
                  handleTileSwap(tile);
                }}
                onTouchStart={(event) => {
                  if (event.touches.length !== 1) return;
                  const touch = event.touches[0];
                  swipeStartRef.current = {
                    row: tile.row,
                    col: tile.col,
                    x: touch.clientX,
                    y: touch.clientY,
                  };
                }}
                onTouchEnd={(event) => {
                  const start = swipeStartRef.current;
                  swipeStartRef.current = null;
                  if (!start || event.changedTouches.length !== 1) return;
                  const touch = event.changedTouches[0];
                  const deltaX = touch.clientX - start.x;
                  const deltaY = touch.clientY - start.y;

                  if (Math.abs(deltaX) < SWIPE_THRESHOLD && Math.abs(deltaY) < SWIPE_THRESHOLD) {
                    return;
                  }

                  skipClickRef.current = true;
                  handleSwipe(start.row, start.col, deltaX, deltaY);
                }}
                onTouchMove={(event) => {
                  if (event.touches.length !== 1) return;
                  event.preventDefault();
                }}
                disabled={gameState.isProcessing || gameState.gameOver}
                layout
                initial={tile.isNew ? { scale: 0, opacity: 0 } : false}
                animate={{ 
                  scale: 1, 
                  opacity: tile.trait === "blank" ? 0 : 1,
                }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{
                  layout: {
                    duration: ANIMATION_TIMINGS.COLLAPSE / 1000,
                    ease: [0.4, 0, 0.2, 1],
                  },
                  scale: {
                    duration: tile.isNew ? ANIMATION_TIMINGS.REFILL / 1000 : ANIMATION_TIMINGS.SWAP / 1000,
                    ease: [0.34, 1.56, 0.64, 1],
                  },
                  opacity: {
                    duration: ANIMATION_TIMINGS.CRUSH / 1000,
                  },
                }}
                className={clsx(
                  "relative aspect-square rounded-lg border-2 bg-[#1a1612]/80 border-[#DA9C2F]/20 overflow-hidden trait-tile",
                  tile.trait === "blank" && "opacity-0 pointer-events-none",
                  tile.isCrushing && "trait-crush",
                  tile.isNew && "trait-pop-in",
                  selectedTile?.id === tile.id && "selected ring-4 ring-[#F4C752] border-[#F4C752]",
                  !gameState.isProcessing && !gameState.gameOver && tile.trait !== "blank" && "cursor-pointer",
                  (gameState.isProcessing || gameState.gameOver) && "cursor-not-allowed opacity-70"
                )}
                whileHover={{ 
                  scale: gameState.isProcessing || gameState.gameOver || tile.trait === "blank" ? 1 : 1.08,
                  transition: { duration: 0.15 }
                }}
                whileTap={{ 
                  scale: gameState.isProcessing || gameState.gameOver || tile.trait === "blank" ? 1 : 0.92,
                  transition: { duration: 0.1 }
                }}
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

        {gameState.gameOver && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 bg-[#050302]/90 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.42em] text-[#F4C752]/80">Time&apos;s Up</p>
              <div className="rounded-3xl border border-[#DA9C2F]/40 bg-[#0B0B09]/80 px-8 py-6 shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
                <p className="text-sm uppercase tracking-[0.32em] text-white/60">Final Score</p>
                <p className="mt-3 text-4xl font-bold text-[#F4C752]">{gameState.score}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.28em] text-white/50">Combos: {gameState.combos} • Moves: {gameState.moves}</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleNewGame}
                  className="rounded-full bg-[#DA9C2F] px-6 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-[#050302] transition hover:bg-[#f4c752]"
                >
                  Play Again
                </button>
                <button
                  type="button"
                  onClick={() => setShowStats(true)}
                  className="rounded-full border border-[#DA9C2F]/40 px-6 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-white/80 transition hover:bg-white/10"
                >
                  View Stats
                </button>
              </div>
            </div>
          </div>
        )}
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
