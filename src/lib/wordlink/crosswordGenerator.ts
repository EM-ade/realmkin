export interface CrosswordCell {
  letter: string;
  wordIndices: number[]; // Which words use this cell
  row: number;
  col: number;
}

export interface CrosswordWord {
  word: string;
  startRow: number;
  startCol: number;
  direction: 'horizontal' | 'vertical';
  index: number;
}

export interface CrosswordGrid {
  words: CrosswordWord[];
  cells: CrosswordCell[][];
  width: number;
  height: number;
}

/**
 * Find all positions where two words can intersect
 */
function findIntersections(word1: string, word2: string): Array<{ pos1: number; pos2: number }> {
  const intersections: Array<{ pos1: number; pos2: number }> = [];
  
  for (let i = 0; i < word1.length; i++) {
    for (let j = 0; j < word2.length; j++) {
      if (word1[i].toUpperCase() === word2[j].toUpperCase()) {
        intersections.push({ pos1: i, pos2: j });
      }
    }
  }
  
  return intersections;
}

/**
 * Check if a word placement is valid (doesn't conflict with existing words)
 * Enhanced with quality checks to prevent stacking and ensure clean intersections
 */
function isValidPlacement(
  grid: (string | null)[][],
  word: string,
  row: number,
  col: number,
  direction: 'horizontal' | 'vertical',
  placedWords: CrosswordWord[]
): boolean {
  const len = word.length;
  let intersectionCount = 0;
  let matchingLetters = 0;
  
  for (let i = 0; i < len; i++) {
    const r = direction === 'horizontal' ? row : row + i;
    const c = direction === 'horizontal' ? col + i : col;
    
    // Check bounds
    if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length) {
      return false;
    }
    
    const cell = grid[r][c];
    
    // If cell is occupied
    if (cell !== null) {
      // Must match the letter
      if (cell !== word[i].toUpperCase()) {
        return false;
      }
      
      matchingLetters++;
      intersectionCount++;
      
      // Check if this creates a parallel word (bad!)
      // Look at adjacent cells perpendicular to our direction
      if (direction === 'horizontal') {
        // Check above and below
        if ((r > 0 && grid[r - 1][c] !== null) || 
            (r < grid.length - 1 && grid[r + 1][c] !== null)) {
          // This would create parallel words - reject
          if (matchingLetters > 1) return false;
        }
      } else {
        // Check left and right
        if ((c > 0 && grid[r][c - 1] !== null) || 
            (c < grid[0].length - 1 && grid[r][c + 1] !== null)) {
          // This would create parallel words - reject
          if (matchingLetters > 1) return false;
        }
      }
    } else {
      // Empty cell - check for adjacent letters that would create invalid words
      if (direction === 'horizontal') {
        // Check above and below for adjacent letters
        if ((r > 0 && grid[r - 1][c] !== null) || 
            (r < grid.length - 1 && grid[r + 1][c] !== null)) {
          return false; // Would create unintended word
        }
      } else {
        // Check left and right for adjacent letters
        if ((c > 0 && grid[r][c - 1] !== null) || 
            (c < grid[0].length - 1 && grid[r][c + 1] !== null)) {
          return false; // Would create unintended word
        }
      }
    }
  }
  
  // Reject if more than 2 intersections (too complex)
  if (intersectionCount > 2) {
    return false;
  }
  
  // Reject if sharing more than 40% of letters (likely stacking)
  if (matchingLetters > Math.ceil(len * 0.4)) {
    return false;
  }
  
  // Check minimum separation from other words
  for (const placedWord of placedWords) {
    // Skip if same direction and too close
    if (placedWord.direction === direction) {
      const distance = direction === 'horizontal' 
        ? Math.abs(placedWord.startRow - row)
        : Math.abs(placedWord.startCol - col);
      
      // Require at least 2 cells separation for parallel words
      if (distance < 2 && intersectionCount === 0) {
        return false;
      }
    }
  }
  
  return true;
}

/**
 * Place a word on the grid
 */
function placeWord(
  grid: (string | null)[][],
  word: string,
  row: number,
  col: number,
  direction: 'horizontal' | 'vertical'
): void {
  const len = word.length;
  
  for (let i = 0; i < len; i++) {
    const r = direction === 'horizontal' ? row : row + i;
    const c = direction === 'horizontal' ? col + i : col;
    grid[r][c] = word[i].toUpperCase();
  }
}

/**
 * Generate a crossword layout from a list of words
 */
export function generateCrossword(words: string[]): CrosswordGrid {
  if (words.length === 0) {
    return { words: [], cells: [], width: 0, height: 0 };
  }
  
  // Create a large grid to work with
  const gridSize = 20;
  const grid: (string | null)[][] = Array(gridSize)
    .fill(null)
    .map(() => Array(gridSize).fill(null));
  
  const placedWords: CrosswordWord[] = [];
  const center = Math.floor(gridSize / 2);
  
  // Place first word horizontally in the center
  const firstWord = words[0].toUpperCase();
  const firstStartCol = center - Math.floor(firstWord.length / 2);
  placeWord(grid, firstWord, center, firstStartCol, 'horizontal');
  placedWords.push({
    word: firstWord,
    startRow: center,
    startCol: firstStartCol,
    direction: 'horizontal',
    index: 0,
  });
  
  // Try to place remaining words
  for (let wordIdx = 1; wordIdx < words.length; wordIdx++) {
    const currentWord = words[wordIdx].toUpperCase();
    let placed = false;
    
    // Try to intersect with each already placed word (only perpendicular)
    for (const placedWord of placedWords) {
      if (placed) break;
      
      const intersections = findIntersections(placedWord.word, currentWord);
      
      // Only try first 2 intersections to avoid over-complexity
      const limitedIntersections = intersections.slice(0, 2);
      
      for (const { pos1, pos2 } of limitedIntersections) {
        if (placed) break;
        
        // Calculate position for intersection (perpendicular only)
        const newDirection = placedWord.direction === 'horizontal' ? 'vertical' : 'horizontal';
        
        let newRow: number, newCol: number;
        
        if (placedWord.direction === 'horizontal') {
          // Place vertically
          newRow = placedWord.startRow - pos2;
          newCol = placedWord.startCol + pos1;
        } else {
          // Place horizontally
          newRow = placedWord.startRow + pos1;
          newCol = placedWord.startCol - pos2;
        }
        
        // Check if placement is valid with enhanced checks
        if (isValidPlacement(grid, currentWord, newRow, newCol, newDirection, placedWords)) {
          placeWord(grid, currentWord, newRow, newCol, newDirection);
          placedWords.push({
            word: currentWord,
            startRow: newRow,
            startCol: newCol,
            direction: newDirection,
            index: wordIdx,
          });
          placed = true;
          break;
        }
      }
    }
    
    // If couldn't place with intersection, place separately with good spacing
    if (!placed) {
      // Try multiple positions with increasing spacing
      const spacingOptions = [3, 4, 5];
      
      for (const spacing of spacingOptions) {
        if (placed) break;
        
        // Try placing below/beside the last word with proper spacing
        const lastWord = placedWords[placedWords.length - 1];
        const newDirection = wordIdx % 2 === 0 ? 'horizontal' : 'vertical';
        
        // Calculate position with spacing
        let newRow: number, newCol: number;
        
        if (lastWord.direction === 'horizontal') {
          newRow = lastWord.startRow + spacing;
          newCol = lastWord.startCol;
        } else {
          newRow = lastWord.startRow;
          newCol = lastWord.startCol + spacing;
        }
        
        if (isValidPlacement(grid, currentWord, newRow, newCol, newDirection, placedWords)) {
          placeWord(grid, currentWord, newRow, newCol, newDirection);
          placedWords.push({
            word: currentWord,
            startRow: newRow,
            startCol: newCol,
            direction: newDirection,
            index: wordIdx,
          });
          placed = true;
          break;
        }
      }
    }
  }
  
  // Find the actual bounds of the crossword
  let minRow = gridSize, maxRow = 0, minCol = gridSize, maxCol = 0;
  
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (grid[r][c] !== null) {
        minRow = Math.min(minRow, r);
        maxRow = Math.max(maxRow, r);
        minCol = Math.min(minCol, c);
        maxCol = Math.max(maxCol, c);
      }
    }
  }
  
  // Create the final compact grid
  const width = maxCol - minCol + 1;
  const height = maxRow - minRow + 1;
  const cells: CrosswordCell[][] = Array(height)
    .fill(null)
    .map(() => Array(width).fill(null));
  
  // Adjust word positions and populate cells
  const adjustedWords = placedWords.map(word => ({
    ...word,
    startRow: word.startRow - minRow,
    startCol: word.startCol - minCol,
  }));
  
  // Fill cells with letters and track which words use each cell
  for (const word of adjustedWords) {
    for (let i = 0; i < word.word.length; i++) {
      const row = word.direction === 'horizontal' ? word.startRow : word.startRow + i;
      const col = word.direction === 'horizontal' ? word.startCol + i : word.startCol;
      
      if (!cells[row][col]) {
        cells[row][col] = {
          letter: word.word[i],
          wordIndices: [word.index],
          row,
          col,
        };
      } else {
        cells[row][col].wordIndices.push(word.index);
      }
    }
  }
  
  return {
    words: adjustedWords,
    cells,
    width,
    height,
  };
}
