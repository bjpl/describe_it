/**
 * Database Connection and Setup Test Script
 * Tests Supabase connection and runs database setup if needed
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  console.log('Required variables:')
  console.log('  - NEXT_PUBLIC_SUPABASE_URL')
  console.log('  - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Create Supabase admin client
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function testDatabaseConnection() {
  console.log('🔄 Testing Supabase connection...')
  
  try {
    // Test basic connection
    const { data, error } = await supabase.from('users').select('id').limit(1)
    
    if (error && error.code === '42P01') {
      // Table doesn't exist - need to run setup
      console.log('⚠️  Users table not found - database setup required')
      return { connected: true, setupRequired: true }
    } else if (error) {
      console.error('❌ Database connection error:', error.message)
      return { connected: false, setupRequired: false, error }
    }
    
    console.log('✅ Database connection successful!')
    return { connected: true, setupRequired: false }
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message)
    return { connected: false, setupRequired: false, error }
  }
}

async function runDatabaseSetup() {
  console.log('🔄 Running database setup...')
  
  try {
    // Read the SQL setup file
    const sqlPath = path.join(__dirname, 'setup-database.sql')
    const sqlContent = fs.readFileSync(sqlPath, 'utf8')
    
    // Execute the SQL setup
    const { error } = await supabase.rpc('exec_sql', { sql_query: sqlContent })
    
    if (error) {
      // Try alternative method - execute sections separately
      console.log('⚠️  Trying alternative setup method...')
      
      // Split SQL into executable chunks (remove comments and empty lines)
      const sqlStatements = sqlContent
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
      
      console.log(`📝 Executing ${sqlStatements.length} SQL statements...`)
      
      for (let i = 0; i < sqlStatements.length; i++) {
        const statement = sqlStatements[i]
        if (statement.trim()) {
          try {
            const { error: stmtError } = await supabase.rpc('exec_sql', { sql_query: statement })
            if (stmtError) {
              console.warn(`⚠️  Statement ${i + 1} warning:`, stmtError.message)
            }
          } catch (stmtErr) {
            console.warn(`⚠️  Statement ${i + 1} error:`, stmtErr.message)
          }
        }
      }
      
      console.log('✅ Database setup completed with warnings')
      return { success: true, withWarnings: true }
    }
    
    console.log('✅ Database setup completed successfully!')
    return { success: true, withWarnings: false }
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message)
    return { success: false, error }
  }
}

async function verifyDatabaseTables() {
  console.log('🔄 Verifying database tables...')
  
  const expectedTables = [
    'users',
    'sessions', 
    'vocabulary_lists',
    'vocabulary_items',
    'learning_progress',
    'saved_descriptions'
  ]
  
  const results = {}
  
  for (const table of expectedTables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1)
      
      if (error) {
        results[table] = { exists: false, error: error.message }
        console.log(`❌ Table '${table}': ${error.message}`)
      } else {
        results[table] = { exists: true, hasData: data && data.length > 0 }
        console.log(`✅ Table '${table}': OK ${data && data.length > 0 ? '(has data)' : '(empty)'}`)
      }
    } catch (error) {
      results[table] = { exists: false, error: error.message }
      console.log(`❌ Table '${table}': ${error.message}`)
    }
  }
  
  return results
}

async function testVocabularyData() {
  console.log('🔄 Testing vocabulary data...')
  
  try {
    // Test vocabulary lists
    const { data: lists, error: listsError } = await supabase
      .from('vocabulary_lists')
      .select('*')
      .eq('is_active', true)
    
    if (listsError) {
      console.error('❌ Error fetching vocabulary lists:', listsError.message)
      return false
    }
    
    console.log(`✅ Found ${lists.length} active vocabulary lists`)
    
    // Test vocabulary items
    for (const list of lists) {
      const { data: items, error: itemsError } = await supabase
        .from('vocabulary_items')
        .select('count')
        .eq('vocabulary_list_id', list.id)
      
      if (!itemsError) {
        console.log(`  - ${list.name}: ${items.length} items`)
      }
    }
    
    return true
    
  } catch (error) {
    console.error('❌ Error testing vocabulary data:', error.message)
    return false
  }
}

async function generateTestReport() {
  console.log('\n📊 SUPABASE DATABASE TEST REPORT')
  console.log('=====================================')
  
  // Test connection
  const connectionResult = await testDatabaseConnection()
  console.log(`Database Connection: ${connectionResult.connected ? '✅' : '❌'}`)
  
  if (!connectionResult.connected) {
    console.log('❌ Cannot proceed - fix connection issues first')
    return
  }
  
  // Run setup if needed
  if (connectionResult.setupRequired) {
    console.log('\n🔧 Running database setup...')
    const setupResult = await runDatabaseSetup()
    
    if (!setupResult.success) {
      console.log('❌ Setup failed - manual intervention required')
      return
    }
  }
  
  // Verify tables
  console.log('\n📋 Table Verification:')
  const tableResults = await verifyDatabaseTables()
  
  const missingTables = Object.entries(tableResults)
    .filter(([_, result]) => !result.exists)
    .map(([table, _]) => table)
  
  if (missingTables.length > 0) {
    console.log(`\n⚠️  Missing tables: ${missingTables.join(', ')}`)
    console.log('Run the SQL setup script manually in Supabase dashboard')
  }
  
  // Test vocabulary data
  console.log('\n📚 Vocabulary Data Test:')
  const vocabResult = await testVocabularyData()
  
  // Summary
  console.log('\n📈 SUMMARY')
  console.log('=====================================')
  console.log(`Connection: ${connectionResult.connected ? '✅ Working' : '❌ Failed'}`)
  console.log(`Tables: ${missingTables.length === 0 ? '✅ All present' : '⚠️  Some missing'}`)
  console.log(`Sample Data: ${vocabResult ? '✅ Available' : '⚠️  Missing'}`)
  
  if (connectionResult.connected && missingTables.length === 0 && vocabResult) {
    console.log('\n🎉 DATABASE IS READY FOR PRODUCTION!')
    console.log('\nNext steps:')
    console.log('1. Test the app: npm run dev')
    console.log('2. Visit: http://localhost:3000')
    console.log('3. Check API status: http://localhost:3000/api/status')
  } else {
    console.log('\n⚠️  DATABASE NEEDS ATTENTION')
    console.log('\nManual steps required:')
    console.log('1. Copy scripts/setup-database.sql')
    console.log('2. Run in Supabase SQL Editor')
    console.log('3. Re-run this test')
  }
}

// Run the test
if (require.main === module) {
  generateTestReport().catch(console.error)
}

module.exports = {
  testDatabaseConnection,
  runDatabaseSetup,
  verifyDatabaseTables,
  testVocabularyData
}