/**
 * Integration Tests for Services Using Migrated Schema
 * Tests that services correctly interact with the new database schema
 *
 * NOTE: These tests require a real Supabase database connection.
 * They are skipped when NEXT_PUBLIC_SUPABASE_URL is not configured.
 */

import { describe, it, expect, beforeAll, afterEach, beforeEach } from 'vitest'
import { SupabaseClient } from '@supabase/supabase-js'
import {
  createTestDatabaseClient,
  insertTestData,
  queryTestData,
  verifyTableExists,
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

describe.skipIf(!shouldRunTests)('Service Integration Tests', () => {
  let client: SupabaseClient

  beforeAll(async () => {
    client = createTestDatabaseClient()
  })

  beforeEach(async () => {
    // Schema verification only runs when tests actually run (shouldRunTests is true)
    const usersExist = await verifyTableExists(client, 'users', ['id'])
    const analyticsExist = await verifyTableExists(client, 'analytics_events', ['id'])

    expect(usersExist).toBe(true)
    expect(analyticsExist).toBe(true)
  })

  afterEach(async () => {
    // Clean up test data
    await client.from('analytics_events').delete().neq('id', 0)
    await client.from('sessions').delete().neq('id', '')
    await client.from('users').delete().like('email', '%integration-test%')
  })

  describe('User Service Integration', () => {
    it('should create user with default preferences', async () => {
      const userData = {
        email: 'user-service-integration-test@example.com',
        username: 'testuser',
        full_name: 'Test User'
      }

      const { data: user, error } = await client
        .from('users')
        .insert(userData)
        .select()
        .single()

      expect(error).toBeNull()
      expect(user).toBeTruthy()
      expect(user.email).toBe(userData.email)
      expect(user.spanish_level).toBe('beginner')
      expect(user.target_words_per_day).toBe(10)
      expect(user.created_at).toBeTruthy()
    })

    it('should update user preferences', async () => {
      const { data: user } = await client
        .from('users')
        .insert({ email: 'update-integration-test@example.com' })
        .select()
        .single()

      const { data: updated, error } = await client
        .from('users')
        .update({
          spanish_level: 'intermediate',
          target_words_per_day: 20,
          default_description_style: 'poetico'
        })
        .eq('id', user.id)
        .select()
        .single()

      expect(error).toBeNull()
      expect(updated.spanish_level).toBe('intermediate')
      expect(updated.target_words_per_day).toBe(20)
      expect(updated.default_description_style).toBe('poetico')
    })

    it('should retrieve user profile with settings', async () => {
      const { data: user } = await client
        .from('users')
        .insert({
          email: 'profile-integration-test@example.com',
          username: 'profileuser',
          spanish_level: 'advanced',
          theme: 'dark'
        })
        .select()
        .single()

      const { data: profile } = await client
        .from('users')
        .select('id, email, username, spanish_level, theme')
        .eq('id', user.id)
        .single()

      expect(profile).toBeTruthy()
      expect(profile.spanish_level).toBe('advanced')
      expect(profile.theme).toBe('dark')
    })
  })

  describe('Session Service Integration', () => {
    it('should create learning session for user', async () => {
      const { data: user } = await client
        .from('users')
        .insert({ email: 'session-integration-test@example.com' })
        .select()
        .single()

      const sessionData = {
        user_id: user.id,
        session_type: 'description',
        images_processed: 5
      }

      const { data: session, error } = await client
        .from('sessions')
        .insert(sessionData)
        .select()
        .single()

      expect(error).toBeNull()
      expect(session).toBeTruthy()
      expect(session.user_id).toBe(user.id)
      expect(session.session_type).toBe('description')
      expect(session.started_at).toBeTruthy()
    })

    it('should complete session with duration', async () => {
      const { data: user } = await client
        .from('users')
        .insert({ email: 'complete-session-integration-test@example.com' })
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

      // Wait a moment to simulate session duration
      await new Promise(resolve => setTimeout(resolve, 100))

      const { data: completed, error } = await client
        .from('sessions')
        .update({
          ended_at: new Date().toISOString(),
          duration_minutes: 15
        })
        .eq('id', session.id)
        .select()
        .single()

      expect(error).toBeNull()
      expect(completed.ended_at).toBeTruthy()
      expect(completed.duration_minutes).toBe(15)
    })

    it('should retrieve user session history', async () => {
      const { data: user } = await client
        .from('users')
        .insert({ email: 'history-integration-test@example.com' })
        .select()
        .single()

      // Create multiple sessions
      await client.from('sessions').insert([
        { user_id: user.id, session_type: 'description' },
        { user_id: user.id, session_type: 'qa' },
        { user_id: user.id, session_type: 'vocabulary' }
      ])

      const { data: sessions } = await client
        .from('sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })

      expect(sessions).toHaveLength(3)
      expect(sessions[0].session_type).toBeDefined()
    })
  })

  describe('Analytics Service Integration', () => {
    it('should track user events', async () => {
      const { data: user } = await client
        .from('users')
        .insert({ email: 'analytics-integration-test@example.com' })
        .select()
        .single()

      const eventData = {
        event_name: 'image_described',
        event_data: {
          image_id: 'img_123',
          style: 'narrativo',
          word_count: 150
        },
        session_id: 'sess_abc',
        user_id: user.id
      }

      const { data: event, error } = await client
        .from('analytics_events')
        .insert(eventData)
        .select()
        .single()

      expect(error).toBeNull()
      expect(event).toBeTruthy()
      expect(event.event_name).toBe('image_described')
      expect(event.event_data.style).toBe('narrativo')
    })

    it('should track events without user (anonymous)', async () => {
      const eventData = {
        event_name: 'page_view',
        event_data: { page: '/home' },
        session_id: 'anon_session'
      }

      const { data: event, error } = await client
        .from('analytics_events')
        .insert(eventData)
        .select()
        .single()

      expect(error).toBeNull()
      expect(event.user_id).toBeNull()
      expect(event.event_name).toBe('page_view')
    })

    it('should query events by time range', async () => {
      const now = new Date()
      const hourAgo = new Date(now.getTime() - 3600000)

      await client.from('analytics_events').insert([
        {
          event_name: 'test_event_1',
          event_data: {},
          session_id: 'test1',
          timestamp: now.toISOString()
        },
        {
          event_name: 'test_event_2',
          event_data: {},
          session_id: 'test2',
          timestamp: hourAgo.toISOString()
        }
      ])

      const { data: recentEvents } = await client
        .from('analytics_events')
        .select()
        .gte('timestamp', hourAgo.toISOString())

      expect(recentEvents?.length).toBeGreaterThanOrEqual(2)
    })

    it('should aggregate events in analytics_summary', async () => {
      // Insert multiple events for the same date/event_name
      const date = '2025-01-15'
      const eventName = 'summary_test'

      await client.from('analytics_events').insert([
        {
          event_name: eventName,
          event_data: {},
          session_id: 'sess1',
          timestamp: `${date}T10:00:00Z`
        },
        {
          event_name: eventName,
          event_data: {},
          session_id: 'sess2',
          timestamp: `${date}T11:00:00Z`
        },
        {
          event_name: eventName,
          event_data: {},
          session_id: 'sess3',
          timestamp: `${date}T12:00:00Z`
        }
      ])

      // Give trigger time to process
      await new Promise(resolve => setTimeout(resolve, 1000))

      const { data: summary } = await client
        .from('analytics_summary')
        .select()
        .eq('date', date)
        .eq('event_name', eventName)
        .single()

      expect(summary).toBeTruthy()
      expect(summary.count).toBeGreaterThanOrEqual(3)
      expect(summary.unique_sessions).toBeGreaterThanOrEqual(3)
    })
  })

  describe('System Alerts Integration', () => {
    it('should create system alert', async () => {
      const alertData = {
        alert_type: 'error',
        message: 'Test system alert',
        severity: 'high',
        event_data: { error_code: 'E001' }
      }

      const { data: alert, error } = await client
        .from('system_alerts')
        .insert(alertData)
        .select()
        .single()

      expect(error).toBeNull()
      expect(alert).toBeTruthy()
      expect(alert.severity).toBe('high')
      expect(alert.resolved).toBe(false)
    })

    it('should resolve system alert', async () => {
      const { data: user } = await client
        .from('users')
        .insert({ email: 'alert-resolver-integration-test@example.com' })
        .select()
        .single()

      const { data: alert } = await client
        .from('system_alerts')
        .insert({
          alert_type: 'warning',
          message: 'Test alert to resolve',
          severity: 'medium'
        })
        .select()
        .single()

      const { data: resolved, error } = await client
        .from('system_alerts')
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: user.id
        })
        .eq('id', alert.id)
        .select()
        .single()

      expect(error).toBeNull()
      expect(resolved.resolved).toBe(true)
      expect(resolved.resolved_by).toBe(user.id)
    })

    it('should filter alerts by severity', async () => {
      await client.from('system_alerts').insert([
        { alert_type: 'test', message: 'Low alert', severity: 'low' },
        { alert_type: 'test', message: 'High alert', severity: 'high' },
        { alert_type: 'test', message: 'Critical alert', severity: 'critical' }
      ])

      const { data: criticalAlerts } = await client
        .from('system_alerts')
        .select()
        .in('severity', ['high', 'critical'])

      expect(criticalAlerts?.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Cross-Service Operations', () => {
    it('should link user, session, and analytics together', async () => {
      // Create user
      const { data: user } = await client
        .from('users')
        .insert({ email: 'cross-service-integration-test@example.com' })
        .select()
        .single()

      // Create session
      const { data: session } = await client
        .from('sessions')
        .insert({
          user_id: user.id,
          session_type: 'mixed'
        })
        .select()
        .single()

      // Track analytics event
      const { data: event } = await client
        .from('analytics_events')
        .insert({
          event_name: 'session_started',
          event_data: { session_type: 'mixed' },
          session_id: session.id,
          user_id: user.id
        })
        .select()
        .single()

      // Verify relationships
      expect(session.user_id).toBe(user.id)
      expect(event.user_id).toBe(user.id)
      expect(event.session_id).toBe(session.id)

      // Query all related data
      const { data: userSessions } = await client
        .from('sessions')
        .select()
        .eq('user_id', user.id)

      const { data: sessionEvents } = await client
        .from('analytics_events')
        .select()
        .eq('session_id', session.id)

      expect(userSessions).toHaveLength(1)
      expect(sessionEvents).toHaveLength(1)
    })

    it('should maintain data consistency across cascades', async () => {
      const { data: user } = await client
        .from('users')
        .insert({ email: 'cascade-integration-test@example.com' })
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

      await client
        .from('analytics_events')
        .insert({
          event_name: 'cascade_test',
          event_data: {},
          session_id: session.id,
          user_id: user.id
        })

      // Delete user (should cascade to sessions, nullify analytics events)
      await client.from('users').delete().eq('id', user.id)

      // Verify cascade behavior
      const { data: deletedSessions } = await client
        .from('sessions')
        .select()
        .eq('id', session.id)

      const { data: orphanedEvents } = await client
        .from('analytics_events')
        .select()
        .eq('session_id', session.id)

      expect(deletedSessions).toHaveLength(0)
      expect(orphanedEvents?.[0]?.user_id).toBeNull()
    })
  })

  describe('Performance Under Load', () => {
    it('should handle bulk user operations', async () => {
      const users = Array.from({ length: 50 }, (_, i) => ({
        email: `bulk-user-${i}-integration-test@example.com`,
        username: `bulkuser${i}`
      }))

      const startTime = Date.now()

      const { error } = await client
        .from('users')
        .insert(users)

      const duration = Date.now() - startTime

      expect(error).toBeNull()
      expect(duration).toBeLessThan(5000)
    })

    it('should handle bulk analytics inserts', async () => {
      const events = Array.from({ length: 200 }, (_, i) => ({
        event_name: 'bulk_test',
        event_data: { index: i },
        session_id: `bulk-session-${i}`
      }))

      const startTime = Date.now()

      const { error } = await client
        .from('analytics_events')
        .insert(events)

      const duration = Date.now() - startTime

      expect(error).toBeNull()
      expect(duration).toBeLessThan(10000)
    })

    it('should perform efficient queries with indexes', async () => {
      // Insert test data
      await client.from('analytics_events').insert(
        Array.from({ length: 100 }, (_, i) => ({
          event_name: `indexed_event_${i % 5}`,
          event_data: {},
          session_id: `session-${i}`
        }))
      )

      const startTime = Date.now()

      await client
        .from('analytics_events')
        .select()
        .eq('event_name', 'indexed_event_2')

      const duration = Date.now() - startTime

      // Should be fast due to index
      expect(duration).toBeLessThan(200)
    })
  })

  describe('Error Handling', () => {
    it('should handle duplicate user email gracefully', async () => {
      const email = 'duplicate-integration-test@example.com'

      await client.from('users').insert({ email })

      const { error } = await client
        .from('users')
        .insert({ email })

      expect(error).toBeTruthy()
      expect(error?.code).toBe('23505')
    })

    it('should handle invalid foreign keys', async () => {
      const { error } = await client
        .from('sessions')
        .insert({
          user_id: '00000000-0000-0000-0000-000000000000',
          session_type: 'description'
        })

      expect(error).toBeTruthy()
      expect(error?.code).toBe('23503')
    })

    it('should validate enum values', async () => {
      const { error } = await client
        .from('users')
        .insert({
          email: 'enum-validation-integration-test@example.com',
          spanish_level: 'expert' as any // Invalid enum value
        })

      expect(error).toBeTruthy()
    })
  })
})
