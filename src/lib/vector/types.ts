/**
 * RuVector Integration Types
 * Phase 1.1: Foundation types for vector search and embeddings
 */

// Embedding types
export interface EmbeddingOptions {
  model?: 'claude-3-5-sonnet-20241022' | 'text-embedding-ada-002';
  dimensions?: 1536 | 768 | 384;
  batchSize?: number;
}

export interface EmbeddingResult {
  vector: number[];
  model: string;
  dimensions: number;
  tokenCount: number;
  cached: boolean;
}

// Vector search types
export interface VectorSearchOptions {
  limit?: number;
  threshold?: number;
  filters?: VectorFilter[];
  includeMetadata?: boolean;
  includeVectors?: boolean;
}

export interface VectorFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains';
  value: string | number | boolean | string[];
}

export interface VectorSearchResult<T = Record<string, unknown>> {
  id: string;
  score: number;
  metadata: T;
  vector?: number[];
}

// Knowledge graph types
export interface GraphNode {
  id: string;
  type: 'vocabulary' | 'phrase' | 'image' | 'description' | 'user';
  properties: Record<string, unknown>;
  embedding?: number[];
  createdAt: Date;
  updatedAt: Date;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'synonym' | 'translation' | 'related' | 'learned' | 'confused_with';
  weight: number;
  metadata?: Record<string, unknown>;
}

export interface GraphQueryResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  paths?: GraphPath[];
}

export interface GraphPath {
  nodes: string[];
  edges: string[];
  totalWeight: number;
}

// GNN Learning types
export interface LearningPattern {
  userId: string;
  vocabularyId: string;
  successRate: number;
  averageResponseTime: number;
  confusionPairs: string[];
  optimalInterval: number;
  lastUpdated: Date;
}

export interface GNNPrediction {
  nextReviewDate: Date;
  predictedSuccessRate: number;
  confidence: number;
  recommendedDifficulty: 'easy' | 'medium' | 'hard';
  suggestedRelatedWords: string[];
}

// Cache types
export interface SemanticCacheEntry<T = unknown> {
  key: string;
  embedding: number[];
  value: T;
  similarity: number;
  createdAt: Date;
  expiresAt: Date;
  hitCount: number;
}

export interface CacheMetrics {
  size: number;
  hitRate: number;
  missRate: number;
  avgLatency: number;
  evictionCount: number;
}

// Configuration types
export interface RuVectorConfig {
  enabled: boolean;
  apiKey?: string;
  endpoint?: string;
  collections: {
    vocabulary: string;
    images: string;
    descriptions: string;
    learningPatterns: string;
  };
  embedding: {
    model: string;
    dimensions: number;
    batchSize: number;
  };
  search: {
    defaultLimit: number;
    minThreshold: number;
    maxResults: number;
  };
  cache: {
    enabled: boolean;
    ttlSeconds: number;
    maxSize: number;
    similarityThreshold: number;
  };
  gnn: {
    enabled: boolean;
    modelPath?: string;
    trainingInterval: number;
  };
}

// Service interfaces
export interface IEmbeddingService {
  generateEmbedding(text: string, options?: EmbeddingOptions): Promise<EmbeddingResult>;
  batchEmbeddings(texts: string[], options?: EmbeddingOptions): Promise<EmbeddingResult[]>;
  getSimilarity(vectorA: number[], vectorB: number[]): number;
}

export interface IVectorSearchService {
  search<T>(
    query: string,
    collection: string,
    options?: VectorSearchOptions
  ): Promise<VectorSearchResult<T>[]>;
  searchByVector<T>(
    vector: number[],
    collection: string,
    options?: VectorSearchOptions
  ): Promise<VectorSearchResult<T>[]>;
  upsert(
    id: string,
    vector: number[],
    metadata: Record<string, unknown>,
    collection: string
  ): Promise<void>;
  delete(id: string, collection: string): Promise<void>;
}

export interface IGraphService {
  addNode(node: Omit<GraphNode, 'createdAt' | 'updatedAt'>): Promise<GraphNode>;
  addEdge(edge: Omit<GraphEdge, 'id'>): Promise<GraphEdge>;
  getNode(id: string): Promise<GraphNode | null>;
  getNeighbors(nodeId: string, depth?: number, edgeTypes?: string[]): Promise<GraphQueryResult>;
  findPath(sourceId: string, targetId: string, maxDepth?: number): Promise<GraphPath | null>;
  query(cypher: string, params?: Record<string, unknown>): Promise<GraphQueryResult>;
}

export interface ILearningService {
  recordInteraction(
    userId: string,
    vocabularyId: string,
    success: boolean,
    responseTime: number
  ): Promise<void>;
  getPrediction(userId: string, vocabularyId: string): Promise<GNNPrediction>;
  getConfusionPairs(
    userId: string
  ): Promise<Array<{ word1: string; word2: string; confusionRate: number }>>;
  getOptimalReviewSchedule(
    userId: string,
    limit?: number
  ): Promise<Array<{ vocabularyId: string; scheduledDate: Date; priority: number }>>;
}

export interface ISemanticCacheService {
  get<T>(query: string): Promise<T | null>;
  set<T>(query: string, value: T, ttl?: number): Promise<void>;
  invalidate(pattern: string): Promise<number>;
  getMetrics(): CacheMetrics;
}

// Utility types
export type VectorDistance = 'cosine' | 'euclidean' | 'dot';
export type CollectionName = 'vocabulary' | 'images' | 'descriptions' | 'learning_patterns';

// Error types
export class VectorError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'VectorError';
  }
}

export class EmbeddingError extends VectorError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'EMBEDDING_ERROR', 500, details);
    this.name = 'EmbeddingError';
  }
}

export class SearchError extends VectorError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'SEARCH_ERROR', 500, details);
    this.name = 'SearchError';
  }
}

export class GraphError extends VectorError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'GRAPH_ERROR', 500, details);
    this.name = 'GraphError';
  }
}
