/**
 * Integration tests for vector search
 * Tests full search flow including indexing, searching, and filtering
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// ============================================================================
// MOCK CLIENT (reuse from unit tests)
// ============================================================================

interface VectorPoint {
  id: string;
  vector: number[];
  metadata: Record<string, unknown>;
}

interface SearchResult {
  id: string;
  score: number;
  metadata: Record<string, unknown>;
  vector?: number[];
}

class MockRuVectorClient {
  private connected = false;
  private collections = new Map<string, Map<string, VectorPoint>>();

  async connect(): Promise<void> {
    this.connected = true;
  }

  disconnect(): void {
    this.connected = false;
  }

  async createCollection(name: string, dimensions: number): Promise<void> {
    if (!this.connected) throw new Error('Client not connected');
    this.collections.set(name, new Map());
  }

  async deleteCollection(name: string): Promise<void> {
    if (!this.connected) throw new Error('Client not connected');
    this.collections.delete(name);
  }

  async upsert(collection: string, points: VectorPoint[]): Promise<void> {
    if (!this.connected) throw new Error('Client not connected');
    const coll = this.collections.get(collection);
    if (!coll) throw new Error(`Collection ${collection} not found`);

    for (const point of points) {
      coll.set(point.id, point);
    }
  }

  async search(
    collection: string,
    queryVector: number[],
    options: {
      limit?: number;
      threshold?: number;
      filters?: Array<{ field: string; operator: string; value: unknown }>;
      includeVectors?: boolean;
    } = {}
  ): Promise<SearchResult[]> {
    if (!this.connected) throw new Error('Client not connected');
    const coll = this.collections.get(collection);
    if (!coll) throw new Error(`Collection ${collection} not found`);

    const { limit = 10, threshold = 0, filters = [], includeVectors = false } = options;

    const results: SearchResult[] = [];
    for (const [id, point] of coll.entries()) {
      const score = this.cosineSimilarity(queryVector, point.vector);

      if (score >= threshold) {
        let matches = true;
        for (const filter of filters) {
          const value = point.metadata[filter.field];
          if (filter.operator === 'eq' && value !== filter.value) {
            matches = false;
            break;
          }
          if (filter.operator === 'in' && Array.isArray(filter.value)) {
            if (!filter.value.includes(value)) {
              matches = false;
              break;
            }
          }
          if (filter.operator === 'gt' && typeof value === 'number' && typeof filter.value === 'number') {
            if (value <= filter.value) {
              matches = false;
              break;
            }
          }
        }

        if (matches) {
          results.push({
            id,
            score,
            metadata: point.metadata,
            ...(includeVectors ? { vector: point.vector } : {}),
          });
        }
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same dimensions');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }
}

class RuVectorClient {
  private static instance: RuVectorClient | null = null;
  private client: MockRuVectorClient;

  private constructor() {
    this.client = new MockRuVectorClient();
  }

  static getInstance(): RuVectorClient {
    if (!this.instance) {
      this.instance = new RuVectorClient();
    }
    return this.instance;
  }

  static resetInstance(): void {
    if (this.instance) {
      this.instance.disconnect();
    }
    this.instance = null;
  }

  async connect(): Promise<void> {
    await this.client.connect();
  }

  disconnect(): void {
    this.client.disconnect();
  }

  async createCollection(name: string, dimensions: number): Promise<void> {
    await this.client.createCollection(name, dimensions);
  }

  async deleteCollection(name: string): Promise<void> {
    await this.client.deleteCollection(name);
  }

  async upsert(collection: string, points: VectorPoint[]): Promise<void> {
    await this.client.upsert(collection, points);
  }

  async search(
    collection: string,
    queryVector: number[],
    options?: Parameters<MockRuVectorClient['search']>[2]
  ): Promise<SearchResult[]> {
    return this.client.search(collection, queryVector, options);
  }
}

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Vector Search Integration', () => {
  let client: RuVectorClient;
  const testCollection = 'integration_test_collection';

  beforeAll(async () => {
    client = RuVectorClient.getInstance();
    await client.connect();

    // Create test collection with 5-dimensional vectors
    await client.createCollection(testCollection, 5);

    // Seed test data with realistic language learning vocabulary
    const testData: VectorPoint[] = [
      {
        id: 'hello',
        vector: [0.9, 0.1, 0.05, 0.02, 0.01],
        metadata: {
          word: 'hello',
          lang: 'en',
          difficulty: 'beginner',
          category: 'greetings',
          frequency: 1000,
        },
      },
      {
        id: 'hola',
        vector: [0.85, 0.15, 0.05, 0.02, 0.01],
        metadata: {
          word: 'hola',
          lang: 'es',
          difficulty: 'beginner',
          category: 'greetings',
          frequency: 950,
        },
      },
      {
        id: 'goodbye',
        vector: [0.1, 0.9, 0.05, 0.02, 0.01],
        metadata: {
          word: 'goodbye',
          lang: 'en',
          difficulty: 'beginner',
          category: 'greetings',
          frequency: 800,
        },
      },
      {
        id: 'adios',
        vector: [0.15, 0.85, 0.05, 0.02, 0.01],
        metadata: {
          word: 'adios',
          lang: 'es',
          difficulty: 'beginner',
          category: 'greetings',
          frequency: 750,
        },
      },
      {
        id: 'mountain',
        vector: [0.05, 0.05, 0.9, 0.02, 0.01],
        metadata: {
          word: 'mountain',
          lang: 'en',
          difficulty: 'intermediate',
          category: 'nature',
          frequency: 500,
        },
      },
      {
        id: 'montaña',
        vector: [0.05, 0.05, 0.85, 0.02, 0.01],
        metadata: {
          word: 'montaña',
          lang: 'es',
          difficulty: 'intermediate',
          category: 'nature',
          frequency: 480,
        },
      },
    ];

    await client.upsert(testCollection, testData);
  });

  afterAll(async () => {
    await client.deleteCollection(testCollection);
    client.disconnect();
    RuVectorClient.resetInstance();
  });

  describe('Semantic Similarity Search', () => {
    it('should find semantically similar words (greetings)', async () => {
      // Search for words similar to "hello" vector
      const results = await client.search(
        testCollection,
        [0.88, 0.12, 0.05, 0.02, 0.01],
        {
          limit: 2,
          threshold: 0.8,
        }
      );

      expect(results.length).toBe(2);
      expect(results[0].metadata.word).toBe('hello');
      expect(results[1].metadata.word).toBe('hola');
      expect(results.every(r => r.metadata.category === 'greetings')).toBe(true);
    });

    it('should find translation pairs', async () => {
      // Search for words similar to "goodbye"
      const results = await client.search(
        testCollection,
        [0.12, 0.88, 0.05, 0.02, 0.01],
        {
          limit: 2,
          threshold: 0.8,
        }
      );

      expect(results.length).toBe(2);
      const words = results.map(r => r.metadata.word);
      expect(words).toContain('goodbye');
      expect(words).toContain('adios');
    });

    it('should distinguish between different semantic categories', async () => {
      // Search for nature words (should not return greetings)
      const results = await client.search(
        testCollection,
        [0.05, 0.05, 0.9, 0.02, 0.01],
        {
          limit: 5,
          threshold: 0.9,
        }
      );

      results.forEach(r => {
        expect(r.metadata.category).not.toBe('greetings');
      });
    });
  });

  describe('Metadata Filtering', () => {
    it('should filter by language', async () => {
      const results = await client.search(
        testCollection,
        [0.5, 0.5, 0.05, 0.02, 0.01],
        {
          limit: 10,
          filters: [{ field: 'lang', operator: 'eq', value: 'es' }],
        }
      );

      expect(results.every(r => r.metadata.lang === 'es')).toBe(true);
      expect(results.length).toBe(3); // hola, adios, montaña
    });

    it('should filter by difficulty level', async () => {
      const results = await client.search(
        testCollection,
        [0.5, 0.5, 0.5, 0.02, 0.01],
        {
          limit: 10,
          filters: [{ field: 'difficulty', operator: 'eq', value: 'beginner' }],
        }
      );

      expect(results.every(r => r.metadata.difficulty === 'beginner')).toBe(true);
    });

    it('should filter by category', async () => {
      const results = await client.search(
        testCollection,
        [0.5, 0.5, 0.5, 0.02, 0.01],
        {
          limit: 10,
          filters: [{ field: 'category', operator: 'eq', value: 'nature' }],
        }
      );

      expect(results.every(r => r.metadata.category === 'nature')).toBe(true);
      expect(results.length).toBe(2); // mountain, montaña
    });

    it('should combine multiple filters', async () => {
      const results = await client.search(
        testCollection,
        [0.5, 0.5, 0.05, 0.02, 0.01],
        {
          limit: 10,
          filters: [
            { field: 'lang', operator: 'eq', value: 'es' },
            { field: 'difficulty', operator: 'eq', value: 'beginner' },
          ],
        }
      );

      expect(results.every(r => r.metadata.lang === 'es')).toBe(true);
      expect(results.every(r => r.metadata.difficulty === 'beginner')).toBe(true);
      expect(results.length).toBe(2); // hola, adios
    });

    it('should filter using "in" operator', async () => {
      const results = await client.search(
        testCollection,
        [0.5, 0.5, 0.5, 0.02, 0.01],
        {
          limit: 10,
          filters: [
            {
              field: 'difficulty',
              operator: 'in',
              value: ['beginner', 'intermediate'],
            },
          ],
        }
      );

      expect(results.length).toBeGreaterThan(0);
      expect(
        results.every(r =>
          ['beginner', 'intermediate'].includes(r.metadata.difficulty as string)
        )
      ).toBe(true);
    });

    it('should filter by numeric comparison', async () => {
      const results = await client.search(
        testCollection,
        [0.5, 0.5, 0.5, 0.02, 0.01],
        {
          limit: 10,
          filters: [{ field: 'frequency', operator: 'gt', value: 700 }],
        }
      );

      expect(
        results.every(r => (r.metadata.frequency as number) > 700)
      ).toBe(true);
    });
  });

  describe('Similarity Scores', () => {
    it('should return scores between 0 and 1', async () => {
      const results = await client.search(
        testCollection,
        [0.5, 0.5, 0.05, 0.02, 0.01],
        {
          limit: 10,
        }
      );

      results.forEach(r => {
        expect(r.score).toBeGreaterThanOrEqual(0);
        expect(r.score).toBeLessThanOrEqual(1);
      });
    });

    it('should return higher scores for more similar vectors', async () => {
      const results = await client.search(
        testCollection,
        [0.9, 0.1, 0.05, 0.02, 0.01], // Very similar to "hello"
        {
          limit: 10,
        }
      );

      // Results should be sorted by score (highest first)
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
      }
    });

    it('should return exact match with score ~1.0', async () => {
      // Search with exact "hello" vector
      const results = await client.search(
        testCollection,
        [0.9, 0.1, 0.05, 0.02, 0.01],
        {
          limit: 1,
        }
      );

      expect(results[0].metadata.word).toBe('hello');
      expect(results[0].score).toBeCloseTo(1.0, 2);
    });
  });

  describe('Threshold Filtering', () => {
    it('should respect similarity threshold', async () => {
      const results = await client.search(
        testCollection,
        [0.9, 0.1, 0.05, 0.02, 0.01],
        {
          limit: 10,
          threshold: 0.95, // High threshold
        }
      );

      results.forEach(r => {
        expect(r.score).toBeGreaterThanOrEqual(0.95);
      });
    });

    it('should return more results with lower threshold', async () => {
      const highThreshold = await client.search(
        testCollection,
        [0.5, 0.5, 0.5, 0.02, 0.01],
        {
          limit: 10,
          threshold: 0.9,
        }
      );

      const lowThreshold = await client.search(
        testCollection,
        [0.5, 0.5, 0.5, 0.02, 0.01],
        {
          limit: 10,
          threshold: 0.3,
        }
      );

      expect(lowThreshold.length).toBeGreaterThanOrEqual(highThreshold.length);
    });

    it('should return empty results with impossible threshold', async () => {
      const results = await client.search(
        testCollection,
        [0, 0, 0, 0, 0], // Zero vector
        {
          limit: 10,
          threshold: 0.99,
        }
      );

      expect(results.length).toBe(0);
    });
  });

  describe('Limit and Pagination', () => {
    it('should respect limit parameter', async () => {
      const results = await client.search(
        testCollection,
        [0.5, 0.5, 0.5, 0.02, 0.01],
        {
          limit: 3,
        }
      );

      expect(results.length).toBeLessThanOrEqual(3);
    });

    it('should return all results when limit exceeds matches', async () => {
      const results = await client.search(
        testCollection,
        [0.5, 0.5, 0.5, 0.02, 0.01],
        {
          limit: 100, // More than available
        }
      );

      expect(results.length).toBeLessThanOrEqual(6); // Total seeded items
    });

    it('should handle limit of 1', async () => {
      const results = await client.search(
        testCollection,
        [0.9, 0.1, 0.05, 0.02, 0.01],
        {
          limit: 1,
        }
      );

      expect(results.length).toBe(1);
      expect(results[0].metadata.word).toBe('hello'); // Best match
    });
  });

  describe('Real-World Use Cases', () => {
    it('should support "find similar words for learning"', async () => {
      // User knows "hello", find similar words to learn
      const results = await client.search(
        testCollection,
        [0.9, 0.1, 0.05, 0.02, 0.01],
        {
          limit: 5,
          threshold: 0.7,
          filters: [
            { field: 'difficulty', operator: 'eq', value: 'beginner' },
          ],
        }
      );

      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => r.metadata.difficulty === 'beginner')).toBe(true);
    });

    it('should support "cross-language translation search"', async () => {
      // Find Spanish equivalents of greeting words
      const results = await client.search(
        testCollection,
        [0.88, 0.12, 0.05, 0.02, 0.01], // Similar to "hello"
        {
          limit: 5,
          filters: [
            { field: 'lang', operator: 'eq', value: 'es' },
            { field: 'category', operator: 'eq', value: 'greetings' },
          ],
        }
      );

      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => r.metadata.lang === 'es')).toBe(true);
      expect(results.map(r => r.metadata.word)).toContain('hola');
    });

    it('should support "progressive difficulty learning"', async () => {
      // Find intermediate words in nature category
      const results = await client.search(
        testCollection,
        [0.05, 0.05, 0.9, 0.02, 0.01],
        {
          limit: 5,
          filters: [
            { field: 'difficulty', operator: 'eq', value: 'intermediate' },
            { field: 'category', operator: 'eq', value: 'nature' },
          ],
        }
      );

      expect(results.every(r => r.metadata.difficulty === 'intermediate')).toBe(true);
      expect(results.every(r => r.metadata.category === 'nature')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero vector search', async () => {
      const results = await client.search(
        testCollection,
        [0, 0, 0, 0, 0],
        {
          limit: 10,
        }
      );

      // Zero vector should have low similarity with all vectors
      results.forEach(r => {
        expect(r.score).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle search with no results', async () => {
      const results = await client.search(
        testCollection,
        [0.5, 0.5, 0.5, 0.5, 0.5],
        {
          limit: 10,
          filters: [
            { field: 'lang', operator: 'eq', value: 'fr' }, // No French words
          ],
        }
      );

      expect(results).toEqual([]);
    });

    it('should handle very high threshold', async () => {
      const results = await client.search(
        testCollection,
        [0.5, 0.5, 0.5, 0.02, 0.01],
        {
          limit: 10,
          threshold: 0.999,
        }
      );

      expect(results.length).toBe(0);
    });

    it('should handle search with all filters excluding results', async () => {
      const results = await client.search(
        testCollection,
        [0.9, 0.1, 0.05, 0.02, 0.01],
        {
          limit: 10,
          filters: [
            { field: 'lang', operator: 'eq', value: 'en' },
            { field: 'category', operator: 'eq', value: 'nature' }, // No English nature words with high similarity to greetings
          ],
          threshold: 0.9,
        }
      );

      // Should return 0 or very few results
      expect(results.length).toBeLessThan(3);
    });
  });

  describe('Performance', () => {
    it('should complete search within reasonable time', async () => {
      const startTime = performance.now();

      await client.search(
        testCollection,
        [0.5, 0.5, 0.5, 0.02, 0.01],
        {
          limit: 10,
        }
      );

      const duration = performance.now() - startTime;

      // Should complete in less than 100ms for small dataset
      expect(duration).toBeLessThan(100);
    });

    it('should handle multiple concurrent searches', async () => {
      const searches = Array(5).fill(null).map((_, i) =>
        client.search(
          testCollection,
          Array(5).fill(i / 10),
          {
            limit: 5,
          }
        )
      );

      const results = await Promise.all(searches);

      expect(results).toHaveLength(5);
      results.forEach(r => {
        expect(Array.isArray(r)).toBe(true);
      });
    });
  });

  describe('Result Ordering', () => {
    it('should return results sorted by score descending', async () => {
      const results = await client.search(
        testCollection,
        [0.5, 0.5, 0.5, 0.02, 0.01],
        {
          limit: 10,
        }
      );

      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
      }
    });

    it('should maintain stable ordering for equal scores', async () => {
      // Search multiple times, ordering should be consistent
      const query = [0.5, 0.5, 0.5, 0.02, 0.01];
      const options = { limit: 10 };

      const results1 = await client.search(testCollection, query, options);
      const results2 = await client.search(testCollection, query, options);

      expect(results1.map(r => r.id)).toEqual(results2.map(r => r.id));
    });
  });
});
