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
  () => import('@/components/DescriptionPanel'),
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
  () => import('@/components/SettingsModal'),
  {
    loading: () => <LoadingSpinner size="sm" />,
    ssr: false
  }
);

export const LazyExportModal = dynamicImport.loadComponent(
  () => import('@/components/ExportModal')
);

export const LazySessionReportModal = dynamicImport.loadComponent(
  () => import('@/components/SessionReportModal')
);

export const LazyFlashcardComponent = dynamicImport.loadComponent(
  () => import('@/components/FlashcardComponent')
);

export const LazyQuizComponent = dynamicImport.loadComponent(
  () => import('@/components/QuizComponent')
);

// Chart components (heavy dependencies)
export const LazyProgressStatistics = dynamicImport.loadComponent(
  () => import('@/components/ProgressStatistics')
);

export const LazyProgressDashboard = dynamicImport.loadComponent(
  () => import('@/components/ProgressTracking/ProgressDashboard')
);

export const LazyEnhancedProgressDashboard = dynamicImport.loadComponent(
  () => import('@/components/ProgressTracking/EnhancedProgressDashboard')
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
  props?: Record<string, any>;
  fallback?: React.ReactNode;
}

export const DynamicComponent: React.FC<DynamicComponentProps> = ({
  name,
  props = {},
  fallback
}) => {
  const Component = componentRegistry[name];
  
  return (
    <LazyWrapper fallback={fallback}>
      <Component {...props} />
    </LazyWrapper>
  );
};