'use client';

import React from 'react';
import { TrendingUp, Target, Clock, CheckCircle, XCircle, Award } from 'lucide-react';

interface QuestionCounterProps {
  currentIndex: number;
  totalQuestions: number;
  answeredCount: number;
  correctCount: number;
  timeSpent?: number; // in seconds
  averageTime?: number; // in seconds
  streak?: number; // current correct streak
  sessionScore?: {
    percentage: number;
    grade: string;
  };
  showDetails?: boolean;
}

export const QuestionCounter: React.FC<QuestionCounterProps> = ({
  currentIndex,
  totalQuestions,
  answeredCount,
  correctCount,
  timeSpent = 0,
  averageTime = 0,
  streak = 0,
  sessionScore,
  showDetails = true
}) => {
  const progress = ((currentIndex + 1) / totalQuestions) * 100;
  const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
  const incorrectCount = answeredCount - correctCount;
  const remainingCount = totalQuestions - (currentIndex + 1);

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getGradeColor = (grade?: string) => {
    switch (grade) {
      case 'A+':
      case 'A': return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      case 'B+':
      case 'B': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20';
      case 'C+':
      case 'C': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case 'D':
      case 'F': return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  const getStreakMessage = (streakCount: number) => {
    if (streakCount >= 5) return 'On fire! 🔥';
    if (streakCount >= 3) return 'Great streak! ⭐';
    if (streakCount >= 2) return 'Good job! ✨';
    return null;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Question Progress
          </h3>
          {sessionScore && (
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getGradeColor(sessionScore.grade)}`}>
              {sessionScore.grade} ({sessionScore.percentage}%)
            </span>
          )}
        </div>

        {/* Current Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              Question {currentIndex + 1} of {totalQuestions}
            </span>
            <span className="text-gray-600 dark:text-gray-400">
              {progress.toFixed(1)}% complete
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Answered */}
          <div className="text-center">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg mx-auto mb-2">
              <Target className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {answeredCount}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Answered
            </div>
          </div>

          {/* Correct */}
          <div className="text-center">
            <div className="flex items-center justify-center w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg mx-auto mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-600">
              {correctCount}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Correct
            </div>
          </div>

          {/* Incorrect */}
          <div className="text-center">
            <div className="flex items-center justify-center w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-lg mx-auto mb-2">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div className="text-2xl font-bold text-red-600">
              {incorrectCount}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Incorrect
            </div>
          </div>

          {/* Accuracy */}
          <div className="text-center">
            <div className="flex items-center justify-center w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg mx-auto mb-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-purple-600">
              {accuracy}%
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Accuracy
            </div>
          </div>
        </div>

        {/* Additional Details */}
        {showDetails && (
          <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            {/* Time Stats */}
            {(timeSpent > 0 || averageTime > 0) && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600 dark:text-gray-400">Time</span>
                </div>
                <div className="text-right">
                  {timeSpent > 0 && (
                    <div className="text-gray-900 dark:text-gray-100">
                      Total: {formatTime(timeSpent)}
                    </div>
                  )}
                  {averageTime > 0 && (
                    <div className="text-gray-500 dark:text-gray-400 text-xs">
                      Avg: {formatTime(Math.round(averageTime))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Streak */}
            {streak > 0 && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <Award className="h-4 w-4 text-orange-500" />
                  <span className="text-gray-600 dark:text-gray-400">Streak</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-orange-600 font-medium">
                    {streak} correct
                  </span>
                  {getStreakMessage(streak) && (
                    <span className="text-xs">{getStreakMessage(streak)}</span>
                  )}
                </div>
              </div>
            )}

            {/* Remaining */}
            {remainingCount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  Remaining
                </span>
                <span className="text-gray-900 dark:text-gray-100">
                  {remainingCount} question{remainingCount !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Motivational Message */}
        {answeredCount > 0 && (
          <div className="text-center pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {accuracy >= 80 ? (
                <span className="text-green-600">Excellent work! Keep it up! 🌟</span>
              ) : accuracy >= 60 ? (
                <span className="text-blue-600">Good progress! You're learning! 📚</span>
              ) : accuracy >= 40 ? (
                <span className="text-yellow-600">Keep trying! Practice makes perfect! 💪</span>
              ) : (
                <span className="text-gray-600">Every mistake is a learning opportunity! 🎯</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionCounter;