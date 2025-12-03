# RuVector Migration Strategy

## Overview

This document outlines the **phased, zero-downtime migration** strategy for integrating RuVector into describe_it's existing architecture. The migration follows a **strangler fig pattern** with feature flags, allowing gradual rollout and easy rollback.

---

## Migration Phases

### Phase 0: Foundation (Week 1)

**Goal**: Set up infrastructure without impacting existing functionality.

**Tasks**:
1. **Install Dependencies**
   ```bash
   npm install ruvector zod
   npm install --save-dev @types/node
   ```

2. **Create Module Structure**
   ```bash
   mkdir -p src/lib/vector/{services,schemas,utils,migrations}
   touch src/lib/vector/{index,client,config}.ts
   ```

3. **Configuration Setup**
   - Copy `ruvector-config-schema.ts` to `src/lib/vector/config.ts`
   - Add environment variables to `.env.local`:
     ```env
     RUVECTOR_ENABLED=false  # Disabled initially
     RUVECTOR_ENVIRONMENT=development
     RUVECTOR_FEATURE_SEMANTIC_SEARCH=false
     ```

4. **Feature Flag Integration**
   - Add feature flag middleware to API routes
   - Create toggle mechanism for gradual rollout

**Success Criteria**:
- ✅ All files created
- ✅ Configuration loads without errors
- ✅ Existing functionality unchanged
- ✅ Feature flags testable

**Rollback**: Delete new directories, no existing code changed.

---

### Phase 1: Embedding Service (Week 2)

**Goal**: Generate and store embeddings for existing vocabulary.

**Implementation**:

1. **Create Embedding Service** (`src/lib/vector/services/embedding.service.ts`)
   ```typescript
   import { Anthropic } from '@anthropic-ai/sdk';
   import { cache } from '@/lib/cache';

   export class EmbeddingService implements IEmbeddingService {
     private client: Anthropic;

     async generateEmbeddings(request: EmbeddingGenerationRequest) {
       // Use Claude API to generate embeddings
       // Cache results in existing tiered cache
       // Return EmbeddingVector[]
     }
   }
   ```

2. **Database Schema** (Supabase migration)
   ```sql
   -- Create embeddings table
   CREATE TABLE vocabulary_embeddings (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     vocabulary_id UUID REFERENCES vocabulary(id) ON DELETE CASCADE,
     embedding VECTOR(1536), -- pgvector extension
     model TEXT NOT NULL DEFAULT 'claude-3-5-sonnet-20241022',
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );

   -- Create index for vector similarity search
   CREATE INDEX idx_vocab_embedding ON vocabulary_embeddings
   USING hnsw (embedding vector_cosine_ops)
   WITH (m = 16, ef_construction = 200);

   -- Create index for vocabulary lookups
   CREATE INDEX idx_vocab_id ON vocabulary_embeddings(vocabulary_id);
   ```

3. **Migration Script** (`src/lib/vector/migrations/vocabulary-embeddings.ts`)
   ```typescript
   // Batch process existing vocabulary
   // Generate embeddings in batches of 100
   // Store in Supabase with progress tracking
   // Handle errors gracefully
   ```

4. **API Endpoint** (test endpoint only)
   ```typescript
   // POST /api/admin/embeddings/generate
   // Admin-only endpoint to trigger embedding generation
   ```

**Testing**:
- Unit tests for embedding service
- Integration test with Claude API
- Load test with 1000 vocabulary items
- Cache hit rate monitoring

**Success Criteria**:
- ✅ Embeddings generated for all vocabulary
- ✅ Cache hit rate > 80% for repeated queries
- ✅ Average embedding generation < 500ms
- ✅ No impact on existing search functionality

**Rollback**: Disable feature flag, drop embeddings table.

---

### Phase 2: Vector Search (Week 3-4)

**Goal**: Implement semantic search alongside existing SQL search.

**Implementation**:

1. **Search Service** (`src/lib/vector/services/search.service.ts`)
   ```typescript
   export class SearchService implements ISearchService {
     async hybridSearch(query: VocabularySearchQuery) {
       // Run vector and SQL searches in parallel
       // Merge results using RRF (Reciprocal Rank Fusion)
       // Return HybridSearchResult
     }
   }
   ```

2. **Update API Route** (`src/app/api/search/vocabulary/route.ts`)
   ```typescript
   export async function GET(request: Request) {
     const config = loadConfig();

     if (config.features.semanticSearch) {
       // Use hybrid search
       const results = await searchService.hybridSearch(query);
       return NextResponse.json(results.hybridResults);
     } else {
       // Fallback to SQL search (existing code)
       const results = await db.query(...);
       return NextResponse.json(results);
     }
   }
   ```

3. **A/B Testing Setup**
   - Feature flag: `RUVECTOR_FEATURE_SEMANTIC_SEARCH=true`
   - Metrics: search latency, result relevance, user engagement
   - Gradual rollout: 10% → 50% → 100%

4. **Monitoring Dashboard**
   - Search latency (p50, p95, p99)
   - Cache hit rates
   - Result quality metrics
   - Error rates

**Testing**:
- **Unit tests**: Mock vector/SQL services
- **Integration tests**: End-to-end search flow
- **Performance tests**: 100 concurrent searches
- **Quality tests**: Relevance scoring (NDCG)

**Success Criteria**:
- ✅ Semantic search latency < 200ms (p95)
- ✅ Relevance improvement > 20% (user engagement)
- ✅ No errors in production
- ✅ Graceful fallback to SQL on failures

**Rollback**: Set `RUVECTOR_FEATURE_SEMANTIC_SEARCH=false`.

---

### Phase 3: Knowledge Graph (Week 5-6)

**Goal**: Build semantic relationships between vocabulary items.

**Implementation**:

1. **Graph Service** (`src/lib/vector/services/graph.service.ts`)
   ```typescript
   export class GraphService implements IGraphService {
     async buildUserContext(userId: string) {
       // Query user's learning history
       // Build subgraph of known/learning words
       // Find optimal learning paths
     }
   }
   ```

2. **Graph Builder** (`src/lib/vector/migrations/graph-builder.ts`)
   ```typescript
   // Analyze vocabulary relationships
   // Create edges: synonyms, antonyms, compounds
   // Weight edges by semantic similarity
   // Store in RuVector's graph engine
   ```

3. **API Endpoints**
   - `GET /api/vocabulary/:id/related` - Find related words
   - `GET /api/vocabulary/path` - Learning path between words
   - `GET /api/users/:id/context` - User's learning context graph

4. **UI Components**
   - Vocabulary relationship visualizer (React Flow)
   - Learning path recommendations
   - Contextual suggestions during review

**Testing**:
- Graph traversal correctness
- Relationship quality validation
- Performance with large graphs (10k+ nodes)

**Success Criteria**:
- ✅ Graph built for all vocabulary
- ✅ Relationship discovery < 100ms
- ✅ User engagement with related words > 30%

**Rollback**: Set `RUVECTOR_FEATURE_KNOWLEDGE_GRAPH=false`.

---

### Phase 4: GNN Learning Optimization (Week 7-8)

**Goal**: Use Graph Neural Networks to optimize spaced repetition.

**Implementation**:

1. **Learning Service** (`src/lib/vector/services/learning.service.ts`)
   ```typescript
   export class LearningService implements ILearningService {
     async optimizeReviews(request: GNNOptimizationRequest) {
       // Train GNN on user's learning patterns
       // Predict optimal review intervals
       // Return optimized schedule
     }
   }
   ```

2. **GNN Model Training**
   - Collect 30 days of user review data
   - Train GNN model (weekly batch job)
   - Validate predictions against actual performance
   - Deploy model if accuracy > 85%

3. **Integration with Spaced Repetition**
   - Update `src/lib/algorithms/spaced-repetition.ts`
   - Add GNN predictions as input to SM-2 algorithm
   - Fallback to pure SM-2 if GNN unavailable

4. **Monitoring**
   - Learning velocity (words/day)
   - Retention accuracy
   - Review efficiency (time/word)
   - Model drift detection

**Testing**:
- Offline model validation (historical data)
- A/B test: GNN vs. SM-2 only
- User satisfaction surveys

**Success Criteria**:
- ✅ GNN model accuracy > 85%
- ✅ Learning velocity improvement > 15%
- ✅ Retention rate improvement > 10%
- ✅ No degradation in user experience

**Rollback**: Set `RUVECTOR_FEATURE_GNN_LEARNING=false`.

---

## Rollback Strategy

### Immediate Rollback (< 5 minutes)

1. **Feature Flag Toggle**
   ```bash
   # Disable all RuVector features
   RUVECTOR_ENABLED=false
   ```

2. **Cache Invalidation**
   ```typescript
   await cache.clear('ruvector:*');
   ```

3. **Health Check**
   ```bash
   curl https://api.describe-it.com/health
   # Should return: { ruvector: { enabled: false } }
   ```

### Partial Rollback (Specific Feature)

```bash
# Disable semantic search only
RUVECTOR_FEATURE_SEMANTIC_SEARCH=false

# Disable GNN learning only
RUVECTOR_FEATURE_GNN_LEARNING=false
```

### Complete Rollback (1-2 hours)

1. Drop database tables
2. Remove RuVector dependencies
3. Revert API route changes
4. Deploy previous version

---

## Data Migration Details

### Embedding Generation Pipeline

```
┌──────────────────────────────────────────────────────┐
│ 1. Extract Vocabulary from Supabase                  │
│    - SELECT id, word, definition, language           │
│    - Batch size: 100 items                           │
└─────────────────┬────────────────────────────────────┘
                  ▼
┌──────────────────────────────────────────────────────┐
│ 2. Generate Embeddings (Claude API)                  │
│    - Parallel requests: 5 concurrent                 │
│    - Input: word + definition + example             │
│    - Output: 1536-dim vector                         │
│    - Cache: tiered (memory + Redis)                  │
└─────────────────┬────────────────────────────────────┘
                  ▼
┌──────────────────────────────────────────────────────┐
│ 3. Store in Supabase (pgvector)                      │
│    - INSERT INTO vocabulary_embeddings               │
│    - Create HNSW index                               │
│    - Update progress tracker                         │
└─────────────────┬────────────────────────────────────┘
                  ▼
┌──────────────────────────────────────────────────────┐
│ 4. Validation                                        │
│    - Verify vector dimensions                        │
│    - Test similarity search                          │
│    - Check index quality                             │
└──────────────────────────────────────────────────────┘
```

**Estimated Time**: ~10,000 vocabulary items × 200ms/item ÷ 5 concurrent = **7 minutes**

**Cost**: 10,000 items × $0.003 per 1K tokens × 100 tokens avg = **$3.00**

---

## Risk Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Claude API rate limits | High | Medium | Implement exponential backoff, cache aggressively |
| Embedding cost overrun | Medium | Low | Set daily budget cap, monitor costs |
| Search latency increase | High | Medium | Implement timeouts, fallback to SQL |
| Data loss during migration | High | Low | Backup before migration, transaction safety |
| GNN model accuracy low | Medium | Medium | Fallback to SM-2, retrain with more data |
| User confusion (new UI) | Medium | Low | Gradual rollout, user education tooltips |

---

## Success Metrics

### Technical Metrics

| Metric | Baseline (SQL) | Target (RuVector) | Measurement |
|--------|----------------|-------------------|-------------|
| Search latency (p95) | 150ms | < 200ms | API logs |
| Cache hit rate | 60% | > 80% | Cache metrics |
| Search relevance (NDCG) | 0.65 | > 0.80 | User feedback |
| Learning velocity | 5 words/day | > 6 words/day | User analytics |
| Retention rate | 75% | > 82% | Review accuracy |

### Business Metrics

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| Daily active users | 1,000 | +10% | Analytics |
| Session duration | 8 min | +15% | Analytics |
| Feature engagement | - | > 40% | Event tracking |
| User satisfaction (NPS) | 45 | > 55 | Surveys |

---

## Timeline Summary

| Phase | Duration | Features | Risk Level |
|-------|----------|----------|------------|
| 0: Foundation | Week 1 | Infrastructure setup | Low |
| 1: Embeddings | Week 2 | Vector generation | Low |
| 2: Search | Week 3-4 | Semantic search | Medium |
| 3: Graph | Week 5-6 | Knowledge graph | Medium |
| 4: GNN | Week 7-8 | Learning optimization | High |
| **Total** | **8 weeks** | **Full integration** | - |

---

## Post-Migration Optimization

After successful migration:

1. **Performance Tuning**
   - Optimize HNSW parameters (M, ef_construction)
   - Tune hybrid search weights (alpha)
   - Cache warming strategies

2. **Model Refinement**
   - Retrain GNN with production data
   - Fine-tune embedding generation
   - Improve graph relationship quality

3. **Feature Expansion**
   - Multi-language embeddings
   - Audio pronunciation embeddings
   - Image-to-text semantic search

4. **Cost Optimization**
   - Batch embedding generation
   - Reduce API calls with caching
   - Right-size infrastructure

---

## Appendix: Migration Checklist

### Pre-Migration
- [ ] Backup production database
- [ ] Set up staging environment
- [ ] Configure feature flags
- [ ] Create rollback plan
- [ ] Set up monitoring dashboards
- [ ] Notify team of migration window

### During Migration
- [ ] Run embedding generation
- [ ] Validate embedding quality
- [ ] Build HNSW index
- [ ] Test search functionality
- [ ] Monitor API latency
- [ ] Check error rates

### Post-Migration
- [ ] Validate search results
- [ ] Monitor user engagement
- [ ] Track performance metrics
- [ ] Collect user feedback
- [ ] Document lessons learned
- [ ] Plan next phase

---

**Last Updated**: 2025-12-01
**Owner**: System Architecture Team
**Status**: Ready for Implementation
