#!/usr/bin/env node

/*
 * Pre-commit Hook: Validate TODO Comment Format
 * Ensures all TODO comments reference GitHub issues
 *
 * Valid formats:
 *   // TODO(#123): Description
 *   // TODO(#456): Multi-line description
 *
 * Invalid formats:
 *   // TODO: Fix this later
 *   // TODO - needs work
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Regex patterns
const TODO_PATTERN = /\/\/\s*TODO(?!\(#\d+\))|\/\*\s*TODO(?!\(#\d+\))/gi;
const VALID_TODO_PATTERN = /\/\/\s*TODO\(#\d+\):|\/\*\s*TODO\(#\d+\):/gi;

// File extensions to check
const VALID_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

/**
 * Check if file should be validated
 */
function shouldCheckFile(filename) {
  return VALID_EXTENSIONS.some(ext => filename.endsWith(ext));
}

/**
 * Find invalid TODO comments in file content
 */
function findInvalidTodos(content, filename) {
  const lines = content.split('\n');
  const violations = [];

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmedLine = line.trim();

    // Skip if it's a valid TODO
    if (trimmedLine.match(VALID_TODO_PATTERN)) {
      return;
    }

    // Check for invalid TODO
    if (trimmedLine.match(TODO_PATTERN)) {
      violations.push({
        file: filename,
        line: lineNumber,
        content: trimmedLine,
      });
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
      const violations = findInvalidTodos(content, file);
      allViolations.push(...violations);
    } catch (error) {
      console.error(`Warning: Could not read file ${file}:`, error.message);
    }
  }

  if (allViolations.length > 0) {
    console.error('\n❌ COMMIT REJECTED: Invalid TODO comments found\n');
    console.error('All TODO comments must reference a GitHub issue.\n');
    console.error('Violations found:\n');

    allViolations.forEach(({ file, line, content }) => {
      console.error(`  ${file}:${line}`);
      console.error(`    ${content}\n`);
    });

    console.error('Valid TODO format:');
    console.error('  // TODO(#123): Description of the task\n');
    console.error('To create a GitHub issue:');
    console.error('  gh issue create --title "Your TODO description"\n');
    console.error('To bypass this check (not recommended):');
    console.error('  git commit --no-verify\n');

    process.exit(1);
  }

  console.log(`✓ All TODO comments properly formatted (checked ${stagedFiles.length} files)`);
  process.exit(0);
}

main().catch(error => {
  console.error('Error validating TODO format:', error);
  process.exit(1);
});
