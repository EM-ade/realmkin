"use client";

import { SessionStats } from '@/lib/wordlink/types';

interface GameOverModalProps {
  isOpen: boolean;
  score: number;
  sessionStats: SessionStats;
  gridsCleared: number;
  onPlayAgain: () => void;
  onBackToGames: () => void;
}

export default function GameOverModal({
  isOpen,
  score,
  sessionStats,
  gridsCleared,
  onPlayAgain,
  onBackToGames,
}: GameOverModalProps) {
  if (!isOpen) return null;

  const isNewHighScore = score > sessionStats.highScore;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-[#0B0B09] border-2 border-[#DA9C2F]/50 rounded-3xl p-8 shadow-[0_0_60px_rgba(218,156,47,0.4)] animate-scale-in">
        {/* Decorative glow */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-40 h-40 bg-[#F4C752]/30 rounded-full blur-3xl" />

        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold uppercase tracking-wider text-[#F4C752] mb-2">
            Game Over
          </h2>
          {isNewHighScore && (
            <div className="text-sm uppercase tracking-widest text-[#46c68e] animate-pulse">
              🎉 New High Score! 🎉
            </div>
          )}
        </div>

        {/* Final Score */}
        <div className="text-center mb-8">
          <div className="text-sm uppercase tracking-wider text-white/50 mb-2">
            Final Score
          </div>
          <div className="text-6xl font-bold text-[#F4C752] tabular-nums">
            {score.toLocaleString()}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-[#050302]/60 border border-[#DA9C2F]/30 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-[#46c68e] mb-1">
              {sessionStats.totalWords}
            </div>
            <div className="text-xs uppercase tracking-wider text-white/50">
              Words Found
            </div>
          </div>

          <div className="bg-[#050302]/60 border border-[#DA9C2F]/30 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-[#F4C752] mb-1">
              {gridsCleared}
            </div>
            <div className="text-xs uppercase tracking-wider text-white/50">
              Grids Cleared
            </div>
          </div>

          <div className="bg-[#050302]/60 border border-[#DA9C2F]/30 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-[#DA9C2F] mb-1">
              {sessionStats.bestWord?.word || 'N/A'}
            </div>
            <div className="text-xs uppercase tracking-wider text-white/50">
              Best Word
            </div>
          </div>

          <div className="bg-[#050302]/60 border border-[#DA9C2F]/30 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-[#ff4444] mb-1">
              x{sessionStats.longestStreak + 1}
            </div>
            <div className="text-xs uppercase tracking-wider text-white/50">
              Best Combo
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onPlayAgain}
            className="w-full bg-[#F4C752] hover:bg-[#DA9C2F] text-[#050302] font-bold uppercase tracking-wider py-4 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(244,199,82,0.5)]"
          >
            Play Again
          </button>
          
          <button
            onClick={onBackToGames}
            className="w-full bg-[#0B0B09] hover:bg-[#1a1a1a] text-[#F4C752] font-semibold uppercase tracking-wider py-3 rounded-xl border-2 border-[#DA9C2F]/40 hover:border-[#DA9C2F] transition-all duration-300"
          >
            Back to Games
          </button>
        </div>
      </div>
    </div>
  );
}
