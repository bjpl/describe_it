'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Key, ExternalLink, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import useOnboarding from '../../hooks/useOnboarding';
import { authManager } from '../../lib/auth/AuthManager';
import { settingsManager } from '../../lib/settings/settingsManager';

interface ApiKeySetupProps {
  onNext: () => void;
  onPrev?: () => void;
  onSkip?: () => void;
  isLoading?: boolean;
  className?: string;
}

interface ApiKeyState {
  unsplash: string;
  openai: string;
}

interface ValidationState {
  unsplash: 'idle' | 'validating' | 'valid' | 'invalid';
  openai: 'idle' | 'validating' | 'valid' | 'invalid';
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

export default function ApiKeySetup({
  onNext,
  onPrev,
  onSkip,
  className = ''
}: ApiKeySetupProps) {
  const { updatePreferences } = useOnboarding();
  const [apiKeys, setApiKeys] = useState<ApiKeyState>({ unsplash: '', openai: '' });
  const [showKeys, setShowKeys] = useState({ unsplash: false, openai: false });
  const [validation, setValidation] = useState<ValidationState>({ unsplash: 'idle', openai: 'idle' });
  const [saveToAccount, setSaveToAccount] = useState(true);

  // Load existing API keys if available
  useEffect(() => {
    const loadExistingKeys = async () => {
      const currentUser = authManager.getCurrentUser();
      
      if (currentUser) {
        const existingKeys = await authManager.getApiKeys();
        if (existingKeys) {
          setApiKeys({
            unsplash: existingKeys.unsplash || '',
            openai: existingKeys.openai || ''
          });
        }
      } else {
        // Load from local settings
        const settings = settingsManager.getSettings();
        setApiKeys({
          unsplash: settings.apiKeys.unsplash || '',
          openai: settings.apiKeys.openai || ''
        });
      }
    };

    loadExistingKeys();
  }, []);

  const validateUnsplashKey = async (key: string): Promise<boolean> => {
    if (!key.trim()) return false;
    
    // Basic format validation for Unsplash keys
    const keyPattern = /^[a-zA-Z0-9_-]{20,}$/;
    return keyPattern.test(key.trim());
  };

  const validateOpenAIKey = async (key: string): Promise<boolean> => {
    if (!key.trim()) return false;
    
    // Basic format validation for OpenAI keys
    const keyPattern = /^sk-[a-zA-Z0-9]{48,}$/;
    return keyPattern.test(key.trim());
  };

  const handleKeyChange = async (type: keyof ApiKeyState, value: string) => {
    setApiKeys(prev => ({ ...prev, [type]: value }));
    
    if (value.trim()) {
      setValidation(prev => ({ ...prev, [type]: 'validating' }));
      
      try {
        let isValid = false;
        if (type === 'unsplash') {
          isValid = await validateUnsplashKey(value);
        } else if (type === 'openai') {
          isValid = await validateOpenAIKey(value);
        }
        
        setValidation(prev => ({ 
          ...prev, 
          [type]: isValid ? 'valid' : 'invalid' 
        }));
      } catch (error) {
        setValidation(prev => ({ ...prev, [type]: 'invalid' }));
      }
    } else {
      setValidation(prev => ({ ...prev, [type]: 'idle' }));
    }
  };

  const handleSave = async () => {
    const hasKeys = apiKeys.unsplash.trim() || apiKeys.openai.trim();
    
    if (hasKeys) {
      const keysToSave = {
        unsplash: apiKeys.unsplash.trim(),
        openai: apiKeys.openai.trim()
      };

      if (saveToAccount && authManager.getCurrentUser()) {
        // Save to user account
        await authManager.saveApiKeys(keysToSave);
      } else {
        // Save to local settings
        updatePreferences({
          apiKeys: keysToSave
        });
        settingsManager.updateSection('apiKeys', keysToSave);
      }
    }

    onNext();
  };

  const getValidationIcon = (state: ValidationState[keyof ValidationState]) => {
    switch (state) {
      case 'validating':
        return <div className="animate-spin h-4 w-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full" />;
      case 'valid':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'invalid':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const apiKeyFields = [
    {
      key: 'unsplash' as keyof ApiKeyState,
      title: 'Unsplash API Key',
      description: 'Access high-quality images for visual learning',
      placeholder: 'Enter your Unsplash API key...',
      helpUrl: 'https://unsplash.com/developers',
      required: false,
      benefits: ['High-quality stock photos', 'Diverse image categories', 'Educational content']
    },
    {
      key: 'openai' as keyof ApiKeyState,
      title: 'OpenAI API Key',
      description: 'Enable advanced AI descriptions and analysis',
      placeholder: 'sk-...',
      helpUrl: 'https://platform.openai.com/api-keys',
      required: false,
      benefits: ['Advanced AI descriptions', 'Context-aware explanations', 'Personalized content']
    }
  ];

  const isCurrentUserLoggedIn = authManager.getCurrentUser() !== null;

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
            className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4"
          >
            <Key className="h-8 w-8 text-white" />
          </motion.div>

          <motion.h2
            variants={itemVariants}
            className="text-2xl font-bold text-gray-900 dark:text-white mb-4"
          >
            Set Up Your API Keys
          </motion.h2>

          <motion.p
            variants={itemVariants}
            className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto"
          >
            Connect your API keys to unlock enhanced features. Don't worry - this step is optional 
            and you can always add them later in settings.
          </motion.p>
        </div>

        {/* Security Notice */}
        <motion.div
          variants={itemVariants}
          className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-8 max-w-2xl mx-auto"
        >
          <div className="flex items-start space-x-3">
            <Shield className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                Your Keys Are Secure
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                API keys are encrypted and stored securely. They're only used to enhance your learning experience 
                and are never shared with third parties.
              </p>
            </div>
          </div>
        </motion.div>

        {/* API Key Fields */}
        <div className="space-y-6 max-w-2xl mx-auto">
          {apiKeyFields.map((field) => (
            <motion.div
              key={field.key}
              variants={itemVariants}
              className="space-y-4"
            >
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                      {field.title}
                      {!field.required && (
                        <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                          (Optional)
                        </span>
                      )}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                      {field.description}
                    </p>
                  </div>
                  <a
                    href={field.helpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm transition-colors"
                  >
                    <span>Get Key</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                {/* Benefits */}
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Benefits:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {field.benefits.map((benefit, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded-md"
                      >
                        {benefit}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Input Field */}
                <div className="relative">
                  <input
                    type={showKeys[field.key] ? 'text' : 'password'}
                    value={apiKeys[field.key]}
                    onChange={(e) => handleKeyChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="
                      w-full px-4 py-3 pr-20 border border-gray-300 dark:border-gray-600 
                      rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                      focus:ring-2 focus:ring-blue-500 focus:border-transparent
                      placeholder-gray-500 dark:placeholder-gray-400
                      transition-all duration-200
                    "
                  />
                  
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                    {getValidationIcon(validation[field.key])}
                    
                    <button
                      type="button"
                      onClick={() => setShowKeys(prev => ({ 
                        ...prev, 
                        [field.key]: !prev[field.key] 
                      }))}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      {showKeys[field.key] ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Validation Message */}
                {validation[field.key] === 'invalid' && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                    Please enter a valid {field.title.toLowerCase()}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Save Options */}
        {isCurrentUserLoggedIn && (
          <motion.div
            variants={itemVariants}
            className="max-w-2xl mx-auto mt-6"
          >
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={saveToAccount}
                onChange={(e) => setSaveToAccount(e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Save API keys to my account (recommended for sync across devices)
              </span>
            </label>
          </motion.div>
        )}

        {/* Skip Info */}
        <motion.div
          variants={itemVariants}
          className="text-center mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg max-w-2xl mx-auto"
        >
          <p className="text-sm text-gray-600 dark:text-gray-300">
            <strong>Don't have API keys?</strong> No problem! You can still use the app with demo content 
            and add your keys later from the settings page.
          </p>
        </motion.div>
      </motion.div>

      {/* Custom Footer for this step */}
      <div className="p-6 border-t border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center max-w-2xl mx-auto">
          <button
            onClick={onPrev}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            Previous
          </button>
          
          <div className="flex space-x-3">
            {onSkip && (
              <button
                onClick={onSkip}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                Skip for Now
              </button>
            )}
            
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}