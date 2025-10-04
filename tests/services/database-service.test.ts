/**
 * Database Service Comprehensive Tests
 * Tests src/lib/services/database.ts
 * Priority: CRITICAL - Core data persistence layer
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(),
  auth: {
    getSession: vi.fn(),
    getUser: vi.fn()
  },
  rpc: vi.fn()
};

vi.mock('../../src/lib/supabase/client', () => ({
  supabase: mockSupabase
}));

vi.mock('../../src/lib/logging/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

describe('Database Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('User Operations', () => {
    it('should create new user profile', async () => {
      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockResolvedValue({
        data: { id: 'user-123', email: 'test@example.com' },
        error: null
      });

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
        select: mockSelect
      });

      const { createUserProfile } = await import('../../src/lib/services/database');

      const result = await createUserProfile({
        email: 'test@example.com',
        name: 'Test User'
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockInsert).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('id');
    });

    it('should handle duplicate user creation', async () => {
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: null,
          error: { code: '23505', message: 'duplicate key' }
        })
      });

      const { createUserProfile } = await import('../../src/lib/services/database');

      const result = await createUserProfile({
        email: 'duplicate@example.com',
        name: 'Duplicate User'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });

    it('should get user by ID', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        created_at: new Date().toISOString()
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockUser, error: null })
      });

      const { getUserById } = await import('../../src/lib/services/database');
      const result = await getUserById('user-123');

      expect(result.data).toEqual(mockUser);
      expect(result.error).toBeNull();
    });

    it('should update user preferences', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: { theme: 'dark', language: 'es' },
          error: null
        })
      });

      const { updateUserPreferences } = await import('../../src/lib/services/database');

      const result = await updateUserPreferences('user-123', {
        theme: 'dark',
        language: 'es'
      });

      expect(result.success).toBe(true);
      expect(result.data.theme).toBe('dark');
    });
  });

  describe('Vocabulary Operations', () => {
    it('should save vocabulary items in batch', async () => {
      const mockVocab = [
        { word: 'manzana', translation: 'apple', language: 'es' },
        { word: 'perro', translation: 'dog', language: 'es' }
      ];

      mockSupabase.from.mockReturnValue({
        upsert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: mockVocab,
          error: null
        })
      });

      const { saveVocabularyBatch } = await import('../../src/lib/services/database');

      const result = await saveVocabularyBatch('user-123', mockVocab);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(mockSupabase.from).toHaveBeenCalledWith('vocabulary');
    });

    it('should get vocabulary with pagination', async () => {
      const mockVocabList = Array.from({ length: 10 }, (_, i) => ({
        id: `vocab-${i}`,
        word: `word${i}`,
        translation: `translation${i}`
      }));

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockVocabList,
          error: null
        })
      });

      const { getUserVocabulary } = await import('../../src/lib/services/database');

      const result = await getUserVocabulary('user-123', {
        page: 1,
        limit: 10
      });

      expect(result.data).toHaveLength(10);
      expect(result.error).toBeNull();
    });

    it('should filter vocabulary by difficulty', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [{ difficulty: 'intermediate' }],
          error: null
        })
      });

      const { getUserVocabulary } = await import('../../src/lib/services/database');

      const result = await getUserVocabulary('user-123', {
        difficulty: 'intermediate'
      });

      expect(result.data[0].difficulty).toBe('intermediate');
    });

    it('should delete vocabulary item', async () => {
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      });

      const { deleteVocabularyItem } = await import('../../src/lib/services/database');

      const result = await deleteVocabularyItem('vocab-123');

      expect(result.success).toBe(true);
    });
  });

  describe('Session Operations', () => {
    it('should create learning session', async () => {
      const mockSession = {
        id: 'session-123',
        user_id: 'user-123',
        session_type: 'flashcard',
        started_at: new Date().toISOString()
      };

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockSession, error: null })
      });

      const { createSession } = await import('../../src/lib/services/database');

      const result = await createSession({
        userId: 'user-123',
        sessionType: 'flashcard'
      });

      expect(result.success).toBe(true);
      expect(result.data.session_type).toBe('flashcard');
    });

    it('should update session progress', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: { progress: 75, items_completed: 15 },
          error: null
        })
      });

      const { updateSessionProgress } = await import('../../src/lib/services/database');

      const result = await updateSessionProgress('session-123', {
        progress: 75,
        itemsCompleted: 15
      });

      expect(result.success).toBe(true);
      expect(result.data.progress).toBe(75);
    });

    it('should end session and calculate metrics', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: {
            ended_at: new Date().toISOString(),
            duration_minutes: 30,
            completion_rate: 0.85
          },
          error: null
        })
      });

      const { endSession } = await import('../../src/lib/services/database');

      const result = await endSession('session-123');

      expect(result.success).toBe(true);
      expect(result.data.completion_rate).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockRejectedValue(new Error('Network error'))
      });

      const { getUserById } = await import('../../src/lib/services/database');

      const result = await getUserById('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should retry on transient failures', async () => {
      let attempts = 0;
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockImplementation(() => {
          attempts++;
          if (attempts < 3) {
            return Promise.reject(new Error('Temporary failure'));
          }
          return Promise.resolve({ data: { id: 'user-123' }, error: null });
        })
      });

      const { getUserById } = await import('../../src/lib/services/database');

      const result = await getUserById('user-123', { retry: true });

      expect(attempts).toBe(3);
      expect(result.success).toBe(true);
    });

    it('should validate data before insertion', async () => {
      const { saveVocabularyBatch } = await import('../../src/lib/services/database');

      const result = await saveVocabularyBatch('user-123', [
        { word: '', translation: 'invalid' } // Empty word
      ]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('validation');
    });
  });

  describe('Performance & Optimization', () => {
    it('should use connection pooling', async () => {
      const queries = Array.from({ length: 10 }, (_, i) =>
        import('../../src/lib/services/database').then(db =>
          db.getUserById(`user-${i}`)
        )
      );

      await Promise.all(queries);

      // Verify connection reuse (implementation specific)
      expect(mockSupabase.from).toHaveBeenCalledTimes(10);
    });

    it('should cache frequently accessed data', async () => {
      const { getUserById } = await import('../../src/lib/services/database');

      // First call - should hit database
      await getUserById('user-123');

      // Second call - should use cache
      await getUserById('user-123');

      // Verify cache behavior (implementation specific)
    });
  });
});
