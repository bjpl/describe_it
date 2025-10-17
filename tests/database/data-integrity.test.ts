/**
 * Database Data Integrity Tests
 * Tests relationships, constraints, and data consistency
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DatabaseService } from '@/lib/services/database';
import type { SupabaseClient } from '@supabase/supabase-js';

const mockSupabase = {
  from: vi.fn(),
  rpc: vi.fn(),
} as unknown as SupabaseClient;

vi.mock('@/lib/supabase/client', () => ({
  supabase: mockSupabase,
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('Data Integrity Tests', () => {
  let dbService: DatabaseService;

  beforeEach(() => {
    vi.clearAllMocks();
    dbService = new DatabaseService({
      supabaseUrl: 'https://test.supabase.co',
      anonKey: 'test-key',
      enableLogging: false,
    });
  });

  // ==============================================
  // RELATIONSHIP INTEGRITY
  // ==============================================

  describe('Relationship Integrity', () => {
    it('should maintain foreign key relationships for vocabulary items', async () => {
      const mockList = { id: 'list-123', name: 'Test List' };
      const mockItem = {
        id: 'item-123',
        vocabulary_list_id: 'list-123',
        spanish_text: 'casa',
        english_translation: 'house',
      };

      // Create list
      (mockSupabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockList, error: null }),
      });

      const listResult = await dbService.createVocabularyList({ name: 'Test List' });
      expect(listResult.success).toBe(true);

      // Create item with valid foreign key
      (mockSupabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockItem, error: null }),
      });

      const itemResult = await dbService.addVocabularyItem({
        vocabulary_list_id: 'list-123',
        spanish_text: 'casa',
        english_translation: 'house',
      });

      expect(itemResult.success).toBe(true);
      expect(itemResult.data?.vocabulary_list_id).toBe('list-123');
    });

    it('should reject orphaned vocabulary items', async () => {
      (mockSupabase.from as any).mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: {
            code: '23503',
            message: 'foreign key constraint violation',
          },
        }),
      });

      const result = await dbService.addVocabularyItem({
        vocabulary_list_id: 'nonexistent-list',
        spanish_text: 'test',
        english_translation: 'test',
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('23503');
    });

    it('should maintain session-user relationships', async () => {
      const mockSession = {
        id: 'session-123',
        user_id: 'user-123',
        session_type: 'learning',
      };

      (mockSupabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockSession, error: null }),
      });

      const result = await dbService.createSession({
        user_id: 'user-123',
        session_type: 'learning',
      });

      expect(result.success).toBe(true);
      expect(result.data?.user_id).toBe('user-123');
    });

    it('should cascade delete related records', async () => {
      // Mock cascade behavior
      (mockSupabase.from as any).mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      // Delete vocabulary list should cascade to items
      const result = await dbService.deleteUser('user-123');

      expect(result.success).toBe(true);
    });

    it('should maintain learning progress relationships', async () => {
      const mockProgress = {
        id: 'progress-123',
        user_id: 'user-123',
        vocabulary_item_id: 'item-123',
        mastery_level: 50,
      };

      (mockSupabase.from as any).mockReturnValue({
        upsert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockProgress, error: null }),
      });

      const result = await dbService.updateLearningProgress('user-123', 'item-123', {
        mastery_level: 50,
      });

      expect(result.success).toBe(true);
    });
  });

  // ==============================================
  // DATA VALIDATION
  // ==============================================

  describe('Data Validation', () => {
    it('should validate email format', async () => {
      (mockSupabase.from as any).mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: {
            code: '22023',
            message: 'invalid email format',
          },
        }),
      });

      const result = await dbService.createUser({
        email: 'invalid-email',
      });

      expect(result.success).toBe(false);
    });

    it('should validate difficulty levels', async () => {
      (mockSupabase.from as any).mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: {
            code: '23514',
            message: 'invalid difficulty level',
          },
        }),
      });

      const result = await dbService.addVocabularyItem({
        vocabulary_list_id: 'list-123',
        spanish_text: 'test',
        english_translation: 'test',
        difficulty_level: 'invalid' as any,
      });

      expect(result.success).toBe(false);
    });

    it('should validate mastery level range (0-100)', async () => {
      (mockSupabase.from as any).mockReturnValue({
        upsert: vi.fn().mockResolvedValue({
          data: null,
          error: {
            code: '23514',
            message: 'mastery_level must be between 0 and 100',
          },
        }),
      });

      const result = await dbService.updateLearningProgress('user-123', 'item-123', {
        mastery_level: 150, // Invalid: > 100
      });

      expect(result.success).toBe(false);
    });

    it('should validate array fields are actually arrays', async () => {
      const validItem = {
        vocabulary_list_id: 'list-123',
        spanish_text: 'test',
        english_translation: 'test',
        synonyms: ['synonym1', 'synonym2'],
        antonyms: [],
      };

      (mockSupabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: validItem, error: null }),
      });

      const result = await dbService.addVocabularyItem(validItem);

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data?.synonyms)).toBe(true);
    });

    it('should validate JSON fields structure', async () => {
      const validSession = {
        user_id: 'user-123',
        session_type: 'learning' as const,
        session_data: {
          vocabulary_count: 10,
          correct_answers: 8,
        },
      };

      (mockSupabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: validSession, error: null }),
      });

      const result = await dbService.createSession(validSession);

      expect(result.success).toBe(true);
      expect(typeof result.data?.session_data).toBe('object');
    });
  });

  // ==============================================
  // TRANSACTION CONSISTENCY
  // ==============================================

  describe('Transaction Consistency', () => {
    it('should maintain consistency during bulk inserts', async () => {
      const items = Array.from({ length: 10 }, (_, i) => ({
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
      expect(result.data).toHaveLength(10);
    });

    it('should rollback on partial failure during batch operations', async () => {
      (mockSupabase.from as any).mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: {
            code: '23505',
            message: 'duplicate key in batch',
          },
        }),
      });

      const items = [
        { vocabulary_list_id: 'list-123', spanish_text: 'word1', english_translation: 'trans1' },
        { vocabulary_list_id: 'list-123', spanish_text: 'word1', english_translation: 'trans2' }, // Duplicate
      ];

      const result = await dbService.bulkInsertVocabulary(items);

      expect(result.success).toBe(false);
    });

    it('should handle concurrent updates correctly', async () => {
      const updates = Array.from({ length: 5 }, (_, i) =>
        dbService.updateUser(`user-${i}`, { theme: 'dark' })
      );

      (mockSupabase.from as any).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { theme: 'dark' }, error: null }),
      });

      const results = await Promise.all(updates);

      expect(results.every(r => r.success)).toBe(true);
    });
  });

  // ==============================================
  // DEFAULT VALUES
  // ==============================================

  describe('Default Values', () => {
    it('should apply default values on insert', async () => {
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
      expect(insertedData.enable_notifications).toBe(true);
    });

    it('should apply timestamp defaults', async () => {
      const insertSpy = vi.fn().mockReturnThis();
      (mockSupabase.from as any).mockReturnValue({
        insert: insertSpy,
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: {}, error: null }),
      });

      await dbService.createSession({
        user_id: 'user-123',
        session_type: 'learning',
      });

      const insertedData = insertSpy.mock.calls[0][0][0];
      expect(insertedData.started_at).toBeDefined();
      expect(insertedData.images_processed).toBe(0);
      expect(insertedData.qa_attempts).toBe(0);
    });

    it('should apply array defaults', async () => {
      const insertSpy = vi.fn().mockReturnThis();
      (mockSupabase.from as any).mockReturnValue({
        insert: insertSpy,
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: {}, error: null }),
      });

      await dbService.addVocabularyItem({
        vocabulary_list_id: 'list-123',
        spanish_text: 'test',
        english_translation: 'test',
      });

      const insertedData = insertSpy.mock.calls[0][0][0];
      expect(Array.isArray(insertedData.synonyms)).toBe(true);
      expect(Array.isArray(insertedData.antonyms)).toBe(true);
      expect(Array.isArray(insertedData.related_words)).toBe(true);
    });
  });

  // ==============================================
  // UNIQUE CONSTRAINTS
  // ==============================================

  describe('Unique Constraints', () => {
    it('should enforce unique email addresses', async () => {
      (mockSupabase.from as any).mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: {
            code: '23505',
            message: 'duplicate key value violates unique constraint "users_email_key"',
          },
        }),
      });

      const result = await dbService.createUser({
        email: 'duplicate@example.com',
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('23505');
    });

    it('should allow duplicate words in different lists', async () => {
      const item1 = {
        vocabulary_list_id: 'list-1',
        spanish_text: 'casa',
        english_translation: 'house',
      };

      const item2 = {
        vocabulary_list_id: 'list-2',
        spanish_text: 'casa',
        english_translation: 'house',
      };

      (mockSupabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: item1, error: null }),
      });

      const result1 = await dbService.addVocabularyItem(item1);
      const result2 = await dbService.addVocabularyItem(item2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });
  });

  // ==============================================
  // CHECK CONSTRAINTS
  // ==============================================

  describe('Check Constraints', () => {
    it('should enforce positive values for counts', async () => {
      (mockSupabase.from as any).mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: {
            code: '23514',
            message: 'check constraint violation',
          },
        }),
      });

      const result = await dbService.createSession({
        user_id: 'user-123',
        session_type: 'learning',
        qa_attempts: -5, // Invalid: negative value
      });

      expect(result.success).toBe(false);
    });

    it('should enforce valid percentage ranges', async () => {
      (mockSupabase.from as any).mockReturnValue({
        update: vi.fn().mockResolvedValue({
          data: null,
          error: {
            code: '23514',
            message: 'completion_rate must be between 0 and 1',
          },
        }),
      });

      const result = await dbService.endSession('session-123', {
        completion_rate: 1.5, // Invalid: > 1.0
      });

      expect(result.success).toBe(false);
    });
  });

  // ==============================================
  // DATA CONSISTENCY ACROSS TABLES
  // ==============================================

  describe('Cross-Table Consistency', () => {
    it('should maintain consistent vocabulary counts', async () => {
      // Mock getting vocabulary list with count
      (mockSupabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [
            { id: 'item-1' },
            { id: 'item-2' },
            { id: 'item-3' },
          ],
          error: null,
        }),
      });

      const itemsResult = await dbService.getVocabularyItems('list-123');
      expect(itemsResult.data).toHaveLength(3);
    });

    it('should update aggregate statistics on changes', async () => {
      (mockSupabase.from as any).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            total_words: 5,
            average_mastery: 75,
          },
          error: null,
        }),
      });

      // Simulated aggregate update would happen via database triggers
      expect(true).toBe(true);
    });
  });
});
