"use client";

import { FoundWord } from '@/lib/wordlink/types';

interface WordBoxesProps {
  expectedWords: string[];
  foundWords: FoundWord[];
}

export default function WordBoxes({ expectedWords, foundWords }: WordBoxesProps) {
  // Group expected words by length
  const wordsByLength: Record<number, string[]> = {};
  expectedWords.forEach(word => {
    const len = word.length;
    if (!wordsByLength[len]) {
      wordsByLength[len] = [];
    }
    wordsByLength[len].push(word.toUpperCase());
  });

  // Sort lengths
  const sortedLengths = Object.keys(wordsByLength).map(Number).sort((a, b) => a - b);

  // Track which expected words have been found
  const foundWordSet = new Set(foundWords.map(fw => fw.word.toUpperCase()));
  const foundWordsMap = new Map(foundWords.map(fw => [fw.word.toUpperCase(), fw]));

  // Find bonus words (found but not expected)
  const bonusWords = foundWords.filter(fw => !expectedWords.map(w => w.toUpperCase()).includes(fw.word.toUpperCase()));

  return (
    <div className="space-y-6">
      <div className="text-xs uppercase tracking-wider text-white/50 text-center">
        Find {expectedWords.length} {expectedWords.length === 1 ? 'Word' : 'Words'}
      </div>

      {/* Expected Words Grouped by Length */}
      {sortedLengths.map(length => (
        <div key={length} className="space-y-2">
          <div className="text-xs uppercase tracking-wider text-[#DA9C2F]/70 text-center">
            {length}-Letter {wordsByLength[length].length === 1 ? 'Word' : 'Words'}
          </div>
          
          <div className="flex flex-wrap gap-2 justify-center">
            {wordsByLength[length].map((word, idx) => {
              const isFound = foundWordSet.has(word);
              const foundWord = foundWordsMap.get(word);

              return (
                <div
                  key={`${word}-${idx}`}
                  className={`
                    relative h-12 rounded-lg border-2 
                    flex items-center justify-center px-3
                    transition-all duration-300
                    ${
                      isFound
                        ? 'bg-[#46c68e]/20 border-[#46c68e] scale-105 shadow-[0_0_15px_rgba(70,198,142,0.3)]'
                        : 'bg-[#0B0B09]/60 border-[#DA9C2F]/30 border-dashed'
                    }
                  `}
                  style={{ minWidth: `${length * 20 + 40}px` }}
                >
                  {isFound ? (
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-bold uppercase text-[#46c68e]">
                        {word}
                      </span>
                      <span className="text-xs text-[#46c68e]/70">
                        +{foundWord?.points || 0}
                      </span>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      {[...Array(length)].map((_, i) => (
                        <div
                          key={i}
                          className="w-2 h-2 rounded-full bg-[#DA9C2F]/20"
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Bonus Words Section */}
      {bonusWords.length > 0 && (
        <div className="space-y-2 pt-4 border-t border-[#DA9C2F]/20">
          <div className="text-xs uppercase tracking-wider text-[#F4C752]/70 text-center">
            ⭐ Bonus Words
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {bonusWords.map((word, idx) => (
              <div
                key={`bonus-${idx}`}
                className="relative h-10 rounded-lg border-2 bg-[#F4C752]/10 border-[#F4C752]/50 
                  flex items-center justify-center px-3 animate-pulse"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold uppercase text-[#F4C752]">
                    {word.word}
                  </span>
                  <span className="text-xs text-[#F4C752]/70">
                    +{word.points}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress */}
      <div className="text-xs text-white/40 text-center">
        {foundWords.filter(fw => expectedWords.map(w => w.toUpperCase()).includes(fw.word.toUpperCase())).length} / {expectedWords.length} found
        {bonusWords.length > 0 && ` • ${bonusWords.length} bonus`}
      </div>
    </div>
  );
}
