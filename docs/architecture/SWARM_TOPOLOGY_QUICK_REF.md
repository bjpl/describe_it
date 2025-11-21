# Swarm Topology Quick Reference

**Session ID**: `swarm-integrated-plan`
**Topology**: Adaptive Mesh with Hierarchical Fallback
**Max Agents**: 5 concurrent
**Duration**: 15-21 days (101-145 hours with 32-45h parallelization savings)

---

## Quick Start Commands

### Initialize Swarm
```bash
npx claude-flow@alpha swarm init \
  --topology adaptive-mesh \
  --max-agents 5 \
  --session-id swarm-integrated-plan \
  --memory-enabled true \
  --neural-learning true
```

### Spawn Queen Coordinator
```bash
npx claude-flow@alpha agent spawn \
  --type hierarchical-coordinator \
  --role queen \
  --session-id swarm-integrated-plan
```

---

## Agent Allocation by Phase

### Phase 1: Foundation (5 agents, 4-5 days)
```bash
# Phase Lead
npx claude-flow@alpha agent spawn --type planner --role phase1-lead

# Workers
npx claude-flow@alpha agent spawn --type github-modes --role github-automation
npx claude-flow@alpha agent spawn --type coder --role documentation-agent
npx claude-flow@alpha agent spawn --type researcher --role history-analyzer
```

**Memory Keys**:
- `swarm/phase1/github` - CI/CD config, hook status
- `swarm/phase1/docs` - Documentation coverage, gaps
- `swarm/phase1/history` - Extracted decisions, patterns

### Phase 2: Security (4 agents, 2-3 days)
```bash
# Phase Lead
npx claude-flow@alpha agent spawn --type planner --role phase2-lead

# Workers
npx claude-flow@alpha agent spawn --type reviewer --role security-auditor
npx claude-flow@alpha agent spawn --type coder --role dependency-manager
```

**Memory Keys**:
- `swarm/phase2/security` - Vulnerabilities, fixes, status
- `swarm/phase2/dependencies` - Update status, compatibility
- `swarm/phase2/validation` - Validation coverage, tests

### Phase 3: Technical Debt (5 agents, 5-7 days)
```bash
# Phase Lead
npx claude-flow@alpha agent spawn --type planner --role phase3-lead

# Workers
npx claude-flow@alpha agent spawn --type coder --role refactoring-agent
npx claude-flow@alpha agent spawn --type tester --role test-engineer
npx claude-flow@alpha agent spawn --type code-analyzer --role quality-analyzer
```

**Memory Keys**:
- `swarm/phase3/refactoring` - Modules refactored, metrics
- `swarm/phase3/tests` - Test coverage, failures, gaps
- `swarm/phase3/quality` - Complexity, duplication, debt

### Phase 4: Performance (5 agents, 4-5 days)
```bash
# Phase Lead
npx claude-flow@alpha agent spawn --type planner --role phase4-lead

# Workers
npx claude-flow@alpha agent spawn --type perf-analyzer --role performance-engineer
npx claude-flow@alpha agent spawn --type code-analyzer --role database-optimizer
npx claude-flow@alpha agent spawn --type coder --role cache-architect
```

**Memory Keys**:
- `swarm/phase4/performance` - Benchmarks, bottlenecks
- `swarm/phase4/database` - Query performance, indexes
- `swarm/phase4/cache` - Hit rates, eviction policy

---

## Communication Patterns

### Priority Levels
- **P0**: Critical blocker - immediate action required
- **P1**: Important - requires attention within 1 hour
- **P2**: Normal - handle during next work cycle
- **P3**: Low - informational only

### Message Flow
```
Worker → Memory Manager → Phase Lead → Queen Coordinator
Worker ← Memory Manager ← Phase Lead ← Queen Coordinator
Worker ↔ Worker (mesh communication within phase)
```

---

## Checkpoints & Rollback

### Checkpoints
1. `phase_1_start` - Before any Phase 1 changes
2. `phase_1_complete` - After Phase 1 validation (Gate 1)
3. `phase_2_complete` - After Phase 2 validation (Gate 2)
4. `phase_3_complete` - After Phase 3 validation (Gate 3)
5. `phase_4_complete` - After Phase 4 validation (Final Gate)

### Rollback Triggers
- Test coverage drops > 10%
- New critical security vulnerability
- Build fails for > 3 consecutive attempts
- Manual trigger by Queen Coordinator

### Rollback Command
```bash
# Automated rollback
npx claude-flow@alpha hooks rollback --checkpoint "phase_X_complete"

# Manual git rollback
git reset --hard <checkpoint-commit>
npx claude-flow@alpha memory restore --checkpoint "phase_X_complete"
```

---

## Phase Transition Gates

### Gate 1: Phase 1 → Phase 2
- ✅ All pre-commit hooks configured and passing
- ✅ CI/CD pipeline executes successfully
- ✅ Documentation coverage > 85%
- ✅ Historical decisions extracted
- ✅ All Phase 1 tests passing
- ✅ Queen Coordinator approval

### Gate 2: Phase 2 → Phase 3
- ✅ Zero critical/high security vulnerabilities
- ✅ All secrets rotated and vaulted
- ✅ Security test suite passes
- ✅ Dependency audit complete
- ✅ All Phase 2 tests passing
- ✅ Queen Coordinator approval

### Gate 3: Phase 3 → Phase 4
- ✅ Test coverage > 90%
- ✅ Cyclomatic complexity < 10
- ✅ Zero circular dependencies
- ✅ All modules < 500 LOC
- ✅ All Phase 3 tests passing
- ✅ Queen Coordinator approval

### Final Gate: Phase 4 → Completion
- ✅ API latency p95 < 200ms
- ✅ Database query p95 < 50ms
- ✅ Cache hit rate > 80%
- ✅ Load tests pass at 10x current load
- ✅ All Phase 4 tests passing
- ✅ Queen Coordinator final approval

---

## Monitoring Commands

### Check Swarm Status
```bash
npx claude-flow@alpha swarm status --session-id swarm-integrated-plan
```

### List Active Agents
```bash
npx claude-flow@alpha agent list --session-id swarm-integrated-plan
```

### View Agent Metrics
```bash
npx claude-flow@alpha agent metrics --agent-id <agent-id>
```

### Check Memory State
```bash
npx claude-flow@alpha memory get "swarm/status"
npx claude-flow@alpha memory get "swarm/phase1/github"
```

### View Task Results
```bash
npx claude-flow@alpha task status --task-id <task-id>
npx claude-flow@alpha task results --task-id <task-id>
```

---

## Success Metrics

### Final Targets
- ✅ **Automation**: 100% commits pass pre-commit hooks
- ✅ **Security**: Zero critical/high vulnerabilities
- ✅ **Quality**: Test coverage > 90%
- ✅ **Performance**: API latency p95 < 200ms
- ✅ **Documentation**: 90%+ architecture docs complete

### Timeline
- **Week 1**: Phase 1 (Foundation) - 4-5 days
- **Week 2**: Phase 2 (Security) - 2-3 days
- **Week 3-4**: Phase 3 (Technical Debt) - 5-7 days
- **Week 5**: Phase 4 (Performance) - 4-5 days

**Total**: 15-21 business days

---

## Emergency Contacts

- **Queen Coordinator**: Strategic oversight and conflict resolution
- **Phase Lead**: Tactical coordination within current phase
- **Memory Manager**: State synchronization and recovery
- **Progress Monitor**: Metrics and alerting

---

**Quick Reference Version**: 1.0.0
**Last Updated**: 2025-11-21
**Related Documents**:
- `/home/user/describe_it/docs/architecture/INTEGRATED_PLAN_ARCHITECTURE.md`
- `/home/user/describe_it/docs/plans/PLAN_*.md`
