#!/usr/bin/env node

/**
 * GitHub Issue Creator - Bulk TODO to Issue Conversion
 *
 * This script automates the creation of GitHub issues from TODO comments
 * found in the codebase. It reads the TODO inventory and creates properly
 * categorized and labeled issues.
 *
 * Usage:
 *   node scripts/create-github-issues.js [options]
 *
 * Options:
 *   --dry-run        Preview issues without creating them
 *   --priority       Filter by priority (critical|high|medium|low)
 *   --batch-size     Number of issues to create at once (default: 10)
 *   --csv            Path to CSV file with TODOs
 *   --github-token   GitHub personal access token (or use GITHUB_TOKEN env)
 */

const fs = require('fs');
const path = require('path');
const { Octokit } = require('@octokit/rest');

// Configuration
const CONFIG = {
  owner: process.env.GITHUB_OWNER || 'your-org',
  repo: process.env.GITHUB_REPO || 'your-repo',
  token: process.env.GITHUB_TOKEN,
  dryRun: process.argv.includes('--dry-run'),
  batchSize: parseInt(process.argv.find(arg => arg.startsWith('--batch-size='))?.split('=')[1]) || 10,
  priorityFilter: process.argv.find(arg => arg.startsWith('--priority='))?.split('=')[1],
  csvPath: process.argv.find(arg => arg.startsWith('--csv='))?.split('=')[1],
};

// Initialize Octokit
const octokit = CONFIG.token ? new Octokit({ auth: CONFIG.token }) : null;

// Issue templates
const TEMPLATES = {
  TECHNICAL_DEBT: fs.readFileSync(
    path.join(__dirname, '../docs/github-issues/technical-debt-template.md'),
    'utf-8'
  ),
  TODO_CONVERSION: fs.readFileSync(
    path.join(__dirname, '../docs/github-issues/todo-conversion-template.md'),
    'utf-8'
  ),
  BUG_FROM_TODO: fs.readFileSync(
    path.join(__dirname, '../docs/github-issues/bug-from-todo-template.md'),
    'utf-8'
  ),
};

// Priority to label mapping
const PRIORITY_LABELS = {
  critical: ['priority: critical', 'technical-debt'],
  high: ['priority: high', 'technical-debt'],
  medium: ['priority: medium', 'technical-debt'],
  low: ['priority: low', 'technical-debt'],
};

// Category to label mapping
const CATEGORY_LABELS = {
  security: ['security', 'needs-review'],
  performance: ['performance', 'optimization'],
  refactor: ['refactoring', 'code-quality'],
  bug: ['bug', 'needs-investigation'],
  feature: ['enhancement', 'feature-request'],
  documentation: ['documentation'],
  test: ['testing', 'quality-assurance'],
};

/**
 * Parse TODO from inventory or CSV
 */
function parseTodoInventory(csvPath) {
  if (!csvPath || !fs.existsSync(csvPath)) {
    console.error(`CSV file not found: ${csvPath}`);
    return [];
  }

  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').slice(1); // Skip header

  return lines
    .filter(line => line.trim())
    .map(line => {
      const [file, lineNum, todoText, priority, category, severity] = line.split(',').map(s => s.trim());
      return {
        file,
        line: parseInt(lineNum),
        text: todoText,
        priority: priority?.toLowerCase() || 'medium',
        category: category?.toLowerCase() || 'todo',
        severity: severity?.toLowerCase() || 'medium',
      };
    });
}

/**
 * Determine issue type based on TODO content
 */
function determineIssueType(todo) {
  const text = todo.text.toLowerCase();

  if (text.includes('bug') || text.includes('fix') || text.includes('broken')) {
    return 'BUG_FROM_TODO';
  }

  if (text.includes('refactor') || text.includes('clean') || text.includes('debt')) {
    return 'TECHNICAL_DEBT';
  }

  return 'TODO_CONVERSION';
}

/**
 * Generate issue body from template
 */
function generateIssueBody(todo, template) {
  const componentName = extractComponentName(todo.file);
  const detectionDate = new Date().toISOString().split('T')[0];

  return template
    .replace(/{original_todo_text}/g, todo.text)
    .replace(/{file_path}/g, todo.file)
    .replace(/{line_number}/g, todo.line.toString())
    .replace(/{component_name}/g, componentName)
    .replace(/{category}/g, todo.category)
    .replace(/{priority}/g, todo.priority)
    .replace(/{area}/g, extractArea(todo.file))
    .replace(/{detection_date}/g, detectionDate)
    .replace(/{todo_type}/g, determineIssueType(todo))
    .replace(/{severity}/g, todo.severity)
    .replace(/{confidence_level}/g, 'High')
    .replace(/{function_name}/g, extractFunctionName(todo.text))
    .replace(/{original_todo}/g, todo.text);
}

/**
 * Extract component name from file path
 */
function extractComponentName(filePath) {
  const fileName = path.basename(filePath, path.extname(filePath));
  return fileName
    .split(/[-_.]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Extract area from file path
 */
function extractArea(filePath) {
  if (filePath.includes('/api/')) return 'api';
  if (filePath.includes('/components/')) return 'components';
  if (filePath.includes('/lib/')) return 'lib';
  if (filePath.includes('/auth/')) return 'authentication';
  if (filePath.includes('/database/')) return 'database';
  return 'general';
}

/**
 * Extract function name from TODO text
 */
function extractFunctionName(text) {
  const match = text.match(/in\s+(\w+)\s*\(/) || text.match(/function\s+(\w+)/);
  return match ? match[1] : 'N/A';
}

/**
 * Generate issue title
 */
function generateIssueTitle(todo) {
  const type = determineIssueType(todo);
  const prefix = type === 'BUG_FROM_TODO' ? '[BUG]' : type === 'TECHNICAL_DEBT' ? '[DEBT]' : '[TODO]';
  const component = extractComponentName(todo.file);

  // Extract meaningful part of TODO
  let summary = todo.text.replace(/^TODO:?\s*/i, '').trim();
  if (summary.length > 60) {
    summary = summary.substring(0, 57) + '...';
  }

  return `${prefix} ${component}: ${summary}`;
}

/**
 * Generate labels for issue
 */
function generateLabels(todo) {
  const labels = new Set();

  // Add priority labels
  if (PRIORITY_LABELS[todo.priority]) {
    PRIORITY_LABELS[todo.priority].forEach(label => labels.add(label));
  }

  // Add category labels
  if (CATEGORY_LABELS[todo.category]) {
    CATEGORY_LABELS[todo.category].forEach(label => labels.add(label));
  }

  // Add type-specific labels
  const issueType = determineIssueType(todo);
  if (issueType === 'BUG_FROM_TODO') {
    labels.add('bug');
    labels.add('from-todo');
  } else if (issueType === 'TECHNICAL_DEBT') {
    labels.add('technical-debt');
  } else {
    labels.add('todo');
  }

  // Add area label
  const area = extractArea(todo.file);
  labels.add(`area: ${area}`);

  return Array.from(labels);
}

/**
 * Create GitHub issue
 */
async function createGitHubIssue(todo) {
  const issueType = determineIssueType(todo);
  const template = TEMPLATES[issueType];
  const title = generateIssueTitle(todo);
  const body = generateIssueBody(todo, template);
  const labels = generateLabels(todo);

  const issueData = {
    owner: CONFIG.owner,
    repo: CONFIG.repo,
    title,
    body,
    labels,
  };

  if (CONFIG.dryRun) {
    console.log('\n' + '='.repeat(80));
    console.log('DRY RUN - Would create issue:');
    console.log('Title:', title);
    console.log('Labels:', labels.join(', '));
    console.log('Body preview:', body.substring(0, 200) + '...');
    console.log('='.repeat(80));
    return { number: 'DRY-RUN', html_url: 'dry-run-url' };
  }

  if (!octokit) {
    throw new Error('GitHub token not provided. Use GITHUB_TOKEN env var or --github-token flag');
  }

  try {
    const response = await octokit.issues.create(issueData);
    return response.data;
  } catch (error) {
    console.error(`Failed to create issue for ${todo.file}:${todo.line}:`, error.message);
    return null;
  }
}

/**
 * Process TODOs in batches
 */
async function processTodosInBatches(todos) {
  const results = {
    created: [],
    failed: [],
    skipped: [],
  };

  for (let i = 0; i < todos.length; i += CONFIG.batchSize) {
    const batch = todos.slice(i, i + CONFIG.batchSize);
    console.log(`\nProcessing batch ${Math.floor(i / CONFIG.batchSize) + 1}/${Math.ceil(todos.length / CONFIG.batchSize)}...`);

    const promises = batch.map(todo => createGitHubIssue(todo));
    const issues = await Promise.all(promises);

    issues.forEach((issue, idx) => {
      if (issue) {
        results.created.push({ todo: batch[idx], issue });
        console.log(`✓ Created issue #${issue.number}: ${issue.html_url}`);
      } else {
        results.failed.push(batch[idx]);
        console.log(`✗ Failed to create issue for ${batch[idx].file}:${batch[idx].line}`);
      }
    });

    // Rate limiting: wait 1 second between batches
    if (i + CONFIG.batchSize < todos.length && !CONFIG.dryRun) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}

/**
 * Generate summary report
 */
function generateSummaryReport(results, todos) {
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY REPORT');
  console.log('='.repeat(80));
  console.log(`Total TODOs processed: ${todos.length}`);
  console.log(`Issues created: ${results.created.length}`);
  console.log(`Failed: ${results.failed.length}`);
  console.log(`Skipped: ${results.skipped.length}`);

  if (results.created.length > 0) {
    console.log('\nCreated Issues:');
    results.created.forEach(({ todo, issue }) => {
      console.log(`  - #${issue.number}: ${todo.file}:${todo.line} [${todo.priority}]`);
    });
  }

  if (results.failed.length > 0) {
    console.log('\nFailed Issues:');
    results.failed.forEach(todo => {
      console.log(`  - ${todo.file}:${todo.line}: ${todo.text.substring(0, 50)}...`);
    });
  }

  console.log('='.repeat(80));
}

/**
 * Main execution
 */
async function main() {
  console.log('GitHub Issue Creator - TODO Conversion Tool\n');

  // Load TODOs
  const csvPath = CONFIG.csvPath || path.join(__dirname, '../docs/github-issues/critical-issues.csv');
  const todos = parseTodoInventory(csvPath);

  if (todos.length === 0) {
    console.error('No TODOs found to process');
    process.exit(1);
  }

  // Filter by priority if specified
  const filteredTodos = CONFIG.priorityFilter
    ? todos.filter(todo => todo.priority === CONFIG.priorityFilter)
    : todos;

  console.log(`Found ${filteredTodos.length} TODOs to process`);

  if (CONFIG.dryRun) {
    console.log('Running in DRY RUN mode - no issues will be created');
  }

  // Process TODOs
  const results = await processTodosInBatches(filteredTodos);

  // Generate report
  generateSummaryReport(results, filteredTodos);

  // Save results
  const outputPath = path.join(__dirname, '../docs/github-issues/creation-results.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nResults saved to: ${outputPath}`);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = {
  parseTodoInventory,
  createGitHubIssue,
  generateIssueTitle,
  generateLabels,
};
