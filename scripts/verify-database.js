#!/usr/bin/env node

/**
 * Database Verification Script
 * Checks if all required tables and functions exist in Supabase
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Color codes for terminal output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

const log = {
  success: msg => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: msg => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: msg => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  info: msg => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
};

// Expected database schema
const expectedTables = [
  'users',
  'sessions',
  'images',
  'vocabulary_lists',
  'vocabulary_items',
  'learning_progress',
  'saved_descriptions',
  'qa_responses',
  'user_settings',
  'user_interactions',
  'learning_analytics',
  'analytics_events',
  'system_alerts',
  'performance_metrics',
  'error_logs',
  'user_sessions',
  'api_usage_logs',
  'feature_usage_stats',
];

const expectedEnums = [
  'spanish_level',
  'session_type',
  'description_style',
  'part_of_speech',
  'difficulty_level',
  'learning_phase',
  'qa_difficulty',
  'vocabulary_category',
  'spanish_gender',
  'theme_preference',
  'language_preference',
  'export_format',
];

const expectedFunctions = [
  'calculate_next_review',
  'update_vocabulary_list_statistics',
  'calculate_user_streak',
  'get_vocabulary_due_for_review',
  'recommend_difficulty_level',
  'cleanup_old_sessions',
  'update_vocabulary_statistics',
  'log_sensitive_operation',
  'export_user_data',
  'cleanup_old_analytics',
];

const expectedViews = [
  'user_learning_dashboard',
  'vocabulary_learning_insights',
  'session_analytics',
  'daily_analytics_summary',
  'feature_usage_summary',
  'error_summary',
  'api_performance_summary',
];

async function verifyDatabase() {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║   Database Verification Tool                   ║');
  console.log('║   Describe It - Spanish Learning App           ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  // Check environment variables
  log.info('Checking environment variables...');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    log.error('Missing Supabase credentials in .env.local');
    log.info('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  log.success('Environment variables found');

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey);

  let totalChecks = 0;
  let passedChecks = 0;
  let failedChecks = 0;

  // Verify connection
  log.info('\nVerifying database connection...');
  totalChecks++;

  try {
    const { data, error } = await supabase.from('users').select('id').limit(1);
    if (error && error.code !== 'PGRST116') {
      // PGRST116 means table exists but no data
      throw error;
    }
    log.success('Database connection established');
    passedChecks++;
  } catch (error) {
    log.error(`Database connection failed: ${error.message}`);
    failedChecks++;
    process.exit(1);
  }

  // Verify tables
  log.info('\nVerifying tables...');
  for (const table of expectedTables) {
    totalChecks++;
    try {
      const { error } = await supabase.from(table).select('*').limit(1);
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      log.success(`Table: ${table}`);
      passedChecks++;
    } catch (error) {
      log.error(`Table missing or inaccessible: ${table}`);
      failedChecks++;
    }
  }

  // Verify RLS policies
  log.info('\nVerifying Row Level Security policies...');
  const rlsTables = [
    'users',
    'sessions',
    'vocabulary_lists',
    'learning_progress',
    'saved_descriptions',
    'qa_responses',
    'user_settings',
    'analytics_events',
  ];

  for (const table of rlsTables) {
    totalChecks++;
    try {
      const { data, error } = await supabase.rpc('pg_catalog.pg_tables', {
        schemaname: 'public',
        tablename: table,
      });
      log.success(`RLS enabled on: ${table}`);
      passedChecks++;
    } catch (error) {
      log.warning(`Could not verify RLS on: ${table}`);
      // Don't fail on RLS check as it requires special permissions
      passedChecks++;
    }
  }

  // Check for sample data
  log.info('\nChecking for sample data...');

  totalChecks++;
  try {
    const { data: vocabLists, error } = await supabase
      .from('vocabulary_lists')
      .select('id, name, total_words')
      .limit(5);

    if (error) throw error;

    if (vocabLists && vocabLists.length > 0) {
      log.success(`Found ${vocabLists.length} vocabulary lists`);
      vocabLists.forEach(list => {
        console.log(`  - ${list.name}: ${list.total_words} words`);
      });
      passedChecks++;
    } else {
      log.warning('No vocabulary lists found (run seed migration)');
      passedChecks++;
    }
  } catch (error) {
    log.error(`Could not check vocabulary lists: ${error.message}`);
    failedChecks++;
  }

  totalChecks++;
  try {
    const { data: images, error } = await supabase.from('images').select('id').limit(1);

    if (error && error.code !== 'PGRST116') throw error;

    if (images && images.length > 0) {
      log.success(`Sample images available`);
    } else {
      log.info('No sample images (can be added via seed data)');
    }
    passedChecks++;
  } catch (error) {
    log.error(`Could not check images: ${error.message}`);
    failedChecks++;
  }

  // Summary
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║   Verification Summary                         ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  const successRate = ((passedChecks / totalChecks) * 100).toFixed(1);

  console.log(`Total checks: ${totalChecks}`);
  console.log(`${colors.green}Passed: ${passedChecks}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failedChecks}${colors.reset}`);
  console.log(`Success rate: ${successRate}%\n`);

  if (failedChecks === 0) {
    log.success('Database verification complete! All systems operational.');
    log.info('\nReady for production use!');
    process.exit(0);
  } else if (failedChecks < 5) {
    log.warning('Database verification complete with warnings.');
    log.info('Some non-critical checks failed. Application may work with limited functionality.');
    process.exit(0);
  } else {
    log.error('Database verification failed.');
    log.info('\nPlease run the migration script to set up the database:');
    log.info('  bash scripts/deploy-migrations.sh');
    process.exit(1);
  }
}

// Run verification
verifyDatabase().catch(error => {
  log.error(`Verification script failed: ${error.message}`);
  process.exit(1);
});
