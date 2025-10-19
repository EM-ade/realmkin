"use client";

import { useEffect, useState } from 'react';

interface GridMasteryAnimationProps {
  isPlaying: boolean;
  onComplete: () => void;
}

export default function GridMasteryAnimation({
  isPlaying,
  onComplete,
}: GridMasteryAnimationProps) {
  const [showText, setShowText] = useState(false);
  const [showBonus, setShowBonus] = useState(false);

  useEffect(() => {
    if (!isPlaying) {
      setShowText(false);
      setShowBonus(false);
      return;
    }

    // Animation sequence
    const textTimer = setTimeout(() => setShowText(true), 300);
    const bonusTimer = setTimeout(() => setShowBonus(true), 800);
    const completeTimer = setTimeout(() => {
      onComplete();
      setShowText(false);
      setShowBonus(false);
    }, 2500);

    return () => {
      clearTimeout(textTimer);
      clearTimeout(bonusTimer);
      clearTimeout(completeTimer);
    };
  }, [isPlaying, onComplete]);

  if (!isPlaying) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      {/* Particle explosion effect */}
      <div className="absolute inset-0 bg-gradient-radial from-[#F4C752]/30 via-transparent to-transparent animate-ping" />
      
      {/* Main text */}
      {showText && (
        <div className="text-center animate-scale-in">
          <div className="text-5xl md:text-7xl font-bold uppercase tracking-wider text-[#F4C752] mb-4 drop-shadow-[0_0_30px_rgba(244,199,82,0.8)] animate-pulse">
            Round Cleared!
          </div>
          
          {showBonus && (
            <div className="text-3xl md:text-4xl font-bold text-[#46c68e] animate-float">
              +100 Points
            </div>
          )}
        </div>
      )}

      {/* Sparkle effects */}
      {isPlaying && (
        <>
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-[#F4C752] rounded-full animate-sparkle"
              style={{
                left: `${50 + Math.cos((i * Math.PI * 2) / 12) * 40}%`,
                top: `${50 + Math.sin((i * Math.PI * 2) / 12) * 40}%`,
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </>
      )}
    </div>
  );
}
