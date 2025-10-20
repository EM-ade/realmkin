"use client";

import { useMemo } from 'react';
import { FoundWord } from '@/lib/wordlink/types';
import { generateCrossword, CrosswordGrid as CrosswordGridType } from '@/lib/wordlink/crosswordGenerator';

interface CrosswordGridProps {
  words: string[]; // Expected words
  foundWords: FoundWord[];
}

export default function CrosswordGrid({ words, foundWords }: CrosswordGridProps) {
  // Generate crossword layout
  const crossword = useMemo(() => {
    return generateCrossword(words);
  }, [words]);

  // Track which words have been found
  const foundWordSet = useMemo(() => {
    return new Set(foundWords.map(fw => fw.word.toUpperCase()));
  }, [foundWords]);

  // Check if a word is found
  const isWordFound = (wordIndex: number): boolean => {
    const word = crossword.words[wordIndex];
    return word ? foundWordSet.has(word.word) : false;
  };

  // Check if a cell should be revealed
  const isCellRevealed = (row: number, col: number): boolean => {
    const cell = crossword.cells[row]?.[col];
    if (!cell) return false;
    
    // Cell is revealed if ANY of its words are found
    return cell.wordIndices.some(wordIdx => isWordFound(wordIdx));
  };

  if (crossword.words.length === 0) {
    return (
      <div className="text-center text-white/50">
        Loading crossword...
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-xs uppercase tracking-wider text-white/50 text-center">
        Find {words.length} {words.length === 1 ? 'Word' : 'Words'}
      </div>

      {/* Crossword Grid */}
      <div 
        className="inline-grid gap-1"
        style={{
          gridTemplateColumns: `repeat(${crossword.width}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${crossword.height}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: crossword.height }).map((_, row) =>
          Array.from({ length: crossword.width }).map((_, col) => {
            const cell = crossword.cells[row][col];
            
            if (!cell) {
              // Empty cell
              return (
                <div
                  key={`${row}-${col}`}
                  className="w-8 h-8 md:w-10 md:h-10"
                />
              );
            }

            const revealed = isCellRevealed(row, col);

            return (
              <div
                key={`${row}-${col}`}
                className={`
                  w-8 h-8 md:w-10 md:h-10
                  flex items-center justify-center
                  text-sm md:text-base font-bold uppercase
                  rounded transition-all duration-300
                  ${
                    revealed
                      ? 'bg-[#46c68e] text-white border-2 border-[#46c68e] scale-105 shadow-[0_0_15px_rgba(70,198,142,0.5)]'
                      : 'bg-[#0B0B09]/60 text-transparent border-2 border-[#DA9C2F]/30 border-dashed'
                  }
                `}
              >
                {revealed ? cell.letter : '□'}
              </div>
            );
          })
        )}
      </div>

      {/* Word Count */}
      <div className="text-xs text-white/40">
        {foundWords.length} / {words.length} found
      </div>
    </div>
  );
}
