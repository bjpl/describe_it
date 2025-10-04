/**
 * Test Helpers for Database Migration Tests
 * Provides utilities for database setup, teardown, and validation
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { vi } from 'vitest'

export interface TestDatabaseConfig {
  client: SupabaseClient
  schemaSnapshot?: SchemaSnapshot
}

export interface SchemaSnapshot {
  tables: TableDefinition[]
  enums: EnumDefinition[]
  functions: FunctionDefinition[]
  triggers: TriggerDefinition[]
  policies: PolicyDefinition[]
}

export interface TableDefinition {
  name: string
  columns: ColumnDefinition[]
  constraints: ConstraintDefinition[]
  indexes: IndexDefinition[]
}

export interface ColumnDefinition {
  name: string
  type: string
  nullable: boolean
  default?: string
}

export interface ConstraintDefinition {
  name: string
  type: 'PRIMARY KEY' | 'FOREIGN KEY' | 'UNIQUE' | 'CHECK'
  definition: string
}

export interface IndexDefinition {
  name: string
  columns: string[]
  unique: boolean
}

export interface EnumDefinition {
  name: string
  values: string[]
}

export interface FunctionDefinition {
  name: string
  returnType: string
  arguments: string[]
}

export interface TriggerDefinition {
  name: string
  table: string
  function: string
  timing: 'BEFORE' | 'AFTER'
  events: string[]
}

export interface PolicyDefinition {
  table: string
  name: string
  command: string
  definition: string
}

/**
 * Create a test database client
 */
export function createTestDatabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key'

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })
}

/**
 * Execute a SQL migration file
 */
export async function executeMigration(
  client: SupabaseClient,
  migrationPath: string
): Promise<void> {
  const fs = await import('fs/promises')
  const sql = await fs.readFile(migrationPath, 'utf-8')

  // Split by semicolons and execute each statement
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  for (const statement of statements) {
    const { error } = await client.rpc('exec_sql', { sql: statement })
    if (error) {
      throw new Error(`Migration failed: ${error.message}`)
    }
  }
}

/**
 * Capture current database schema snapshot
 */
export async function captureSchemaSnapshot(
  client: SupabaseClient
): Promise<SchemaSnapshot> {
  const tables = await getTableDefinitions(client)
  const enums = await getEnumDefinitions(client)
  const functions = await getFunctionDefinitions(client)
  const triggers = await getTriggerDefinitions(client)
  const policies = await getPolicyDefinitions(client)

  return { tables, enums, functions, triggers, policies }
}

/**
 * Get all table definitions
 */
async function getTableDefinitions(
  client: SupabaseClient
): Promise<TableDefinition[]> {
  const { data: tables, error } = await client
    .rpc('get_table_definitions')

  if (error) throw error

  return tables || []
}

/**
 * Get all enum definitions
 */
async function getEnumDefinitions(
  client: SupabaseClient
): Promise<EnumDefinition[]> {
  const { data, error } = await client
    .from('pg_type')
    .select('typname, enum_values:pg_enum(enumlabel)')
    .eq('typtype', 'e')

  if (error) throw error

  return (data || []).map(row => ({
    name: row.typname,
    values: row.enum_values.map((e: any) => e.enumlabel)
  }))
}

/**
 * Get all function definitions
 */
async function getFunctionDefinitions(
  client: SupabaseClient
): Promise<FunctionDefinition[]> {
  const { data, error } = await client
    .rpc('get_function_definitions')

  if (error) throw error

  return data || []
}

/**
 * Get all trigger definitions
 */
async function getTriggerDefinitions(
  client: SupabaseClient
): Promise<TriggerDefinition[]> {
  const { data, error } = await client
    .rpc('get_trigger_definitions')

  if (error) throw error

  return data || []
}

/**
 * Get all RLS policy definitions
 */
async function getPolicyDefinitions(
  client: SupabaseClient
): Promise<PolicyDefinition[]> {
  const { data, error } = await client
    .rpc('get_policy_definitions')

  if (error) throw error

  return data || []
}

/**
 * Verify table exists with correct structure
 */
export async function verifyTableExists(
  client: SupabaseClient,
  tableName: string,
  expectedColumns: string[]
): Promise<boolean> {
  const { data, error } = await client
    .from('information_schema.columns')
    .select('column_name')
    .eq('table_name', tableName)

  if (error || !data) return false

  const actualColumns = data.map(row => row.column_name)
  return expectedColumns.every(col => actualColumns.includes(col))
}

/**
 * Verify enum type exists
 */
export async function verifyEnumExists(
  client: SupabaseClient,
  enumName: string,
  expectedValues?: string[]
): Promise<boolean> {
  const { data, error } = await client
    .from('pg_type')
    .select('typname')
    .eq('typname', enumName)
    .eq('typtype', 'e')
    .single()

  if (error || !data) return false

  if (expectedValues) {
    const { data: enumData } = await client
      .from('pg_enum')
      .select('enumlabel')
      .eq('enumtypid', data.oid)

    if (!enumData) return false

    const actualValues = enumData.map(row => row.enumlabel)
    return expectedValues.every(val => actualValues.includes(val))
  }

  return true
}

/**
 * Verify RLS is enabled on table
 */
export async function verifyRLSEnabled(
  client: SupabaseClient,
  tableName: string
): Promise<boolean> {
  const { data, error } = await client
    .from('pg_tables')
    .select('rowsecurity')
    .eq('tablename', tableName)
    .single()

  if (error || !data) return false

  return data.rowsecurity === true
}

/**
 * Verify index exists
 */
export async function verifyIndexExists(
  client: SupabaseClient,
  indexName: string
): Promise<boolean> {
  const { data, error } = await client
    .from('pg_indexes')
    .select('indexname')
    .eq('indexname', indexName)
    .single()

  return !error && !!data
}

/**
 * Verify function exists
 */
export async function verifyFunctionExists(
  client: SupabaseClient,
  functionName: string
): Promise<boolean> {
  const { data, error } = await client
    .rpc('function_exists', { func_name: functionName })

  return !error && data === true
}

/**
 * Verify trigger exists
 */
export async function verifyTriggerExists(
  client: SupabaseClient,
  triggerName: string,
  tableName: string
): Promise<boolean> {
  const { data, error } = await client
    .from('pg_trigger')
    .select('tgname')
    .eq('tgname', triggerName)
    .single()

  return !error && !!data
}

/**
 * Clean up test database (drop all tables)
 */
export async function cleanupTestDatabase(
  client: SupabaseClient
): Promise<void> {
  // Drop tables in reverse dependency order
  const tables = [
    'analytics_summary',
    'system_alerts',
    'analytics_events',
    'progress_tracking',
    'qa_responses',
    'qa_questions',
    'vocabulary_progress',
    'user_vocabulary',
    'vocabulary_words',
    'session_images',
    'sessions',
    'user_settings',
    'users'
  ]

  for (const table of tables) {
    await client.rpc('exec_sql', {
      sql: `DROP TABLE IF EXISTS ${table} CASCADE`
    })
  }
}

/**
 * Insert test data
 */
export async function insertTestData(
  client: SupabaseClient,
  table: string,
  data: any[]
): Promise<void> {
  const { error } = await client
    .from(table)
    .insert(data)

  if (error) throw error
}

/**
 * Query test data
 */
export async function queryTestData(
  client: SupabaseClient,
  table: string,
  filter?: any
): Promise<any[]> {
  let query = client.from(table).select('*')

  if (filter) {
    Object.entries(filter).forEach(([key, value]) => {
      query = query.eq(key, value)
    })
  }

  const { data, error } = await query

  if (error) throw error

  return data || []
}

/**
 * Mock Supabase client for unit tests
 */
export function createMockSupabaseClient(): SupabaseClient {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      update: vi.fn(() => Promise.resolve({ data: null, error: null })),
      delete: vi.fn(() => Promise.resolve({ data: null, error: null }))
    })),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      signIn: vi.fn(() => Promise.resolve({ data: null, error: null })),
      signOut: vi.fn(() => Promise.resolve({ error: null }))
    }
  } as any
}

/**
 * Wait for async operation
 */
export async function waitFor(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Retry operation with exponential backoff
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error | null = null

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      if (i < maxRetries - 1) {
        await waitFor(delay * Math.pow(2, i))
      }
    }
  }

  throw lastError
}
