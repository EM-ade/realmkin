import { Letter, DifficultyTier, LetterSetResult } from './types';
import { VOWELS, CONSONANTS, RARE_LETTERS, DIFFICULTY_CONFIGS, MIN_LETTERS, MAX_LETTERS } from './constants';
import { isValidWord, loadWordDictionary, getWordDictionary } from './wordValidator';
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
 * Create a random set of letters based on difficulty
 */
function createRandomLetters(difficulty: DifficultyTier, count: number): Letter[] {
  const config = DIFFICULTY_CONFIGS[difficulty];
  const letters: Letter[] = [];
  let rareLettersUsed = 0;
  
  for (let i = 0; i < count; i++) {
    const char = generateLetter(
      config.vowelPercentage,
      rareLettersUsed,
      config.rareLetterCount
    );
    
    if (isRareLetter(char)) {
      rareLettersUsed++;
    }
    
    letters.push({
      char,
      index: i,
      isSelected: false,
      isValidated: false,
      isRare: isRareLetter(char),
    });
  }
  
  return letters;
}

/**
 * Find all possible words from a set of letters
 * Prioritizes 4-letter words heavily
 */
function findAllPossibleWords(letters: Letter[]): Set<string> {
  const fourLetterWords = new Set<string>();
  const threeLetterWords = new Set<string>();
  const chars = letters.map(l => l.char);
  
  // Generate all permutations of 3-4 letters
  function generatePermutations(current: string, remaining: string[]) {
    // Check if current word is valid (3-4 letters)
    if (current.length >= 3 && current.length <= 4) {
      if (isValidWord(current)) {
        if (current.length === 4) {
          fourLetterWords.add(current.toUpperCase());
        } else {
          threeLetterWords.add(current.toUpperCase());
        }
      }
    }
    
    // Stop if we've reached max length
    if (current.length >= 4) {
      return;
    }
    
    // Try adding each remaining letter
    for (let i = 0; i < remaining.length; i++) {
      const newCurrent = current + remaining[i];
      const newRemaining = remaining.filter((_, idx) => idx !== i);
      generatePermutations(newCurrent, newRemaining);
    }
  }
  
  generatePermutations('', chars);
  
  // Combine 4-letter and 3-letter words
  // 3-letter words are already limited at the dictionary level (only top 50)
  const allWords = new Set([...fourLetterWords, ...threeLetterWords]);
  
  return allWords;
}

/**
 * Pick random words from dictionary
 */
async function pickRandomWords(count: number): Promise<string[]> {
  await loadWordDictionary();
  const allWords = Array.from(getWordDictionary());
  
  // Separate by length
  const threeLetterWords = allWords.filter(w => w.length === 3);
  const fourLetterWords = allWords.filter(w => w.length === 4);
  
  const selectedWords: string[] = [];
  
  // Pick mostly 4-letter words, rarely 3-letter
  const threeLetterCount = Math.random() < 0.3 ? 1 : 0; // 30% chance of 1 three-letter word
  const fourLetterCount = count - threeLetterCount;
  
  // Pick 3-letter words
  for (let i = 0; i < threeLetterCount && threeLetterWords.length > 0; i++) {
    const randomIndex = Math.floor(Math.random() * threeLetterWords.length);
    selectedWords.push(threeLetterWords[randomIndex]);
    threeLetterWords.splice(randomIndex, 1);
  }
  
  // Pick 4-letter words
  for (let i = 0; i < fourLetterCount && fourLetterWords.length > 0; i++) {
    const randomIndex = Math.floor(Math.random() * fourLetterWords.length);
    selectedWords.push(fourLetterWords[randomIndex]);
    fourLetterWords.splice(randomIndex, 1);
  }
  
  return selectedWords;
}

/**
 * Generate letters that can form the target words
 */
function generateLettersFromWords(words: string[]): Letter[] {
  // Collect all unique letters from the words
  const letterSet = new Set<string>();
  words.forEach(word => {
    word.split('').forEach(char => letterSet.add(char.toUpperCase()));
  });
  
  const letterArray = Array.from(letterSet);
  
  // We need exactly 5 letters
  let selectedLetters: string[];
  
  if (letterArray.length === 5) {
    selectedLetters = letterArray;
  } else if (letterArray.length > 5) {
    // Too many unique letters - pick 5 that cover the most words
    selectedLetters = letterArray.slice(0, 5);
  } else {
    // Too few letters - add random vowels/consonants
    selectedLetters = [...letterArray];
    const commonLetters = ['E', 'A', 'R', 'T', 'O', 'I', 'N', 'S'];
    while (selectedLetters.length < 5) {
      const randomLetter = commonLetters[Math.floor(Math.random() * commonLetters.length)];
      if (!selectedLetters.includes(randomLetter)) {
        selectedLetters.push(randomLetter);
      }
    }
  }
  
  // Create Letter objects
  return selectedLetters.map((char, index) => ({
    char,
    index,
    isSelected: false,
    isValidated: false,
    isRare: isRareLetter(char),
  }));
}

/**
 * Generate a set of letters with minimum word count requirement
 * NEW APPROACH: Pick words first, then generate letters to match
 */
export async function generateLetters(difficulty: DifficultyTier): Promise<LetterSetResult> {
  const config = DIFFICULTY_CONFIGS[difficulty];
  
  // Pick random target words
  const targetWords = await pickRandomWords(config.minWords);
  
  // Generate letters that can form these words
  const letters = generateLettersFromWords(targetWords);
  
  // Find all possible words (including bonus words)
  const allPossibleWords = findAllPossibleWords(letters);
  
  console.log(`Generated ${letters.length} letters for target words: ${targetWords.join(', ')}`);
  console.log(`Total possible words: ${allPossibleWords.size}`);
  
  return {
    letters,
    totalWords: targetWords.length,
    validWords: new Set(targetWords.map(w => w.toUpperCase())),
  };
}

/**
 * Reset letter selection states
 */
export function resetLetterSelection(letters: Letter[]): Letter[] {
  return letters.map(letter => ({
    ...letter,
    isSelected: false,
    isValidated: false,
  }));
}

/**
 * Update letters with selection state
 */
export function updateLetterSelection(
  letters: Letter[],
  path: number[],
  isValidated: boolean = false
): Letter[] {
  return letters.map((letter, index) => {
    const isInPath = path.includes(index);
    return {
      ...letter,
      isSelected: isInPath,
      isValidated: isValidated && isInPath,
    };
  });
}
