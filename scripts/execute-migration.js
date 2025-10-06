#!/usr/bin/env node

/**
 * Database Migration Execution Script
 * Executes SQL migrations via Supabase REST API
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SERVICE_ROLE_KEY ? '✓' : '✗');
  process.exit(1);
}

/**
 * Execute SQL via Supabase REST API
 */
async function executeSql(sql) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`);

    const postData = JSON.stringify({ query: sql });

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, data, statusCode: res.statusCode });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Execute SQL file
 */
async function executeSqlFile(filePath) {
  console.log(`\n📂 Reading: ${path.basename(filePath)}`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const sql = fs.readFileSync(filePath, 'utf8');
  console.log(`📊 SQL size: ${(sql.length / 1024).toFixed(2)} KB`);

  // Split SQL into individual statements (basic parsing)
  const statements = sql
    .split(/;[\s\n]+(?=(?:[^']*'[^']*')*[^']*$)/) // Split on ; but not inside strings
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`📝 Found ${statements.length} SQL statements`);
  console.log(`⏳ Executing migration...\n`);

  let executed = 0;
  let failed = 0;
  const errors = [];

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.substring(0, 60).replace(/\n/g, ' ');

    try {
      process.stdout.write(`  [${i + 1}/${statements.length}] ${preview}... `);
      await executeSql(stmt);
      console.log('✓');
      executed++;
    } catch (error) {
      console.log('✗');
      failed++;
      errors.push({
        statement: i + 1,
        preview,
        error: error.message
      });
    }
  }

  return { executed, failed, errors, total: statements.length };
}

/**
 * Main execution
 */
async function main() {
  console.log('==============================================');
  console.log('🚀 DESCRIBE IT - DATABASE MIGRATION');
  console.log('==============================================');
  console.log(`📍 Supabase URL: ${SUPABASE_URL}`);
  console.log(`🔑 Service Role Key: ${SERVICE_ROLE_KEY.substring(0, 20)}...`);
  console.log('==============================================\n');

  const args = process.argv.slice(2);
  const migrationFiles = args.length > 0
    ? args
    : [
        path.join(__dirname, '..', 'docs', 'migrations', 'STEP-1-create-enums-only.sql'),
        path.join(__dirname, '..', 'docs', 'safe-migration-001-complete.sql')
      ];

  const results = [];

  for (const file of migrationFiles) {
    try {
      const result = await executeSqlFile(file);
      results.push({ file: path.basename(file), ...result });

      console.log(`\n✅ ${path.basename(file)}: ${result.executed}/${result.total} statements executed`);

      if (result.failed > 0) {
        console.log(`⚠️  ${result.failed} statement(s) failed:`);
        result.errors.forEach(err => {
          console.log(`   - Statement ${err.statement}: ${err.preview}`);
          console.log(`     Error: ${err.error}`);
        });
      }
    } catch (error) {
      console.error(`\n❌ Failed to execute ${path.basename(file)}:`, error.message);
      results.push({
        file: path.basename(file),
        executed: 0,
        failed: 1,
        total: 1,
        errors: [{ error: error.message }]
      });
    }
  }

  console.log('\n==============================================');
  console.log('📊 MIGRATION SUMMARY');
  console.log('==============================================');

  results.forEach(result => {
    const status = result.failed === 0 ? '✓' : '✗';
    console.log(`${status} ${result.file}: ${result.executed}/${result.total} (${result.failed} failed)`);
  });

  const totalExecuted = results.reduce((sum, r) => sum + r.executed, 0);
  const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
  const totalStatements = results.reduce((sum, r) => sum + r.total, 0);

  console.log('\n' + '='.repeat(46));
  console.log(`Total: ${totalExecuted}/${totalStatements} executed, ${totalFailed} failed`);
  console.log('==============================================\n');

  if (totalFailed > 0) {
    console.log('⚠️  Migration completed with errors');
    process.exit(1);
  } else {
    console.log('✅ Migration completed successfully!');
    process.exit(0);
  }
}

main().catch(error => {
  console.error('\n❌ Migration failed:', error);
  process.exit(1);
});
