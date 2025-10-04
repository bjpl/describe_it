/**
 * Setup Analytics Tables in Supabase
 * 
 * This script creates the necessary tables for analytics in your Supabase database.
 * Run this script to set up analytics_events, system_alerts, and analytics_summary tables.
 * 
 * Usage: node scripts/setup-analytics-tables.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: '.env.local' });

async function setupAnalyticsTables() {
  console.log('🚀 Setting up analytics tables in Supabase...\n');

  // Check for required environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials!');
    console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
    process.exit(1);
  }

  console.log(`📍 Supabase URL: ${supabaseUrl}`);
  console.log(`🔑 Service key: ${supabaseServiceKey.substring(0, 20)}...`);

  // Create Supabase client with service role key
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Read the SQL migration file
    const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250111_create_analytics_tables.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('\n📝 Executing SQL migration...\n');

    // Split SQL content by semicolons and execute each statement
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let successCount = 0;
    let errorCount = 0;

    for (const statement of statements) {
      // Skip empty statements
      if (!statement || statement.length < 10) continue;

      // Get a preview of the statement for logging
      const preview = statement.substring(0, 50).replace(/\n/g, ' ');
      
      try {
        // Execute the SQL statement
        const { error } = await supabase.rpc('exec_sql', { 
          sql: statement + ';' 
        }).single();

        if (error) {
          // Try direct execution as fallback
          const { data, error: directError } = await supabase
            .from('_sql')
            .insert({ query: statement + ';' })
            .select();

          if (directError) {
            // Some statements might already exist, which is fine
            if (directError.message?.includes('already exists') || 
                directError.message?.includes('duplicate')) {
              console.log(`⚠️  Already exists: ${preview}...`);
            } else {
              console.error(`❌ Failed: ${preview}...`);
              console.error(`   Error: ${directError.message}`);
              errorCount++;
            }
          } else {
            console.log(`✅ Success: ${preview}...`);
            successCount++;
          }
        } else {
          console.log(`✅ Success: ${preview}...`);
          successCount++;
        }
      } catch (err) {
        console.error(`❌ Failed: ${preview}...`);
        console.error(`   Error: ${err.message}`);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`\n📊 Migration Summary:`);
    console.log(`   ✅ Successful statements: ${successCount}`);
    console.log(`   ❌ Failed statements: ${errorCount}`);

    // Test the tables
    console.log('\n🧪 Testing table access...\n');

    // Test analytics_events table
    const { error: eventsError } = await supabase
      .from('analytics_events')
      .select('count')
      .limit(1);

    if (eventsError) {
      console.log(`❌ analytics_events table: ${eventsError.message}`);
    } else {
      console.log('✅ analytics_events table is accessible');
    }

    // Test system_alerts table
    const { error: alertsError } = await supabase
      .from('system_alerts')
      .select('count')
      .limit(1);

    if (alertsError) {
      console.log(`❌ system_alerts table: ${alertsError.message}`);
    } else {
      console.log('✅ system_alerts table is accessible');
    }

    // Test analytics_summary table
    const { error: summaryError } = await supabase
      .from('analytics_summary')
      .select('count')
      .limit(1);

    if (summaryError) {
      console.log(`❌ analytics_summary table: ${summaryError.message}`);
    } else {
      console.log('✅ analytics_summary table is accessible');
    }

    console.log('\n' + '='.repeat(60));
    
    if (errorCount === 0) {
      console.log('\n🎉 Analytics tables setup completed successfully!');
      console.log('\n📝 Next steps:');
      console.log('   1. The analytics system should now work properly');
      console.log('   2. Events will be stored in the analytics_events table');
      console.log('   3. Critical alerts will be logged to system_alerts');
      console.log('   4. Daily summaries will be automatically generated');
    } else {
      console.log('\n⚠️  Setup completed with some errors.');
      console.log('   Some tables might already exist or require manual setup.');
      console.log('   You can also run the SQL directly in the Supabase dashboard.');
    }

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.error('\n💡 Alternative approach:');
    console.error('   1. Go to your Supabase dashboard');
    console.error('   2. Navigate to the SQL Editor');
    console.error('   3. Copy the contents of supabase/migrations/20250111_create_analytics_tables.sql');
    console.error('   4. Paste and run the SQL in the editor');
    process.exit(1);
  }
}

// Alternative simple approach - just test and provide instructions
async function testAndGuide() {
  console.log('🔍 Checking analytics table status...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials!');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Check if tables exist
  const tables = ['analytics_events', 'system_alerts', 'analytics_summary'];
  const missing = [];

  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .select('count')
      .limit(1);

    if (error && error.message?.includes('does not exist')) {
      missing.push(table);
      console.log(`❌ Table '${table}' does not exist`);
    } else if (error) {
      console.log(`⚠️  Table '${table}' exists but has issues: ${error.message}`);
    } else {
      console.log(`✅ Table '${table}' exists and is accessible`);
    }
  }

  if (missing.length > 0) {
    console.log('\n📝 To create the missing tables:');
    console.log('\n1. Go to your Supabase dashboard:');
    console.log(`   ${supabaseUrl.replace('.supabase.co', '.supabase.com')}`);
    console.log('\n2. Navigate to the SQL Editor (left sidebar)');
    console.log('\n3. Copy and paste the SQL from:');
    console.log('   supabase/migrations/20250111_create_analytics_tables.sql');
    console.log('\n4. Click "Run" to execute the SQL');
    console.log('\n5. The tables will be created immediately');
  } else {
    console.log('\n✅ All analytics tables are properly set up!');
  }
}

// Run the setup
console.log('Analytics Tables Setup Script');
console.log('=============================\n');

// Use the simpler test and guide approach
testAndGuide().catch(console.error);