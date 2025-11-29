# ADR-001: Modular Component Architecture

## Date
2025-01-28

## Status
Accepted

## Context

The GammaVocabularyExtractor component had grown to 1088 lines of code, making it increasingly difficult to:
- Maintain and understand the codebase
- Write focused unit tests for specific functionality
- Reuse component logic across the application
- Onboard new developers to the codebase
- Debug issues when they arose

This monolithic component violated the Single Responsibility Principle and created a maintenance burden. The component handled multiple concerns including:
- Extraction controls and configuration
- Category display and management
- Statistics tracking and presentation
- State management
- Event handling

## Decision

We decided to split the monolithic GammaVocabularyExtractor component into a modular architecture with the following structure:

1. **types.ts** - Shared TypeScript interfaces and types
2. **ExtractorControls.tsx** - Controls for starting/stopping extraction and configuration
3. **CategoryDisplay.tsx** - Display and management of extracted vocabulary categories
4. **ExtractionStats.tsx** - Statistics presentation and tracking
5. **index.tsx** - Main component that orchestrates the modular pieces

Each module has a clear, focused responsibility and can be developed, tested, and maintained independently.

## Consequences

### Positive
- **Improved Maintainability**: Each component is under 300 lines, making it easier to understand and modify
- **Better Testability**: Focused components allow for targeted unit tests with clear test boundaries
- **Enhanced Reusability**: Components like ExtractionStats and CategoryDisplay can be reused across the application
- **Easier Onboarding**: New developers can understand individual components without grasping the entire system
- **Simplified Debugging**: Issues can be isolated to specific components more easily
- **Better Code Organization**: Clear separation of concerns makes the architecture more intuitive

### Negative
- **Initial Refactoring Effort**: Required time investment to split the monolithic component
- **More Files**: Increased number of files may seem overwhelming initially
- **Props Passing**: Some overhead in passing props between parent and child components
- **Import Statements**: More import statements needed across files

### Mitigation Strategies
- Use barrel exports (index.ts) to simplify imports
- Establish clear component boundaries and interfaces
- Document component responsibilities in code comments
- Create integration tests to ensure components work together correctly
