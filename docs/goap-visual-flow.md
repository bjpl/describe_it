# GOAP Evaluation Plan - Visual Flow Diagram

## Action Dependency Graph

```
                    ┌────────────────────────────────────────┐
                    │   INITIAL STATE: Nothing Analyzed      │
                    │   All evaluation_dimensions = false    │
                    └──────────────────┬─────────────────────┘
                                       │
                                       │
                    ┌──────────────────▼─────────────────────┐
                    │  PHASE 1: FOUNDATION (30 min)          │
                    │  ┌──────────────────────────────────┐  │
                    │  │ A1: Analyze Codebase Structure   │  │
                    │  │ Agent: code-analyzer             │  │
                    │  │ Cost: 2 | Mode: Code             │  │
                    │  │ Output: goap/structure           │  │
                    │  └──────────────────────────────────┘  │
                    │  Effects: codebase_analyzed = true     │
                    └──────────────────┬─────────────────────┘
                                       │
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        │                              │                              │
        │    PHASE 2: PARALLEL ANALYSIS (60-90 min, 6 concurrent)    │
        │                                                             │
┌───────▼────────┐  ┌──────────────┐  ┌──────────────┐  ┌───────────▼──────┐
│ A2: Architect  │  │ A3: Testing  │  │ A4: Perf     │  │ A5: Security     │
│ Eval Patterns  │  │ Coverage     │  │ Profiling    │  │ Review           │
│ Cost: 3        │  │ Cost: 2      │  │ Cost: 3      │  │ Cost: 4          │
│ Hybrid         │  │ Code         │  │ Hybrid       │  │ Hybrid           │
└───────┬────────┘  └──────┬───────┘  └──────┬───────┘  └───────┬──────────┘
        │                  │                  │                  │
        │  ┌───────────────▼──────────────────▼──────────────────▼────────┐
        │  │                                                                │
        │  │  ┌──────────────┐              ┌────────────────────┐         │
        │  │  │ A7: Deps     │              │ A8: Code Quality   │         │
        │  │  │ Audit        │              │ Measurement        │         │
        │  │  │ Cost: 2      │              │ Cost: 2            │         │
        │  │  │ Code         │              │ Code               │         │
        │  │  └──────┬───────┘              └─────────┬──────────┘         │
        │  │         │                                │                    │
        │  └─────────┼────────────────────────────────┼────────────────────┘
        │            │                                │
        └────────────┴────────────────────────────────┘
                     │
                     │ All results stored in memory:
                     │ - goap/architecture
                     │ - goap/tests
                     │ - goap/performance
                     │ - goap/security
                     │ - goap/dependencies
                     │ - goap/quality
                     │
        ┌────────────▼─────────────────────────────────────────┐
        │  PHASE 3: SYNTHESIS (45 min)                         │
        │  ┌────────────────────────────────────────────────┐  │
        │  │ A6: Identify Technical Debt                    │  │
        │  │ Agent: code-analyzer                           │  │
        │  │ Cost: 3 | Mode: Hybrid                         │  │
        │  │ Requires: A1 (structure) + A2 (architecture)   │  │
        │  │ Output: goap/debt                              │  │
        │  └────────────────────────────────────────────────┘  │
        │  Effects: debt_identified = true                     │
        └──────────────────────┬───────────────────────────────┘
                               │
                               │
        ┌──────────────────────▼───────────────────────────────┐
        │  PHASE 4: REPORTING (45 min)                         │
        │  ┌────────────────────────────────────────────────┐  │
        │  │ A9: Generate Comprehensive Report              │  │
        │  │ Agent: analyst                                 │  │
        │  │ Cost: 3 | Mode: LLM                            │  │
        │  │ Requires: ALL previous actions (A1-A8)         │  │
        │  │ Output: goap/report                            │  │
        │  └────────────────────────────────────────────────┘  │
        │  Effects: report_generated = true                    │
        └──────────────────────┬───────────────────────────────┘
                               │
                               │
        ┌──────────────────────▼───────────────────────────────┐
        │   GOAL STATE: Comprehensive Evaluation Complete      │
        │   All evaluation_dimensions = true                   │
        │                                                       │
        │   Deliverables:                                      │
        │   ✓ docs/evaluation-report.md                        │
        │   ✓ docs/evaluation-metrics.json                     │
        │   ✓ docs/evaluation-action-items.md                  │
        └───────────────────────────────────────────────────────┘
```

---

## Parallel Execution Detail (Phase 2)

```
              ┌─────────────────────────────────────────┐
              │   COORDINATOR: System Architect         │
              │   Hierarchical Topology                 │
              └──────────────────┬──────────────────────┘
                                 │
           ┌─────────────────────┼─────────────────────┐
           │                     │                     │
    ┌──────▼──────┐      ┌──────▼──────┐      ┌──────▼──────┐
    │   Agent 1   │      │   Agent 2   │      │   Agent 3   │
    │ Architect   │      │   Tester    │      │   Perf      │
    │ (A2)        │      │   (A3)      │      │   (A4)      │
    └─────────────┘      └─────────────┘      └─────────────┘
           │                     │                     │
           │ Store in memory     │ Store in memory     │ Store in memory
           └─────────────────────┼─────────────────────┘
                                 │
           ┌─────────────────────┼─────────────────────┐
           │                     │                     │
    ┌──────▼──────┐      ┌──────▼──────┐      ┌──────▼──────┐
    │   Agent 4   │      │   Agent 5   │      │   Agent 6   │
    │  Security   │      │  Reviewer   │      │   Analyzer  │
    │   (A5)      │      │   (A7)      │      │   (A8)      │
    └─────────────┘      └─────────────┘      └─────────────┘
           │                     │                     │
           │ Store in memory     │ Store in memory     │ Store in memory
           └─────────────────────┴─────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │ All results in memory   │
                    │ Ready for Phase 3       │
                    └─────────────────────────┘
```

**Efficiency Gain:** 6 tasks in parallel = ~2x faster than sequential

---

## Cost-Benefit Analysis

```
Action Costs:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
A1: ▓▓       (Cost: 2)
A2: ▓▓▓      (Cost: 3)
A3: ▓▓       (Cost: 2)
A4: ▓▓▓      (Cost: 3)
A5: ▓▓▓▓     (Cost: 4) ← Highest cost
A6: ▓▓▓      (Cost: 3)
A7: ▓▓       (Cost: 2)
A8: ▓▓       (Cost: 2)
A9: ▓▓▓      (Cost: 3)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total: 24 cost units

Critical Path:
A1 (2) → Phase 2 max(4) → A6 (3) → A9 (3) = 12 critical units
```

---

## State Transition Diagram

```
┌─────────────────────────────────────────────────────────┐
│ World State Variables (Boolean)                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  codebase_analyzed:        false ──A1──> true          │
│  structure_mapped:         false ──A1──> true          │
│                                                         │
│  architecture_evaluated:   false ──A2──> true          │
│  patterns_identified:      false ──A2──> true          │
│                                                         │
│  tests_assessed:           false ──A3──> true          │
│  coverage_measured:        false ──A3──> true          │
│                                                         │
│  performance_profiled:     false ──A4──> true          │
│  bottlenecks_identified:   false ──A4──> true          │
│                                                         │
│  security_reviewed:        false ──A5──> true          │
│  vulnerabilities_found:    false ──A5──> true          │
│                                                         │
│  debt_identified:          false ──A6──> true          │
│  refactoring_targets:      false ──A6──> true          │
│                                                         │
│  dependencies_audited:     false ──A7──> true          │
│  security_risks_known:     false ──A7──> true          │
│                                                         │
│  code_quality_measured:    false ──A8──> true          │
│  metrics_collected:        false ──A8──> true          │
│                                                         │
│  report_generated:         false ──A9──> true          │
│                                                         │
└─────────────────────────────────────────────────────────┘

Legend:
  false → true  = State transformation by action
  A1-A9         = Action identifiers
```

---

## Memory Flow Diagram

```
┌────────────┐     ┌────────────┐     ┌────────────┐     ┌────────────┐
│   Action   │────▶│   Memory   │────▶│ Next Action│────▶│   Memory   │
│     A1     │     │   Store    │     │  A2-A8     │     │   Store    │
└────────────┘     └────────────┘     └────────────┘     └────────────┘
      │                  │                    │                  │
      │                  │                    │                  │
   Execute          goap/structure      Read context      goap/*
      │                  │                    │                  │
      ▼                  ▼                    ▼                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                     .swarm/memory.db                             │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ goap/structure      → Codebase analysis                    │  │
│  │ goap/architecture   → Design patterns                      │  │
│  │ goap/tests          → Coverage metrics                     │  │
│  │ goap/performance    → Performance data                     │  │
│  │ goap/security       → Security findings                    │  │
│  │ goap/debt           → Technical debt                       │  │
│  │ goap/dependencies   → Dependency audit                     │  │
│  │ goap/quality        → Code metrics                         │  │
│  │ goap/report         → Final report                         │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                                │
                                │ A9 reads all
                                │
                                ▼
                    ┌───────────────────────┐
                    │ Generate Final Report │
                    │ - Evaluation Report   │
                    │ - Metrics Dashboard   │
                    │ - Action Items        │
                    └───────────────────────┘
```

---

## Timeline Visualization

```
Hour 0        1        2        3        4        5        6        7        8
│────────│────────│────────│────────│────────│────────│────────│────────│
│        │        │        │        │        │        │        │        │
│◄─ A1 ─►│        │        │        │        │        │        │        │
│Foundation      │        │        │        │        │        │        │
│        │        │        │        │        │        │        │        │
         │◄───── Phase 2: Parallel Analysis ──────►│         │        │
         │ A2, A3, A4, A5, A7, A8 (concurrent)     │         │        │
         │                                          │         │        │
                                                    │◄─ A6 ──►│        │
                                                    │Synthesis│        │
                                                              │◄─ A9 ──►│
                                                              │Reporting│
                                                                       │
                                                                    ✓ Complete
```

**Sequential Timeline (without parallelization):**
```
Hour 0    2    4    6    8   10   12   14   16
│────│────│────│────│────│────│────│────│────│
│A1│A2│A3│A4│A5│A6│A7│A8│A9 │                  = 12-16 hours
```

**Speedup:** 2x faster with Phase 2 parallelization

---

## Agent Coordination Pattern

```
                ┌──────────────────────────────┐
                │   System Architect Agent     │
                │   (Hierarchical Coordinator) │
                └──────────────┬───────────────┘
                               │
                    ┌──────────┴──────────┐
                    │  Spawns & Monitors  │
                    └──────────┬──────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
  ┌─────▼──────┐        ┌─────▼──────┐        ┌─────▼──────┐
  │  Worker    │        │  Worker    │        │  Worker    │
  │  Agents    │        │  Agents    │        │  Agents    │
  │  (Pool 1)  │        │  (Pool 2)  │        │  (Pool 3)  │
  └─────┬──────┘        └─────┬──────┘        └─────┬──────┘
        │                     │                      │
        │  Report Progress    │  Report Progress     │  Report Progress
        │                     │                      │
        └─────────────────────┼──────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │ Aggregate Results  │
                    │ & Coordinate Next  │
                    └────────────────────┘
```

**Communication Protocol:**
- Pre-task hooks for initialization
- Post-edit hooks for memory storage
- Post-task hooks for completion tracking
- Session-end hooks for metrics export

---

## Precondition & Effect Matrix

```
┌─────┬────────────────────────────┬─────────────────────────────┐
│ Act │ Preconditions              │ Effects                     │
├─────┼────────────────────────────┼─────────────────────────────┤
│ A1  │ None                       │ codebase_analyzed = true    │
│     │                            │ structure_mapped = true      │
├─────┼────────────────────────────┼─────────────────────────────┤
│ A2  │ codebase_analyzed = true   │ architecture_eval = true    │
│     │                            │ patterns_identified = true   │
├─────┼────────────────────────────┼─────────────────────────────┤
│ A3  │ codebase_analyzed = true   │ tests_assessed = true       │
│     │                            │ coverage_measured = true     │
├─────┼────────────────────────────┼─────────────────────────────┤
│ A4  │ codebase_analyzed = true   │ performance_profiled = true │
│     │                            │ bottlenecks_id = true        │
├─────┼────────────────────────────┼─────────────────────────────┤
│ A5  │ codebase_analyzed = true   │ security_reviewed = true    │
│     │                            │ vulnerabilities_id = true    │
├─────┼────────────────────────────┼─────────────────────────────┤
│ A6  │ codebase_analyzed = true   │ debt_identified = true      │
│     │ architecture_eval = true   │ refactoring_targets = true   │
├─────┼────────────────────────────┼─────────────────────────────┤
│ A7  │ codebase_analyzed = true   │ dependencies_audited = true │
│     │                            │ security_risks_known = true  │
├─────┼────────────────────────────┼─────────────────────────────┤
│ A8  │ codebase_analyzed = true   │ code_quality_measured = true│
│     │                            │ metrics_collected = true     │
├─────┼────────────────────────────┼─────────────────────────────┤
│ A9  │ ALL (A1-A8) = true         │ report_generated = true     │
└─────┴────────────────────────────┴─────────────────────────────┘
```

---

## Success Criteria Checklist

### Phase 1: Foundation
- [ ] Complete file tree generated
- [ ] Component hierarchy documented
- [ ] Module boundaries identified
- [ ] Import relationships mapped

### Phase 2: Parallel Analysis
- [ ] Architecture patterns documented
- [ ] Test coverage calculated
- [ ] Performance bottlenecks identified
- [ ] Security vulnerabilities cataloged
- [ ] Dependencies audited
- [ ] Code quality metrics collected

### Phase 3: Synthesis
- [ ] Technical debt quantified
- [ ] Refactoring priorities set

### Phase 4: Reporting
- [ ] Executive summary written
- [ ] All 8 areas assessed
- [ ] Recommendations prioritized
- [ ] Metrics visualized
- [ ] Action items defined

---

**Plan Ready for Execution**
**Next Step:** Initialize swarm and begin Phase 1
