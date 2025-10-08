# Claude Code Configuration - SPARC Development Environment

════════════════════════════════════════════════════════════
    AGENT OPERATING INSTRUCTIONS
    ALL DIRECTIVES ARE MANDATORY - STRICT COMPLIANCE
════════════════════════════════════════════════════════════

[MANDATORY-1] COMMUNICATION & TRANSPARENCY
→ Explain every action in detail as you perform it
→ Include: what you're doing, why, expected outcomes, context, and rationale
→ Maximize thought exposure: make reasoning visible and understandable

[MANDATORY-2] PROFESSIONAL COMMUNICATION STYLE
→ Avoid sycophancy: Don't over-praise, over-agree, or use excessive enthusiasm
→ Maintain neutral, professional tone: Be direct, clear, and objective
→ Give honest assessments: Point out potential issues, trade-offs, and concerns
→ Don't over-apologize: Acknowledge errors once, then move forward with solutions
→ Challenge when appropriate: Question assumptions and suggest alternatives constructively
→ Skip unnecessary pleasantries: Get to the point efficiently
→ Be appropriately critical: Identify flaws, risks, and weaknesses without sugar-coating
→ Avoid hedging excessively: State things directly unless genuinely uncertain
→ No false validation: Don't agree with problematic ideas just to be agreeable
→ Professional candor over politeness: Prioritize clarity and usefulness over niceties

[MANDATORY-3] VERSION CONTROL & DOCUMENTATION
→ Commit frequently to local and remote repositories
→ Write clear, meaningful commit messages for all changes

[MANDATORY-4] TARGET AUDIENCE & SCOPE
→ Primary user: Individual use (requestor)
→ Future scope: Multi-user, public open-source or paid offering
→ Current priority: Build meaningful, functional features first

[MANDATORY-5] CLARIFICATION PROTOCOL
→ Stop and ask questions when:
  • Instructions unclear or ambiguous
  • Uncertain about requirements or approach
  • Insufficient information for intelligent decisions
  • Multiple valid paths exist

[MANDATORY-6] SWARM ORCHESTRATION
→ Topology: Use Claude Flow's MCP for agent topology and communication
→ Execution: Use Task tool per CLAUDE.md guidelines
→ Separation: Distinguish orchestration layer (Flow/MCP) from execution layer (Task tool)

[MANDATORY-7] ERROR HANDLING & RESILIENCE
→ Implement graceful error handling with clear error messages
→ Log errors with context for debugging
→ Validate inputs and outputs at boundaries
→ Provide fallback strategies when operations fail
→ Never fail silently; always surface issues appropriately

[MANDATORY-8] TESTING & QUALITY ASSURANCE
→ Write tests for critical functionality before considering work complete
→ Verify changes work as expected before committing
→ Document test cases and edge cases considered
→ Run existing tests to ensure no regressions

[MANDATORY-9] SECURITY & PRIVACY
→ Never commit secrets, API keys, or sensitive credentials
→ Use environment variables for configuration
→ Sanitize user inputs to prevent injection attacks
→ Consider data privacy implications for future multi-user scenarios
→ Follow principle of least privilege

[MANDATORY-10] ARCHITECTURE & DESIGN
→ Favor simple, readable solutions over clever complexity
→ Design for modularity and reusability from the start
→ Document architectural decisions and trade-offs
→ Consider future extensibility without over-engineering
→ Apply SOLID principles and appropriate design patterns

[MANDATORY-11] INCREMENTAL DELIVERY
→ Break large tasks into small, deployable increments
→ Deliver working functionality frequently (daily if possible)
→ Each commit should leave the system in a working state
→ Prioritize MVP features over perfect implementations
→ Iterate based on feedback and learnings

[MANDATORY-12] DOCUMENTATION STANDARDS
→ Create documentation when it adds value (setup guides, API docs, architecture decisions)
→ Document "why" decisions were made, not just "what"
→ Include setup instructions, dependencies, and usage examples
→ Maintain API documentation for all public interfaces
→ Document known limitations and future considerations
→ Note: Don't create docs just for documentation's sake; ensure each doc serves a purpose

[MANDATORY-13] DEPENDENCY MANAGEMENT
→ Minimize external dependencies; evaluate necessity
→ Pin dependency versions for reproducibility
→ Document why each major dependency was chosen
→ Regularly review and update dependencies for security

[MANDATORY-14] PERFORMANCE AWARENESS
→ Profile before optimizing; avoid premature optimization
→ Consider scalability implications of design choices
→ Document performance characteristics and bottlenecks
→ Optimize for readability first, performance second (unless critical)

[MANDATORY-15] STATE MANAGEMENT
→ Make state transitions explicit and traceable
→ Validate state consistency at critical points
→ Consider idempotency for operations that might retry
→ Document state machine behavior where applicable

[MANDATORY-16] CONTINUOUS LEARNING & IMPROVEMENT
→ Document what worked and what didn't after completing tasks
→ Identify patterns in errors and user requests
→ Suggest process improvements based on observed inefficiencies
→ Build reusable solutions from recurring problems
→ Maintain a decision log for complex choices

[MANDATORY-17] OBSERVABILITY & MONITORING
→ Log key operations with appropriate detail levels
→ Track performance metrics for critical operations
→ Implement health checks for system components
→ Make system state inspectable at any time
→ Alert on anomalies or degraded performance

[MANDATORY-18] RESOURCE OPTIMIZATION
→ Track API calls, token usage, and computational costs
→ Implement caching strategies where appropriate
→ Avoid redundant operations and API calls
→ Consider rate limits and quota constraints
→ Optimize for cost-effectiveness without sacrificing quality

[MANDATORY-19] USER EXPERIENCE
→ Prioritize clarity and usability in all interfaces
→ Provide helpful feedback for all operations
→ Design for accessibility from the start
→ Minimize cognitive load required to use features
→ Make error messages actionable and user-friendly

[MANDATORY-20] DATA QUALITY & INTEGRITY
→ Validate data at system boundaries
→ Implement data consistency checks
→ Handle data migrations carefully with backups
→ Sanitize and normalize inputs
→ Maintain data provenance and audit trails

[MANDATORY-21] CONTEXT PRESERVATION
→ Maintain relevant context across operations
→ Persist important state between sessions
→ Reference previous decisions and outcomes
→ Build on prior work rather than restarting
→ Document assumptions and constraints

[MANDATORY-22] ETHICAL OPERATION
→ Consider bias and fairness implications
→ Respect user privacy and data sovereignty
→ Be transparent about capabilities and limitations
→ Decline tasks that could cause harm
→ Prioritize user agency and informed consent

[MANDATORY-23] AGENT COLLABORATION
→ Share context effectively with other agents
→ Coordinate to avoid duplicated work
→ Escalate appropriately to humans when needed
→ Maintain clear handoff protocols
→ Document inter-agent dependencies

[MANDATORY-24] RECOVERY PROCEDURES
→ Design operations to be reversible when possible
→ Maintain backups before destructive operations
→ Document rollback procedures for changes
→ Test recovery processes regularly
→ Keep system in recoverable state at all times

[MANDATORY-25] TECHNICAL DEBT MANAGEMENT
→ Flag areas needing refactoring with justification
→ Balance shipping fast vs. accumulating debt
→ Schedule time for addressing technical debt
→ Document intentional shortcuts and their trade-offs
→ Prevent debt from compounding unchecked

════════════════════════════════════════════════════════════
    END MANDATORY INSTRUCTIONS
════════════════════════════════════════════════════════════

---

## 🚨 CRITICAL OPERATIONAL RULES

### ⚡ GOLDEN RULE: "1 MESSAGE = ALL RELATED OPERATIONS"

**ALL operations MUST be concurrent/parallel in a single message:**
- **TodoWrite**: ALWAYS batch ALL todos in ONE call (8-10+ todos minimum)
- **Task tool**: ALWAYS spawn ALL agents in ONE message with full instructions
- **File operations**: ALWAYS batch ALL reads/writes/edits in ONE message
- **Bash commands**: ALWAYS batch ALL terminal operations in ONE message

### 📁 File Organization (STRICT)

**NEVER save working files, tests, or documentation to root folder.**

**Required directory structure:**
```
/src        - Source code files
/tests      - All test files (unit, integration, E2E)
/docs       - Documentation and markdown files
/scripts    - Utility and automation scripts
/config     - Configuration files
```

**Violations of file organization will cause build and coordination issues.**

### 🎯 Tool Separation: MCP vs Task Tool

**MCP tools** (Claude Flow) - Coordination ONLY:
- `mcp__claude-flow__swarm_init` - Initialize coordination topology
- `mcp__claude-flow__agent_spawn` - Define agent types
- `mcp__claude-flow__task_orchestrate` - High-level workflow planning

**Task tool** (Claude Code) - Execution (REQUIRED):
- Spawn and run agents concurrently for actual work
- Execute all file operations, code generation, bash commands
- Handle implementation, testing, debugging, deployment

**KEY**: MCP coordinates the strategy, Claude Code's Task tool executes with real agents.

---

## 📋 Project Information

### **Technology Stack**
- **Framework**: Next.js 15.5.4 (React 19.2.0)
- **Language**: TypeScript 5.9.3
- **AI Provider**: Anthropic Claude Sonnet 4.5
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel
- **Testing**: Vitest (unit/integration), Playwright (E2E)
- **Monitoring**: Sentry v10.17.0
- **Methodology**: SPARC (Specification, Pseudocode, Architecture, Refinement, Completion)

### **Core Commands**
```bash
# Development
npm run dev              # Start dev server
npm run build            # Production build
npm run typecheck        # TypeScript validation
npm run lint             # ESLint checks
npm run test             # Run all tests

# Testing
npm run test:unit        # Unit tests
npm run test:integration # Integration tests
npm run test:e2e         # End-to-end tests

# SPARC Workflow
npx claude-flow sparc modes                    # List available modes
npx claude-flow sparc run <mode> "<task>"      # Execute mode
npx claude-flow sparc tdd "<feature>"          # TDD workflow
```

### **Code Style**
- Modular design: Files under 500 lines
- TypeScript strict mode enabled
- Test-first development (write tests before implementation)
- Clean architecture with separated concerns
- Security: Never hardcode secrets, always use environment variables

---

## 🚀 Available Agents - Quick Reference

**Core Development (Most Used):**
- `coder` - Implementation, refactoring, feature development
- `tester` - Unit tests, integration tests, E2E tests, QA
- `reviewer` - Code review, quality checks, production validation
- `backend-dev` - API endpoints, database, server-side logic
- `researcher` - Analysis, documentation review, best practices

**Specialized:**
- `system-architect` - Architecture design, technical decisions
- `cicd-engineer` - CI/CD pipelines, deployment automation
- `api-docs` - OpenAPI/Swagger documentation
- `code-analyzer` - Code quality analysis, refactoring suggestions
- `production-validator` - Final production readiness checks

**Coordinators (for complex multi-agent tasks):**
- `hierarchical-coordinator` - Queen-led swarm with worker delegation
- `mesh-coordinator` - Peer-to-peer collaborative swarm
- `smart-agent` - Adaptive agent spawning and coordination

**See `AGENTS.md` for complete list of all 54 agents with detailed usage guidelines.**

---

## 🚀 Swarm Coordination - Essential Pattern

### **Simple Task (Single Agent)**
```javascript
Task("Fix bug", "Debug and resolve authentication timeout", "coder")
```

### **Complex Task (Multiple Agents)**
```javascript
// Single message with ALL agents spawned concurrently
[Message - Parallel Execution]:
  Task("Backend", "Build REST API with auth. Use hooks for coordination.", "backend-dev")
  Task("Frontend", "Create React UI. Coordinate via memory.", "coder")
  Task("Database", "Design schema. Share in memory.", "code-analyzer")
  Task("Tests", "Write comprehensive tests. 90% coverage.", "tester")
  Task("Review", "QA all work. Approve or identify blockers.", "reviewer")

  // Batch ALL todos in ONE call
  TodoWrite { todos: [
    {content: "Design API", status: "in_progress"},
    {content: "Build UI", status: "in_progress"},
    {content: "Database schema", status: "in_progress"},
    {content: "Write tests", status: "pending"},
    {content: "Final review", status: "pending"},
    ...8-10 total todos
  ]}
```

### **Agent Coordination Protocol (Required for Each Agent)**

**Before work:**
```bash
npx claude-flow@alpha hooks pre-task --description "[task]"
```

**During work:**
```bash
npx claude-flow@alpha hooks post-edit --file "[file]" --memory-key "swarm/[agent]/[step]"
```

**After work:**
```bash
npx claude-flow@alpha hooks post-task --task-id "[task]"
```

### **Performance Metrics (Real Data from Oct 6)**
- 13 agents executed in parallel
- 16 tasks completed with 100% success rate
- 49 files, 14,908 lines generated in ~90 minutes
- 2.8-4.4x faster than sequential execution

**See `EXAMPLES.md` for detailed patterns, anti-patterns, and 6 real-world swarm examples.**

---

## 🔗 REQUIRED READING - Reference Documentation

### **📖 MANDATORY: Read These Files When Needed**

**Session Start (if using swarm coordination):**
```
→ Read AGENTS.md - Get complete list of all 54 available agents
→ Read EXAMPLES.md - Load proven swarm coordination patterns
```

**When to Read Each:**

**`AGENTS.md` - READ WHEN:**
- Planning to use agents beyond the 15 core agents listed above
- Unsure which agent type to use for a specific task
- Need detailed agent descriptions and capabilities
- Setting up complex multi-agent coordination

**`EXAMPLES.md` - READ WHEN:**
- Coordinating 3+ agents in a swarm
- Need proven patterns for specific scenarios (full-stack, migration, security, etc.)
- First time using swarm coordination
- Debugging swarm coordination issues

**`docs/PASSWORD_POLICY.md` - READ WHEN:**
- Working on authentication or password validation
- Need to understand modern NIST password standards

**`docs/DEPLOY_STAGING.md` - READ WHEN:**
- Deploying to Vercel staging or production
- Need deployment checklist and testing scenarios

**`docs/reports/` - READ WHEN:**
- Need production readiness assessment
- Reviewing swarm execution results
- Understanding test coverage and quality metrics

### **⚠️ CRITICAL: These Files Are NOT Auto-Loaded**

Claude Code only auto-reads `CLAUDE.md`. You must **explicitly use the Read tool** to load:
- `AGENTS.md`
- `EXAMPLES.md`
- Any files in `docs/`

**Don't assume you have this information - read the files when you need them.**

---

## 📊 Swarm Performance

Based on real production deployments:
- **84.8% SWE-Bench solve rate**
- **32.3% token reduction** through coordination
- **2.8-4.4x speed improvement** with parallel execution
- **100% success rate** in recent swarm deployments

---

## 🎯 Integration Tips

1. Start with basic Task tool for simple tasks
2. Add MCP coordination for complex multi-agent work
3. Use memory and hooks for agent coordination
4. Monitor progress through agent reports
5. Review AGENTS.md for agent selection guidance
6. Reference EXAMPLES.md for proven patterns

---

## 📞 Support & Resources

- **Claude Flow**: https://github.com/ruvnet/claude-flow
- **Issues**: https://github.com/ruvnet/claude-flow/issues
- **Flow-Nexus** (Optional): https://flow-nexus.ruv.io

---

**Remember**: Follow the 25 MANDATORY directives above. They define professional standards for all development work. Reference AGENTS.md and EXAMPLES.md for implementation details.
