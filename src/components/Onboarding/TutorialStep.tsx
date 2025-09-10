'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Camera, 
  Search, 
  BookOpen, 
  Download,
  Zap,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

interface TutorialStepProps {
  onNext: () => void;
  onPrev?: () => void;
  onSkip?: () => void;
  isLoading?: boolean;
  className?: string;
}

interface TutorialFeature {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  demoComponent: React.ComponentType<any>;
  steps: string[];
  completed?: boolean;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25
    }
  }
};

// Demo Components
const ImageSearchDemo = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
    <div className="flex items-center space-x-2 mb-3">
      <div className="w-4 h-4 bg-red-500 rounded-full"></div>
      <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
      <div className="w-4 h-4 bg-green-500 rounded-full"></div>
    </div>
    <div className="space-y-3">
      <div className="flex items-center space-x-2 p-2 bg-gray-100 dark:bg-gray-700 rounded">
        <Search className="h-4 w-4 text-gray-500" />
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded flex-1 animate-pulse"></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="aspect-square bg-gradient-to-br from-blue-200 to-purple-200 rounded animate-pulse"></div>
        ))}
      </div>
    </div>
  </div>
);

const AIDescriptionDemo = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
    <div className="aspect-video bg-gradient-to-br from-green-200 to-blue-200 rounded-lg mb-3 flex items-center justify-center">
      <Camera className="h-8 w-8 text-gray-600" />
    </div>
    <div className="space-y-2">
      <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-full animate-pulse"></div>
      <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-3/4 animate-pulse"></div>
      <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2 animate-pulse"></div>
    </div>
  </div>
);

const LearningProgressDemo = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
    <div className="flex items-center justify-between mb-4">
      <h4 className="font-medium text-gray-900 dark:text-white">Daily Progress</h4>
      <span className="text-sm text-green-600 dark:text-green-400">7/10</span>
    </div>
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
      <motion.div 
        className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full"
        initial={{ width: 0 }}
        animate={{ width: '70%' }}
        transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
      />
    </div>
    <div className="grid grid-cols-3 gap-2 text-center text-sm">
      <div>
        <div className="font-semibold text-blue-600 dark:text-blue-400">156</div>
        <div className="text-gray-500">Words</div>
      </div>
      <div>
        <div className="font-semibold text-green-600 dark:text-green-400">12</div>
        <div className="text-gray-500">Streak</div>
      </div>
      <div>
        <div className="font-semibold text-purple-600 dark:text-purple-400">89%</div>
        <div className="text-gray-500">Accuracy</div>
      </div>
    </div>
  </div>
);

const ExportDemo = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
    <div className="text-center">
      <div className="w-16 h-20 bg-gradient-to-b from-red-500 to-red-600 rounded-lg mx-auto mb-3 flex items-center justify-center">
        <span className="text-white text-xs font-bold">PDF</span>
      </div>
      <div className="space-y-2">
        <div className="h-2 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
        <div className="h-2 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mx-auto"></div>
      </div>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="mt-3 px-3 py-1 bg-blue-600 text-white text-sm rounded-lg"
      >
        Download
      </motion.button>
    </div>
  </div>
);

export default function TutorialStep({
  onNext,
  onPrev,
  className = ''
}: TutorialStepProps) {
  const [activeFeature, setActiveFeature] = useState(0);
  const [completedFeatures, setCompletedFeatures] = useState<Set<string>>(new Set());
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout>();

  const features: TutorialFeature[] = [
    {
      id: 'image-search',
      title: 'Smart Image Search',
      description: 'Find the perfect images for your vocabulary with AI-powered search',
      icon: Search,
      demoComponent: ImageSearchDemo,
      steps: [
        'Type any word or topic in the search bar',
        'Browse through curated, high-quality images',
        'Click on an image to start learning'
      ]
    },
    {
      id: 'ai-descriptions',
      title: 'AI-Powered Descriptions',
      description: 'Get intelligent, contextual descriptions that help you learn faster',
      icon: Zap,
      demoComponent: AIDescriptionDemo,
      steps: [
        'Select an image that interests you',
        'Choose your preferred description style',
        'Get detailed explanations with vocabulary highlights'
      ]
    },
    {
      id: 'progress-tracking',
      title: 'Learning Progress',
      description: 'Track your journey with detailed analytics and spaced repetition',
      icon: BookOpen,
      demoComponent: LearningProgressDemo,
      steps: [
        'View your daily learning statistics',
        'Monitor your vocabulary growth',
        'Use spaced repetition for better retention'
      ]
    },
    {
      id: 'export-options',
      title: 'Export & Share',
      description: 'Save your learning materials in multiple formats',
      icon: Download,
      demoComponent: ExportDemo,
      steps: [
        'Export your vocabulary as PDF, CSV, or Anki cards',
        'Share your learning progress with others',
        'Backup your data for offline access'
      ]
    }
  ];

  const currentFeature = features[activeFeature];

  // Auto-play functionality
  const startTour = () => {
    setIsPlaying(true);
    intervalRef.current = setInterval(() => {
      setActiveFeature((prev) => {
        const next = (prev + 1) % features.length;
        if (next === 0) {
          setIsPlaying(false);
        }
        return next;
      });
    }, 4000);
  };

  const pauseTour = () => {
    setIsPlaying(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const resetTour = () => {
    setIsPlaying(false);
    setActiveFeature(0);
    setCompletedFeatures(new Set());
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const markFeatureComplete = (featureId: string) => {
    setCompletedFeatures(prev => new Set([...prev, featureId]));
  };

  useEffect(() => {
    // Mark current feature as viewed after 2 seconds
    const timer = setTimeout(() => {
      markFeatureComplete(currentFeature.id);
    }, 2000);

    return () => clearTimeout(timer);
  }, [activeFeature, currentFeature.id]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const allFeaturesCompleted = completedFeatures.size === features.length;

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex-1 p-8 overflow-y-auto"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            variants={itemVariants}
            className="w-16 h-16 mx-auto bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center mb-4"
          >
            <Play className="h-8 w-8 text-white" />
          </motion.div>

          <motion.h2
            variants={itemVariants}
            className="text-2xl font-bold text-gray-900 dark:text-white mb-4"
          >
            Interactive Feature Tour
          </motion.h2>

          <motion.p
            variants={itemVariants}
            className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-6"
          >
            Let's explore the key features that will help you master your target language efficiently.
          </motion.p>

          {/* Tour Controls */}
          <motion.div
            variants={itemVariants}
            className="flex items-center justify-center space-x-3"
          >
            <button
              onClick={isPlaying ? pauseTour : startTour}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              <span>{isPlaying ? 'Pause Tour' : 'Start Auto Tour'}</span>
            </button>
            
            <button
              onClick={resetTour}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Restart</span>
            </button>
          </motion.div>
        </div>

        {/* Feature Navigation */}
        <motion.div
          variants={itemVariants}
          className="flex justify-center mb-8"
        >
          <div className="flex space-x-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
            {features.map((feature, index) => (
              <button
                key={feature.id}
                onClick={() => setActiveFeature(index)}
                className={`
                  relative flex items-center space-x-2 px-4 py-2 rounded-md transition-all
                  ${activeFeature === index
                    ? 'bg-white dark:bg-gray-700 shadow-sm'
                    : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                  }
                `}
              >
                <feature.icon className={`h-4 w-4 ${
                  activeFeature === index ? 'text-blue-600' : 'text-gray-500'
                }`} />
                <span className={`text-sm font-medium ${
                  activeFeature === index ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'
                }`}>
                  {feature.title.split(' ')[0]}
                </span>
                
                {completedFeatures.has(feature.id) && (
                  <CheckCircle2 className="h-3 w-3 text-green-500 absolute -top-1 -right-1" />
                )}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Feature Content */}
        <div className="max-w-5xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeFeature}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="grid lg:grid-cols-2 gap-8 items-center"
            >
              {/* Feature Info */}
              <div className="space-y-6">
                <div>
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <currentFeature.icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {currentFeature.title}
                    </h3>
                  </div>
                  
                  <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed">
                    {currentFeature.description}
                  </p>
                </div>

                {/* Steps */}
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                    How it works:
                  </h4>
                  <div className="space-y-3">
                    {currentFeature.steps.map((step, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 text-sm font-medium">
                          {index + 1}
                        </div>
                        <p className="text-gray-700 dark:text-gray-300">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Progress for this feature */}
                <div className="flex items-center space-x-2">
                  {completedFeatures.has(currentFeature.id) ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <span className="text-green-600 dark:text-green-400 font-medium">
                        Feature explored!
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded-full animate-pulse" />
                      <span className="text-gray-500 dark:text-gray-400">
                        Exploring...
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Demo Component */}
              <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-6">
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-800 rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 text-center">
                    Live Demo Preview
                  </h4>
                  <currentFeature.demoComponent />
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Overall Progress */}
        <motion.div
          variants={itemVariants}
          className="mt-12 max-w-2xl mx-auto"
        >
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-gray-900 dark:text-white">
                Tour Progress
              </h4>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {completedFeatures.size}/{features.length} features explored
              </span>
            </div>
            
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
              <motion.div 
                className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(completedFeatures.size / features.length) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>

            {allFeaturesCompleted && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-green-600 dark:text-green-400 font-medium">
                  Great! You've explored all the key features.
                </p>
                <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
                  Ready to start your learning journey?
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Navigation */}
      <div className="p-6 border-t border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center max-w-5xl mx-auto">
          <button
            onClick={onPrev}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            Previous
          </button>
          
          <div className="flex items-center space-x-4">
            {/* Feature navigation arrows */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActiveFeature(Math.max(0, activeFeature - 1))}
                disabled={activeFeature === 0}
                className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                ←
              </button>
              
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {activeFeature + 1} / {features.length}
              </span>
              
              <button
                onClick={() => setActiveFeature(Math.min(features.length - 1, activeFeature + 1))}
                disabled={activeFeature === features.length - 1}
                className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                →
              </button>
            </div>
            
            <button
              onClick={onNext}
              className="flex items-center space-x-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <span>Continue</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}