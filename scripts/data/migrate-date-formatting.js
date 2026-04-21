#!/usr/bin/env node

/**
 * Date Format Migration Script
 * 
 * This script helps identify files that need date formatting updates
 * Run from project root: node scripts/migrate-date-formatting.js
 */

const fs = require('fs');
const path = require('path');

const OLD_PATTERNS = [
  /toLocaleDateString\('en-GB'\)/g,
  /toLocaleString\('en-GB',\s*\{[^}]*\}\)/g,
  /new Date\([^)]+\)\.toLocaleDateString\('en-US',\s*\{[^}]*\}\)/g,
];

const SEARCH_DIRS = [
  'app',
  'components',
  'lib/api'
];

const EXCLUDE_DIRS = [
  'node_modules',
  '.next',
  '.git'
];

let totalFiles = 0;
let filesWithOldFormat = [];

function shouldExclude(filePath) {
  return EXCLUDE_DIRS.some(dir => filePath.includes(dir));
}

function scanFile(filePath) {
  if (shouldExclude(filePath)) return;
  
  const content = fs.readFileSync(filePath, 'utf-8');
  let hasOldFormat = false;
  let matches = [];

  OLD_PATTERNS.forEach((pattern, index) => {
    const found = content.match(pattern);
    if (found) {
      hasOldFormat = true;
      matches.push({
        pattern: pattern.source,
        count: found.length,
        lines: getLineNumbers(content, pattern)
      });
    }
  });

  if (hasOldFormat) {
    filesWithOldFormat.push({
      file: filePath,
      matches: matches
    });
  }

  totalFiles++;
}

function getLineNumbers(content, pattern) {
  const lines = content.split('\n');
  const lineNumbers = [];
  
  lines.forEach((line, index) => {
    if (pattern.test(line)) {
      lineNumbers.push(index + 1);
    }
  });
  
  return lineNumbers;
}

function scanDirectory(dirPath) {
  if (shouldExclude(dirPath)) return;

  const items = fs.readdirSync(dirPath);

  items.forEach(item => {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      scanDirectory(fullPath);
    } else if (stat.isFile() && (item.endsWith('.jsx') || item.endsWith('.js'))) {
      scanFile(fullPath);
    }
  });
}

// Main execution
console.log('🔍 Scanning for old date formatting patterns...\n');

SEARCH_DIRS.forEach(dir => {
  const fullPath = path.join(process.cwd(), dir);
  if (fs.existsSync(fullPath)) {
    console.log(`Scanning: ${dir}/`);
    scanDirectory(fullPath);
  }
});

console.log(`\n📊 Scan Results:`);
console.log(`Total files scanned: ${totalFiles}`);
console.log(`Files needing update: ${filesWithOldFormat.length}\n`);

if (filesWithOldFormat.length > 0) {
  console.log('📝 Files to update:\n');
  
  filesWithOldFormat.forEach(({ file, matches }) => {
    console.log(`\n📄 ${file}`);
    matches.forEach(({ pattern, count, lines }) => {
      console.log(`   Pattern: ${pattern}`);
      console.log(`   Occurrences: ${count}`);
      console.log(`   Lines: ${lines.join(', ')}`);
    });
  });

  console.log('\n\n💡 Recommended Actions:\n');
  console.log('1. Import the date formatter:');
  console.log("   import { formatDate, formatDateTime } from '@/utils/dateFormatter'\n");
  
  console.log('2. Replace old patterns:');
  console.log('   new Date(value).toLocaleDateString("en-GB")');
  console.log('   →  formatDate(value)\n');
  
  console.log('3. See DATE_FORMATTING_GUIDE.md for detailed examples\n');
  
  // Generate summary file
  const summaryPath = path.join(process.cwd(), 'DATE_MIGRATION_REPORT.txt');
  const summary = `Date Format Migration Report
Generated: ${new Date().toISOString()}

Total Files Scanned: ${totalFiles}
Files Needing Update: ${filesWithOldFormat.length}

Files to Update:
${filesWithOldFormat.map(({ file, matches }) => {
  return `\n${file}\n${matches.map(m => `  - ${m.pattern} (${m.count} times) at lines: ${m.lines.join(', ')}`).join('\n')}`;
}).join('\n')}

Next Steps:
1. Review each file listed above
2. Import: import { formatDate, formatDateTime } from '@/utils/dateFormatter'
3. Replace: formatDate(dateValue) instead of new Date(dateValue).toLocaleDateString('en-GB')
4. Test the changes
5. Rebuild Docker container
`;

  fs.writeFileSync(summaryPath, summary);
  console.log(`📄 Full report saved to: DATE_MIGRATION_REPORT.txt\n`);
  
} else {
  console.log('✅ All files are using the new date formatting!\n');
}

console.log('✨ Scan complete!\n');
