"use client";

import { useEffect, useState } from 'react';
import { DifficultyTier } from '@/lib/wordlink/types';

interface ScoreDisplayProps {
  score: number;
  multiplier: number;
  timeRemaining: number;
  gridsCleared: number;
  difficulty: DifficultyTier;
  totalWords: number;
  foundWords: number;
}

export default function ScoreDisplay({
  score,
  multiplier,
  timeRemaining,
  gridsCleared,
  difficulty,
  totalWords,
  foundWords,
}: ScoreDisplayProps) {
  const [displayScore, setDisplayScore] = useState(score);

  // Animate score changes
  useEffect(() => {
    if (displayScore === score) return;

    const diff = score - displayScore;
    const step = Math.ceil(Math.abs(diff) / 10);
    const timer = setInterval(() => {
      setDisplayScore(prev => {
        if (prev === score) {
          clearInterval(timer);
          return score;
        }
        return prev + (diff > 0 ? step : -step);
      });
    }, 30);

    return () => clearInterval(timer);
  }, [score, displayScore]);

  // Timer color based on remaining time
  const getTimerColor = () => {
    if (timeRemaining > 60) return 'bg-[#46c68e]';
    if (timeRemaining > 30) return 'bg-[#F4C752]';
    return 'bg-[#ff4444]';
  };

  const timerPercentage = (timeRemaining / 90) * 100;

  return (
    <div className="space-y-4">
      {/* Timer Bar */}
      <div className="relative h-3 bg-[#0B0B09] rounded-full overflow-hidden border border-[#DA9C2F]/30">
        <div
          className={`h-full transition-all duration-1000 linear ${getTimerColor()} ${
            timeRemaining < 15 ? 'animate-pulse' : ''
          }`}
          style={{ width: `${timerPercentage}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-white/90">
            {Math.ceil(timeRemaining)}s
          </span>
        </div>
      </div>

      {/* Score and Stats */}
      <div className="flex items-center justify-between gap-4">
        {/* Score */}
        <div className="flex-1">
          <div className="text-xs uppercase tracking-wider text-white/50 mb-1">
            Score
          </div>
          <div className="text-4xl md:text-5xl font-bold text-[#F4C752] tabular-nums">
            {displayScore.toLocaleString()}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="flex gap-3">
          {/* Multiplier */}
          <div className="flex flex-col items-center justify-center bg-[#0B0B09] border-2 border-[#DA9C2F]/40 rounded-xl px-4 py-2 min-w-[70px]">
            <div className="text-xs uppercase tracking-wider text-white/50">
              Combo
            </div>
            <div
              className={`text-2xl font-bold transition-all duration-300 ${
                multiplier > 0 ? 'text-[#F4C752] scale-110' : 'text-white/30'
              }`}
            >
              x{multiplier + 1}
            </div>
            {multiplier >= 3 && (
              <div className="text-lg">🔥</div>
            )}
          </div>

          {/* Grids Cleared */}
          <div className="flex flex-col items-center justify-center bg-[#0B0B09] border-2 border-[#DA9C2F]/40 rounded-xl px-4 py-2 min-w-[70px]">
            <div className="text-xs uppercase tracking-wider text-white/50">
              Grids
            </div>
            <div className="text-2xl font-bold text-[#46c68e]">
              {gridsCleared}
            </div>
          </div>
        </div>
      </div>

      {/* Progress and Difficulty */}
      <div className="flex items-center justify-between text-xs uppercase tracking-wider">
        <div className="text-white/50">
          Words: <span className="text-[#F4C752] font-semibold">{foundWords}/{totalWords}</span>
        </div>
        <div className="text-white/50">
          Difficulty: <span className="text-[#DA9C2F] font-semibold">{difficulty}</span>
        </div>
      </div>
    </div>
  );
}
