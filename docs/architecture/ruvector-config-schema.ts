/**
 * RuVector Integration - Configuration Schema
 *
 * Environment-based configuration with Zod validation
 */

import { z } from 'zod';

// ============================================================================
// CONFIGURATION SCHEMA
// ============================================================================

export const RuVectorConfigSchema = z.object({
  // Core Settings
  enabled: z.boolean().default(false),
  environment: z.enum(['development', 'staging', 'production']).default('development'),

  // HNSW Index Configuration
  index: z.object({
    dimensions: z.number().int().min(1).default(1536), // Claude embedding size
    hnswM: z.number().int().min(2).max(100).default(16), // Connections per layer
    hnswEfConstruction: z.number().int().min(10).max(500).default(200), // Index build quality
    hnswEfSearch: z.number().int().min(10).max(500).default(50), // Search quality
    maxElements: z.number().int().min(1000).default(1000000), // Max vocabulary items
  }),

  // Search Configuration
  search: z.object({
    defaultLimit: z.number().int().min(1).max(100).default(20),
    similarityThreshold: z.number().min(0).max(1).default(0.7),
    hybridAlpha: z.number().min(0).max(1).default(0.5), // Vector weight in hybrid search
    rerankingStrategy: z.enum(['rrf', 'weighted', 'cascade']).default('rrf'),
    maxConcurrentSearches: z.number().int().min(1).max(10).default(3),
  }),

  // Graph Configuration
  graph: z.object({
    maxDepth: z.number().int().min(1).max(10).default(3), // Traversal depth
    edgeWeightDecay: z.number().min(0).max(1).default(0.8), // Distance penalty
    minEdgeWeight: z.number().min(0).max(1).default(0.3), // Prune weak edges
    autoConnectThreshold: z.number().min(0).max(1).default(0.85), // Auto-create edges
  }),

  // GNN Learning Configuration
  gnn: z.object({
    enabled: z.boolean().default(false), // Computationally expensive
    hiddenDimensions: z.number().int().min(8).max(512).default(128),
    numLayers: z.number().int().min(1).max(10).default(3),
    learningRate: z.number().min(0.0001).max(0.1).default(0.001),
    batchSize: z.number().int().min(1).max(1000).default(32),
    trainingFrequency: z.enum(['daily', 'weekly', 'on-demand']).default('weekly'),
  }),

  // Cache Configuration
  cache: z.object({
    embeddingTTL: z.number().int().min(60).default(86400), // 24 hours (seconds)
    searchResultsTTL: z.number().int().min(60).default(3600), // 1 hour
    graphQueryTTL: z.number().int().min(60).default(1800), // 30 minutes
    maxMemoryMB: z.number().int().min(10).max(1000).default(100),
    enableDistributed: z.boolean().default(false), // Redis cache
  }),

  // Performance Configuration
  performance: z.object({
    batchSize: z.number().int().min(1).max(1000).default(100),
    maxConcurrency: z.number().int().min(1).max(10).default(5),
    requestTimeout: z.number().int().min(1000).max(60000).default(10000), // ms
    enableMetrics: z.boolean().default(true),
    enableTracing: z.boolean().default(false), // OpenTelemetry
  }),

  // Feature Flags
  features: z.object({
    semanticSearch: z.boolean().default(true),
    knowledgeGraph: z.boolean().default(false),
    gnnLearning: z.boolean().default(false),
    hybridRanking: z.boolean().default(true),
    autoIndexing: z.boolean().default(true), // Auto-index new vocabulary
    adaptiveDifficulty: z.boolean().default(false), // GNN-based difficulty
  }),

  // Migration Settings
  migration: z.object({
    enabled: z.boolean().default(false),
    batchSize: z.number().int().min(10).max(1000).default(100),
    maxConcurrency: z.number().int().min(1).max(10).default(3),
    skipExisting: z.boolean().default(true),
    validateAfter: z.boolean().default(true),
  }),

  // API Configuration
  api: z.object({
    claudeModel: z.string().default('claude-3-5-sonnet-20241022'),
    maxTokens: z.number().int().min(100).max(4096).default(1024),
    temperature: z.number().min(0).max(1).default(0.3),
    rateLimitPerMinute: z.number().int().min(1).max(100).default(20),
  }),

  // Storage Configuration
  storage: z.object({
    provider: z.enum(['memory', 'supabase', 'file']).default('memory'),
    supabaseTable: z.string().default('vocabulary_embeddings'),
    fileStoragePath: z.string().optional(),
    persistenceEnabled: z.boolean().default(true),
  }),

  // Observability
  observability: z.object({
    logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    metricsPort: z.number().int().min(1024).max(65535).optional(),
    tracingSampleRate: z.number().min(0).max(1).default(0.1),
    enableHealthChecks: z.boolean().default(true),
  }),
});

export type RuVectorConfig = z.infer<typeof RuVectorConfigSchema>;

// ============================================================================
// ENVIRONMENT VARIABLE MAPPING
// ============================================================================

export const ENV_PREFIX = 'RUVECTOR_';

export const envConfigMap: Record<string, string> = {
  // Core
  'RUVECTOR_ENABLED': 'enabled',
  'RUVECTOR_ENVIRONMENT': 'environment',

  // Index
  'RUVECTOR_INDEX_DIMENSIONS': 'index.dimensions',
  'RUVECTOR_INDEX_HNSW_M': 'index.hnswM',
  'RUVECTOR_INDEX_HNSW_EF_CONSTRUCTION': 'index.hnswEfConstruction',

  // Search
  'RUVECTOR_SEARCH_DEFAULT_LIMIT': 'search.defaultLimit',
  'RUVECTOR_SEARCH_SIMILARITY_THRESHOLD': 'search.similarityThreshold',

  // Features
  'RUVECTOR_FEATURE_SEMANTIC_SEARCH': 'features.semanticSearch',
  'RUVECTOR_FEATURE_KNOWLEDGE_GRAPH': 'features.knowledgeGraph',
  'RUVECTOR_FEATURE_GNN_LEARNING': 'features.gnnLearning',
  'RUVECTOR_FEATURE_HYBRID_RANKING': 'features.hybridRanking',

  // API
  'RUVECTOR_CLAUDE_MODEL': 'api.claudeModel',
  'ANTHROPIC_API_KEY': 'api.apiKey', // Existing env var

  // Storage
  'RUVECTOR_STORAGE_PROVIDER': 'storage.provider',
  'RUVECTOR_SUPABASE_TABLE': 'storage.supabaseTable',
};

// ============================================================================
// PRESET CONFIGURATIONS
// ============================================================================

export const PRESET_CONFIGS = {
  development: {
    enabled: true,
    environment: 'development' as const,
    features: {
      semanticSearch: true,
      knowledgeGraph: false,
      gnnLearning: false,
      hybridRanking: true,
      autoIndexing: true,
      adaptiveDifficulty: false,
    },
    search: {
      defaultLimit: 10,
      similarityThreshold: 0.7,
    },
    cache: {
      embeddingTTL: 3600, // 1 hour (faster iteration)
      enableDistributed: false,
    },
    observability: {
      logLevel: 'debug' as const,
      enableHealthChecks: true,
    },
  },

  staging: {
    enabled: true,
    environment: 'staging' as const,
    features: {
      semanticSearch: true,
      knowledgeGraph: true,
      gnnLearning: false,
      hybridRanking: true,
      autoIndexing: true,
      adaptiveDifficulty: false,
    },
    search: {
      defaultLimit: 20,
      similarityThreshold: 0.75,
    },
    cache: {
      embeddingTTL: 43200, // 12 hours
      enableDistributed: true,
    },
    observability: {
      logLevel: 'info' as const,
      enableHealthChecks: true,
      tracingSampleRate: 0.1,
    },
  },

  production: {
    enabled: true,
    environment: 'production' as const,
    features: {
      semanticSearch: true,
      knowledgeGraph: true,
      gnnLearning: true,
      hybridRanking: true,
      autoIndexing: true,
      adaptiveDifficulty: true,
    },
    search: {
      defaultLimit: 20,
      similarityThreshold: 0.8,
    },
    cache: {
      embeddingTTL: 86400, // 24 hours
      enableDistributed: true,
      maxMemoryMB: 500,
    },
    gnn: {
      enabled: true,
      trainingFrequency: 'weekly' as const,
    },
    observability: {
      logLevel: 'warn' as const,
      enableHealthChecks: true,
      tracingSampleRate: 0.05,
      enableTracing: true,
    },
    performance: {
      requestTimeout: 5000, // Strict timeout
      maxConcurrency: 3,
    },
  },

  // Minimal configuration (vector search only)
  minimal: {
    enabled: true,
    features: {
      semanticSearch: true,
      knowledgeGraph: false,
      gnnLearning: false,
      hybridRanking: false,
      autoIndexing: true,
      adaptiveDifficulty: false,
    },
    cache: {
      enableDistributed: false,
    },
    observability: {
      logLevel: 'error' as const,
    },
  },
} as const;

// ============================================================================
// CONFIGURATION LOADER
// ============================================================================

export interface ConfigLoaderOptions {
  preset?: keyof typeof PRESET_CONFIGS;
  overrides?: Partial<RuVectorConfig>;
  validateEnv?: boolean;
}

export function loadConfig(options: ConfigLoaderOptions = {}): RuVectorConfig {
  const { preset = 'development', overrides = {}, validateEnv = true } = options;

  // Start with preset
  const baseConfig = PRESET_CONFIGS[preset] || PRESET_CONFIGS.development;

  // Load from environment variables
  const envConfig = validateEnv ? loadFromEnv() : {};

  // Merge: preset < env < overrides
  const mergedConfig = {
    ...baseConfig,
    ...envConfig,
    ...overrides,
  };

  // Validate with Zod
  return RuVectorConfigSchema.parse(mergedConfig);
}

function loadFromEnv(): Partial<RuVectorConfig> {
  const config: any = {};

  for (const [envKey, configPath] of Object.entries(envConfigMap)) {
    const value = process.env[envKey];
    if (value !== undefined) {
      setNestedProperty(config, configPath, parseEnvValue(value));
    }
  }

  return config;
}

function setNestedProperty(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current)) {
      current[key] = {};
    }
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
}

function parseEnvValue(value: string): any {
  // Boolean
  if (value === 'true') return true;
  if (value === 'false') return false;

  // Number
  const num = Number(value);
  if (!isNaN(num)) return num;

  // String
  return value;
}

// ============================================================================
// EXAMPLE USAGE
// ============================================================================

/*
// Development (default)
const devConfig = loadConfig();

// Production with overrides
const prodConfig = loadConfig({
  preset: 'production',
  overrides: {
    features: {
      ...PRESET_CONFIGS.production.features,
      gnnLearning: false, // Disable GNN temporarily
    },
  },
});

// From environment variables only
const envConfig = loadConfig({
  preset: 'minimal',
  validateEnv: true,
});
*/
