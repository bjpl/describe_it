"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle, XCircle, Clock, Target } from "lucide-react";

interface AnswerOption {
  id: string;
  text: string;
  correct: boolean;
}

interface AnswerInputProps {
  questionId: string;
  options: AnswerOption[];
  selectedAnswer: string | null;
  isSubmitted: boolean;
  isCorrect?: boolean;
  onAnswerSelect: (answerId: string) => void;
  onSubmit: () => void;
  onConfidenceChange?: (confidence: number) => void;
  disabled?: boolean;
  showFeedback?: boolean;
  timeLimit?: number; // in seconds
  onTimeUp?: () => void;
}

export const AnswerInput: React.FC<AnswerInputProps> = ({
  questionId,
  options,
  selectedAnswer,
  isSubmitted,
  isCorrect,
  onAnswerSelect,
  onSubmit,
  onConfidenceChange,
  disabled = false,
  showFeedback = true,
  timeLimit,
  onTimeUp,
}) => {
  const [confidence, setConfidence] = useState<number>(50);
  const [timeLeft, setTimeLeft] = useState<number>(timeLimit || 0);
  const [timerActive, setTimerActive] = useState<boolean>(
    !!timeLimit && !isSubmitted,
  );

  // Timer effect
  useEffect(() => {
    if (!timerActive || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setTimerActive(false);
          onTimeUp?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timerActive, timeLeft, onTimeUp]);

  // Reset timer when question changes
  useEffect(() => {
    if (timeLimit) {
      setTimeLeft(timeLimit);
      setTimerActive(!isSubmitted);
    }
  }, [questionId, timeLimit, isSubmitted]);

  // Handle confidence change
  const handleConfidenceChange = (value: number) => {
    setConfidence(value);
    onConfidenceChange?.(value);
  };

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const hasSelectedAnswer = selectedAnswer !== null;
  const canSubmit = hasSelectedAnswer && !isSubmitted && !disabled;

  return (
    <div className="space-y-4">
      {/* Timer Display */}
      {timeLimit && (
        <div className="flex items-center justify-center space-x-2">
          <Clock className="h-4 w-4 text-blue-600" />
          <span
            className={`text-sm font-mono ${timeLeft <= 10 ? "text-red-600" : "text-blue-600"}`}
          >
            {formatTime(timeLeft)}
          </span>
          {timeLeft <= 10 && (
            <span className="text-xs text-red-600 animate-pulse">
              Time running out!
            </span>
          )}
        </div>
      )}

      {/* Answer Options */}
      <div className="space-y-3">
        {options.map((option) => {
          const isSelected = selectedAnswer === option.id;
          const isCorrectOption = option.correct;

          let buttonClass =
            "w-full p-4 text-left border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ";

          if (disabled) {
            buttonClass += "cursor-not-allowed opacity-75 ";
          } else if (isSubmitted) {
            buttonClass += "cursor-default ";
          } else {
            buttonClass += "cursor-pointer ";
          }

          if (isSubmitted && showFeedback) {
            if (isCorrectOption) {
              buttonClass +=
                "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-300";
            } else if (isSelected && !isCorrectOption) {
              buttonClass +=
                "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-300";
            } else {
              buttonClass +=
                "border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300";
            }
          } else {
            if (isSelected) {
              buttonClass +=
                "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-300 ring-2 ring-blue-200";
            } else {
              buttonClass +=
                "border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/10";
            }
          }

          return (
            <button
              key={option.id}
              onClick={() =>
                !isSubmitted && !disabled && onAnswerSelect(option.id)
              }
              disabled={isSubmitted || disabled}
              className={buttonClass}
              aria-pressed={isSelected}
              aria-describedby={
                isSubmitted ? `feedback-${option.id}` : undefined
              }
            >
              <div className="flex items-center justify-between">
                <span className="flex-1 text-left">{option.text}</span>
                <div className="flex items-center space-x-2">
                  {/* Selection indicator */}
                  {isSelected && !isSubmitted && (
                    <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  )}

                  {/* Feedback icons */}
                  {isSubmitted && showFeedback && (
                    <span>
                      {isCorrectOption ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : isSelected ? (
                        <XCircle className="h-5 w-5 text-red-600" />
                      ) : null}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Confidence Slider */}
      {!isSubmitted && hasSelectedAnswer && onConfidenceChange && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Target className="h-4 w-4 text-blue-600" />
            <label
              htmlFor={`confidence-${questionId}`}
              className="text-sm font-medium text-blue-900 dark:text-blue-300"
            >
              How confident are you? ({confidence}%)
            </label>
          </div>
          <input
            id={`confidence-${questionId}`}
            type="range"
            min="0"
            max="100"
            value={confidence}
            onChange={(e) => handleConfidenceChange(Number(e.target.value))}
            className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer slider"
            disabled={disabled}
          />
          <div className="flex justify-between text-xs text-blue-700 dark:text-blue-400 mt-1">
            <span>Not sure</span>
            <span>Very confident</span>
          </div>
        </div>
      )}

      {/* Submit Button */}
      {!isSubmitted && (
        <div className="pt-2">
          <button
            onClick={onSubmit}
            disabled={!canSubmit}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {!hasSelectedAnswer
              ? "Select an answer to continue"
              : "Submit Answer"}
          </button>
        </div>
      )}

      {/* Feedback Summary */}
      {isSubmitted && showFeedback && (
        <div
          className={`p-4 rounded-lg ${isCorrect ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"}`}
        >
          <div className="flex items-center space-x-2">
            {isCorrect ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            <span
              className={`font-medium ${isCorrect ? "text-green-900 dark:text-green-300" : "text-red-900 dark:text-red-300"}`}
            >
              {isCorrect ? "Correct!" : "Incorrect"}
            </span>
            {onConfidenceChange && (
              <span className="text-sm opacity-75">
                (Confidence: {confidence}%)
              </span>
            )}
          </div>
        </div>
      )}

      {/* CSS for custom slider */}
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #2563eb;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .slider::-webkit-slider-thumb:hover {
          background: #1d4ed8;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #2563eb;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
};

export default AnswerInput;
