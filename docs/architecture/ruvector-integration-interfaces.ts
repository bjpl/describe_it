/**
 * RuVector Integration - Service Interface Definitions
 *
 * These interfaces define the contract between describe_it's existing
 * architecture and the new RuVector-powered services.
 */

import type { z } from 'zod';

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

export interface RuVectorConfig {
  enabled: boolean;
  indexDimensions: number; // 1536 for Claude embeddings
  hnswM: number; // HNSW parameter M (connections per layer)
  hnswEfConstruction: number; // HNSW ef_construction parameter
  cacheTTL: number; // Embedding cache TTL (seconds)
  batchSize: number; // Batch size for bulk operations
  featureFlags: {
    semanticSearch: boolean;
    knowledgeGraph: boolean;
    gnnLearning: boolean;
    hybridRanking: boolean;
  };
}

// ============================================================================
// EMBEDDING SERVICE
// ============================================================================

export interface EmbeddingVector {
  id: string;
  text: string;
  vector: number[]; // 1536-dimensional for Claude
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface EmbeddingGenerationRequest {
  texts: string[];
  model?: 'claude-3-5-sonnet-20241022'; // Default embedding model
  batchSize?: number;
  cacheKey?: string;
}

export interface EmbeddingGenerationResponse {
  embeddings: EmbeddingVector[];
  cached: boolean;
  duration: number; // milliseconds
}

export interface IEmbeddingService {
  /**
   * Generate embeddings for text inputs using Claude API
   */
  generateEmbeddings(request: EmbeddingGenerationRequest): Promise<EmbeddingGenerationResponse>;

  /**
   * Get cached embedding by text hash
   */
  getCachedEmbedding(text: string): Promise<EmbeddingVector | null>;

  /**
   * Batch generate embeddings with cache checking
   */
  batchGenerate(texts: string[], options?: { maxConcurrency?: number }): Promise<EmbeddingVector[]>;
}

// ============================================================================
// VECTOR SEARCH SERVICE
// ============================================================================

export interface VocabularySearchQuery {
  query: string; // User's search input
  targetLanguage: string; // 'es', 'fr', 'de', etc.
  nativeLanguage: string; // User's native language
  limit?: number; // Max results (default: 20)
  threshold?: number; // Similarity threshold (0-1)
  filters?: {
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    tags?: string[];
    excludeKnown?: boolean; // Exclude user's known words
  };
}

export interface VocabularySearchResult {
  id: string;
  word: string;
  translation: string;
  definition: string;
  exampleSentence?: string;
  similarityScore: number; // 0-1 cosine similarity
  rank: number; // Position in results
  metadata: {
    difficulty: string;
    tags: string[];
    frequency?: number; // Word frequency rank
  };
}

export interface HybridSearchResult {
  vectorResults: VocabularySearchResult[];
  sqlResults: VocabularySearchResult[];
  hybridResults: VocabularySearchResult[]; // Merged and re-ranked
  strategy: 'vector-only' | 'sql-only' | 'hybrid';
  metrics: {
    vectorSearchTime: number;
    sqlSearchTime: number;
    rerankTime: number;
    totalTime: number;
  };
}

export interface ISearchService {
  /**
   * Semantic search using vector embeddings
   */
  semanticSearch(query: VocabularySearchQuery): Promise<VocabularySearchResult[]>;

  /**
   * Hybrid search combining vector and SQL
   */
  hybridSearch(query: VocabularySearchQuery): Promise<HybridSearchResult>;

  /**
   * Find similar vocabulary items by vector similarity
   */
  findSimilar(vocabularyId: string, limit?: number): Promise<VocabularySearchResult[]>;

  /**
   * Index new vocabulary item for vector search
   */
  indexVocabulary(vocabulary: VocabularyIndexItem): Promise<void>;

  /**
   * Batch index multiple vocabulary items
   */
  batchIndex(vocabularies: VocabularyIndexItem[]): Promise<BatchIndexResult>;
}

export interface VocabularyIndexItem {
  id: string;
  word: string;
  translation: string;
  definition: string;
  language: string;
  difficulty: string;
  tags: string[];
  metadata?: Record<string, unknown>;
}

export interface BatchIndexResult {
  indexed: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
  duration: number;
}

// ============================================================================
// KNOWLEDGE GRAPH SERVICE
// ============================================================================

export interface GraphNode {
  id: string;
  type: 'vocabulary' | 'concept' | 'grammar' | 'phrase';
  properties: {
    word?: string;
    language?: string;
    difficulty?: string;
    [key: string]: unknown;
  };
  embedding?: number[]; // Optional vector embedding
}

export interface GraphEdge {
  id: string;
  source: string; // Node ID
  target: string; // Node ID
  type: 'synonym' | 'antonym' | 'related' | 'compound' | 'derived' | 'translation';
  weight: number; // Relationship strength (0-1)
  properties?: Record<string, unknown>;
}

export interface GraphQuery {
  cypher: string; // Cypher query language
  parameters?: Record<string, unknown>;
}

export interface GraphQueryResult<T = unknown> {
  data: T[];
  metadata: {
    executionTime: number;
    nodesTraversed: number;
    edgesTraversed: number;
  };
}

export interface IGraphService {
  /**
   * Add node to knowledge graph
   */
  addNode(node: GraphNode): Promise<void>;

  /**
   * Create edge between nodes
   */
  addEdge(edge: GraphEdge): Promise<void>;

  /**
   * Execute Cypher query
   */
  query<T = unknown>(query: GraphQuery): Promise<GraphQueryResult<T>>;

  /**
   * Find related vocabulary through graph traversal
   */
  findRelated(vocabularyId: string, depth?: number): Promise<VocabularySearchResult[]>;

  /**
   * Get learning path between two vocabulary items
   */
  getLearningPath(fromId: string, toId: string): Promise<LearningPath>;

  /**
   * Build subgraph for user's learning context
   */
  buildUserContext(userId: string, targetLanguage: string): Promise<UserContextGraph>;
}

export interface LearningPath {
  nodes: GraphNode[];
  edges: GraphEdge[];
  difficulty: number; // Cumulative difficulty (0-1)
  estimatedTime: number; // Minutes
}

export interface UserContextGraph {
  knownWords: GraphNode[];
  learningWords: GraphNode[];
  recommendedNext: GraphNode[];
  connections: GraphEdge[];
}

// ============================================================================
// LEARNING OPTIMIZATION SERVICE (GNN)
// ============================================================================

export interface LearningState {
  userId: string;
  vocabularyId: string;
  easeFactor: number; // SM-2 ease factor
  interval: number; // Days until next review
  repetitions: number;
  lastReview: Date;
  correctStreak: number;
  accuracy: number; // Historical accuracy (0-1)
}

export interface GNNOptimizationRequest {
  userId: string;
  currentState: LearningState[];
  recentPerformance: ReviewPerformance[];
  targetDifficulty?: number; // Desired challenge level (0-1)
}

export interface ReviewPerformance {
  vocabularyId: string;
  timestamp: Date;
  correct: boolean;
  responseTime: number; // Milliseconds
  confidence: number; // User self-rating (1-5)
}

export interface GNNOptimizationResponse {
  recommendedReviews: OptimizedReview[];
  difficultyAdjustments: DifficultyAdjustment[];
  learningInsights: LearningInsight[];
  graphMetrics: {
    clusteringCoefficient: number;
    averagePathLength: number;
    learningVelocity: number; // Words/day
  };
}

export interface OptimizedReview {
  vocabularyId: string;
  priority: number; // 0-1 (higher = more important)
  optimalInterval: number; // Days (GNN-adjusted)
  confidence: number; // Model confidence (0-1)
  reason: string; // Why this review is recommended
}

export interface DifficultyAdjustment {
  vocabularyId: string;
  currentDifficulty: number;
  recommendedDifficulty: number;
  reason: string;
}

export interface LearningInsight {
  type: 'strength' | 'weakness' | 'plateau' | 'breakthrough';
  category: string; // 'grammar', 'vocabulary', etc.
  description: string;
  actionable: string; // Recommended action
}

export interface ILearningService {
  /**
   * Get GNN-optimized review schedule
   */
  optimizeReviews(request: GNNOptimizationRequest): Promise<GNNOptimizationResponse>;

  /**
   * Record review performance for GNN training
   */
  recordPerformance(performance: ReviewPerformance): Promise<void>;

  /**
   * Predict optimal next items to learn
   */
  predictNextLearning(userId: string, count?: number): Promise<VocabularySearchResult[]>;

  /**
   * Analyze learning patterns and provide insights
   */
  analyzeLearningPatterns(userId: string, days?: number): Promise<LearningInsight[]>;

  /**
   * Train GNN model on user data (background job)
   */
  trainModel(userId: string): Promise<TrainingResult>;
}

export interface TrainingResult {
  modelVersion: string;
  trainingDuration: number; // Milliseconds
  accuracy: number; // Model accuracy (0-1)
  sampleSize: number; // Number of training examples
}

// ============================================================================
// MIGRATION INTERFACES
// ============================================================================

export interface MigrationProgress {
  phase: 'embedding' | 'indexing' | 'graph-building' | 'validation' | 'complete';
  progress: number; // 0-100
  processed: number;
  total: number;
  errors: Array<{ id: string; error: string }>;
  startedAt: Date;
  estimatedCompletion?: Date;
}

export interface IMigrationService {
  /**
   * Migrate existing vocabulary to vector format
   */
  migrateVocabulary(options?: MigrationOptions): Promise<MigrationProgress>;

  /**
   * Build initial knowledge graph
   */
  buildKnowledgeGraph(options?: MigrationOptions): Promise<MigrationProgress>;

  /**
   * Validate migration results
   */
  validateMigration(): Promise<ValidationReport>;

  /**
   * Rollback migration if needed
   */
  rollback(): Promise<void>;
}

export interface MigrationOptions {
  batchSize?: number;
  maxConcurrency?: number;
  skipExisting?: boolean;
  dryRun?: boolean;
}

export interface ValidationReport {
  vocabularyCount: number;
  embeddingsGenerated: number;
  graphNodes: number;
  graphEdges: number;
  issues: Array<{ type: string; description: string; severity: 'error' | 'warning' }>;
  passed: boolean;
}

// ============================================================================
// FACADE INTERFACE (Main Integration Point)
// ============================================================================

export interface IRuVectorFacade {
  embedding: IEmbeddingService;
  search: ISearchService;
  graph: IGraphService;
  learning: ILearningService;
  migration: IMigrationService;

  /**
   * Initialize RuVector client and services
   */
  initialize(config: RuVectorConfig): Promise<void>;

  /**
   * Check health of RuVector services
   */
  healthCheck(): Promise<HealthStatus>;

  /**
   * Gracefully shutdown
   */
  shutdown(): Promise<void>;
}

export interface HealthStatus {
  healthy: boolean;
  services: {
    embedding: boolean;
    search: boolean;
    graph: boolean;
    learning: boolean;
  };
  metrics: {
    indexSize: number;
    graphNodes: number;
    graphEdges: number;
    cacheHitRate: number;
  };
}
