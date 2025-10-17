/**
 * Learning Flow Integration Tests
 * Tests: Search image → Generate description → Save → Review flow
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DatabaseService } from '@/lib/services/database';
import type { SupabaseClient } from '@supabase/supabase-js';

const mockSupabase = { from: vi.fn() } as unknown as SupabaseClient;

vi.mock('@/lib/supabase/client', () => ({ supabase: mockSupabase }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn() } }));

describe('Learning Flow Integration', () => {
  let dbService: DatabaseService;

  beforeEach(() => {
    vi.clearAllMocks();
    dbService = new DatabaseService({
      supabaseUrl: 'https://test.supabase.co',
      anonKey: 'test-key',
      enableLogging: false,
    });
  });

  describe('Complete Learning Session', () => {
    it('should complete full learning flow with image and description', async () => {
      const userId = 'user-123';
      const imageId = 'unsplash-123';

      // Step 1: Start learning session
      (mockSupabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'session-123',
            user_id: userId,
            session_type: 'learning',
            started_at: new Date().toISOString(),
          },
          error: null,
        }),
      });

      const session = await dbService.createSession({
        user_id: userId,
        session_type: 'learning',
      });

      expect(session.success).toBe(true);
      const sessionId = session.data!.id;

      // Step 2: Save generated description
      (mockSupabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'desc-123',
            user_id: userId,
            session_id: sessionId,
            image_id: imageId,
            english_description: 'A beautiful sunset over the ocean',
            spanish_description: 'Un hermoso atardecer sobre el océano',
            description_style: 'conversacional',
          },
          error: null,
        }),
      });

      const description = await dbService.saveDescription({
        user_id: userId,
        session_id: sessionId,
        image_id: imageId,
        english_description: 'A beautiful sunset over the ocean',
        spanish_description: 'Un hermoso atardecer sobre el océano',
        description_style: 'conversacional',
      });

      expect(description.success).toBe(true);
      const descriptionId = description.data!.id;

      // Step 3: Save QA pairs
      (mockSupabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'qa-123',
            user_id: userId,
            session_id: sessionId,
            image_id: imageId,
            description_id: descriptionId,
            question: '¿Qué vemos en la imagen?',
            correct_answer: 'Un atardecer sobre el océano',
            is_correct: true,
            difficulty: 'medio',
          },
          error: null,
        }),
      });

      const qaResponse = await dbService.saveQAResponse({
        user_id: userId,
        session_id: sessionId,
        image_id: imageId,
        description_id: descriptionId,
        question: '¿Qué vemos en la imagen?',
        correct_answer: 'Un atardecer sobre el océano',
        user_answer: 'Un atardecer sobre el océano',
        is_correct: true,
        difficulty: 'medio',
        question_type: 'comprehension',
      });

      expect(qaResponse.success).toBe(true);

      // Step 4: Update session metrics
      (mockSupabase.from as any).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: sessionId,
            images_processed: 1,
            descriptions_generated: 1,
            qa_attempts: 1,
            qa_correct: 1,
            ended_at: new Date().toISOString(),
          },
          error: null,
        }),
      });

      const endSession = await dbService.endSession(sessionId, {
        images_processed: 1,
        descriptions_generated: 1,
        qa_attempts: 1,
        qa_correct: 1,
        duration_minutes: 15,
      });

      expect(endSession.success).toBe(true);
    });

    it('should handle review and favorites', async () => {
      const userId = 'user-123';
      const descriptionId = 'desc-123';

      // Toggle favorite
      (mockSupabase.from as any).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: descriptionId,
            is_favorite: true,
          },
          error: null,
        }),
      });

      const favoriteResult = await dbService.toggleFavoriteDescription(descriptionId, true);
      expect(favoriteResult.success).toBe(true);
      expect(favoriteResult.data?.is_favorite).toBe(true);

      // Get saved descriptions
      (mockSupabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [
            { id: descriptionId, is_favorite: true, user_rating: 5 },
          ],
          error: null,
        }),
      });

      const savedDescriptions = await dbService.getSavedDescriptions(userId, {
        filter: { is_favorite: true },
      });

      expect(savedDescriptions.success).toBe(true);
      expect(savedDescriptions.data).toHaveLength(1);
    });
  });

  describe('Progress Analytics', () => {
    it('should retrieve user analytics for date range', async () => {
      const userId = 'user-123';

      (mockSupabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({
          data: [
            { duration_minutes: 30, qa_attempts: 10, qa_correct: 8 },
            { duration_minutes: 45, qa_attempts: 15, qa_correct: 12 },
          ],
          error: null,
        }),
      }).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({
          data: [
            { mastery_level: 75, learning_phase: 'mastered' },
            { mastery_level: 50, learning_phase: 'learning' },
          ],
          error: null,
        }),
      });

      const analytics = await dbService.getUserAnalytics(userId, {
        start: '2025-10-01',
        end: '2025-10-16',
      });

      expect(analytics.success).toBe(true);
      expect(analytics.data?.sessions).toBeDefined();
      expect(analytics.data?.vocabulary).toBeDefined();
    });
  });
});
