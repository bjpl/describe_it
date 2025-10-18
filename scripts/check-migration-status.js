#!/usr/bin/env node

/**
 * Migration Status Checker
 *
 * Purpose: Check current database state and determine which migrations need to be run
 *
 * Usage:
 *   node scripts/check-migration-status.js
 */

const { createClient } = require('@supabase/supabase-js');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m'
};

/**
 * Migration definitions
 */
const MIGRATIONS = [
  {
    id: '001',
    name: 'create_user_progress',
    description: 'User progress tracking system',
    table: 'user_progress',
    requiredFunctions: ['update_user_streak', 'add_user_points', 'initialize_user_progress'],
    file: 'scripts/migrations/001_create_user_progress.sql'
  },
  {
    id: '002',
    name: 'create_export_history',
    description: 'Export history and tracking',
    table: 'export_history',
    requiredFunctions: ['track_export_download', 'cleanup_expired_exports', 'get_user_export_stats'],
    file: 'scripts/migrations/002_create_export_history.sql'
  },
  {
    id: '003',
    name: 'create_user_api_keys',
    description: 'Encrypted API key storage',
    table: 'user_api_keys',
    requiredFunctions: ['encrypt_api_key', 'decrypt_api_key', 'store_api_key', 'get_api_key'],
    file: 'scripts/migrations/003_create_user_api_keys.sql'
  }
];

/**
 * Initialize Supabase client
 */
function initializeSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.log(`${colors.red}✗${colors.reset} Missing environment variables`);
    console.log('  Required: SUPABASE_URL and SUPABASE_SERVICE_KEY (or SUPABASE_ANON_KEY)');
    console.log('  Set these in your .env.local file');
    process.exit(1);
  }

  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Check if a table exists
 */
async function tableExists(supabase, tableName) {
  try {
    const { error } = await supabase
      .from(tableName)
      .select('id')
      .limit(0);

    return !error;
  } catch (err) {
    return false;
  }
}

/**
 * Check migration status
 */
async function checkMigrationStatus(supabase, migration) {
  const exists = await tableExists(supabase, migration.table);

  return {
    ...migration,
    status: exists ? 'completed' : 'pending',
    tableExists: exists
  };
}

/**
 * Print status for a single migration
 */
function printMigrationStatus(status) {
  const icon = status.status === 'completed' ?
    `${colors.green}✓${colors.reset}` :
    `${colors.yellow}○${colors.reset}`;

  const statusText = status.status === 'completed' ?
    `${colors.green}COMPLETED${colors.reset}` :
    `${colors.yellow}PENDING${colors.reset}`;

  console.log(`\n${icon} Migration ${status.id}: ${colors.bright}${status.name}${colors.reset}`);
  console.log(`  Description: ${status.description}`);
  console.log(`  Status: ${statusText}`);
  console.log(`  Table: ${status.table} ${status.tableExists ? `${colors.green}(exists)${colors.reset}` : `${colors.red}(missing)${colors.reset}`}`);
  console.log(`  File: ${colors.cyan}${status.file}${colors.reset}`);
}

/**
 * Print overall summary
 */
function printSummary(statuses) {
  const completed = statuses.filter(s => s.status === 'completed').length;
  const pending = statuses.filter(s => s.status === 'pending').length;

  console.log('\n' + '='.repeat(70));
  console.log(`${colors.bright}${colors.cyan}MIGRATION STATUS SUMMARY${colors.reset}`);
  console.log('='.repeat(70));

  console.log(`\nTotal Migrations: ${MIGRATIONS.length}`);
  console.log(`${colors.green}Completed:${colors.reset} ${completed}`);
  console.log(`${colors.yellow}Pending:${colors.reset} ${pending}`);

  if (pending > 0) {
    console.log(`\n${colors.yellow}⚠ Action Required:${colors.reset}`);
    console.log('  Some migrations need to be executed.');
    console.log(`  Follow instructions in: ${colors.cyan}scripts/migrations/EXECUTION_GUIDE.md${colors.reset}`);

    const pendingMigrations = statuses.filter(s => s.status === 'pending');
    console.log('\n  Pending migrations:');
    pendingMigrations.forEach(m => {
      console.log(`    ${colors.yellow}○${colors.reset} ${m.id}: ${m.name}`);
    });
  } else {
    console.log(`\n${colors.green}✓ All migrations completed!${colors.reset}`);
    console.log('  Your database is up to date.');
  }

  console.log('\n' + '='.repeat(70));
}

/**
 * Print next steps
 */
function printNextSteps(statuses) {
  const pending = statuses.filter(s => s.status === 'pending');

  if (pending.length === 0) {
    console.log(`\n${colors.green}Next Steps:${colors.reset}`);
    console.log('  1. Run verification script: node scripts/verify-migrations.js');
    console.log('  2. Test your application endpoints');
    console.log('  3. Update API routes to use new database tables');
    return;
  }

  console.log(`\n${colors.yellow}Next Steps:${colors.reset}`);
  console.log('  1. Open Supabase Dashboard SQL Editor');
  console.log('  2. Follow step-by-step guide in:');
  console.log(`     ${colors.cyan}scripts/migrations/EXECUTION_GUIDE.md${colors.reset}`);
  console.log('  3. Execute pending migrations in order:');

  pending.forEach(m => {
    console.log(`     ${colors.yellow}→${colors.reset} Migration ${m.id}: ${m.name}`);
  });

  console.log('  4. Run this script again to verify completion');
  console.log('  5. Run verification: node scripts/verify-migrations.js');
}

/**
 * Main execution
 */
async function main() {
  console.log(`${colors.bright}${colors.cyan}DATABASE MIGRATION STATUS CHECKER${colors.reset}\n`);
  console.log('Checking current database state...\n');

  const supabase = initializeSupabase();

  // Check each migration
  const statuses = [];
  for (const migration of MIGRATIONS) {
    const status = await checkMigrationStatus(supabase, migration);
    statuses.push(status);
    printMigrationStatus(status);
  }

  // Print summary
  printSummary(statuses);

  // Print next steps
  printNextSteps(statuses);

  console.log('');

  // Exit with appropriate code
  const hasPending = statuses.some(s => s.status === 'pending');
  process.exit(hasPending ? 1 : 0);
}

// Run the checker
main().catch(err => {
  console.error(`${colors.red}Error:${colors.reset} ${err.message}`);
  console.error(err);
  process.exit(1);
});
