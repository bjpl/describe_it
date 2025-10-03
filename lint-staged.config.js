/*
 * Lint-Staged Configuration
 * Runs quality checks on staged files before commit
 */

export default {
  // TypeScript and JavaScript files
  '**/*.{ts,tsx,js,jsx}': [
    // Format with Prettier
    'prettier --write',

    // Run ESLint with auto-fix (includes no-console check)
    'eslint --fix --max-warnings=0',

    // Type check (only for TypeScript)
    () => 'tsc --noEmit',

    // Custom checks
    'node scripts/pre-commit/validate-todo-format.js',
    // Note: prevent-console-logs.js is now handled by ESLint no-console rule
  ],

  // JSON files
  '**/*.json': [
    'prettier --write',
  ],

  // CSS and styling files
  '**/*.{css,scss,sass}': [
    'prettier --write',
  ],

  // Markdown files
  '**/*.md': [
    'prettier --write',
  ],

  // Check for backup files globally
  '*': [
    'node scripts/pre-commit/check-backup-files.js',
  ],
};
