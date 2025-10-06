#!/usr/bin/env node

/**
 * Database Migration via Direct PostgreSQL Connection
 * Uses pg library to connect to Supabase PostgreSQL database
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

// Extract project reference from Supabase URL
const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0];

// Construct PostgreSQL connection string for Supabase direct connection (port 5432)
// Format: postgres://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
const connectionString = `postgresql://postgres:${SERVICE_ROLE_KEY}@db.${projectRef}.supabase.co:5432/postgres`;

/**
 * Execute SQL file
 */
async function executeSqlFile(client, filePath) {
  console.log(`\n📂 Executing: ${path.basename(filePath)}`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const sql = fs.readFileSync(filePath, 'utf8');
  console.log(`📊 SQL size: ${(sql.length / 1024).toFixed(2)} KB`);
  console.log(`⏳ Executing...\n`);

  try {
    // Execute the entire SQL file as a single transaction
    const result = await client.query(sql);

    // PostgreSQL returns notices via client.on('notice')
    console.log('✅ Execution completed successfully');

    return {
      success: true,
      rowCount: result.rowCount,
      command: result.command
    };
  } catch (error) {
    console.error('❌ Execution failed:', error.message);

    return {
      success: false,
      error: error.message,
      detail: error.detail,
      hint: error.hint
    };
  }
}

/**
 * Verify ENUMs created
 */
async function verifyEnums(client) {
  console.log('\n🔍 Verifying ENUMs...');

  const query = `
    SELECT typname as enum_name, COUNT(*) as value_count
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE typname IN (
      'spanish_level', 'session_type', 'description_style', 'part_of_speech',
      'difficulty_level', 'learning_phase', 'qa_difficulty', 'vocabulary_category',
      'spanish_gender', 'theme_preference', 'language_preference', 'export_format'
    )
    GROUP BY typname
    ORDER BY typname;
  `;

  try {
    const result = await client.query(query);

    console.log(`\n✅ Found ${result.rows.length} ENUM types:\n`);

    result.rows.forEach(row => {
      console.log(`   ✓ ${row.enum_name} (${row.value_count} values)`);
    });

    return result.rows.length;
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    return 0;
  }
}

/**
 * Verify tables created
 */
async function verifyTables(client) {
  console.log('\n🔍 Verifying tables...');

  const query = `
    SELECT
      schemaname,
      tablename,
      tableowner
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename;
  `;

  try {
    const result = await client.query(query);

    console.log(`\n✅ Found ${result.rows.length} tables:\n`);

    result.rows.forEach(row => {
      console.log(`   ✓ ${row.tablename}`);
    });

    return result.rows.length;
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    return 0;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('==============================================');
  console.log('🚀 DESCRIBE IT - DATABASE MIGRATION (PostgreSQL)');
  console.log('==============================================');
  console.log(`📍 Project: ${projectRef}`);
  console.log(`🔗 Connection: aws-0-us-west-1.pooler.supabase.com:6543`);
  console.log('==============================================\n');

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected!\n');

    // Listen for notices (RAISE NOTICE statements)
    client.on('notice', (msg) => {
      if (msg.message) {
        console.log(`📝 ${msg.message}`);
      }
    });

    const args = process.argv.slice(2);
    const migrationFiles = args.length > 0
      ? args
      : [
          path.join(__dirname, '..', 'docs', 'migrations', 'STEP-1-create-enums-only.sql')
        ];

    const results = [];

    for (const file of migrationFiles) {
      const result = await executeSqlFile(client, file);
      results.push({ file: path.basename(file), ...result });

      if (!result.success) {
        console.error(`\n❌ Migration failed for ${path.basename(file)}`);
        console.error(`   Error: ${result.error}`);
        if (result.detail) console.error(`   Detail: ${result.detail}`);
        if (result.hint) console.error(`   Hint: ${result.hint}`);
        break;
      }
    }

    // Verify ENUMs
    const enumCount = await verifyEnums(client);

    // Verify tables (if applicable)
    const tableCount = await verifyTables(client);

    console.log('\n==============================================');
    console.log('📊 MIGRATION SUMMARY');
    console.log('==============================================');

    results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${result.file}`);
    });

    console.log(`\n📈 Statistics:`);
    console.log(`   - ENUM types: ${enumCount}`);
    console.log(`   - Tables: ${tableCount}`);
    console.log('==============================================\n');

    const allSuccess = results.every(r => r.success);

    if (allSuccess) {
      console.log('✅ Migration completed successfully!');
      process.exit(0);
    } else {
      console.log('⚠️  Migration completed with errors');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

main();
