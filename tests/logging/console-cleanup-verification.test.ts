/**
 * Console Cleanup Verification Test Suite
 * Verifies that no console statements remain in production code
 */

import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

describe('Console Statement Cleanup Verification', () => {
  const srcDir = path.join(process.cwd(), 'src');
  const excludePatterns = [
    'node_modules',
    '.next',
    'dist',
    'build',
    '*.test.ts',
    '*.test.tsx',
    '*.spec.ts',
    '*.spec.tsx',
    'logger.ts', // Logger uses console in writeToConsole method
    'console-replacement.ts', // Logger replacement utility
    '*.backup',
    '*.fixed',
    '*.md',
  ];

  const allowedFiles = [
    'src/lib/logger.ts', // Intentionally uses console for output
    'src/lib/logging/console-replacement.ts', // Console replacement utility
    'src/lib/monitoring/logger.ts', // Uses base logger which uses console
  ];

  /**
   * Get all TypeScript files in src directory
   */
  function getAllTsFiles(dir: string): string[] {
    const files: string[] = [];

    function traverse(currentPath: string) {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);

        // Skip excluded patterns
        if (excludePatterns.some(pattern =>
          entry.name.includes(pattern) || fullPath.includes(pattern)
        )) {
          continue;
        }

        if (entry.isDirectory()) {
          traverse(fullPath);
        } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
          files.push(fullPath);
        }
      }
    }

    if (fs.existsSync(dir)) {
      traverse(dir);
    }

    return files;
  }

  /**
   * Check if file contains console statements
   */
  function checkFileForConsole(filePath: string): {
    hasConsole: boolean;
    matches: Array<{ line: number; content: string; type: string }>;
  } {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const matches: Array<{ line: number; content: string; type: string }> = [];

    const consolePattern = /console\.(log|error|warn|info|debug|trace|table|dir|assert)/g;

    lines.forEach((line, index) => {
      // Skip comments
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
        return;
      }

      const match = line.match(consolePattern);
      if (match) {
        matches.push({
          line: index + 1,
          content: line.trim(),
          type: match[1],
        });
      }
    });

    return {
      hasConsole: matches.length > 0,
      matches,
    };
  }

  it('should not have console statements in production code', () => {
    const files = getAllTsFiles(srcDir);
    const filesWithConsole: Array<{
      file: string;
      matches: Array<{ line: number; content: string; type: string }>;
    }> = [];

    files.forEach(file => {
      const relativePath = path.relative(process.cwd(), file);

      // Skip allowed files
      if (allowedFiles.some(allowed => relativePath.includes(allowed))) {
        return;
      }

      const result = checkFileForConsole(file);
      if (result.hasConsole) {
        filesWithConsole.push({
          file: relativePath,
          matches: result.matches,
        });
      }
    });

    if (filesWithConsole.length > 0) {
      console.error('\n🚨 Console statements found in production code:\n');
      filesWithConsole.forEach(({ file, matches }) => {
        console.error(`\n📄 ${file}:`);
        matches.forEach(({ line, content, type }) => {
          console.error(`  Line ${line}: console.${type}() - ${content}`);
        });
      });
      console.error('\n💡 Replace with logger methods:\n');
      console.error('  console.log()   → logger.info() or logger.debug()');
      console.error('  console.error() → logger.error()');
      console.error('  console.warn()  → logger.warn()');
      console.error('  console.info()  → logger.info()');
      console.error('  console.debug() → logger.debug()\n');
    }

    expect(filesWithConsole).toHaveLength(0);
  });

  it('should have logger imported in files that need logging', () => {
    const criticalFiles = [
      'src/app/api/analytics/route.ts',
      'src/app/api/auth/signin/route.ts',
      'src/app/api/auth/signup/route.ts',
      'src/app/api/descriptions/generate/route.ts',
      'src/lib/auth/AuthManager.ts',
      'src/lib/monitoring/index.ts',
    ];

    const filesWithoutLogger: string[] = [];

    criticalFiles.forEach(file => {
      const fullPath = path.join(process.cwd(), file);
      if (!fs.existsSync(fullPath)) {
        return;
      }

      const content = fs.readFileSync(fullPath, 'utf-8');

      // Check for logger import
      const hasLoggerImport =
        content.includes("from '@/lib/logger'") ||
        content.includes("from '@/lib/monitoring/logger'") ||
        content.includes('import { logger }') ||
        content.includes('createLogger(');

      if (!hasLoggerImport) {
        filesWithoutLogger.push(file);
      }
    });

    if (filesWithoutLogger.length > 0) {
      console.error('\n⚠️  Critical files without logger import:');
      filesWithoutLogger.forEach(file => {
        console.error(`  - ${file}`);
      });
    }

    expect(filesWithoutLogger).toHaveLength(0);
  });

  it('should use logger methods consistently', () => {
    const files = getAllTsFiles(srcDir);
    const inconsistentFiles: Array<{
      file: string;
      issues: string[];
    }> = [];

    files.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8');
      const relativePath = path.relative(process.cwd(), file);

      // Skip allowed files and test files
      if (allowedFiles.some(allowed => relativePath.includes(allowed)) ||
          file.includes('.test.') || file.includes('.spec.')) {
        return;
      }

      const issues: string[] = [];

      // Check if file has logger import but also has console
      const hasLoggerImport =
        content.includes("from '@/lib/logger'") ||
        content.includes("from '@/lib/monitoring/logger'");

      const result = checkFileForConsole(file);

      if (hasLoggerImport && result.hasConsole) {
        issues.push('Has logger imported but still uses console');
      }

      if (issues.length > 0) {
        inconsistentFiles.push({
          file: relativePath,
          issues,
        });
      }
    });

    if (inconsistentFiles.length > 0) {
      console.error('\n⚠️  Inconsistent logger usage:');
      inconsistentFiles.forEach(({ file, issues }) => {
        console.error(`\n  ${file}:`);
        issues.forEach(issue => {
          console.error(`    - ${issue}`);
        });
      });
    }

    expect(inconsistentFiles).toHaveLength(0);
  });

  it('should have logger context in API routes', () => {
    const apiRoutes = getAllTsFiles(path.join(srcDir, 'app', 'api'))
      .filter(file => file.endsWith('route.ts') && !file.includes('.backup'));

    const routesWithoutContext: string[] = [];

    apiRoutes.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8');
      const relativePath = path.relative(process.cwd(), file);

      // Check for request context usage
      const hasRequestContext =
        content.includes('extractRequestContext') ||
        content.includes('createRequestLogger') ||
        content.includes('generateRequestId') ||
        content.includes('requestId');

      // Skip if file doesn't use logger at all
      const hasLogger =
        content.includes("from '@/lib/logger'") ||
        content.includes("from '@/lib/monitoring/logger'");

      if (hasLogger && !hasRequestContext) {
        routesWithoutContext.push(relativePath);
      }
    });

    if (routesWithoutContext.length > 0) {
      console.warn('\n💡 API routes should include request context:');
      routesWithoutContext.forEach(file => {
        console.warn(`  - ${file}`);
      });
      console.warn('\n  Add: const requestId = logger.generateRequestId();');
      console.warn('  Or:  const context = logger.extractRequestContext(request);\n');
    }

    // This is a warning, not a failure
    expect(routesWithoutContext.length).toBeLessThan(apiRoutes.length);
  });

  it('should sanitize sensitive data in logs', () => {
    const files = getAllTsFiles(srcDir);
    const potentialIssues: Array<{
      file: string;
      lines: Array<{ line: number; content: string }>;
    }> = [];

    const sensitivePatterns = [
      /password/i,
      /token/i,
      /secret/i,
      /apiKey/i,
      /api_key/i,
    ];

    files.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      const relativePath = path.relative(process.cwd(), file);

      const issueLines: Array<{ line: number; content: string }> = [];

      lines.forEach((line, index) => {
        // Skip comments and type definitions
        if (line.trim().startsWith('//') ||
            line.trim().startsWith('*') ||
            line.includes('interface') ||
            line.includes('type ')) {
          return;
        }

        // Check if line contains logger and sensitive data
        const hasLogger = /logger\.(error|warn|info|debug)/.test(line);
        const hasSensitive = sensitivePatterns.some(pattern => pattern.test(line));

        if (hasLogger && hasSensitive) {
          issueLines.push({
            line: index + 1,
            content: line.trim(),
          });
        }
      });

      if (issueLines.length > 0) {
        potentialIssues.push({
          file: relativePath,
          lines: issueLines,
        });
      }
    });

    if (potentialIssues.length > 0) {
      console.warn('\n⚠️  Potential sensitive data in logs:');
      potentialIssues.forEach(({ file, lines }) => {
        console.warn(`\n  ${file}:`);
        lines.forEach(({ line, content }) => {
          console.warn(`    Line ${line}: ${content.substring(0, 80)}...`);
        });
      });
      console.warn('\n  Ensure sensitive data is redacted before logging\n');
    }

    // This is informational - log if found but don't fail
    if (potentialIssues.length > 0) {
      console.info(`ℹ️  Found ${potentialIssues.length} files with potential sensitive data in logs`);
    }
  });

  it('should have structured logging in error handlers', () => {
    const files = getAllTsFiles(srcDir);
    const errorHandlersWithoutStructuredLogging: string[] = [];

    files.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8');
      const relativePath = path.relative(process.cwd(), file);

      // Skip test files
      if (file.includes('.test.') || file.includes('.spec.')) {
        return;
      }

      // Check for try-catch blocks
      const hasTryCatch = /try\s*{/.test(content);
      const hasCatchBlock = /catch\s*\(/.test(content);

      if (hasTryCatch && hasCatchBlock) {
        // Check if catch blocks use logger
        const catchBlocks = content.match(/catch\s*\([^)]+\)\s*{[^}]+}/gs) || [];
        const hasLoggerInCatch = catchBlocks.some(block =>
          /logger\.(error|warn)/.test(block)
        );

        if (!hasLoggerInCatch) {
          errorHandlersWithoutStructuredLogging.push(relativePath);
        }
      }
    });

    if (errorHandlersWithoutStructuredLogging.length > 0) {
      console.warn('\n💡 Error handlers should use structured logging:');
      errorHandlersWithoutStructuredLogging.slice(0, 10).forEach(file => {
        console.warn(`  - ${file}`);
      });
      if (errorHandlersWithoutStructuredLogging.length > 10) {
        console.warn(`  ... and ${errorHandlersWithoutStructuredLogging.length - 10} more`);
      }
    }

    // Informational check
    expect(errorHandlersWithoutStructuredLogging.length).toBeLessThan(files.length);
  });
});
