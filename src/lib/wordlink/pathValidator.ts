import { Position } from './types';

/**
 * Check if a path is valid (no duplicates, correct length)
 */
export function isValidPath(path: number[]): boolean {
  // Check minimum length
  if (path.length < 3 || path.length > 4) {
    return false;
  }
  
  // Check no duplicate indices
  const unique = new Set(path);
  return unique.size === path.length;
}

/**
 * Check if an index is in a path
 */
export function isIndexInPath(index: number, path: number[]): boolean {
  return path.includes(index);
}

/**
 * Check if two positions are equal
 */
export function positionsEqual(pos1: Position, pos2: Position): boolean {
  return pos1.row === pos2.row && pos1.col === pos2.col;
}

/**
 * Check if two grid positions are adjacent (horizontally, vertically, or diagonally)
 */
export function isAdjacent(pos1: Position, pos2: Position): boolean {
  const rowDiff = Math.abs(pos1.row - pos2.row);
  const colDiff = Math.abs(pos1.col - pos2.col);
  
  // Adjacent if within 1 cell in any direction (including diagonal)
  return rowDiff <= 1 && colDiff <= 1 && (rowDiff + colDiff > 0);
}

/**
 * Get all adjacent positions for a given position in a grid
 */
export function getAdjacentPositions(pos: Position, gridSize: number): Position[] {
  const adjacent: Position[] = [];
  
  for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
    for (let colOffset = -1; colOffset <= 1; colOffset++) {
      // Skip the current position itself
      if (rowOffset === 0 && colOffset === 0) continue;
      
      const newRow = pos.row + rowOffset;
      const newCol = pos.col + colOffset;
      
      // Check if within grid bounds
      if (newRow >= 0 && newRow < gridSize && newCol >= 0 && newCol < gridSize) {
        adjacent.push({ row: newRow, col: newCol });
      }
    }
  }
  
  return adjacent;
}

/**
 * Check if a position is in a path
 */
export function isPositionInPath(pos: Position, path: Position[]): boolean {
  return path.some(p => positionsEqual(p, pos));
}
