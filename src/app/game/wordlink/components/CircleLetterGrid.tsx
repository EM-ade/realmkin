"use client";

import { useCallback, useState } from 'react';
import { Letter } from '@/lib/wordlink/types';

interface CircleLetterGridProps {
  letters: Letter[];
  currentPath: number[];
  onPathChange: (path: number[]) => void;
  onPathComplete: () => void;
  disabled?: boolean;
}

export default function CircleLetterGrid({
  letters,
  currentPath,
  onPathChange,
  onPathComplete,
  disabled = false,
}: CircleLetterGridProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleStart = useCallback(
    (index: number) => {
      if (disabled) return;
      setIsDragging(true);
      onPathChange([index]);
    },
    [disabled, onPathChange]
  );

  const handleMove = useCallback(
    (index: number) => {
      if (!isDragging || disabled) return;

      // Check if already in path
      const alreadyInPath = currentPath.includes(index);
      
      if (alreadyInPath) {
        // Allow backtracking - remove positions after this one
        const pathIndex = currentPath.indexOf(index);
        onPathChange(currentPath.slice(0, pathIndex + 1));
        return;
      }

      // Add to path
      onPathChange([...currentPath, index]);
    },
    [isDragging, disabled, currentPath, onPathChange]
  );

  const handleEnd = useCallback(() => {
    if (!isDragging || disabled) return;
    setIsDragging(false);
    onPathComplete();
  }, [isDragging, disabled, onPathComplete]);

  // Calculate positions in a circle
  const getCirclePosition = (index: number, total: number) => {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2; // Start from top
    const radius = 120; // pixels from center
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    };
  };

  // Mouse events
  const handleMouseDown = (index: number) => {
    handleStart(index);
  };

  const handleMouseEnter = (index: number) => {
    handleMove(index);
  };

  const handleMouseUp = () => {
    handleEnd();
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    e.preventDefault();
    handleStart(index);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    
    if (element && element.hasAttribute('data-index')) {
      const index = parseInt(element.getAttribute('data-index') || '0');
      handleMove(index);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    handleEnd();
  };

  return (
    <div
      className="relative select-none"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onTouchMove={handleTouchMove}
    >
      {/* Circle container */}
      <div className="relative w-[320px] h-[320px] md:w-[400px] md:h-[400px] mx-auto">
        {/* Center circle decoration */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border-2 border-[#DA9C2F]/20 bg-[#0B0B09]/40" />
        
        {/* Letters arranged in circle */}
        {letters.map((letter, index) => {
          const pos = getCirclePosition(index, letters.length);
          const isSelected = currentPath.includes(index);
          const isValidated = letter.isValidated;
          const isRare = letter.isRare;
          const orderInPath = currentPath.indexOf(index);

          return (
            <div
              key={index}
              data-index={index}
              className={`
                absolute top-1/2 left-1/2
                flex items-center justify-center
                w-20 h-20 md:w-24 md:h-24 rounded-full
                text-3xl md:text-4xl font-bold uppercase
                transition-all duration-200 ease-out
                cursor-pointer select-none
                ${
                  isSelected
                    ? 'scale-125 bg-[#F4C752] text-[#050302] shadow-[0_0_30px_rgba(244,199,82,0.8)] z-20'
                    : isValidated
                    ? 'bg-[#46c68e] text-white shadow-[0_0_20px_rgba(70,198,142,0.5)]'
                    : 'bg-[#0B0B09] text-[#F4C752] border-2 border-[#DA9C2F]/40 hover:border-[#DA9C2F] hover:scale-110'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                ${isRare && !isSelected ? 'border-[#DA9C2F] shadow-[0_0_15px_rgba(218,156,47,0.3)]' : ''}
              `}
              style={{
                transform: `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px) ${isSelected ? 'scale(1.25)' : 'scale(1)'}`,
              }}
              onMouseDown={() => handleMouseDown(index)}
              onMouseEnter={() => handleMouseEnter(index)}
              onTouchStart={(e) => handleTouchStart(e, index)}
            >
              {letter.char}
              {isRare && !isSelected && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#DA9C2F] rounded-full animate-pulse" />
              )}
              {isSelected && orderInPath >= 0 && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#050302] text-[#F4C752] rounded-full flex items-center justify-center text-xs font-bold border-2 border-[#F4C752]">
                  {orderInPath + 1}
                </div>
              )}
            </div>
          );
        })}

        {/* Connection lines */}
        {currentPath.length > 1 && (
          <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F4C752" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#DA9C2F" stopOpacity="0.8" />
              </linearGradient>
            </defs>
            {currentPath.slice(0, -1).map((fromIndex, i) => {
              const toIndex = currentPath[i + 1];
              const fromPos = getCirclePosition(fromIndex, letters.length);
              const toPos = getCirclePosition(toIndex, letters.length);
              
              return (
                <line
                  key={`${fromIndex}-${toIndex}`}
                  x1={160 + fromPos.x}
                  y1={160 + fromPos.y}
                  x2={160 + toPos.x}
                  y2={160 + toPos.y}
                  stroke="url(#lineGradient)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  className="animate-pulse"
                />
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
}
