'use client';

import React, { useState, useCallback, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Download, 
  BarChart3, 
  Clock, 
  Target, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Lightbulb,
  Trophy,
  Star,
  Timer,
  Brain,
  BookOpen,
  Volume2
} from 'lucide-react';
import { useQASystem } from '@/hooks/useQASystem';

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  timeLimit?: number;
}

interface QASessionData {
  totalQuestions: number;
  answeredQuestions: number;
  correctAnswers: number;
  totalTime: number;
  averageTime: number;
  accuracy: number;
  streak: number;
  maxStreak: number;
}

interface EnhancedQASystemProps {
  imageUrl: string;
  description: string;
  language?: 'es' | 'en';
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'mixed';
  questionCount?: number;
  timeLimit?: number;
  showHints?: boolean;
  allowSkip?: boolean;
  onSessionComplete?: (sessionData: QASessionData) => void;
  onQuestionAnswered?: (questionId: string, isCorrect: boolean, timeSpent: number) => void;
}

const EnhancedQASystemBase: React.FC<EnhancedQASystemProps> = ({
  imageUrl,
  description,
  language = 'es',
  difficulty = 'mixed',
  questionCount = 10,
  timeLimit = 30,
  showHints = true,
  allowSkip = false,
  onSessionComplete,
  onQuestionAnswered
}) => {
  const [sessionState, setSessionState] = useState<'setup' | 'active' | 'paused' | 'completed'>('setup');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(timeLimit);
  const [startTime, setStartTime] = useState<number>(0);
  const [sessionData, setSessionData] = useState<QASessionData>({
    totalQuestions: questionCount,
    answeredQuestions: 0,
    correctAnswers: 0,
    totalTime: 0,
    averageTime: 0,
    accuracy: 0,
    streak: 0,
    maxStreak: 0
  });
  const [showHint, setShowHint] = useState(false);
  const [questionAnswered, setQuestionAnswered] = useState(false);

  // Generate questions based on the image description
  const questions = useMemo<Question[]>(() => {
    const baseQuestions: Question[] = [
      {
        id: '1',
        question: language === 'es' 
          ? '¿Cuál es el elemento principal que se describe en la imagen?' 
          : 'What is the main element described in the image?',
        options: language === 'es'
          ? ['Un paisaje natural', 'Un edificio moderno', 'Una persona', 'Un objeto cotidiano']
          : ['A natural landscape', 'A modern building', 'A person', 'An everyday object'],
        correctAnswer: 0,
        explanation: language === 'es'
          ? 'La descripción indica principalmente elementos naturales en la imagen.'
          : 'The description primarily indicates natural elements in the image.',
        difficulty: 'beginner',
        category: 'comprehension',
        timeLimit
      },
      {
        id: '2',
        question: language === 'es'
          ? '¿Qué sentimiento evoca principalmente la imagen según la descripción?'
          : 'What feeling does the image primarily evoke according to the description?',
        options: language === 'es'
          ? ['Tranquilidad', 'Energía', 'Misterio', 'Nostalgia']
          : ['Tranquility', 'Energy', 'Mystery', 'Nostalgia'],
        correctAnswer: 0,
        explanation: language === 'es'
          ? 'Las descripciones suelen evocar sensaciones de tranquilidad en paisajes naturales.'
          : 'Descriptions usually evoke feelings of tranquility in natural landscapes.',
        difficulty: 'intermediate',
        category: 'interpretation',
        timeLimit
      },
      {
        id: '3',
        question: language === 'es'
          ? '¿Cuál sería la mejor traducción para el contexto de esta imagen?'
          : 'What would be the best translation for the context of this image?',
        options: language === 'es'
          ? ['Hermoso paisaje → Beautiful landscape', 'Ciudad moderna → Modern city', 'Vida urbana → Urban life', 'Arte contemporáneo → Contemporary art']
          : ['Beautiful landscape → Hermoso paisaje', 'Modern city → Ciudad moderna', 'Urban life → Vida urbana', 'Contemporary art → Arte contemporáneo'],
        correctAnswer: 0,
        explanation: language === 'es'
          ? 'La traducción debe reflejar el contexto visual de la imagen.'
          : 'The translation should reflect the visual context of the image.',
        difficulty: 'advanced',
        category: 'translation',
        timeLimit: timeLimit + 10
      }
    ];

    return baseQuestions.slice(0, questionCount);
  }, [description, language, questionCount, timeLimit]);

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const progress = ((currentQuestionIndex + (questionAnswered ? 1 : 0)) / questions.length) * 100;

  // Timer effect
  React.useEffect(() => {
    if (sessionState !== 'active' || questionAnswered) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Time's up - auto-answer incorrectly
          handleAnswerSubmit(null, true);
          return timeLimit;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionState, questionAnswered, timeLimit]);

  const startSession = useCallback(() => {
    setSessionState('active');
    setStartTime(Date.now());
    setTimeRemaining(timeLimit);
  }, [timeLimit]);

  const pauseSession = useCallback(() => {
    setSessionState('paused');
  }, []);

  const resumeSession = useCallback(() => {
    setSessionState('active');
  }, []);

  const resetSession = useCallback(() => {
    setSessionState('setup');
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setTimeRemaining(timeLimit);
    setSessionData({
      totalQuestions: questionCount,
      answeredQuestions: 0,
      correctAnswers: 0,
      totalTime: 0,
      averageTime: 0,
      accuracy: 0,
      streak: 0,
      maxStreak: 0
    });
    setShowHint(false);
    setQuestionAnswered(false);
  }, [questionCount, timeLimit]);

  const handleAnswerSelect = useCallback((answerIndex: number) => {
    if (questionAnswered) return;
    setSelectedAnswer(answerIndex);
  }, [questionAnswered]);

  const handleAnswerSubmit = useCallback((answer: number | null = selectedAnswer, timeUp = false) => {
    if (questionAnswered) return;

    const questionTime = timeLimit - timeRemaining;
    const isCorrect = answer === currentQuestion.correctAnswer;
    
    setQuestionAnswered(true);
    setShowExplanation(true);

    // Update session data
    setSessionData(prev => {
      const newAnsweredCount = prev.answeredQuestions + 1;
      const newCorrectCount = isCorrect ? prev.correctAnswers + 1 : prev.correctAnswers;
      const newStreak = isCorrect ? prev.streak + 1 : 0;
      const newMaxStreak = Math.max(prev.maxStreak, newStreak);
      const newTotalTime = prev.totalTime + questionTime;
      const newAverageTime = newTotalTime / newAnsweredCount;
      const accuracy = Math.round((newCorrectCount / newAnsweredCount) * 100);

      return {
        totalQuestions: prev.totalQuestions,
        answeredQuestions: newAnsweredCount,
        correctAnswers: newCorrectCount,
        totalTime: newTotalTime,
        averageTime: newAverageTime,
        accuracy,
        streak: newStreak,
        maxStreak: newMaxStreak
      };
    });

    // Call callback if provided
    if (onQuestionAnswered) {
      onQuestionAnswered(currentQuestion.id, isCorrect, questionTime);
    }
  }, [selectedAnswer, questionAnswered, timeLimit, timeRemaining, currentQuestion, onQuestionAnswered]);

  const handleNextQuestion = useCallback(() => {
    if (isLastQuestion) {
      // Complete session
      setSessionState('completed');
      if (onSessionComplete) {
        onSessionComplete(sessionData);
      }
    } else {
      // Move to next question
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setTimeRemaining(timeLimit);
      setShowHint(false);
      setQuestionAnswered(false);
    }
  }, [isLastQuestion, sessionData, onSessionComplete, timeLimit]);

  const handleSkipQuestion = useCallback(() => {
    if (!allowSkip) return;
    handleAnswerSubmit(null);
  }, [allowSkip, handleAnswerSubmit]);

  const toggleHint = useCallback(() => {
    setShowHint(prev => !prev);
  }, []);

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'beginner': return 'text-green-600 bg-green-100';
      case 'intermediate': return 'text-yellow-600 bg-yellow-100';
      case 'advanced': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTimeColor = (time: number, limit: number) => {
    const ratio = time / limit;
    if (ratio > 0.5) return 'text-green-600';
    if (ratio > 0.25) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Setup screen
  if (sessionState === 'setup') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center"
      >
        <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Brain className="h-10 w-10 text-blue-600" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          {language === 'es' ? 'Sistema de Preguntas Avanzado' : 'Advanced Q&A System'}
        </h2>
        
        <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
          {language === 'es' 
            ? `Responde ${questionCount} preguntas sobre la imagen. Cada pregunta tiene ${timeLimit} segundos.`
            : `Answer ${questionCount} questions about the image. Each question has ${timeLimit} seconds.`
          }
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6 max-w-md mx-auto">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <div className="text-2xl font-bold text-blue-600">{questionCount}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {language === 'es' ? 'Preguntas' : 'Questions'}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <div className="text-2xl font-bold text-green-600">{timeLimit}s</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {language === 'es' ? 'Por pregunta' : 'Per question'}
            </div>
          </div>
        </div>

        <motion.button
          onClick={startSession}
          className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium mx-auto"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Play className="h-5 w-5" />
          {language === 'es' ? 'Comenzar Quiz' : 'Start Quiz'}
        </motion.button>
      </motion.div>
    );
  }

  // Completed screen
  if (sessionState === 'completed') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-6"
      >
        {/* Results Header */}
        <div className="bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-xl p-8 text-center">
          <Trophy className="h-16 w-16 mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-2">
            {language === 'es' ? '¡Quiz Completado!' : 'Quiz Complete!'}
          </h2>
          <p className="text-xl opacity-90">
            {sessionData.accuracy}% {language === 'es' ? 'de precisión' : 'accuracy'}
          </p>
        </div>

        {/* Detailed Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
            <Target className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {sessionData.correctAnswers}/{sessionData.totalQuestions}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {language === 'es' ? 'Correctas' : 'Correct'}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
            <Clock className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {Math.round(sessionData.averageTime)}s
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {language === 'es' ? 'Promedio' : 'Average'}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
            <Star className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {sessionData.maxStreak}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {language === 'es' ? 'Mejor Racha' : 'Best Streak'}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
            <Timer className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {Math.round(sessionData.totalTime)}s
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {language === 'es' ? 'Total' : 'Total'}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-center gap-4">
          <motion.button
            onClick={resetSession}
            className="flex items-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RotateCcw className="h-4 w-4" />
            {language === 'es' ? 'Nuevo Quiz' : 'New Quiz'}
          </motion.button>

          <motion.button
            onClick={() => {/* Export functionality */}}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Download className="h-4 w-4" />
            {language === 'es' ? 'Exportar' : 'Export'}
          </motion.button>
        </div>
      </motion.div>
    );
  }

  // Active/Paused session
  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {language === 'es' ? 'Pregunta' : 'Question'} {currentQuestionIndex + 1} {language === 'es' ? 'de' : 'of'} {questions.length}
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(currentQuestion.difficulty)}`}>
              {currentQuestion.difficulty}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 ${getTimeColor(timeRemaining, timeLimit)}`}>
              <Timer className="h-4 w-4" />
              <span className="font-mono text-lg font-bold">{timeRemaining}s</span>
            </div>

            {sessionState === 'active' ? (
              <button onClick={pauseSession} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <Pause className="h-4 w-4" />
              </button>
            ) : (
              <button onClick={resumeSession} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <Play className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <motion.div 
            className="bg-blue-600 h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {/* Stats */}
        <div className="flex justify-between mt-4 text-sm text-gray-600 dark:text-gray-400">
          <span>{sessionData.accuracy}% {language === 'es' ? 'precisión' : 'accuracy'}</span>
          <span>{language === 'es' ? 'Racha' : 'Streak'}: {sessionData.streak}</span>
        </div>
      </div>

      {/* Question Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestionIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
        >
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                {currentQuestion.question}
              </h3>

              {showHints && (
                <div className="mb-4">
                  <button
                    onClick={toggleHint}
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                  >
                    <Lightbulb className="h-4 w-4" />
                    {showHint ? (language === 'es' ? 'Ocultar pista' : 'Hide hint') : (language === 'es' ? 'Mostrar pista' : 'Show hint')}
                  </button>
                  
                  <AnimatePresence>
                    {showHint && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
                      >
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          {language === 'es' 
                            ? 'Piensa en el contexto de la imagen y las palabras clave en la descripción.'
                            : 'Think about the image context and key words in the description.'
                          }
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Answer Options */}
            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => {
                const isSelected = selectedAnswer === index;
                const isCorrect = index === currentQuestion.correctAnswer;
                const showResult = questionAnswered;

                let buttonClass = 'w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ';
                
                if (showResult) {
                  if (isCorrect) {
                    buttonClass += 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200';
                  } else if (isSelected && !isCorrect) {
                    buttonClass += 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200';
                  } else {
                    buttonClass += 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700';
                  }
                } else {
                  if (isSelected) {
                    buttonClass += 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
                  } else {
                    buttonClass += 'border-gray-200 dark:border-gray-600 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/10';
                  }
                }

                return (
                  <motion.button
                    key={index}
                    onClick={() => handleAnswerSelect(index)}
                    disabled={questionAnswered || sessionState !== 'active'}
                    className={buttonClass}
                    whileHover={{ scale: questionAnswered ? 1 : 1.02 }}
                    whileTap={{ scale: questionAnswered ? 1 : 0.98 }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex-1">{option}</span>
                      {showResult && (
                        <div>
                          {isCorrect && <CheckCircle className="h-5 w-5 text-green-600" />}
                          {isSelected && !isCorrect && <XCircle className="h-5 w-5 text-red-600" />}
                        </div>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between">
              <div className="flex gap-2">
                {allowSkip && !questionAnswered && (
                  <button
                    onClick={handleSkipQuestion}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    {language === 'es' ? 'Saltar' : 'Skip'}
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                {!questionAnswered ? (
                  <motion.button
                    onClick={() => handleAnswerSubmit()}
                    disabled={selectedAnswer === null || sessionState !== 'active'}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {language === 'es' ? 'Confirmar' : 'Submit'}
                  </motion.button>
                ) : (
                  <motion.button
                    onClick={handleNextQuestion}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {isLastQuestion 
                      ? (language === 'es' ? 'Finalizar' : 'Finish')
                      : (language === 'es' ? 'Siguiente' : 'Next')
                    }
                  </motion.button>
                )}
              </div>
            </div>

            {/* Explanation */}
            <AnimatePresence>
              {showExplanation && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="border-t border-gray-200 dark:border-gray-600 pt-4"
                >
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <BookOpen className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                          {language === 'es' ? 'Explicación' : 'Explanation'}
                        </h4>
                        <p className="text-gray-600 dark:text-gray-400">
                          {currentQuestion.explanation}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export const EnhancedQASystem = memo(EnhancedQASystemBase);
export default EnhancedQASystem;