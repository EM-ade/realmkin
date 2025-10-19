import { Letter, Position, GridResult, DifficultyTier } from './types';
import { 
  VOWELS, 
  CONSONANTS, 
  RARE_LETTERS, 
  GRID_SIZE, 
  DIFFICULTY_CONFIGS 
} from './constants';
import { isValidWord } from './wordValidator';
import { getAdjacentPositions, isPositionInPath } from './pathValidator';
import { isRareLetter } from './scoreCalculator';

/**
 * Generate a random letter based on difficulty configuration
 */
function generateLetter(
  vowelPercentage: number,
  rareLettersUsed: number,
  maxRareLetters: number
): string {
  // Decide if we should use a rare letter
  const shouldUseRare = rareLettersUsed < maxRareLetters && Math.random() < 0.1;
  
  if (shouldUseRare) {
    return RARE_LETTERS[Math.floor(Math.random() * RARE_LETTERS.length)];
  }
  
  // Decide vowel or consonant
  const isVowel = Math.random() < vowelPercentage;
  
  if (isVowel) {
    return VOWELS[Math.floor(Math.random() * VOWELS.length)];
  } else {
    // Weight consonants by frequency (first ones are more common)
    const weightedIndex = Math.floor(Math.pow(Math.random(), 1.5) * CONSONANTS.length);
    return CONSONANTS[weightedIndex];
  }
}

/**
 * Create a random grid based on difficulty
 */
function createRandomGrid(difficulty: DifficultyTier): Letter[][] {
  const config = DIFFICULTY_CONFIGS[difficulty];
  const grid: Letter[][] = [];
  let rareLettersUsed = 0;
  
  for (let row = 0; row < GRID_SIZE; row++) {
    grid[row] = [];
    for (let col = 0; col < GRID_SIZE; col++) {
      const char = generateLetter(
        config.vowelPercentage,
        rareLettersUsed,
        config.rareLetterCount
      );
      
      if (isRareLetter(char)) {
        rareLettersUsed++;
      }
      
      grid[row][col] = {
        char,
        position: { row, col },
        isSelected: false,
        isValidated: false,
        isRare: isRareLetter(char),
      };
    }
  }
  
  return grid;
}

/**
 * Find all possible words in a grid using DFS
 */
function findAllPossibleWords(grid: Letter[][]): Set<string> {
  const words = new Set<string>();
  
  // DFS from each cell
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      dfs(
        { row, col },
        [],
        new Set<string>(),
        grid,
        words
      );
    }
  }
  
  return words;
}

/**
 * Depth-first search to find words
 */
function dfs(
  pos: Position,
  path: Position[],
  visited: Set<string>,
  grid: Letter[][],
  words: Set<string>
): void {
  // Add current position to path
  const newPath = [...path, pos];
  const posKey = `${pos.row},${pos.col}`;
  const newVisited = new Set(visited);
  newVisited.add(posKey);
  
  // Build current word
  const word = newPath
    .map(p => grid[p.row][p.col].char)
    .join('')
    .toUpperCase();
  
  // Check if it's a valid word (3-4 letters)
  if (word.length >= 3 && word.length <= 4) {
    if (isValidWord(word)) {
      words.add(word);
    }
  }
  
  // Stop if we've reached max length
  if (word.length >= 4) {
    return;
  }
  
  // Explore adjacent positions
  const adjacent = getAdjacentPositions(pos, GRID_SIZE);
  for (const nextPos of adjacent) {
    const nextKey = `${nextPos.row},${nextPos.col}`;
    if (!newVisited.has(nextKey)) {
      dfs(nextPos, newPath, newVisited, grid, words);
    }
  }
}

/**
 * Generate a grid with minimum word count requirement
 */
export async function generateGrid(difficulty: DifficultyTier): Promise<GridResult> {
  const config = DIFFICULTY_CONFIGS[difficulty];
  let grid: Letter[][];
  let validWords: Set<string>;
  let attempts = 0;
  const maxAttempts = 50;
  
  do {
    grid = createRandomGrid(difficulty);
    validWords = findAllPossibleWords(grid);
    attempts++;
    
    // If we've tried too many times, lower the threshold slightly
    if (attempts >= maxAttempts) {
      console.warn(`Could not generate grid with ${config.minWords} words after ${maxAttempts} attempts`);
      break;
    }
  } while (validWords.size < config.minWords);
  
  console.log(`Generated grid with ${validWords.size} valid words (difficulty: ${difficulty}, attempts: ${attempts})`);
  
  return {
    grid,
    totalWords: validWords.size,
    validWords,
  };
}

/**
 * Reset grid selection states
 */
export function resetGridSelection(grid: Letter[][]): Letter[][] {
  return grid.map(row =>
    row.map(letter => ({
      ...letter,
      isSelected: false,
      isValidated: false,
    }))
  );
}

/**
 * Update grid with selection state
 */
export function updateGridSelection(
  grid: Letter[][],
  path: Position[],
  isValidated: boolean = false
): Letter[][] {
  return grid.map((row, rowIndex) =>
    row.map((letter, colIndex) => {
      const isInPath = path.some(p => p.row === rowIndex && p.col === colIndex);
      return {
        ...letter,
        isSelected: isInPath,
        isValidated: isValidated && isInPath,
      };
    })
  );
}
