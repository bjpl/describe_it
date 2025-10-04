#!/usr/bin/env node

/*
 * Pre-commit Hook: Check for Backup Files
 * Prevents accidental commit of backup files and temporary files
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Backup file patterns to detect
const BACKUP_PATTERNS = [
  /\.bak$/i,
  /\.backup$/i,
  /\.old$/i,
  /\.orig$/i,
  /\.tmp$/i,
  /~$/,
  /\.swp$/i,
  /\.swo$/i,
  /\.DS_Store$/i,
  /Thumbs\.db$/i,
  /\.(copy|Copy|COPY)$/i,
  /\.(copy|Copy|COPY)\.\w+$/i,
  /-backup\./i,
  /-old\./i,
  /\.backup\./i,
];

// Whitelist patterns (files that are allowed despite matching backup patterns)
const WHITELIST_PATTERNS = [
  /node_modules\//,
  /\.git\//,
  /dist\//,
  /\.next\//,
  /coverage\//,
];

/**
 * Check if a file is a backup file
 */
function isBackupFile(filename) {
  // Check whitelist first
  if (WHITELIST_PATTERNS.some(pattern => pattern.test(filename))) {
    return false;
  }

  // Check backup patterns
  return BACKUP_PATTERNS.some(pattern => pattern.test(filename));
}

/**
 * Main execution
 */
async function main() {
  const stagedFiles = process.argv.slice(2);

  if (stagedFiles.length === 0) {
    console.log('No files to check');
    process.exit(0);
  }

  const backupFiles = stagedFiles.filter(isBackupFile);

  if (backupFiles.length > 0) {
    console.error('\n❌ COMMIT REJECTED: Backup files detected\n');
    console.error('The following backup files cannot be committed:\n');
    backupFiles.forEach(file => {
      console.error(`  - ${file}`);
    });
    console.error('\nPlease remove these files or add them to .gitignore\n');
    console.error('To bypass this check (not recommended):');
    console.error('  git commit --no-verify\n');

    process.exit(1);
  }

  console.log(`✓ No backup files detected (checked ${stagedFiles.length} files)`);
  process.exit(0);
}

main().catch(error => {
  console.error('Error checking backup files:', error);
  process.exit(1);
});
