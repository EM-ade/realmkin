/**
 * Script to replace console.log with devLog.log
 * This will automatically update all console statements to use the dev logger
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');

// Files/folders to skip
const SKIP_PATTERNS = [
  'node_modules',
  '.next',
  'build',
  'dist',
  '.git',
  'devLogger.ts', // Don't modify the logger itself
];

// Patterns to replace
const REPLACEMENTS = [
  {
    find: /console\.log\(/g,
    replace: 'devLog.log(',
    description: 'console.log → devLog.log',
  },
  {
    find: /console\.info\(/g,
    replace: 'devLog.info(',
    description: 'console.info → devLog.info',
  },
  {
    find: /console\.debug\(/g,
    replace: 'devLog.debug(',
    description: 'console.debug → devLog.debug',
  },
  // Keep console.error and console.warn as-is (they should always show)
];

let totalFiles = 0;
let modifiedFiles = 0;
let totalReplacements = 0;

/**
 * Check if path should be skipped
 */
function shouldSkip(filePath) {
  return SKIP_PATTERNS.some(pattern => filePath.includes(pattern));
}

/**
 * Check if file needs devLog import
 */
function needsDevLogImport(content) {
  return (
    (content.includes('devLog.log(') ||
     content.includes('devLog.info(') ||
     content.includes('devLog.debug(')) &&
    !content.includes("from '@/utils/devLogger'") &&
    !content.includes('from "../utils/devLogger"') &&
    !content.includes('from "../../utils/devLogger"')
  );
}

/**
 * Add devLog import to file
 */
function addDevLogImport(content, filePath) {
  // Determine relative path to devLogger
  const fileDir = path.dirname(filePath);
  const relativePath = path.relative(fileDir, path.join(SRC_DIR, 'utils', 'devLogger.ts'))
    .replace(/\\/g, '/') // Convert Windows paths to Unix
    .replace(/\.ts$/, ''); // Remove extension

  const importStatement = `import devLog from '${relativePath.startsWith('.') ? relativePath : './' + relativePath}';\n`;

  // Find the last import statement
  const lines = content.split('\n');
  let lastImportIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ') || lines[i].trim().startsWith('import{')) {
      lastImportIndex = i;
    }
  }

  if (lastImportIndex >= 0) {
    // Insert after last import
    lines.splice(lastImportIndex + 1, 0, importStatement);
  } else {
    // No imports found, add at top (after any comments/directives)
    let insertIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*') || 
          trimmed.startsWith('"use') || trimmed.startsWith("'use") || trimmed === '') {
        insertIndex = i + 1;
      } else {
        break;
      }
    }
    lines.splice(insertIndex, 0, importStatement);
  }

  return lines.join('\n');
}

/**
 * Process a single file
 */
function processFile(filePath) {
  if (shouldSkip(filePath)) return;

  const ext = path.extname(filePath);
  if (!['.ts', '.tsx', '.js', '.jsx'].includes(ext)) return;

  totalFiles++;

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    let replacements = 0;

    // Apply replacements
    for (const { find, replace, description } of REPLACEMENTS) {
      const matches = (content.match(find) || []).length;
      if (matches > 0) {
        content = content.replace(find, replace);
        modified = true;
        replacements += matches;
        totalReplacements += matches;
      }
    }

    // Add import if needed
    if (modified && needsDevLogImport(content)) {
      content = addDevLogImport(content, filePath);
    }

    // Write back if modified
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      modifiedFiles++;
      console.log(`✓ ${path.relative(SRC_DIR, filePath)} (${replacements} replacements)`);
    }
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message);
  }
}

/**
 * Recursively process directory
 */
function processDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      processDirectory(fullPath);
    } else if (entry.isFile()) {
      processFile(fullPath);
    }
  }
}

/**
 * Main execution
 */
console.log('🔍 Scanning for console.log statements...\n');

processDirectory(SRC_DIR);

console.log('\n' + '='.repeat(50));
console.log('📊 Summary:');
console.log('='.repeat(50));
console.log(`Total files scanned: ${totalFiles}`);
console.log(`Files modified: ${modifiedFiles}`);
console.log(`Total replacements: ${totalReplacements}`);
console.log('='.repeat(50));

if (modifiedFiles > 0) {
  console.log('\n✅ Console logs have been replaced with devLog!');
  console.log('💡 Logs will now only appear in development mode.');
  console.log('\n⚠️  Note: Review the changes before committing!');
} else {
  console.log('\n✅ No console.log statements found (already clean!)');
}
