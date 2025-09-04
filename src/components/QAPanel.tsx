'use client';

import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { CheckCircle, XCircle, RefreshCw, AlertCircle, Eye, EyeOff, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { exportResponses, getCurrentTimestamp, type ResponseItem } from '../lib/export/csvExporter';
import { QAProgressIndicator, TextContentSkeleton } from './ProgressIndicator';

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

interface QAResponse {
  id: string;
  imageId: string;
  question: string;
  answer: string;
  confidence: number;
  createdAt: string;
}

interface QAPanelProps {
  selectedImage: any;
  descriptionText: string | null;
  style: 'narrativo' | 'poetico' | 'academico' | 'conversacional' | 'infantil';
  onResponseUpdate?: (response: any) => void;
}

const QAPanel = memo<QAPanelProps>(function QAPanel({ selectedImage, descriptionText, style, onResponseUpdate }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: string]: number }>({});
  const [showResults, setShowResults] = useState<{ [key: string]: boolean }>({});
  const [showExplanations, setShowExplanations] = useState<{ [key: string]: boolean }>({});
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [userResponses, setUserResponses] = useState<ResponseItem[]>([]);

  // Generate multiple choice questions from Q&A API response
  const generateQuestions = useCallback(async () => {
    if (!selectedImage) return;
    
    // Require description text for proper Q&A generation
    if (!descriptionText) {
      setError('Please generate a description first to create questions based on the content.');
      return;
    }

    setLoading(true);
    setError(null);
    setQuestions([]);
    setSelectedAnswers({});
    setShowResults({});
    setShowExplanations({});
    setScore({ correct: 0, total: 0 });
    setCurrentQuestionIndex(0);
    setUserResponses([]);

    try {
      const imageUrl = selectedImage.urls?.regular;

      // Generate multiple questions about the image and description
      const questionPrompts = [
        `What can you see in this image?`,
        `What colors are prominent in this image?`,
        `What is the main subject of this image?`,
        `What activity or scene is taking place?`
      ];

      const generatedQuestions: Question[] = [];

      for (let i = 0; i < questionPrompts.length; i++) {
        const response = await fetch('/api/qa/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageUrl,
            descriptionText: descriptionText,
            style: style,
            language: 'es',
            question: questionPrompts[i]
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to generate question ${i + 1}`);
        }

        const qaData: QAResponse = await response.json();
        
        // Convert the answer into a multiple choice question
        const question = createMultipleChoiceFromAnswer(qaData, questionPrompts[i]);
        generatedQuestions.push(question);
      }

      setQuestions(generatedQuestions);
    } catch (err) {
      console.error('Error generating questions:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate questions');
    } finally {
      setLoading(false);
    }
  }, [selectedImage, descriptionText, style]);

  // Create multiple choice question from API answer
  const createMultipleChoiceFromAnswer = useCallback((qaData: QAResponse, originalQuestion: string): Question => {
    const answer = qaData.answer;
    
    // Create plausible incorrect options based on question type
    let options: string[] = [];
    let correctAnswer = 0;

    if (originalQuestion.toLowerCase().includes('color')) {
      options = [
        answer,
        'The image contains mainly black and white tones',
        'The colors are predominantly purple and pink',
        'The image has a monochromatic blue color scheme'
      ];
    } else if (originalQuestion.toLowerCase().includes('what can you see')) {
      options = [
        answer,
        'A library with people reading books quietly',
        'A restaurant with diners enjoying their meals',
        'A park with children playing on swings'
      ];
    } else if (originalQuestion.toLowerCase().includes('main subject')) {
      options = [
        answer,
        'A group of tourists taking photographs',
        'A construction site with workers',
        'A school classroom with students'
      ];
    } else if (originalQuestion.toLowerCase().includes('activity')) {
      options = [
        answer,
        'People attending a formal business meeting',
        'Children participating in a sports competition',
        'Musicians performing in a concert hall'
      ];
    } else {
      // Generic options
      options = [
        answer,
        'This is not visible in the image',
        'The opposite of what is shown',
        'Something completely different'
      ];
    }

    // Shuffle options but keep track of correct answer
    const shuffledOptions = [...options];
    for (let i = shuffledOptions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
      
      // Update correct answer index
      if (j === correctAnswer) {
        correctAnswer = i;
      } else if (i === correctAnswer) {
        correctAnswer = j;
      }
    }

    return {
      id: qaData.id,
      question: originalQuestion,
      options: shuffledOptions,
      correctAnswer,
      explanation: `Based on the image analysis: ${answer}`
    };
  }, []);

  const handleAnswerSelect = useCallback((questionId: string, answerIndex: number) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: answerIndex
    }));
  }, []);

  const handleSubmitAnswer = useCallback((questionId: string) => {
    const question = questions.find(q => q.id === questionId);
    if (!question) return;

    const selectedAnswer = selectedAnswers[questionId];
    const isCorrect = selectedAnswer === question.correctAnswer;

    // Store the user response for export
    const responseItem: ResponseItem = {
      question: question.question,
      user_answer: question.options[selectedAnswer] || 'No answer selected',
      correct_answer: question.options[question.correctAnswer],
      timestamp: getCurrentTimestamp()
    };

    setUserResponses(prev => [...prev, responseItem]);
    
    // Notify parent component
    if (onResponseUpdate) {
      onResponseUpdate(responseItem);
    }

    setShowResults(prev => ({
      ...prev,
      [questionId]: true
    }));

    setScore(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1
    }));
  }, [questions, selectedAnswers]);

  const resetQuiz = useCallback(() => {
    setSelectedAnswers({});
    setShowResults({});
    setShowExplanations({});
    setScore({ correct: 0, total: 0 });
    setCurrentQuestionIndex(0);
    setUserResponses([]);
  }, []);

  const toggleExplanation = useCallback((questionId: string) => {
    setShowExplanations(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  }, []);

  const nextQuestion = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  }, [currentQuestionIndex, questions.length]);

  const prevQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  }, [currentQuestionIndex]);

  // Export Q&A responses function
  const handleExportResponses = useCallback(() => {
    if (userResponses.length === 0) {
      alert('No responses to export. Please answer some questions first.');
      return;
    }

    try {
      exportResponses(userResponses);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export responses data. Please try again.');
    }
  }, [userResponses]);

  // Memoize effect dependencies to prevent unnecessary calls
  const imageId = selectedImage?.id;
  
  useEffect(() => {
    if (selectedImage && descriptionText) {
      generateQuestions();
    }
  }, [imageId, descriptionText, style, generateQuestions]);

  // Memoize expensive computations
  const currentQuestion = useMemo(() => questions[currentQuestionIndex], [questions, currentQuestionIndex]);
  const hasAnswered = useMemo(() => currentQuestion ? showResults[currentQuestion.id] : false, [showResults, currentQuestion]);
  const selectedAnswer = useMemo(() => currentQuestion ? selectedAnswers[currentQuestion.id] : undefined, [selectedAnswers, currentQuestion]);
  const isCorrect = useMemo(() => hasAnswered && currentQuestion && selectedAnswer === currentQuestion.correctAnswer, [hasAnswered, currentQuestion, selectedAnswer]);
  const accuracyPercentage = useMemo(() => score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0, [score.correct, score.total]);
  const progressPercentage = useMemo(() => ((currentQuestionIndex + 1) / questions.length) * 100, [currentQuestionIndex, questions.length]);
  const showExplanation = useMemo(() => currentQuestion ? showExplanations[currentQuestion.id] : false, [showExplanations, currentQuestion]);
  
  // Get answered questions for visual indicators
  const answeredQuestions = useMemo(() => {
    return questions.map((question, index) => ({
      index,
      answered: showResults[question.id] || false,
      correct: showResults[question.id] && selectedAnswers[question.id] === question.correctAnswer
    }));
  }, [questions, showResults, selectedAnswers]);

  if (!selectedImage) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Questions & Answers</h2>
        <p className="text-gray-500 dark:text-gray-400">
          Select an image to start the Q&A exercises.
        </p>
      </div>
    );
  }
  
  if (!descriptionText) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Questions & Answers</h2>
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <div className="flex items-center space-x-2 text-yellow-600 dark:text-yellow-400">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Description Required</span>
          </div>
          <p className="text-yellow-700 dark:text-yellow-300 mt-2">
            Please generate a description first. The Q&A will be based on the actual description content.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Questions & Answers</h2>
        <QAProgressIndicator isGenerating={true} />
        <div className="space-y-6">
          {/* Show skeleton for questions while loading */}
          {[1, 2, 3, 4].map(index => (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <div className="space-y-4">
                <TextContentSkeleton lines={1} />
                <div className="space-y-3">
                  {[1, 2, 3, 4].map(optionIndex => (
                    <div key={optionIndex} className="w-full p-4 border rounded-lg">
                      <TextContentSkeleton lines={1} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Questions & Answers</h2>
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Error generating questions</span>
          </div>
          <p className="text-red-700 dark:text-red-300 mt-2">{error}</p>
          <button
            onClick={generateQuestions}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Questions & Answers</h2>
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <p className="text-gray-600 dark:text-gray-400">No questions generated yet.</p>
          <button
            onClick={generateQuestions}
            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Generate Questions
          </button>
        </div>
      </div>
    );
  }

  // Already computed in memoized values above

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Questions & Answers</h2>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
          {score.total > 0 && (
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
              Score: {score.correct}/{score.total} ({accuracyPercentage}%)
            </span>
          )}
        </div>
      </div>

      {/* Question Progress Dots */}
      {questions.length > 1 && (
        <div className="flex items-center justify-center space-x-2 py-2">
          {answeredQuestions.map((q, index) => {
            const isCurrent = index === currentQuestionIndex;
            let dotClass = 'w-3 h-3 rounded-full transition-all duration-200 cursor-pointer ';
            
            if (isCurrent) {
              dotClass += 'w-4 h-4 bg-blue-600 ring-2 ring-blue-300';
            } else if (q.answered) {
              dotClass += q.correct 
                ? 'bg-green-500 hover:bg-green-600' 
                : 'bg-red-500 hover:bg-red-600';
            } else {
              dotClass += 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500';
            }

            return (
              <button
                key={index}
                onClick={() => setCurrentQuestionIndex(index)}
                className={dotClass}
                title={`Question ${index + 1}${q.answered ? (q.correct ? ' - Correct' : ' - Incorrect') : ' - Not answered'}`}
              />
            );
          })}
        </div>
      )}

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Current Question */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {currentQuestion.question}
          </h3>

          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrectOption = index === currentQuestion.correctAnswer;
              
              let buttonClass = 'w-full p-4 text-left border rounded-lg transition-all duration-200 ';
              
              if (hasAnswered) {
                if (isCorrectOption) {
                  buttonClass += 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-300';
                } else if (isSelected && !isCorrectOption) {
                  buttonClass += 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-300';
                } else {
                  buttonClass += 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300';
                }
              } else {
                if (isSelected) {
                  buttonClass += 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-300';
                } else {
                  buttonClass += 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/10';
                }
              }

              return (
                <button
                  key={index}
                  onClick={() => !hasAnswered && handleAnswerSelect(currentQuestion.id, index)}
                  disabled={hasAnswered}
                  className={buttonClass}
                >
                  <div className="flex items-center justify-between">
                    <span>{option}</span>
                    {hasAnswered && (
                      <span className="ml-2">
                        {isCorrectOption ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : isSelected ? (
                          <XCircle className="h-5 w-5 text-red-600" />
                        ) : null}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Submit/Results Section */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
            {!hasAnswered && selectedAnswer !== undefined ? (
              <button
                onClick={() => handleSubmitAnswer(currentQuestion.id)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Submit Answer
              </button>
            ) : hasAnswered ? (
              <div className="space-y-3">
                <div className={`p-3 rounded-lg ${isCorrect ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                  <div className="flex items-center space-x-2">
                    {isCorrect ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <span className={`font-medium ${isCorrect ? 'text-green-900 dark:text-green-300' : 'text-red-900 dark:text-red-300'}`}>
                      {isCorrect ? 'Correct!' : 'Incorrect'}
                    </span>
                  </div>
                </div>
                
                {currentQuestion.explanation && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        GPT Analysis
                      </span>
                      <button
                        onClick={() => toggleExplanation(currentQuestion.id)}
                        className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 transition-colors"
                      >
                        {showExplanation ? (
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
                    </div>
                    
                    {showExplanation && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-blue-900 dark:text-blue-300 text-sm">
                          <strong>Explanation:</strong> {currentQuestion.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center">
                Select an answer to continue
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevQuestion}
          disabled={currentQuestionIndex === 0}
          className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Previous</span>
        </button>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportResponses}
            disabled={userResponses.length === 0}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            title={userResponses.length === 0 ? "Answer questions to export responses" : "Export responses as CSV"}
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
          
          <button
            onClick={generateQuestions}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>New Questions</span>
          </button>
          
          {questions.length > 1 && (
            <button
              onClick={resetQuiz}
              className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              Reset Quiz
            </button>
          )}
        </div>

        <button
          onClick={nextQuestion}
          disabled={currentQuestionIndex === questions.length - 1}
          className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <span>Next</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Quick Navigation for Multiple Questions */}
      {questions.length > 2 && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-center">
            Quick Navigation
          </h3>
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {questions.map((question, index) => {
              const isAnswered = showResults[question.id];
              const isCurrent = index === currentQuestionIndex;
              const isCorrect = isAnswered && selectedAnswers[question.id] === question.correctAnswer;
              
              let buttonClass = 'w-10 h-10 rounded-lg text-sm font-medium transition-all duration-200 ';
              
              if (isCurrent) {
                buttonClass += 'bg-blue-600 text-white ring-2 ring-blue-300 scale-110';
              } else if (isAnswered) {
                buttonClass += isCorrect 
                  ? 'bg-green-500 text-white hover:bg-green-600' 
                  : 'bg-red-500 text-white hover:bg-red-600';
              } else {
                buttonClass += 'bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20';
              }
              
              return (
                <button
                  key={question.id}
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={buttonClass}
                  title={`Question ${index + 1}${isAnswered ? (isCorrect ? ' - Correct' : ' - Incorrect') : ' - Not answered'}`}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Quiz Summary */}
      {score.total > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
          <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Quiz Progress</h3>
          <div className="flex items-center justify-between text-sm">
            <span className="text-blue-700 dark:text-blue-400">
              Completed: {score.total} / {questions.length}
            </span>
            <span className="text-blue-700 dark:text-blue-400">
              Accuracy: {accuracyPercentage}%
            </span>
          </div>
          <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2 mt-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${accuracyPercentage}%` }}
            />
          </div>
          
          {/* Completion Status */}
          {score.total === questions.length && (
            <div className="mt-3 p-3 bg-white dark:bg-gray-700 rounded-lg">
              <div className="flex items-center justify-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-900 dark:text-green-300">
                  Quiz Completed!
                </span>
              </div>
              <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-1">
                Final Score: {score.correct}/{questions.length} ({accuracyPercentage}%)
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

// Custom prop comparison function for better memoization
QAPanel.displayName = 'QAPanel';

export default QAPanel;