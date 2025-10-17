'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  calculateNextReview,
  getQualityFromDifficulty,
  calculateSessionStats,
  type ReviewItem,
  type ReviewResult,
  type DifficultyRating,
} from '@/lib/spaced-repetition';

interface VocabularyItem {
  id: string;
  phrase: string;
  description: string;
  easeFactor: number;
  interval: number;
  repetitions: number;
  lastReviewDate: string | null;
  nextReviewDate: string | null;
}

interface FlashcardReviewProps {
  items: VocabularyItem[];
  onComplete: (results: ReviewResult[]) => void;
  onCancel: () => void;
}

export default function FlashcardReview({
  items,
  onComplete,
  onCancel,
}: FlashcardReviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviews, setReviews] = useState<ReviewResult[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  const currentItem = items[currentIndex];
  const progress = ((currentIndex + 1) / items.length) * 100;

  useEffect(() => {
    // Reset flip state when moving to next card
    setIsFlipped(false);
  }, [currentIndex]);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleRating = async (difficulty: DifficultyRating) => {
    if (!currentItem) return;

    const quality = getQualityFromDifficulty(difficulty);
    const reviewItem: ReviewItem = {
      id: currentItem.id,
      easeFactor: currentItem.easeFactor,
      interval: currentItem.interval,
      repetitions: currentItem.repetitions,
      lastReviewDate: currentItem.lastReviewDate
        ? new Date(currentItem.lastReviewDate)
        : null,
      nextReviewDate: currentItem.nextReviewDate
        ? new Date(currentItem.nextReviewDate)
        : null,
    };

    const result = calculateNextReview(reviewItem, quality);
    const newReviews = [...reviews, result];
    setReviews(newReviews);

    // Save review to backend
    try {
      await fetch('/api/vocabulary/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      });
    } catch (error) {
      console.error('Failed to save review:', error);
    }

    // Move to next card or complete session
    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsComplete(true);
    }
  };

  const handleComplete = () => {
    onComplete(reviews);
  };

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            No cards to review
          </h3>
          <p className="text-gray-500 mb-4">
            All caught up! Check back later for more reviews.
          </p>
          <button
            onClick={onCancel}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (isComplete) {
    const stats = calculateSessionStats(reviews);
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl mx-auto p-6"
      >
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-3xl font-bold text-center mb-6 text-gray-800">
            Session Complete!
          </h2>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">
                {stats.reviewed}
              </div>
              <div className="text-sm text-gray-600">Cards Reviewed</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-green-600">
                {stats.accuracy.toFixed(0)}%
              </div>
              <div className="text-sm text-gray-600">Accuracy</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-purple-600">
                {stats.correct}
              </div>
              <div className="text-sm text-gray-600">Correct</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-orange-600">
                {stats.averageQuality.toFixed(1)}
              </div>
              <div className="text-sm text-gray-600">Avg Quality</div>
            </div>
          </div>

          <button
            onClick={handleComplete}
            className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold"
          >
            Finish Session
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">
            Card {currentIndex + 1} of {items.length}
          </span>
          <button
            onClick={onCancel}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Exit Session
          </button>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Flashcard */}
      <div className="perspective-1000 mb-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ rotateY: 90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            exit={{ rotateY: -90, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="relative"
          >
            <div
              onClick={handleFlip}
              className="bg-white rounded-xl shadow-2xl p-12 min-h-[400px] flex flex-col items-center justify-center cursor-pointer hover:shadow-3xl transition-shadow"
            >
              <AnimatePresence mode="wait">
                {!isFlipped ? (
                  <motion.div
                    key="front"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center"
                  >
                    <div className="text-sm text-gray-500 mb-4">PHRASE</div>
                    <h3 className="text-4xl font-bold text-gray-800 mb-6">
                      {currentItem.phrase}
                    </h3>
                    <p className="text-gray-500 text-sm">
                      Click to reveal description
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="back"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center"
                  >
                    <div className="text-sm text-gray-500 mb-4">
                      DESCRIPTION
                    </div>
                    <p className="text-2xl text-gray-700 leading-relaxed">
                      {currentItem.description}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Rating Buttons */}
      {isFlipped && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-4 gap-3"
        >
          <button
            onClick={() => handleRating('again')}
            className="py-4 px-4 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-semibold shadow-lg hover:shadow-xl"
          >
            <div className="text-lg">Again</div>
            <div className="text-xs opacity-75">&lt;1m</div>
          </button>
          <button
            onClick={() => handleRating('hard')}
            className="py-4 px-4 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-semibold shadow-lg hover:shadow-xl"
          >
            <div className="text-lg">Hard</div>
            <div className="text-xs opacity-75">&lt;6m</div>
          </button>
          <button
            onClick={() => handleRating('good')}
            className="py-4 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold shadow-lg hover:shadow-xl"
          >
            <div className="text-lg">Good</div>
            <div className="text-xs opacity-75">&lt;10m</div>
          </button>
          <button
            onClick={() => handleRating('easy')}
            className="py-4 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold shadow-lg hover:shadow-xl"
          >
            <div className="text-lg">Easy</div>
            <div className="text-xs opacity-75">4d</div>
          </button>
        </motion.div>
      )}

      {!isFlipped && (
        <div className="text-center text-sm text-gray-500">
          Review this card and rate your recall
        </div>
      )}
    </div>
  );
}
