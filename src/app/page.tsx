'use client';

import React, { useState, useCallback, memo, Suspense } from 'react';
import { logger } from '@/lib/logger';
import { MotionDiv, MotionButton } from '@/components/ui/MotionComponents';
import {
  Search,
  Settings,
  Download,
  BarChart3,
  BookOpen,
  MessageCircle,
  Brain,
} from 'lucide-react';
import { LazyWrapper, preloadCriticalComponents } from '@/components/LazyComponents';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { useDescriptions } from '@/hooks/useDescriptions';
import { LoadingSpinner } from '@/components/Loading/LoadingSpinner';
import { ErrorBoundary } from '@/providers/ErrorBoundary';
import { DescriptionStyle } from '@/types';
import { UserMenu } from '@/components/Auth/UserMenu';

// Lazy load main application components with error handling
const LazyImageSearch = React.lazy(() =>
  import('@/components/ImageSearch/ImageSearch')
    .then(module => ({
      default: module.ImageSearch,
    }))
    .catch(error => {
      logger.error('[DYNAMIC IMPORT] Failed to load ImageSearch:', error);
      throw error;
    })
);

const LazyDescriptionPanel = React.lazy(() =>
  import('@/components/DescriptionPanel')
    .then(module => ({
      default: module.DescriptionPanel,
    }))
    .catch(error => {
      logger.error('[DYNAMIC IMPORT] Failed to load DescriptionPanel:', error);
      throw error;
    })
);

const LazyQAPanel = React.lazy(() =>
  import('@/components/QAPanel').catch(error => {
    logger.error('[DYNAMIC IMPORT] Failed to load QAPanel:', error);
    throw error;
  })
);

const LazyPhrasesPanel = React.lazy(() =>
  import('@/components/EnhancedPhrasesPanel').catch(error => {
    logger.error('[DYNAMIC IMPORT] Failed to load PhrasesPanel:', error);
    throw error;
  })
);

import { SettingsModal } from '@/components/SettingsModal';

interface HomePageState {
  activeTab: 'search' | 'description' | 'qa' | 'phrases';
  selectedImage: any;
  searchQuery: string;
  showSettings: boolean;
  selectedStyle: DescriptionStyle;
  darkMode: boolean;
}

const HomePageBase: React.FC = () => {
  // PRODUCTION DEBUGGING: Only initialize performance monitor in browser
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  const [state, setState] = useState<HomePageState>({
    activeTab: 'search',
    selectedImage: null,
    searchQuery: '',
    showSettings: false,
    selectedStyle: 'narrativo' as DescriptionStyle,
    darkMode: false,
  });

  // Always call hooks - but make them SSR-safe internally
  const performanceHook = usePerformanceMonitor('HomePage');
  const { trackRenderStart, trackRenderEnd, performanceState, getPerformanceScore } =
    performanceHook;

  // Track component render performance - only in client
  React.useEffect(() => {
    if (!isClient) return;

    try {
      logger.info('[HOMEPAGE] Starting render tracking');
      trackRenderStart();
      return () => {
        trackRenderEnd();
      };
    } catch (error) {
      logger.error('[HOMEPAGE] Render tracking failed:', error);
    }
  }, [isClient, trackRenderStart, trackRenderEnd]);

  // Always call hooks - descriptions hook should be SSR-safe internally
  const descriptionsHook = useDescriptions(
    state.selectedImage?.urls?.regular || state.selectedImage?.url || ''
  );

  const {
    descriptions,
    isLoading: isGenerating,
    error: descriptionError,
    generateDescription,
  } = descriptionsHook;

  // Memoized callbacks to prevent unnecessary re-renders
  const handleTabChange = useCallback((tab: HomePageState['activeTab']) => {
    setState(prev => ({ ...prev, activeTab: tab }));
  }, []);

  const handleImageSelect = useCallback((image: any) => {
    setState(prev => ({
      ...prev,
      selectedImage: image,
      activeTab: 'description',
    }));
  }, []);

  const handleSearchQueryChange = useCallback((query: string) => {
    setState(prev => ({ ...prev, searchQuery: query }));
  }, []);

  const toggleSettings = useCallback(() => {
    setState(prev => ({ ...prev, showSettings: !prev.showSettings }));
  }, []);

  const toggleDarkMode = useCallback(() => {
    setState(prev => ({ ...prev, darkMode: !prev.darkMode }));
  }, []);

  const closeSettings = useCallback(() => {
    setState(prev => ({ ...prev, showSettings: false }));
  }, []);

  const handleStyleChange = useCallback((style: DescriptionStyle) => {
    setState(prev => ({ ...prev, selectedStyle: style }));
  }, []);

  const handleGenerateDescriptions = useCallback(() => {
    if (state.selectedImage && state.selectedStyle) {
      generateDescription({
        imageUrl: state.selectedImage.urls?.regular || state.selectedImage.url,
        style: state.selectedStyle,
      });
    }
  }, [state.selectedImage, state.selectedStyle, generateDescription]);

  // Pre-load components when user starts interacting - only in client
  React.useEffect(() => {
    if (!isClient) return;

    try {
      logger.info('[HOMEPAGE] Preloading critical components');
      preloadCriticalComponents();
      logger.info('[HOMEPAGE] Critical components preloaded');
    } catch (error) {
      logger.error('[HOMEPAGE] Failed to preload components:', error);
    }
  }, [isClient]);

  // PRODUCTION DEBUGGING: Component mount/unmount tracking
  React.useEffect(() => {
    logger.info('[HOMEPAGE] Component mounted successfully');

    return () => {
      logger.info('[HOMEPAGE] Component unmounting');
    };
  }, []);

  const tabConfig = React.useMemo(
    () => [
      { id: 'search', label: 'Search Images', icon: Search, component: LazyImageSearch },
      { id: 'description', label: 'Descriptions', icon: BookOpen, component: LazyDescriptionPanel },
      { id: 'qa', label: 'Q&A Practice', icon: MessageCircle, component: LazyQAPanel },
      { id: 'phrases', label: 'Vocabulary', icon: Brain, component: LazyPhrasesPanel },
    ],
    []
  );

  const ActiveComponent = React.useMemo(() => {
    const config = tabConfig.find(tab => tab.id === state.activeTab);
    return config?.component || LazyImageSearch;
  }, [state.activeTab, tabConfig]);

  const performanceScore = React.useMemo(() => {
    if (!isClient) return 100;
    return getPerformanceScore();
  }, [isClient, getPerformanceScore]);

  return (
    <ErrorBoundary>
      <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
        {/* Header - Using regular header to prevent SSR opacity:0 issue */}
        <header className='bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700'>
          <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
            <div className='flex justify-between items-center py-4'>
              <div className='flex items-center space-x-3'>
                <MotionDiv
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className='w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center'
                >
                  <BookOpen className='w-6 h-6 text-white' />
                </MotionDiv>
                <div>
                  <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>Describe It</h1>
                  <p className='text-sm text-gray-600 dark:text-gray-400'>
                    Spanish Learning with AI
                  </p>
                </div>
              </div>

              <div className='flex items-center space-x-4'>
                {/* Performance indicator */}
                {process.env.NODE_ENV === 'development' && (
                  <div className='hidden md:flex items-center space-x-2 text-sm'>
                    <div
                      className={`w-3 h-3 rounded-full ${
                        performanceScore >= 90
                          ? 'bg-green-500'
                          : performanceScore >= 70
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                      }`}
                    />
                    <span className='text-gray-600 dark:text-gray-400'>
                      Performance: {performanceScore}/100
                    </span>
                  </div>
                )}

                <button
                  onClick={() => {
                    logger.info('Settings button clicked! Current state:', {
                      showSettings: state.showSettings,
                    });
                    setState(prev => {
                      logger.info('Toggling settings from to', {
                        from: prev.showSettings,
                        to: !prev.showSettings,
                      });
                      return { ...prev, showSettings: !prev.showSettings };
                    });
                  }}
                  className='p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors'
                  type='button'
                >
                  <Settings className='w-5 h-5' />
                </button>

                {/* User Menu */}
                <UserMenu />
              </div>
            </div>
          </div>
        </header>

        {/* Navigation Tabs */}
        <nav className='bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700'>
          <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
            <div className='flex space-x-8 overflow-x-auto'>
              {tabConfig.map(tab => {
                const Icon = tab.icon;
                const isActive = state.activeTab === tab.id;

                return (
                  <MotionButton
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id as HomePageState['activeTab'])}
                    className={`
                      flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors
                      ${
                        isActive
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'
                      }
                    `}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Icon className='w-4 h-4' />
                    <span>{tab.label}</span>
                  </MotionButton>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
          <LazyWrapper
            fallback={
              <div className='flex items-center justify-center py-20'>
                <LoadingSpinner size='lg' />
                <span className='ml-3 text-gray-600 dark:text-gray-400'>
                  Loading {tabConfig.find(t => t.id === state.activeTab)?.label}...
                </span>
              </div>
            }
            minHeight='400px'
          >
            <MotionDiv
              key={state.activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {state.activeTab === 'search' && (
                <LazyImageSearch onImageSelect={handleImageSelect} className='space-y-6' />
              )}

              {state.activeTab === 'description' && state.selectedImage && (
                <LazyDescriptionPanel
                  selectedImage={state.selectedImage}
                  selectedStyle={state.selectedStyle}
                  generatedDescriptions={{
                    english:
                      descriptions.find(
                        (d: any) => d.language === 'english' && d.style === state.selectedStyle
                      )?.content || null,
                    spanish:
                      descriptions.find(
                        (d: any) => d.language === 'spanish' && d.style === state.selectedStyle
                      )?.content || null,
                  }}
                  isGenerating={isGenerating}
                  descriptionError={descriptionError}
                  onStyleChange={handleStyleChange}
                  onGenerateDescriptions={handleGenerateDescriptions}
                />
              )}

              {state.activeTab === 'qa' && state.selectedImage && (
                <LazyQAPanel
                  selectedImage={state.selectedImage}
                  descriptionText={
                    descriptions.find(
                      (d: any) => d.language === 'spanish' && d.style === state.selectedStyle
                    )?.content ||
                    descriptions.find(
                      (d: any) => d.language === 'english' && d.style === state.selectedStyle
                    )?.content ||
                    null
                  }
                  style={state.selectedStyle}
                />
              )}

              {state.activeTab === 'phrases' && state.selectedImage && (
                <LazyPhrasesPanel
                  selectedImage={state.selectedImage}
                  descriptionText={
                    descriptions.find(
                      (d: any) => d.language === 'spanish' && d.style === state.selectedStyle
                    )?.content ||
                    descriptions.find(
                      (d: any) => d.language === 'english' && d.style === state.selectedStyle
                    )?.content ||
                    null
                  }
                  style={state.selectedStyle}
                />
              )}

              {/* Empty state for tabs that require an image */}
              {state.activeTab !== 'search' && !state.selectedImage && (
                <MotionDiv
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className='text-center py-20 space-y-4'
                >
                  <div className='text-6xl mb-4'>📸</div>
                  <h3 className='text-xl font-medium text-gray-700 dark:text-gray-300'>
                    No image selected
                  </h3>
                  <p className='text-gray-500 dark:text-gray-400 max-w-md mx-auto'>
                    Search and select an image from the Search tab to get started with{' '}
                    {tabConfig.find(t => t.id === state.activeTab)?.label.toLowerCase()}.
                  </p>
                  <MotionButton
                    onClick={() => handleTabChange('search')}
                    className='px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Go to Search
                  </MotionButton>
                </MotionDiv>
              )}
            </MotionDiv>
          </LazyWrapper>
        </main>

        {/* Performance alerts for development */}
        {process.env.NODE_ENV === 'development' && performanceState.alerts.length > 0 && (
          <div className='fixed bottom-4 right-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md'>
            <h4 className='font-medium text-yellow-800 mb-2'>Performance Alerts</h4>
            <ul className='text-sm text-yellow-700 space-y-1'>
              {performanceState.alerts.slice(-3).map((alert, index) => (
                <li key={index}>• {alert}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Settings Modal */}
        {state.showSettings ? (
          <React.Suspense fallback={<div>Loading settings...</div>}>
            <SettingsModal
              isOpen={true}
              onClose={() => {
                logger.info('[HOMEPAGE] Closing settings modal');
                setState(prev => ({ ...prev, showSettings: false }));
              }}
              darkMode={state.darkMode}
              onToggleDarkMode={() => {
                logger.info('[HOMEPAGE] Toggling dark mode');
                setState(prev => ({ ...prev, darkMode: !prev.darkMode }));
              }}
            />
          </React.Suspense>
        ) : null}
      </div>
    </ErrorBoundary>
  );
};

// Export memoized component with performance optimizations
const HomePage = memo(HomePageBase);
HomePage.displayName = 'HomePage';

// PRODUCTION DEBUGGING: Wrap component with additional error boundary
const HomePageWithDebug: React.FC = () => {
  React.useEffect(() => {
    logger.info('[HOMEPAGE] Debug wrapper mounted');

    // Global error handler for uncaught errors
    const handleError = (event: ErrorEvent) => {
      logger.error('[HOMEPAGE] Uncaught error:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logger.error('[HOMEPAGE] Unhandled promise rejection:', event.reason);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('error', handleError);
      window.addEventListener('unhandledrejection', handleUnhandledRejection);

      return () => {
        window.removeEventListener('error', handleError);
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      };
    }
  }, []);

  try {
    return <HomePage />;
  } catch (error) {
    logger.error('[HOMEPAGE] Component render error:', error);
    throw error; // Re-throw to be caught by error boundary
  }
};

export default HomePageWithDebug;
