"use client";

import React from "react";
import { motion } from "framer-motion";
import { MotionDiv } from "@/components/ui/MotionComponents";
import { Clock, Target, TrendingUp, Award, Timer } from "lucide-react";

interface QuestionCounterProps {
  currentIndex: number;
  totalQuestions: number;
  answeredCount: number;
  correctCount: number;
  timeSpent?: number; // in seconds
  averageTime?: number; // in seconds
  streak?: number;
  sessionScore?: {
    percentage: number;
    grade: string;
  };
  showDetails?: boolean;
  className?: string;
}

export function QuestionCounter({
  currentIndex,
  totalQuestions,
  answeredCount,
  correctCount,
  timeSpent = 0,
  averageTime = 0,
  streak = 0,
  sessionScore,
  showDetails = true,
  className = "",
}: QuestionCounterProps) {
  const accuracy =
    answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
  const progress =
    totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 80) return "text-green-600";
    if (accuracy >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case "A+":
      case "A":
        return "bg-green-100 text-green-800 border-green-200";
      case "B":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "C":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-red-100 text-red-800 border-red-200";
    }
  };

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Progress Overview
          </h3>

          {sessionScore && (
            <MotionDiv
              className={`px-3 py-1 rounded-full text-sm font-medium border ${getGradeColor(sessionScore.grade)}`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              {sessionScore.grade} • {sessionScore.percentage}%
            </MotionDiv>
          )}
        </div>
      </div>

      {/* Main Stats */}
      <div className="p-4">
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
            <span>
              Question {currentIndex + 1} of {totalQuestions}
            </span>
            <span>{Math.round(progress)}% Complete</span>
          </div>

          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
            <MotionDiv
              className="bg-blue-600 h-2.5 rounded-full"
              style={{ width: `${progress}%` }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Answered */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Target className="w-4 h-4 text-blue-500 mr-1" />
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                {answeredCount}
              </span>
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Answered
            </div>
          </div>

          {/* Correct */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-lg font-semibold text-green-600">
                {correctCount}
              </span>
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Correct
            </div>
          </div>

          {/* Accuracy */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Award className="w-4 h-4 text-yellow-500 mr-1" />
              <span
                className={`text-lg font-semibold ${getAccuracyColor(accuracy)}`}
              >
                {accuracy}%
              </span>
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Accuracy
            </div>
          </div>

          {/* Streak */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Timer className="w-4 h-4 text-purple-500 mr-1" />
              <span className="text-lg font-semibold text-purple-600">
                {streak}
              </span>
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Streak
            </div>
          </div>
        </div>

        {/* Detailed Stats */}
        {showDetails && (timeSpent > 0 || averageTime > 0) && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Time Spent */}
              {timeSpent > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Total Time
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatTime(timeSpent)}
                  </span>
                </div>
              )}

              {/* Average Time */}
              {averageTime > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Avg. per Question
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatTime(averageTime)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Performance Indicator */}
        {answeredCount > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Performance
              </span>
              <div className="flex items-center gap-2">
                {accuracy >= 80 ? (
                  <span className="text-sm text-green-600 font-medium">
                    Excellent!
                  </span>
                ) : accuracy >= 60 ? (
                  <span className="text-sm text-yellow-600 font-medium">
                    Good
                  </span>
                ) : (
                  <span className="text-sm text-red-600 font-medium">
                    Needs Improvement
                  </span>
                )}

                {streak >= 3 && (
                  <MotionDiv
                    className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  >
                    🔥 {streak} streak!
                  </MotionDiv>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
