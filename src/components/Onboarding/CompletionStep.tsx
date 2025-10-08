'use client';

import React, { useState, useEffect } from 'react';
import { motion, Variants } from 'framer-motion';
import {
  CheckCircle,
  Sparkles,
  Rocket,
  BookOpen,
  Camera,
  TrendingUp,
  Gift,
  ArrowRight,
  Star,
  Users,
  Trophy
} from 'lucide-react';
import useOnboarding from '../../hooks/useOnboarding';
import { authManager } from '../../lib/auth/AuthManager';

interface CompletionStepProps {
  onNext: () => void;
  onPrev?: () => void;
  onSkip?: () => void;
  isLoading?: boolean;
  className?: string;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.8 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 25
    }
  }
};

const confettiVariants: Variants = {
  hidden: { opacity: 0, scale: 0 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 600,
      damping: 20,
      staggerChildren: 0.1
    }
  }
};

const floatAnimation = {
  y: [0, -20, 0],
  transition: {
    duration: 3,
    repeat: Infinity,
    ease: "easeInOut" as const
  }
} as const;

export default function CompletionStep({
  onNext,
  onPrev,
  isLoading,
  className = ''
}: CompletionStepProps) {
  const { completeOnboarding, userData, preferences } = useOnboarding();
  const [showConfetti, setShowConfetti] = useState(false);
  const [completionStats, setCompletionStats] = useState({
    apiKeysSetup: false,
    preferencesConfigured: false,
    tourCompleted: false
  });

  const currentUser = authManager.getCurrentUser();
  const userName = userData.full_name || currentUser?.email?.split('@')[0] || 'there';

  useEffect(() => {
    // Show confetti after component mounts
    const timer = setTimeout(() => {
      setShowConfetti(true);
    }, 500);

    // Calculate completion stats
    setCompletionStats({
      apiKeysSetup: !!(preferences.apiKeys?.unsplash || preferences.apiKeys?.openai),
      preferencesConfigured: !!(preferences.language || preferences.study || preferences.theme),
      tourCompleted: true // They reached this step, so tour is complete
    });

    return () => clearTimeout(timer);
  }, [preferences]);

  const handleComplete = async () => {
    const success = await completeOnboarding();
    if (success) {
      onNext();
    }
  };

  const nextSteps = [
    {
      icon: Camera,
      title: 'Start Learning',
      description: 'Search for your first image and begin describing',
      action: 'Go to Search',
      primary: true
    },
    {
      icon: BookOpen,
      title: 'Explore Vocabulary',
      description: 'Browse pre-made vocabulary lists',
      action: 'Browse Lists'
    },
    {
      icon: TrendingUp,
      title: 'Track Progress',
      description: 'View your learning analytics',
      action: 'View Stats'
    }
  ];

  const achievements = [
    { icon: CheckCircle, label: 'Setup Complete', unlocked: true },
    { icon: Star, label: 'First Timer', unlocked: true },
    { icon: Rocket, label: 'Ready to Learn', unlocked: true },
  ];

  const tips = [
    "💡 Start with familiar topics to build confidence",
    "🎯 Set aside 10-15 minutes daily for consistent progress",
    "🔄 Use spaced repetition to reinforce learning",
    "📱 Enable notifications to stay motivated"
  ];

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex-1 p-8 overflow-y-auto"
      >
        {/* Confetti Animation */}
        {showConfetti && (
          <div className="fixed inset-0 pointer-events-none z-10">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                variants={confettiVariants}
                initial="hidden"
                animate="visible"
                className="absolute"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
              >
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: ['#3B82F6', '#8B5CF6', '#EF4444', '#10B981', '#F59E0B'][Math.floor(Math.random() * 5)]
                  }}
                />
              </motion.div>
            ))}
          </div>
        )}

        {/* Hero Section */}
        <div className="text-center mb-12">
          <motion.div
            variants={itemVariants}
            animate={floatAnimation as any}
            className="mb-6"
          >
            <div className="w-32 h-32 mx-auto bg-gradient-to-br from-green-400 via-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-6 relative">
              <CheckCircle className="h-16 w-16 text-white" />
              <motion.div
                className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center"
                animate={{ rotate: [0, -10, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Sparkles className="h-4 w-4 text-yellow-800" />
              </motion.div>
            </div>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-4xl font-bold text-gray-900 dark:text-white mb-4"
          >
            🎉 Congratulations, {userName}!
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed"
          >
            You&apos;ve successfully set up your personalized learning environment.
            You&apos;re now ready to embark on an exciting language learning journey!
          </motion.p>
        </div>

        {/* Achievement Summary */}
        <motion.div
          variants={itemVariants}
          className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl p-6 mb-8 max-w-3xl mx-auto border border-green-200 dark:border-green-700"
        >
          <div className="flex items-center space-x-3 mb-4">
            <Trophy className="h-6 w-6 text-yellow-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Setup Complete!
            </h3>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4">
            <div className={`flex items-center space-x-2 ${completionStats.apiKeysSetup ? 'text-green-600' : 'text-gray-500'}`}>
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">API Keys {completionStats.apiKeysSetup ? 'Configured' : 'Skipped'}</span>
            </div>
            <div className={`flex items-center space-x-2 ${completionStats.preferencesConfigured ? 'text-green-600' : 'text-gray-500'}`}>
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Preferences Set</span>
            </div>
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Tour Completed</span>
            </div>
          </div>
        </motion.div>

        {/* Unlocked Achievements */}
        <motion.div
          variants={itemVariants}
          className="max-w-2xl mx-auto mb-8"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-center">
            🏆 Achievements Unlocked
          </h3>
          <div className="flex justify-center space-x-4">
            {achievements.map((achievement, index) => (
              <motion.div
                key={achievement.label}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.2 + 1 }}
                className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="w-12 h-12 mx-auto mb-2 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                  <achievement.icon className="h-6 w-6 text-white" />
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {achievement.label}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* What's Next Section */}
        <motion.div
          variants={itemVariants}
          className="max-w-4xl mx-auto mb-8"
        >
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            What&apos;s Next?
          </h3>
          
          <div className="grid md:grid-cols-3 gap-6">
            {nextSteps.map((step, index) => (
              <motion.div
                key={step.title}
                variants={itemVariants}
                whileHover={{ scale: 1.02, y: -2 }}
                className={`
                  p-6 rounded-xl border transition-all duration-200 cursor-pointer
                  ${step.primary 
                    ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white border-transparent shadow-lg' 
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-lg'
                  }
                `}
              >
                <div className={`w-12 h-12 mb-4 rounded-lg flex items-center justify-center ${
                  step.primary 
                    ? 'bg-white/20' 
                    : 'bg-gradient-to-br from-blue-500 to-purple-600'
                }`}>
                  <step.icon className={`h-6 w-6 ${step.primary ? 'text-white' : 'text-white'}`} />
                </div>
                
                <h4 className={`text-lg font-semibold mb-2 ${
                  step.primary ? 'text-white' : 'text-gray-900 dark:text-white'
                }`}>
                  {step.title}
                </h4>
                
                <p className={`mb-4 text-sm ${
                  step.primary ? 'text-blue-100' : 'text-gray-600 dark:text-gray-300'
                }`}>
                  {step.description}
                </p>
                
                <div className={`flex items-center text-sm font-medium ${
                  step.primary ? 'text-white' : 'text-blue-600 dark:text-blue-400'
                }`}>
                  <span>{step.action}</span>
                  <ArrowRight className="h-4 w-4 ml-1" />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Learning Tips */}
        <motion.div
          variants={itemVariants}
          className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 max-w-3xl mx-auto border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center space-x-3 mb-4">
            <Gift className="h-6 w-6 text-purple-600" />
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              Pro Tips for Success
            </h4>
          </div>
          
          <div className="grid md:grid-cols-2 gap-3">
            {tips.map((tip, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 + 2 }}
                className="flex items-start space-x-2 text-gray-700 dark:text-gray-300"
              >
                <span className="text-sm">{tip}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Community & Support */}
        <motion.div
          variants={itemVariants}
          className="text-center mt-8"
        >
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-full border border-blue-200 dark:border-blue-700">
            <Users className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-blue-800 dark:text-blue-200">
              Join our community of 10,000+ language learners
            </span>
          </div>
        </motion.div>
      </motion.div>

      {/* Footer */}
      <div className="p-6 border-t border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center max-w-4xl mx-auto">
          <button
            onClick={onPrev}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            Previous
          </button>
          
          <motion.button
            onClick={handleComplete}
            disabled={isLoading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="
              flex items-center space-x-3 px-8 py-3 bg-gradient-to-r from-green-500 to-blue-600 
              hover:from-green-600 hover:to-blue-700 text-white rounded-xl font-semibold 
              shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            {isLoading ? (
              <>
                <div className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full" />
                <span>Setting up...</span>
              </>
            ) : (
              <>
                <Rocket className="h-5 w-5" />
                <span>Start Learning Journey!</span>
              </>
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
}