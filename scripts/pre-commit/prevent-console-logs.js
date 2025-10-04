#!/usr/bin/env node

/*
 * Pre-commit Hook: Prevent Console Logs
 * Warns about console.log statements in production code
 * Allows console.error and console.warn
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Patterns to detect
const CONSOLE_LOG_PATTERN = /console\.log\s*\(/g;
const CONSOLE_DEBUG_PATTERN = /console\.debug\s*\(/g;

// Allowed patterns (in comments or specific files)
const ALLOWED_PATTERNS = [
  /\/\*[\s\S]*?console\.log[\s\S]*?\*\//g,  // Block comments
  /\/\/.*console\.log/g,                      // Line comments
];

// Files/directories to skip
const SKIP_PATTERNS = [
  /node_modules\//,
  /\.test\./,
  /\.spec\./,
  /scripts\//,
  /\.config\./,
  /\/tests?\//,
  /\/logger\./,
  /\/monitoring\//,
];

// File extensions to check
const VALID_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

/**
 * Check if file should be validated
 */
function shouldCheckFile(filename) {
  // Skip certain patterns
  if (SKIP_PATTERNS.some(pattern => pattern.test(filename))) {
    return false;
  }

  return VALID_EXTENSIONS.some(ext => filename.endsWith(ext));
}

/**
 * Remove comments from content to avoid false positives
 */
function removeComments(content) {
  // Remove block comments
  let cleaned = content.replace(/\/\*[\s\S]*?\*\//g, '');
  // Remove line comments
  cleaned = cleaned.replace(/\/\/.*/g, '');
  return cleaned;
}

/**
 * Find console.log statements in file content
 */
function findConsoleLogs(content, filename) {
  const cleanedContent = removeComments(content);
  const lines = content.split('\n');
  const violations = [];

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmedLine = line.trim();

    // Skip if line is a comment
    if (trimmedLine.startsWith('//') || trimmedLine.startsWith('/*')) {
      return;
    }

    // Check for console.log
    if (CONSOLE_LOG_PATTERN.test(trimmedLine) || CONSOLE_DEBUG_PATTERN.test(trimmedLine)) {
      // Check if this line appears in cleaned content (not in comments)
      const cleanedLine = removeComments(line);
      if (CONSOLE_LOG_PATTERN.test(cleanedLine) || CONSOLE_DEBUG_PATTERN.test(cleanedLine)) {
        violations.push({
          file: filename,
          line: lineNumber,
          content: trimmedLine,
        });
      }
    }
  });

  return violations;
}

/**
 * Main execution
 */
async function main() {
  const stagedFiles = process.argv.slice(2).filter(shouldCheckFile);

  if (stagedFiles.length === 0) {
    process.exit(0);
  }

  const allViolations = [];

  for (const file of stagedFiles) {
    try {
      const content = readFileSync(file, 'utf-8');
      const violations = findConsoleLogs(content, file);
      allViolations.push(...violations);
    } catch (error) {
      console.error(`Warning: Could not read file ${file}:`, error.message);
    }
  }

  if (allViolations.length > 0) {
    console.warn('\n⚠️  WARNING: Console logs detected\n');
    console.warn('Consider removing console.log statements from production code:\n');

    allViolations.forEach(({ file, line, content }) => {
      console.warn(`  ${file}:${line}`);
      console.warn(`    ${content}\n`);
    });

    console.warn('Recommendations:');
    console.warn('  - Use a proper logger (winston, pino, etc.)');
    console.warn('  - Use console.error for errors');
    console.warn('  - Use console.warn for warnings');
    console.warn('  - Remove debug console.log statements\n');
    console.warn('This is a WARNING only. Commit will proceed.\n');
  }

  // Exit successfully (warning only, don't block commits)
  process.exit(0);
}

main().catch(error => {
  console.error('Error checking console logs:', error);
  process.exit(0); // Don't block on errors
});
