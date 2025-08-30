// Main component exports
export * from './ImageSearch';
export * from './ImageViewer';
export * from './DescriptionTabs';
export * from './QuestionAnswerPanel';
export * from './PhraseExtractor';
export * from './Shared';

// Learning components
export * from './ProgressTracking';
export * from './Vocabulary';
export * from './SpacedRepetition';

// Infrastructure components
export * from './Accessibility';
export * from './ErrorBoundary';
export * from './Loading';
export * from './Optimized';
export * from './Performance';

// Component exports for easier importing
export { AccessibilityProvider, AccessibilityPanel, useAccessibility } from './Accessibility';
export { EnhancedErrorBoundary, withErrorBoundary, useErrorHandler } from './ErrorBoundary';
export { 
  Skeleton, ImageSkeleton, TextSkeleton, ImageCardSkeleton, 
  ImageGridSkeleton, SearchResultsSkeleton, DescriptionSkeleton, 
  QASkeleton, PhrasesSkeleton, PageSkeleton 
} from './Loading';
export { OptimizedImage, OptimizedImageGrid, ImagePreloader, useImagePerformance } from './Optimized';
export { PerformanceMonitor, useAPIPerformanceMonitor, useWebVitals } from './Performance';
export { LoadingSpinner, LoadingOverlay, PageLoader } from './Shared';
