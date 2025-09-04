'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { QAGeneration } from '@/types/api';
import { QASessionData, QAUserResponse, QAExporter } from '@/lib/export/qaExporter';

export interface QASystemState {
  // Session data
  sessionId: string;
  questions: QAGeneration[];
  currentIndex: number;
  
  // User interactions
  userResponses: QAUserResponse[];
  selectedAnswers: Record<number, string>;
  answerRevealed: Record<number, boolean>;
  confidence: Record<number, number>;
  
  // Session tracking
  sessionStartTime: Date;
  questionStartTime: Date | null;
  timeSpent: Record<number, number>;
  
  // Progress tracking
  answeredQuestions: boolean[];
  correctAnswers: boolean[];
  currentStreak: number;
  maxStreak: number;
  
  // System state
  isLoading: boolean;
  error: string | null;
  isSessionComplete: boolean;
}

export interface QASystemConfig {
  autoAdvance?: boolean; // Auto advance to next question after answering
  showConfidenceSlider?: boolean;
  allowHints?: boolean;
  timeLimit?: number; // per question in seconds
  shuffleQuestions?: boolean;
  shuffleAnswers?: boolean;
}

export interface UseQASystemProps {
  imageUrl: string;
  description: string;
  language?: 'es' | 'en';
  questionCount?: number;
  config?: QASystemConfig;
  onSessionComplete?: (sessionData: QASessionData) => void;
  onQuestionAnswered?: (response: QAUserResponse) => void;
}

export const useQASystem = ({
  imageUrl,
  description,
  language = 'es',
  questionCount = 5,
  config = {},
  onSessionComplete,
  onQuestionAnswered
}: UseQASystemProps) => {
  const [state, setState] = useState<QASystemState>(() => ({
    sessionId: `qa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    questions: [],
    currentIndex: 0,
    userResponses: [],
    selectedAnswers: {},
    answerRevealed: {},
    confidence: {},
    sessionStartTime: new Date(),
    questionStartTime: null,
    timeSpent: {},
    answeredQuestions: [],
    correctAnswers: [],
    currentStreak: 0,
    maxStreak: 0,
    isLoading: true,
    error: null,
    isSessionComplete: false
  }));

  const timeoutRef = useRef<NodeJS.Timeout>();

  /**
   * Generate Q&A pairs from description
   */
  const generateQuestions = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await fetch('/api/qa/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          language,
          count: questionCount
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to generate Q&A: ${response.status}`);
      }

      const data = await response.json();
      let questions: QAGeneration[] = data.questions || [];

      // Shuffle questions if configured
      if (config.shuffleQuestions) {
        questions = [...questions].sort(() => Math.random() - 0.5);
      }

      // Convert questions to include answer options if needed
      const processedQuestions = questions.map((q, index) => ({
        ...q,
        id: `q_${index}_${Date.now()}`,
        options: generateAnswerOptions(q, questions) // Generate multiple choice options
      }));

      setState(prev => ({
        ...prev,
        questions: processedQuestions,
        answeredQuestions: new Array(processedQuestions.length).fill(false),
        correctAnswers: new Array(processedQuestions.length).fill(false),
        isLoading: false,
        questionStartTime: new Date()
      }));

    } catch (error) {
      console.error('Error generating Q&A:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false
      }));
    }
  }, [description, language, questionCount, config.shuffleQuestions]);

  /**
   * Generate multiple choice options from Q&A data
   */
  const generateAnswerOptions = (currentQ: QAGeneration, allQuestions: QAGeneration[]) => {
    const options = [
      { id: 'correct', text: currentQ.answer, correct: true }
    ];

    // Generate plausible wrong answers from other questions or variations
    const otherAnswers = allQuestions
      .filter(q => q !== currentQ)
      .map(q => q.answer)
      .slice(0, 2);

    // Add wrong options
    otherAnswers.forEach((answer, index) => {
      options.push({
        id: `wrong_${index}`,
        text: answer,
        correct: false
      });
    });

    // Add one generic wrong answer if we don't have enough
    if (options.length < 4) {
      const genericWrong = language === 'es' 
        ? 'No se puede determinar con la información proporcionada'
        : 'Cannot be determined from the given information';
      options.push({
        id: 'generic_wrong',
        text: genericWrong,
        correct: false
      });
    }

    // Shuffle options if configured
    if (config.shuffleAnswers) {
      return options.sort(() => Math.random() - 0.5);
    }

    return options;
  };

  /**
   * Select an answer for the current question
   */
  const selectAnswer = useCallback((answerId: string) => {
    const currentQuestionIndex = state.currentIndex;
    
    setState(prev => ({
      ...prev,
      selectedAnswers: {
        ...prev.selectedAnswers,
        [currentQuestionIndex]: answerId
      }
    }));
  }, [state.currentIndex]);

  /**
   * Set confidence level for current question
   */
  const setConfidence = useCallback((confidence: number) => {
    const currentQuestionIndex = state.currentIndex;
    
    setState(prev => ({
      ...prev,
      confidence: {
        ...prev.confidence,
        [currentQuestionIndex]: confidence
      }
    }));
  }, [state.currentIndex]);

  /**
   * Submit answer for current question
   */
  const submitAnswer = useCallback(() => {
    const currentQuestionIndex = state.currentIndex;
    const selectedAnswerId = state.selectedAnswers[currentQuestionIndex];
    
    if (!selectedAnswerId) return;

    const currentQuestion = state.questions[currentQuestionIndex];
    const selectedOption = currentQuestion.options?.find(opt => opt.id === selectedAnswerId);
    const isCorrect = selectedOption?.correct || false;
    
    // Calculate time spent
    const timeSpent = state.questionStartTime 
      ? Math.round((Date.now() - state.questionStartTime.getTime()) / 1000)
      : 0;

    // Create user response
    const userResponse: QAUserResponse = {
      questionIndex: currentQuestionIndex,
      questionId: currentQuestion.id || `q_${currentQuestionIndex}`,
      question: currentQuestion.question,
      correctAnswer: currentQuestion.answer,
      userAnswer: selectedOption?.text || '',
      isCorrect,
      confidence: state.confidence[currentQuestionIndex],
      timeSpent,
      hintsUsed: 0, // TODO: implement hints tracking
      timestamp: new Date().toISOString(),
      difficulty: currentQuestion.difficulty,
      category: currentQuestion.category
    };

    // Update streak
    const newStreak = isCorrect ? state.currentStreak + 1 : 0;
    const newMaxStreak = Math.max(state.maxStreak, newStreak);

    setState(prev => {
      const newAnsweredQuestions = [...prev.answeredQuestions];
      const newCorrectAnswers = [...prev.correctAnswers];
      const newUserResponses = [...prev.userResponses, userResponse];
      
      newAnsweredQuestions[currentQuestionIndex] = true;
      newCorrectAnswers[currentQuestionIndex] = isCorrect;

      return {
        ...prev,
        userResponses: newUserResponses,
        answeredQuestions: newAnsweredQuestions,
        correctAnswers: newCorrectAnswers,
        currentStreak: newStreak,
        maxStreak: newMaxStreak,
        timeSpent: {
          ...prev.timeSpent,
          [currentQuestionIndex]: timeSpent
        }
      };
    });

    // Call callback
    onQuestionAnswered?.(userResponse);

    // Auto-advance if configured
    if (config.autoAdvance && currentQuestionIndex < state.questions.length - 1) {
      setTimeout(() => goToNext(), 1500); // Small delay to show feedback
    }
  }, [state, config.autoAdvance, onQuestionAnswered]);

  /**
   * Navigate to specific question
   */
  const goToQuestion = useCallback((index: number) => {
    if (index >= 0 && index < state.questions.length) {
      setState(prev => ({
        ...prev,
        currentIndex: index,
        questionStartTime: new Date()
      }));
    }
  }, [state.questions.length]);

  /**
   * Navigate to previous question
   */
  const goToPrevious = useCallback(() => {
    if (state.currentIndex > 0) {
      goToQuestion(state.currentIndex - 1);
    }
  }, [state.currentIndex, goToQuestion]);

  /**
   * Navigate to next question
   */
  const goToNext = useCallback(() => {
    const nextIndex = state.currentIndex + 1;
    
    if (nextIndex < state.questions.length) {
      goToQuestion(nextIndex);
    } else {
      // Session complete
      completeSession();
    }
  }, [state.currentIndex, state.questions.length, goToQuestion]);

  /**
   * Complete the Q&A session
   */
  const completeSession = useCallback(() => {
    const sessionData: QASessionData = {
      sessionId: state.sessionId,
      imageUrl,
      description,
      language,
      questions: state.questions,
      userResponses: state.userResponses,
      sessionMetadata: {
        startTime: state.sessionStartTime.toISOString(),
        endTime: new Date().toISOString(),
        totalTime: Math.round((Date.now() - state.sessionStartTime.getTime()) / 1000),
        score: state.userResponses.filter(r => r.isCorrect).length,
        accuracy: state.userResponses.length > 0 
          ? (state.userResponses.filter(r => r.isCorrect).length / state.userResponses.length) * 100 
          : 0,
        streak: state.maxStreak
      }
    };

    setState(prev => ({ ...prev, isSessionComplete: true }));
    onSessionComplete?.(sessionData);
  }, [state, imageUrl, description, language, onSessionComplete]);

  /**
   * Reveal answer for current question
   */
  const revealAnswer = useCallback((questionIndex?: number) => {
    const index = questionIndex ?? state.currentIndex;
    
    setState(prev => ({
      ...prev,
      answerRevealed: {
        ...prev.answerRevealed,
        [index]: true
      }
    }));
  }, [state.currentIndex]);

  /**
   * Hide answer for current question
   */
  const hideAnswer = useCallback((questionIndex?: number) => {
    const index = questionIndex ?? state.currentIndex;
    
    setState(prev => ({
      ...prev,
      answerRevealed: {
        ...prev.answerRevealed,
        [index]: false
      }
    }));
  }, [state.currentIndex]);

  /**
   * Reset the entire session
   */
  const resetSession = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentIndex: 0,
      userResponses: [],
      selectedAnswers: {},
      answerRevealed: {},
      confidence: {},
      sessionStartTime: new Date(),
      questionStartTime: new Date(),
      timeSpent: {},
      answeredQuestions: new Array(prev.questions.length).fill(false),
      correctAnswers: new Array(prev.questions.length).fill(false),
      currentStreak: 0,
      maxStreak: 0,
      isSessionComplete: false
    }));
  }, []);

  /**
   * Export session data to CSV
   */
  const exportToCSV = useCallback((includeDetails = true) => {
    const sessionData: QASessionData = {
      sessionId: state.sessionId,
      imageUrl,
      description,
      language,
      questions: state.questions,
      userResponses: state.userResponses,
      sessionMetadata: {
        startTime: state.sessionStartTime.toISOString(),
        endTime: new Date().toISOString(),
        totalTime: Math.round((Date.now() - state.sessionStartTime.getTime()) / 1000),
        score: state.userResponses.filter(r => r.isCorrect).length,
        accuracy: state.userResponses.length > 0 
          ? (state.userResponses.filter(r => r.isCorrect).length / state.userResponses.length) * 100 
          : 0,
        streak: state.maxStreak
      }
    };

    QAExporter.downloadCSV(sessionData, includeDetails);
  }, [state, imageUrl, description, language]);

  /**
   * Get learning insights
   */
  const getLearningInsights = useCallback(() => {
    const sessionData: QASessionData = {
      sessionId: state.sessionId,
      imageUrl,
      description, 
      language,
      questions: state.questions,
      userResponses: state.userResponses,
      sessionMetadata: {
        startTime: state.sessionStartTime.toISOString(),
        endTime: new Date().toISOString(),
        totalTime: Math.round((Date.now() - state.sessionStartTime.getTime()) / 1000),
        score: state.userResponses.filter(r => r.isCorrect).length,
        accuracy: state.userResponses.length > 0 
          ? (state.userResponses.filter(r => r.isCorrect).length / state.userResponses.length) * 100 
          : 0,
        streak: state.maxStreak
      }
    };

    return QAExporter.generateLearningInsights(sessionData);
  }, [state, imageUrl, description, language]);

  // Initialize questions when component mounts or dependencies change
  useEffect(() => {
    if (description && imageUrl) {
      generateQuestions();
    }
  }, [generateQuestions]);

  // Time limit handling
  useEffect(() => {
    if (config.timeLimit && state.questionStartTime && !state.answeredQuestions[state.currentIndex]) {
      const timeout = setTimeout(() => {
        // Auto-submit with no answer if time runs out
        submitAnswer();
      }, config.timeLimit * 1000);

      timeoutRef.current = timeout;
      return () => clearTimeout(timeout);
    }
  }, [state.currentIndex, state.questionStartTime, state.answeredQuestions, config.timeLimit, submitAnswer]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const currentQuestion = state.questions[state.currentIndex];
  const isCurrentAnswered = state.answeredQuestions[state.currentIndex];
  const isCurrentCorrect = state.correctAnswers[state.currentIndex];
  const selectedAnswer = state.selectedAnswers[state.currentIndex];
  const isAnswerRevealed = state.answerRevealed[state.currentIndex];
  const currentConfidence = state.confidence[state.currentIndex];

  // Calculate session statistics
  const totalAnswered = state.userResponses.length;
  const totalCorrect = state.userResponses.filter(r => r.isCorrect).length;
  const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
  const averageTimePerQuestion = totalAnswered > 0 
    ? Object.values(state.timeSpent).reduce((a, b) => a + b, 0) / totalAnswered 
    : 0;

  return {
    // State
    ...state,
    currentQuestion,
    isCurrentAnswered,
    isCurrentCorrect,
    selectedAnswer,
    isAnswerRevealed,
    currentConfidence,
    
    // Statistics
    totalAnswered,
    totalCorrect,
    accuracy,
    averageTimePerQuestion,
    
    // Actions
    selectAnswer,
    setConfidence,
    submitAnswer,
    goToQuestion,
    goToPrevious,
    goToNext,
    revealAnswer,
    hideAnswer,
    resetSession,
    completeSession,
    exportToCSV,
    getLearningInsights,
    
    // Utility
    canGoPrevious: state.currentIndex > 0,
    canGoNext: state.currentIndex < state.questions.length - 1,
    hasSelectedAnswer: selectedAnswer !== undefined,
    canSubmit: selectedAnswer !== undefined && !isCurrentAnswered,
    progressPercentage: ((state.currentIndex + 1) / state.questions.length) * 100
  };
};

export default useQASystem;