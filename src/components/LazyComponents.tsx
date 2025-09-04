'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { LoadingSpinner } from '@/components/Loading/LoadingSpinner';

// Lazy load heavy components to reduce initial bundle size
export const LazyImageSearch = dynamic(
  () => import('@/components/ImageSearch/ImageSearch').then(module => ({ default: module.ImageSearch })),
  {
    loading: () => <LoadingSpinner size="lg" />,
    ssr: false
  }
);

export const LazyDescriptionPanel = dynamic(
  () => import('@/components/DescriptionPanel').then(module => ({
    default: module.DescriptionPanel
  })),
  {
    loading: () => <LoadingSpinner size="md" />,
    ssr: false
  }
);

export const LazyQAPanel = dynamic(
  () => import('@/components/QAPanel'),
  {
    loading: () => <LoadingSpinner size="md" />,
    ssr: false
  }
);

export const LazyPhrasesPanel = dynamic(
  () => import('@/components/PhrasesPanel'),
  {
    loading: () => <LoadingSpinner size="md" />,
    ssr: false
  }
);

export const LazyVocabularyBuilder = dynamic(
  () => import('@/components/VocabularyBuilder'),
  {
    loading: () => <LoadingSpinner size="md" />,
    ssr: false
  }
);

export const LazySettingsModal = dynamic(
  () => import('@/components/SettingsModal').then(module => ({
    default: module.SettingsModal
  })),
  {
    loading: () => <LoadingSpinner size="sm" />,
    ssr: false
  }
);

export const LazyExportModal = dynamic(
  () => import('@/components/ExportModal'),
  {
    loading: () => <LoadingSpinner size="sm" />,
    ssr: false
  }
);

export const LazySessionReportModal = dynamic(
  () => import('@/components/SessionReportModal'),
  {
    loading: () => <LoadingSpinner size="sm" />,
    ssr: false
  }
);

export const LazyFlashcardComponent = dynamic(
  () => import('@/components/FlashcardComponent'),
  {
    loading: () => <LoadingSpinner size="md" />,
    ssr: false
  }
);

export const LazyQuizComponent = dynamic(
  () => import('@/components/QuizComponent'),
  {
    loading: () => <LoadingSpinner size="md" />,
    ssr: false
  }
);

// Chart components (heavy dependencies)
export const LazyProgressStatistics = dynamic(
  () => import('@/components/ProgressStatistics'),
  {
    loading: () => <LoadingSpinner size="md" />,
    ssr: false
  }
);

export const LazyProgressDashboard = dynamic(
  () => import('@/components/ProgressTracking/ProgressDashboard'),
  {
    loading: () => <LoadingSpinner size="md" />,
    ssr: false
  }
);

export const LazyEnhancedProgressDashboard = dynamic(
  () => import('@/components/ProgressTracking/EnhancedProgressDashboard'),
  {
    loading: () => <LoadingSpinner size="md" />,
    ssr: false
  }
);

// Loading wrapper component
interface LazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  minHeight?: string;
}

export const LazyWrapper: React.FC<LazyWrapperProps> = ({
  children,
  fallback,
  minHeight = '200px'
}) => {
  const defaultFallback = (
    <div 
      className="flex items-center justify-center"
      style={{ minHeight }}
    >
      <LoadingSpinner size="md" />
    </div>
  );

  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  );
};

// Pre-load critical components
export const preloadCriticalComponents = () => {
  if (typeof window !== 'undefined') {
    // Pre-load components that are likely to be used soon
    requestIdleCallback(() => {
      import('@/components/ImageSearch/ImageSearch');
      import('@/components/DescriptionPanel');
    }, { timeout: 5000 });
  }
};

// Component registry for dynamic loading
export const componentRegistry = {
  ImageSearch: LazyImageSearch,
  DescriptionPanel: LazyDescriptionPanel,
  QAPanel: LazyQAPanel,
  PhrasesPanel: LazyPhrasesPanel,
  VocabularyBuilder: LazyVocabularyBuilder,
  SettingsModal: LazySettingsModal,
  ExportModal: LazyExportModal,
  SessionReportModal: LazySessionReportModal,
  FlashcardComponent: LazyFlashcardComponent,
  QuizComponent: LazyQuizComponent,
  ProgressStatistics: LazyProgressStatistics,
  ProgressDashboard: LazyProgressDashboard,
  EnhancedProgressDashboard: LazyEnhancedProgressDashboard,
};

export type ComponentName = keyof typeof componentRegistry;

// Dynamic component loader
interface DynamicComponentProps {
  name: ComponentName;
  props?: any;
  fallback?: React.ReactNode;
}

export const DynamicComponent: React.FC<DynamicComponentProps> = ({
  name,
  props = {},
  fallback
}) => {
  const Component = componentRegistry[name] as any;
  
  return (
    <LazyWrapper fallback={fallback}>
      <Component {...props} />
    </LazyWrapper>
  );
};