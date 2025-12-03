/**
 * Unit tests for RuVector client
 * Tests client initialization, connection, and CRUD operations with mock backend
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ============================================================================
// MOCK CLIENT IMPLEMENTATION
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

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  collections: number;
  totalVectors: number;
}

/**
 * Mock RuVector client for testing
 */
class MockRuVectorClient {
  private connected = false;
  private collections = new Map<string, Map<string, VectorPoint>>();

  async connect(): Promise<void> {
    this.connected = true;
  }

  disconnect(): void {
    this.connected = false;
  }

  isReady(): boolean {
    return this.connected;
  }

  async healthCheck(): Promise<HealthStatus> {
    if (!this.connected) {
      throw new Error('Client not connected');
    }

    return {
      status: 'healthy',
      uptime: 12345,
      collections: this.collections.size,
      totalVectors: Array.from(this.collections.values())
        .reduce((sum, coll) => sum + coll.size, 0),
    };
  }

  async createCollection(name: string, dimensions: number): Promise<void> {
    if (!this.connected) {
      throw new Error('Client not connected');
    }
    this.collections.set(name, new Map());
  }

  async deleteCollection(name: string): Promise<void> {
    if (!this.connected) {
      throw new Error('Client not connected');
    }
    this.collections.delete(name);
  }

  async collectionExists(name: string): Promise<boolean> {
    return this.collections.has(name);
  }

  async upsert(collection: string, points: VectorPoint[]): Promise<void> {
    if (!this.connected) {
      throw new Error('Client not connected');
    }

    const coll = this.collections.get(collection);
    if (!coll) {
      throw new Error(`Collection ${collection} not found`);
    }

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
    } = {}
  ): Promise<SearchResult[]> {
    if (!this.connected) {
      throw new Error('Client not connected');
    }

    const coll = this.collections.get(collection);
    if (!coll) {
      throw new Error(`Collection ${collection} not found`);
    }

    const { limit = 10, threshold = 0, filters = [] } = options;

    // Calculate cosine similarity for each point
    const results: SearchResult[] = [];
    for (const [id, point] of coll.entries()) {
      const score = this.cosineSimilarity(queryVector, point.vector);

      if (score >= threshold) {
        // Apply filters
        let matches = true;
        for (const filter of filters) {
          const value = point.metadata[filter.field];
          if (filter.operator === 'eq' && value !== filter.value) {
            matches = false;
            break;
          }
        }

        if (matches) {
          results.push({
            id,
            score,
            metadata: point.metadata,
          });
        }
      }
    }

    // Sort by score descending and limit
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  async get(collection: string, ids: string[]): Promise<VectorPoint[]> {
    if (!this.connected) {
      throw new Error('Client not connected');
    }

    const coll = this.collections.get(collection);
    if (!coll) {
      throw new Error(`Collection ${collection} not found`);
    }

    const results: VectorPoint[] = [];
    for (const id of ids) {
      const point = coll.get(id);
      if (point) {
        results.push(point);
      }
    }

    return results;
  }

  async delete(collection: string, ids: string[]): Promise<void> {
    if (!this.connected) {
      throw new Error('Client not connected');
    }

    const coll = this.collections.get(collection);
    if (!coll) {
      throw new Error(`Collection ${collection} not found`);
    }

    for (const id of ids) {
      coll.delete(id);
    }
  }

  getClient(): this {
    return this;
  }

  get collectionsMap() {
    return this.collections;
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

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

/**
 * Singleton wrapper for test client
 */
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

  isReady(): boolean {
    return this.client.isReady();
  }

  async healthCheck(): Promise<HealthStatus> {
    return this.client.healthCheck();
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

  async get(collection: string, ids: string[]): Promise<VectorPoint[]> {
    return this.client.get(collection, ids);
  }

  async delete(collection: string, ids: string[]): Promise<void> {
    await this.client.delete(collection, ids);
  }

  getClient(): MockRuVectorClient {
    return this.client;
  }
}

// ============================================================================
// TESTS
// ============================================================================

describe('RuVectorClient', () => {
  beforeEach(() => {
    RuVectorClient.resetInstance();
  });

  afterEach(() => {
    RuVectorClient.resetInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return singleton instance', () => {
      const instance1 = RuVectorClient.getInstance();
      const instance2 = RuVectorClient.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should create new instance after reset', () => {
      const instance1 = RuVectorClient.getInstance();
      RuVectorClient.resetInstance();
      const instance2 = RuVectorClient.getInstance();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Connection Management', () => {
    it('should connect successfully', async () => {
      const client = RuVectorClient.getInstance();
      await client.connect();

      expect(client.isReady()).toBe(true);
    });

    it('should start disconnected', () => {
      const client = RuVectorClient.getInstance();
      expect(client.isReady()).toBe(false);
    });

    it('should disconnect successfully', async () => {
      const client = RuVectorClient.getInstance();
      await client.connect();
      expect(client.isReady()).toBe(true);

      client.disconnect();
      expect(client.isReady()).toBe(false);
    });

    it('should handle multiple connect calls', async () => {
      const client = RuVectorClient.getInstance();
      await client.connect();
      await client.connect();

      expect(client.isReady()).toBe(true);
    });
  });

  describe('Health Check', () => {
    it('should pass health check when connected', async () => {
      const client = RuVectorClient.getInstance();
      await client.connect();

      const health = await client.healthCheck();
      expect(health.status).toBe('healthy');
      expect(health.uptime).toBeGreaterThan(0);
    });

    it('should fail health check when not connected', async () => {
      const client = RuVectorClient.getInstance();

      await expect(client.healthCheck()).rejects.toThrow('not connected');
    });

    it('should report collection count', async () => {
      const client = RuVectorClient.getInstance();
      await client.connect();
      await client.createCollection('test', 5);

      const health = await client.healthCheck();
      expect(health.collections).toBe(1);
    });
  });

  describe('Collection Management', () => {
    it('should create collection', async () => {
      const client = RuVectorClient.getInstance();
      await client.connect();

      await client.createCollection('test_collection', 128);

      const rawClient = client.getClient();
      const exists = await rawClient.collectionExists('test_collection');
      expect(exists).toBe(true);
    });

    it('should delete collection', async () => {
      const client = RuVectorClient.getInstance();
      await client.connect();

      await client.createCollection('test_collection', 128);
      await client.deleteCollection('test_collection');

      const rawClient = client.getClient();
      const exists = await rawClient.collectionExists('test_collection');
      expect(exists).toBe(false);
    });

    it('should throw when creating collection while disconnected', async () => {
      const client = RuVectorClient.getInstance();

      await expect(
        client.createCollection('test', 128)
      ).rejects.toThrow('not connected');
    });
  });

  describe('Vector Operations - Upsert', () => {
    it('should upsert vectors', async () => {
      const client = RuVectorClient.getInstance();
      await client.connect();
      await client.createCollection('test', 5);

      await client.upsert('test', [
        {
          id: 'vec-1',
          vector: [0.1, 0.2, 0.3, 0.4, 0.5],
          metadata: { word: 'hello' },
        },
      ]);

      const results = await client.get('test', ['vec-1']);
      expect(results).toHaveLength(1);
      expect(results[0].metadata.word).toBe('hello');
    });

    it('should upsert multiple vectors', async () => {
      const client = RuVectorClient.getInstance();
      await client.connect();
      await client.createCollection('test', 3);

      await client.upsert('test', [
        { id: 'v1', vector: [0.1, 0.2, 0.3], metadata: { idx: 1 } },
        { id: 'v2', vector: [0.4, 0.5, 0.6], metadata: { idx: 2 } },
        { id: 'v3', vector: [0.7, 0.8, 0.9], metadata: { idx: 3 } },
      ]);

      const results = await client.get('test', ['v1', 'v2', 'v3']);
      expect(results).toHaveLength(3);
    });

    it('should update existing vector', async () => {
      const client = RuVectorClient.getInstance();
      await client.connect();
      await client.createCollection('test', 2);

      await client.upsert('test', [
        { id: 'vec-1', vector: [0.1, 0.2], metadata: { value: 'old' } },
      ]);

      await client.upsert('test', [
        { id: 'vec-1', vector: [0.3, 0.4], metadata: { value: 'new' } },
      ]);

      const results = await client.get('test', ['vec-1']);
      expect(results[0].metadata.value).toBe('new');
      expect(results[0].vector).toEqual([0.3, 0.4]);
    });

    it('should throw when upserting to non-existent collection', async () => {
      const client = RuVectorClient.getInstance();
      await client.connect();

      await expect(
        client.upsert('nonexistent', [
          { id: 'v1', vector: [0.1], metadata: {} },
        ])
      ).rejects.toThrow('not found');
    });
  });

  describe('Vector Operations - Search', () => {
    it('should find similar vectors', async () => {
      const client = RuVectorClient.getInstance();
      await client.connect();
      await client.createCollection('test', 5);

      await client.upsert('test', [
        { id: 'similar', vector: [0.9, 0.1, 0.05, 0.02, 0.01], metadata: { type: 'A' } },
        { id: 'different', vector: [0.1, 0.9, 0.05, 0.02, 0.01], metadata: { type: 'B' } },
      ]);

      const results = await client.search('test', [0.88, 0.12, 0.05, 0.02, 0.01], {
        limit: 5,
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('similar');
      expect(results[0].score).toBeCloseTo(1, 1);
    });

    it('should respect limit option', async () => {
      const client = RuVectorClient.getInstance();
      await client.connect();
      await client.createCollection('test', 5);

      const points = Array.from({ length: 10 }, (_, i) => ({
        id: `vec-${i}`,
        vector: Array.from({ length: 5 }, () => Math.random()),
        metadata: { index: i },
      }));
      await client.upsert('test', points);

      const results = await client.search('test', [0.5, 0.5, 0.5, 0.5, 0.5], {
        limit: 3,
      });

      expect(results.length).toBeLessThanOrEqual(3);
    });

    it('should filter by threshold', async () => {
      const client = RuVectorClient.getInstance();
      await client.connect();
      await client.createCollection('test', 3);

      await client.upsert('test', [
        { id: 'exact', vector: [1, 0, 0], metadata: {} },
        { id: 'similar', vector: [0.9, 0.1, 0], metadata: {} },
        { id: 'different', vector: [0, 0, 1], metadata: {} },
      ]);

      const results = await client.search('test', [1, 0, 0], {
        threshold: 0.8,
        limit: 10,
      });

      // Only exact and similar should match (threshold 0.8)
      expect(results.length).toBeLessThanOrEqual(2);
      expect(results.every(r => r.score >= 0.8)).toBe(true);
    });

    it('should apply metadata filters', async () => {
      const client = RuVectorClient.getInstance();
      await client.connect();
      await client.createCollection('test', 3);

      await client.upsert('test', [
        { id: 'es-1', vector: [0.5, 0.5, 0], metadata: { lang: 'es' } },
        { id: 'en-1', vector: [0.5, 0.5, 0], metadata: { lang: 'en' } },
        { id: 'es-2', vector: [0.5, 0.5, 0], metadata: { lang: 'es' } },
      ]);

      const results = await client.search('test', [0.5, 0.5, 0], {
        filters: [{ field: 'lang', operator: 'eq', value: 'es' }],
        limit: 10,
      });

      expect(results.every(r => r.metadata.lang === 'es')).toBe(true);
      expect(results.length).toBe(2);
    });

    it('should return scores between 0 and 1', async () => {
      const client = RuVectorClient.getInstance();
      await client.connect();
      await client.createCollection('test', 5);

      await client.upsert('test', [
        { id: 'v1', vector: [0.1, 0.2, 0.3, 0.4, 0.5], metadata: {} },
        { id: 'v2', vector: [0.6, 0.7, 0.8, 0.9, 1.0], metadata: {} },
      ]);

      const results = await client.search('test', [0.5, 0.5, 0.5, 0.5, 0.5], {
        limit: 10,
      });

      results.forEach(r => {
        expect(r.score).toBeGreaterThanOrEqual(0);
        expect(r.score).toBeLessThanOrEqual(1);
      });
    });

    it('should return empty array when no matches', async () => {
      const client = RuVectorClient.getInstance();
      await client.connect();
      await client.createCollection('test', 3);

      const results = await client.search('test', [1, 0, 0], {
        limit: 10,
      });

      expect(results).toEqual([]);
    });
  });

  describe('Vector Operations - Get', () => {
    it('should retrieve vectors by ID', async () => {
      const client = RuVectorClient.getInstance();
      await client.connect();
      await client.createCollection('test', 2);

      await client.upsert('test', [
        { id: 'v1', vector: [0.1, 0.2], metadata: { name: 'first' } },
        { id: 'v2', vector: [0.3, 0.4], metadata: { name: 'second' } },
      ]);

      const results = await client.get('test', ['v1', 'v2']);
      expect(results).toHaveLength(2);
      expect(results[0].metadata.name).toBe('first');
      expect(results[1].metadata.name).toBe('second');
    });

    it('should return empty array for non-existent IDs', async () => {
      const client = RuVectorClient.getInstance();
      await client.connect();
      await client.createCollection('test', 2);

      const results = await client.get('test', ['nonexistent']);
      expect(results).toEqual([]);
    });

    it('should handle partial matches', async () => {
      const client = RuVectorClient.getInstance();
      await client.connect();
      await client.createCollection('test', 2);

      await client.upsert('test', [
        { id: 'exists', vector: [0.1, 0.2], metadata: {} },
      ]);

      const results = await client.get('test', ['exists', 'nonexistent']);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('exists');
    });
  });

  describe('Vector Operations - Delete', () => {
    it('should delete vectors by ID', async () => {
      const client = RuVectorClient.getInstance();
      await client.connect();
      await client.createCollection('test', 2);

      await client.upsert('test', [
        { id: 'to-delete', vector: [0.1, 0.2], metadata: {} },
        { id: 'to-keep', vector: [0.3, 0.4], metadata: {} },
      ]);

      await client.delete('test', ['to-delete']);

      const results = await client.get('test', ['to-delete', 'to-keep']);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('to-keep');
    });

    it('should delete multiple vectors', async () => {
      const client = RuVectorClient.getInstance();
      await client.connect();
      await client.createCollection('test', 2);

      await client.upsert('test', [
        { id: 'v1', vector: [0.1, 0.2], metadata: {} },
        { id: 'v2', vector: [0.3, 0.4], metadata: {} },
        { id: 'v3', vector: [0.5, 0.6], metadata: {} },
      ]);

      await client.delete('test', ['v1', 'v2']);

      const results = await client.get('test', ['v1', 'v2', 'v3']);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('v3');
    });

    it('should handle delete of non-existent IDs gracefully', async () => {
      const client = RuVectorClient.getInstance();
      await client.connect();
      await client.createCollection('test', 2);

      await expect(
        client.delete('test', ['nonexistent'])
      ).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should throw when operations performed while disconnected', async () => {
      const client = RuVectorClient.getInstance();

      await expect(
        client.search('test', [0.1])
      ).rejects.toThrow('not connected');

      await expect(
        client.upsert('test', [{ id: 'v1', vector: [0.1], metadata: {} }])
      ).rejects.toThrow('not connected');

      await expect(
        client.get('test', ['v1'])
      ).rejects.toThrow('not connected');

      await expect(
        client.delete('test', ['v1'])
      ).rejects.toThrow('not connected');
    });

    it('should throw for invalid collection names', async () => {
      const client = RuVectorClient.getInstance();
      await client.connect();

      await expect(
        client.upsert('nonexistent', [{ id: 'v1', vector: [0.1], metadata: {} }])
      ).rejects.toThrow('not found');
    });

    it('should throw for mismatched vector dimensions', async () => {
      const client = RuVectorClient.getInstance();
      await client.connect();
      await client.createCollection('test', 3);

      await client.upsert('test', [
        { id: 'v1', vector: [0.1, 0.2, 0.3], metadata: {} },
      ]);

      await expect(
        client.search('test', [0.1, 0.2]) // Wrong dimensions
      ).rejects.toThrow('same dimensions');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty upsert array', async () => {
      const client = RuVectorClient.getInstance();
      await client.connect();
      await client.createCollection('test', 2);

      await expect(
        client.upsert('test', [])
      ).resolves.not.toThrow();
    });

    it('should handle empty get array', async () => {
      const client = RuVectorClient.getInstance();
      await client.connect();
      await client.createCollection('test', 2);

      const results = await client.get('test', []);
      expect(results).toEqual([]);
    });

    it('should handle zero vector', async () => {
      const client = RuVectorClient.getInstance();
      await client.connect();
      await client.createCollection('test', 3);

      await client.upsert('test', [
        { id: 'zero', vector: [0, 0, 0], metadata: {} },
      ]);

      const results = await client.get('test', ['zero']);
      expect(results[0].vector).toEqual([0, 0, 0]);
    });

    it('should handle negative vector values', async () => {
      const client = RuVectorClient.getInstance();
      await client.connect();
      await client.createCollection('test', 3);

      await client.upsert('test', [
        { id: 'negative', vector: [-0.5, -0.3, -0.1], metadata: {} },
      ]);

      const results = await client.get('test', ['negative']);
      expect(results[0].vector).toEqual([-0.5, -0.3, -0.1]);
    });

    it('should handle large vectors', async () => {
      const client = RuVectorClient.getInstance();
      await client.connect();
      const dims = 1536; // Claude embedding size
      await client.createCollection('test', dims);

      const largeVector = Array(dims).fill(0).map(() => Math.random());
      await client.upsert('test', [
        { id: 'large', vector: largeVector, metadata: {} },
      ]);

      const results = await client.get('test', ['large']);
      expect(results[0].vector).toHaveLength(dims);
    });
  });
});
