# GOAP Action Dependency Graph

This document visualizes the action dependencies for completing Plans A, B, and C using GOAP (Goal-Oriented Action Planning) methodology.

## Critical Path Visualization

```mermaid
graph TD
    START[Current State: 69.2% Tests, 679 TS Errors]

    %% Phase 1: Critical Stability
    A1[A1: Fix DB Tests<br/>8 hours]
    A2[A2: Resolve TS Errors<br/>12 hours]
    A3[A3: Align API Signatures<br/>6 hours]
    A4[A4: Security Validation<br/>8 hours]

    %% Phase 2: Feature Enhancement
    B1[B1: Export/Import System<br/>10 hours]
    B2[B2: Progress Dashboard<br/>12 hours]
    B4[B4: Flashcard System<br/>14 hours]
    C1[C1: DB Optimization<br/>8 hours]
    C2[C2: Pagination<br/>6 hours]

    %% Phase 3: Performance & Polish
    B5[B5: Advanced Search<br/>10 hours]
    C3[C3: Multi-Layer Caching<br/>10 hours]
    B3[B3: Offline PWA<br/>16 hours]
    C4[C4: Code Splitting<br/>8 hours]
    C5[C5: Error Monitoring<br/>6 hours]
    C6[C6: Performance Benchmarks<br/>8 hours]

    GOAL[Goal State: All Plans Complete]

    %% Dependencies
    START --> A1
    START --> A2

    A2 --> A3
    A3 --> A4

    A1 --> B1
    A3 --> B1
    A1 --> C1

    A2 --> B2
    A3 --> B2

    A1 --> B4
    A3 --> B4

    C1 --> C2
    A3 --> C2

    A3 --> C3
    B2 --> B5
    C1 --> B5
    C2 --> B5

    B1 --> B3
    C3 --> B3

    A2 --> C4

    A4 --> C5
    C4 --> C5

    C1 --> C6
    C3 --> C6
    C4 --> C6
    C5 --> C6

    B1 --> GOAL
    B2 --> GOAL
    B3 --> GOAL
    B4 --> GOAL
    B5 --> GOAL
    C2 --> GOAL
    C6 --> GOAL

    %% Styling
    classDef phase1 fill:#ff9999,stroke:#ff0000,stroke-width:2px
    classDef phase2 fill:#99ccff,stroke:#0066cc,stroke-width:2px
    classDef phase3 fill:#99ff99,stroke:#00cc00,stroke-width:2px
    classDef milestone fill:#ffff99,stroke:#cccc00,stroke-width:3px

    class A1,A2,A3,A4 phase1
    class B1,B2,B4,C1,C2 phase2
    class B5,C3,B3,C4,C5,C6 phase3
    class START,GOAL milestone
```

## Parallel Execution Opportunities

```mermaid
gantt
    title GOAP Execution Timeline with Parallel Tasks
    dateFormat YYYY-MM-DD

    section Phase 1: Stability
    A1: Fix DB Tests           :a1, 2025-12-03, 1d
    A2: Resolve TS Errors      :a2, 2025-12-03, 2d
    A3: Align API Signatures   :a3, after a2, 1d
    A4: Security Validation    :a4, after a3, 1d

    section Phase 2: Features
    B1: Export/Import          :b1, after a1 a3, 2d
    B2: Progress Dashboard     :b2, after a2, 2d
    C1: DB Optimization        :c1, after a1, 1d
    B4: Flashcard System       :b4, after a1 a3, 2d
    C2: Pagination             :c2, after a3 c1, 1d

    section Phase 3: Performance
    C3: Multi-Layer Caching    :c3, after a3, 2d
    B5: Advanced Search        :b5, after b2 c1 c2, 2d
    B3: Offline PWA            :b3, after b1 c3, 2d
    C4: Code Splitting         :c4, after a2, 1d
    C5: Error Monitoring       :c5, after a4 c4, 1d
    C6: Benchmarks             :c6, after c1 c3 c4 c5, 1d
```

## Action Preconditions and Effects

```mermaid
graph LR
    subgraph "Plan A: Stability"
        A1_PRE["Preconditions:<br/>- DB connected<br/>- Test suite exists"]
        A1_PRE --> A1_ACT["A1: Fix DB Tests"]
        A1_ACT --> A1_EFF["Effects:<br/>- tests_passing: +25.8%<br/>- database_stable: true"]

        A2_PRE["Preconditions:<br/>- TS configured"]
        A2_PRE --> A2_ACT["A2: Resolve TS Errors"]
        A2_ACT --> A2_EFF["Effects:<br/>- typescript_clean: true<br/>- build_stable: true"]

        A3_PRE["Preconditions:<br/>- typescript_clean: true"]
        A3_PRE --> A3_ACT["A3: Align APIs"]
        A3_ACT --> A3_EFF["Effects:<br/>- api_aligned: true<br/>- type_safety: true"]

        A4_PRE["Preconditions:<br/>- api_aligned: true<br/>- auth_system_ready: true"]
        A4_PRE --> A4_ACT["A4: Security"]
        A4_ACT --> A4_EFF["Effects:<br/>- security_validated: true<br/>- auth_working: true"]
    end

    subgraph "Plan B: Features"
        B1_PRE["Preconditions:<br/>- tests_passing: 95%<br/>- api_aligned: true"]
        B1_PRE --> B1_ACT["B1: Export/Import"]
        B1_ACT --> B1_EFF["Effects:<br/>- export_implemented: true<br/>- data_portable: true"]

        B2_PRE["Preconditions:<br/>- progress_api_ready: true<br/>- typescript_clean: true"]
        B2_PRE --> B2_ACT["B2: Dashboard"]
        B2_ACT --> B2_EFF["Effects:<br/>- dashboard_ready: true<br/>- analytics_visible: true"]
    end

    subgraph "Plan C: Performance"
        C1_PRE["Preconditions:<br/>- database_stable: true<br/>- tests_passing: 95%"]
        C1_PRE --> C1_ACT["C1: DB Optimize"]
        C1_ACT --> C1_EFF["Effects:<br/>- db_optimized: true<br/>- query_perf: +50%"]

        C3_PRE["Preconditions:<br/>- redis_available: true<br/>- cache_strategy_designed: true"]
        C3_PRE --> C3_ACT["C3: Caching"]
        C3_ACT --> C3_EFF["Effects:<br/>- caching_complete: true<br/>- response_time: -60%"]
    end
```

## World State Evolution

```mermaid
stateDiagram-v2
    [*] --> InitialState

    InitialState: Current State
    InitialState: - tests_passing: 0.692
    InitialState: - typescript_clean: false
    InitialState: - api_aligned: false
    InitialState: - security_validated: false

    InitialState --> Phase1Complete: Actions A1-A4

    Phase1Complete: Plan A Complete
    Phase1Complete: - tests_passing: 0.95+
    Phase1Complete: - typescript_clean: true
    Phase1Complete: - api_aligned: true
    Phase1Complete: - security_validated: true

    Phase1Complete --> Phase2Complete: Actions B1,B2,B4,C1,C2

    Phase2Complete: Plan B Core Complete
    Phase2Complete: - export_implemented: true
    Phase2Complete: - dashboard_ready: true
    Phase2Complete: - flashcards_ready: true
    Phase2Complete: - db_optimized: true
    Phase2Complete: - pagination_ready: true

    Phase2Complete --> GoalState: Actions B3,B5,C3,C4,C5,C6

    GoalState: All Plans Complete
    GoalState: - All Plan A metrics achieved
    GoalState: - All Plan B features working
    GoalState: - All Plan C optimizations active
    GoalState: - Production ready

    GoalState --> [*]
```

## Priority Matrix

```mermaid
quadrantChart
    title Action Priority vs Effort
    x-axis Low Effort --> High Effort
    y-axis Low Priority --> High Priority

    quadrant-1 Quick Wins
    quadrant-2 Critical Path
    quadrant-3 Low Priority
    quadrant-4 Major Initiatives

    A1: [0.3, 0.9]
    A2: [0.5, 0.95]
    A3: [0.25, 0.85]
    A4: [0.35, 0.8]
    B1: [0.4, 0.7]
    B2: [0.5, 0.75]
    B3: [0.8, 0.6]
    B4: [0.6, 0.65]
    B5: [0.4, 0.65]
    C1: [0.35, 0.7]
    C2: [0.25, 0.6]
    C3: [0.4, 0.7]
    C4: [0.35, 0.55]
    C5: [0.25, 0.55]
    C6: [0.35, 0.5]
```

## Risk Heatmap

```mermaid
graph TD
    subgraph "High Impact Risks"
        R1["A2: TS Errors Intractable<br/>Probability: MEDIUM<br/>Impact: HIGH"]
        R2["A1: DB Tests Unstable<br/>Probability: LOW<br/>Impact: CRITICAL"]
    end

    subgraph "Medium Impact Risks"
        R3["B3: Offline Complexity<br/>Probability: HIGH<br/>Impact: MEDIUM"]
        R4["C6: Benchmarks Fail<br/>Probability: MEDIUM<br/>Impact: MEDIUM"]
    end

    subgraph "Low Impact Risks"
        R5["Scope Creep<br/>Probability: HIGH<br/>Impact: HIGH"]
    end

    R1 --> M1["Mitigation: Incremental fixing,<br/>use @ts-expect-error as last resort"]
    R2 --> M2["Mitigation: Isolate test DB,<br/>add retry logic"]
    R3 --> M3["Mitigation: Start read-only,<br/>defer sync conflicts"]
    R4 --> M4["Mitigation: Realistic baselines,<br/>optimize hot paths"]
    R5 --> M5["Mitigation: Strict plan adherence,<br/>weekly reviews"]

    style R2 fill:#ff0000,stroke:#990000,stroke-width:3px
    style R1 fill:#ff9900,stroke:#cc6600,stroke-width:2px
    style R3 fill:#ffcc00,stroke:#cc9900,stroke-width:2px
    style R4 fill:#ffcc00,stroke:#cc9900,stroke-width:2px
    style R5 fill:#ff6600,stroke:#cc3300,stroke-width:2px
```

## Success Criteria Breakdown

```mermaid
graph TB
    subgraph "Plan A Success Metrics"
        A_M1["Test Pass Rate ≥95%"]
        A_M2["TypeScript Errors = 0"]
        A_M3["API Coverage ≥90%"]
        A_M4["Security Audit: PASS"]
        A_M5["CI/CD Pipeline: GREEN"]
    end

    subgraph "Plan B Success Metrics"
        B_M1["Export Formats ≥2"]
        B_M2["Dashboard Components ≥5"]
        B_M3["Flashcard Coverage: 100%"]
        B_M4["Search Response <200ms"]
        B_M5["Offline Features ≥3"]
    end

    subgraph "Plan C Success Metrics"
        C_M1["DB Queries <100ms avg"]
        C_M2["Cache Hit Rate >80%"]
        C_M3["Bundle Size -30%"]
        C_M4["Error Monitoring: 100%"]
        C_M5["Lighthouse Score ≥90"]
    end

    A_M1 --> PRODUCTION_READY
    A_M2 --> PRODUCTION_READY
    A_M3 --> PRODUCTION_READY
    A_M4 --> PRODUCTION_READY
    A_M5 --> PRODUCTION_READY

    B_M1 --> PRODUCTION_READY
    B_M2 --> PRODUCTION_READY
    B_M3 --> PRODUCTION_READY
    B_M4 --> PRODUCTION_READY
    B_M5 --> PRODUCTION_READY

    C_M1 --> PRODUCTION_READY
    C_M2 --> PRODUCTION_READY
    C_M3 --> PRODUCTION_READY
    C_M4 --> PRODUCTION_READY
    C_M5 --> PRODUCTION_READY

    PRODUCTION_READY[Production Ready ✅]

    style PRODUCTION_READY fill:#00cc00,stroke:#009900,stroke-width:4px
```

## Resource Allocation Timeline

```mermaid
gantt
    title Developer Resource Allocation (142 total hours)
    dateFormat YYYY-MM-DD

    section Backend Developer
    A1: Fix DB Tests              :a1, 2025-12-03, 1d
    C1: DB Optimization            :c1, 2025-12-10, 1d
    C2: Pagination                 :c2, 2025-12-11, 1d

    section TypeScript Specialist
    A2: Resolve TS Errors          :a2, 2025-12-03, 2d
    A3: Align API Signatures       :a3, 2025-12-05, 1d
    C4: Code Splitting             :c4, 2025-12-18, 1d

    section Full-Stack Developer
    B1: Export/Import              :b1, 2025-12-06, 2d
    B2: Progress Dashboard         :b2, 2025-12-08, 2d
    B4: Flashcard System           :b4, 2025-12-10, 2d

    section Security Engineer
    A4: Security Validation        :a4, 2025-12-06, 1d
    C5: Error Monitoring           :c5, 2025-12-19, 1d

    section Performance Engineer
    C3: Multi-Layer Caching        :c3, 2025-12-12, 2d
    B5: Advanced Search            :b5, 2025-12-14, 2d
    C6: Benchmarks                 :c6, 2025-12-20, 1d

    section PWA Developer
    B3: Offline PWA                :b3, 2025-12-16, 2d
```

---

## Legend

- **Red Nodes (Phase 1):** Critical stability actions (Plan A)
- **Blue Nodes (Phase 2):** Feature enhancement actions (Plan B core)
- **Green Nodes (Phase 3):** Performance and polish actions (Plan B+C)
- **Yellow Nodes:** Milestones (start/goal states)
- **Arrow Thickness:** Indicates dependency strength

## How to Read This Graph

1. **Critical Path:** Follow the longest path from START to GOAL to identify the minimum timeline
2. **Parallel Opportunities:** Actions at the same vertical level can be executed concurrently
3. **Blockers:** An action cannot start until all incoming arrows are satisfied
4. **Resource Optimization:** Use the Gantt chart to allocate team members efficiently

## Next Step

Begin with actions **A1** (Fix DB Tests) and **A2** (Resolve TS Errors) as they have no dependencies and can run in parallel.
