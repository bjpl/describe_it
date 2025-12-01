/**
 * Zod validation schemas for vector module
 */
import { z } from 'zod';

// Embedding schemas
export const embeddingOptionsSchema = z.object({
  model: z.enum(['claude-3-5-sonnet-20241022', 'text-embedding-ada-002']).optional(),
  dimensions: z.union([z.literal(1536), z.literal(768), z.literal(384)]).optional(),
  batchSize: z.number().int().min(1).max(100).optional(),
});

export const embeddingResultSchema = z.object({
  vector: z.array(z.number()),
  model: z.string(),
  dimensions: z.number().int().positive(),
  tokenCount: z.number().int().nonnegative(),
  cached: z.boolean(),
});

// Search schemas
export const vectorFilterSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'contains']),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
});

export const vectorSearchOptionsSchema = z.object({
  limit: z.number().int().min(1).max(100).default(10),
  threshold: z.number().min(0).max(1).optional(),
  filters: z.array(vectorFilterSchema).optional(),
  includeMetadata: z.boolean().default(true),
  includeVectors: z.boolean().default(false),
});

export const vectorSearchResultSchema = z.object({
  id: z.string(),
  score: z.number().min(0).max(1),
  metadata: z.record(z.unknown()),
  vector: z.array(z.number()).optional(),
});

// Graph schemas
export const graphNodeTypeSchema = z.enum(['vocabulary', 'phrase', 'image', 'description', 'user']);
export const graphEdgeTypeSchema = z.enum([
  'synonym',
  'translation',
  'related',
  'learned',
  'confused_with',
]);

export const graphNodeSchema = z.object({
  id: z.string(),
  type: graphNodeTypeSchema,
  properties: z.record(z.unknown()),
  embedding: z.array(z.number()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const graphEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  type: graphEdgeTypeSchema,
  weight: z.number().min(0).max(1),
  metadata: z.record(z.unknown()).optional(),
});

// GNN schemas
export const learningPatternSchema = z.object({
  userId: z.string(),
  vocabularyId: z.string(),
  successRate: z.number().min(0).max(1),
  averageResponseTime: z.number().nonnegative(),
  confusionPairs: z.array(z.string()),
  optimalInterval: z.number().int().positive(),
  lastUpdated: z.date(),
});

export const gnnPredictionSchema = z.object({
  nextReviewDate: z.date(),
  predictedSuccessRate: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  recommendedDifficulty: z.enum(['easy', 'medium', 'hard']),
  suggestedRelatedWords: z.array(z.string()),
});

// Configuration schema
export const ruVectorConfigSchema = z.object({
  enabled: z.boolean().default(false),
  apiKey: z.string().optional(),
  endpoint: z.string().url().optional(),
  collections: z
    .object({
      vocabulary: z.string().default('vocabulary_vectors'),
      images: z.string().default('image_vectors'),
      descriptions: z.string().default('description_vectors'),
      learningPatterns: z.string().default('learning_pattern_vectors'),
    })
    .default({}),
  embedding: z
    .object({
      model: z.string().default('claude-3-5-sonnet-20241022'),
      dimensions: z.number().int().positive().default(1536),
      batchSize: z.number().int().min(1).max(100).default(10),
    })
    .default({}),
  search: z
    .object({
      defaultLimit: z.number().int().min(1).max(100).default(10),
      minThreshold: z.number().min(0).max(1).default(0.7),
      maxResults: z.number().int().min(1).max(1000).default(100),
    })
    .default({}),
  cache: z
    .object({
      enabled: z.boolean().default(true),
      ttlSeconds: z.number().int().positive().default(3600),
      maxSize: z.number().int().positive().default(1000),
      similarityThreshold: z.number().min(0).max(1).default(0.85),
    })
    .default({}),
  gnn: z
    .object({
      enabled: z.boolean().default(false),
      modelPath: z.string().optional(),
      trainingInterval: z.number().int().positive().default(86400),
    })
    .default({}),
});

// Type exports from schemas
export type EmbeddingOptionsInput = z.input<typeof embeddingOptionsSchema>;
export type VectorSearchOptionsInput = z.input<typeof vectorSearchOptionsSchema>;
export type RuVectorConfigInput = z.input<typeof ruVectorConfigSchema>;
