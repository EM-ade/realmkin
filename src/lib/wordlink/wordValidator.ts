import { Letter } from './types';

// Common names to exclude from valid words
const EXCLUDED_NAMES = new Set([
  'jane', 'john', 'jack', 'jill', 'jake', 'june', 'judy', 'jean',
  'nick', 'nate', 'nina', 'noel', 'nell', 'noah',
  'mary', 'mike', 'matt', 'maya', 'mona',
  'paul', 'pete', 'phil',
  'rick', 'ruth', 'ryan', 'rosa',
  'sara', 'sean', 'seth', 'stan',
  'tony', 'tina', 'todd', 'troy',
  'wade',
  'alex', 'alan', 'anna', 'adam', 'andy', 'anne', 'amos',
  'beth', 'bill', 'brad', 'beau',
  'carl', 'chad', 'cody', 'cole', 'cora',
  'dale', 'dana', 'dave', 'dean', 'drew', 'dick',
  'earl', 'eric', 'evan', 'ezra',
  'fred', 'fran',
  'gary', 'gene', 'glen', 'greg',
  'hank', 'hans',
  'ivan',
  'joey', 'joel', 'jose', 'josh', 'juan',
  'karl', 'kate', 'kent', 'kirk', 'kurt', 'kyle',
  'lars', 'leon', 'levi', 'lisa', 'lois', 'luke', 'lynn',
  'omar',
  'reed', 'rene', 'rory', 'ross',
  'sage', 'saul', 'skip',
  'tara', 'theo', 'trey',
  'vera',
  'walt', 'wes',
  'zach', 'zane',
]);

// Word dictionary - will be loaded on first use
let wordDictionary: Set<string> | null = null;
let isLoading = false;
let loadPromise: Promise<Set<string>> | null = null;

/**
 * Load and filter the word dictionary (3-4 letter words only)
 */
export async function loadWordDictionary(): Promise<Set<string>> {
  // Return cached dictionary if already loaded
  if (wordDictionary) {
    return wordDictionary;
  }
  
  // Return existing promise if already loading
  if (isLoading && loadPromise) {
    return loadPromise;
  }
  
  isLoading = true;
  
  loadPromise = (async () => {
    try {
      // Fetch different word lists based on length
      const [shortResponse, mediumResponse] = await Promise.all([
        fetch('/words-short.txt'),
        fetch('/words-medium.txt'),
      ]);
      
      const [shortText, mediumText] = await Promise.all([
        shortResponse.text(),
        mediumResponse.text(),
      ]);
      
      // Process 3-letter words (limited to top 100 for variety)
      const threeLetterWords = shortText
        .split('\n')
        .slice(0, 200) // Take from top 200 to get ~100 3-letter words
        .map(word => word.trim().toLowerCase())
        .filter(word => word.length === 3)
        .filter(word => /^[a-z]+$/.test(word))
        .filter(word => !EXCLUDED_NAMES.has(word));
      
      // Process 4-letter words (from medium list)
      const fourLetterWords = mediumText
        .split('\n')
        .map(word => word.trim().toLowerCase())
        .filter(word => word.length === 4)
        .filter(word => /^[a-z]+$/.test(word))
        .filter(word => !EXCLUDED_NAMES.has(word));
      
      // Combine all words
      const allWords = [...threeLetterWords, ...fourLetterWords];
      wordDictionary = new Set(allWords);
      isLoading = false;
      
      console.log(`Loaded ${wordDictionary.size} words (${threeLetterWords.length} 3-letter, ${fourLetterWords.length} 4-letter)`);
      
      return wordDictionary;
    } catch (error) {
      console.error('Failed to load word dictionary:', error);
      isLoading = false;
      // Return a minimal fallback dictionary
      wordDictionary = new Set(['cat', 'dog', 'run', 'jump', 'play', 'test']);
      return wordDictionary;
    }
  })();
  
  return loadPromise;
}

/**
 * Check if a word is valid
 */
export function isValidWord(word: string): boolean {
  if (!wordDictionary) {
    console.warn('Dictionary not loaded yet');
    return false;
  }
  
  return wordDictionary.has(word.toLowerCase());
}

/**
 * Get the word dictionary
 */
export function getWordDictionary(): Set<string> {
  return wordDictionary || new Set();
}

/**
 * Get the word from a path of letter indices
 */
export function getWordFromPath(path: number[], letters: Letter[]): string {
  return path.map(index => letters[index].char).join('').toUpperCase();
}
/**
 * Validate a word from a path
 */
export function validateWordFromPath(path: number[], letters: Letter[]): boolean {
  if (path.length < 3 || path.length > 4) {
    return false;
  }
  
  const word = getWordFromPath(path, letters);
  return isValidWord(word);
}

/**
 * Get dictionary size (for debugging)
 */
export function getDictionarySize(): number {
  return wordDictionary?.size ?? 0;
}

/**
 * Check if dictionary is loaded
 */
export function isDictionaryLoaded(): boolean {
  return wordDictionary !== null;
}
