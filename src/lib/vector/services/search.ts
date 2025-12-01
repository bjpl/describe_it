/**
 * VectorSearchService
 * Semantic search with hybrid SQL+vector capabilities
 */

import { vectorClient } from '../client';
import { embeddingService } from './embedding';
import { getVectorConfig } from '../config';
import type { VectorSearchOptions, VectorSearchResult, IVectorSearchService } from '../types';
import { SearchError } from '../types';
import { logger } from '@/lib/logger';

interface HybridSearchOptions extends VectorSearchOptions {
  vectorWeight?: number;
  sqlWeight?: number;
  sqlQuery?: string;
  sqlParams?: Record<string, unknown>;
}

class VectorSearchService implements IVectorSearchService {
  private static instance: VectorSearchService | null = null;
  private config = getVectorConfig();

  private constructor() {}

  public static getInstance(): VectorSearchService {
    if (!VectorSearchService.instance) {
      VectorSearchService.instance = new VectorSearchService();
    }
    return VectorSearchService.instance;
  }

  public static resetInstance(): void {
    VectorSearchService.instance = null;
  }

  public async search<T>(
    query: string,
    collection: string,
    options: VectorSearchOptions = {}
  ): Promise<VectorSearchResult<T>[]> {
    if (!vectorClient.isReady()) {
      throw new SearchError('Vector client not connected');
    }

    try {
      const embedding = await embeddingService.generateEmbedding(query);
      return this.searchByVector<T>(embedding.vector, collection, options);
    } catch (error) {
      logger.error('[VectorSearch] Search failed', { error, query, collection });
      throw new SearchError('Search failed', { query, collection, error });
    }
  }

  public async searchByVector<T>(
    vector: number[],
    collection: string,
    options: VectorSearchOptions = {}
  ): Promise<VectorSearchResult<T>[]> {
    if (!vectorClient.isReady()) {
      throw new SearchError('Vector client not connected');
    }

    try {
      return await vectorClient.search<T>(collection, vector, {
        limit: options.limit || this.config.search.defaultLimit,
        threshold: options.threshold || this.config.search.minThreshold,
        filters: options.filters,
        includeMetadata: options.includeMetadata !== false,
        includeVectors: options.includeVectors === true,
      });
    } catch (error) {
      logger.error('[VectorSearch] Vector search failed', { error, collection });
      throw new SearchError('Vector search failed', { collection, error });
    }
  }

  public async upsert(
    id: string,
    vector: number[],
    metadata: Record<string, unknown>,
    collection: string
  ): Promise<void> {
    if (!vectorClient.isReady()) {
      throw new SearchError('Vector client not connected');
    }

    await vectorClient.upsert(collection, [{ id, vector, metadata }]);
  }

  public async delete(id: string, collection: string): Promise<void> {
    if (!vectorClient.isReady()) {
      throw new SearchError('Vector client not connected');
    }

    await vectorClient.delete(collection, [id]);
  }

  /**
   * Hybrid search combining vector similarity with SQL results using RRF
   */
  public async hybridSearch<T>(
    query: string,
    collection: string,
    options: HybridSearchOptions = {}
  ): Promise<VectorSearchResult<T>[]> {
    const vectorWeight = options.vectorWeight || 0.6;
    const sqlWeight = options.sqlWeight || 0.4;
    const k = 60; // RRF constant

    // Get vector results
    const vectorResults = await this.search<T>(query, collection, options);

    // If no SQL query provided, return vector results only
    if (!options.sqlQuery) {
      return vectorResults;
    }

    // Get SQL results (would integrate with Supabase)
    const sqlResults = await this.executeSqlSearch<T>(options.sqlQuery, options.sqlParams || {});

    // Apply Reciprocal Rank Fusion
    const scores = new Map<string, { score: number; metadata: T; vector?: number[] }>();

    // Score vector results
    vectorResults.forEach((result, rank) => {
      const rrfScore = vectorWeight * (1 / (k + rank + 1));
      scores.set(result.id, {
        score: rrfScore,
        metadata: result.metadata,
        vector: result.vector,
      });
    });

    // Add SQL results with RRF scoring
    sqlResults.forEach((result, rank) => {
      const rrfScore = sqlWeight * (1 / (k + rank + 1));
      const existing = scores.get(result.id);
      if (existing) {
        existing.score += rrfScore;
      } else {
        scores.set(result.id, {
          score: rrfScore,
          metadata: result.metadata,
          vector: result.vector,
        });
      }
    });

    // Sort by combined score and return
    return [...scores.entries()]
      .map(([id, data]) => ({
        id,
        score: data.score,
        metadata: data.metadata,
        vector: data.vector,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, options.limit || this.config.search.defaultLimit);
  }

  /**
   * Search for vocabulary items by semantic meaning
   */
  public async searchVocabulary(
    query: string,
    options: VectorSearchOptions & { targetLanguage?: string } = {}
  ): Promise<
    VectorSearchResult<{
      word: string;
      language: string;
      definition?: string;
      partOfSpeech?: string;
    }>[]
  > {
    const filters = options.filters || [];

    if (options.targetLanguage) {
      filters.push({
        field: 'language',
        operator: 'eq',
        value: options.targetLanguage,
      });
    }

    return this.search(query, this.config.collections.vocabulary, {
      ...options,
      filters,
    });
  }

  /**
   * Find similar descriptions for an image or concept
   */
  public async searchDescriptions(
    query: string,
    options: VectorSearchOptions & { imageId?: string } = {}
  ): Promise<
    VectorSearchResult<{
      description: string;
      imageId: string;
      difficulty: string;
      language: string;
    }>[]
  > {
    const filters = options.filters || [];

    if (options.imageId) {
      filters.push({
        field: 'imageId',
        operator: 'eq',
        value: options.imageId,
      });
    }

    return this.search(query, this.config.collections.descriptions, {
      ...options,
      filters,
    });
  }

  /**
   * Find translations and related words
   */
  public async findTranslations(
    word: string,
    sourceLanguage: string,
    targetLanguages: string[]
  ): Promise<Map<string, VectorSearchResult<{ word: string; language: string }>[]>> {
    const results = new Map();

    await Promise.all(
      targetLanguages.map(async lang => {
        const translations = await this.searchVocabulary(word, {
          targetLanguage: lang,
          limit: 5,
          threshold: 0.75,
        });
        results.set(lang, translations);
      })
    );

    return results;
  }

  private async executeSqlSearch<T>(
    _query: string,
    _params: Record<string, unknown>
  ): Promise<VectorSearchResult<T>[]> {
    // Integration point with Supabase
    // This would execute the SQL query and return results
    logger.debug('[VectorSearch] SQL search placeholder');
    return [];
  }
}

export const vectorSearchService = VectorSearchService.getInstance();
export { VectorSearchService };
