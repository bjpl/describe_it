/**
 * Comprehensive Schema Validation Tests
 * Validates schema integrity, constraints, and business rules
 *
 * NOTE: These tests require a real Supabase database connection.
 * They are skipped when NEXT_PUBLIC_SUPABASE_URL is not configured.
 */

import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import { SupabaseClient } from '@supabase/supabase-js'
import {
  createTestDatabaseClient,
  verifyTableExists,
  verifyEnumExists,
  verifyRLSEnabled,
  verifyIndexExists,
  insertTestData,
  queryTestData,
  retryOperation
} from './test-helpers'

// Skip all tests unless explicitly enabled via SUPABASE_RUN_INTEGRATION_TESTS=true
// These tests require a real database with the correct schema set up
const runIntegrationTests = process.env.SUPABASE_RUN_INTEGRATION_TESTS === 'true'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const hasValidConfig = supabaseUrl && supabaseUrl.length > 0 && supabaseKey && supabaseKey.length > 0

// Only run if explicitly enabled AND config is valid
const shouldRunTests = runIntegrationTests && hasValidConfig

describe.skipIf(!shouldRunTests)('Schema Validation Tests', () => {
  let client: SupabaseClient

  beforeAll(async () => {
    client = createTestDatabaseClient()
  })

  afterEach(async () => {
    // Clean up test data after each test
    await client.from('analytics_events').delete().neq('id', 0)
    await client.from('sessions').delete().neq('id', '')
    await client.from('users').delete().like('email', '%test%')
  })

  describe('Schema Completeness', () => {
    it('should have all required tables', async () => {
      const requiredTables = [
        'users',
        'sessions',
        'vocabulary_words',
        'user_vocabulary',
        'analytics_events',
        'system_alerts',
        'analytics_summary'
      ]

      for (const table of requiredTables) {
        const exists = await verifyTableExists(client, table, ['id'])
        expect(exists).toBe(true)
      }
    })

    it('should have all required enums', async () => {
      const requiredEnums = [
        'spanish_level',
        'session_type',
        'description_style',
        'difficulty_level',
        'qa_difficulty',
        'vocabulary_category',
        'learning_phase'
      ]

      for (const enumName of requiredEnums) {
        const exists = await verifyEnumExists(client, enumName)
        expect(exists).toBe(true)
      }
    })

    it('should have RLS enabled on all user-facing tables', async () => {
      const rlsTables = [
        'users',
        'sessions',
        'user_vocabulary',
        'analytics_events',
        'system_alerts',
        'analytics_summary'
      ]

      for (const table of rlsTables) {
        const enabled = await verifyRLSEnabled(client, table)
        expect(enabled).toBe(true)
      }
    })

    it('should have all performance indexes', async () => {
      const requiredIndexes = [
        'idx_analytics_events_event_name',
        'idx_analytics_events_timestamp',
        'idx_analytics_summary_date',
        'idx_system_alerts_severity'
      ]

      for (const indexName of requiredIndexes) {
        const exists = await verifyIndexExists(client, indexName)
        expect(exists).toBe(true)
      }
    })
  })

  describe('Data Type Validation', () => {
    it('should enforce UUID type for id columns', async () => {
      const { data } = await client
        .from('users')
        .insert({ email: 'uuid-test@example.com' })
        .select('id')
        .single()

      expect(data?.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      )
    })

    it('should enforce JSONB type for structured data', async () => {
      const eventData = {
        action: 'click',
        target: 'button',
        metadata: { count: 42 }
      }

      const { data } = await client
        .from('analytics_events')
        .insert({
          event_name: 'test_jsonb',
          event_data: eventData,
          session_id: 'test-session'
        })
        .select()
        .single()

      expect(data?.event_data).toEqual(eventData)
      expect(typeof data?.event_data).toBe('object')
    })

    it('should enforce timestamp with timezone', async () => {
      const { data } = await client
        .from('analytics_events')
        .insert({
          event_name: 'timestamp_test',
          event_data: {},
          session_id: 'test-session',
          timestamp: new Date().toISOString()
        })
        .select('timestamp')
        .single()

      expect(data?.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })

    it('should enforce integer types correctly', async () => {
      const { data } = await client
        .from('analytics_summary')
        .insert({
          date: '2025-01-01',
          event_name: 'int_test',
          count: 100,
          unique_users: 50
        })
        .select()
        .single()

      expect(typeof data?.count).toBe('number')
      expect(typeof data?.unique_users).toBe('number')
      expect(Number.isInteger(data?.count)).toBe(true)
    })
  })

  describe('Constraint Validation', () => {
    it('should enforce email uniqueness', async () => {
      const email = 'unique-test@example.com'

      await client.from('users').insert({ email })

      const { error } = await client.from('users').insert({ email })

      expect(error).toBeTruthy()
      expect(error?.code).toBe('23505') // Unique violation
    })

    it('should enforce email format validation', async () => {
      const invalidEmails = [
        'not-an-email',
        '@example.com',
        'user@',
        'user @example.com',
        ''
      ]

      for (const email of invalidEmails) {
        const { error } = await client
          .from('users')
          .insert({ email })

        expect(error).toBeTruthy()
      }
    })

    it('should enforce username constraints', async () => {
      // Too short
      let { error } = await client
        .from('users')
        .insert({
          email: 'username-test1@example.com',
          username: 'ab'
        })
      expect(error).toBeTruthy()

      // Invalid characters
      ;({ error } = await client
        .from('users')
        .insert({
          email: 'username-test2@example.com',
          username: 'user name'
        }))
      expect(error).toBeTruthy()

      // Valid username
      ;({ error } = await client
        .from('users')
        .insert({
          email: 'username-test3@example.com',
          username: 'valid_user123'
        }))
      expect(error).toBeNull()
    })

    it('should enforce foreign key constraints', async () => {
      // Non-existent user_id
      const { error } = await client
        .from('sessions')
        .insert({
          user_id: '00000000-0000-0000-0000-000000000000',
          session_type: 'description'
        })

      expect(error).toBeTruthy()
      expect(error?.code).toBe('23503') // Foreign key violation
    })

    it('should enforce check constraints', async () => {
      // Invalid words_per_day
      const { error } = await client
        .from('users')
        .insert({
          email: 'check-test@example.com',
          target_words_per_day: 200 // Max is 100
        })

      expect(error).toBeTruthy()
    })

    it('should enforce NOT NULL constraints', async () => {
      // Missing required fields
      const { error } = await client
        .from('analytics_events')
        .insert({
          event_name: 'null_test'
          // Missing event_data and session_id
        })

      expect(error).toBeTruthy()
      expect(error?.code).toBe('23502') // Not null violation
    })

    it('should enforce unique constraint on analytics_summary', async () => {
      const record = {
        date: '2025-01-01',
        event_name: 'unique_test',
        count: 1
      }

      await client.from('analytics_summary').insert(record)

      const { error } = await client
        .from('analytics_summary')
        .insert(record)

      expect(error).toBeTruthy()
      expect(error?.code).toBe('23505')
    })
  })

  describe('Default Values', () => {
    it('should apply default values for users table', async () => {
      const { data } = await client
        .from('users')
        .insert({ email: 'defaults-test@example.com' })
        .select()
        .single()

      expect(data?.spanish_level).toBe('beginner')
      expect(data?.is_authenticated).toBe(false)
      expect(data?.profile_completed).toBe(false)
      expect(data?.target_words_per_day).toBe(10)
      expect(data?.enable_notifications).toBe(true)
    })

    it('should apply default timestamps', async () => {
      const { data } = await client
        .from('users')
        .insert({ email: 'timestamp-defaults@example.com' })
        .select()
        .single()

      expect(data?.created_at).toBeTruthy()
      expect(data?.updated_at).toBeTruthy()
      expect(new Date(data?.created_at)).toBeInstanceOf(Date)
    })

    it('should apply default JSONB values', async () => {
      const { data } = await client
        .from('analytics_events')
        .insert({
          event_name: 'default_jsonb',
          event_data: {},
          session_id: 'test-session'
        })
        .select()
        .single()

      expect(data?.properties).toEqual({})
    })

    it('should apply default user_tier', async () => {
      const { data } = await client
        .from('analytics_events')
        .insert({
          event_name: 'tier_test',
          event_data: {},
          session_id: 'test-session'
        })
        .select()
        .single()

      expect(data?.user_tier).toBe('free')
    })
  })

  describe('Cascade Behavior', () => {
    it('should cascade delete sessions when user is deleted', async () => {
      const { data: user } = await client
        .from('users')
        .insert({ email: 'cascade1@example.com' })
        .select()
        .single()

      const { data: session } = await client
        .from('sessions')
        .insert({
          user_id: user.id,
          session_type: 'description'
        })
        .select()
        .single()

      await client.from('users').delete().eq('id', user.id)

      const { data: deletedSession } = await client
        .from('sessions')
        .select()
        .eq('id', session.id)

      expect(deletedSession).toHaveLength(0)
    })

    it('should set null on analytics_events when user is deleted', async () => {
      const { data: user } = await client
        .from('users')
        .insert({ email: 'cascade2@example.com' })
        .select()
        .single()

      const { data: event } = await client
        .from('analytics_events')
        .insert({
          event_name: 'cascade_test',
          event_data: {},
          session_id: 'test-session',
          user_id: user.id
        })
        .select()
        .single()

      await client.from('users').delete().eq('id', user.id)

      const { data: updatedEvent } = await client
        .from('analytics_events')
        .select()
        .eq('id', event.id)
        .single()

      expect(updatedEvent?.user_id).toBeNull()
    })
  })

  describe('Index Performance', () => {
    it('should use index for event_name queries', async () => {
      // Insert test events
      await client.from('analytics_events').insert(
        Array.from({ length: 100 }, (_, i) => ({
          event_name: `event_${i % 10}`,
          event_data: {},
          session_id: `session-${i}`
        }))
      )

      const startTime = Date.now()

      await client
        .from('analytics_events')
        .select()
        .eq('event_name', 'event_5')

      const duration = Date.now() - startTime

      // Should be fast due to index
      expect(duration).toBeLessThan(100)
    })

    it('should use index for timestamp range queries', async () => {
      const now = new Date()
      const pastHour = new Date(now.getTime() - 3600000)

      const startTime = Date.now()

      await client
        .from('analytics_events')
        .select()
        .gte('timestamp', pastHour.toISOString())
        .lte('timestamp', now.toISOString())

      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(100)
    })
  })

  describe('Data Integrity', () => {
    it('should maintain referential integrity', async () => {
      const { data: user } = await client
        .from('users')
        .insert({ email: 'integrity@example.com' })
        .select()
        .single()

      const { data: session } = await client
        .from('sessions')
        .insert({
          user_id: user.id,
          session_type: 'qa'
        })
        .select()
        .single()

      // Verify relationship
      const { data: userSessions } = await client
        .from('sessions')
        .select('*')
        .eq('user_id', user.id)

      expect(userSessions).toHaveLength(1)
      expect(userSessions?.[0].id).toBe(session.id)
    })

    it('should prevent orphaned records', async () => {
      // Try to create session without user
      const { error } = await client
        .from('sessions')
        .insert({
          session_type: 'description'
          // Missing user_id
        })

      expect(error).toBeTruthy()
    })
  })

  describe('Concurrent Operations', () => {
    it('should handle concurrent inserts', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        client.from('analytics_events').insert({
          event_name: 'concurrent_test',
          event_data: { index: i },
          session_id: `session-${i}`
        })
      )

      const results = await Promise.all(promises)

      results.forEach(({ error }) => {
        expect(error).toBeNull()
      })
    })

    it('should handle concurrent updates safely', async () => {
      const { data: summary } = await client
        .from('analytics_summary')
        .insert({
          date: '2025-01-01',
          event_name: 'concurrent_update',
          count: 0
        })
        .select()
        .single()

      const promises = Array.from({ length: 5 }, () =>
        client
          .from('analytics_summary')
          .update({ count: client.rpc('increment_count') })
          .eq('id', summary.id)
      )

      await Promise.all(promises)

      const { data: updated } = await client
        .from('analytics_summary')
        .select()
        .eq('id', summary.id)
        .single()

      // Count should have been incremented
      expect(updated?.count).toBeGreaterThan(0)
    })
  })

  describe('Error Recovery', () => {
    it('should recover from failed transaction', async () => {
      try {
        await client.rpc('exec_sql', {
          sql: `
            BEGIN;
            INSERT INTO users (email) VALUES ('tx-test@example.com');
            INSERT INTO users (email) VALUES ('invalid-email');
            COMMIT;
          `
        })
      } catch (error) {
        // Transaction should fail
      }

      // First insert should be rolled back
      const { data } = await client
        .from('users')
        .select()
        .eq('email', 'tx-test@example.com')

      expect(data).toHaveLength(0)
    })
  })
})
