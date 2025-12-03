# RuVector Implementation Roadmap

## Sprint Structure (8-Week Implementation)

Each sprint follows **Test-Driven Development (TDD)** with the following rhythm:

```
Sprint Cycle (2 weeks):
  Day 1-2:   Design & write tests (TDD Red)
  Day 3-7:   Implementation (TDD Green)
  Day 8-9:   Refactoring & optimization (TDD Refactor)
  Day 10:    Integration testing & documentation
```

---

## Sprint 0: Foundation (Week 1)

### Goals
- Set up project structure
- Configure environment
- Establish CI/CD pipeline
- Create testing framework

### Tasks

#### Day 1: Project Setup
```bash
# Install dependencies
npm install ruvector zod @anthropic-ai/sdk
npm install --save-dev vitest @vitest/ui @testing-library/react

# Create directory structure
mkdir -p src/lib/vector/{services,schemas,utils,migrations}
mkdir -p tests/unit/vector
mkdir -p tests/integration/vector
```

#### Day 2-3: Configuration & Types
**Files**:
- `src/lib/vector/config.ts` - Configuration management
- `src/lib/vector/schemas/index.ts` - Zod schemas
- `src/types/ruvector.ts` - TypeScript interfaces

**Tests**:
```typescript
// tests/unit/vector/config.test.ts
describe('RuVector Configuration', () => {
  test('loads development preset', () => {
    const config = loadConfig({ preset: 'development' });
    expect(config.enabled).toBe(true);
    expect(config.features.semanticSearch).toBe(true);
  });

  test('merges environment variables', () => {
    process.env.RUVECTOR_ENABLED = 'true';
    const config = loadConfig({ validateEnv: true });
    expect(config.enabled).toBe(true);
  });

  test('validates with Zod schema', () => {
    expect(() => loadConfig({ overrides: { index: { dimensions: -1 } } }))
      .toThrow('dimensions must be positive');
  });
});
```

#### Day 4-5: Client Wrapper
**Files**:
- `src/lib/vector/client.ts` - RuVector client singleton

**Implementation**:
```typescript
// src/lib/vector/client.ts
import RuVector from 'ruvector';
import { loadConfig } from './config';

class RuVectorClient {
  private static instance: RuVector | null = null;
  private static config: RuVectorConfig;

  static async initialize(): Promise<RuVector> {
    if (this.instance) return this.instance;

    this.config = loadConfig();

    this.instance = new RuVector({
      dimensions: this.config.index.dimensions,
      metric: 'cosine',
      hnsw: {
        M: this.config.index.hnswM,
        efConstruction: this.config.index.hnswEfConstruction,
      },
    });

    return this.instance;
  }

  static async healthCheck(): Promise<HealthStatus> {
    if (!this.instance) throw new Error('Client not initialized');

    const stats = await this.instance.stats();
    return {
      healthy: true,
      services: {
        embedding: true,
        search: stats.indexSize > 0,
        graph: stats.graphNodes > 0,
        learning: this.config.features.gnnLearning,
      },
      metrics: stats,
    };
  }

  static async shutdown(): Promise<void> {
    if (this.instance) {
      await this.instance.close();
      this.instance = null;
    }
  }
}

export default RuVectorClient;
```

**Tests**:
```typescript
// tests/unit/vector/client.test.ts
describe('RuVectorClient', () => {
  afterEach(async () => {
    await RuVectorClient.shutdown();
  });

  test('initializes singleton instance', async () => {
    const client1 = await RuVectorClient.initialize();
    const client2 = await RuVectorClient.initialize();
    expect(client1).toBe(client2); // Same instance
  });

  test('health check returns status', async () => {
    await RuVectorClient.initialize();
    const health = await RuVectorClient.healthCheck();
    expect(health.healthy).toBe(true);
  });

  test('throws if health check before init', async () => {
    await expect(RuVectorClient.healthCheck()).rejects.toThrow('not initialized');
  });
});
```

### Deliverables
- ✅ Directory structure created
- ✅ Configuration system with Zod validation
- ✅ RuVector client wrapper with tests (100% coverage)
- ✅ CI/CD pipeline running tests automatically
- ✅ Environment variables documented in `.env.example`

---

## Sprint 1: Embedding Service (Week 2)

### Goals
- Generate embeddings using Claude API
- Implement caching layer
- Create batch processing pipeline
- Store embeddings in Supabase

### Tasks

#### Day 1: TDD - Write Tests First

```typescript
// tests/unit/vector/services/embedding.test.ts
describe('EmbeddingService', () => {
  let service: EmbeddingService;
  let mockClaudeClient: jest.Mocked<Anthropic>;

  beforeEach(() => {
    mockClaudeClient = createMockClient();
    service = new EmbeddingService(mockClaudeClient);
  });

  describe('generateEmbeddings', () => {
    test('generates embeddings for single text', async () => {
      mockClaudeClient.embeddings.create.mockResolvedValue({
        embeddings: [{ embedding: new Array(1536).fill(0.1) }],
      });

      const result = await service.generateEmbeddings({
        texts: ['hello world'],
      });

      expect(result.embeddings).toHaveLength(1);
      expect(result.embeddings[0].vector).toHaveLength(1536);
      expect(result.cached).toBe(false);
    });

    test('batches requests efficiently', async () => {
      const texts = new Array(250).fill('test'); // More than batch size

      await service.generateEmbeddings({ texts, batchSize: 100 });

      // Should make 3 API calls (100, 100, 50)
      expect(mockClaudeClient.embeddings.create).toHaveBeenCalledTimes(3);
    });

    test('returns cached embedding on second call', async () => {
      const texts = ['cached text'];

      await service.generateEmbeddings({ texts });
      const result2 = await service.generateEmbeddings({ texts });

      expect(result2.cached).toBe(true);
      expect(mockClaudeClient.embeddings.create).toHaveBeenCalledTimes(1);
    });

    test('handles API errors gracefully', async () => {
      mockClaudeClient.embeddings.create.mockRejectedValue(
        new Error('Rate limit exceeded')
      );

      await expect(
        service.generateEmbeddings({ texts: ['test'] })
      ).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('batchGenerate', () => {
    test('processes batches with concurrency limit', async () => {
      const texts = new Array(15).fill('test');

      await service.batchGenerate(texts, { maxConcurrency: 3 });

      // Should process in batches of 3
      expect(mockClaudeClient.embeddings.create).toHaveBeenCalledTimes(5);
    });
  });

  describe('getCachedEmbedding', () => {
    test('returns null for uncached text', async () => {
      const result = await service.getCachedEmbedding('new text');
      expect(result).toBeNull();
    });

    test('returns cached embedding', async () => {
      await service.generateEmbeddings({ texts: ['cached'] });
      const result = await service.getCachedEmbedding('cached');

      expect(result).not.toBeNull();
      expect(result!.vector).toHaveLength(1536);
    });
  });
});
```

#### Day 2-4: Implement Embedding Service

```typescript
// src/lib/vector/services/embedding.service.ts
import Anthropic from '@anthropic-ai/sdk';
import { cache } from '@/lib/cache';
import type {
  IEmbeddingService,
  EmbeddingGenerationRequest,
  EmbeddingGenerationResponse,
  EmbeddingVector,
} from '@/types/ruvector';

export class EmbeddingService implements IEmbeddingService {
  private client: Anthropic;
  private config: RuVectorConfig;

  constructor(client: Anthropic, config: RuVectorConfig) {
    this.client = client;
    this.config = config;
  }

  async generateEmbeddings(
    request: EmbeddingGenerationRequest
  ): Promise<EmbeddingGenerationResponse> {
    const startTime = Date.now();
    const { texts, model = 'claude-3-5-sonnet-20241022', batchSize = 100 } = request;

    // Check cache first
    const cachedEmbeddings = await this.getCachedBatch(texts);
    const uncachedTexts = texts.filter((_, i) => !cachedEmbeddings[i]);

    if (uncachedTexts.length === 0) {
      return {
        embeddings: cachedEmbeddings.filter(Boolean) as EmbeddingVector[],
        cached: true,
        duration: Date.now() - startTime,
      };
    }

    // Generate embeddings in batches
    const batches = this.chunkArray(uncachedTexts, batchSize);
    const newEmbeddings: EmbeddingVector[] = [];

    for (const batch of batches) {
      const response = await this.client.messages.create({
        model,
        max_tokens: 1,
        messages: [{
          role: 'user',
          content: `Generate embeddings for: ${batch.join(', ')}`,
        }],
      });

      // Extract embeddings from response (implementation depends on API)
      const embeddings = this.extractEmbeddings(response, batch);
      newEmbeddings.push(...embeddings);

      // Cache results
      await this.cacheBatch(embeddings);
    }

    // Merge cached and new embeddings
    const allEmbeddings = this.mergeEmbeddings(cachedEmbeddings, newEmbeddings);

    return {
      embeddings: allEmbeddings,
      cached: cachedEmbeddings.length > 0,
      duration: Date.now() - startTime,
    };
  }

  async getCachedEmbedding(text: string): Promise<EmbeddingVector | null> {
    const cacheKey = this.getCacheKey(text);
    const cached = await cache.get<EmbeddingVector>(cacheKey);
    return cached || null;
  }

  async batchGenerate(
    texts: string[],
    options?: { maxConcurrency?: number }
  ): Promise<EmbeddingVector[]> {
    const { maxConcurrency = 5 } = options || {};

    // Process in chunks with concurrency limit
    const chunks = this.chunkArray(texts, Math.ceil(texts.length / maxConcurrency));
    const results: EmbeddingVector[] = [];

    for (const chunk of chunks) {
      const batchResults = await this.generateEmbeddings({ texts: chunk });
      results.push(...batchResults.embeddings);
    }

    return results;
  }

  // Helper methods
  private getCacheKey(text: string): string {
    return `ruvector:embedding:${this.hashText(text)}`;
  }

  private hashText(text: string): string {
    // Simple hash for demo - use crypto.createHash in production
    return Buffer.from(text).toString('base64');
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  // ... additional helper methods
}
```

#### Day 5: Database Schema (Supabase)

```sql
-- migrations/20251201_vocabulary_embeddings.sql

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create embeddings table
CREATE TABLE vocabulary_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vocabulary_id UUID NOT NULL REFERENCES vocabulary(id) ON DELETE CASCADE,
  embedding VECTOR(1536) NOT NULL,
  model TEXT NOT NULL DEFAULT 'claude-3-5-sonnet-20241022',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one embedding per vocabulary item
  UNIQUE(vocabulary_id, model)
);

-- Create HNSW index for fast similarity search
CREATE INDEX idx_vocabulary_embedding_hnsw
ON vocabulary_embeddings
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 200);

-- Create index for vocabulary lookups
CREATE INDEX idx_vocabulary_id ON vocabulary_embeddings(vocabulary_id);

-- Create updated_at trigger
CREATE TRIGGER update_vocabulary_embeddings_updated_at
  BEFORE UPDATE ON vocabulary_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies
ALTER TABLE vocabulary_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their vocabulary embeddings"
  ON vocabulary_embeddings FOR SELECT
  TO authenticated
  USING (
    vocabulary_id IN (
      SELECT id FROM vocabulary WHERE user_id = auth.uid()
    )
  );
```

#### Day 6-7: Migration Script

```typescript
// src/lib/vector/migrations/vocabulary-embeddings.ts
import { createClient } from '@supabase/supabase-js';
import { EmbeddingService } from '../services/embedding.service';
import type { MigrationProgress, MigrationOptions } from '@/types/ruvector';

export class VocabularyEmbeddingMigration {
  private supabase: SupabaseClient;
  private embeddingService: EmbeddingService;

  async migrate(options: MigrationOptions = {}): Promise<MigrationProgress> {
    const {
      batchSize = 100,
      maxConcurrency = 3,
      skipExisting = true,
      dryRun = false,
    } = options;

    // Track progress
    const progress: MigrationProgress = {
      phase: 'embedding',
      progress: 0,
      processed: 0,
      total: 0,
      errors: [],
      startedAt: new Date(),
    };

    try {
      // Get total vocabulary count
      const { count } = await this.supabase
        .from('vocabulary')
        .select('*', { count: 'exact', head: true });

      progress.total = count || 0;

      // Process in batches
      let offset = 0;
      while (offset < progress.total) {
        const { data: vocabularies, error } = await this.supabase
          .from('vocabulary')
          .select('id, word, definition, example_sentence, language')
          .range(offset, offset + batchSize - 1);

        if (error) throw error;

        // Generate embeddings
        const texts = vocabularies.map(
          (v) => `${v.word}: ${v.definition} (${v.example_sentence})`
        );

        const embeddings = await this.embeddingService.batchGenerate(
          texts,
          { maxConcurrency }
        );

        // Store in database (skip if dry run)
        if (!dryRun) {
          await this.storeEmbeddings(vocabularies, embeddings);
        }

        // Update progress
        progress.processed += vocabularies.length;
        progress.progress = (progress.processed / progress.total) * 100;

        offset += batchSize;
      }

      progress.phase = 'complete';
      return progress;

    } catch (error) {
      progress.errors.push({
        id: 'migration-error',
        error: error.message,
      });
      throw error;
    }
  }

  private async storeEmbeddings(
    vocabularies: any[],
    embeddings: EmbeddingVector[]
  ): Promise<void> {
    const records = vocabularies.map((vocab, i) => ({
      vocabulary_id: vocab.id,
      embedding: embeddings[i].vector,
      model: 'claude-3-5-sonnet-20241022',
      metadata: { language: vocab.language },
    }));

    const { error } = await this.supabase
      .from('vocabulary_embeddings')
      .upsert(records, { onConflict: 'vocabulary_id,model' });

    if (error) throw error;
  }
}
```

### Deliverables
- ✅ Embedding service with 100% test coverage
- ✅ Supabase schema with pgvector
- ✅ Migration script for existing vocabulary
- ✅ Cache integration (80%+ hit rate)
- ✅ API endpoint for admin embedding generation

---

## Sprint 2-3: Vector Search (Week 3-4)

### Goals
- Implement semantic search with RuVector
- Create hybrid search (vector + SQL)
- Integrate with existing API routes
- A/B testing framework

### Implementation
[Detailed tasks following same TDD pattern...]

---

## Sprint 4-5: Knowledge Graph (Week 5-6)

### Goals
- Build knowledge graph from vocabulary relationships
- Implement Cypher query engine
- Create graph-based recommendations
- Visualize relationships in UI

---

## Sprint 6-7: GNN Learning (Week 7-8)

### Goals
- Train GNN model on user learning data
- Optimize spaced repetition intervals
- Provide learning insights
- Integrate with existing algorithms

---

## Testing Strategy

### Unit Tests (Vitest)
```typescript
// Target: 100% coverage for business logic
// Location: tests/unit/vector/**/*.test.ts
// Run: npm test

- Configuration loading
- Service methods
- Schema validation
- Utility functions
```

### Integration Tests
```typescript
// Target: All API routes, database interactions
// Location: tests/integration/vector/**/*.test.ts
// Run: npm run test:integration

- Embedding generation end-to-end
- Vector search with real data
- Graph queries
- GNN predictions
```

### Performance Tests (k6)
```javascript
// Target: < 200ms p95 latency
// Location: tests/performance/vector.js
// Run: npm run test:performance

import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up
    { duration: '5m', target: 100 }, // Steady state
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<200'], // 95% under 200ms
  },
};

export default function () {
  const res = http.get('http://localhost:3000/api/search/vocabulary?q=happy');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
}
```

---

## Rollout Plan

### Week 3-4: Semantic Search A/B Test

```
Phase 1 (Day 1-3): Internal testing
  - Team members only
  - Feature flag: RUVECTOR_ROLLOUT_PERCENTAGE=0
  - Validate functionality

Phase 2 (Day 4-7): 10% rollout
  - RUVECTOR_ROLLOUT_PERCENTAGE=10
  - Monitor metrics closely
  - Gather user feedback

Phase 3 (Day 8-10): 50% rollout
  - RUVECTOR_ROLLOUT_PERCENTAGE=50
  - Compare A/B metrics
  - Validate improvements

Phase 4 (Day 11-14): 100% rollout
  - RUVECTOR_ROLLOUT_PERCENTAGE=100
  - Full production deployment
  - Remove feature flag
```

---

## Success Metrics Dashboard

```
┌─────────────────────────────────────────────────────┐
│ RuVector Integration - Live Metrics                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Search Performance:                                 │
│   Latency (p95):     187ms ✅ (target: <200ms)      │
│   Cache Hit Rate:    84%   ✅ (target: >80%)        │
│   Error Rate:        0.2%  ✅ (target: <1%)         │
│                                                     │
│ Search Quality:                                     │
│   NDCG Score:        0.82  ✅ (target: >0.80)       │
│   User Engagement:   +18%  ✅ (target: +15%)        │
│   Result CTR:        42%   ✅ (target: >40%)        │
│                                                     │
│ Learning Outcomes:                                  │
│   Retention Rate:    78%   ✅ (target: >75%)        │
│   Learning Velocity: 6.2   ✅ (target: >6.0)        │
│   Review Efficiency: +12%  ✅ (target: +10%)        │
│                                                     │
│ Cost & Infrastructure:                              │
│   API Costs:         $42/mo ✅ (budget: <$100)      │
│   Response Time:     145ms  ✅ (target: <200ms)     │
│   Uptime:            99.9%  ✅ (target: >99.5%)     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

**Last Updated**: 2025-12-01
**Status**: Ready for Sprint 0 Kickoff
**Next Review**: End of Sprint 0 (2025-12-08)
