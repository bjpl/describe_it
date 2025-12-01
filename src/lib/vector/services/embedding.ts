/**
 * EmbeddingService
 * Generates vector embeddings using Claude API with caching and fallback
 */

import Anthropic from '@anthropic-ai/sdk';
import { getVectorConfig } from '../config';
import type { EmbeddingOptions, EmbeddingResult, IEmbeddingService } from '../types';
import { EmbeddingError } from '../types';
import { logger } from '@/lib/logger';

interface CacheEntry {
  result: EmbeddingResult;
  timestamp: number;
}

class EmbeddingService implements IEmbeddingService {
  private static instance: EmbeddingService | null = null;
  private client: Anthropic | null = null;
  private cache: Map<string, CacheEntry> = new Map();
  private config = getVectorConfig();
  private readonly CACHE_TTL = 3600000; // 1 hour
  private readonly MAX_CACHE_SIZE = 10000;

  private constructor() {
    if (process.env.ANTHROPIC_API_KEY) {
      this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
  }

  public static getInstance(): EmbeddingService {
    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService();
    }
    return EmbeddingService.instance;
  }

  public static resetInstance(): void {
    EmbeddingService.instance = null;
  }

  public async generateEmbedding(
    text: string,
    options: EmbeddingOptions = {}
  ): Promise<EmbeddingResult> {
    const cacheKey = this.getCacheKey(text, options);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    try {
      const embedding = await this.generateWithClaude(text, options);
      this.setCache(cacheKey, embedding);
      return embedding;
    } catch (error) {
      logger.warn('[EmbeddingService] Claude API failed, using fallback', { error });
      return this.generateFallbackEmbedding(text, options);
    }
  }

  public async batchEmbeddings(
    texts: string[],
    options: EmbeddingOptions = {}
  ): Promise<EmbeddingResult[]> {
    const batchSize = options.batchSize || this.config.embedding.batchSize;
    const results: EmbeddingResult[] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(text => this.generateEmbedding(text, options))
      );
      results.push(...batchResults);

      // Rate limiting between batches
      if (i + batchSize < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  public getSimilarity(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  private async generateWithClaude(
    text: string,
    options: EmbeddingOptions
  ): Promise<EmbeddingResult> {
    if (!this.client) {
      throw new EmbeddingError('Anthropic client not initialized');
    }

    const dimensions = options.dimensions || this.config.embedding.dimensions;

    // Use Claude to generate semantic representation
    const response = await this.client.messages.create({
      model: options.model || this.config.embedding.model,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Generate a semantic vector representation for the following text. 
Output ONLY a JSON array of ${dimensions} floating point numbers between -1 and 1 that capture the semantic meaning.
No explanation, just the array.

Text: ${text}`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new EmbeddingError('Unexpected response type from Claude');
    }

    try {
      const vector = JSON.parse(content.text);
      if (!Array.isArray(vector) || vector.length !== dimensions) {
        throw new EmbeddingError(
          `Invalid vector dimensions: expected ${dimensions}, got ${vector.length}`
        );
      }

      return {
        vector: this.normalizeVector(vector),
        model: options.model || this.config.embedding.model,
        dimensions,
        tokenCount: response.usage?.input_tokens || 0,
        cached: false,
      };
    } catch (parseError) {
      throw new EmbeddingError('Failed to parse embedding response', { parseError });
    }
  }

  private generateFallbackEmbedding(text: string, options: EmbeddingOptions): EmbeddingResult {
    const dimensions = options.dimensions || this.config.embedding.dimensions;
    const vector = new Array(dimensions).fill(0);

    // Simple hash-based pseudo-embedding for fallback
    const normalized = text.toLowerCase().trim();
    for (let i = 0; i < normalized.length; i++) {
      const charCode = normalized.charCodeAt(i);
      const idx = (charCode * (i + 1)) % dimensions;
      vector[idx] = (vector[idx] + Math.sin(charCode * 0.1)) / 2;
    }

    return {
      vector: this.normalizeVector(vector),
      model: 'fallback-hash',
      dimensions,
      tokenCount: 0,
      cached: false,
    };
  }

  private normalizeVector(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    if (magnitude === 0) return vector;
    return vector.map(v => v / magnitude);
  }

  private getCacheKey(text: string, options: EmbeddingOptions): string {
    return `${options.model || 'default'}:${options.dimensions || 'default'}:${text}`;
  }

  private getFromCache(key: string): EmbeddingResult | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.result;
  }

  private setCache(key: string, result: EmbeddingResult): void {
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      // Evict oldest entries
      const entries = [...this.cache.entries()];
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      for (let i = 0; i < this.MAX_CACHE_SIZE * 0.1; i++) {
        this.cache.delete(entries[i][0]);
      }
    }

    this.cache.set(key, { result, timestamp: Date.now() });
  }

  public clearCache(): void {
    this.cache.clear();
  }

  public getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0, // Would need hit/miss tracking for accurate rate
    };
  }
}

export const embeddingService = EmbeddingService.getInstance();
export { EmbeddingService };
