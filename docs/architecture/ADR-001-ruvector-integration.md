# ADR-001: RuVector Integration for Semantic Search and Learning Optimization

**Status**: Proposed
**Date**: 2025-12-01
**Deciders**: System Architecture Team
**Technical Story**: Integrate vector search and GNN-based learning optimization

---

## Context and Problem Statement

describe_it currently uses SQL-based full-text search for vocabulary discovery, which has limitations:

1. **Lexical matching only** - Cannot find semantically similar words (e.g., "happy" doesn't match "joyful")
2. **No learning optimization** - Spaced repetition uses fixed SM-2 algorithm without personalization
3. **Limited context** - No understanding of vocabulary relationships beyond translations
4. **Scalability concerns** - LIKE queries degrade as vocabulary grows (10k+ items)

**Question**: How can we enhance vocabulary discovery and learning efficiency while maintaining system reliability?

---

## Decision Drivers

1. **User Experience**: Improve search relevance and learning outcomes
2. **Performance**: Maintain sub-200ms search latency at scale
3. **Reliability**: Zero downtime during migration, easy rollback
4. **Cost**: Minimize API costs and infrastructure overhead
5. **Maintainability**: Keep architecture simple and testable
6. **Future-proofing**: Enable advanced features (multi-modal, personalization)

---

## Considered Options

### Option 1: RuVector (HNSW + GNN + Graph)

**Description**: Integrate RuVector for vector search, knowledge graph, and GNN-based learning.

**Pros**:
- 🟢 Purpose-built for language learning (HNSW, Cypher, GNN)
- 🟢 Single package (`npm install ruvector`)
- 🟢 Claude embedding support out-of-the-box
- 🟢 Graph queries for vocabulary relationships
- 🟢 GNN for personalized learning optimization
- 🟢 Distributed with Raft consensus (future scalability)

**Cons**:
- 🔴 New dependency (less battle-tested than alternatives)
- 🔴 Learning curve for Cypher query language
- 🔴 GNN training requires significant compute
- 🔴 Limited community ecosystem vs. Pinecone/Weaviate

**Cost**: Claude API calls (~$0.003 per 1K tokens) + infrastructure (~$50/month)

---

### Option 2: Pinecone + PostgreSQL pgvector

**Description**: Use Pinecone for vector search, pgvector for storage, custom GNN implementation.

**Pros**:
- 🟢 Industry-standard vector database (Pinecone)
- 🟢 Mature ecosystem with SDKs
- 🟢 Managed service (no infrastructure management)
- 🟢 PostgreSQL integration via pgvector

**Cons**:
- 🔴 Requires multiple services (Pinecone + pgvector + custom GNN)
- 🔴 Higher cost (~$70/month Pinecone + API costs)
- 🔴 No built-in graph query support
- 🔴 GNN implementation from scratch
- 🔴 Data duplication (Pinecone + PostgreSQL)

**Cost**: Pinecone Starter (~$70/month) + Claude API + infrastructure (~$120/month total)

---

### Option 3: Elasticsearch + Custom Embeddings

**Description**: Use Elasticsearch's dense vector search with custom Claude embeddings.

**Pros**:
- 🟢 Proven search technology
- 🟢 Hybrid search (vector + text) built-in
- 🟢 Powerful aggregation and filtering
- 🟢 Good documentation and community

**Cons**:
- 🔴 Heavy infrastructure (memory-intensive)
- 🔴 Complex setup and tuning
- 🔴 No built-in graph or GNN support
- 🔴 Requires separate service deployment
- 🔴 Overkill for vocabulary search use case

**Cost**: Elasticsearch Cloud (~$100/month) + Claude API (~$130/month total)

---

### Option 4: Improve SQL Search (No Vector Database)

**Description**: Enhance existing PostgreSQL with FTS, trigram indexes, and manual relationship tables.

**Pros**:
- 🟢 No new dependencies
- 🟢 Minimal migration effort
- 🟢 Lower cost (existing infrastructure)
- 🟢 Simple and maintainable

**Cons**:
- 🔴 No semantic search (lexical only)
- 🔴 Manual relationship maintenance
- 🔴 No personalized learning optimization
- 🔴 Limited by SQL capabilities
- 🔴 Doesn't solve core problem

**Cost**: No additional cost

---

## Decision Outcome

**Chosen Option**: **Option 1 - RuVector Integration**

### Rationale

1. **Best fit for use case**: Purpose-built for language learning with vector search, graph, and GNN in one package.
2. **Future-proofing**: Enables advanced features (multi-modal, personalization) without architectural changes.
3. **Cost-effective**: Lower total cost than Pinecone/Elasticsearch while providing more capabilities.
4. **Phased adoption**: Feature flags allow gradual rollout with fallback to SQL.
5. **Developer experience**: Single NPM package easier to integrate than multi-service solutions.

### Acceptance Criteria

✅ Search latency < 200ms (p95)
✅ Search relevance improvement > 20% (NDCG)
✅ Zero downtime during migration
✅ Easy rollback via feature flags
✅ Cost < $100/month for 10k users

---

## Consequences

### Positive

- **Enhanced user experience**: Semantic search finds relevant vocabulary even with different wording
- **Personalized learning**: GNN adapts to individual learning patterns
- **Knowledge discovery**: Graph queries reveal vocabulary relationships
- **Scalability**: HNSW scales to millions of vectors with sub-100ms latency
- **Innovation enablement**: Platform for future features (audio embeddings, image-to-text)

### Negative

- **New dependency risk**: RuVector is less mature than established solutions
- **Complexity increase**: Additional services (embedding, graph, GNN) to maintain
- **Migration effort**: 8-week phased rollout required
- **Cost uncertainty**: Claude API costs scale with usage
- **Learning curve**: Team needs to learn Cypher, GNN concepts

### Neutral

- **Feature flags required**: Adds configuration complexity but enables gradual rollout
- **Monitoring overhead**: Need new dashboards for vector search metrics
- **Documentation burden**: Must document new architecture and APIs

---

## Implementation Plan

See [MIGRATION_STRATEGY.md](./MIGRATION_STRATEGY.md) for detailed 8-week plan.

**Summary**:
1. **Week 1**: Infrastructure setup (no user impact)
2. **Week 2**: Embedding generation (background process)
3. **Week 3-4**: Vector search (A/B test with 10% → 50% → 100%)
4. **Week 5-6**: Knowledge graph (opt-in feature)
5. **Week 7-8**: GNN learning (beta users only)

---

## Validation Strategy

### Technical Validation

| Metric | Method | Threshold |
|--------|--------|-----------|
| Search latency | Load testing (1000 req/s) | p95 < 200ms |
| Embedding quality | Cosine similarity validation | > 0.85 for synonyms |
| Graph correctness | Manual review of relationships | > 95% accurate |
| GNN accuracy | Offline validation (historical data) | > 85% prediction accuracy |

### Business Validation

| Metric | Method | Threshold |
|--------|--------|-----------|
| User engagement | A/B test (semantic vs. SQL) | +15% session duration |
| Learning outcomes | Retention rate tracking | +10% improvement |
| User satisfaction | NPS survey | +10 point increase |
| Feature adoption | Usage analytics | > 40% of active users |

---

## Risks and Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| RuVector bugs in production | Medium | High | Feature flags for instant rollback |
| Claude API rate limits | Medium | Medium | Aggressive caching, exponential backoff |
| Cost overrun | Low | Medium | Daily budget caps, cost monitoring |
| Poor GNN accuracy | Medium | Low | Fallback to SM-2, retrain with more data |
| User confusion (new UI) | Low | Low | Gradual rollout, tooltips, onboarding |

---

## Alternatives Considered but Rejected

### Weaviate
- **Rejected because**: Requires separate service deployment, higher complexity than RuVector
- **Could revisit if**: RuVector proves unreliable in production

### OpenAI Embeddings
- **Rejected because**: Higher cost ($0.13 per 1M tokens vs. $3 per 1M for Claude), vendor lock-in
- **Could revisit if**: Claude embeddings prove insufficient

### Custom GNN from Scratch
- **Rejected because**: Significant development time (6+ months), reinventing the wheel
- **Could revisit if**: RuVector's GNN doesn't meet requirements

---

## References

- [RuVector Documentation](https://github.com/ruvector/ruvector)
- [HNSW Algorithm Paper](https://arxiv.org/abs/1603.09320)
- [Claude Embeddings Guide](https://docs.anthropic.com/claude/docs/embeddings)
- [Graph Neural Networks Tutorial](https://distill.pub/2021/gnn-intro/)
- [describe_it Existing Architecture](../README.md)

---

## Approval

**Architect**: [Your Name]
**Tech Lead**: [Pending Review]
**Product**: [Pending Review]
**Security**: [Pending Review]

---

**Status**: ⏳ Awaiting Stakeholder Approval
**Next Review**: 2025-12-08
**Implementation Start**: TBD
