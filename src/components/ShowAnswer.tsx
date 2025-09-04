'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Eye, 
  EyeOff, 
  Lightbulb, 
  Volume2, 
  Copy, 
  Check, 
  BookOpen,
  AlertCircle,
  Target
} from 'lucide-react';

interface ShowAnswerProps {
  questionId: string;
  answer: string;
  explanation?: string;
  hints?: string[];
  pronunciation?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  category?: string;
  isRevealed: boolean;
  onReveal: () => void;
  onHide: () => void;
  className?: string;
}

export function ShowAnswer({
  questionId,
  answer,
  explanation,
  hints = [],
  pronunciation,
  difficulty = 'intermediate',
  category,
  isRevealed,
  onReveal,
  onHide,
  className = ''
}: ShowAnswerProps) {
  const [showHints, setShowHints] = useState(false);
  const [copiedAnswer, setCopiedAnswer] = useState(false);

  const handleCopyAnswer = async () => {
    try {
      await navigator.clipboard.writeText(answer);
      setCopiedAnswer(true);
      setTimeout(() => setCopiedAnswer(false), 2000);
    } catch (error) {
      console.error('Failed to copy answer:', error);
    }
  };

  const handleSpeak = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(answer);
      utterance.lang = 'es-ES'; // Spanish pronunciation
      utterance.rate = 0.8; // Slightly slower for learning
      speechSynthesis.speak(utterance);
    }
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'beginner':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'advanced':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryColor = (cat?: string) => {
    if (!cat) return 'bg-gray-100 text-gray-800 border-gray-200';
    
    const colors: Record<string, string> = {
      vocabulary: 'bg-blue-100 text-blue-800 border-blue-200',
      grammar: 'bg-purple-100 text-purple-800 border-purple-200',
      culture: 'bg-orange-100 text-orange-800 border-orange-200',
      conversation: 'bg-green-100 text-green-800 border-green-200',
      listening: 'bg-pink-100 text-pink-800 border-pink-200',
    };
    
    return colors[cat.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Answer & Explanation
              </h3>
            </div>
            
            {/* Badges */}
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getDifficultyColor(difficulty)}`}>
                {difficulty}
              </span>
              
              {category && (
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(category)}`}>
                  {category}
                </span>
              )}
            </div>
          </div>

          {/* Toggle Button */}
          <motion.button
            onClick={isRevealed ? onHide : onReveal}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              isRevealed
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isRevealed ? (
              <>
                <EyeOff className="w-4 h-4" />
                Hide Answer
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                Show Answer
              </>
            )}
          </motion.button>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence>
        {isRevealed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-4">
              {/* Answer Section */}
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800 dark:text-green-300">
                        Correct Answer
                      </span>
                    </div>
                    
                    <p className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
                      {answer}
                    </p>
                    
                    {pronunciation && (
                      <p className="text-sm text-green-700 dark:text-green-300 italic">
                        Pronunciation: {pronunciation}
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <motion.button
                      onClick={handleSpeak}
                      className="p-2 hover:bg-green-100 dark:hover:bg-green-800 rounded-lg transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      title="Listen to pronunciation"
                    >
                      <Volume2 className="w-4 h-4 text-green-600" />
                    </motion.button>

                    <motion.button
                      onClick={handleCopyAnswer}
                      className="p-2 hover:bg-green-100 dark:hover:bg-green-800 rounded-lg transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      title="Copy answer"
                    >
                      {copiedAnswer ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-green-600" />
                      )}
                    </motion.button>
                  </div>
                </div>
              </div>

              {/* Explanation Section */}
              {explanation && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-1">
                        Explanation
                      </h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                        {explanation}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Hints Section */}
              {hints.length > 0 && (
                <div className="space-y-2">
                  <button
                    onClick={() => setShowHints(!showHints)}
                    className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                  >
                    <Lightbulb className="w-4 h-4" />
                    {showHints ? 'Hide Hints' : `Show Hints (${hints.length})`}
                  </button>

                  <AnimatePresence>
                    {showHints && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 space-y-2">
                          {hints.map((hint, index) => (
                            <div key={index} className="flex items-start gap-2">
                              <span className="text-yellow-600 text-sm font-medium">
                                💡
                              </span>
                              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                                {hint}
                              </p>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed State Preview */}
      {!isRevealed && (
        <div className="p-4 bg-gray-50 dark:bg-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center italic">
            Click "Show Answer" to reveal the correct response and explanation
          </p>
        </div>
      )}
    </div>
  );
}