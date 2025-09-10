'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Camera, Brain, Sparkles } from 'lucide-react';

interface WelcomeStepProps {
  onNext: () => void;
  onPrev?: () => void;
  onSkip?: () => void;
  isLoading?: boolean;
  className?: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
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

const floatingAnimation = {
  y: [0, -10, 0],
  transition: {
    duration: 3,
    repeat: Infinity,
    ease: "easeInOut"
  }
};

export default function WelcomeStep({
  onNext,
  className = ''
}: WelcomeStepProps) {
  const features = [
    {
      icon: Camera,
      title: 'Visual Learning',
      description: 'Learn with beautiful images that make vocabulary memorable'
    },
    {
      icon: Brain,
      title: 'Smart AI Descriptions',
      description: 'Get intelligent, context-aware descriptions powered by AI'
    },
    {
      icon: BookOpen,
      title: 'Spaced Repetition',
      description: 'Optimize your learning with scientifically proven techniques'
    },
    {
      icon: Sparkles,
      title: 'Personalized Journey',
      description: 'Customize your experience to match your learning style'
    }
  ];

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex-1 p-8 overflow-y-auto"
      >
        {/* Hero Section */}
        <div className="text-center mb-12">
          <motion.div
            variants={itemVariants}
            animate={floatingAnimation}
            className="mb-6"
          >
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
              <BookOpen className="h-12 w-12 text-white" />
            </div>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-4xl font-bold text-gray-900 dark:text-white mb-4"
          >
            Welcome to <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Describe It!</span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed"
          >
            Transform your language learning with AI-powered visual descriptions. 
            Let's set up your personalized learning environment in just a few steps.
          </motion.p>
        </div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-8"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              whileHover={{ scale: 1.02, y: -2 }}
              className="
                p-6 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 
                dark:border-gray-700 hover:shadow-lg transition-all duration-200
              "
            >
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Getting Started Info */}
        <motion.div
          variants={itemVariants}
          className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-6 max-w-2xl mx-auto"
        >
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
            </div>
            <div>
              <h4 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-2">
                What's Next?
              </h4>
              <p className="text-blue-800 dark:text-blue-200 mb-4 leading-relaxed">
                We'll guide you through setting up your API keys (optional), configuring your learning preferences, 
                and taking a quick tour of the key features. The entire process takes just 2-3 minutes!
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100 text-sm rounded-md">
                  API Setup
                </span>
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100 text-sm rounded-md">
                  Learning Preferences
                </span>
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100 text-sm rounded-md">
                  Feature Tour
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats or Testimonial */}
        <motion.div
          variants={itemVariants}
          className="text-center mt-12"
        >
          <div className="flex justify-center items-center space-x-8 text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">10K+</div>
              <div className="text-sm">Active Learners</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">95%</div>
              <div className="text-sm">Retention Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">50M+</div>
              <div className="text-sm">Images Described</div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}