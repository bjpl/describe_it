#!/usr/bin/env node

/**
 * Console to Logger Migration Script
 * Systematically replaces console.log/warn/error/info/debug statements with structured logger calls
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const srcDir = path.join(__dirname, '..', 'src');
const backupDir = path.join(__dirname, '..', 'backups', `console-migration-${Date.now()}`);

// Statistics
const stats = {
  filesProcessed: 0,
  filesModified: 0,
  consolesReplaced: 0,
  errors: [],
};

// Import patterns to add
const LOGGER_IMPORTS = {
  basic: "import { logger } from '@/lib/logger';",
  api: "import { apiLogger } from '@/lib/logger';",
  auth: "import { authLogger } from '@/lib/logger';",
  db: "import { dbLogger } from '@/lib/logger';",
  security: "import { securityLogger } from '@/lib/logger';",
  performance: "import { performanceLogger } from '@/lib/logger';",
  functions: "import { logError, logWarn, logInfo, logDebug } from '@/lib/logger';",
};

// Replacement patterns
const REPLACEMENTS = [
  // API routes - use apiLogger
  {
    pattern: /console\.error\((.*?)\)/g,
    replacement: (match, content) => `apiLogger.error(${content})`,
    filePattern: /src\/app\/api\//,
    loggerType: 'api',
  },
  {
    pattern: /console\.warn\((.*?)\)/g,
    replacement: (match, content) => `apiLogger.warn(${content})`,
    filePattern: /src\/app\/api\//,
    loggerType: 'api',
  },
  {
    pattern: /console\.log\((.*?)\)/g,
    replacement: (match, content) => `apiLogger.info(${content})`,
    filePattern: /src\/app\/api\//,
    loggerType: 'api',
  },
  {
    pattern: /console\.info\((.*?)\)/g,
    replacement: (match, content) => `apiLogger.info(${content})`,
    filePattern: /src\/app\/api\//,
    loggerType: 'api',
  },

  // Auth files - use authLogger
  {
    pattern: /console\.error\((.*?)\)/g,
    replacement: (match, content) => `authLogger.error(${content})`,
    filePattern: /auth|Auth/,
    loggerType: 'auth',
  },
  {
    pattern: /console\.warn\((.*?)\)/g,
    replacement: (match, content) => `authLogger.warn(${content})`,
    filePattern: /auth|Auth/,
    loggerType: 'auth',
  },

  // Database files - use dbLogger
  {
    pattern: /console\.error\((.*?)\)/g,
    replacement: (match, content) => `dbLogger.error(${content})`,
    filePattern: /database|supabase|postgres|sql/i,
    loggerType: 'db',
  },

  // Security files - use securityLogger
  {
    pattern: /console\.error\((.*?)\)/g,
    replacement: (match, content) => `securityLogger.error(${content})`,
    filePattern: /security|Security/,
    loggerType: 'security',
  },

  // Performance files - use performanceLogger
  {
    pattern: /console\.log\((.*?)\)/g,
    replacement: (match, content) => `performanceLogger.debug(${content})`,
    filePattern: /performance|Performance|perf|benchmark/i,
    loggerType: 'performance',
  },

  // Default replacements (use basic logger)
  {
    pattern: /console\.error\((.*?)\)/g,
    replacement: (match, content) => `logger.error(${content})`,
    filePattern: /.*/,
    loggerType: 'basic',
  },
  {
    pattern: /console\.warn\((.*?)\)/g,
    replacement: (match, content) => `logger.warn(${content})`,
    filePattern: /.*/,
    loggerType: 'basic',
  },
  {
    pattern: /console\.log\((.*?)\)/g,
    replacement: (match, content) => `logger.info(${content})`,
    filePattern: /.*/,
    loggerType: 'basic',
  },
  {
    pattern: /console\.info\((.*?)\)/g,
    replacement: (match, content) => `logger.info(${content})`,
    filePattern: /.*/,
    loggerType: 'basic',
  },
  {
    pattern: /console\.debug\((.*?)\)/g,
    replacement: (match, content) => `logger.debug(${content})`,
    filePattern: /.*/,
    loggerType: 'basic',
  },
];

/**
 * Check if file should be processed
 */
function shouldProcessFile(filePath) {
  const ext = path.extname(filePath);
  if (!['.ts', '.tsx', '.js', '.jsx'].includes(ext)) return false;

  // Skip node_modules, .next, and backup directories
  if (filePath.includes('node_modules') || filePath.includes('.next') || filePath.includes('backups')) {
    return false;
  }

  // Skip test files for now (handle separately)
  if (filePath.includes('.test.') || filePath.includes('.spec.')) {
    return false;
  }

  return true;
}

/**
 * Determine which logger to use based on file path
 */
function determineLoggerType(filePath) {
  if (filePath.includes('/api/')) return 'api';
  if (/auth|Auth/.test(filePath)) return 'auth';
  if (/database|supabase|postgres|sql/i.test(filePath)) return 'db';
  if (/security|Security/.test(filePath)) return 'security';
  if (/performance|Performance|perf|benchmark/i.test(filePath)) return 'performance';
  return 'basic';
}

/**
 * Add logger import to file if not present
 */
function addLoggerImport(content, loggerType) {
  const importStatement = LOGGER_IMPORTS[loggerType];

  // Check if import already exists
  if (content.includes(importStatement) || content.includes("from '@/lib/logger'")) {
    return content;
  }

  // Find the last import statement
  const lines = content.split('\n');
  let lastImportIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ')) {
      lastImportIndex = i;
    }
  }

  if (lastImportIndex >= 0) {
    lines.splice(lastImportIndex + 1, 0, importStatement);
  } else {
    // No imports found, add at the beginning
    lines.unshift(importStatement, '');
  }

  return lines.join('\n');
}

/**
 * Replace console statements in content
 */
function replaceConsoleStatements(content, filePath) {
  let modified = content;
  let replacementCount = 0;
  const loggerType = determineLoggerType(filePath);

  // Simple pattern matching for console statements
  // This is a basic implementation - for production, use a proper AST parser

  const patterns = [
    { from: /console\.error\(/g, to: `${loggerType}Logger.error(` },
    { from: /console\.warn\(/g, to: `${loggerType}Logger.warn(` },
    { from: /console\.log\(/g, to: `${loggerType}Logger.info(` },
    { from: /console\.info\(/g, to: `${loggerType}Logger.info(` },
    { from: /console\.debug\(/g, to: `${loggerType}Logger.debug(` },
  ];

  // Use basic logger name if not specialized
  const loggerName = loggerType === 'basic' ? 'logger' : `${loggerType}Logger`;

  patterns.forEach(({ from, to }) => {
    const matches = modified.match(from);
    if (matches) {
      replacementCount += matches.length;
      modified = modified.replace(from, to.replace(`${loggerType}Logger`, loggerName));
    }
  });

  if (replacementCount > 0) {
    modified = addLoggerImport(modified, loggerType);
  }

  return { modified, replacementCount };
}

/**
 * Process a single file
 */
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');

    // Check if file contains console statements
    if (!/console\.(log|error|warn|info|debug)/.test(content)) {
      return;
    }

    const { modified, replacementCount } = replaceConsoleStatements(content, filePath);

    if (replacementCount > 0) {
      // Create backup
      const relativePath = path.relative(srcDir, filePath);
      const backupPath = path.join(backupDir, relativePath);
      fs.mkdirSync(path.dirname(backupPath), { recursive: true });
      fs.writeFileSync(backupPath, content);

      // Write modified content
      fs.writeFileSync(filePath, modified);

      stats.filesModified++;
      stats.consolesReplaced += replacementCount;

      console.log(`✓ ${relativePath}: Replaced ${replacementCount} console statement(s)`);
    }

    stats.filesProcessed++;
  } catch (error) {
    stats.errors.push({ file: filePath, error: error.message });
    console.error(`✗ Error processing ${filePath}:`, error.message);
  }
}

/**
 * Recursively process directory
 */
function processDirectory(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      // Skip certain directories
      if (['node_modules', '.next', 'backups', '.git'].includes(entry.name)) {
        continue;
      }
      processDirectory(fullPath);
    } else if (entry.isFile() && shouldProcessFile(fullPath)) {
      processFile(fullPath);
    }
  }
}

/**
 * Main execution
 */
function main() {
  console.log('🔄 Console to Logger Migration Script');
  console.log('=====================================\n');

  // Create backup directory
  fs.mkdirSync(backupDir, { recursive: true });
  console.log(`📁 Backup directory: ${backupDir}\n`);

  // Process all files
  console.log('Processing files...\n');
  processDirectory(srcDir);

  // Print statistics
  console.log('\n=====================================');
  console.log('📊 Migration Statistics:');
  console.log(`   Files processed: ${stats.filesProcessed}`);
  console.log(`   Files modified: ${stats.filesModified}`);
  console.log(`   Console statements replaced: ${stats.consolesReplaced}`);

  if (stats.errors.length > 0) {
    console.log(`\n❌ Errors: ${stats.errors.length}`);
    stats.errors.forEach(({ file, error }) => {
      console.log(`   - ${file}: ${error}`);
    });
  }

  console.log('\n✅ Migration complete!');
  console.log(`   Backups saved to: ${backupDir}`);
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { processFile, processDirectory };
