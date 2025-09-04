'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

interface QuestionNavigatorProps {
  currentIndex: number;
  totalQuestions: number;
  onPrevious: () => void;
  onNext: () => void;
  onGoToQuestion: (index: number) => void;
  onReset?: () => void;
  answeredQuestions: boolean[];
  correctAnswers: boolean[];
  disabled?: boolean;
}

export const QuestionNavigator: React.FC<QuestionNavigatorProps> = ({
  currentIndex,
  totalQuestions,
  onPrevious,
  onNext,
  onGoToQuestion,
  onReset,
  answeredQuestions,
  correctAnswers,
  disabled = false
}) => {
  const canGoPrevious = currentIndex > 0 && !disabled;
  const canGoNext = currentIndex < totalQuestions - 1 && !disabled;
  const progress = ((currentIndex + 1) / totalQuestions) * 100;

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Question Indicator Dots */}
      <div className="flex items-center justify-center space-x-2 py-2">
        {Array.from({ length: totalQuestions }).map((_, index) => {
          const isCurrent = index === currentIndex;
          const isAnswered = answeredQuestions[index];
          const isCorrect = correctAnswers[index];
          
          let dotClass = 'w-3 h-3 rounded-full transition-all duration-200 cursor-pointer ';
          
          if (disabled && !isCurrent) {
            dotClass += 'cursor-not-allowed opacity-50 ';
          }
          
          if (isCurrent) {
            dotClass += 'w-4 h-4 bg-blue-600 ring-2 ring-blue-300 scale-110';
          } else if (isAnswered) {
            dotClass += isCorrect 
              ? 'bg-green-500 hover:bg-green-600' 
              : 'bg-red-500 hover:bg-red-600';
          } else {
            dotClass += 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500';
          }

          return (
            <button
              key={index}
              onClick={() => !disabled && onGoToQuestion(index)}
              className={dotClass}
              disabled={disabled}
              title={`Question ${index + 1}${isAnswered ? (isCorrect ? ' - Correct' : ' - Incorrect') : ' - Not answered'}`}
              aria-label={`Go to question ${index + 1}`}
            />
          );
        })}
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between">
        <button
          onClick={onPrevious}
          disabled={!canGoPrevious}
          className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          aria-label="Previous question"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Previous</span>
        </button>

        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            Question {currentIndex + 1} of {totalQuestions}
          </span>
          
          {onReset && (
            <button
              onClick={onReset}
              disabled={disabled}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Reset all answers"
              aria-label="Reset quiz"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
        </div>

        <button
          onClick={onNext}
          disabled={!canGoNext}
          className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          aria-label="Next question"
        >
          <span>Next</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Quick Navigation Grid for Multiple Questions */}
      {totalQuestions > 5 && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-center text-sm">
            Quick Navigation
          </h3>
          <div className="grid grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-2">
            {Array.from({ length: totalQuestions }).map((_, index) => {
              const isAnswered = answeredQuestions[index];
              const isCurrent = index === currentIndex;
              const isCorrect = correctAnswers[index];
              
              let buttonClass = 'w-8 h-8 rounded-lg text-xs font-medium transition-all duration-200 flex items-center justify-center ';
              
              if (disabled && !isCurrent) {
                buttonClass += 'cursor-not-allowed opacity-50 ';
              } else {
                buttonClass += 'cursor-pointer ';
              }
              
              if (isCurrent) {
                buttonClass += 'bg-blue-600 text-white ring-2 ring-blue-300 scale-105';
              } else if (isAnswered) {
                buttonClass += isCorrect 
                  ? 'bg-green-500 text-white hover:bg-green-600' 
                  : 'bg-red-500 text-white hover:bg-red-600';
              } else {
                buttonClass += 'bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20';
              }
              
              return (
                <button
                  key={index}
                  onClick={() => !disabled && onGoToQuestion(index)}
                  className={buttonClass}
                  disabled={disabled}
                  title={`Question ${index + 1}${isAnswered ? (isCorrect ? ' - Correct' : ' - Incorrect') : ' - Not answered'}`}
                  aria-label={`Go to question ${index + 1}`}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionNavigator;