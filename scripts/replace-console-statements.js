#!/usr/bin/env node

/**
 * Console Statement Replacement Script
 * Systematically replaces all console.log/warn/error with Winston logger calls
 */

const fs = require('fs');
const path = require('path');

// Configuration
const SRC_DIR = path.join(__dirname, '../src');
const BACKUP_DIR = path.join(__dirname, '../.console-backup');
const REPORT_FILE = path.join(__dirname, '../scripts/replacement-report.json');

// Logger import patterns by file type
const LOGGER_IMPORTS = {
  // API routes and server-side files
  api: `import { logger, apiLogger, authLogger, dbLogger, securityLogger, performanceLogger } from '@/lib/logger';`,
  // Component files
  component: `import { logger } from '@/lib/logger';`,
  // Utility and lib files
  lib: `import { logger } from '@/lib/logger';`,
  // Auth-specific files
  auth: `import { authLogger, securityLogger } from '@/lib/logger';`,
  // Database files
  database: `import { dbLogger } from '@/lib/logger';`,
};

// Replacement patterns with priority
const REPLACEMENT_PATTERNS = [
  // High Priority - Security & Authentication
  {
    priority: 'high',
    category: 'security',
    pattern: /console\.(error|warn)\(['"`].*(?:security|unauthorized|forbidden|auth|token|credential|password).*['"`]/gi,
    replacement: (match, method) => {
      const message = extractMessage(match);
      return `securityLogger.${method === 'error' ? 'error' : 'warn'}(${message})`;
    }
  },

  // High Priority - Error Handling
  {
    priority: 'high',
    category: 'error',
    pattern: /console\.error\(['"`](.*?)['"`],?\s*(.*?)\)/g,
    replacement: (match, message, context) => {
      if (context && context.trim()) {
        return `logger.error('${message}', ${context})`;
      }
      return `logger.error('${message}')`;
    }
  },

  // Medium Priority - API Operations
  {
    priority: 'medium',
    category: 'api',
    pattern: /console\.(log|info)\(['"`].*(?:API|Request|Response|HTTP|endpoint).*['"`]/gi,
    replacement: (match) => {
      const message = extractMessage(match);
      return `apiLogger.info(${message})`;
    }
  },

  // Medium Priority - Database Operations
  {
    priority: 'medium',
    category: 'database',
    pattern: /console\.(log|debug)\(['"`].*(?:database|query|DB|supabase).*['"`]/gi,
    replacement: (match) => {
      const message = extractMessage(match);
      return `dbLogger.debug(${message})`;
    }
  },

  // Medium Priority - Performance
  {
    priority: 'medium',
    category: 'performance',
    pattern: /console\.(log|warn)\(['"`].*(?:performance|slow|latency|duration|ms).*['"`]/gi,
    replacement: (match) => {
      const message = extractMessage(match);
      return `performanceLogger.info(${message})`;
    }
  },

  // Low Priority - General logging
  {
    priority: 'low',
    category: 'general',
    pattern: /console\.log\((.*?)\)/g,
    replacement: (match, content) => {
      return `logger.debug(${content})`;
    }
  },

  {
    priority: 'low',
    category: 'general',
    pattern: /console\.warn\((.*?)\)/g,
    replacement: (match, content) => {
      return `logger.warn(${content})`;
    }
  },

  {
    priority: 'low',
    category: 'general',
    pattern: /console\.info\((.*?)\)/g,
    replacement: (match, content) => {
      return `logger.info(${content})`;
    }
  },
];

// Statistics
const stats = {
  filesProcessed: 0,
  filesModified: 0,
  replacementsByCategory: {},
  replacementsByFile: {},
  errors: [],
  skipped: [],
};

/**
 * Extract message from console statement
 */
function extractMessage(consoleStatement) {
  const match = consoleStatement.match(/console\.\w+\((.*?)\)/);
  return match ? match[1] : '""';
}

/**
 * Determine appropriate logger import for file
 */
function determineLoggerImport(filePath, content) {
  if (filePath.includes('/api/')) return LOGGER_IMPORTS.api;
  if (filePath.includes('/auth/')) return LOGGER_IMPORTS.auth;
  if (filePath.includes('/database/')) return LOGGER_IMPORTS.database;
  if (filePath.includes('/components/')) return LOGGER_IMPORTS.component;
  return LOGGER_IMPORTS.lib;
}

/**
 * Check if file already has logger import
 */
function hasLoggerImport(content) {
  return /import\s+.*logger.*from\s+['"]@\/lib\/logger['"]/i.test(content);
}

/**
 * Add logger import to file
 */
function addLoggerImport(content, filePath) {
  const importStatement = determineLoggerImport(filePath, content);

  // Find the last import statement
  const importMatches = content.match(/^import\s+.*from\s+['"].*['"];?$/gm);

  if (importMatches && importMatches.length > 0) {
    const lastImport = importMatches[importMatches.length - 1];
    const lastImportIndex = content.lastIndexOf(lastImport);
    const insertPosition = lastImportIndex + lastImport.length;

    return content.slice(0, insertPosition) + '\n' + importStatement + content.slice(insertPosition);
  } else {
    // No imports found, add at the beginning (after any 'use client' or comments)
    const useClientMatch = content.match(/^['"]use client['"];?\s*\n/);
    if (useClientMatch) {
      return content.replace(/^(['"]use client['"];?\s*\n)/, `$1${importStatement}\n\n`);
    }
    return importStatement + '\n\n' + content;
  }
}

/**
 * Process a single file
 */
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let modifiedContent = content;
    let replacementCount = 0;
    const replacements = [];

    // Check if file has console statements
    if (!/console\.(log|warn|error|info|debug)/.test(content)) {
      return { modified: false };
    }

    stats.filesProcessed++;

    // Create backup
    const relativePath = path.relative(SRC_DIR, filePath);
    const backupPath = path.join(BACKUP_DIR, relativePath);
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.writeFileSync(backupPath, content);

    // Apply replacement patterns in priority order
    const sortedPatterns = [...REPLACEMENT_PATTERNS].sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    for (const pattern of sortedPatterns) {
      const matches = modifiedContent.match(pattern.pattern);
      if (matches) {
        matches.forEach(match => {
          const replacement = pattern.replacement(match, ...match.match(pattern.pattern).slice(1));
          modifiedContent = modifiedContent.replace(match, replacement);

          replacementCount++;
          replacements.push({
            category: pattern.category,
            priority: pattern.priority,
            original: match,
            replacement: replacement,
          });

          // Update stats
          stats.replacementsByCategory[pattern.category] =
            (stats.replacementsByCategory[pattern.category] || 0) + 1;
        });
      }
    }

    // Add logger import if needed
    if (replacementCount > 0 && !hasLoggerImport(modifiedContent)) {
      modifiedContent = addLoggerImport(modifiedContent, filePath);
    }

    // Write modified file
    if (modifiedContent !== content) {
      fs.writeFileSync(filePath, modifiedContent);
      stats.filesModified++;
      stats.replacementsByFile[relativePath] = {
        count: replacementCount,
        replacements: replacements,
      };

      return { modified: true, count: replacementCount };
    }

    return { modified: false };

  } catch (error) {
    stats.errors.push({
      file: filePath,
      error: error.message,
    });
    return { modified: false, error: error.message };
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
      // Skip node_modules, .next, etc.
      if (!['node_modules', '.next', 'dist', 'build'].includes(entry.name)) {
        processDirectory(fullPath);
      }
    } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      // Skip test files and node_modules
      if (!fullPath.includes('node_modules') && !fullPath.includes('.test.')) {
        processFile(fullPath);
      }
    }
  }
}

/**
 * Generate report
 */
function generateReport() {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      filesProcessed: stats.filesProcessed,
      filesModified: stats.filesModified,
      totalReplacements: Object.values(stats.replacementsByCategory).reduce((a, b) => a + b, 0),
      replacementsByCategory: stats.replacementsByCategory,
    },
    details: stats.replacementsByFile,
    errors: stats.errors,
    skipped: stats.skipped,
  };

  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));

  console.log('\n=== Console Replacement Report ===');
  console.log(`Files Processed: ${stats.filesProcessed}`);
  console.log(`Files Modified: ${stats.filesModified}`);
  console.log(`Total Replacements: ${report.summary.totalReplacements}`);
  console.log('\nReplacements by Category:');
  Object.entries(stats.replacementsByCategory).forEach(([category, count]) => {
    console.log(`  ${category}: ${count}`);
  });

  if (stats.errors.length > 0) {
    console.log(`\nErrors: ${stats.errors.length}`);
    stats.errors.forEach(err => {
      console.log(`  ${err.file}: ${err.error}`);
    });
  }

  console.log(`\nDetailed report saved to: ${REPORT_FILE}`);
  console.log(`Backups saved to: ${BACKUP_DIR}`);
}

// Main execution
function main() {
  console.log('Starting console statement replacement...\n');

  // Create backup directory
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  // Process source directory
  processDirectory(SRC_DIR);

  // Generate report
  generateReport();

  console.log('\nReplacement complete!');
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { processFile, processDirectory, generateReport };
