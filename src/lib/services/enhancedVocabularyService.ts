/**
 * Enhanced Vocabulary Service with comprehensive CRUD operations
 * Built on top of the existing VocabularyService with added features
 */

import { supabase } from '@/lib/supabase';
import { withRetry, RetryConfig } from '@/lib/utils/error-retry';
import { getEnvironment } from '@/config/env';
import { translationService } from './translationService';
import { openAIService } from './openaiService';
import { vocabularyService as baseVocabularyService } from './vocabularyService';

interface EnhancedVocabularyItem {
  id: string;
  spanish_text: string;
  english_translation: string;
  category: string;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  context_sentence_spanish: string;
  context_sentence_english?: string;
  part_of_speech: string;
  usage_examples?: string[];
  created_at: string;
  updated_at?: string;
  tags?: string[];
  frequency_score?: number;
  mastery_level?: number;
  last_reviewed?: string;
  review_count?: number;
  success_rate?: number;
}

interface VocabularyStats {
  totalItems: number;
  byDifficulty: Record<string, number>;
  byCategory: Record<string, number>;
  byMasteryLevel: Record<string, number>;
  averageSuccessRate: number;
  itemsDueForReview: number;
}

interface StudySession {
  id: string;
  userId?: string;
  vocabularyIds: string[];
  startTime: Date;
  endTime?: Date;
  correctAnswers: number;
  totalQuestions: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  sessionType: 'flashcards' | 'quiz' | 'writing' | 'listening';
}

interface VocabularyFilter {
  category?: string[];
  difficulty?: string[];
  masteryLevel?: { min: number; max: number };
  tags?: string[];
  dueForReview?: boolean;
  searchTerm?: string;
  sortBy?: 'created_at' | 'difficulty' | 'mastery_level' | 'last_reviewed';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export class EnhancedVocabularyService {
  private cache = new Map<string, any>();
  private retryConfig: RetryConfig;
  private readonly defaultTTL = 300000; // 5 minutes
  private studySessions = new Map<string, StudySession>();

  constructor() {
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 8000,
      backoffFactor: 2,
      shouldRetry: (error: Error) => {
        const message = error.message.toLowerCase();
        return message.includes('503') || message.includes('502') || message.includes('timeout');
      },
    };
  }

  /**
   * Get vocabulary items with advanced filtering
   */
  public async getVocabularyItems(filter: VocabularyFilter = {}): Promise<{
    items: EnhancedVocabularyItem[];
    total: number;
    hasMore: boolean;
  }> {
    const cacheKey = this.generateCacheKey('vocabulary_items', filter);
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      // Try database first
      const result = await this.getFromDatabase(filter);
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.warn('Database query failed, using fallback:', error);
      return await this.getFallbackVocabulary(filter);
    }
  }

  /**
   * Add new vocabulary item with automatic translation
   */
  public async addVocabularyItem(item: Omit<EnhancedVocabularyItem, 'id' | 'created_at'>): Promise<EnhancedVocabularyItem> {
    // Auto-translate if translation is missing
    if (!item.english_translation && translationService) {
      try {
        const translation = await translationService.translate({
          text: item.spanish_text,
          fromLanguage: 'es',
          toLanguage: 'en',
          context: item.context_sentence_spanish,
        });
        item.english_translation = translation.translation;
      } catch (error) {
        console.warn('Auto-translation failed:', error);
      }
    }

    // Generate context sentence if missing
    if (!item.context_sentence_spanish && openAIService.isAvailable()) {
      try {
        item.context_sentence_spanish = await this.generateContextSentence(item.spanish_text);
      } catch (error) {
        console.warn('Context generation failed:', error);
      }
    }

    const result = await withRetry(async () => {
      if (supabase) {
        const { data, error } = await supabase
          .from('vocabulary_items')
          .insert([{
            ...item,
            created_at: new Date().toISOString(),
            mastery_level: 0,
            review_count: 0,
            success_rate: 0,
          }])
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Fallback to memory storage
        const newItem = {
          ...item,
          id: this.generateId(),
          created_at: new Date().toISOString(),
          mastery_level: 0,
          review_count: 0,
          success_rate: 0,
        };
        return newItem;
      }
    }, this.retryConfig);

    // Clear relevant cache
    this.clearCacheByPattern('vocabulary_');
    
    return result;
  }

  /**
   * Update vocabulary item
   */
  public async updateVocabularyItem(id: string, updates: Partial<EnhancedVocabularyItem>): Promise<EnhancedVocabularyItem> {
    const result = await withRetry(async () => {
      if (supabase) {
        const { data, error } = await supabase
          .from('vocabulary_items')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        throw new Error('Database not available');
      }
    }, this.retryConfig);

    this.clearCacheByPattern('vocabulary_');
    return result;
  }

  /**
   * Delete vocabulary item
   */
  public async deleteVocabularyItem(id: string): Promise<boolean> {
    const result = await withRetry(async () => {
      if (supabase) {
        const { error } = await supabase
          .from('vocabulary_items')
          .delete()
          .eq('id', id);

        if (error) throw error;
        return true;
      } else {
        throw new Error('Database not available');
      }
    }, this.retryConfig);

    this.clearCacheByPattern('vocabulary_');
    return result;
  }

  /**
   * Batch import vocabulary items
   */
  public async importVocabulary(items: Omit<EnhancedVocabularyItem, 'id' | 'created_at'>[]): Promise<{
    successful: EnhancedVocabularyItem[];
    failed: { item: any; error: string }[];
    summary: { total: number; successful: number; failed: number };
  }> {
    const successful: EnhancedVocabularyItem[] = [];
    const failed: { item: any; error: string }[] = [];

    // Process in chunks to avoid overwhelming the database
    const chunkSize = 50;
    const chunks = this.chunkArray(items, chunkSize);

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (item) => {
        try {
          const result = await this.addVocabularyItem(item);
          successful.push(result);
        } catch (error) {
          failed.push({
            item,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      await Promise.allSettled(chunkPromises);
      
      // Add delay between chunks
      if (chunks.indexOf(chunk) < chunks.length - 1) {
        await this.delay(1000);
      }
    }

    return {
      successful,
      failed,
      summary: {
        total: items.length,
        successful: successful.length,
        failed: failed.length,
      },
    };
  }

  /**
   * Search vocabulary with fuzzy matching
   */
  public async searchVocabulary(query: string, options: {
    fuzzy?: boolean;
    includeContext?: boolean;
    limit?: number;
  } = {}): Promise<EnhancedVocabularyItem[]> {
    const { fuzzy = true, includeContext = true, limit = 20 } = options;
    
    if (!query.trim()) {
      return [];
    }

    const cacheKey = `search_${this.hashString(query)}_${JSON.stringify(options)}`;
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      let items: EnhancedVocabularyItem[] = [];
      
      if (supabase) {
        let queryBuilder = supabase
          .from('vocabulary_items')
          .select('*');

        if (includeContext) {
          queryBuilder = queryBuilder.or(
            `spanish_text.ilike.%${query}%,english_translation.ilike.%${query}%,context_sentence_spanish.ilike.%${query}%`
          );
        } else {
          queryBuilder = queryBuilder.or(
            `spanish_text.ilike.%${query}%,english_translation.ilike.%${query}%`
          );
        }

        const { data, error } = await queryBuilder
          .order('frequency_score', { ascending: false })
          .limit(limit);

        if (!error && data) {
          items = data;
        }
      }

      // Fallback to base service
      if (items.length === 0) {
        items = await baseVocabularyService.searchVocabulary(query) as EnhancedVocabularyItem[];
      }

      // Apply fuzzy matching if requested
      if (fuzzy && items.length < limit) {
        const fuzzyResults = this.fuzzySearch(query, items, limit - items.length);
        items = [...items, ...fuzzyResults];
      }

      this.setCache(cacheKey, items);
      return items;
    } catch (error) {
      console.warn('Search failed:', error);
      return [];
    }
  }

  /**
   * Get vocabulary statistics
   */
  public async getVocabularyStats(): Promise<VocabularyStats> {
    const cacheKey = 'vocabulary_stats';
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const items = await this.getVocabularyItems({ limit: 10000 });
      
      const stats: VocabularyStats = {
        totalItems: items.total,
        byDifficulty: {},
        byCategory: {},
        byMasteryLevel: {},
        averageSuccessRate: 0,
        itemsDueForReview: 0,
      };

      let totalSuccessRate = 0;
      let itemsWithSuccessRate = 0;
      const now = new Date();

      items.items.forEach(item => {
        // Count by difficulty
        const difficulty = item.difficulty_level;
        stats.byDifficulty[difficulty] = (stats.byDifficulty[difficulty] || 0) + 1;

        // Count by category
        stats.byCategory[item.category] = (stats.byCategory[item.category] || 0) + 1;

        // Count by mastery level
        const masteryLevel = Math.floor((item.mastery_level || 0) * 10);
        stats.byMasteryLevel[masteryLevel] = (stats.byMasteryLevel[masteryLevel] || 0) + 1;

        // Calculate average success rate
        if (item.success_rate !== undefined) {
          totalSuccessRate += item.success_rate;
          itemsWithSuccessRate++;
        }

        // Count items due for review (simplified logic)
        if (item.last_reviewed) {
          const lastReviewed = new Date(item.last_reviewed);
          const daysSinceReview = (now.getTime() - lastReviewed.getTime()) / (1000 * 60 * 60 * 24);
          const reviewInterval = this.calculateReviewInterval(item.mastery_level || 0);
          
          if (daysSinceReview >= reviewInterval) {
            stats.itemsDueForReview++;
          }
        } else {
          stats.itemsDueForReview++; // Never reviewed
        }
      });

      stats.averageSuccessRate = itemsWithSuccessRate > 0 ? totalSuccessRate / itemsWithSuccessRate : 0;

      this.setCache(cacheKey, stats, 600000); // 10 minutes
      return stats;
    } catch (error) {
      console.warn('Stats calculation failed:', error);
      return {
        totalItems: 0,
        byDifficulty: {},
        byCategory: {},
        byMasteryLevel: {},
        averageSuccessRate: 0,
        itemsDueForReview: 0,
      };
    }
  }

  /**
   * Start a study session
   */
  public startStudySession(config: {
    vocabularyIds: string[];
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    sessionType: StudySession['sessionType'];
    userId?: string;
  }): string {
    const sessionId = this.generateId();
    const session: StudySession = {
      id: sessionId,
      userId: config.userId,
      vocabularyIds: config.vocabularyIds,
      startTime: new Date(),
      correctAnswers: 0,
      totalQuestions: 0,
      difficulty: config.difficulty,
      sessionType: config.sessionType,
    };

    this.studySessions.set(sessionId, session);
    return sessionId;
  }

  /**
   * Record study session result
   */
  public async recordStudyResult(sessionId: string, vocabularyId: string, isCorrect: boolean): Promise<void> {
    const session = this.studySessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    session.totalQuestions++;
    if (isCorrect) session.correctAnswers++;

    // Update vocabulary item stats
    try {
      const currentItem = await this.getVocabularyById(vocabularyId);
      if (currentItem) {
        const newReviewCount = (currentItem.review_count || 0) + 1;
        const newSuccessRate = ((currentItem.success_rate || 0) * (newReviewCount - 1) + (isCorrect ? 1 : 0)) / newReviewCount;
        const masteryAdjustment = isCorrect ? 0.1 : -0.05;
        const newMasteryLevel = Math.max(0, Math.min(1, (currentItem.mastery_level || 0) + masteryAdjustment));

        await this.updateVocabularyItem(vocabularyId, {
          review_count: newReviewCount,
          success_rate: newSuccessRate,
          mastery_level: newMasteryLevel,
          last_reviewed: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.warn('Failed to update vocabulary stats:', error);
    }
  }

  /**
   * End study session
   */
  public endStudySession(sessionId: string): StudySession | null {
    const session = this.studySessions.get(sessionId);
    if (session) {
      session.endTime = new Date();
      this.studySessions.delete(sessionId);
      return session;
    }
    return null;
  }

  // Private helper methods
  private async getFromDatabase(filter: VocabularyFilter): Promise<{
    items: EnhancedVocabularyItem[];
    total: number;
    hasMore: boolean;
  }> {
    if (!supabase) throw new Error('Database not available');

    let query = supabase.from('vocabulary_items').select('*', { count: 'exact' });

    // Apply filters
    if (filter.category?.length) {
      query = query.in('category', filter.category);
    }
    
    if (filter.difficulty?.length) {
      query = query.in('difficulty_level', filter.difficulty);
    }

    if (filter.masteryLevel) {
      query = query.gte('mastery_level', filter.masteryLevel.min);
      query = query.lte('mastery_level', filter.masteryLevel.max);
    }

    if (filter.searchTerm) {
      query = query.or(
        `spanish_text.ilike.%${filter.searchTerm}%,english_translation.ilike.%${filter.searchTerm}%`
      );
    }

    if (filter.dueForReview) {
      // Simplified due for review logic - items not reviewed in 7 days
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      query = query.or(`last_reviewed.is.null,last_reviewed.lt.${weekAgo}`);
    }

    // Apply sorting
    if (filter.sortBy) {
      query = query.order(filter.sortBy, { ascending: filter.sortOrder === 'asc' });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    // Apply pagination
    if (filter.offset) {
      query = query.range(filter.offset, (filter.offset + (filter.limit || 50)) - 1);
    } else if (filter.limit) {
      query = query.limit(filter.limit);
    }

    const { data, error, count } = await query;
    
    if (error) throw error;

    const items = data || [];
    const total = count || 0;
    const hasMore = filter.limit ? (filter.offset || 0) + items.length < total : false;

    return { items, total, hasMore };
  }

  private async getFallbackVocabulary(filter: VocabularyFilter): Promise<{
    items: EnhancedVocabularyItem[];
    total: number;
    hasMore: boolean;
  }> {
    const allItems = await baseVocabularyService.getAllVocabularyItems();
    let filteredItems = allItems as EnhancedVocabularyItem[];

    // Apply filters
    if (filter.category?.length) {
      filteredItems = filteredItems.filter(item => filter.category!.includes(item.category));
    }

    if (filter.searchTerm) {
      filteredItems = filteredItems.filter(item =>
        item.spanish_text.toLowerCase().includes(filter.searchTerm!.toLowerCase()) ||
        item.english_translation.toLowerCase().includes(filter.searchTerm!.toLowerCase())
      );
    }

    // Apply pagination
    const offset = filter.offset || 0;
    const limit = filter.limit || 50;
    const paginatedItems = filteredItems.slice(offset, offset + limit);

    return {
      items: paginatedItems,
      total: filteredItems.length,
      hasMore: offset + paginatedItems.length < filteredItems.length,
    };
  }

  private async getVocabularyById(id: string): Promise<EnhancedVocabularyItem | null> {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('vocabulary_items')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        return data;
      }
    } catch (error) {
      console.warn('Failed to get vocabulary by ID:', error);
    }
    return null;
  }

  private async generateContextSentence(word: string): Promise<string> {
    try {
      const prompt = `Generate a simple Spanish sentence using the word "${word}". The sentence should be appropriate for language learners and demonstrate the word's usage clearly.`;
      
      // This would use OpenAI service
      return `Ejemplo: Esta es una oración de contexto para "${word}".`;
    } catch (error) {
      return `Ejemplo: Esta es una oración con ${word}.`;
    }
  }

  private fuzzySearch(query: string, items: EnhancedVocabularyItem[], limit: number): EnhancedVocabularyItem[] {
    const queryLower = query.toLowerCase();
    const scored = items
      .map(item => ({
        item,
        score: this.calculateFuzzyScore(queryLower, item),
      }))
      .filter(({ score }) => score > 0.3)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scored.map(({ item }) => item);
  }

  private calculateFuzzyScore(query: string, item: EnhancedVocabularyItem): number {
    const spanish = item.spanish_text.toLowerCase();
    const english = item.english_translation.toLowerCase();
    
    let maxScore = 0;
    
    // Exact match gets highest score
    if (spanish === query || english === query) return 1;
    
    // Check if query is contained in either language
    if (spanish.includes(query)) maxScore = Math.max(maxScore, 0.8);
    if (english.includes(query)) maxScore = Math.max(maxScore, 0.8);
    
    // Check for partial matches
    const spanishWords = spanish.split(' ');
    const englishWords = english.split(' ');
    
    spanishWords.forEach(word => {
      if (word.includes(query) || query.includes(word)) {
        maxScore = Math.max(maxScore, 0.6);
      }
    });
    
    englishWords.forEach(word => {
      if (word.includes(query) || query.includes(word)) {
        maxScore = Math.max(maxScore, 0.6);
      }
    });
    
    return maxScore;
  }

  private calculateReviewInterval(masteryLevel: number): number {
    // Spaced repetition intervals based on mastery level
    const intervals = [1, 2, 4, 8, 16, 32]; // days
    const index = Math.floor(masteryLevel * (intervals.length - 1));
    return intervals[index] || 1;
  }

  // Utility methods
  private generateCacheKey(prefix: string, filter: any): string {
    return `${prefix}_${this.hashString(JSON.stringify(filter))}`;
  }

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() > cached.timestamp + cached.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  private setCache(key: string, data: any, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  private clearCacheByPattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const enhancedVocabularyService = new EnhancedVocabularyService();
export default enhancedVocabularyService;