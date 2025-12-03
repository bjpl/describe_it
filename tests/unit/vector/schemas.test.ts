/**
 * Unit tests for vector module Zod schemas
 * Tests schema validation, defaults, and error handling
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// ============================================================================
// SCHEMA DEFINITIONS (mirroring docs/architecture/ruvector-config-schema.ts)
// ============================================================================

const embeddingOptionsSchema = z.object({
  model: z.enum(['claude-3-5-sonnet-20241022', 'text-embedding-ada-002']).optional(),
  dimensions: z.number().int().min(128).max(4096).optional(),
  batchSize: z.number().int().min(1).max(100).optional(),
  temperature: z.number().min(0).max(1).optional(),
});

const embeddingResultSchema = z.object({
  vector: z.array(z.number()),
  model: z.string(),
  dimensions: z.number().int().positive(),
  tokenCount: z.number().int().nonnegative().optional(),
  cached: z.boolean(),
  timestamp: z.date().optional(),
});

const vectorFilterOperator = z.enum(['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'contains']);

const vectorFilterSchema = z.object({
  field: z.string().min(1),
  operator: vectorFilterOperator,
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.any())]),
});

const vectorSearchOptionsSchema = z.object({
  limit: z.number().int().min(1).max(100).default(10),
  threshold: z.number().min(0).max(1).optional(),
  includeMetadata: z.boolean().default(true),
  includeVectors: z.boolean().default(false),
  filters: z.array(vectorFilterSchema).optional(),
});

const nodeType = z.enum(['vocabulary', 'concept', 'grammar', 'phrase', 'user', 'lesson']);

const graphNodeSchema = z.object({
  id: z.string().min(1),
  type: nodeType,
  properties: z.record(z.unknown()),
  embedding: z.array(z.number()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  metadata: z.record(z.unknown()).optional(),
});

const edgeType = z.enum(['synonym', 'antonym', 'related', 'compound', 'derived', 'translation', 'prerequisite', 'similar']);

const graphEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  type: edgeType,
  weight: z.number().min(0).max(1),
  properties: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.date().optional(),
});

const ruVectorConfigSchema = z.object({
  enabled: z.boolean().default(false),
  apiKey: z.string().optional(),
  endpoint: z.string().url().optional(),
  collections: z.object({
    vocabulary: z.string().default('vocabulary_vectors'),
    images: z.string().default('image_vectors'),
    descriptions: z.string().default('description_vectors'),
    learningPatterns: z.string().default('learning_pattern_vectors'),
  }).default({}),
  embedding: z.object({
    model: z.string().default('claude-3-5-sonnet-20241022'),
    dimensions: z.number().int().min(128).max(4096).default(1536),
    batchSize: z.number().int().min(1).max(100).default(10),
  }).default({}),
  search: z.object({
    defaultLimit: z.number().int().min(1).max(100).default(10),
    minThreshold: z.number().min(0).max(1).default(0.7),
    maxResults: z.number().int().min(1).max(1000).default(100),
  }).default({}),
  cache: z.object({
    enabled: z.boolean().default(true),
    ttlSeconds: z.number().int().min(60).default(3600),
    maxSize: z.number().int().min(100).default(1000),
    similarityThreshold: z.number().min(0).max(1).default(0.85),
  }).default({}),
  gnn: z.object({
    enabled: z.boolean().default(false),
    modelPath: z.string().optional(),
    trainingInterval: z.number().int().min(3600).default(86400),
    hiddenDimensions: z.number().int().min(8).max(512).default(128),
  }).default({}),
});

// ============================================================================
// TESTS
// ============================================================================

describe('Vector Schemas', () => {
  describe('embeddingOptionsSchema', () => {
    it('should accept valid options', () => {
      const result = embeddingOptionsSchema.parse({
        model: 'claude-3-5-sonnet-20241022',
        dimensions: 1536,
        batchSize: 10,
      });

      expect(result.model).toBe('claude-3-5-sonnet-20241022');
      expect(result.dimensions).toBe(1536);
      expect(result.batchSize).toBe(10);
    });

    it('should accept empty options', () => {
      const result = embeddingOptionsSchema.parse({});
      expect(result).toEqual({});
    });

    it('should accept partial options', () => {
      const result = embeddingOptionsSchema.parse({ dimensions: 768 });
      expect(result.dimensions).toBe(768);
      expect(result.model).toBeUndefined();
    });

    it('should reject invalid model', () => {
      expect(() =>
        embeddingOptionsSchema.parse({ model: 'invalid-model' })
      ).toThrow();
    });

    it('should reject invalid dimensions', () => {
      expect(() =>
        embeddingOptionsSchema.parse({ dimensions: 999 })
      ).toThrow(/greater than or equal to 128/);

      expect(() =>
        embeddingOptionsSchema.parse({ dimensions: 50000 })
      ).toThrow(/less than or equal to 4096/);
    });

    it('should reject batch size out of range', () => {
      expect(() =>
        embeddingOptionsSchema.parse({ batchSize: 0 })
      ).toThrow(/greater than or equal to 1/);

      expect(() =>
        embeddingOptionsSchema.parse({ batchSize: 101 })
      ).toThrow(/less than or equal to 100/);
    });

    it('should reject non-integer dimensions', () => {
      expect(() =>
        embeddingOptionsSchema.parse({ dimensions: 1536.5 })
      ).toThrow(/integer/);
    });

    it('should accept temperature in valid range', () => {
      const result = embeddingOptionsSchema.parse({ temperature: 0.5 });
      expect(result.temperature).toBe(0.5);
    });

    it('should reject temperature out of range', () => {
      expect(() =>
        embeddingOptionsSchema.parse({ temperature: -0.1 })
      ).toThrow();

      expect(() =>
        embeddingOptionsSchema.parse({ temperature: 1.1 })
      ).toThrow();
    });
  });

  describe('embeddingResultSchema', () => {
    it('should accept valid result', () => {
      const result = embeddingResultSchema.parse({
        vector: [0.1, 0.2, 0.3],
        model: 'claude-3-5-sonnet-20241022',
        dimensions: 3,
        tokenCount: 10,
        cached: false,
      });

      expect(result.vector).toHaveLength(3);
      expect(result.cached).toBe(false);
      expect(result.tokenCount).toBe(10);
    });

    it('should accept result without optional fields', () => {
      const result = embeddingResultSchema.parse({
        vector: [0.1, 0.2],
        model: 'test-model',
        dimensions: 2,
        cached: true,
      });

      expect(result.tokenCount).toBeUndefined();
      expect(result.timestamp).toBeUndefined();
    });

    it('should reject missing required fields', () => {
      expect(() =>
        embeddingResultSchema.parse({ vector: [0.1] })
      ).toThrow();

      expect(() =>
        embeddingResultSchema.parse({
          vector: [0.1],
          model: 'test',
        })
      ).toThrow();
    });

    it('should reject negative dimensions', () => {
      expect(() =>
        embeddingResultSchema.parse({
          vector: [0.1],
          model: 'test',
          dimensions: -1,
          cached: false,
        })
      ).toThrow(/positive/);
    });

    it('should reject negative token count', () => {
      expect(() =>
        embeddingResultSchema.parse({
          vector: [0.1],
          model: 'test',
          dimensions: 1,
          tokenCount: -5,
          cached: false,
        })
      ).toThrow();
    });

    it('should accept timestamp as Date', () => {
      const now = new Date();
      const result = embeddingResultSchema.parse({
        vector: [0.1],
        model: 'test',
        dimensions: 1,
        cached: false,
        timestamp: now,
      });

      expect(result.timestamp).toEqual(now);
    });

    it('should handle large vectors', () => {
      const largeVector = Array(1536).fill(0).map(() => Math.random());
      const result = embeddingResultSchema.parse({
        vector: largeVector,
        model: 'test',
        dimensions: 1536,
        cached: false,
      });

      expect(result.vector).toHaveLength(1536);
    });
  });

  describe('vectorFilterSchema', () => {
    it('should accept all operators', () => {
      const operators = ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'contains'] as const;

      operators.forEach(op => {
        const result = vectorFilterSchema.parse({
          field: 'testField',
          operator: op,
          value: op === 'in' ? ['a', 'b'] : 'value',
        });
        expect(result.operator).toBe(op);
      });
    });

    it('should reject invalid operator', () => {
      expect(() =>
        vectorFilterSchema.parse({
          field: 'test',
          operator: 'invalid',
          value: 'test',
        })
      ).toThrow();
    });

    it('should accept different value types', () => {
      const stringFilter = vectorFilterSchema.parse({
        field: 'name',
        operator: 'eq',
        value: 'test',
      });
      expect(stringFilter.value).toBe('test');

      const numberFilter = vectorFilterSchema.parse({
        field: 'count',
        operator: 'gt',
        value: 42,
      });
      expect(numberFilter.value).toBe(42);

      const boolFilter = vectorFilterSchema.parse({
        field: 'active',
        operator: 'eq',
        value: true,
      });
      expect(boolFilter.value).toBe(true);

      const arrayFilter = vectorFilterSchema.parse({
        field: 'tags',
        operator: 'in',
        value: ['tag1', 'tag2'],
      });
      expect(arrayFilter.value).toHaveLength(2);
    });

    it('should reject empty field name', () => {
      expect(() =>
        vectorFilterSchema.parse({
          field: '',
          operator: 'eq',
          value: 'test',
        })
      ).toThrow();
    });
  });

  describe('vectorSearchOptionsSchema', () => {
    it('should apply defaults', () => {
      const result = vectorSearchOptionsSchema.parse({});

      expect(result.limit).toBe(10);
      expect(result.includeMetadata).toBe(true);
      expect(result.includeVectors).toBe(false);
    });

    it('should accept valid filters', () => {
      const result = vectorSearchOptionsSchema.parse({
        limit: 20,
        threshold: 0.8,
        filters: [
          { field: 'category', operator: 'eq', value: 'vocabulary' },
          { field: 'difficulty', operator: 'in', value: ['easy', 'medium'] },
        ],
      });

      expect(result.filters).toHaveLength(2);
      expect(result.threshold).toBe(0.8);
    });

    it('should reject limit out of range', () => {
      expect(() =>
        vectorSearchOptionsSchema.parse({ limit: 0 })
      ).toThrow(/greater than or equal to 1/);

      expect(() =>
        vectorSearchOptionsSchema.parse({ limit: 101 })
      ).toThrow(/less than or equal to 100/);
    });

    it('should reject invalid threshold', () => {
      expect(() =>
        vectorSearchOptionsSchema.parse({ threshold: -0.1 })
      ).toThrow();

      expect(() =>
        vectorSearchOptionsSchema.parse({ threshold: 1.1 })
      ).toThrow();
    });

    it('should accept threshold at boundaries', () => {
      const min = vectorSearchOptionsSchema.parse({ threshold: 0 });
      expect(min.threshold).toBe(0);

      const max = vectorSearchOptionsSchema.parse({ threshold: 1 });
      expect(max.threshold).toBe(1);
    });

    it('should override defaults', () => {
      const result = vectorSearchOptionsSchema.parse({
        limit: 50,
        includeMetadata: false,
        includeVectors: true,
      });

      expect(result.limit).toBe(50);
      expect(result.includeMetadata).toBe(false);
      expect(result.includeVectors).toBe(true);
    });
  });

  describe('graphNodeSchema', () => {
    it('should accept valid node', () => {
      const now = new Date();
      const result = graphNodeSchema.parse({
        id: 'node-1',
        type: 'vocabulary',
        properties: { word: 'hello', language: 'en' },
        createdAt: now,
        updatedAt: now,
      });

      expect(result.type).toBe('vocabulary');
      expect(result.properties.word).toBe('hello');
    });

    it('should accept optional embedding', () => {
      const now = new Date();
      const result = graphNodeSchema.parse({
        id: 'node-1',
        type: 'phrase',
        properties: {},
        embedding: [0.1, 0.2, 0.3],
        createdAt: now,
        updatedAt: now,
      });

      expect(result.embedding).toEqual([0.1, 0.2, 0.3]);
    });

    it('should accept all valid node types', () => {
      const types = ['vocabulary', 'concept', 'grammar', 'phrase', 'user', 'lesson'] as const;
      const now = new Date();

      types.forEach(type => {
        const result = graphNodeSchema.parse({
          id: `node-${type}`,
          type,
          properties: {},
          createdAt: now,
          updatedAt: now,
        });
        expect(result.type).toBe(type);
      });
    });

    it('should reject invalid node type', () => {
      const now = new Date();
      expect(() =>
        graphNodeSchema.parse({
          id: 'node-1',
          type: 'invalid',
          properties: {},
          createdAt: now,
          updatedAt: now,
        })
      ).toThrow();
    });

    it('should reject empty id', () => {
      const now = new Date();
      expect(() =>
        graphNodeSchema.parse({
          id: '',
          type: 'vocabulary',
          properties: {},
          createdAt: now,
          updatedAt: now,
        })
      ).toThrow();
    });

    it('should accept metadata', () => {
      const now = new Date();
      const result = graphNodeSchema.parse({
        id: 'node-1',
        type: 'vocabulary',
        properties: { word: 'test' },
        metadata: { source: 'import', version: 1 },
        createdAt: now,
        updatedAt: now,
      });

      expect(result.metadata?.source).toBe('import');
    });
  });

  describe('graphEdgeSchema', () => {
    it('should accept valid edge', () => {
      const result = graphEdgeSchema.parse({
        id: 'edge-1',
        source: 'node-1',
        target: 'node-2',
        type: 'synonym',
        weight: 0.9,
      });

      expect(result.type).toBe('synonym');
      expect(result.weight).toBe(0.9);
    });

    it('should accept all valid edge types', () => {
      const types = ['synonym', 'antonym', 'related', 'compound', 'derived', 'translation', 'prerequisite', 'similar'] as const;

      types.forEach(type => {
        const result = graphEdgeSchema.parse({
          id: `edge-${type}`,
          source: 'node-1',
          target: 'node-2',
          type,
          weight: 0.5,
        });
        expect(result.type).toBe(type);
      });
    });

    it('should accept edge with metadata', () => {
      const result = graphEdgeSchema.parse({
        id: 'edge-1',
        source: 'node-1',
        target: 'node-2',
        type: 'translation',
        weight: 1.0,
        metadata: { language: 'es', confidence: 0.95 },
      });

      expect(result.metadata?.language).toBe('es');
    });

    it('should reject weight out of range', () => {
      expect(() =>
        graphEdgeSchema.parse({
          id: 'edge-1',
          source: 'node-1',
          target: 'node-2',
          type: 'related',
          weight: -0.1,
        })
      ).toThrow();

      expect(() =>
        graphEdgeSchema.parse({
          id: 'edge-1',
          source: 'node-1',
          target: 'node-2',
          type: 'related',
          weight: 1.5,
        })
      ).toThrow();
    });

    it('should accept weight at boundaries', () => {
      const min = graphEdgeSchema.parse({
        id: 'edge-1',
        source: 'node-1',
        target: 'node-2',
        type: 'related',
        weight: 0,
      });
      expect(min.weight).toBe(0);

      const max = graphEdgeSchema.parse({
        id: 'edge-1',
        source: 'node-1',
        target: 'node-2',
        type: 'related',
        weight: 1,
      });
      expect(max.weight).toBe(1);
    });

    it('should accept properties and metadata', () => {
      const result = graphEdgeSchema.parse({
        id: 'edge-1',
        source: 'node-1',
        target: 'node-2',
        type: 'related',
        weight: 0.8,
        properties: { strength: 'high', bidirectional: true },
        metadata: { created_by: 'system', version: 1 },
      });

      expect(result.properties?.strength).toBe('high');
      expect(result.metadata?.created_by).toBe('system');
    });

    it('should accept createdAt timestamp', () => {
      const now = new Date();
      const result = graphEdgeSchema.parse({
        id: 'edge-1',
        source: 'node-1',
        target: 'node-2',
        type: 'related',
        weight: 0.8,
        createdAt: now,
      });

      expect(result.createdAt).toEqual(now);
    });
  });

  describe('ruVectorConfigSchema', () => {
    it('should apply all defaults', () => {
      const result = ruVectorConfigSchema.parse({});

      expect(result.enabled).toBe(false);
      expect(result.embedding.dimensions).toBe(1536);
      expect(result.search.defaultLimit).toBe(10);
      expect(result.cache.enabled).toBe(true);
      expect(result.gnn.enabled).toBe(false);
    });

    it('should accept full configuration', () => {
      const result = ruVectorConfigSchema.parse({
        enabled: true,
        apiKey: 'test-key',
        endpoint: 'http://localhost:6333',
        collections: {
          vocabulary: 'vocab_v1',
          images: 'images_v1',
          descriptions: 'desc_v1',
          learningPatterns: 'learning_v1',
        },
        embedding: {
          model: 'text-embedding-ada-002',
          dimensions: 768,
          batchSize: 50,
        },
        search: {
          defaultLimit: 25,
          minThreshold: 0.8,
          maxResults: 500,
        },
        cache: {
          enabled: true,
          ttlSeconds: 7200,
          maxSize: 5000,
          similarityThreshold: 0.9,
        },
        gnn: {
          enabled: true,
          modelPath: '/models/gnn.bin',
          trainingInterval: 43200,
          hiddenDimensions: 256,
        },
      });

      expect(result.enabled).toBe(true);
      expect(result.embedding.model).toBe('text-embedding-ada-002');
      expect(result.gnn.enabled).toBe(true);
    });

    it('should reject invalid endpoint URL', () => {
      expect(() =>
        ruVectorConfigSchema.parse({
          endpoint: 'not-a-url',
        })
      ).toThrow();
    });

    it('should accept partial nested configuration', () => {
      const result = ruVectorConfigSchema.parse({
        embedding: { dimensions: 768 },
        search: { defaultLimit: 20 },
      });

      expect(result.embedding.dimensions).toBe(768);
      expect(result.embedding.model).toBe('claude-3-5-sonnet-20241022'); // default
      expect(result.search.defaultLimit).toBe(20);
      expect(result.search.minThreshold).toBe(0.7); // default
    });

    it('should validate nested constraints', () => {
      expect(() =>
        ruVectorConfigSchema.parse({
          cache: { ttlSeconds: 30 }, // Below minimum of 60
        })
      ).toThrow();

      expect(() =>
        ruVectorConfigSchema.parse({
          gnn: { hiddenDimensions: 4 }, // Below minimum of 8
        })
      ).toThrow();
    });
  });

  describe('Schema Edge Cases', () => {
    it('should handle empty arrays in filters', () => {
      const result = vectorSearchOptionsSchema.parse({
        filters: [],
      });

      expect(result.filters).toEqual([]);
    });

    it('should handle nested objects in properties', () => {
      const now = new Date();
      const result = graphNodeSchema.parse({
        id: 'complex-node',
        type: 'vocabulary',
        properties: {
          word: 'test',
          metadata: {
            nested: {
              deep: {
                value: 42,
              },
            },
          },
        },
        createdAt: now,
        updatedAt: now,
      });

      expect((result.properties.metadata as any).nested.deep.value).toBe(42);
    });

    it('should reject non-Date objects for timestamps', () => {
      expect(() =>
        graphNodeSchema.parse({
          id: 'node-1',
          type: 'vocabulary',
          properties: {},
          createdAt: '2025-01-01', // String instead of Date
          updatedAt: new Date(),
        })
      ).toThrow();
    });

    it('should preserve exact floating point values', () => {
      const vector = [0.123456789, -0.987654321, 0.5];
      const result = embeddingResultSchema.parse({
        vector,
        model: 'test',
        dimensions: 3,
        cached: false,
      });

      expect(result.vector[0]).toBe(0.123456789);
      expect(result.vector[1]).toBe(-0.987654321);
    });
  });
});
