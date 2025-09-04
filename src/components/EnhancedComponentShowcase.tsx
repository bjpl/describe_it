'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Brain,
  BookOpen,
  BarChart3,
  Settings,
  Download,
  PlayCircle,
  PauseCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Eye,
  Code,
  Zap,
  Star,
  TrendingUp
} from 'lucide-react';

// Import all enhanced components
import { ImageSearch } from './ImageSearch/ImageSearch';
import { EnhancedQASystem } from './EnhancedQASystem';
import { DatabaseVocabularyManager } from './Vocabulary/DatabaseVocabularyManager';
import EnhancedProgressDashboard from './ProgressTracking/EnhancedProgressDashboard';
import EnhancedSettingsPanel from './Settings/EnhancedSettingsPanel';
import EnhancedExportManager from './Export/EnhancedExportManager';
import { UnsplashImage } from '@/types';

interface ComponentDemo {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  component: React.ComponentType<any>;
  props: any;
  features: string[];
  category: 'search' | 'learning' | 'progress' | 'management';
}

interface EnhancedComponentShowcaseProps {
  className?: string;
}

const EnhancedComponentShowcase: React.FC<EnhancedComponentShowcaseProps> = ({ 
  className = '' 
}) => {
  const [activeDemo, setActiveDemo] = useState<string>('imageSearch');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<UnsplashImage | null>(null);
  const [showCode, setShowCode] = useState(false);

  const componentDemos: ComponentDemo[] = [
    {
      id: 'imageSearch',
      name: 'Enhanced Image Search',
      description: 'Advanced image search with filters, error handling, and real-time updates',
      icon: <Search className="h-5 w-5" />,
      component: ImageSearch,
      props: {
        onImageSelect: (image: UnsplashImage) => {
          setSelectedImage(image);
          console.log('Selected image:', image);
        }
      },
      features: [
        'Unsplash API Integration',
        'Advanced Filtering',
        'Real-time Search',
        'Error Handling',
        'Responsive Grid',
        'Performance Optimized'
      ],
      category: 'search'
    },
    {
      id: 'qaSystem',
      name: 'Advanced Q&A System',
      description: 'Interactive question-answer system with analytics and progress tracking',
      icon: <Brain className="h-5 w-5" />,
      component: EnhancedQASystem,
      props: {
        imageUrl: selectedImage?.urls?.regular || 'https://picsum.photos/800/600?random=1',
        description: 'A beautiful landscape with mountains and trees in the background',
        language: 'es' as const,
        difficulty: 'mixed' as const,
        questionCount: 5,
        timeLimit: 30,
        showHints: true,
        allowSkip: false
      },
      features: [
        'Dynamic Question Generation',
        'Timer & Progress Tracking',
        'Answer Validation',
        'Hint System',
        'Performance Analytics',
        'Session Export'
      ],
      category: 'learning'
    },
    {
      id: 'vocabularyManager',
      name: 'Database Vocabulary Manager',
      description: 'Real-time vocabulary management with database integration',
      icon: <BookOpen className="h-5 w-5" />,
      component: DatabaseVocabularyManager,
      props: {
        showStats: true,
        allowEdit: true,
        compact: false
      },
      features: [
        'Real-time Updates',
        'Database Integration',
        'Advanced Filtering',
        'Bulk Operations',
        'Progress Tracking',
        'Context Sentences'
      ],
      category: 'management'
    },
    {
      id: 'progressDashboard',
      name: 'Progress Dashboard',
      description: 'Comprehensive learning progress visualization with analytics',
      icon: <BarChart3 className="h-5 w-5" />,
      component: EnhancedProgressDashboard,
      props: {
        showDetailedCharts: true
      },
      features: [
        'Interactive Charts',
        'Goal Tracking',
        'Achievement System',
        'Performance Metrics',
        'Weekly/Monthly Views',
        'Export Reports'
      ],
      category: 'progress'
    },
    {
      id: 'settingsPanel',
      name: 'Enhanced Settings Panel',
      description: 'Comprehensive settings with validation and persistence',
      icon: <Settings className="h-5 w-5" />,
      component: EnhancedSettingsPanel,
      props: {},
      features: [
        'API Key Management',
        'Theme Customization',
        'Accessibility Options',
        'Data Export/Import',
        'Validation & Security',
        'Performance Controls'
      ],
      category: 'management'
    },
    {
      id: 'exportManager',
      name: 'Export Manager',
      description: 'Multi-format data export with compression and validation',
      icon: <Download className="h-5 w-5" />,
      component: EnhancedExportManager,
      props: {},
      features: [
        'Multiple Formats',
        'Data Compression',
        'Preview Generation',
        'Batch Export',
        'Format Validation',
        'Progress Tracking'
      ],
      category: 'management'
    }
  ];

  const activeComponent = componentDemos.find(demo => demo.id === activeDemo);
  const Component = activeComponent?.component;

  const handleDemoChange = useCallback((demoId: string) => {
    setActiveDemo(demoId);
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  const toggleCode = useCallback(() => {
    setShowCode(prev => !prev);
  }, []);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'search': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'learning': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'progress': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'management': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const codeExample = `// Enhanced Component Usage Example

import { 
  ImageSearch, 
  EnhancedQASystem, 
  DatabaseVocabularyManager,
  EnhancedProgressDashboard,
  EnhancedSettingsPanel,
  EnhancedExportManager 
} from '@/components';

// Image Search with filters and error handling
<ImageSearch
  onImageSelect={(image) => console.log('Selected:', image)}
  className="w-full max-w-6xl"
/>

// Advanced Q&A System with analytics
<EnhancedQASystem
  imageUrl={selectedImage.urls.regular}
  description={imageDescription}
  language="es"
  difficulty="mixed"
  questionCount={10}
  timeLimit={30}
  showHints={true}
  onSessionComplete={(data) => console.log('Session:', data)}
/>

// Real-time Vocabulary Manager
<DatabaseVocabularyManager
  showStats={true}
  allowEdit={true}
  onVocabularyUpdate={(vocab) => console.log('Updated:', vocab)}
/>

// Progress Dashboard with visualizations
<EnhancedProgressDashboard
  showDetailedCharts={true}
  sessions={learningSessions}
  stats={learningStats}
  goals={learningGoals}
/>

// Settings Panel with validation
<EnhancedSettingsPanel
  onClose={() => setShowSettings(false)}
/>

// Export Manager with multiple formats
<EnhancedExportManager
  data={exportData}
  onClose={() => setShowExport(false)}
/>`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`h-full ${className} ${isFullscreen ? 'fixed inset-0 z-50 bg-white dark:bg-gray-900' : ''}`}
    >
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              Enhanced Component Showcase
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Interactive demonstrations of all enhanced React components
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={toggleCode}
              className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm transition-colors ${
                showCode 
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              <Code className="h-4 w-4" />
              {showCode ? 'Hide Code' : 'Show Code'}
            </button>
            
            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="flex h-full">
        {/* Sidebar - Component List */}
        <div className="w-80 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 overflow-y-auto">
          <div className="p-4">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Components
            </h2>
            
            <div className="space-y-2">
              {componentDemos.map((demo) => (
                <motion.button
                  key={demo.id}
                  onClick={() => handleDemoChange(demo.id)}
                  className={`w-full text-left p-4 rounded-lg transition-all ${
                    activeDemo === demo.id
                      ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-300 border-2 border-blue-200 dark:border-blue-700'
                      : 'bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border-2 border-transparent'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      activeDemo === demo.id 
                        ? 'bg-blue-200 dark:bg-blue-800' 
                        : 'bg-gray-200 dark:bg-gray-600'
                    }`}>
                      {demo.icon}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{demo.name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(demo.category)}`}>
                          {demo.category}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {demo.description}
                      </p>
                      
                      <div className="flex flex-wrap gap-1">
                        {demo.features.slice(0, 3).map((feature) => (
                          <span
                            key={feature}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-300"
                          >
                            {feature}
                          </span>
                        ))}
                        {demo.features.length > 3 && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            +{demo.features.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Stats */}
            <div className="mt-8 p-4 bg-white dark:bg-gray-700 rounded-lg">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Showcase Stats
              </h3>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{componentDemos.length}</div>
                  <div className="text-gray-600 dark:text-gray-400">Components</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {componentDemos.reduce((acc, demo) => acc + demo.features.length, 0)}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">Features</div>
                </div>
              </div>
              
              <div className="mt-4 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <Zap className="h-3 w-3" />
                <span>All components fully enhanced</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          {showCode ? (
            <div className="h-full">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  Usage Examples
                </h3>
              </div>
              
              <div className="p-4 h-full overflow-y-auto">
                <pre className="bg-gray-900 text-gray-100 p-6 rounded-lg overflow-x-auto text-sm">
                  <code>{codeExample}</code>
                </pre>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              {/* Component Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      {activeComponent?.icon}
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                        {activeComponent?.name}
                      </h2>
                      <p className="text-gray-600 dark:text-gray-400">
                        {activeComponent?.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-full text-sm">
                      <Star className="h-3 w-3" />
                      Enhanced
                    </div>
                    
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(activeComponent?.category || '')}`}>
                      {activeComponent?.category}
                    </span>
                  </div>
                </div>
                
                {/* Features */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {activeComponent?.features.map((feature) => (
                    <span
                      key={feature}
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border"
                    >
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {feature}
                    </span>
                  ))}
                </div>
              </div>

              {/* Component Demo */}
              <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeDemo}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="h-full"
                  >
                    {Component && (
                      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 h-full overflow-hidden">
                        <Component {...activeComponent.props} />
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default EnhancedComponentShowcase;