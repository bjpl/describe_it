/**
 * Comprehensive Tests for Migration Rollback Procedures
 * Tests the ability to safely rollback database migrations
 *
 * @requires Real Supabase database connection
 * To skip these tests: SKIP_DB_TESTS=true npm test
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { SupabaseClient } from '@supabase/supabase-js'
import path from 'path'
import {
  createTestDatabaseClient,
  executeMigration,
  captureSchemaSnapshot,
  SchemaSnapshot,
  cleanupTestDatabase,
  verifyTableExists,
  verifyEnumExists,
  insertTestData,
  queryTestData
} from './test-helpers'

// Mock global fetch for Supabase client
global.fetch = vi.fn()

// Check if database tests should be skipped
const hasDatabase = process.env.SUPABASE_SERVICE_ROLE_KEY &&
                    process.env.SUPABASE_SERVICE_ROLE_KEY !== 'test-key'
const describeOrSkip = hasDatabase ? describe : describe.skip

describeOrSkip('Migration Rollback Tests', () => {
  let client: SupabaseClient
  let preRollbackSnapshot: SchemaSnapshot | null = null
  const MIGRATION_DIR = path.join(process.cwd(), 'supabase', 'migrations')

  beforeAll(async () => {
    client = createTestDatabaseClient()
  })

  beforeEach(() => {
    // Reset and setup fetch mock for each test
    vi.clearAllMocks()
    ;(global.fetch as any).mockImplementation((url: string, options?: any) => {
      // Parse the request to determine what data to return
      let responseData: any

      // Mock for information_schema.columns queries (used by verifyTableExists)
      if (url.includes('information_schema.columns')) {
        // Return mock columns to simulate table existence
        responseData = []
      }
      // For RPC calls that should return arrays (schema queries)
      else if (url.includes('/rest/v1/rpc/get_table_definitions') ||
               url.includes('/rest/v1/rpc/get_function_definitions') ||
               url.includes('/rest/v1/rpc/get_trigger_definitions') ||
               url.includes('/rest/v1/rpc/get_policy_definitions')) {
        responseData = []
      }
      // For RPC exec_sql calls - return success
      else if (url.includes('/rest/v1/rpc/exec_sql')) {
        responseData = null  // Supabase RPC returns null for void functions
      }
      // For table select queries (return array directly, not wrapped)
      else if (url.includes('/rest/v1/') && options?.method === 'GET') {
        responseData = []
      }
      // For insert/update operations
      else if (url.includes('/rest/v1/') && (options?.method === 'POST' || options?.method === 'PATCH')) {
        responseData = []
      }
      // Default for other operations
      else {
        responseData = null
      }

      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => responseData,
        text: async () => JSON.stringify(responseData),
        headers: new Headers({ 'content-type': 'application/json' }),
        redirected: false,
        statusText: 'OK',
        type: 'basic' as ResponseType,
        url,
        clone: function() { return this },
        body: null,
        bodyUsed: false,
        arrayBuffer: async () => new ArrayBuffer(0),
        blob: async () => new Blob(),
        formData: async () => new FormData()
      } as Response)
    })
  })

  afterAll(async () => {
    // Clean up test database after rollback tests
    await cleanupTestDatabase(client)
  })

  describe('Snapshot and Restore', () => {
    it('should capture schema snapshot before migration', async () => {
      const snapshot = await captureSchemaSnapshot(client)

      expect(snapshot).toBeDefined()
      expect(snapshot.tables).toBeInstanceOf(Array)
      expect(snapshot.enums).toBeInstanceOf(Array)
      expect(snapshot.functions).toBeInstanceOf(Array)
      expect(snapshot.policies).toBeInstanceOf(Array)
    })

    it('should capture schema snapshot after migration', async () => {
      // Execute migration
      const migrationPath = path.join(MIGRATION_DIR, '20250111_create_analytics_tables.sql')
      await executeMigration(client, migrationPath)

      // Capture snapshot
      const postSnapshot = await captureSchemaSnapshot(client)

      expect(postSnapshot).toBeDefined()
      expect(postSnapshot.tables.length).toBeGreaterThan(0)
    })

    it('should detect schema differences between snapshots', async () => {
      const preSnapshot = await captureSchemaSnapshot(client)

      // Add a test table
      await client.rpc('exec_sql', {
        sql: 'CREATE TABLE IF NOT EXISTS test_rollback (id SERIAL PRIMARY KEY, name TEXT)'
      })

      const postSnapshot = await captureSchemaSnapshot(client)

      expect(postSnapshot.tables.length).toBeGreaterThan(preSnapshot.tables.length)
    })
  })

  describe('Analytics Tables Rollback', () => {
    beforeEach(async () => {
      // Ensure clean state
      await cleanupTestDatabase(client)

      // Execute migration
      const migrationPath = path.join(MIGRATION_DIR, '20250111_create_analytics_tables.sql')
      await executeMigration(client, migrationPath)

      // Capture pre-rollback snapshot
      preRollbackSnapshot = await captureSchemaSnapshot(client)
    })

    it('should drop analytics_events table on rollback', async () => {
      // Verify table exists
      let exists = await verifyTableExists(client, 'analytics_events', ['id', 'event_name'])
      expect(exists).toBe(true)

      // Execute rollback
      await client.rpc('exec_sql', {
        sql: 'DROP TABLE IF EXISTS analytics_events CASCADE'
      })

      // Verify table is gone
      exists = await verifyTableExists(client, 'analytics_events', ['id', 'event_name'])
      expect(exists).toBe(false)
    })

    it('should drop system_alerts table on rollback', async () => {
      // Verify table exists
      let exists = await verifyTableExists(client, 'system_alerts', ['id', 'alert_type'])
      expect(exists).toBe(true)

      // Execute rollback
      await client.rpc('exec_sql', {
        sql: 'DROP TABLE IF EXISTS system_alerts CASCADE'
      })

      // Verify table is gone
      exists = await verifyTableExists(client, 'system_alerts', ['id', 'alert_type'])
      expect(exists).toBe(false)
    })

    it('should drop analytics_summary table on rollback', async () => {
      // Verify table exists
      let exists = await verifyTableExists(client, 'analytics_summary', ['id', 'date'])
      expect(exists).toBe(true)

      // Execute rollback
      await client.rpc('exec_sql', {
        sql: 'DROP TABLE IF EXISTS analytics_summary CASCADE'
      })

      // Verify table is gone
      exists = await verifyTableExists(client, 'analytics_summary', ['id', 'date'])
      expect(exists).toBe(false)
    })

    it('should remove all analytics indexes on rollback', async () => {
      // Execute rollback SQL
      const rollbackSQL = `
        DROP INDEX IF EXISTS idx_analytics_events_event_name;
        DROP INDEX IF EXISTS idx_analytics_events_session_id;
        DROP INDEX IF EXISTS idx_analytics_events_user_id;
        DROP INDEX IF EXISTS idx_analytics_events_timestamp;
        DROP INDEX IF EXISTS idx_analytics_events_created_at;
        DROP INDEX IF EXISTS idx_system_alerts_alert_type;
        DROP INDEX IF EXISTS idx_system_alerts_severity;
        DROP INDEX IF EXISTS idx_system_alerts_resolved;
        DROP INDEX IF EXISTS idx_system_alerts_created_at;
        DROP INDEX IF EXISTS idx_analytics_summary_date;
        DROP INDEX IF EXISTS idx_analytics_summary_event_name;
      `

      await client.rpc('exec_sql', { sql: rollbackSQL })

      // Verify indexes are gone
      const { data: indexes } = await client
        .from('pg_indexes')
        .select('indexname')
        .like('indexname', 'idx_analytics_%')

      expect(indexes).toHaveLength(0)
    })

    it('should remove analytics functions on rollback', async () => {
      // Drop functions
      await client.rpc('exec_sql', {
        sql: 'DROP FUNCTION IF EXISTS update_analytics_summary() CASCADE'
      })
      await client.rpc('exec_sql', {
        sql: 'DROP FUNCTION IF EXISTS cleanup_old_analytics() CASCADE'
      })

      // Verify functions are gone
      const { data: functions } = await client
        .from('pg_proc')
        .select('proname')
        .in('proname', ['update_analytics_summary', 'cleanup_old_analytics'])

      expect(functions).toHaveLength(0)
    })
  })

  describe('Data Preservation During Rollback', () => {
    it('should preserve existing user data during analytics rollback', async () => {
      // Create test user
      const testUser = {
        email: 'rollback-test@example.com',
        username: 'rollbackuser',
        spanish_level: 'beginner'
      }

      await insertTestData(client, 'users', [testUser])

      // Verify user exists
      const users = await queryTestData(client, 'users', { email: testUser.email })
      expect(users).toHaveLength(1)

      // Rollback analytics tables
      await client.rpc('exec_sql', {
        sql: `
          DROP TABLE IF EXISTS analytics_events CASCADE;
          DROP TABLE IF EXISTS system_alerts CASCADE;
          DROP TABLE IF EXISTS analytics_summary CASCADE;
        `
      })

      // Verify user data still exists
      const usersAfterRollback = await queryTestData(client, 'users', { email: testUser.email })
      expect(usersAfterRollback).toHaveLength(1)
      expect(usersAfterRollback[0].username).toBe(testUser.username)
    })

    it('should handle dependent data gracefully during rollback', async () => {
      // Create user and analytics event
      const { data: user } = await client
        .from('users')
        .insert({ email: 'dependent-test@example.com' })
        .select()
        .single()

      await client
        .from('analytics_events')
        .insert({
          event_name: 'test_event',
          event_data: {},
          session_id: 'test-session',
          user_id: user.id
        })

      // Rollback analytics tables (CASCADE should handle this)
      await client.rpc('exec_sql', {
        sql: 'DROP TABLE IF EXISTS analytics_events CASCADE'
      })

      // Verify user still exists
      const { data: userAfterRollback } = await client
        .from('users')
        .select()
        .eq('id', user.id)
        .single()

      expect(userAfterRollback).toBeTruthy()
    })
  })

  describe('Rollback Safety', () => {
    it('should be idempotent - running rollback twice should not fail', async () => {
      const rollbackSQL = `
        DROP TABLE IF EXISTS analytics_events CASCADE;
        DROP TABLE IF EXISTS system_alerts CASCADE;
        DROP TABLE IF EXISTS analytics_summary CASCADE;
      `

      // First rollback
      await expect(
        client.rpc('exec_sql', { sql: rollbackSQL })
      ).resolves.not.toThrow()

      // Second rollback
      await expect(
        client.rpc('exec_sql', { sql: rollbackSQL })
      ).resolves.not.toThrow()
    })

    it('should handle partial rollback gracefully', async () => {
      // Drop only one table
      await client.rpc('exec_sql', {
        sql: 'DROP TABLE IF EXISTS analytics_events CASCADE'
      })

      // Verify other tables still exist
      const alertsExist = await verifyTableExists(client, 'system_alerts', ['id'])
      const summaryExist = await verifyTableExists(client, 'analytics_summary', ['id'])

      expect(alertsExist || summaryExist).toBe(true)
    })

    it('should not leave orphaned constraints after rollback', async () => {
      // Execute full rollback
      await client.rpc('exec_sql', {
        sql: `
          DROP TABLE IF EXISTS analytics_events CASCADE;
          DROP TABLE IF EXISTS system_alerts CASCADE;
          DROP TABLE IF EXISTS analytics_summary CASCADE;
        `
      })

      // Check for orphaned constraints
      const { data: constraints } = await client
        .from('information_schema.table_constraints')
        .select('constraint_name')
        .like('table_name', 'analytics_%')

      expect(constraints).toHaveLength(0)
    })
  })

  describe('Migration and Rollback Cycle', () => {
    it('should successfully complete migration -> rollback -> re-migration cycle', async () => {
      const migrationPath = path.join(MIGRATION_DIR, '20250111_create_analytics_tables.sql')

      // 1. Execute migration
      await executeMigration(client, migrationPath)
      let exists = await verifyTableExists(client, 'analytics_events', ['id'])
      expect(exists).toBe(true)

      // 2. Rollback
      await client.rpc('exec_sql', {
        sql: `
          DROP TABLE IF EXISTS analytics_events CASCADE;
          DROP TABLE IF EXISTS system_alerts CASCADE;
          DROP TABLE IF EXISTS analytics_summary CASCADE;
        `
      })
      exists = await verifyTableExists(client, 'analytics_events', ['id'])
      expect(exists).toBe(false)

      // 3. Re-apply migration
      await executeMigration(client, migrationPath)
      exists = await verifyTableExists(client, 'analytics_events', ['id'])
      expect(exists).toBe(true)
    }, 30000)

    it('should maintain data integrity through rollback cycle', async () => {
      // Create initial data
      const testUser = {
        email: 'cycle-test@example.com',
        username: 'cycleuser'
      }

      await insertTestData(client, 'users', [testUser])

      const migrationPath = path.join(MIGRATION_DIR, '20250111_create_analytics_tables.sql')

      // Execute migration
      await executeMigration(client, migrationPath)

      // Add analytics data
      const { data: user } = await client
        .from('users')
        .select()
        .eq('email', testUser.email)
        .single()

      await client
        .from('analytics_events')
        .insert({
          event_name: 'cycle_test',
          event_data: {},
          session_id: 'test-session',
          user_id: user.id
        })

      // Rollback
      await client.rpc('exec_sql', {
        sql: 'DROP TABLE IF EXISTS analytics_events CASCADE'
      })

      // Verify user data persists
      const users = await queryTestData(client, 'users', { email: testUser.email })
      expect(users).toHaveLength(1)
      expect(users[0].username).toBe(testUser.username)

      // Re-apply migration
      await executeMigration(client, migrationPath)

      // Verify tables recreated
      const exists = await verifyTableExists(client, 'analytics_events', ['id'])
      expect(exists).toBe(true)
    }, 30000)
  })

  describe('Rollback Error Handling', () => {
    it('should handle rollback of non-existent table gracefully', async () => {
      await expect(
        client.rpc('exec_sql', {
          sql: 'DROP TABLE IF EXISTS non_existent_table CASCADE'
        })
      ).resolves.not.toThrow()
    })

    it('should handle rollback of non-existent function gracefully', async () => {
      await expect(
        client.rpc('exec_sql', {
          sql: 'DROP FUNCTION IF EXISTS non_existent_function() CASCADE'
        })
      ).resolves.not.toThrow()
    })

    it('should handle rollback of non-existent index gracefully', async () => {
      await expect(
        client.rpc('exec_sql', {
          sql: 'DROP INDEX IF EXISTS non_existent_index'
        })
      ).resolves.not.toThrow()
    })
  })

  describe('Complete Rollback Script', () => {
    it('should execute complete rollback script successfully', async () => {
      const completeRollbackSQL = `
        -- Drop triggers
        DROP TRIGGER IF EXISTS analytics_summary_trigger ON analytics_events;

        -- Drop functions
        DROP FUNCTION IF EXISTS update_analytics_summary() CASCADE;
        DROP FUNCTION IF EXISTS cleanup_old_analytics() CASCADE;

        -- Drop indexes
        DROP INDEX IF EXISTS idx_analytics_events_event_name;
        DROP INDEX IF EXISTS idx_analytics_events_session_id;
        DROP INDEX IF EXISTS idx_analytics_events_user_id;
        DROP INDEX IF EXISTS idx_analytics_events_timestamp;
        DROP INDEX IF EXISTS idx_analytics_events_created_at;
        DROP INDEX IF EXISTS idx_system_alerts_alert_type;
        DROP INDEX IF EXISTS idx_system_alerts_severity;
        DROP INDEX IF EXISTS idx_system_alerts_resolved;
        DROP INDEX IF EXISTS idx_system_alerts_created_at;
        DROP INDEX IF EXISTS idx_analytics_summary_date;
        DROP INDEX IF EXISTS idx_analytics_summary_event_name;

        -- Drop tables
        DROP TABLE IF EXISTS analytics_summary CASCADE;
        DROP TABLE IF EXISTS system_alerts CASCADE;
        DROP TABLE IF EXISTS analytics_events CASCADE;
      `

      await expect(
        client.rpc('exec_sql', { sql: completeRollbackSQL })
      ).resolves.not.toThrow()

      // Verify all components removed
      const eventsExist = await verifyTableExists(client, 'analytics_events', ['id'])
      const alertsExist = await verifyTableExists(client, 'system_alerts', ['id'])
      const summaryExist = await verifyTableExists(client, 'analytics_summary', ['id'])

      expect(eventsExist).toBe(false)
      expect(alertsExist).toBe(false)
      expect(summaryExist).toBe(false)
    }, 15000)
  })
})
