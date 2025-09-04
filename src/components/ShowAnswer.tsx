'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, Lightbulb, BookOpen, Target, Clock } from 'lucide-react';

interface ShowAnswerProps {
  questionId: string;
  answer: string;
  explanation?: string;
  hints?: string[];
  isRevealed: boolean;
  onReveal: () => void;
  onHide: () => void;
  showHints?: boolean;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  category?: string;
  responseTime?: number;
  languageNote?: string;
}

export const ShowAnswer: React.FC<ShowAnswerProps> = ({
  questionId,
  answer,
  explanation,
  hints = [],
  isRevealed,
  onReveal,
  onHide,
  showHints = false,
  difficulty,
  category,
  responseTime,
  languageNote
}) => {
  const [showHintsPanel, setShowHintsPanel] = useState(false);
  const [currentHint, setCurrentHint] = useState(0);

  const handleToggleAnswer = () => {
    if (isRevealed) {
      onHide();
    } else {
      onReveal();
    }
  };

  const handleNextHint = () => {
    if (currentHint < hints.length - 1) {
      setCurrentHint(prev => prev + 1);
    }
  };

  const getDifficultyColor = (level?: string) => {
    switch (level) {
      case 'beginner': return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      case 'intermediate': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case 'advanced': return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  return (
    <div className="space-y-4">
      {/* Answer Control Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={handleToggleAnswer}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            aria-expanded={isRevealed}
            aria-controls={`answer-${questionId}`}
          >
            {isRevealed ? (
              <>
                <EyeOff className="h-4 w-4" />
                <span>Hide Answer</span>
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                <span>Show Answer</span>
              </>
            )}
          </button>

          {/* Hints Button */}
          {showHints && hints.length > 0 && !isRevealed && (
            <button
              onClick={() => setShowHintsPanel(!showHintsPanel)}
              className="flex items-center space-x-2 px-4 py-2 border border-yellow-500 text-yellow-600 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors"
            >
              <Lightbulb className="h-4 w-4" />
              <span>Hints ({hints.length})</span>
            </button>
          )}
        </div>

        {/* Metadata */}
        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
          {difficulty && (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(difficulty)}`}>
              {difficulty}
            </span>
          )}
          {category && (
            <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-full text-xs">
              {category}
            </span>
          )}
          {responseTime && (
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>{responseTime}ms</span>
            </div>
          )}
        </div>
      </div>

      {/* Hints Panel */}
      {showHintsPanel && hints.length > 0 && !isRevealed && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Lightbulb className="h-4 w-4 text-yellow-600" />
              <span className="font-medium text-yellow-800 dark:text-yellow-200">
                Hint {currentHint + 1} of {hints.length}
              </span>
            </div>
            <button
              onClick={() => setShowHintsPanel(false)}
              className="text-yellow-600 hover:text-yellow-800 transition-colors"
              aria-label="Close hints"
            >
              <EyeOff className="h-4 w-4" />
            </button>
          </div>
          
          <div className="space-y-3">
            <p className="text-yellow-800 dark:text-yellow-200">
              {hints[currentHint]}
            </p>
            
            {currentHint < hints.length - 1 && (
              <button
                onClick={handleNextHint}
                className="text-sm text-yellow-700 hover:text-yellow-900 dark:text-yellow-300 dark:hover:text-yellow-100 underline transition-colors"
              >
                Show next hint →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Answer Panel */}
      {isRevealed && (
        <div 
          id={`answer-${questionId}`}
          className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-4"
          role="region"
          aria-label="Answer content"
        >
          {/* Main Answer */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-blue-600" />
              <h3 className="font-semibold text-blue-900 dark:text-blue-300">
                Answer
              </h3>
            </div>
            <div className="bg-white dark:bg-gray-700 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
              <p className="text-gray-900 dark:text-gray-100 font-medium">
                {answer}
              </p>
            </div>
          </div>

          {/* Language Note */}
          {languageNote && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <BookOpen className="h-4 w-4 text-purple-600" />
                <h4 className="font-medium text-purple-900 dark:text-purple-300">
                  Language Note
                </h4>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 border border-purple-200 dark:border-purple-700">
                <p className="text-purple-800 dark:text-purple-200 text-sm">
                  {languageNote}
                </p>
              </div>
            </div>
          )}

          {/* Detailed Explanation */}
          {explanation && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Lightbulb className="h-4 w-4 text-green-600" />
                <h4 className="font-medium text-green-900 dark:text-green-300">
                  Explanation
                </h4>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-700">
                <p className="text-green-800 dark:text-green-200 text-sm leading-relaxed">
                  {explanation}
                </p>
              </div>
            </div>
          )}

          {/* All Hints (if revealed) */}
          {hints.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Lightbulb className="h-4 w-4 text-orange-600" />
                <h4 className="font-medium text-orange-900 dark:text-orange-300">
                  Learning Hints
                </h4>
              </div>
              <div className="space-y-2">
                {hints.map((hint, index) => (
                  <div 
                    key={index}
                    className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 border border-orange-200 dark:border-orange-700"
                  >
                    <div className="flex items-start space-x-2">
                      <span className="flex-shrink-0 w-5 h-5 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                        {index + 1}
                      </span>
                      <p className="text-orange-800 dark:text-orange-200 text-sm">
                        {hint}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ShowAnswer;