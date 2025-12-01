/**
 * SemanticCacheService
 * Embedding-based semantic caching with LRU eviction
 */

import { embeddingService } from './embedding';
import { getVectorConfig } from '../config';
import type { SemanticCacheEntry, CacheMetrics, ISemanticCacheService } from '../types';
import { logger } from '@/lib/logger';

class SemanticCacheService implements ISemanticCacheService {
  private static instance: SemanticCacheService | null = null;
  private cache: Map<string, SemanticCacheEntry<unknown>> = new Map();
  private metrics = {
    hits: 0,
    misses: 0,
    totalLatency: 0,
    requestCount: 0,
    evictionCount: 0,
  };

  private constructor() {}

  public static getInstance(): SemanticCacheService {
    if (!SemanticCacheService.instance) {
      SemanticCacheService.instance = new SemanticCacheService();
    }
    return SemanticCacheService.instance;
  }

  public static resetInstance(): void {
    SemanticCacheService.instance = null;
  }

  public async get<T>(query: string): Promise<T | null> {
    const startTime = Date.now();
    const config = getVectorConfig();

    if (!config.cache.enabled) return null;

    try {
      const queryResult = await embeddingService.generateEmbedding(query);
      const queryEmbedding = queryResult.vector;

      let bestMatch: SemanticCacheEntry<T> | null = null;
      let highestSimilarity = 0;

      for (const entry of this.cache.values()) {
        if (entry.expiresAt && entry.expiresAt < new Date()) {
          this.cache.delete(entry.key);
          continue;
        }

        const similarity = this.cosineSimilarity(queryEmbedding, entry.embedding);

        if (similarity >= config.cache.similarityThreshold && similarity > highestSimilarity) {
          highestSimilarity = similarity;
          bestMatch = entry as SemanticCacheEntry<T>;
        }
      }

      const latency = Date.now() - startTime;
      this.metrics.totalLatency += latency;
      this.metrics.requestCount++;

      if (bestMatch) {
        bestMatch.hitCount++;
        bestMatch.similarity = highestSimilarity;
        this.metrics.hits++;
        logger.debug('[SemanticCache] Hit', { query, similarity: highestSimilarity, latency });
        return bestMatch.value as T;
      }

      this.metrics.misses++;
      logger.debug('[SemanticCache] Miss', { query, latency });
      return null;
    } catch (error) {
      logger.error('[SemanticCache] Get failed', { error, query });
      return null;
    }
  }

  public async set<T>(query: string, value: T, ttl?: number): Promise<void> {
    const config = getVectorConfig();
    if (!config.cache.enabled) return;

    try {
      const embeddingResult = await embeddingService.generateEmbedding(query);

      const ttlSeconds = ttl ?? config.cache.ttlSeconds;
      const expiresAt = ttlSeconds
        ? new Date(Date.now() + ttlSeconds * 1000)
        : new Date(Date.now() + 3600000);

      const entry: SemanticCacheEntry<T> = {
        key: query,
        embedding: embeddingResult.vector,
        value,
        similarity: 1.0,
        createdAt: new Date(),
        expiresAt,
        hitCount: 0,
      };

      if (this.cache.size >= config.cache.maxSize) {
        this.evictLRU();
      }

      this.cache.set(query, entry as SemanticCacheEntry<unknown>);
      logger.debug('[SemanticCache] Set', { query, ttl: ttlSeconds, size: this.cache.size });
    } catch (error) {
      logger.error('[SemanticCache] Set failed', { error, query });
    }
  }

  public async invalidate(pattern: string): Promise<number> {
    const config = getVectorConfig();
    if (!config.cache.enabled) return 0;

    try {
      const regex = new RegExp(pattern, 'i');
      let invalidatedCount = 0;

      for (const [key, entry] of this.cache.entries()) {
        if (regex.test(key) || regex.test(String(entry.value))) {
          this.cache.delete(key);
          invalidatedCount++;
        }
      }

      logger.debug('[SemanticCache] Invalidated', { pattern, count: invalidatedCount });
      return invalidatedCount;
    } catch (error) {
      logger.error('[SemanticCache] Invalidate failed', { error, pattern });
      return 0;
    }
  }

  public getMetrics(): CacheMetrics {
    const total = this.metrics.hits + this.metrics.misses;
    return {
      size: this.cache.size,
      hitRate: total > 0 ? this.metrics.hits / total : 0,
      missRate: total > 0 ? this.metrics.misses / total : 0,
      avgLatency:
        this.metrics.requestCount > 0 ? this.metrics.totalLatency / this.metrics.requestCount : 0,
      evictionCount: this.metrics.evictionCount,
    };
  }

  public clear(): void {
    this.cache.clear();
    logger.debug('[SemanticCache] Cleared');
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0,
      normA = 0,
      normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruScore = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      const score = entry.createdAt.getTime() - entry.hitCount * 1000000;
      if (score < lruScore) {
        lruScore = score;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      this.metrics.evictionCount++;
      logger.debug('[SemanticCache] Evicted LRU', { key: lruKey });
    }
  }
}

export const semanticCacheService = SemanticCacheService.getInstance();
export { SemanticCacheService };
