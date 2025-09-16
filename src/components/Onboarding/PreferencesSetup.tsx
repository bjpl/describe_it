'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Globe, 
  Target, 
  Clock, 
  Palette, 
  Volume2, 
  Brain,
  Settings,
  Sun,
  Moon,
  Monitor
} from 'lucide-react';
import useOnboarding from '../../hooks/useOnboarding';
import { authManager } from '../../lib/auth/AuthManager';
import { settingsManager, type AppSettings } from '../../lib/settings/settingsManager';

interface PreferencesSetupProps {
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

export default function PreferencesSetup({
  onNext,
  onPrev,
  className = ''
}: PreferencesSetupProps) {
  const { updatePreferences, updateUserData } = useOnboarding();
  const [preferences, setPreferences] = useState<Partial<AppSettings>>({});
  const [userProfile, setUserProfile] = useState<{
    full_name?: string;
    preferred_language?: string;
    learning_level?: string;
    daily_goal?: number;
  }>({});

  // Load existing preferences
  useEffect(() => {
    const existingSettings = settingsManager.getSettings();
    const currentProfile = authManager.getCurrentProfile();
    
    setPreferences({
      language: existingSettings.language,
      study: existingSettings.study,
      theme: existingSettings.theme,
      accessibility: existingSettings.accessibility
    });

    if (currentProfile) {
      setUserProfile({
        full_name: currentProfile.full_name,
        preferred_language: currentProfile.preferences?.language || 'en',
        learning_level: 'intermediate', // Default if not set
        daily_goal: 10 // Default daily goal
      });
    }
  }, []);

  const handleLanguageChange = (field: string, value: string) => {
    setPreferences(prev => ({
      ...prev,
      language: {
        ...prev.language,
        [field]: value
      }
    }));
  };

  const handleStudyChange = (field: string, value: any) => {
    setPreferences(prev => ({
      ...prev,
      study: {
        ...prev.study,
        [field]: value
      }
    }));
    
    if (field === 'dailyGoal') {
      setUserProfile(prev => ({
        ...prev,
        daily_goal: value
      }));
    }
  };

  const handleThemeChange = (field: string, value: any) => {
    setPreferences(prev => ({
      ...prev,
      theme: {
        ...prev.theme,
        [field]: value
      }
    }));
  };

  const handleAccessibilityChange = (field: string, value: any) => {
    setPreferences(prev => ({
      ...prev,
      accessibility: {
        ...prev.accessibility,
        [field]: value
      }
    }));
  };

  const handleUserProfileChange = (field: string, value: any) => {
    setUserProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    // Save preferences to onboarding state
    updatePreferences(preferences);
    updateUserData(userProfile);
    
    // Apply settings immediately
    settingsManager.updateSettings(preferences);
    
    onNext();
  };

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Spanish', flag: '🇪🇸' },
    { code: 'fr', name: 'French', flag: '🇫🇷' },
    { code: 'de', name: 'German', flag: '🇩🇪' },
    { code: 'it', name: 'Italian', flag: '🇮🇹' },
    { code: 'pt', name: 'Portuguese', flag: '🇵🇹' }
  ];

  const targetLanguages = [
    { value: 'spanish', label: 'Spanish', flag: '🇪🇸' },
    { value: 'french', label: 'French', flag: '🇫🇷' },
    { value: 'german', label: 'German', flag: '🇩🇪' },
    { value: 'italian', label: 'Italian', flag: '🇮🇹' },
    { value: 'portuguese', label: 'Portuguese', flag: '🇵🇹' },
    { value: 'english', label: 'English', flag: '🇺🇸' }
  ];

  const difficultyLevels = [
    { value: 'beginner', label: 'Beginner', description: 'Just starting out', icon: '🌱' },
    { value: 'intermediate', label: 'Intermediate', description: 'Some experience', icon: '🌿' },
    { value: 'advanced', label: 'Advanced', description: 'Confident learner', icon: '🌳' },
    { value: 'expert', label: 'Expert', description: 'Nearly fluent', icon: '🏆' }
  ];

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun, description: 'Clean and bright' },
    { value: 'dark', label: 'Dark', icon: Moon, description: 'Easy on the eyes' },
    { value: 'system', label: 'System', icon: Monitor, description: 'Match device setting' }
  ];

  const fontSizeOptions = [
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium' },
    { value: 'large', label: 'Large' },
    { value: 'xl', label: 'Extra Large' }
  ];

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
            className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mb-4"
          >
            <Settings className="h-8 w-8 text-white" />
          </motion.div>

          <motion.h2
            variants={itemVariants}
            className="text-2xl font-bold text-gray-900 dark:text-white mb-4"
          >
            Customize Your Experience
          </motion.h2>

          <motion.p
            variants={itemVariants}
            className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto"
          >
            Set up your learning preferences to create a personalized experience that works best for you.
          </motion.p>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          {/* User Profile Section */}
          <motion.div
            variants={itemVariants}
            className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center space-x-3 mb-6">
              <Brain className="h-6 w-6 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Learning Profile
              </h3>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={userProfile.full_name || ''}
                  onChange={(e) => handleUserProfileChange('full_name', e.target.value)}
                  placeholder="Enter your name"
                  className="
                    w-full px-4 py-3 border border-gray-300 dark:border-gray-600 
                    rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                    focus:ring-2 focus:ring-purple-500 focus:border-transparent
                    placeholder-gray-500 dark:placeholder-gray-400
                  "
                />
              </div>

              {/* Learning Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Learning Level
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {difficultyLevels.map((level) => (
                    <button
                      key={level.value}
                      onClick={() => handleUserProfileChange('learning_level', level.value)}
                      className={`
                        p-3 text-left border rounded-lg transition-all
                        ${userProfile.learning_level === level.value
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-gray-300 dark:border-gray-600 hover:border-purple-300'
                        }
                      `}
                    >
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-lg">{level.icon}</span>
                        <span className="font-medium text-gray-900 dark:text-white text-sm">
                          {level.label}
                        </span>
                      </div>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {level.description}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Language Settings */}
          <motion.div
            variants={itemVariants}
            className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center space-x-3 mb-6">
              <Globe className="h-6 w-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Language Settings
              </h3>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Interface Language */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Interface Language
                </label>
                <div className="space-y-2">
                  {languages.slice(0, 3).map((lang) => (
                    <label key={lang.code} className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="ui-language"
                        value={lang.code}
                        checked={preferences.language?.ui === lang.code}
                        onChange={(e) => handleLanguageChange('ui', e.target.value)}
                        className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-lg">{lang.flag}</span>
                      <span className="text-gray-900 dark:text-white">{lang.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Target Language */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Language to Learn
                </label>
                <div className="space-y-2">
                  {targetLanguages.slice(0, 3).map((lang) => (
                    <label key={lang.value} className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="target-language"
                        value={lang.value}
                        checked={preferences.language?.target === lang.value}
                        onChange={(e) => handleLanguageChange('target', e.target.value)}
                        className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-lg">{lang.flag}</span>
                      <span className="text-gray-900 dark:text-white">{lang.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Study Preferences */}
          <motion.div
            variants={itemVariants}
            className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center space-x-3 mb-6">
              <Target className="h-6 w-6 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Study Goals
              </h3>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Daily Goal */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Daily Learning Goal
                </label>
                <div className="space-y-3">
                  {[5, 10, 20, 30].map((goal) => (
                    <label key={goal} className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="daily-goal"
                        value={goal}
                        checked={preferences.study?.dailyGoal === goal}
                        onChange={(e) => handleStudyChange('dailyGoal', parseInt(e.target.value))}
                        className="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500"
                      />
                      <span className="text-gray-900 dark:text-white">
                        {goal} images per day
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Difficulty */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Content Difficulty
                </label>
                <div className="space-y-3">
                  {['beginner', 'intermediate', 'advanced'].map((level) => (
                    <label key={level} className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="difficulty"
                        value={level}
                        checked={preferences.study?.difficulty === level}
                        onChange={(e) => handleStudyChange('difficulty', e.target.value)}
                        className="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500"
                      />
                      <span className="text-gray-900 dark:text-white capitalize">
                        {level}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Theme & Accessibility */}
          <motion.div
            variants={itemVariants}
            className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center space-x-3 mb-6">
              <Palette className="h-6 w-6 text-pink-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Appearance & Accessibility
              </h3>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Theme */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Color Theme
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {themeOptions.map((theme) => (
                    <button
                      key={theme.value}
                      onClick={() => handleThemeChange('mode', theme.value)}
                      className={`
                        p-3 text-center border rounded-lg transition-all
                        ${preferences.theme?.mode === theme.value
                          ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20'
                          : 'border-gray-300 dark:border-gray-600 hover:border-pink-300'
                        }
                      `}
                    >
                      <theme.icon className="h-6 w-6 mx-auto mb-2 text-gray-600 dark:text-gray-400" />
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {theme.label}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {theme.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Font Size
                </label>
                <div className="space-y-2">
                  {fontSizeOptions.map((size) => (
                    <label key={size.value} className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="font-size"
                        value={size.value}
                        checked={preferences.accessibility?.fontSize === size.value}
                        onChange={(e) => handleAccessibilityChange('fontSize', e.target.value)}
                        className="h-4 w-4 text-pink-600 border-gray-300 focus:ring-pink-500"
                      />
                      <span className="text-gray-900 dark:text-white">{size.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Additional Options */}
            <div className="mt-6 space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.theme?.animations !== false}
                  onChange={(e) => handleThemeChange('animations', e.target.checked)}
                  className="h-4 w-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
                />
                <span className="text-gray-900 dark:text-white">Enable animations</span>
              </label>
              
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.accessibility?.keyboardNavigation !== false}
                  onChange={(e) => handleAccessibilityChange('keyboardNavigation', e.target.checked)}
                  className="h-4 w-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
                />
                <span className="text-gray-900 dark:text-white">Keyboard navigation support</span>
              </label>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Custom Footer */}
      <div className="p-6 border-t border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center max-w-4xl mx-auto">
          <button
            onClick={onPrev}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            Previous
          </button>
          
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}