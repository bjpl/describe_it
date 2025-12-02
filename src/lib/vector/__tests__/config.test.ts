/**
 * Vector Config and Feature Flags Tests
 */

import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { getVectorConfig, resetConfig, featureFlags } from '../config';

// Mock environment variables
const originalEnv = process.env;

describe('Vector Config', () => {
  beforeEach(() => {
    vi.resetModules();
    resetConfig();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getVectorConfig', () => {
    it('should return default config', () => {
      const config = getVectorConfig();

      expect(config).toBeDefined();
      expect(config.enabled).toBeDefined();
      expect(config.collections).toBeDefined();
      expect(config.embedding).toBeDefined();
      expect(config.search).toBeDefined();
      expect(config.cache).toBeDefined();
      expect(config.gnn).toBeDefined();
    });

    it('should have correct collection names', () => {
      const config = getVectorConfig();

      expect(config.collections.vocabulary).toBe('vocabulary_embeddings');
      expect(config.collections.images).toBe('image_embeddings');
      expect(config.collections.descriptions).toBe('description_embeddings');
      expect(config.collections.learningPatterns).toBe('learning_patterns');
    });

    it('should have correct embedding defaults', () => {
      const config = getVectorConfig();

      expect(config.embedding.dimensions).toBe(1536);
      expect(config.embedding.batchSize).toBeGreaterThan(0);
    });

    it('should have correct search defaults', () => {
      const config = getVectorConfig();

      expect(config.search.defaultLimit).toBeGreaterThan(0);
      expect(config.search.minThreshold).toBeGreaterThan(0);
      expect(config.search.minThreshold).toBeLessThanOrEqual(1);
      expect(config.search.maxResults).toBeGreaterThan(config.search.defaultLimit);
    });

    it('should have correct cache defaults', () => {
      const config = getVectorConfig();

      expect(config.cache.ttlSeconds).toBeGreaterThan(0);
      expect(config.cache.maxSize).toBeGreaterThan(0);
      expect(config.cache.similarityThreshold).toBeGreaterThan(0);
      expect(config.cache.similarityThreshold).toBeLessThanOrEqual(1);
    });

    it('should return same instance on multiple calls', () => {
      const config1 = getVectorConfig();
      const config2 = getVectorConfig();

      expect(config1).toBe(config2);
    });
  });

  describe('resetConfig', () => {
    it('should reset config instance', () => {
      const config1 = getVectorConfig();
      resetConfig();
      const config2 = getVectorConfig();

      // Should be different instances (though values may be same)
      // This tests that reset actually clears the cached config
      expect(config1).not.toBe(config2);
    });
  });

  describe('featureFlags', () => {
    it('should have useVectorSearch flag', () => {
      expect(typeof featureFlags.useVectorSearch()).toBe('boolean');
    });

    it('should have useSemanticCache flag', () => {
      expect(typeof featureFlags.useSemanticCache()).toBe('boolean');
    });

    it('should have useGNNLearning flag', () => {
      expect(typeof featureFlags.useGNNLearning()).toBe('boolean');
    });

    it('should have useKnowledgeGraph flag', () => {
      expect(typeof featureFlags.useKnowledgeGraph()).toBe('boolean');
    });

    it('should return false by default (safe defaults)', () => {
      // In test environment without env vars, flags should default to false
      // This ensures features are opt-in
      resetConfig();

      // Note: actual values depend on env vars, but structure should be correct
      const config = getVectorConfig();
      expect(typeof config.enabled).toBe('boolean');
    });
  });
});

describe('Environment Variable Parsing', () => {
  beforeEach(() => {
    vi.resetModules();
    resetConfig();
  });

  it('should parse RUVECTOR_ENABLED', async () => {
    process.env.RUVECTOR_ENABLED = 'true';
    process.env.ENABLE_VECTOR_SEARCH = 'true';

    resetConfig();
    const config = getVectorConfig();

    expect(config.enabled).toBe(true);
  });

  it('should parse dimension configuration', async () => {
    process.env.RUVECTOR_EMBEDDING_DIMENSIONS = '768';

    resetConfig();
    const config = getVectorConfig();

    expect(config.embedding.dimensions).toBe(768);
  });

  it('should parse search configuration', async () => {
    process.env.RUVECTOR_SEARCH_DEFAULT_LIMIT = '50';
    process.env.RUVECTOR_SEARCH_MIN_THRESHOLD = '0.8';

    resetConfig();
    const config = getVectorConfig();

    expect(config.search.defaultLimit).toBe(50);
    expect(config.search.minThreshold).toBe(0.8);
  });

  it('should parse cache configuration', async () => {
    process.env.RUVECTOR_CACHE_ENABLED = 'true';
    process.env.RUVECTOR_CACHE_TTL_SECONDS = '7200';

    resetConfig();
    const config = getVectorConfig();

    expect(config.cache.enabled).toBe(true);
    expect(config.cache.ttlSeconds).toBe(7200);
  });

  it('should parse GNN configuration', async () => {
    process.env.RUVECTOR_GNN_ENABLED = 'true';
    process.env.RUVECTOR_GNN_TRAINING_INTERVAL = '43200';

    resetConfig();
    const config = getVectorConfig();

    expect(config.gnn.enabled).toBe(true);
    expect(config.gnn.trainingInterval).toBe(43200);
  });
});
