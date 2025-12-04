/**
 * Lazy-loaded components for code splitting
 * Reduces initial bundle size by dynamically loading heavy components
 */

'use client';

import dynamic from 'next/dynamic';
import { LoadingSpinner } from './Loading/LoadingSpinner';
import React from 'react';

// Skeleton loading components
const LoadingFallback = () => (
  <div className='flex items-center justify-center p-8'>
    <LoadingSpinner size='lg' />
  </div>
);

const MinimalLoading = () => (
  <div className='animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg h-48' />
);

// Heavy components that should be lazy loaded
export const LazyQAPanel = dynamic(() => import('./QAPanel'), {
  loading: LoadingFallback,
  ssr: false,
});

export const LazyEnhancedQAPanel = dynamic(() => import('./EnhancedQAPanel'), {
  loading: LoadingFallback,
  ssr: false,
});

export const LazyEnhancedVocabularyPanel = dynamic(() => import('./EnhancedVocabularyPanel'), {
  loading: LoadingFallback,
  ssr: false,
});

export const LazyExportModal = dynamic(() => import('./ExportModal'), {
  loading: LoadingFallback,
  ssr: false,
});

export const LazySettingsModal = dynamic(() => import('./SettingsModal'), {
  loading: LoadingFallback,
  ssr: false,
});

export const LazySessionReport = dynamic(() => import('./SessionReport'), {
  loading: LoadingFallback,
  ssr: false,
});

// Performance Dashboard - very heavy, only load when needed
export const LazyPerformanceDashboard = dynamic(
  () => import('./Performance/PerformanceDashboard'),
  {
    loading: LoadingFallback,
    ssr: false,
  }
);

// Progress tracking components
export const LazyProgressDashboard = dynamic(() => import('./ProgressTracking/ProgressDashboard'), {
  loading: MinimalLoading,
  ssr: true, // Can SSR
});

export const LazyEnhancedProgressDashboard = dynamic(
  () => import('./ProgressTracking/EnhancedProgressDashboard'),
  {
    loading: LoadingFallback,
    ssr: false,
  }
);

// Image viewer - only load when user opens an image
export const LazyImageViewer = dynamic(() => import('./ImageViewer/ImageViewer'), {
  loading: LoadingFallback,
  ssr: false,
});

// Charts (Chart.js is heavy)
export const LazyChartComponent = dynamic(() => import('react-chartjs-2').then(mod => mod.Line), {
  loading: MinimalLoading,
  ssr: false,
});

// Error monitoring dashboard
export const LazyErrorDashboard = dynamic(() => import('./Monitoring/ErrorDashboard'), {
  loading: LoadingFallback,
  ssr: false,
});

// Export manager with file generation
export const LazyEnhancedExportManager = dynamic(() => import('./Export/EnhancedExportManager'), {
  loading: LoadingFallback,
  ssr: false,
});

// Onboarding wizard (only needed for new users)
export const LazyOnboardingWizard = dynamic(() => import('./Onboarding/OnboardingWizard'), {
  loading: LoadingFallback,
  ssr: false,
});

// Web vitals reporter
export const LazyWebVitalsReporter = dynamic(() => import('./analytics/WebVitalsReporter'), {
  loading: () => null,
  ssr: false,
});

// API key setup wizard
export const LazyApiKeySetupWizard = dynamic(() => import('./ApiKeySetupWizard'), {
  loading: LoadingFallback,
  ssr: false,
});

// Category manager
export const LazyCategoryManager = dynamic(() => import('./Vocabulary/CategoryManager'), {
  loading: LoadingFallback,
  ssr: false,
});

// Review session for spaced repetition
export const LazyReviewSession = dynamic(() => import('./SpacedRepetition/ReviewSession'), {
  loading: LoadingFallback,
  ssr: false,
});

// Helper to preload a component
export function preloadComponent(component: keyof typeof componentMap): void {
  const LazyComponent = componentMap[component];
  if (LazyComponent && 'preload' in LazyComponent) {
    (LazyComponent as any).preload();
  }
}

// Map of all lazy components for easy preloading
const componentMap = {
  qaPanel: LazyQAPanel,
  enhancedQA: LazyEnhancedQAPanel,
  vocabulary: LazyEnhancedVocabularyPanel,
  exportModal: LazyExportModal,
  settings: LazySettingsModal,
  sessionReport: LazySessionReport,
  performance: LazyPerformanceDashboard,
  progress: LazyProgressDashboard,
  enhancedProgress: LazyEnhancedProgressDashboard,
  imageViewer: LazyImageViewer,
  errorDashboard: LazyErrorDashboard,
  exportManager: LazyEnhancedExportManager,
  onboarding: LazyOnboardingWizard,
  apiKeyWizard: LazyApiKeySetupWizard,
  categoryManager: LazyCategoryManager,
  reviewSession: LazyReviewSession,
} as const;

export type LazyComponentName = keyof typeof componentMap;
