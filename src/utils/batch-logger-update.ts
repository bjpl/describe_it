/**
 * Batch script to update console statements to use centralized logging
 * This file is used to systematically replace console statements across the codebase
 */

// Template for different types of console statements replacements:

export const loggerReplacements = {
  // Error logging patterns
  "console.error": "logger.error",
  "console.warn": "logger.warn",
  "console.info": "logger.info",

  // Development-only logging
  "console.log": "devLog",
  "console.debug": "devLog",

  // Common patterns to look for:
  patterns: [
    // API errors - fixed regex patterns
    /console\.error\(["'`](.*API.*|.*failed.*)["'`]\)/g,

    // Component lifecycle - fixed regex patterns
    /console\.log\(["'`](.*mounted.*|.*loaded.*)["'`]\)/g,

    // User actions - fixed regex patterns
    /console\.log\(["'`](.*clicked.*|.*selected.*)["'`]\)/g,

    // Network errors - fixed regex patterns
    /console\.error\(["'`](.*network.*|.*fetch.*)["'`]\)/g,

    // Validation errors - fixed regex patterns
    /console\.(error|warn)\(["'`](.*validation.*|.*invalid.*)["'`]\)/g,
  ],

  // Import statements to add
  imports: {
    logger: "import { logger } from '@/lib/logger';",
    devLog: "import { devLog, devWarn, devError } from '@/lib/logger';",
    logUserAction: "import { logUserAction } from '@/lib/logger';",
    logApiCall: "import { logApiCall, logApiResponse } from '@/lib/logger';",
  },
};

// Files that have been processed
export const processedFiles = [
  "src/providers/ReactQueryProvider.tsx",
  "src/providers/ErrorBoundary.tsx",
  "src/config/environment.ts",
  "src/config/env.ts",
  "src/app/startup.ts",
  "src/hooks/useImageSearch.ts",
  "src/hooks/useLocalStorage.ts",
];

// Files to be processed next
export const nextFiles = [
  "src/hooks/useDescriptions.ts",
  "src/hooks/usePhraseExtraction.ts",
  "src/hooks/useQuestionAnswer.ts",
  "src/hooks/useSessionLogger.tsx",
  "src/hooks/useQASystem.ts",
  "src/app/page-complex.tsx",
  "src/app/page-original.tsx",
];
