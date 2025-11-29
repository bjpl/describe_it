/**
 * Comprehensive Tests for Database Schema Migration
 * Tests the execution of migration 001_initial_schema.sql and 20250111_create_analytics_tables.sql
 *
 * NOTE: These tests require a real Supabase database connection and are skipped by default.
 * Set SUPABASE_RUN_INTEGRATION_TESTS=true to run them.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { SupabaseClient } from '@supabase/supabase-js'
import path from 'path'
import {
  createTestDatabaseClient,
  executeMigration,
  verifyTableExists,
  verifyEnumExists,
  verifyRLSEnabled,
  verifyIndexExists,
  verifyFunctionExists,
  verifyTriggerExists,
  cleanupTestDatabase,
  captureSchemaSnapshot,
  SchemaSnapshot
} from './test-helpers'

// Skip all tests unless explicitly enabled via SUPABASE_RUN_INTEGRATION_TESTS=true
// These tests require a real database with the correct schema set up
const runIntegrationTests = process.env.SUPABASE_RUN_INTEGRATION_TESTS === 'true'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const hasValidConfig = supabaseUrl && supabaseUrl.length > 0 && supabaseKey && supabaseKey.length > 0

// Only run if explicitly enabled AND config is valid
const shouldRunTests = runIntegrationTests && hasValidConfig

describe.skipIf(!shouldRunTests)('Database Schema Migration Tests', () => {
  let client: SupabaseClient
  let preMigrationSnapshot: SchemaSnapshot | null = null
  const MIGRATION_DIR = path.join(process.cwd(), 'supabase', 'migrations')

  beforeAll(async () => {
    client = createTestDatabaseClient()

    // Capture pre-migration state
    try {
      preMigrationSnapshot = await captureSchemaSnapshot(client)
    } catch (error) {
      console.log('No existing schema to snapshot')
    }
  })

  afterAll(async () => {
    // Optional: Clean up test database
    // await cleanupTestDatabase(client)
  })

  describe('Migration Execution', () => {
    it('should execute initial schema migration without errors', async () => {
      const migrationPath = path.join(MIGRATION_DIR, '001_initial_schema.sql')

      await expect(
        executeMigration(client, migrationPath)
      ).resolves.not.toThrow()
    }, 30000)

    it('should execute analytics tables migration without errors', async () => {
      const migrationPath = path.join(MIGRATION_DIR, '20250111_create_analytics_tables.sql')

      await expect(
        executeMigration(client, migrationPath)
      ).resolves.not.toThrow()
    }, 30000)

    it('should be idempotent - running again should not fail', async () => {
      const migrationPath = path.join(MIGRATION_DIR, '20250111_create_analytics_tables.sql')

      // Execute migration again
      await expect(
        executeMigration(client, migrationPath)
      ).resolves.not.toThrow()
    }, 30000)
  })

  describe('Enum Types', () => {
    it('should create spanish_level enum', async () => {
      const exists = await verifyEnumExists(
        client,
        'spanish_level',
        ['beginner', 'intermediate', 'advanced']
      )
      expect(exists).toBe(true)
    })

    it('should create session_type enum', async () => {
      const exists = await verifyEnumExists(
        client,
        'session_type',
        ['description', 'qa', 'vocabulary', 'mixed']
      )
      expect(exists).toBe(true)
    })

    it('should create description_style enum', async () => {
      const exists = await verifyEnumExists(
        client,
        'description_style',
        ['narrativo', 'poetico', 'academico', 'conversacional', 'infantil', 'creativo', 'tecnico']
      )
      expect(exists).toBe(true)
    })

    it('should create difficulty_level enum', async () => {
      const exists = await verifyEnumExists(
        client,
        'difficulty_level',
        ['beginner', 'intermediate', 'advanced']
      )
      expect(exists).toBe(true)
    })

    it('should create qa_difficulty enum', async () => {
      const exists = await verifyEnumExists(
        client,
        'qa_difficulty',
        ['facil', 'medio', 'dificil']
      )
      expect(exists).toBe(true)
    })
  })

  describe('Core Tables Structure', () => {
    it('should create users table with all required columns', async () => {
      const exists = await verifyTableExists(client, 'users', [
        'id',
        'email',
        'username',
        'full_name',
        'avatar_url',
        'spanish_level',
        'is_authenticated',
        'profile_completed',
        'theme',
        'language',
        'default_description_style',
        'target_words_per_day',
        'preferred_difficulty',
        'enable_notifications',
        'created_at',
        'updated_at',
        'last_login'
      ])
      expect(exists).toBe(true)
    })

    it('should create sessions table with all required columns', async () => {
      const exists = await verifyTableExists(client, 'sessions', [
        'id',
        'user_id',
        'session_type',
        'started_at',
        'ended_at',
        'duration_minutes',
        'images_processed'
      ])
      expect(exists).toBe(true)
    })

    it('should create vocabulary_words table', async () => {
      const exists = await verifyTableExists(client, 'vocabulary_words', [
        'id',
        'spanish_word',
        'english_translation',
        'part_of_speech',
        'difficulty_level'
      ])
      expect(exists).toBe(true)
    })

    it('should create user_vocabulary table', async () => {
      const exists = await verifyTableExists(client, 'user_vocabulary', [
        'id',
        'user_id',
        'word_id',
        'learning_phase',
        'times_reviewed',
        'last_reviewed_at'
      ])
      expect(exists).toBe(true)
    })
  })

  describe('Analytics Tables Structure', () => {
    it('should create analytics_events table', async () => {
      const exists = await verifyTableExists(client, 'analytics_events', [
        'id',
        'event_name',
        'event_data',
        'session_id',
        'user_id',
        'user_tier',
        'timestamp',
        'properties',
        'created_at'
      ])
      expect(exists).toBe(true)
    })

    it('should create system_alerts table', async () => {
      const exists = await verifyTableExists(client, 'system_alerts', [
        'id',
        'alert_type',
        'message',
        'event_data',
        'severity',
        'resolved',
        'resolved_at',
        'resolved_by',
        'created_at'
      ])
      expect(exists).toBe(true)
    })

    it('should create analytics_summary table', async () => {
      const exists = await verifyTableExists(client, 'analytics_summary', [
        'id',
        'date',
        'event_name',
        'count',
        'unique_users',
        'unique_sessions',
        'metadata',
        'created_at',
        'updated_at'
      ])
      expect(exists).toBe(true)
    })
  })

  describe('Indexes', () => {
    it('should create analytics_events indexes', async () => {
      const indexes = [
        'idx_analytics_events_event_name',
        'idx_analytics_events_session_id',
        'idx_analytics_events_user_id',
        'idx_analytics_events_timestamp',
        'idx_analytics_events_created_at'
      ]

      for (const indexName of indexes) {
        const exists = await verifyIndexExists(client, indexName)
        expect(exists).toBe(true)
      }
    })

    it('should create system_alerts indexes', async () => {
      const indexes = [
        'idx_system_alerts_alert_type',
        'idx_system_alerts_severity',
        'idx_system_alerts_resolved',
        'idx_system_alerts_created_at'
      ]

      for (const indexName of indexes) {
        const exists = await verifyIndexExists(client, indexName)
        expect(exists).toBe(true)
      }
    })

    it('should create analytics_summary indexes', async () => {
      const indexes = [
        'idx_analytics_summary_date',
        'idx_analytics_summary_event_name'
      ]

      for (const indexName of indexes) {
        const exists = await verifyIndexExists(client, indexName)
        expect(exists).toBe(true)
      }
    })
  })

  describe('Row Level Security (RLS)', () => {
    it('should enable RLS on analytics_events table', async () => {
      const enabled = await verifyRLSEnabled(client, 'analytics_events')
      expect(enabled).toBe(true)
    })

    it('should enable RLS on system_alerts table', async () => {
      const enabled = await verifyRLSEnabled(client, 'system_alerts')
      expect(enabled).toBe(true)
    })

    it('should enable RLS on analytics_summary table', async () => {
      const enabled = await verifyRLSEnabled(client, 'analytics_summary')
      expect(enabled).toBe(true)
    })

    it('should enable RLS on users table', async () => {
      const enabled = await verifyRLSEnabled(client, 'users')
      expect(enabled).toBe(true)
    })
  })

  describe('Functions and Triggers', () => {
    it('should create update_analytics_summary function', async () => {
      const exists = await verifyFunctionExists(client, 'update_analytics_summary')
      expect(exists).toBe(true)
    })

    it('should create cleanup_old_analytics function', async () => {
      const exists = await verifyFunctionExists(client, 'cleanup_old_analytics')
      expect(exists).toBe(true)
    })

    it('should create analytics_summary_trigger', async () => {
      const exists = await verifyTriggerExists(
        client,
        'analytics_summary_trigger',
        'analytics_events'
      )
      expect(exists).toBe(true)
    })

    it('should create update_updated_at_column function', async () => {
      const exists = await verifyFunctionExists(client, 'update_updated_at_column')
      expect(exists).toBe(true)
    })
  })

  describe('Constraints', () => {
    it('should enforce email uniqueness on users table', async () => {
      const { data: user1 } = await client
        .from('users')
        .insert({ email: 'test@example.com' })
        .select()
        .single()

      expect(user1).toBeTruthy()

      // Try to insert duplicate email
      const { error } = await client
        .from('users')
        .insert({ email: 'test@example.com' })

      expect(error).toBeTruthy()
      expect(error?.message).toContain('unique')
    })

    it('should enforce valid email format constraint', async () => {
      const { error } = await client
        .from('users')
        .insert({ email: 'invalid-email' })

      expect(error).toBeTruthy()
    })

    it('should enforce foreign key constraints', async () => {
      // Try to insert session with non-existent user_id
      const { error } = await client
        .from('sessions')
        .insert({
          user_id: '00000000-0000-0000-0000-000000000000',
          session_type: 'description'
        })

      expect(error).toBeTruthy()
      expect(error?.message).toContain('foreign key')
    })

    it('should enforce check constraints on analytics_summary', async () => {
      // Unique constraint on (date, event_name)
      const testDate = '2025-01-01'
      const eventName = 'test_event'

      await client
        .from('analytics_summary')
        .insert({
          date: testDate,
          event_name: eventName,
          count: 1
        })

      // Try to insert duplicate
      const { error } = await client
        .from('analytics_summary')
        .insert({
          date: testDate,
          event_name: eventName,
          count: 2
        })

      expect(error).toBeTruthy()
      expect(error?.message).toContain('unique')
    })
  })

  describe('Data Integrity', () => {
    it('should cascade delete sessions when user is deleted', async () => {
      // Create user
      const { data: user } = await client
        .from('users')
        .insert({ email: 'cascade-test@example.com' })
        .select()
        .single()

      expect(user).toBeTruthy()

      // Create session
      const { data: session } = await client
        .from('sessions')
        .insert({
          user_id: user.id,
          session_type: 'description'
        })
        .select()
        .single()

      expect(session).toBeTruthy()

      // Delete user
      await client
        .from('users')
        .delete()
        .eq('id', user.id)

      // Verify session was deleted
      const { data: deletedSession } = await client
        .from('sessions')
        .select()
        .eq('id', session.id)
        .single()

      expect(deletedSession).toBeNull()
    })

    it('should set null on analytics_events when user is deleted', async () => {
      // Create user
      const { data: user } = await client
        .from('users')
        .insert({ email: 'analytics-test@example.com' })
        .select()
        .single()

      expect(user).toBeTruthy()

      // Create analytics event
      const { data: event } = await client
        .from('analytics_events')
        .insert({
          event_name: 'test_event',
          event_data: {},
          session_id: 'test-session',
          user_id: user.id
        })
        .select()
        .single()

      expect(event).toBeTruthy()

      // Delete user
      await client
        .from('users')
        .delete()
        .eq('id', user.id)

      // Verify event still exists but user_id is null
      const { data: updatedEvent } = await client
        .from('analytics_events')
        .select()
        .eq('id', event.id)
        .single()

      expect(updatedEvent).toBeTruthy()
      expect(updatedEvent.user_id).toBeNull()
    })
  })

  describe('Performance', () => {
    it('should execute migration in reasonable time', async () => {
      const startTime = Date.now()
      const migrationPath = path.join(MIGRATION_DIR, '20250111_create_analytics_tables.sql')

      await executeMigration(client, migrationPath)

      const duration = Date.now() - startTime
      expect(duration).toBeLessThan(10000) // Should complete in under 10 seconds
    }, 15000)

    it('should handle bulk inserts efficiently', async () => {
      const events = Array.from({ length: 100 }, (_, i) => ({
        event_name: 'bulk_test',
        event_data: { index: i },
        session_id: `session-${i}`,
        timestamp: new Date().toISOString()
      }))

      const startTime = Date.now()

      const { error } = await client
        .from('analytics_events')
        .insert(events)

      const duration = Date.now() - startTime

      expect(error).toBeNull()
      expect(duration).toBeLessThan(5000) // Should complete in under 5 seconds
    }, 10000)
  })

  describe('Type Safety', () => {
    it('should reject invalid enum values', async () => {
      const { error } = await client
        .from('users')
        .insert({
          email: 'enum-test@example.com',
          spanish_level: 'invalid_level' as any
        })

      expect(error).toBeTruthy()
    })

    it('should enforce JSONB type for event_data', async () => {
      const { data, error } = await client
        .from('analytics_events')
        .insert({
          event_name: 'json_test',
          event_data: { key: 'value', nested: { data: 123 } },
          session_id: 'test-session'
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data?.event_data).toEqual({ key: 'value', nested: { data: 123 } })
    })
  })
})
