/**
 * RuVector Configuration
 * Loads from environment variables with validation
 */
import { ruVectorConfigSchema, type RuVectorConfigInput } from './schemas';
import type { RuVectorConfig } from './types';

function loadConfig(): RuVectorConfig {
  const rawConfig: RuVectorConfigInput = {
    enabled: process.env.RUVECTOR_ENABLED === 'true',
    apiKey: process.env.RUVECTOR_API_KEY,
    endpoint: process.env.RUVECTOR_ENDPOINT || undefined,
    collections: {
      vocabulary: process.env.RUVECTOR_COLLECTION_VOCABULARY || 'vocabulary_vectors',
      images: process.env.RUVECTOR_COLLECTION_IMAGES || 'image_vectors',
      descriptions: process.env.RUVECTOR_COLLECTION_DESCRIPTIONS || 'description_vectors',
      learningPatterns: process.env.RUVECTOR_COLLECTION_LEARNING || 'learning_pattern_vectors',
    },
    embedding: {
      model: process.env.RUVECTOR_EMBEDDING_MODEL || 'claude-3-5-sonnet-20241022',
      dimensions: parseInt(process.env.RUVECTOR_EMBEDDING_DIMENSIONS || '1536', 10),
      batchSize: parseInt(process.env.RUVECTOR_BATCH_SIZE || '10', 10),
    },
    search: {
      defaultLimit: parseInt(process.env.RUVECTOR_SEARCH_LIMIT || '10', 10),
      minThreshold: parseFloat(process.env.RUVECTOR_SEARCH_THRESHOLD || '0.7'),
      maxResults: parseInt(process.env.RUVECTOR_MAX_RESULTS || '100', 10),
    },
    cache: {
      enabled: process.env.RUVECTOR_CACHE_ENABLED !== 'false',
      ttlSeconds: parseInt(process.env.RUVECTOR_CACHE_TTL || '3600', 10),
      maxSize: parseInt(process.env.RUVECTOR_CACHE_SIZE || '1000', 10),
      similarityThreshold: parseFloat(process.env.RUVECTOR_CACHE_SIMILARITY || '0.85'),
    },
    gnn: {
      enabled: process.env.RUVECTOR_GNN_ENABLED === 'true',
      modelPath: process.env.RUVECTOR_GNN_MODEL_PATH,
      trainingInterval: parseInt(process.env.RUVECTOR_GNN_TRAINING_INTERVAL || '86400', 10),
    },
  };

  return ruVectorConfigSchema.parse(rawConfig);
}

// Singleton config instance
let configInstance: RuVectorConfig | null = null;

export function getVectorConfig(): RuVectorConfig {
  if (!configInstance) {
    configInstance = loadConfig();
  }
  return configInstance;
}

export function resetConfig(): void {
  configInstance = null;
}

// Feature flags for gradual rollout
export const featureFlags = {
  useVectorSearch: () => getVectorConfig().enabled,
  useSemanticCache: () => getVectorConfig().enabled && getVectorConfig().cache.enabled,
  useGNNLearning: () => getVectorConfig().enabled && getVectorConfig().gnn.enabled,
  useKnowledgeGraph: () => getVectorConfig().enabled,
};

export default getVectorConfig;
