/**
 * VocabularyService - Business Logic for Vocabulary Management
 *
 * Handles vocabulary storage, retrieval, and statistics using database persistence.
 */

import { DatabaseService } from '@/lib/supabase';
import { descriptionCache } from '@/lib/cache';
import { apiLogger } from '@/lib/logger';
import { asLogContext } from '@/lib/utils/typeGuards';

export interface VocabularyItemInput {
  id?: string;
  phrase: string;
  definition: string;
  category: string;
  partOfSpeech?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  context?: string;
  translation?: string;
  notes?: string;
  tags?: string[];
  imageUrl?: string;
  gender?: 'masculino' | 'femenino' | 'neutro';
  article?: string;
  conjugation?: string;
  examples?: string[];
}

export interface VocabularyFilters {
  collectionName?: string;
  category?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  tags?: string[];
  limit?: number;
  offset?: number;
  sortBy?: 'phrase' | 'difficulty' | 'createdAt' | 'updatedAt' | 'masteryLevel';
  sortOrder?: 'asc' | 'desc';
}

export interface VocabularyStats {
  totalItems: number;
  difficultyCounts: {
    beginner: number;
    intermediate: number;
    advanced: number;
  };
  categoryCounts: Record<string, number>;
  lastUpdated: string;
}

interface CollectionIndex {
  items: Array<{
    id: string;
    phrase: string;
    category: string;
    difficulty: string;
    tags: string[];
    collectionName: string;
    createdAt: string;
    updatedAt: string;
  }>;
  collections: Record<
    string,
    {
      name: string;
      itemCount: number;
      lastUpdated: string;
    }
  >;
  lastUpdated: string;
}

/**
 * Service for managing vocabulary items
 */
export class VocabularyService {
  private cachePrefix = 'vocabulary';

  private userPrefix(userId: string): string {
    return `${this.cachePrefix}:user:${userId}`;
  }

  private collectionPrefix(userId: string, collection: string): string {
    return `${this.userPrefix(userId)}:collection:${collection}`;
  }

  /**
   * Save a single vocabulary item
   */
  async saveVocabulary(
    userId: string,
    vocabulary: VocabularyItemInput,
    collectionName: string,
    metadata?: any
  ) {
    // First, ensure vocabulary list exists
    let listId: string;
    const existingLists = await DatabaseService.getVocabularyLists();
    const existingList = existingLists.find(list => list.name === collectionName);

    if (existingList) {
      listId = existingList.id;
    } else {
      const newList = await DatabaseService.createVocabularyList({
        name: collectionName,
        description: `Vocabulary collection: ${collectionName}`,
        category: 'general',
      });

      if (!newList) {
        throw new Error('Failed to create vocabulary list');
      }
      listId = newList.id;
    }

    // Map difficulty to number
    const difficultyMap: Record<string, number> = {
      beginner: 1,
      intermediate: 2,
      advanced: 3,
    };

    // Save vocabulary item to database
    const vocabularyItem = await DatabaseService.addVocabularyItem({
      vocabulary_list_id: listId,
      spanish_text: vocabulary.phrase,
      english_translation: vocabulary.translation || vocabulary.definition,
      part_of_speech: vocabulary.partOfSpeech || 'other',
      difficulty_level: difficultyMap[vocabulary.difficulty] || 1,
      category: vocabulary.category,
      context_sentence_spanish: vocabulary.context,
      context_sentence_english: vocabulary.examples?.[0],
      usage_notes: vocabulary.notes,
    });

    if (!vocabularyItem) {
      throw new Error('Failed to save vocabulary item to database');
    }

    const result = {
      id: vocabularyItem.id,
      ...vocabulary,
      userId,
      collectionName,
      createdAt: vocabularyItem.created_at,
      updatedAt: vocabularyItem.created_at,
      metadata: {
        ...metadata,
        timestamp: vocabularyItem.created_at,
        saved: true,
      },
    };

    // Update collection index and stats in parallel
    await Promise.all([
      this.updateCollectionIndex(userId, collectionName, result.id, vocabulary),
      this.updateUserStats(userId, vocabulary.difficulty, vocabulary.category),
    ]);

    return result;
  }

  /**
   * Save multiple vocabulary items in batch
   */
  async saveBulkVocabulary(
    userId: string,
    vocabularyItems: VocabularyItemInput[],
    collectionName: string,
    metadata?: any
  ) {
    // First, ensure vocabulary list exists
    let listId: string;
    const existingLists = await DatabaseService.getVocabularyLists();
    const existingList = existingLists.find(list => list.name === collectionName);

    if (existingList) {
      listId = existingList.id;
    } else {
      const newList = await DatabaseService.createVocabularyList({
        name: collectionName,
        description: `Vocabulary collection: ${collectionName}`,
        category: 'general',
      });

      if (!newList) {
        throw new Error('Failed to create vocabulary list');
      }
      listId = newList.id;
    }

    // Map difficulty to number
    const difficultyMap: Record<string, number> = {
      beginner: 1,
      intermediate: 2,
      advanced: 3,
    };

    const results = [];

    // Save all vocabulary items to database
    for (const vocabulary of vocabularyItems) {
      const vocabularyItem = await DatabaseService.addVocabularyItem({
        vocabulary_list_id: listId,
        spanish_text: vocabulary.phrase,
        english_translation: vocabulary.translation || vocabulary.definition,
        part_of_speech: vocabulary.partOfSpeech || 'other',
        difficulty_level: difficultyMap[vocabulary.difficulty] || 1,
        category: vocabulary.category,
        context_sentence_spanish: vocabulary.context,
        context_sentence_english: vocabulary.examples?.[0],
        usage_notes: vocabulary.notes,
      });

      if (vocabularyItem) {
        results.push({
          id: vocabularyItem.id,
          ...vocabulary,
          userId,
          collectionName,
          createdAt: vocabularyItem.created_at,
          updatedAt: vocabularyItem.created_at,
          metadata: {
            ...metadata,
            timestamp: vocabularyItem.created_at,
            saved: true,
            bulkImport: true,
          },
        });

        // Update stats for each item
        await this.updateUserStats(userId, vocabulary.difficulty, vocabulary.category);
      }
    }

    return results;
  }

  /**
   * Get vocabulary items with filtering
   */
  async getVocabulary(userId: string, filters: VocabularyFilters = {}) {
    const {
      collectionName,
      category,
      difficulty,
      tags,
      limit = 50,
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    try {
      // Get all vocabulary lists
      const lists = await DatabaseService.getVocabularyLists();

      // Filter by collection name if specified
      const targetLists = collectionName
        ? lists.filter(list => list.name === collectionName)
        : lists;

      if (targetLists.length === 0) {
        return {
          items: [],
          total: 0,
          offset,
          limit,
          hasMore: false,
        };
      }

      // Get items from all target lists
      let allItems: any[] = [];
      for (const list of targetLists) {
        const items = await DatabaseService.getVocabularyItems(list.id);

        // Transform database items to expected format
        const transformedItems = items.map(item => ({
          id: item.id,
          phrase: item.spanish_text,
          definition: item.english_translation,
          translation: item.english_translation,
          category: item.category,
          partOfSpeech: item.part_of_speech,
          difficulty:
            item.difficulty_level === 1
              ? 'beginner'
              : item.difficulty_level === 2
              ? 'intermediate'
              : 'advanced',
          context: item.context_sentence_spanish,
          notes: item.usage_notes,
          examples: item.context_sentence_english
            ? [item.context_sentence_english]
            : [],
          tags: [],
          collectionName: list.name,
          createdAt: item.created_at,
          updatedAt: item.created_at,
          userId,
        }));

        allItems = allItems.concat(transformedItems);
      }

      // Apply filters
      if (category) {
        allItems = allItems.filter(item => item.category === category);
      }

      if (difficulty) {
        allItems = allItems.filter(item => item.difficulty === difficulty);
      }

      if (tags && tags.length > 0) {
        allItems = allItems.filter(
          item => item.tags && item.tags.some((tag: string) => tags.includes(tag))
        );
      }

      // Sort items
      allItems.sort((a: any, b: any) => {
        let aValue = a[sortBy];
        let bValue = b[sortBy];

        if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
          aValue = new Date(aValue).getTime();
          bValue = new Date(bValue).getTime();
        }

        if (sortOrder === 'desc') {
          return bValue > aValue ? 1 : -1;
        }
        return aValue > bValue ? 1 : -1;
      });

      // Apply pagination
      const paginatedItems = allItems.slice(offset, offset + limit);

      return {
        items: paginatedItems,
        total: allItems.length,
        offset,
        limit,
        hasMore: offset + limit < allItems.length,
      };
    } catch (error) {
      apiLogger.warn('Failed to get vocabulary from database:', asLogContext(error));
      return {
        items: [],
        total: 0,
        offset,
        limit,
        hasMore: false,
      };
    }
  }

  /**
   * Update collection index
   */
  private async updateCollectionIndex(
    userId: string,
    collectionName: string,
    vocabularyId: string,
    vocabulary: VocabularyItemInput
  ): Promise<void> {
    const indexKey = `${this.collectionPrefix(userId, collectionName)}:index`;

    try {
      const index = (await descriptionCache.get<CollectionIndex>(indexKey)) || {
        items: [],
        collections: {},
        lastUpdated: new Date().toISOString(),
      };

      // Remove existing item if it exists
      index.items = index.items.filter(item => item.id !== vocabularyId);

      // Add updated item summary
      index.items.push({
        id: vocabularyId,
        phrase: vocabulary.phrase,
        category: vocabulary.category,
        difficulty: vocabulary.difficulty,
        tags: vocabulary.tags || [],
        collectionName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Update collection metadata
      index.collections[collectionName] = {
        name: collectionName,
        itemCount: index.items.filter(item => item.collectionName === collectionName)
          .length,
        lastUpdated: new Date().toISOString(),
      };

      index.lastUpdated = new Date().toISOString();

      await descriptionCache.set(index, 86400 * 30, indexKey);
    } catch (error) {
      apiLogger.warn('Failed to update collection index:', asLogContext(error));
    }
  }

  /**
   * Update user statistics
   */
  private async updateUserStats(
    userId: string,
    difficulty: string,
    category: string
  ): Promise<void> {
    const statsKey = `${this.userPrefix(userId)}:stats`;

    try {
      const stats = (await descriptionCache.get<VocabularyStats>(statsKey)) || {
        totalItems: 0,
        difficultyCounts: { beginner: 0, intermediate: 0, advanced: 0 },
        categoryCounts: {},
        lastUpdated: new Date().toISOString(),
      };

      stats.totalItems++;
      stats.difficultyCounts[difficulty as keyof typeof stats.difficultyCounts]++;
      stats.categoryCounts[category] = (stats.categoryCounts[category] || 0) + 1;
      stats.lastUpdated = new Date().toISOString();

      await descriptionCache.set(stats, 86400 * 30, statsKey);
    } catch (error) {
      apiLogger.warn('Failed to update user stats:', asLogContext(error));
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId: string): Promise<VocabularyStats> {
    const statsKey = `${this.userPrefix(userId)}:stats`;
    return (
      (await descriptionCache.get<VocabularyStats>(statsKey)) || {
        totalItems: 0,
        difficultyCounts: { beginner: 0, intermediate: 0, advanced: 0 },
        categoryCounts: {},
        lastUpdated: new Date().toISOString(),
      }
    );
  }
}
