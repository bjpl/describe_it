/**
 * RuVector Integration Module
 * Provides semantic vector search, knowledge graphs, and GNN-enhanced learning
 */

// Types
export * from './types';

// Schemas
export * from './schemas';

// Configuration
export { getVectorConfig, resetConfig, featureFlags } from './config';

// Client
export {
  vectorClient,
  initializeVectorClient,
  isVectorClientReady,
  RuVectorClient,
} from './client';

// Services
export { embeddingService, EmbeddingService } from './services/embedding';
export { vectorSearchService, VectorSearchService } from './services/search';
export { graphService, GraphService } from './services/graph';
export { learningService, LearningService } from './services/learning';
export {
  spacedRepetitionBridge,
  SpacedRepetitionBridge,
} from './services/spaced-repetition-bridge';
export { semanticCacheService, SemanticCacheService } from './services/cache';

// Integration
export { vectorStoreBridge, VectorStoreBridge } from './integration/vector-store-bridge';
