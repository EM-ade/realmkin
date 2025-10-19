"use client";

import { useCallback, useEffect, useState, useRef } from 'react';
import { GameState, FoundWord } from '@/lib/wordlink/types';
import { loadWordDictionary, validateWordFromPath, getWordFromPath } from '@/lib/wordlink/wordValidator';
import { generateLetters, updateLetterSelection, resetLetterSelection } from '@/lib/wordlink/letterGenerator';
import { calculateWordScore, updateSessionStats } from '@/lib/wordlink/scoreCalculator';
import { isValidPath } from '@/lib/wordlink/pathValidator';
import { getDifficultyTier } from '@/lib/wordlink/constants';
import { INITIAL_TIME, POINTS } from '@/lib/wordlink/constants';

import CircleLetterGrid from './components/CircleLetterGrid';
import ScoreDisplay from './components/ScoreDisplay';
import FoundWordsList from './components/FoundWordsList';
import GameOverModal from './components/GameOverModal';
import GridMasteryAnimation from './components/GridMasteryAnimation';
import WordBoxes from './components/WordBoxes';

export default function GameWordLinkClient() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentWord, setCurrentWord] = useState('');
  const [showMastery, setShowMastery] = useState(false);
  const [validWords, setValidWords] = useState<Set<string>>(new Set());
  const [expectedWords, setExpectedWords] = useState<string[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize game
  const initializeGame = useCallback(async () => {
    setIsLoading(true);
    
    // Load dictionary
    await loadWordDictionary();
    
    // Generate initial letters
    const difficulty = getDifficultyTier(0);
    const letterResult = await generateLetters(difficulty);
    
    setGameState({
      letters: letterResult.letters,
      currentPath: [],
      foundWords: [],
      score: 0,
      multiplier: 0,
      timeRemaining: INITIAL_TIME,
      gameStatus: 'idle',
      roundsCleared: 0,
      currentDifficulty: difficulty,
      totalWordsAvailable: letterResult.totalWords,
      lastWordTime: 0,
      sessionStats: {
        totalWords: 0,
        bestWord: null,
        longestStreak: 0,
        highScore: 0,
      },
    });
    
    setValidWords(letterResult.validWords);
    setExpectedWords(Array.from(letterResult.validWords));
    setIsLoading(false);
  }, []);

  // Start game
  const startGame = useCallback(() => {
    if (!gameState) return;
    
    setGameState(prev => prev ? { ...prev, gameStatus: 'playing' } : null);
    
    // Start timer
    timerRef.current = setInterval(() => {
      setGameState(prev => {
        if (!prev || prev.gameStatus !== 'playing') return prev;
        
        const newTime = prev.timeRemaining - 1;
        
        if (newTime <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          return { ...prev, timeRemaining: 0, gameStatus: 'ended' };
        }
        
        return { ...prev, timeRemaining: newTime };
      });
    }, 1000);
  }, [gameState]);

  // Handle path change
  const handlePathChange = useCallback((path: number[]) => {
    if (!gameState || gameState.gameStatus !== 'playing') return;
    
    setGameState(prev => {
      if (!prev) return null;
      return {
        ...prev,
        currentPath: path,
        letters: updateLetterSelection(prev.letters, path),
      };
    });
    
    // Update current word display
    if (path.length > 0 && gameState) {
      const word = getWordFromPath(path, gameState.letters);
      setCurrentWord(word);
    } else {
      setCurrentWord('');
    }
  }, [gameState]);

  // Handle path complete (word submission)
  const handlePathComplete = useCallback(() => {
    if (!gameState || gameState.gameStatus !== 'playing') return;
    
    const { currentPath, letters, foundWords, multiplier, lastWordTime, score } = gameState;
    
    // Validate path
    if (!isValidPath(currentPath) || currentPath.length < 3) {
      // Invalid path - reset multiplier
      setGameState(prev => prev ? {
        ...prev,
        currentPath: [],
        multiplier: 0,
        letters: resetLetterSelection(prev.letters),
      } : null);
      setCurrentWord('');
      return;
    }
    
    // Get word
    const word = getWordFromPath(currentPath, letters);
    
    // Check if already found
    if (foundWords.some(fw => fw.word === word)) {
      // Already found - reset multiplier
      setGameState(prev => prev ? {
        ...prev,
        currentPath: [],
        multiplier: 0,
        letters: resetLetterSelection(prev.letters),
      } : null);
      setCurrentWord('');
      return;
    }
    
    // Validate word - check if it's a valid dictionary word
    if (!validateWordFromPath(currentPath, letters)) {
      // Invalid word - reset multiplier
      setGameState(prev => prev ? {
        ...prev,
        currentPath: [],
        multiplier: 0,
        letters: resetLetterSelection(prev.letters),
      } : null);
      setCurrentWord('');
      return;
    }
    
    // Check if it's an expected word or a bonus word
    const isExpectedWord = validWords.has(word);
    
    // Valid word! Calculate score
    const scoreResult = calculateWordScore(
      word,
      letters,
      currentPath,
      gameState.multiplier,
      gameState.lastWordTime
    );
    
    // Bonus words worth 50% points
    const bonusMultiplier = isExpectedWord ? 1 : 0.5;
    const adjustedScore = Math.floor(scoreResult.points * bonusMultiplier);
    
    const newWord: FoundWord = {
      word,
      points: adjustedScore,
      timestamp: Date.now(),
      bonuses: scoreResult.bonuses,
    };
    
    const newFoundWords = [...gameState.foundWords, newWord];
    const newScore = gameState.score + adjustedScore;
    const newMultiplier = multiplier + 1;
    
    // Update stats
    const newStats = updateSessionStats(
      gameState.sessionStats,
      newWord,
      newMultiplier,
      newScore
    );
    
    // Update game state with new word
    setGameState(prev => prev ? {
      ...prev,
      foundWords: newFoundWords,
      score: newScore,
      multiplier: newMultiplier,
      lastWordTime: Date.now(),
      currentPath: [],
      letters: resetLetterSelection(prev.letters),
      sessionStats: newStats,
    } : null);
    setCurrentWord('');
    
    // Check if all expected words found (not counting bonus words)
    const expectedWordsFound = newFoundWords.filter(fw => 
      validWords.has(fw.word.toUpperCase())
    ).length;
    const allWordsFound = expectedWordsFound >= gameState.totalWordsAvailable;
    
    if (allWordsFound) {
      // Round mastery! Show animation after a brief delay
      setTimeout(() => {
        setShowMastery(true);
      }, 500);
    }
  }, [gameState]);

  // Handle grid mastery completion
  const handleMasteryComplete = useCallback(async () => {
    setGameState(prev => {
      if (!prev) return null;
      
      // Award bonus
      const bonusScore = prev.score + POINTS.GRID_MASTERY_BONUS;
      const newRoundsCleared = prev.roundsCleared + 1;
      const newDifficulty = getDifficultyTier(newRoundsCleared);
      
      // Generate new letters asynchronously
      generateLetters(newDifficulty).then(letterResult => {
        setGameState(current => current ? {
          ...current,
          letters: letterResult.letters,
          currentPath: [],
          foundWords: [],
          score: bonusScore,
          multiplier: 0,
          timeRemaining: current.timeRemaining + POINTS.TIME_BONUS,
          roundsCleared: newRoundsCleared,
          currentDifficulty: newDifficulty,
          totalWordsAvailable: letterResult.totalWords,
          sessionStats: {
            ...current.sessionStats,
            highScore: Math.max(current.sessionStats.highScore, bonusScore),
          },
        } : null);
        setValidWords(letterResult.validWords);
        setExpectedWords(Array.from(letterResult.validWords));
      });
      
      return prev;
    });
    
    setShowMastery(false);
    setCurrentWord('');
  }, []);

  // Play again
  const handlePlayAgain = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    initializeGame();
  }, [initializeGame]);

  // Back to games
  const handleBackToGames = useCallback(() => {
    window.location.href = '/game';
  }, []);

  // Initialize on mount
  useEffect(() => {
    initializeGame();
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [initializeGame]);

  if (isLoading || !gameState) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-2xl font-bold text-[#F4C752] mb-4 animate-pulse">
            Loading WordLink...
          </div>
          <div className="text-sm text-white/50">
            Preparing dictionary and grid
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Score Display */}
      <ScoreDisplay
        score={gameState.score}
        multiplier={gameState.multiplier}
        timeRemaining={gameState.timeRemaining}
        gridsCleared={gameState.roundsCleared}
        difficulty={gameState.currentDifficulty}
        totalWords={gameState.totalWordsAvailable}
        foundWords={gameState.foundWords.length}
      />

      {/* Start Button */}
      {gameState.gameStatus === 'idle' && (
        <div className="text-center">
          <button
            onClick={startGame}
            className="bg-[#F4C752] hover:bg-[#DA9C2F] text-[#050302] font-bold uppercase tracking-wider px-12 py-4 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(244,199,82,0.5)]"
          >
            Start Game
          </button>
        </div>
      )}

      {/* Game Grid */}
      {gameState.gameStatus !== 'idle' && (
        <div className="space-y-8">
          {/* Word Boxes - Show expected words */}
          <div className="bg-[#0B0B09]/60 border-2 border-[#DA9C2F]/30 rounded-2xl p-6">
            <WordBoxes
              expectedWords={expectedWords}
              foundWords={gameState.foundWords}
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left: Grid */}
            <div className="relative">
              <div className="bg-[#0B0B09]/60 border-2 border-[#DA9C2F]/30 rounded-2xl p-6">
                {/* Current Word Display */}
                <div className="text-center mb-4 h-12 flex items-center justify-center">
                  <div className="text-3xl font-bold uppercase tracking-widest text-[#F4C752]">
                    {currentWord || '\u00A0'}
                  </div>
                </div>

                {/* Circular Letter Grid */}
                <div className="relative">
                  <CircleLetterGrid
                    letters={gameState.letters}
                    currentPath={gameState.currentPath}
                    onPathChange={handlePathChange}
                    onPathComplete={handlePathComplete}
                    disabled={gameState.gameStatus !== 'playing'}
                  />
                </div>
              </div>
            </div>

            {/* Right: Found Words List */}
            <div className="bg-[#0B0B09]/60 border-2 border-[#DA9C2F]/30 rounded-2xl p-6">
              <h3 className="text-xl font-bold uppercase tracking-wider text-[#F4C752] mb-4">
                Recent Words
              </h3>
              <FoundWordsList words={gameState.foundWords} />
            </div>
          </div>
        </div>
      )}

      {/* Grid Mastery Animation */}
      <GridMasteryAnimation
        isPlaying={showMastery}
        onComplete={handleMasteryComplete}
      />

      {/* Game Over Modal */}
      <GameOverModal
        isOpen={gameState.gameStatus === 'ended'}
        score={gameState.score}
        sessionStats={gameState.sessionStats}
        gridsCleared={gameState.roundsCleared}
        onPlayAgain={handlePlayAgain}
        onBackToGames={handleBackToGames}
      />
    </div>
  );
}
