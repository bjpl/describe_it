/**
 * EmbeddingService Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EmbeddingService } from '../services/embedding';

// Mock the Anthropic client
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'mock response' }],
      }),
    },
  })),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('EmbeddingService', () => {
  let service: EmbeddingService;

  beforeEach(() => {
    EmbeddingService.resetInstance();
    service = EmbeddingService.getInstance();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = EmbeddingService.getInstance();
      const instance2 = EmbeddingService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should create new instance after reset', () => {
      const instance1 = EmbeddingService.getInstance();
      EmbeddingService.resetInstance();
      const instance2 = EmbeddingService.getInstance();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('generateEmbedding', () => {
    it('should generate embedding for text', async () => {
      const result = await service.generateEmbedding('test text');

      expect(result).toBeDefined();
      expect(result.vector).toBeDefined();
      expect(Array.isArray(result.vector)).toBe(true);
      expect(result.dimensions).toBeGreaterThan(0);
      expect(typeof result.tokenCount).toBe('number');
    });

    it('should use fallback embedding when API unavailable', async () => {
      const result = await service.generateEmbedding('hello world');

      // Fallback should still produce valid vectors
      expect(result.vector.length).toBe(result.dimensions);
      expect(result.model).toContain('fallback');
    });

    it('should cache embeddings for same text', async () => {
      const result1 = await service.generateEmbedding('cached text');
      const result2 = await service.generateEmbedding('cached text');

      expect(result2.cached).toBe(true);
      expect(result1.vector).toEqual(result2.vector);
    });

    it('should respect dimension options', async () => {
      const result = await service.generateEmbedding('test', { dimensions: 384 });

      expect(result.dimensions).toBe(384);
      expect(result.vector.length).toBe(384);
    });
  });

  describe('batchEmbeddings', () => {
    it('should generate embeddings for multiple texts', async () => {
      const texts = ['text one', 'text two', 'text three'];
      const results = await service.batchEmbeddings(texts);

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.vector).toBeDefined();
        expect(result.dimensions).toBeGreaterThan(0);
      });
    });

    it('should handle empty array', async () => {
      const results = await service.batchEmbeddings([]);
      expect(results).toHaveLength(0);
    });
  });

  describe('getSimilarity', () => {
    it('should return 1 for identical vectors', () => {
      const vector = [1, 0, 0, 0];
      const similarity = service.getSimilarity(vector, vector);
      expect(similarity).toBeCloseTo(1, 5);
    });

    it('should return 0 for orthogonal vectors', () => {
      const vectorA = [1, 0, 0, 0];
      const vectorB = [0, 1, 0, 0];
      const similarity = service.getSimilarity(vectorA, vectorB);
      expect(similarity).toBeCloseTo(0, 5);
    });

    it('should return value between 0 and 1 for typical vectors', () => {
      const vectorA = [0.5, 0.5, 0.5, 0.5];
      const vectorB = [0.6, 0.4, 0.5, 0.5];
      const similarity = service.getSimilarity(vectorA, vectorB);
      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThanOrEqual(1);
    });

    it('should handle zero vectors gracefully', () => {
      const vectorA = [0, 0, 0, 0];
      const vectorB = [1, 1, 1, 1];
      const similarity = service.getSimilarity(vectorA, vectorB);
      expect(similarity).toBe(0);
    });
  });
});
