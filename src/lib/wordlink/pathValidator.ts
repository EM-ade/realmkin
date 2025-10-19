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
