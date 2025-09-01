/**
 * Spaced Repetition Review Session Component
 * Interactive review session with spaced repetition algorithm
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@radix-ui/react-card';
import { Button } from '@radix-ui/react-button';
import { Progress } from '@radix-ui/react-progress';
import { Badge } from '@radix-ui/react-badge';
import { 
  RotateCcw,
  Volume2,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Clock,
  Target,
  TrendingUp,
  Lightbulb,
  ArrowRight
} from 'lucide-react';
import { 
  useReviewSession,
  useProcessReviewResponse,
  usePhrase
} from '../../hooks/useVocabulary';
import { LoadingSpinner } from '../Shared/LoadingStates';
import { SpacedRepetitionUtils } from '../../lib/algorithms/spaced-repetition';

interface ReviewSessionProps {
  onComplete: (results: ReviewSessionResults) => void;
  maxCards?: number;
  className?: string;
}

interface ReviewSessionResults {
  totalCards: number;
  correctAnswers: number;
  averageResponseTime: number;
  cardsReviewed: string[];
  sessionDuration: number;
}

export const ReviewSession: React.FC<ReviewSessionProps> = ({
  onComplete,
  maxCards = 20,
  className = '',
}) => {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [sessionStartTime] = useState(new Date());
  const [cardStartTime, setCardStartTime] = useState<Date | null>(null);
  const [responses, setResponses] = useState<Array<{ phraseId: string; quality: number; responseTime: number }>>([]);
  const [isComplete, setIsComplete] = useState(false);

  // Hooks
  const { data: reviewSession, isLoading } = useReviewSession(10, maxCards);
  const processResponse = useProcessReviewResponse();

  // Current card data
  const currentCards = reviewSession?.cards_due || [];
  const currentCard = currentCards[currentCardIndex];
  const { data: currentPhrase } = usePhrase(currentCard?.phrase_id || '');

  // Start card timer when showing new card
  useEffect(() => {
    if (currentCard && !showAnswer) {
      setCardStartTime(new Date());
    }
  }, [currentCard, showAnswer, currentCardIndex]);

  // Handle showing the answer
  const handleShowAnswer = useCallback(() => {
    setShowAnswer(true);
  }, []);

  // Handle response to a card
  const handleResponse = useCallback(async (quality: number) => {
    if (!currentCard || !cardStartTime) return;

    const responseTime = (new Date().getTime() - cardStartTime.getTime()) / 1000;

    // Record response
    const response = {
      phraseId: currentCard.phrase_id,
      quality,
      responseTime,
    };

    setResponses(prev => [...prev, response]);

    // Process with spaced repetition algorithm
    try {
      await processResponse.mutateAsync({
        phrase_id: currentCard.phrase_id,
        response_quality: quality,
        response_time_seconds: responseTime,
      });
    } catch (error) {
      console.error('Failed to process response:', error);
    }

    // Move to next card or complete session
    if (currentCardIndex < currentCards.length - 1) {
      setCurrentCardIndex(prev => prev + 1);
      setShowAnswer(false);
    } else {
      // Session complete
      const sessionDuration = (new Date().getTime() - sessionStartTime.getTime()) / 1000 / 60;
      const correctAnswers = [...responses, response].filter(r => r.quality >= 3).length;
      const averageResponseTime = [...responses, response].reduce((sum, r) => sum + r.responseTime, 0) / (responses.length + 1);

      const results: ReviewSessionResults = {
        totalCards: currentCards.length,
        correctAnswers,
        averageResponseTime,
        cardsReviewed: [...responses.map(r => r.phraseId), response.phraseId],
        sessionDuration,
      };

      setIsComplete(true);
      onComplete(results);
    }
  }, [currentCard, cardStartTime, currentCardIndex, currentCards.length, responses, processResponse, sessionStartTime, onComplete]);

  // Quality button configurations
  const qualityButtons = [
    { quality: 0, label: 'Again', color: 'bg-red-500 hover:bg-red-600 text-white', description: 'Complete blackout' },
    { quality: 1, label: 'Hard', color: 'bg-orange-500 hover:bg-orange-600 text-white', description: 'Incorrect but some recognition' },
    { quality: 2, label: 'Good', color: 'bg-yellow-500 hover:bg-yellow-600 text-white', description: 'Incorrect but close' },
    { quality: 3, label: 'Easy', color: 'bg-green-500 hover:bg-green-600 text-white', description: 'Correct with effort' },
    { quality: 4, label: 'Perfect', color: 'bg-blue-500 hover:bg-blue-600 text-white', description: 'Perfect response' },
  ];

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!reviewSession || currentCards.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">No cards due for review</h3>
          <p className="text-gray-500">Great job! Check back later for more cards to review.</p>
        </CardContent>
      </Card>
    );
  }

  if (isComplete) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <TrendingUp className="w-16 h-16 mx-auto mb-4 text-green-500" />
          <h2 className="text-2xl font-bold mb-4">Session Complete!</h2>
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
            <div>
              <div className="text-2xl font-bold text-green-600">{responses.filter(r => r.quality >= 3).length}</div>
              <div className="text-sm text-gray-600">Correct</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{responses.length}</div>
              <div className="text-sm text-gray-600">Total Cards</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!currentPhrase) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const progress = ((currentCardIndex + 1) / currentCards.length) * 100;

  return (
    <div className={`max-w-4xl mx-auto space-y-6 ${className}`}>
      {/* Session Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Review Session
            </CardTitle>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>{currentCardIndex + 1} of {currentCards.length}</span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {Math.floor((new Date().getTime() - sessionStartTime.getTime()) / 60000)}m
              </span>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </CardHeader>
      </Card>

      {/* Main Card */}
      <Card className="min-h-96">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                {SpacedRepetitionUtils.getMasteryLevel(currentCard)}
              </Badge>
              <Badge className="bg-gray-100 text-gray-800 border-gray-200">
                {SpacedRepetitionUtils.getDifficultyDescription(currentCard.easiness_factor)}
              </Badge>
            </div>
            <div className="text-sm text-gray-500">
              Next review: {SpacedRepetitionUtils.getNextReviewDescription(currentCard.next_review_date)}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Question */}
          <div className="text-center space-y-4">
            <div className="text-3xl font-bold text-gray-800 mb-4">
              {currentPhrase.spanish_text}
            </div>
            
            {currentPhrase.phonetic_pronunciation && (
              <div className="flex items-center justify-center gap-2">
                <span className="text-gray-600">/{currentPhrase.phonetic_pronunciation}/</span>
                <Button variant="outline" size="sm">
                  <Volume2 className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Context sentence (always visible for context) */}
            {currentPhrase.context_sentence_spanish && (
              <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-300">
                <p className="italic text-gray-700">{currentPhrase.context_sentence_spanish}</p>
              </div>
            )}
          </div>

          {/* Answer Section */}
          <div className="border-t pt-6">
            {!showAnswer ? (
              <div className="text-center">
                <Button 
                  onClick={handleShowAnswer}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Show Answer
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Answer Display */}
                <div className="bg-green-50 p-6 rounded-lg border-l-4 border-green-300">
                  <div className="text-xl font-semibold text-gray-800 mb-2">
                    {currentPhrase.english_translation}
                  </div>
                  
                  {currentPhrase.context_sentence_english && (
                    <div className="text-gray-600 italic">
                      {currentPhrase.context_sentence_english}
                    </div>
                  )}
                </div>

                {/* Additional Information */}
                {(currentPhrase.usage_notes || currentPhrase.user_notes) && (
                  <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-300">
                    <div className="flex items-start gap-2">
                      <Lightbulb className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div className="space-y-2">
                        {currentPhrase.usage_notes && (
                          <p className="text-sm text-gray-700">
                            <strong>Usage:</strong> {currentPhrase.usage_notes}
                          </p>
                        )}
                        {currentPhrase.user_notes && (
                          <p className="text-sm text-gray-700">
                            <strong>Note:</strong> {currentPhrase.user_notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Response Buttons */}
                <div className="space-y-4">
                  <h4 className="text-lg font-medium text-center">How well did you know this?</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                    {qualityButtons.map(({ quality, label, color, description }) => (
                      <Button
                        key={quality}
                        onClick={() => handleResponse(quality)}
                        className={`${color} p-4 h-auto flex flex-col items-center gap-2`}
                        disabled={processResponse.isLoading}
                      >
                        <span className="font-semibold">{label}</span>
                        <span className="text-xs opacity-90">{description}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Session Stats */}
      {responses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Session Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-semibold text-green-600">
                  {responses.filter(r => r.quality >= 3).length}
                </div>
                <div className="text-xs text-gray-600">Correct</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-red-600">
                  {responses.filter(r => r.quality < 3).length}
                </div>
                <div className="text-xs text-gray-600">Incorrect</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-blue-600">
                  {Math.round(responses.reduce((sum, r) => sum + r.responseTime, 0) / responses.length)}s
                </div>
                <div className="text-xs text-gray-600">Avg Time</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ReviewSession;