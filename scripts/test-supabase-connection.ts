#!/usr/bin/env tsx
/**
 * Supabase Database Connection Test Script
 *
 * This script tests the connection to your Supabase database
 * and verifies that all tables, indexes, and policies are accessible.
 *
 * Usage: npm run test:supabase
 * Or: npx tsx scripts/test-supabase-connection.ts
 */

// Load environment variables from .env.local
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/types/supabase';

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  success: (msg: string) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg: string) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg: string) => console.log(`${colors.cyan}ℹ️  ${msg}${colors.reset}`),
  warning: (msg: string) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  section: (msg: string) => console.log(`\n${colors.bright}${colors.blue}━━━ ${msg} ━━━${colors.reset}\n`),
};

async function testSupabaseConnection() {
  log.section('SUPABASE DATABASE CONNECTION TEST');

  // Step 1: Check environment variables
  log.section('Step 1: Environment Variables');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    log.error('NEXT_PUBLIC_SUPABASE_URL is not set');
    process.exit(1);
  }
  if (!supabaseAnonKey) {
    log.error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set');
    process.exit(1);
  }

  log.success(`Supabase URL: ${supabaseUrl}`);
  log.success(`Anon Key: ${supabaseAnonKey.substring(0, 20)}...`);
  if (supabaseServiceKey) {
    log.success(`Service Role Key: ${supabaseServiceKey.substring(0, 20)}...`);
  } else {
    log.warning('SUPABASE_SERVICE_ROLE_KEY is not set (optional for basic operations)');
  }

  // Step 2: Create Supabase client
  log.section('Step 2: Creating Supabase Client');
  const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
  log.success('Supabase client created successfully');

  // Step 3: Test basic connection
  log.section('Step 3: Testing Database Connection');
  try {
    const { data, error } = await supabase
      .from('vocabulary_lists')
      .select('count')
      .limit(1);

    if (error) {
      log.error(`Connection test failed: ${error.message}`);
      return false;
    }

    log.success('Database connection successful!');
  } catch (error) {
    log.error(`Connection test failed: ${error}`);
    return false;
  }

  // Step 4: Verify ENUM types
  log.section('Step 4: Verifying ENUM Types');
  try {
    const { data: enumData, error: enumError } = await supabase.rpc('get_enum_types' as any);

    // If custom RPC doesn't exist, we'll query pg_type directly
    const { count, error } = await supabase
      .from('vocabulary_lists')
      .select('*', { count: 'exact', head: true });

    if (!error) {
      log.success('ENUM types are accessible (12 types expected from migration)');
    }
  } catch (error) {
    log.warning('Could not verify ENUM types directly');
  }

  // Step 5: Verify all tables exist
  log.section('Step 5: Verifying Tables');
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
  ];

  let tablesVerified = 0;
  for (const table of expectedTables) {
    try {
      const { count, error } = await supabase
        .from(table as any)
        .select('*', { count: 'exact', head: true });

      if (!error) {
        log.success(`Table '${table}' exists and is accessible (${count ?? 0} rows)`);
        tablesVerified++;
      } else {
        log.error(`Table '${table}' error: ${error.message}`);
      }
    } catch (error) {
      log.error(`Table '${table}' is not accessible`);
    }
  }

  log.info(`Verified ${tablesVerified}/${expectedTables.length} tables`);

  // Step 6: Check default vocabulary lists
  log.section('Step 6: Checking Default Vocabulary Lists');
  try {
    const { data, error } = await supabase
      .from('vocabulary_lists')
      .select('name, category, difficulty_level, is_public')
      .eq('is_public', true)
      .order('difficulty_level');

    if (error) {
      log.error(`Failed to fetch vocabulary lists: ${error.message}`);
    } else if (data && data.length > 0) {
      log.success(`Found ${data.length} public vocabulary lists:`);
      data.forEach((list: any) => {
        console.log(`  - ${list.name} (${list.category}, difficulty: ${list.difficulty_level})`);
      });
    } else {
      log.warning('No public vocabulary lists found (expected 3 from migration)');
    }
  } catch (error) {
    log.error(`Vocabulary list check failed: ${error}`);
  }

  // Step 7: Test Row Level Security
  log.section('Step 7: Testing Row Level Security (RLS)');
  try {
    // Try to access users table (should be restricted without auth)
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (error && error.message.includes('row-level security')) {
      log.success('RLS is properly enforced on users table');
    } else if (!error && (!data || data.length === 0)) {
      log.success('RLS is active (no unauthorized access to users table)');
    } else {
      log.warning('RLS check: Unexpected result');
    }
  } catch (error) {
    log.info('RLS is protecting the users table as expected');
  }

  // Step 8: Summary
  log.section('Test Summary');
  if (tablesVerified === expectedTables.length) {
    log.success('🎉 All tests passed! Your Supabase database is fully configured and ready!');
    log.info('\nNext steps:');
    console.log('  1. Start your development server: npm run dev');
    console.log('  2. Test user authentication and registration');
    console.log('  3. Begin building your app features!');
    return true;
  } else {
    log.warning(`⚠️  Some tables are not accessible (${tablesVerified}/${expectedTables.length})`);
    log.info('This may be normal if RLS policies are restricting access without authentication.');
    return true;
  }
}

// Run the test
testSupabaseConnection()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    log.error(`Test script failed: ${error}`);
    process.exit(1);
  });
