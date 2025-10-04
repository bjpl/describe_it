# Spanish Learning App - Hierarchical Swarm Coordination Plan

## Executive Summary
This plan coordinates 8 specialized agents working in parallel to implement 9 missing features without conflicts. Each agent has dedicated file ownership and clear communication protocols through memory sharing.

## Architecture Overview
```
    👑 QUEEN COORDINATOR (Main Orchestrator)
   /     |      |      |      |      |      |      \
  🔬    💻     📊     🧪    🎨    🌐    📋    ⚡
RESEARCH CODE   DATA   TEST  UI/UX  API   EXPORT PERF
AGENT   AGENT  AGENT  AGENT AGENT  AGENT  AGENT  AGENT
```

## Agent Assignments & File Ownership

### 1. Pagination Agent 🔬 (Research & Configuration)
**Files Owned:**
- `src/hooks/useImageSearch.ts` (line 24: change per_page from 20 to 10)
- `src/components/SearchSection.tsx` (pagination controls)

**Tasks:**
- Change pagination from 20 to 10 images per page
- Add pagination controls UI
- Update search API calls

### 2. Duplicate Prevention Agent 💻 (Core Logic)
**Files Owned:**
- `src/lib/cache/duplicate-tracker.ts` (NEW)
- `src/lib/api/redis-adapter.ts` (enhance for duplicates)
- `src/hooks/useSession.ts` (session tracking)

**Tasks:**
- Implement Redis-based duplicate image URL tracking
- Session-scoped duplicate prevention
- "Another Image" cycling logic

### 3. Style Enhancement Agent 📊 (Content Generation)
**Files Owned:**
- `src/lib/api/openai-prompts.ts` (enhance prompts)
- `src/app/api/descriptions/generate/route.ts` (add all 5 styles)
- `src/components/DescriptionPanel.tsx` (style selector enhancement)

**Tasks:**
- Implement all 5 styles: Narrativo, Poético, Académico, Conversacional, Infantil
- Enhance style selection UI
- Update prompt engineering

### 4. Q&A Navigation Agent 🧪 (Testing & Navigation)
**Files Owned:**
- `src/components/QAPanel.tsx` (add navigation)
- `src/hooks/useQASession.ts` (NEW)
- `src/app/api/qa/generate/route.ts` (enhance for navigation)

**Tasks:**
- Add Previous/Next question navigation
- Implement Q&A session state management
- Create question history tracking

### 5. Phrase Categories Agent 🎨 (UI/UX Enhancement)
**Files Owned:**
- `src/components/PhrasesPanel.tsx` (categorization UI)
- `src/lib/utils/phrase-categorizer.ts` (NEW)
- `src/app/api/phrases/extract/route.ts` (categorization logic)

**Tasks:**
- Organize phrases by: Sustantivos, Verbos, Adjetivos, Adverbios, Frases clave
- Create tabbed category interface
- Implement smart phrase categorization

### 6. CSV Export Agent 🌐 (Data Export)
**Files Owned:**
- `src/lib/utils/csv-exporter.ts` (NEW)
- `src/components/ExportButton.tsx` (NEW)
- `src/hooks/useExport.ts` (NEW)

**Tasks:**
- Implement CSV export for vocabulary
- Export Q&A session data
- Create user-friendly export interface

### 7. Session Logging Agent 📋 (Data Tracking)
**Files Owned:**
- `src/lib/utils/session-logger.ts` (NEW)
- `src/lib/api/structured-logging.ts` (enhance)
- `src/hooks/useActivityTracker.ts` (NEW)

**Tasks:**
- Comprehensive user activity logging
- Session analytics and metrics
- Redis-based session persistence

### 8. Performance Agent ⚡ (Loading & Optimization)
**Files Owned:**
- `src/components/LoadingState.tsx` (enhance all loading states)
- `src/components/ProgressIndicator.tsx` (NEW)
- `src/lib/utils/performance-monitor.ts` (NEW)

**Tasks:**
- Add progress indicators for all operations
- Optimize loading states across components
- Implement real-time progress tracking

## Memory Coordination Protocol

### Memory Keys Structure:
```
swarm/
├── pagination/config          # Pagination settings
├── duplicates/session         # Used image URLs
├── styles/prompts            # Style-specific prompts
├── qa/navigation            # Q&A session state
├── phrases/categories       # Category mappings
├── export/sessions          # Export history
├── logging/activities       # Session activities
└── performance/metrics      # Performance data
```

### Inter-Agent Communication:
- **Pagination ↔ Duplicate Prevention**: Page size changes affect duplicate tracking
- **Style Enhancement ↔ Q&A Navigation**: Style affects question generation
- **Phrase Categories ↔ CSV Export**: Category data included in exports
- **Session Logging ↔ All Agents**: Activity tracking for all operations

## Execution Phases

### Phase 1: Foundation Setup (Agents 1-2)
1. Pagination Agent: Update image count configuration
2. Duplicate Prevention Agent: Implement Redis tracking system

### Phase 2: Content Enhancement (Agents 3-5)
3. Style Enhancement Agent: Add all 5 styles
4. Q&A Navigation Agent: Implement question navigation
5. Phrase Categories Agent: Create categorization system

### Phase 3: Data & Performance (Agents 6-8)
6. CSV Export Agent: Build export functionality
7. Session Logging Agent: Implement comprehensive logging
8. Performance Agent: Add progress indicators

## Coordination Hooks

### Pre-Task Hooks:
```bash
npx claude-flow@alpha hooks pre-task --description "[agent-task]"
npx claude-flow@alpha hooks session-restore --session-id "swarm-spanish-app"
```

### Post-Edit Hooks:
```bash
npx claude-flow@alpha hooks post-edit --file "[file-path]" --memory-key "swarm/[agent]/[step]"
npx claude-flow@alpha hooks notify --message "[completion-status]"
```

### Post-Task Hooks:
```bash
npx claude-flow@alpha hooks post-task --task-id "[agent-task-id]"
npx claude-flow@alpha hooks session-end --export-metrics true
```

## Success Metrics

### Individual Agent Success:
- ✅ Files modified without conflicts
- ✅ Memory updates successful
- ✅ Features implemented and tested
- ✅ No breaking changes to other components

### Overall Coordination Success:
- ✅ All 9 features implemented
- ✅ No merge conflicts
- ✅ Seamless feature integration
- ✅ Performance maintained or improved
- ✅ User experience enhanced

## Risk Mitigation

### File Conflict Prevention:
- Each agent owns specific files
- Shared files have designated modification zones
- Memory-based coordination for state sharing

### Dependency Management:
- Clear dependency chains defined
- Async communication through memory
- Independent development paths where possible

### Quality Assurance:
- Each agent includes basic testing
- Integration testing after all agents complete
- Rollback plan if critical issues arise

## Expected Timeline

**Parallel Execution:** All agents start simultaneously
**Estimated Completion:** 30-45 minutes
**Integration Phase:** 15 minutes
**Total Project Time:** 60 minutes maximum

This coordination plan ensures efficient parallel development while maintaining code quality and feature integration.