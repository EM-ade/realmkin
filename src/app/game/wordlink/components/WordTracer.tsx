"use client";

import { Position } from '@/lib/wordlink/types';

interface WordTracerProps {
  path: Position[];
  gridSize?: number;
  cellSize?: number;
  gap?: number;
}

export default function WordTracer({
  path,
  gridSize = 4,
  cellSize = 80,
  gap = 12,
}: WordTracerProps) {
  if (path.length < 2) return null;

  // Calculate center points for each position
  const getCenterPoint = (pos: Position) => {
    const x = pos.col * (cellSize + gap) + cellSize / 2;
    const y = pos.row * (cellSize + gap) + cellSize / 2;
    return { x, y };
  };

  // Build SVG path
  const points = path.map(getCenterPoint);
  const pathData = points.reduce((acc, point, index) => {
    if (index === 0) {
      return `M ${point.x} ${point.y}`;
    }
    return `${acc} L ${point.x} ${point.y}`;
  }, '');

  const svgWidth = gridSize * cellSize + (gridSize - 1) * gap;
  const svgHeight = gridSize * cellSize + (gridSize - 1) * gap;

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={svgWidth}
      height={svgHeight}
      style={{ zIndex: 5 }}
    >
      <defs>
        <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F4C752" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#DA9C2F" stopOpacity="0.8" />
        </linearGradient>
      </defs>
      
      {/* Path line */}
      <path
        d={pathData}
        stroke="url(#pathGradient)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        className="animate-pulse"
      />
      
      {/* Dots at each point */}
      {points.map((point, index) => (
        <circle
          key={index}
          cx={point.x}
          cy={point.y}
          r="6"
          fill="#F4C752"
          className="animate-pulse"
        />
      ))}
    </svg>
  );
}
