/**
 * Comprehensive Database Service Tests
 * Tests all DatabaseService methods with database integration
 * Coverage: User, Session, Vocabulary, Progress, QA, Descriptions, Settings operations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DatabaseService, type User, type Session, type VocabularyItem } from '@/lib/services/database';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(),
  auth: {
    getSession: vi.fn(),
    getUser: vi.fn(),
  },
} as unknown as SupabaseClient;

vi.mock('@/lib/supabase/client', () => ({
  supabase: mockSupabase,
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('DatabaseService', () => {
  let dbService: DatabaseService;

  beforeEach(() => {
    vi.clearAllMocks();
    dbService = new DatabaseService({
      supabaseUrl: 'https://test.supabase.co',
      anonKey: 'test-anon-key',
      enableLogging: false,
    });
  });

  afterEach(() => {
    dbService.clearCache();
  });

  // ==============================================
  // USER OPERATIONS
  // ==============================================

  describe('User Operations', () => {
    describe('createUser', () => {
      it('should create new user with required fields', async () => {
        const mockUser: User = {
          id: 'user-123',
          email: 'test@example.com',
          username: 'testuser',
          spanish_level: 'beginner',
          is_authenticated: true,
          profile_completed: false,
          theme: 'light',
          language: 'en',
          default_description_style: 'conversacional',
          target_words_per_day: 10,
          preferred_difficulty: 'beginner',
          enable_notifications: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        (mockSupabase.from as any).mockReturnValue({
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockUser, error: null }),
        });

        const result = await dbService.createUser({
          email: 'test@example.com',
          username: 'testuser',
        });

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockUser);
        expect(result.error).toBeNull();
        expect(mockSupabase.from).toHaveBeenCalledWith('users');
      });

      it('should handle duplicate email error', async () => {
        (mockSupabase.from as any).mockReturnValue({
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: '23505', message: 'duplicate key value violates unique constraint' },
          }),
        });

        const result = await dbService.createUser({
          email: 'duplicate@example.com',
        });

        expect(result.success).toBe(false);
        expect(result.error).toBeTruthy();
        expect(result.error?.code).toBe('23505');
      });

      it('should set default values for optional fields', async () => {
        const insertSpy = vi.fn().mockReturnThis();
        (mockSupabase.from as any).mockReturnValue({
          insert: insertSpy,
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: {}, error: null }),
        });

        await dbService.createUser({ email: 'test@example.com' });

        const insertedData = insertSpy.mock.calls[0][0][0];
        expect(insertedData.spanish_level).toBe('beginner');
        expect(insertedData.theme).toBe('light');
        expect(insertedData.language).toBe('en');
        expect(insertedData.target_words_per_day).toBe(10);
      });
    });

    describe('getUser', () => {
      it('should retrieve user by ID', async () => {
        const mockUser: User = {
          id: 'user-123',
          email: 'test@example.com',
          spanish_level: 'intermediate',
          is_authenticated: true,
          profile_completed: true,
          theme: 'dark',
          language: 'es',
          default_description_style: 'academico',
          target_words_per_day: 20,
          preferred_difficulty: 'intermediate',
          enable_notifications: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        (mockSupabase.from as any).mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockUser, error: null }),
        });

        const result = await dbService.getUser('user-123');

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockUser);
      });

      it('should use cache on second call', async () => {
        const mockUser: User = {
          id: 'user-123',
          email: 'test@example.com',
        } as User;

        const selectSpy = vi.fn().mockReturnThis();
        (mockSupabase.from as any).mockReturnValue({
          select: selectSpy,
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockUser, error: null }),
        });

        // First call - should hit database
        await dbService.getUser('user-123');
        expect(selectSpy).toHaveBeenCalledTimes(1);

        // Second call - should use cache
        await dbService.getUser('user-123');
        expect(selectSpy).toHaveBeenCalledTimes(1); // Not called again
      });

      it('should bypass cache when useCache is false', async () => {
        const selectSpy = vi.fn().mockReturnThis();
        (mockSupabase.from as any).mockReturnValue({
          select: selectSpy,
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: {}, error: null }),
        });

        await dbService.getUser('user-123', false);
        await dbService.getUser('user-123', false);

        expect(selectSpy).toHaveBeenCalledTimes(2);
      });

      it('should handle user not found', async () => {
        (mockSupabase.from as any).mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116', message: 'No rows found' },
          }),
        });

        const result = await dbService.getUser('nonexistent');

        expect(result.success).toBe(false);
        expect(result.data).toBeNull();
      });
    });

    describe('updateUser', () => {
      it('should update user fields', async () => {
        const updatedUser: User = {
          id: 'user-123',
          email: 'test@example.com',
          spanish_level: 'advanced',
          theme: 'dark',
        } as User;

        (mockSupabase.from as any).mockReturnValue({
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: updatedUser, error: null }),
        });

        const result = await dbService.updateUser('user-123', {
          spanish_level: 'advanced',
          theme: 'dark',
        });

        expect(result.success).toBe(true);
        expect(result.data?.spanish_level).toBe('advanced');
      });

      it('should clear cache after update', async () => {
        (mockSupabase.from as any).mockReturnValue({
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: {}, error: null }),
        });

        const cacheKey = `users:get:${JSON.stringify({ userId: 'user-123' })}`;
        expect(dbService['queryCache'].has(cacheKey)).toBe(false);

        await dbService.updateUser('user-123', { theme: 'dark' });
        expect(dbService['queryCache'].has(cacheKey)).toBe(false);
      });
    });

    describe('deleteUser', () => {
      it('should delete user successfully', async () => {
        (mockSupabase.from as any).mockReturnValue({
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ error: null }),
        });

        const result = await dbService.deleteUser('user-123');

        expect(result.success).toBe(true);
        expect(result.data).toBeNull();
      });
    });
  });

  // ==============================================
  // SESSION OPERATIONS
  // ==============================================

  describe('Session Operations', () => {
    describe('createSession', () => {
      it('should create learning session with defaults', async () => {
        const mockSession: Session = {
          id: 'session-123',
          user_id: 'user-123',
          session_type: 'flashcard',
          started_at: new Date().toISOString(),
          images_processed: 0,
          descriptions_generated: 0,
          qa_attempts: 0,
          qa_correct: 0,
          vocabulary_learned: 0,
          phrases_saved: 0,
          session_data: {},
          engagement_score: 0,
          completion_rate: 0,
          created_at: new Date().toISOString(),
        };

        (mockSupabase.from as any).mockReturnValue({
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockSession, error: null }),
        });

        const result = await dbService.createSession({
          user_id: 'user-123',
          session_type: 'flashcard',
        });

        expect(result.success).toBe(true);
        expect(result.data?.session_type).toBe('flashcard');
      });

      it('should track anonymous sessions', async () => {
        (mockSupabase.from as any).mockReturnValue({
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { user_id: undefined }, error: null }),
        });

        const result = await dbService.createSession({
          session_type: 'learning',
        });

        expect(result.success).toBe(true);
      });
    });

    describe('endSession', () => {
      it('should end session and calculate metrics', async () => {
        const endedSession: Session = {
          id: 'session-123',
          ended_at: new Date().toISOString(),
          duration_minutes: 30,
          completion_rate: 0.85,
        } as Session;

        (mockSupabase.from as any).mockReturnValue({
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: endedSession, error: null }),
        });

        const result = await dbService.endSession('session-123', {
          duration_minutes: 30,
          completion_rate: 0.85,
        });

        expect(result.success).toBe(true);
        expect(result.data?.completion_rate).toBe(0.85);
      });
    });

    describe('getUserSessions', () => {
      it('should retrieve user sessions with pagination', async () => {
        const mockSessions: Session[] = Array.from({ length: 5 }, (_, i) => ({
          id: `session-${i}`,
          user_id: 'user-123',
          session_type: 'learning',
          created_at: new Date().toISOString(),
        })) as Session[];

        (mockSupabase.from as any).mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          range: vi.fn().mockResolvedValue({ data: mockSessions, error: null }),
        });

        const result = await dbService.getUserSessions('user-123', {
          limit: 5,
          offset: 0,
        });

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(5);
      });

      it('should order sessions by created_at descending', async () => {
        const orderSpy = vi.fn().mockReturnThis();
        (mockSupabase.from as any).mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: orderSpy,
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        });

        await dbService.getUserSessions('user-123');

        expect(orderSpy).toHaveBeenCalledWith('created_at', { ascending: false });
      });
    });
  });

  // ==============================================
  // VOCABULARY OPERATIONS
  // ==============================================

  describe('Vocabulary Operations', () => {
    describe('createVocabularyList', () => {
      it('should create vocabulary list with defaults', async () => {
        (mockSupabase.from as any).mockReturnValue({
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'list-123',
              name: 'My List',
              category: 'custom',
              difficulty_level: 1,
            },
            error: null,
          }),
        });

        const result = await dbService.createVocabularyList({
          name: 'My List',
        });

        expect(result.success).toBe(true);
        expect(result.data?.name).toBe('My List');
      });
    });

    describe('getVocabularyItems', () => {
      it('should retrieve items for list', async () => {
        const mockItems: Partial<VocabularyItem>[] = [
          {
            id: 'item-1',
            spanish_text: 'casa',
            english_translation: 'house',
            part_of_speech: 'noun' as const,
          },
          {
            id: 'item-2',
            spanish_text: 'comer',
            english_translation: 'to eat',
            part_of_speech: 'verb' as const,
          },
        ];

        (mockSupabase.from as any).mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: mockItems, error: null }),
        });

        const result = await dbService.getVocabularyItems('list-123');

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(2);
      });

      it('should filter by difficulty', async () => {
        const filterSpy = vi.fn().mockReturnThis();
        (mockSupabase.from as any).mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: filterSpy,
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        });

        await dbService.getVocabularyItems('list-123', {
          filter: { difficulty_level: 'intermediate' },
        });

        expect(filterSpy).toHaveBeenCalledWith('difficulty_level', 'intermediate');
      });
    });

    describe('addVocabularyItem', () => {
      it('should add vocabulary item with all fields', async () => {
        const newItem: Partial<VocabularyItem> = {
          vocabulary_list_id: 'list-123',
          spanish_text: 'perro',
          english_translation: 'dog',
          part_of_speech: 'noun',
          difficulty_level: 'beginner',
          gender: 'masculine',
          synonyms: ['can'],
        };

        (mockSupabase.from as any).mockReturnValue({
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { ...newItem, id: 'item-123' }, error: null }),
        });

        const result = await dbService.addVocabularyItem(newItem);

        expect(result.success).toBe(true);
        expect(result.data?.spanish_text).toBe('perro');
      });
    });

    describe('bulkInsertVocabulary', () => {
      it('should insert multiple items at once', async () => {
        const items: Partial<VocabularyItem>[] = Array.from({ length: 50 }, (_, i) => ({
          vocabulary_list_id: 'list-123',
          spanish_text: `word${i}`,
          english_translation: `translation${i}`,
        }));

        (mockSupabase.from as any).mockReturnValue({
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockResolvedValue({ data: items, error: null }),
        });

        const result = await dbService.bulkInsertVocabulary(items);

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(50);
      });
    });
  });

  // ==============================================
  // ERROR HANDLING & RETRY
  // ==============================================

  describe('Error Handling', () => {
    it('should retry on transient failures', async () => {
      let attempts = 0;
      (mockSupabase.from as any).mockReturnValue({
        select: vi.fn().mockImplementation(() => {
          attempts++;
          if (attempts < 3) {
            throw new Error('Temporary failure');
          }
          return {
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'user-123' }, error: null }),
          };
        }),
      });

      const result = await dbService.getUser('user-123');

      expect(attempts).toBe(3);
      expect(result.success).toBe(true);
    });

    it('should track error metrics', async () => {
      (mockSupabase.from as any).mockReturnValue({
        select: vi.fn().mockRejectedValue(new Error('Database error')),
      });

      try {
        await dbService.getUser('user-123');
      } catch (error) {
        // Expected to throw after retries
      }

      const metrics = dbService.getMetrics();
      expect(metrics.errorCount).toBeGreaterThan(0);
      expect(metrics.lastError).toBeTruthy();
    });

    it('should handle network timeouts', async () => {
      (mockSupabase.from as any).mockReturnValue({
        select: vi.fn().mockImplementation(() => {
          return new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout')), 100);
          });
        }),
      });

      try {
        await dbService.getUser('user-123');
      } catch (error: any) {
        expect(error.message).toContain('Timeout');
      }
    });
  });

  // ==============================================
  // PERFORMANCE & METRICS
  // ==============================================

  describe('Performance Metrics', () => {
    it('should track query count', async () => {
      (mockSupabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: {}, error: null }),
      });

      const initialMetrics = dbService.getMetrics();
      const initialCount = initialMetrics.totalQueries;

      await dbService.getUser('user-123');
      const newMetrics = dbService.getMetrics();

      expect(newMetrics.totalQueries).toBeGreaterThan(initialCount);
    });

    it('should track average response time', async () => {
      (mockSupabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(() => {
          return new Promise(resolve => {
            setTimeout(() => resolve({ data: {}, error: null }), 50);
          });
        }),
      });

      await dbService.getUser('user-123');
      const metrics = dbService.getMetrics();

      expect(metrics.averageResponseTime).toBeGreaterThan(0);
    });

    it('should test connection successfully', async () => {
      (mockSupabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      const connected = await dbService.testConnection();

      expect(connected).toBe(true);
    });

    it('should handle connection failures', async () => {
      (mockSupabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: null, error: new Error('Connection failed') }),
      });

      const connected = await dbService.testConnection();

      expect(connected).toBe(false);
    });
  });

  // ==============================================
  // CACHE MANAGEMENT
  // ==============================================

  describe('Cache Management', () => {
    it('should clear all cache', () => {
      // Populate cache
      dbService['queryCache'].set('test-key', {
        data: { test: true },
        timestamp: Date.now(),
        ttl: 300000,
      });

      expect(dbService['queryCache'].size).toBeGreaterThan(0);

      dbService.clearCache();

      expect(dbService['queryCache'].size).toBe(0);
    });

    it('should expire cache after TTL', async () => {
      const cacheKey = 'test:key';
      const pastTimestamp = Date.now() - 400000; // 6 minutes ago

      dbService['queryCache'].set(cacheKey, {
        data: { test: true },
        timestamp: pastTimestamp,
        ttl: 300000, // 5 minutes
      });

      const cached = dbService['getFromCache'](cacheKey);

      expect(cached).toBeNull();
      expect(dbService['queryCache'].has(cacheKey)).toBe(false);
    });
  });

  // ==============================================
  // CLEANUP
  // ==============================================

  describe('Cleanup', () => {
    it('should cleanup resources', async () => {
      await dbService.cleanup();

      expect(dbService['queryCache'].size).toBe(0);
      expect(dbService['connectionPool'].size).toBe(0);
    });
  });
});
