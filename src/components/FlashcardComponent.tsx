"use client";

import React, { useState, useEffect } from "react";
import {
  RotateCcw,
  Volume2,
  Eye,
  EyeOff,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { SavedPhrase } from "@/types/api";
import {
  getDifficultyColor,
  getCategoryColor,
} from "@/lib/utils/phrase-helpers";

interface FlashcardComponentProps {
  phrase: SavedPhrase;
  onAnswer: (quality: number) => void;
  onNext: () => void;
  onPrevious: () => void;
  currentIndex: number;
  totalCount: number;
  showNavigation?: boolean;
  autoAdvance?: boolean;
}

export const FlashcardComponent: React.FC<FlashcardComponentProps> = ({
  phrase,
  onAnswer,
  onNext,
  onPrevious,
  currentIndex,
  totalCount,
  showNavigation = true,
  autoAdvance = false,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // Reset card state when phrase changes
  useEffect(() => {
    setIsFlipped(false);
    setShowHint(false);
  }, [phrase.id]);

  // Auto-advance after answer if enabled
  useEffect(() => {
    if (isFlipped && autoAdvance) {
      const timer = setTimeout(() => {
        onNext();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isFlipped, autoAdvance, onNext]);

  const handleFlip = () => {
    if (isAnimating) return;

    setIsAnimating(true);
    setTimeout(() => {
      setIsFlipped(!isFlipped);
      setIsAnimating(false);
    }, 150);
  };

  const handleAnswer = (quality: number) => {
    onAnswer(quality);
    if (!autoAdvance) {
      setTimeout(() => {
        onNext();
      }, 1000);
    }
  };

  const speakText = (text: string) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "es-ES";
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case " ":
      case "Enter":
        event.preventDefault();
        handleFlip();
        break;
      case "1":
        if (isFlipped) handleAnswer(0);
        break;
      case "2":
        if (isFlipped) handleAnswer(1);
        break;
      case "3":
        if (isFlipped) handleAnswer(3);
        break;
      case "4":
        if (isFlipped) handleAnswer(4);
        break;
      case "5":
        if (isFlipped) handleAnswer(5);
        break;
      case "ArrowLeft":
        event.preventDefault();
        onPrevious();
        break;
      case "ArrowRight":
        event.preventDefault();
        onNext();
        break;
      case "h":
        setShowHint(!showHint);
        break;
    }
  };

  return (
    <div
      className="flashcard-container focus:outline-none"
      tabIndex={0}
      onKeyDown={handleKeyPress}
    >
      {/* Progress bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / totalCount) * 100}%` }}
        />
      </div>

      {/* Card counter */}
      <div className="text-center mb-4 text-sm text-gray-600 dark:text-gray-400">
        Card {currentIndex + 1} of {totalCount}
      </div>

      {/* Flashcard */}
      <div className="relative w-full max-w-lg mx-auto">
        <div
          className={`flashcard ${isFlipped ? "flipped" : ""} ${isAnimating ? "animating" : ""}`}
          onClick={handleFlip}
          style={{ cursor: "pointer", perspective: "1000px" }}
        >
          {/* Front of card */}
          <div className="flashcard-face flashcard-front bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-xl p-8 shadow-lg">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2 mb-4">
                <span
                  className={`px-3 py-1 rounded-full text-sm ${getCategoryColor(phrase.category)}`}
                >
                  {phrase.category}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-sm ${getDifficultyColor(phrase.difficulty)}`}
                >
                  {phrase.difficulty}
                </span>
              </div>

              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                "{phrase.phrase}"
              </h2>

              {phrase.article && (
                <p className="text-lg text-gray-600 dark:text-gray-400">
                  Article: <span className="font-medium">{phrase.article}</span>
                </p>
              )}

              {phrase.partOfSpeech && (
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  {phrase.partOfSpeech}
                </p>
              )}

              <div className="flex items-center justify-center gap-4 mt-6">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    speakText(phrase.phrase);
                  }}
                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  title="Listen to pronunciation"
                >
                  <Volume2 className="h-5 w-5" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowHint(!showHint);
                  }}
                  className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                  title="Show hint"
                >
                  {showHint ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>

              {showHint && (
                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-yellow-800 dark:text-yellow-300">
                    <strong>Hint:</strong> {phrase.context.substring(0, 50)}...
                  </p>
                </div>
              )}

              <div className="mt-8 text-sm text-gray-400 dark:text-gray-500">
                Click to reveal answer
              </div>
            </div>
          </div>

          {/* Back of card */}
          <div className="flashcard-face flashcard-back bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-2 border-blue-200 dark:border-blue-600 rounded-xl p-8 shadow-lg">
            <div className="text-center space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                "{phrase.phrase}"
              </h2>

              <div className="space-y-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Definition
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    {phrase.definition}
                  </p>
                </div>

                {phrase.translation && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      Translation
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300">
                      {phrase.translation}
                    </p>
                  </div>
                )}

                <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Context
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 italic">
                    "{phrase.context}"
                  </p>
                </div>

                {phrase.conjugation && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      Infinitive
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300">
                      {phrase.conjugation}
                    </p>
                  </div>
                )}
              </div>

              {/* Answer buttons */}
              <div className="grid grid-cols-2 gap-3 mt-8">
                <div className="space-y-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAnswer(0);
                    }}
                    className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                  >
                    Wrong (1)
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAnswer(3);
                    }}
                    className="w-full px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm"
                  >
                    Hard (3)
                  </button>
                </div>
                <div className="space-y-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAnswer(5);
                    }}
                    className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                  >
                    Easy (5)
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAnswer(4);
                    }}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    Good (4)
                  </button>
                </div>
              </div>

              <div className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                Use number keys 1-5 or click buttons to rate your answer
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      {showNavigation && (
        <div className="flex items-center justify-between mt-6 max-w-lg mx-auto">
          <button
            onClick={onPrevious}
            disabled={currentIndex === 0}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </button>

          <button
            onClick={() => setIsFlipped(false)}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            title="Reset card"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>

          <button
            onClick={onNext}
            disabled={currentIndex === totalCount - 1}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Keyboard shortcuts help */}
      <div className="text-center mt-4 text-xs text-gray-500 dark:text-gray-400">
        <p>
          <strong>Shortcuts:</strong> Space/Enter = Flip &bull; 1-5 = Rate &bull; &larr; &rarr; =
          Navigate &bull; H = Hint
        </p>
      </div>

      <style jsx>{`
        .flashcard {
          position: relative;
          width: 100%;
          height: 400px;
          transition: transform 0.3s ease-in-out;
          transform-style: preserve-3d;
        }

        .flashcard.flipped {
          transform: rotateY(180deg);
        }

        .flashcard.animating {
          pointer-events: none;
        }

        .flashcard-face {
          position: absolute;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .flashcard-back {
          transform: rotateY(180deg);
        }

        .flashcard-front {
          transform: rotateY(0deg);
        }

        @media (max-width: 640px) {
          .flashcard {
            height: 350px;
          }

          .flashcard-face {
            padding: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default FlashcardComponent;
