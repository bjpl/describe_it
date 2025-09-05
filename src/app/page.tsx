'use client';

import React, { useState, useCallback, memo, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Search, Settings, Download, BarChart3, BookOpen, MessageCircle, Brain } from 'lucide-react';
import { LazyWrapper, preloadCriticalComponents } from '@/components/LazyComponents';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { useDescriptions } from '@/hooks/useDescriptions';
import { LoadingSpinner } from '@/components/Loading/LoadingSpinner';
import { ErrorBoundary } from '@/providers/ErrorBoundary';
import { DescriptionStyle } from '@/types';

// Lazy load main application components
const LazyImageSearch = React.lazy(() => import('@/components/ImageSearch/ImageSearch').then(module => ({
  default: module.ImageSearch
})));

const LazyDescriptionPanel = React.lazy(() => import('@/components/DescriptionPanel').then(module => ({
  default: module.DescriptionPanel
})));
const LazyQAPanel = React.lazy(() => import('@/components/QAPanel'));
const LazyPhrasesPanel = React.lazy(() => import('@/components/PhrasesPanel'));

interface HomePageState {
  activeTab: 'search' | 'description' | 'qa' | 'phrases';
  selectedImage: any;
  searchQuery: string;
  showSettings: boolean;
  selectedStyle: DescriptionStyle;
}

const HomePageBase: React.FC = () => {
  const { trackRenderStart, trackRenderEnd, performanceState, getPerformanceScore } = usePerformanceMonitor('HomePage');
  
  // Track component render performance
  React.useEffect(() => {
    trackRenderStart();
    return () => {
      trackRenderEnd();
    };
  }, [trackRenderStart, trackRenderEnd]);

  const [state, setState] = useState<HomePageState>({
    activeTab: 'search',
    selectedImage: null,
    searchQuery: '',
    showSettings: false,
    selectedStyle: 'narrativo' as DescriptionStyle
  });

  // Use the descriptions hook for generating descriptions
  const {
    descriptions,
    isLoading: isGenerating,
    error: descriptionError,
    generateDescription
  } = useDescriptions(state.selectedImage?.urls?.regular || state.selectedImage?.url || '');

  // Memoized callbacks to prevent unnecessary re-renders
  const handleTabChange = useCallback((tab: HomePageState['activeTab']) => {
    setState(prev => ({ ...prev, activeTab: tab }));
  }, []);

  const handleImageSelect = useCallback((image: any) => {
    setState(prev => ({ 
      ...prev, 
      selectedImage: image,
      activeTab: 'description'
    }));
  }, []);

  const handleSearchQueryChange = useCallback((query: string) => {
    setState(prev => ({ ...prev, searchQuery: query }));
  }, []);

  const toggleSettings = useCallback(() => {
    setState(prev => ({ ...prev, showSettings: !prev.showSettings }));
  }, []);

  const handleStyleChange = useCallback((style: DescriptionStyle) => {
    setState(prev => ({ ...prev, selectedStyle: style }));
  }, []);

  const handleGenerateDescriptions = useCallback(() => {
    if (state.selectedImage && state.selectedStyle) {
      generateDescription({
        imageUrl: state.selectedImage.urls?.regular || state.selectedImage.url,
        style: state.selectedStyle
      });
    }
  }, [state.selectedImage, state.selectedStyle, generateDescription]);

  // Pre-load components when user starts interacting
  React.useEffect(() => {
    preloadCriticalComponents();
  }, []);

  const tabConfig = React.useMemo(() => [
    { id: 'search', label: 'Search Images', icon: Search, component: LazyImageSearch },
    { id: 'description', label: 'Descriptions', icon: BookOpen, component: LazyDescriptionPanel },
    { id: 'qa', label: 'Q&A Practice', icon: MessageCircle, component: LazyQAPanel },
    { id: 'phrases', label: 'Vocabulary', icon: Brain, component: LazyPhrasesPanel },
  ], []);

  const ActiveComponent = React.useMemo(() => {
    const config = tabConfig.find(tab => tab.id === state.activeTab);
    return config?.component || LazyImageSearch;
  }, [state.activeTab, tabConfig]);

  const performanceScore = React.useMemo(() => {
    return getPerformanceScore();
  }, [getPerformanceScore]);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-3">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center"
                >
                  <BookOpen className="w-6 h-6 text-white" />
                </motion.div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Describe It
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Spanish Learning with AI
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Performance indicator */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="hidden md:flex items-center space-x-2 text-sm">
                    <div className={`w-3 h-3 rounded-full ${
                      performanceScore >= 90 ? 'bg-green-500' :
                      performanceScore >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                    }`} />
                    <span className="text-gray-600 dark:text-gray-400">
                      Performance: {performanceScore}/100
                    </span>
                  </div>
                )}
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleSettings}
                  className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                >
                  <Settings className="w-5 h-5" />
                </motion.button>
              </div>
            </div>
          </div>
        </motion.header>

        {/* Navigation Tabs */}
        <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-8 overflow-x-auto">
              {tabConfig.map((tab) => {
                const Icon = tab.icon;
                const isActive = state.activeTab === tab.id;
                
                return (
                  <motion.button
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
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <LazyWrapper
            fallback={
              <div className="flex items-center justify-center py-20">
                <LoadingSpinner size="lg" />
                <span className="ml-3 text-gray-600 dark:text-gray-400">
                  Loading {tabConfig.find(t => t.id === state.activeTab)?.label}...
                </span>
              </div>
            }
            minHeight="400px"
          >
            <motion.div
              key={state.activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {state.activeTab === 'search' && (
                <LazyImageSearch 
                  onImageSelect={handleImageSelect}
                  className="space-y-6"
                />
              )}
              
              {state.activeTab === 'description' && state.selectedImage && (
                <LazyDescriptionPanel
                  selectedImage={state.selectedImage}
                  selectedStyle={state.selectedStyle}
                  generatedDescriptions={{
                    english: descriptions.find((d: any) => 
                      d.language === 'english' && 
                      d.style === state.selectedStyle
                    )?.content || null,
                    spanish: descriptions.find((d: any) => 
                      d.language === 'spanish' && 
                      d.style === state.selectedStyle
                    )?.content || null
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
                  descriptionText={null}
                  style="narrativo"
                />
              )}
              
              {state.activeTab === 'phrases' && state.selectedImage && (
                <LazyPhrasesPanel
                  selectedImage={state.selectedImage}
                  descriptionText={null}
                  style="narrativo"
                />
              )}
              
              {/* Empty state for tabs that require an image */}
              {(state.activeTab !== 'search' && !state.selectedImage) && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-20 space-y-4"
                >
                  <div className="text-6xl mb-4">📸</div>
                  <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300">
                    No image selected
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                    Search and select an image from the Search tab to get started with {tabConfig.find(t => t.id === state.activeTab)?.label.toLowerCase()}.
                  </p>
                  <motion.button
                    onClick={() => handleTabChange('search')}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Go to Search
                  </motion.button>
                </motion.div>
              )}
            </motion.div>
          </LazyWrapper>
        </main>

        {/* Performance alerts for development */}
        {process.env.NODE_ENV === 'development' && performanceState.alerts.length > 0 && (
          <div className="fixed bottom-4 right-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md">
            <h4 className="font-medium text-yellow-800 mb-2">Performance Alerts</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              {performanceState.alerts.slice(-3).map((alert, index) => (
                <li key={index}>• {alert}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

// Export memoized component with performance optimizations
const HomePage = memo(HomePageBase);
HomePage.displayName = 'HomePage';

export default HomePage;