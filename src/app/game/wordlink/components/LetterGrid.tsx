"use client";

import { useCallback, useRef, useState } from 'react';
import { Letter, Position } from '@/lib/wordlink/types';
import { isAdjacent, positionsEqual } from '@/lib/wordlink/pathValidator';

interface LetterGridProps {
  grid: Letter[][];
  currentPath: Position[];
  onPathChange: (path: Position[]) => void;
  onPathComplete: () => void;
  disabled?: boolean;
}

export default function LetterGrid({
  grid,
  currentPath,
  onPathChange,
  onPathComplete,
  disabled = false,
}: LetterGridProps) {
  const [isDragging, setIsDragging] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const handleStart = useCallback(
    (row: number, col: number) => {
      if (disabled) return;
      setIsDragging(true);
      onPathChange([{ row, col }]);
    },
    [disabled, onPathChange]
  );

  const handleMove = useCallback(
    (row: number, col: number) => {
      if (!isDragging || disabled) return;

      const newPos = { row, col };
      const lastPos = currentPath[currentPath.length - 1];

      // Check if already in path
      const alreadyInPath = currentPath.some(p => positionsEqual(p, newPos));
      
      if (alreadyInPath) {
        // Allow backtracking - remove positions after this one
        const index = currentPath.findIndex(p => positionsEqual(p, newPos));
        onPathChange(currentPath.slice(0, index + 1));
        return;
      }

      // Check if adjacent to last position
      if (lastPos && isAdjacent(lastPos, newPos)) {
        onPathChange([...currentPath, newPos]);
      }
    },
    [isDragging, disabled, currentPath, onPathChange]
  );

  const handleEnd = useCallback(() => {
    if (!isDragging || disabled) return;
    setIsDragging(false);
    onPathComplete();
  }, [isDragging, disabled, onPathComplete]);

  // Mouse events
  const handleMouseDown = (row: number, col: number) => {
    handleStart(row, col);
  };

  const handleMouseEnter = (row: number, col: number) => {
    handleMove(row, col);
  };

  const handleMouseUp = () => {
    handleEnd();
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent, row: number, col: number) => {
    e.preventDefault();
    handleStart(row, col);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!gridRef.current) return;

    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    
    if (element && element.hasAttribute('data-row')) {
      const row = parseInt(element.getAttribute('data-row') || '0');
      const col = parseInt(element.getAttribute('data-col') || '0');
      handleMove(row, col);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    handleEnd();
  };

  return (
    <div
      ref={gridRef}
      className="relative select-none"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onTouchMove={handleTouchMove}
    >
      <div className="grid grid-cols-4 gap-2 md:gap-3">
        {grid.map((row, rowIndex) =>
          row.map((letter, colIndex) => {
            const isSelected = currentPath.some(
              p => p.row === rowIndex && p.col === colIndex
            );
            const isValidated = letter.isValidated;
            const isRare = letter.isRare;

            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                data-row={rowIndex}
                data-col={colIndex}
                className={`
                  relative flex items-center justify-center
                  aspect-square rounded-xl
                  text-2xl md:text-3xl font-bold uppercase
                  transition-all duration-200 ease-out
                  cursor-pointer select-none
                  ${
                    isSelected
                      ? 'scale-110 bg-[#F4C752] text-[#050302] shadow-[0_0_30px_rgba(244,199,82,0.6)] z-10'
                      : isValidated
                      ? 'bg-[#46c68e] text-white shadow-[0_0_20px_rgba(70,198,142,0.5)]'
                      : 'bg-[#0B0B09] text-[#F4C752] border-2 border-[#DA9C2F]/40 hover:border-[#DA9C2F] hover:scale-105'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                  ${isRare && !isSelected ? 'border-[#DA9C2F] shadow-[0_0_15px_rgba(218,156,47,0.3)]' : ''}
                `}
                onMouseDown={() => handleMouseDown(rowIndex, colIndex)}
                onMouseEnter={() => handleMouseEnter(rowIndex, colIndex)}
                onTouchStart={(e) => handleTouchStart(e, rowIndex, colIndex)}
              >
                {letter.char}
                {isRare && !isSelected && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#DA9C2F] rounded-full animate-pulse" />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
