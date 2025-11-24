# Available AI Agents - Reference Guide

This document lists all 54+ specialized agents available for swarm orchestration via Claude Code's Task tool.

---

## 🚀 **Core Development Agents (5)**

### `coder`

- **Purpose**: Implementation specialist for writing clean, efficient code
- **Best for**: Feature implementation, refactoring, code generation
- **Example**: `Task("Implement API", "Create REST endpoints...", "coder")`

### `reviewer`

- **Purpose**: Code review and quality assurance specialist
- **Best for**: Code reviews, quality checks, best practice validation
- **Example**: `Task("Review PR", "Check code quality...", "reviewer")`

### `tester`

- **Purpose**: Comprehensive testing and QA specialist
- **Best for**: Unit tests, integration tests, E2E tests, test strategies
- **Example**: `Task("Create tests", "Write comprehensive test suite...", "tester")`

### `planner`

- **Purpose**: Strategic planning and task orchestration
- **Best for**: Breaking down complex tasks, creating roadmaps
- **Example**: `Task("Plan feature", "Create implementation roadmap...", "planner")`

### `researcher`

- **Purpose**: Deep research and information gathering
- **Best for**: Technology research, pattern analysis, documentation review
- **Example**: `Task("Research API", "Analyze best practices...", "researcher")`

---

## 🎯 **Swarm Coordination Agents (5)**

### `hierarchical-coordinator`

- **Purpose**: Queen-led hierarchical swarm with specialized worker delegation
- **Best for**: Complex multi-phase projects with clear hierarchy

### `mesh-coordinator`

- **Purpose**: Peer-to-peer mesh network with distributed decision making
- **Best for**: Collaborative projects with equal-priority tasks

### `adaptive-coordinator`

- **Purpose**: Dynamic topology switching with self-organizing patterns
- **Best for**: Projects with changing requirements and complexity

### `collective-intelligence-coordinator`

- **Purpose**: Orchestrates distributed cognitive processes across hive mind
- **Best for**: Complex decision-making requiring consensus

### `swarm-memory-manager`

- **Purpose**: Manages distributed memory across swarm for data consistency
- **Best for**: Maintaining state across multiple agent operations

---

## 🔐 **Consensus & Distributed Systems (7)**

### `byzantine-coordinator`

- **Purpose**: Byzantine fault-tolerant consensus with malicious actor detection
- **Best for**: High-security distributed systems

### `raft-manager`

- **Purpose**: Manages Raft consensus algorithm with leader election
- **Best for**: Distributed consensus and log replication

### `gossip-coordinator`

- **Purpose**: Gossip-based consensus for eventually consistent systems
- **Best for**: Scalable distributed state synchronization

### `consensus-builder`

- **Purpose**: General consensus building across distributed agents

### `crdt-synchronizer`

- **Purpose**: Conflict-free Replicated Data Types implementation
- **Best for**: Eventually consistent state synchronization

### `quorum-manager`

- **Purpose**: Dynamic quorum adjustment and membership management
- **Best for**: Distributed voting and decision-making

### `security-manager`

- **Purpose**: Comprehensive security for distributed protocols
- **Best for**: Security audits and implementation

---

## ⚡ **Performance & Optimization (5)**

### `perf-analyzer`

- **Purpose**: Performance bottleneck identification and resolution
- **Best for**: Analyzing slow code, workflow inefficiencies

### `performance-benchmarker`

- **Purpose**: Comprehensive performance benchmarking
- **Best for**: Systematic performance testing and regression detection

### `task-orchestrator`

- **Purpose**: Central coordination for task decomposition and execution
- **Best for**: Complex multi-step task management

### `memory-coordinator`

- **Purpose**: Persistent memory management across sessions
- **Best for**: Cross-agent memory sharing and state persistence

### `smart-agent`

- **Purpose**: Intelligent agent coordination and dynamic spawning
- **Best for**: Adaptive agent deployment based on task complexity

---

## 🐙 **GitHub & Repository Management (9)**

### `github-modes`

- **Purpose**: Comprehensive GitHub workflow orchestration
- **Best for**: PR management, workflow automation, repository coordination

### `pr-manager`

- **Purpose**: Complete pull request lifecycle management
- **Best for**: PR creation, review coordination, merging

### `code-review-swarm`

- **Purpose**: Specialized multi-agent code reviews
- **Best for**: Comprehensive code quality analysis

### `issue-tracker`

- **Purpose**: Intelligent issue management and project coordination
- **Best for**: Issue tracking, progress monitoring, team coordination

### `release-manager`

- **Purpose**: Automated release coordination and deployment
- **Best for**: Version management, testing, cross-package deployment

### `workflow-automation`

- **Purpose**: GitHub Actions workflow creation and optimization
- **Best for**: CI/CD pipeline automation

### `project-board-sync`

- **Purpose**: GitHub Projects synchronization for visual task management
- **Best for**: Kanban-style project tracking

### `repo-architect`

- **Purpose**: Repository structure optimization and multi-repo management
- **Best for**: Project architecture and scalable workflows

### `multi-repo-swarm`

- **Purpose**: Cross-repository swarm orchestration
- **Best for**: Organization-wide automation

---

## 🏗️ **SPARC Methodology Agents (6)**

### `sparc-coord`

- **Purpose**: SPARC methodology orchestrator for systematic development
- **Best for**: Coordinating full SPARC workflow phases

### `sparc-coder`

- **Purpose**: Transform specifications into code with TDD practices
- **Best for**: Implementation phase of SPARC

### `specification`

- **Purpose**: SPARC Specification phase specialist
- **Best for**: Requirements analysis and specification writing

### `pseudocode`

- **Purpose**: SPARC Pseudocode phase specialist
- **Best for**: Algorithm design and pseudocode creation

### `architecture`

- **Purpose**: SPARC Architecture phase specialist
- **Best for**: System design and architecture decisions

### `refinement`

- **Purpose**: SPARC Refinement phase specialist
- **Best for**: Iterative improvement and optimization

---

## 🛠️ **Specialized Development (8)**

### `backend-dev`

- **Purpose**: Backend API development specialist (REST, GraphQL)
- **Best for**: API endpoints, server-side logic, database integration

### `mobile-dev`

- **Purpose**: React Native mobile app development (iOS/Android)
- **Best for**: Cross-platform mobile applications

### `ml-developer`

- **Purpose**: Machine learning model development and deployment
- **Best for**: ML model training, inference, deployment

### `cicd-engineer`

- **Purpose**: GitHub Actions CI/CD pipeline specialist
- **Best for**: Build automation, deployment pipelines

### `api-docs`

- **Purpose**: OpenAPI/Swagger documentation expert
- **Best for**: API documentation creation and maintenance

### `system-architect`

- **Purpose**: System architecture design and technical decisions
- **Best for**: High-level architecture, design patterns

### `code-analyzer`

- **Purpose**: Advanced code quality analysis
- **Best for**: Comprehensive code reviews and improvements

### `base-template-generator`

- **Purpose**: Foundational templates and boilerplate creation
- **Best for**: Project scaffolding, component templates

---

## ✅ **Testing & Validation (2)**

### `tdd-london-swarm`

- **Purpose**: TDD London School specialist (mock-driven development)
- **Best for**: Test-first development with comprehensive mocking

### `production-validator`

- **Purpose**: Production validation for deployment readiness
- **Best for**: Final checks before production deployment

---

## 📋 **Migration & Planning (2)**

### `migration-planner`

- **Purpose**: Comprehensive migration planning
- **Best for**: System migrations, technology transitions

### `swarm-init`

- **Purpose**: Swarm initialization and topology optimization
- **Best for**: Setting up swarm coordination

---

## 🎯 **Usage Guidelines**

### **When to Use Which Agent**

**Simple Tasks**: Use single agent

```javascript
Task('Fix bug', 'Debug and fix authentication issue', 'coder');
```

**Complex Tasks**: Use swarm with coordinator

```javascript
Task('Coordinator', 'Orchestrate full-stack development', 'hierarchical-coordinator');
Task('Backend', 'Build API endpoints', 'backend-dev');
Task('Frontend', 'Create UI', 'coder');
Task('Tests', 'Comprehensive testing', 'tester');
```

**Unknown Complexity**: Use smart-agent

```javascript
Task('Smart orchestration', 'Analyze and deploy optimal agent team', 'smart-agent');
```

---

## 📊 **Agent Selection Matrix**

| Task Type     | Recommended Agent   | Why                             |
| ------------- | ------------------- | ------------------------------- |
| Write code    | `coder`             | Optimized for implementation    |
| Review code   | `reviewer`          | Focused on quality and patterns |
| Write tests   | `tester`            | Testing expertise               |
| Plan work     | `planner`           | Strategic breakdown             |
| Research tech | `researcher`        | Information gathering           |
| Build API     | `backend-dev`       | API-specific knowledge          |
| CI/CD setup   | `cicd-engineer`     | Pipeline expertise              |
| Architecture  | `system-architect`  | High-level design               |
| Migration     | `migration-planner` | Systematic transitions          |
| Swarm coord   | `smart-agent`       | Dynamic orchestration           |

---

## 🔧 **Advanced Agent Combinations**

### **Full-Stack Feature Development**

```javascript
Task('Architect', 'Design system architecture', 'system-architect');
Task('Backend', 'Implement API', 'backend-dev');
Task('Frontend', 'Build UI', 'coder');
Task('Database', 'Schema design', 'code-analyzer');
Task('Tests', 'Comprehensive testing', 'tester');
Task('DevOps', 'CI/CD setup', 'cicd-engineer');
Task('Reviewer', 'Final QA', 'reviewer');
```

### **Code Quality Improvement**

```javascript
Task('Analyzer', 'Identify issues', 'code-analyzer');
Task('Refactor', 'Improve code', 'coder');
Task('Tests', 'Add coverage', 'tester');
Task('Review', 'Validate changes', 'reviewer');
```

### **Production Deployment**

```javascript
Task('Validator', 'Check readiness', 'production-validator');
Task('DevOps', 'Setup pipeline', 'cicd-engineer');
Task('Monitor', 'Configure monitoring', 'backend-dev');
Task('Docs', 'Update documentation', 'api-docs');
```

---

## 📚 **See Also**

- `CLAUDE.md` - Core mandatory directives and critical rules
- `EXAMPLES.md` - Detailed swarm coordination examples
- `docs/reports/` - Swarm execution reports and analysis

---

**This reference guide documents all available agents. See CLAUDE.md for usage rules and EXAMPLES.md for coordination patterns.**
