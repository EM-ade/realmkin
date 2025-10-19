"use client";

import { FoundWord } from '@/lib/wordlink/types';
import { useEffect, useRef } from 'react';

interface FoundWordsListProps {
  words: FoundWord[];
}

export default function FoundWordsList({ words }: FoundWordsListProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new word added
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [words.length]);

  if (words.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-white/30 text-sm">
        Start tracing letters to find words!
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      className="space-y-2 max-h-[300px] overflow-y-auto pr-2 wordlink-scrollbar"
    >
      {words.map((word, index) => {
        const isRecent = index === words.length - 1;
        
        return (
          <div
            key={`${word.word}-${word.timestamp}`}
            className={`
              flex items-center justify-between gap-3 p-3 rounded-lg
              border transition-all duration-300
              ${
                isRecent
                  ? 'bg-[#F4C752]/10 border-[#F4C752]/50 animate-pulse'
                  : 'bg-[#0B0B09]/50 border-[#DA9C2F]/20'
              }
            `}
          >
            {/* Word */}
            <div className="flex items-center gap-2">
              <span
                className={`
                  text-lg font-bold uppercase
                  ${word.word.length === 4 ? 'text-[#46c68e]' : 'text-[#F4C752]'}
                `}
              >
                {word.word}
              </span>
              
              {/* Bonus indicators */}
              <div className="flex gap-1">
                {word.bonuses.speed && (
                  <span className="text-xs" title="Speed Bonus">⚡</span>
                )}
                {word.bonuses.rareLetters > 0 && (
                  <span className="text-xs" title="Rare Letter Bonus">💎</span>
                )}
                {word.bonuses.combo > 0 && (
                  <span className="text-xs" title="Combo Bonus">🔥</span>
                )}
              </div>
            </div>

            {/* Points */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[#DA9C2F]">
                +{word.points}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
