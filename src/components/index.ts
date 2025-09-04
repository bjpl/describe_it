// Main component exports
export * from './ImageSearch';
export * from './ImageViewer';
export * from './DescriptionTabs';
// Note: QuestionAnswerPanel and PhraseExtractor are handled by existing QAPanel and PhrasesPanel components
export * from './Shared';

// Learning components
export * from './ProgressTracking';
export * from './Vocabulary';
export * from './SpacedRepetition';

// Infrastructure components
export * from './Accessibility';
export * from './ErrorBoundary';
export * from './Loading';
export * from './NoSSR';
export * from './Optimized';
export * from './Performance';

// Component exports for easier importing
export { AccessibilityProvider, AccessibilityPanel, useAccessibility } from './Accessibility';
export { ErrorBoundary as EnhancedErrorBoundary, useErrorHandler, withErrorBoundary } from './ErrorBoundary';
export { 
  Skeleton, ImageSkeleton, TextSkeleton, ImageCardSkeleton, 
  ImageGridSkeleton, SearchResultsSkeleton, DescriptionSkeleton, 
  QASkeleton, PhrasesSkeleton, PageSkeleton 
} from './Loading';
export { OptimizedImage, OptimizedImageGrid, ImagePreloader, useImagePerformance } from './Optimized';
export { PerformanceMonitor, useAPIPerformanceMonitor, useWebVitals } from './Performance';
export { LoadingSpinner, LoadingOverlay, PageLoader } from './Shared';

// Default exports as named exports
export { default as QAPanel } from './QAPanel';
export { default as QuestionAnswerPanel } from './QAPanel';
export { default as PhrasesPanel } from './PhrasesPanel';
export { default as PhraseExtractor } from './PhrasesPanel';
export { LoadingState } from './LoadingState';
