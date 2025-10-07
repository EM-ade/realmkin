import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");

const reactWordleWordListPath = path.resolve(
  projectRoot,
  "..",
  "react-wordle",
  "src",
  "constants",
  "wordlist.js"
);

const englishWordsPath = path.resolve(
  projectRoot,
  "..",
  "english-words-master",
  "english-words-master",
  "words_alpha.txt"
);

const blacklist = new Set([
  "aaaaa",
  "eeeee",
  "iiiii",
  "ooooo",
  "uuuuu",
  "rarer",
]);

const outputDir = path.resolve(
  projectRoot,
  "src",
  "lib",
  "games",
  "realmkin-wordle",
  "data"
);

function ensureOutputDir() {
  fs.mkdirSync(outputDir, { recursive: true });
}

function parseReactWordleList() {
  const raw = fs.readFileSync(reactWordleWordListPath, "utf8");
  const matches = raw.match(/'([a-zA-Z]{5})'/g) ?? [];
  const words = matches.map((match) => match.replace(/'/g, "").toLowerCase());
  return words;
}

function* readEnglishWords() {
  const raw = fs.readFileSync(englishWordsPath, "utf8");
  const lines = raw.split(/\r?\n/);
  for (const line of lines) {
    if (!line) continue;
    yield line.trim().toLowerCase();
  }
}

function isAcceptableWord(word) {
  return (
    word.length === 5 &&
    /^[a-z]+$/.test(word) &&
    !/([a-z])\1{3,}/.test(word) &&
    !blacklist.has(word)
  );
}

function hasGoodCharacterDiversity(word) {
  return new Set(word.split("")).size >= 4;
}

function hasModerateCharacterDiversity(word) {
  return new Set(word.split("")).size >= 3;
}

function scoreWord(word) {
  const letterDiversity = new Set(word.split(""));
  const vowelCount = word.split("").filter((char) => "aeiou".includes(char)).length;
  return letterDiversity.size * 10 + vowelCount;
}

function buildWordLists() {
  const simpleSource = parseReactWordleList();
  const simpleSet = new Set(simpleSource.filter(isAcceptableWord));

  const englishSet = new Set();
  for (const word of readEnglishWords()) {
    if (!isAcceptableWord(word)) continue;
    englishSet.add(word);
  }

  const extraWords = Array.from(englishSet).filter((word) => !simpleSet.has(word));

  const rankedExtras = extraWords
    .map((word) => ({ word, score: scoreWord(word) }))
    .sort((a, b) => b.score - a.score)
    .map(({ word }) => word);

  const intermediateWords = rankedExtras
    .filter(hasGoodCharacterDiversity)
    .slice(0, 4000);

  const advancedWords = rankedExtras
    .filter((word) => !intermediateWords.includes(word) && hasModerateCharacterDiversity(word))
    .slice(0, 7000);

  const simpleWords = Array.from(simpleSet);

  const validGuesses = Array.from(
    new Set([...simpleWords, ...intermediateWords, ...advancedWords])
  );

  return {
    simpleWords,
    intermediateWords,
    advancedWords,
    validGuesses,
  };
}

function writeOutput(name, data) {
  const filePath = path.resolve(outputDir, `${name}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  return filePath;
}

function main() {
  ensureOutputDir();
  const { simpleWords, intermediateWords, advancedWords, validGuesses } = buildWordLists();

  writeOutput("words-simple", simpleWords);
  writeOutput("words-intermediate", intermediateWords);
  writeOutput("words-advanced", advancedWords);
  writeOutput("words-valid", validGuesses);

  console.log(`Simple words: ${simpleWords.length}`);
  console.log(`Intermediate words: ${intermediateWords.length}`);
  console.log(`Advanced words: ${advancedWords.length}`);
  console.log(`Valid guesses: ${validGuesses.length}`);
  console.log(`Output directory: ${outputDir}`);
}

main();
