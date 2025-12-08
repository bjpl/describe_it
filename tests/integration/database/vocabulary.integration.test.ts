/**
 * Vocabulary Database Integration Tests
 * Tests vocabulary CRUD operations with database
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { buildUser } from '../../shared/builders/UserBuilder';
import { buildVocabulary, commonVocabulary } from '../../shared/builders/VocabularyBuilder';
import { createDatabaseHelper } from '../../shared/helpers/database-helper';
import { createCleanupManager } from '../../shared/fixtures/cleanup';

describe('Vocabulary Database - Integration Tests', () => {
  let supabaseClient: ReturnType<typeof createClient>;
  let dbHelper: ReturnType<typeof createDatabaseHelper>;
  let cleanup: ReturnType<typeof createCleanupManager>;

  beforeEach(() => {
    // Create Supabase client with test credentials
    supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key'
    );

    dbHelper = createDatabaseHelper(supabaseClient);
    cleanup = createCleanupManager(supabaseClient);
  });

  afterEach(async () => {
    // Clean up test data
    await cleanup.cleanup();
  });

  describe('Vocabulary Creation', () => {
    it('should create a vocabulary item with valid data', async () => {
      // Skip if not in real database environment
      if (process.env.NODE_ENV === 'test') {
        return;
      }

      const user = await buildUser()
        .withEmail('vocab-test@example.com')
        .beginner()
        .create(supabaseClient);

      cleanup.track('users', user.id!);

      const vocab = await buildVocabulary()
        .withWord('perro')
        .withTranslation('dog')
        .forUser(user.id!)
        .spanish()
        .beginner()
        .create(supabaseClient);

      cleanup.track('vocabulary', vocab.id!);

      expect(vocab).toHaveProperty('id');
      expect(vocab.word).toBe('perro');
      expect(vocab.translation).toBe('dog');
      expect(vocab.user_id).toBe(user.id);
    });

    it('should create vocabulary with all optional fields', async () => {
      if (process.env.NODE_ENV === 'test') {
        return;
      }

      const user = await buildUser().create(supabaseClient);
      cleanup.track('users', user.id!);

      const vocab = await buildVocabulary()
        .withWord('casa')
        .withTranslation('house')
        .withDefinition('A building for human habitation')
        .withExample('Mi casa es grande.')
        .withSynonyms(['hogar', 'vivienda'])
        .forUser(user.id!)
        .asNoun()
        .beginner()
        .create(supabaseClient);

      cleanup.track('vocabulary', vocab.id!);

      expect(vocab.definition).toBe('A building for human habitation');
      expect(vocab.example_sentence).toBe('Mi casa es grande.');
      expect(vocab.part_of_speech).toBe('noun');
    });

    it('should create multiple vocabulary items for same user', async () => {
      if (process.env.NODE_ENV === 'test') {
        return;
      }

      const user = await buildUser().create(supabaseClient);
      cleanup.track('users', user.id!);

      const vocabItems = await Promise.all(
        commonVocabulary.spanishNouns.map(async (item) => {
          const vocab = await buildVocabulary()
            .withWord(item.word)
            .withTranslation(item.translation)
            .withDifficulty(item.difficulty)
            .forUser(user.id!)
            .create(supabaseClient);

          cleanup.track('vocabulary', vocab.id!);
          return vocab;
        })
      );

      expect(vocabItems).toHaveLength(commonVocabulary.spanishNouns.length);
      vocabItems.forEach((vocab) => {
        expect(vocab.user_id).toBe(user.id);
      });
    });
  });

  describe('Vocabulary Retrieval', () => {
    it('should retrieve vocabulary by user ID', async () => {
      if (process.env.NODE_ENV === 'test') {
        return;
      }

      const user = await buildUser().create(supabaseClient);
      cleanup.track('users', user.id!);

      // Create test vocabulary
      const created = await buildVocabulary()
        .withWord('gato')
        .forUser(user.id!)
        .create(supabaseClient);

      cleanup.track('vocabulary', created.id!);

      // Retrieve vocabulary
      const found = await dbHelper.find('vocabulary', { user_id: user.id });

      expect(found.length).toBeGreaterThan(0);
      expect(found.some((v: any) => v.word === 'gato')).toBe(true);
    });

    it('should filter vocabulary by difficulty', async () => {
      if (process.env.NODE_ENV === 'test') {
        return;
      }

      const user = await buildUser().create(supabaseClient);
      cleanup.track('users', user.id!);

      // Create vocabulary items with different difficulties
      const beginner = await buildVocabulary()
        .withWord('casa')
        .forUser(user.id!)
        .beginner()
        .create(supabaseClient);

      const advanced = await buildVocabulary()
        .withWord('perspicaz')
        .forUser(user.id!)
        .advanced()
        .create(supabaseClient);

      cleanup.track('vocabulary', beginner.id!);
      cleanup.track('vocabulary', advanced.id!);

      // Retrieve only beginner vocabulary
      const beginnerItems = await dbHelper.find('vocabulary', {
        user_id: user.id,
        difficulty: 'beginner',
      });

      expect(beginnerItems.length).toBeGreaterThan(0);
      beginnerItems.forEach((item: any) => {
        expect(item.difficulty).toBe('beginner');
      });
    });

    it('should filter vocabulary by language', async () => {
      if (process.env.NODE_ENV === 'test') {
        return;
      }

      const user = await buildUser().create(supabaseClient);
      cleanup.track('users', user.id!);

      // Create Spanish vocabulary
      const spanish = await buildVocabulary()
        .withWord('perro')
        .forUser(user.id!)
        .spanish()
        .create(supabaseClient);

      cleanup.track('vocabulary', spanish.id!);

      // Retrieve Spanish vocabulary
      const spanishItems = await dbHelper.find('vocabulary', {
        user_id: user.id,
        language: 'es',
      });

      expect(spanishItems.length).toBeGreaterThan(0);
      spanishItems.forEach((item: any) => {
        expect(item.language).toBe('es');
      });
    });

    it('should find a single vocabulary item by ID', async () => {
      if (process.env.NODE_ENV === 'test') {
        return;
      }

      const user = await buildUser().create(supabaseClient);
      cleanup.track('users', user.id!);

      const created = await buildVocabulary()
        .withWord('libro')
        .forUser(user.id!)
        .create(supabaseClient);

      cleanup.track('vocabulary', created.id!);

      const found = await dbHelper.findOne('vocabulary', { id: created.id });

      expect(found).toBeTruthy();
      expect(found?.word).toBe('libro');
    });
  });

  describe('Vocabulary Updates', () => {
    it('should update vocabulary translation', async () => {
      if (process.env.NODE_ENV === 'test') {
        return;
      }

      const user = await buildUser().create(supabaseClient);
      cleanup.track('users', user.id!);

      const vocab = await buildVocabulary()
        .withWord('coche')
        .withTranslation('car')
        .forUser(user.id!)
        .create(supabaseClient);

      cleanup.track('vocabulary', vocab.id!);

      // Update translation
      await dbHelper.update(
        'vocabulary',
        { id: vocab.id },
        { translation: 'automobile' }
      );

      // Verify update
      const updated = await dbHelper.findOne('vocabulary', { id: vocab.id });
      expect(updated?.translation).toBe('automobile');
    });

    it('should update vocabulary difficulty', async () => {
      if (process.env.NODE_ENV === 'test') {
        return;
      }

      const user = await buildUser().create(supabaseClient);
      cleanup.track('users', user.id!);

      const vocab = await buildVocabulary()
        .withWord('desarrollar')
        .forUser(user.id!)
        .beginner()
        .create(supabaseClient);

      cleanup.track('vocabulary', vocab.id!);

      // Update difficulty
      await dbHelper.update(
        'vocabulary',
        { id: vocab.id },
        { difficulty: 'intermediate' }
      );

      const updated = await dbHelper.findOne('vocabulary', { id: vocab.id });
      expect(updated?.difficulty).toBe('intermediate');
    });
  });

  describe('Vocabulary Deletion', () => {
    it('should delete a vocabulary item', async () => {
      if (process.env.NODE_ENV === 'test') {
        return;
      }

      const user = await buildUser().create(supabaseClient);
      cleanup.track('users', user.id!);

      const vocab = await buildVocabulary()
        .withWord('temporal')
        .forUser(user.id!)
        .create(supabaseClient);

      const vocabId = vocab.id!;

      // Delete vocabulary
      await dbHelper.delete('vocabulary', { id: vocabId });

      // Verify deletion
      const found = await dbHelper.findOne('vocabulary', { id: vocabId });
      expect(found).toBeNull();
    });

    it('should delete all vocabulary for a user', async () => {
      if (process.env.NODE_ENV === 'test') {
        return;
      }

      const user = await buildUser().create(supabaseClient);
      cleanup.track('users', user.id!);

      // Create multiple vocabulary items
      const vocab1 = await buildVocabulary().forUser(user.id!).create(supabaseClient);
      const vocab2 = await buildVocabulary().forUser(user.id!).create(supabaseClient);

      cleanup.track('vocabulary', vocab1.id!);
      cleanup.track('vocabulary', vocab2.id!);

      // Delete all user's vocabulary
      await dbHelper.delete('vocabulary', { user_id: user.id });

      // Verify deletion
      const remaining = await dbHelper.find('vocabulary', { user_id: user.id });
      expect(remaining.length).toBe(0);
    });
  });

  describe('Database Constraints', () => {
    it('should enforce user_id foreign key constraint', async () => {
      if (process.env.NODE_ENV === 'test') {
        return;
      }

      // Try to create vocabulary with non-existent user
      await expect(async () => {
        await buildVocabulary()
          .withWord('invalid')
          .forUser('non-existent-user-id')
          .create(supabaseClient);
      }).rejects.toThrow();
    });

    it('should allow multiple vocabulary items with same word for different users', async () => {
      if (process.env.NODE_ENV === 'test') {
        return;
      }

      const user1 = await buildUser().withEmail('user1@test.com').create(supabaseClient);
      const user2 = await buildUser().withEmail('user2@test.com').create(supabaseClient);

      cleanup.track('users', user1.id!);
      cleanup.track('users', user2.id!);

      const vocab1 = await buildVocabulary()
        .withWord('común')
        .forUser(user1.id!)
        .create(supabaseClient);

      const vocab2 = await buildVocabulary()
        .withWord('común')
        .forUser(user2.id!)
        .create(supabaseClient);

      cleanup.track('vocabulary', vocab1.id!);
      cleanup.track('vocabulary', vocab2.id!);

      expect(vocab1.word).toBe(vocab2.word);
      expect(vocab1.user_id).not.toBe(vocab2.user_id);
    });
  });

  describe('Performance', () => {
    it('should handle batch inserts efficiently', async () => {
      if (process.env.NODE_ENV === 'test') {
        return;
      }

      const user = await buildUser().create(supabaseClient);
      cleanup.track('users', user.id!);

      const batchSize = 50;
      const vocabItems = Array.from({ length: batchSize }, (_, i) => ({
        word: `word${i}`,
        translation: `translation${i}`,
        language: 'es',
        difficulty: 'beginner',
        user_id: user.id,
      }));

      const startTime = Date.now();
      const inserted = await dbHelper.insert('vocabulary', vocabItems);
      const duration = Date.now() - startTime;

      // Track all for cleanup
      inserted.forEach((item: any) => cleanup.track('vocabulary', item.id));

      expect(inserted.length).toBe(batchSize);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should query large datasets efficiently', async () => {
      if (process.env.NODE_ENV === 'test') {
        return;
      }

      const user = await buildUser().create(supabaseClient);
      cleanup.track('users', user.id!);

      // Create test data
      const vocabItems = Array.from({ length: 20 }, (_, i) =>
        buildVocabulary()
          .withWord(`word${i}`)
          .forUser(user.id!)
          .build()
      );

      const inserted = await dbHelper.insert('vocabulary', vocabItems);
      inserted.forEach((item: any) => cleanup.track('vocabulary', item.id));

      // Query with limit and offset
      const startTime = Date.now();
      const results = await dbHelper.find('vocabulary', { user_id: user.id }, {
        limit: 10,
        offset: 0,
        orderBy: 'created_at',
        ascending: false,
      });
      const duration = Date.now() - startTime;

      expect(results.length).toBeLessThanOrEqual(10);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
