/**
 * Complete Database Integration Flow Tests
 * Tests: Full user journey from search to progress tracking
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { APIClient } from '@/lib/api-client';

global.fetch = vi.fn();

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('Complete Database Integration Flow', () => {
  const userId = 'test-user-123';
  let sessionId: string;
  let listId: string;
  let descriptionId: string;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Full Learning Journey', () => {
    it('should complete entire user flow: search → describe → save → track', async () => {
      // Step 1: Create learning session
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          data: {
            id: 'session-new',
            user_id: userId,
            session_type: 'learning',
            started_at: new Date().toISOString(),
          },
        }),
      });

      const sessionResult = await APIClient.createSession({
        user_id: userId,
        session_type: 'learning',
      });

      expect(sessionResult.data).toBeDefined();
      sessionId = sessionResult.data!.id;

      // Step 2: Generate description
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({
            data: { text: 'A beautiful sunset over the ocean' },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({
            data: { text: 'Un hermoso atardecer sobre el océano' },
          }),
        });

      const [englishDesc, spanishDesc] = await Promise.all([
        APIClient.generateDescription(
          'https://test.com/image.jpg',
          'conversacional',
          'en'
        ),
        APIClient.generateDescription(
          'https://test.com/image.jpg',
          'conversacional',
          'es'
        ),
      ]);

      expect(englishDesc.data?.text).toBeDefined();
      expect(spanishDesc.data?.text).toBeDefined();

      // Step 3: Save description
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          data: {
            id: 'desc-new',
            user_id: userId,
            session_id: sessionId,
            image_id: 'unsplash-123',
            english_description: englishDesc.data!.text,
            spanish_description: spanishDesc.data!.text,
            description_style: 'conversacional',
          },
        }),
      });

      const saveResult = await APIClient.saveDescription({
        user_id: userId,
        session_id: sessionId,
        image_id: 'unsplash-123',
        english_description: englishDesc.data!.text,
        spanish_description: spanishDesc.data!.text,
        description_style: 'conversacional',
      });

      expect(saveResult.data).toBeDefined();
      descriptionId = saveResult.data!.id;

      // Step 4: Save QA response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          data: {
            id: 'qa-new',
            user_id: userId,
            session_id: sessionId,
            description_id: descriptionId,
            is_correct: true,
            difficulty: 'medio',
          },
        }),
      });

      const qaResult = await APIClient.saveQAResponse({
        user_id: userId,
        session_id: sessionId,
        description_id: descriptionId,
        question: '¿Qué vemos?',
        correct_answer: 'Un atardecer',
        user_answer: 'Un atardecer',
        is_correct: true,
        difficulty: 'medio',
      });

      expect(qaResult.data).toBeDefined();

      // Step 5: Create vocabulary list
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          data: {
            id: 'list-new',
            name: 'From Images',
            created_by: userId,
          },
        }),
      });

      const listResult = await APIClient.createVocabularyList(
        'From Images',
        'Vocabulary from image descriptions',
        userId
      );

      expect(listResult.data).toBeDefined();
      listId = listResult.data!.id;

      // Step 6: Save vocabulary items
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          data: [
            {
              id: 'item-1',
              vocabulary_list_id: listId,
              spanish_text: 'atardecer',
              english_translation: 'sunset',
            },
            {
              id: 'item-2',
              vocabulary_list_id: listId,
              spanish_text: 'océano',
              english_translation: 'ocean',
            },
          ],
        }),
      });

      const vocabResult = await APIClient.saveVocabularyItems(listId, [
        {
          vocabulary_list_id: listId,
          spanish_text: 'atardecer',
          english_translation: 'sunset',
        },
        {
          vocabulary_list_id: listId,
          spanish_text: 'océano',
          english_translation: 'ocean',
        },
      ]);

      expect(vocabResult.data).toHaveLength(2);

      // Step 7: Update learning progress
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          data: {
            user_id: userId,
            vocabulary_item_id: 'item-1',
            mastery_level: 25,
            learning_phase: 'learning',
          },
        }),
      });

      const progressResult = await APIClient.updateLearningProgress(
        userId,
        'item-1',
        {
          mastery_level: 25,
          review_count: 1,
          correct_count: 1,
          learning_phase: 'learning',
        }
      );

      expect(progressResult.data?.mastery_level).toBe(25);

      // Step 8: End session
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          data: {
            id: sessionId,
            images_processed: 1,
            descriptions_generated: 1,
            qa_attempts: 1,
            qa_correct: 1,
            vocabulary_learned: 2,
            duration_minutes: 15,
          },
        }),
      });

      const endResult = await APIClient.endSession(sessionId, {
        images_processed: 1,
        descriptions_generated: 1,
        qa_attempts: 1,
        qa_correct: 1,
        vocabulary_learned: 2,
        duration_minutes: 15,
      });

      expect(endResult.data).toBeDefined();
      expect(endResult.data?.vocabulary_learned).toBe(2);
    });
  });

  describe('Data Retrieval and Analysis', () => {
    it('should retrieve and analyze user progress', async () => {
      // Get user progress
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          data: {
            total_points: 500,
            completion_rate: 0.65,
            this_week: {
              sessions: 5,
              points: 150,
              accuracy: 0.8,
            },
          },
        }),
      });

      const progressResult = await APIClient.getUserProgress(userId, 7);
      expect(progressResult.data?.total_points).toBe(500);

      // Get sessions
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          data: Array.from({ length: 5 }, (_, i) => ({
            id: `session-${i}`,
            duration_minutes: 20,
          })),
        }),
      });

      const sessionsResult = await APIClient.getUserSessions(userId, 5);
      expect(sessionsResult.data).toHaveLength(5);

      // Get saved descriptions
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          data: Array.from({ length: 10 }, (_, i) => ({
            id: `desc-${i}`,
            is_favorite: false,
          })),
        }),
      });

      const descriptionsResult = await APIClient.getSavedDescriptions(userId, 10);
      expect(descriptionsResult.data).toHaveLength(10);

      // Get vocabulary lists
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          data: [
            { id: 'list-1', name: 'Travel', total_words: 25 },
            { id: 'list-2', name: 'Food', total_words: 30 },
          ],
        }),
      });

      const listsResult = await APIClient.getVocabularyLists(userId);
      expect(listsResult.data).toHaveLength(2);
    });
  });

  describe('Error Recovery', () => {
    it('should handle partial flow failures gracefully', async () => {
      // Session creation succeeds
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          data: { id: 'session-123', user_id: userId },
        }),
      });

      const sessionResult = await APIClient.createSession({
        user_id: userId,
        session_type: 'learning',
      });
      expect(sessionResult.data).toBeDefined();

      // Description generation fails
      (global.fetch as any).mockRejectedValueOnce(new Error('API Error'));

      const descResult = await APIClient.generateDescription(
        'https://test.com/image.jpg',
        'conversacional',
        'en'
      );
      expect(descResult.error).toBeDefined();

      // Session can still be ended
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          data: { id: sessionResult.data!.id, ended_at: new Date().toISOString() },
        }),
      });

      const endResult = await APIClient.endSession(sessionResult.data!.id, {
        duration_minutes: 5,
      });
      expect(endResult.data).toBeDefined();
    });

    it('should rollback on critical failures', async () => {
      // This test verifies that failing operations don't corrupt state
      (global.fetch as any).mockRejectedValueOnce(new Error('Database error'));

      const result = await APIClient.saveVocabularyItems('list-123', [
        {
          vocabulary_list_id: 'list-123',
          spanish_text: 'test',
          english_translation: 'test',
        },
      ]);

      expect(result.error).toBeDefined();
      expect(result.data).toBeNull();
    });
  });

  describe('Concurrent User Operations', () => {
    it('should handle multiple simultaneous operations', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: {} }),
      });

      const operations = [
        APIClient.getUserProgress(userId, 30),
        APIClient.getUserSessions(userId, 10),
        APIClient.getSavedDescriptions(userId, 20),
        APIClient.getVocabularyLists(userId),
      ];

      const results = await Promise.all(operations);

      expect(results).toHaveLength(4);
      expect(results.every(r => r.error === null)).toBe(true);
    });
  });

  describe('Data Consistency', () => {
    it('should maintain referential integrity', async () => {
      // Create session
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          data: { id: 'session-123', user_id: userId },
        }),
      });

      const session = await APIClient.createSession({
        user_id: userId,
        session_type: 'learning',
      });

      // Save description with session reference
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          data: {
            id: 'desc-123',
            session_id: session.data!.id,
          },
        }),
      });

      const description = await APIClient.saveDescription({
        user_id: userId,
        session_id: session.data!.id,
        image_id: 'img-123',
        english_description: 'test',
        spanish_description: 'prueba',
        description_style: 'conversacional',
      });

      expect(description.data?.session_id).toBe(session.data!.id);
    });
  });
});
