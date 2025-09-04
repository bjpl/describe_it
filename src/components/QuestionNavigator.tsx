'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

interface QuestionNavigatorProps {
  currentIndex: number;
  totalQuestions: number;
  onPrevious: () => void;
  onNext: () => void;
  onGoToQuestion: (index: number) => void;
  onReset: () => void;
  answeredQuestions: Set<number>;
  correctAnswers: Set<number>;
  className?: string;
}

export function QuestionNavigator({
  currentIndex,
  totalQuestions,
  onPrevious,
  onNext,
  onGoToQuestion,
  onReset,
  answeredQuestions,
  correctAnswers,
  className = ''
}: QuestionNavigatorProps) {
  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < totalQuestions - 1;

  const getQuestionStatus = (index: number) => {
    if (!answeredQuestions.has(index)) return 'unanswered';
    return correctAnswers.has(index) ? 'correct' : 'incorrect';
  };

  const getStatusColor = (status: string, isCurrent: boolean) => {
    if (isCurrent) {
      return 'bg-blue-600 text-white border-blue-600';
    }
    
    switch (status) {
      case 'correct':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'incorrect':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200';
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Question Navigation
        </h3>
        
        <motion.button
          onClick={onReset}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <RefreshCw className="w-4 h-4" />
          Reset
        </motion.button>
      </div>

      {/* Question Grid */}
      <div className="grid grid-cols-5 gap-2 mb-4">
        {Array.from({ length: totalQuestions }, (_, index) => {
          const status = getQuestionStatus(index);
          const isCurrent = index === currentIndex;
          
          return (
            <motion.button
              key={index}
              onClick={() => onGoToQuestion(index)}
              className={`relative w-10 h-10 rounded-lg border-2 text-sm font-medium transition-all duration-200 ${getStatusColor(status, isCurrent)}`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {index + 1}
              
              {/* Status indicator */}
              {answeredQuestions.has(index) && (
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center">
                  {correctAnswers.has(index) ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between">
        <motion.button
          onClick={onPrevious}
          disabled={!canGoPrevious}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            canGoPrevious
              ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300'
              : 'bg-gray-50 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600'
          }`}
          whileHover={canGoPrevious ? { scale: 1.05 } : {}}
          whileTap={canGoPrevious ? { scale: 0.95 } : {}}
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </motion.button>

        <div className="text-sm text-gray-600 dark:text-gray-400">
          Question {currentIndex + 1} of {totalQuestions}
        </div>

        <motion.button
          onClick={onNext}
          disabled={!canGoNext}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            canGoNext
              ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300'
              : 'bg-gray-50 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600'
          }`}
          whileHover={canGoNext ? { scale: 1.05 } : {}}
          whileTap={canGoNext ? { scale: 0.95 } : {}}
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Progress Summary */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {answeredQuestions.size}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Answered
            </div>
          </div>
          
          <div>
            <div className="text-lg font-semibold text-green-600">
              {correctAnswers.size}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Correct
            </div>
          </div>
          
          <div>
            <div className="text-lg font-semibold text-red-600">
              {answeredQuestions.size - correctAnswers.size}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Incorrect
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}