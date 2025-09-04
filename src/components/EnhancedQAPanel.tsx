'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Settings, Download, RefreshCw, Target, Clock, Award } from 'lucide-react';

// Import our new components
import { QuestionNavigator } from './QuestionNavigator';
import { AnswerInput } from './AnswerInput';
import { ShowAnswer } from './ShowAnswer';
import { QuestionCounter } from './QuestionCounter';

// Import export utilities
import QAExporter, { 
  type QASessionData,
  type QAUserResponse
} from '../lib/export/qaExporter';
import { getCurrentTimestamp } from '../lib/export/csvExporter';

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  hints?: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  type: 'comprehension' | 'vocabulary' | 'detail' | 'inference';
  language: 'en' | 'es';
}

interface EnhancedQAPanelProps {
  selectedImage: any;
  descriptionText: string | null;
  style: 'narrativo' | 'poetico' | 'academico' | 'conversacional' | 'infantil';
  language?: 'en' | 'es' | 'both';
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  onStyleChange?: (style: string) => void;
}

interface SessionState {
  sessionId: string;
  startTime: string;
  responses: QAUserResponse[];
  timeSpent: number;
  streak: number;
}

export const EnhancedQAPanel: React.FC<EnhancedQAPanelProps> = ({
  selectedImage,
  descriptionText,
  style,
  language = 'both',
  difficulty = 'intermediate',
  onStyleChange
}) => {
  // Core state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Answer state
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: string]: string }>({});
  const [submittedAnswers, setSubmittedAnswers] = useState<{ [key: string]: boolean }>({});
  const [showAnswers, setShowAnswers] = useState<{ [key: string]: boolean }>({});
  const [confidenceScores, setConfidenceScores] = useState<{ [key: string]: number }>({});
  
  // Session state
  const [session, setSession] = useState<SessionState>({
    sessionId: `qa_${Date.now()}`,
    startTime: getCurrentTimestamp(),
    responses: [],
    timeSpent: 0,
    streak: 0
  });
  
  // Settings state
  const [settings, setSettings] = useState({
    questionCount: 5,
    includeHints: true,
    autoRevealAnswers: false,
    timeLimit: 0, // 0 = no limit
    difficulty: difficulty,
    language: language
  });
  
  const [showSettings, setShowSettings] = useState(false);

  // Generate questions
  const generateQuestions = useCallback(async () => {
    if (!selectedImage || !descriptionText) return;

    setLoading(true);
    setError(null);
    setQuestions([]);
    setCurrentIndex(0);
    setSelectedAnswers({});
    setSubmittedAnswers({});
    setShowAnswers({});
    setConfidenceScores({});

    // Reset session
    setSession({
      sessionId: `qa_${Date.now()}`,
      startTime: getCurrentTimestamp(),
      responses: [],
      timeSpent: 0,
      streak: 0
    });

    try {
      const response = await fetch('/api/qa/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: selectedImage.urls?.regular,
          descriptionText: descriptionText,
          style: style,
          difficulty: settings.difficulty,
          questionCount: settings.questionCount,
          includeSpanish: settings.language === 'both' || settings.language === 'es',
          language: settings.language
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.data?.questions) {
        // Convert API response to our question format
        const formattedQuestions: Question[] = data.data.questions.map((q: any) => 
          createMultipleChoiceFromAnswer(q, q.question)
        );
        setQuestions(formattedQuestions);
      } else {
        throw new Error(data.message || 'Failed to generate questions');
      }
    } catch (err) {
      console.error('Error generating questions:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate questions');
    } finally {
      setLoading(false);
    }
  }, [selectedImage, descriptionText, style, settings]);

  // Create multiple choice question from API response
  const createMultipleChoiceFromAnswer = useCallback((apiQuestion: any, questionText: string): Question => {
    const answer = apiQuestion.answer;
    
    // Generate plausible incorrect options based on question type
    let options: string[] = [];
    const questionType = detectQuestionType(questionText);
    
    options = generateOptionsForQuestion(questionText, answer, questionType);
    
    // Shuffle options and track correct answer
    let correctAnswer = 0;
    const shuffledOptions = [...options];
    for (let i = shuffledOptions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
      
      if (j === correctAnswer) {
        correctAnswer = i;
      } else if (i === correctAnswer) {
        correctAnswer = j;
      }
    }

    return {
      id: apiQuestion.id || `q_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      question: questionText,
      options: shuffledOptions,
      correctAnswer,
      explanation: `Based on the image analysis: ${answer}`,
      hints: generateHintsForQuestion(questionText, answer),
      difficulty: apiQuestion.difficulty || settings.difficulty,
      type: apiQuestion.type || questionType,
      language: apiQuestion.language || 'en'
    };
  }, [settings.difficulty]);

  // Detect question type from text
  const detectQuestionType = (question: string): Question['type'] => {
    const lowerQ = question.toLowerCase();
    if (lowerQ.includes('color') || lowerQ.includes('detail') || lowerQ.includes('see')) return 'detail';
    if (lowerQ.includes('mean') || lowerQ.includes('definition') || lowerQ.includes('word')) return 'vocabulary';
    if (lowerQ.includes('why') || lowerQ.includes('infer') || lowerQ.includes('suggest')) return 'inference';
    return 'comprehension';
  };

  // Generate options for different question types
  const generateOptionsForQuestion = (question: string, correctAnswer: string, type: Question['type']) => {
    const options = [correctAnswer];
    
    // Add generic distractors based on question type
    switch (type) {
      case 'detail':
        options.push(
          'The image shows a completely different scene',
          'This detail is not visible in the image',
          'The opposite of what is actually shown'
        );
        break;
      case 'vocabulary':
        options.push(
          'This word has a completely different meaning',
          'This is not a Spanish/English word',
          'The definition is unrelated to the context'
        );
        break;
      case 'inference':
        options.push(
          'The opposite conclusion can be drawn',
          'No inference is possible from this image',
          'This suggests something entirely different'
        );
        break;
      default: // comprehension
        options.push(
          'This shows a completely different activity',
          'The comprehension is not related to the image',
          'This interpretation is incorrect'
        );
    }
    
    return options;
  };

  // Generate hints for questions
  const generateHintsForQuestion = (question: string, answer: string): string[] => {
    return [
      'Look carefully at the main elements in the image',
      'Consider the context and setting of the scene',
      'Think about what the description tells us about this image'
    ];
  };

  // Handle answer selection
  const handleAnswerSelect = useCallback((questionId: string, answerId: string) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: answerId
    }));
  }, []);

  // Handle answer submission
  const handleSubmitAnswer = useCallback((questionId: string) => {
    const question = questions.find(q => q.id === questionId);
    if (!question) return;

    const selectedAnswerIndex = parseInt(selectedAnswers[questionId] || '0');
    const isCorrect = selectedAnswerIndex === question.correctAnswer;
    const confidence = confidenceScores[questionId] || 50;
    
    // Create response record
    const response: QAUserResponse = {
      questionIndex: questions.findIndex(q => q.id === questionId),
      questionId: questionId,
      question: question.question,
      correctAnswer: question.options[question.correctAnswer],
      userAnswer: question.options[selectedAnswerIndex] || 'No answer selected',
      isCorrect: isCorrect,
      confidence: confidence,
      timeSpent: 0, // Could be tracked with timer
      hintsUsed: 0,
      timestamp: getCurrentTimestamp(),
      difficulty: question.difficulty === 'beginner' ? 'facil' : 
                 question.difficulty === 'intermediate' ? 'medio' : 'dificil',
      category: 'general'
    };

    // Update session
    setSession(prev => ({
      ...prev,
      responses: [...prev.responses, response],
      streak: isCorrect ? prev.streak + 1 : 0
    }));

    setSubmittedAnswers(prev => ({
      ...prev,
      [questionId]: true
    }));

    // Auto-reveal answer if setting enabled
    if (settings.autoRevealAnswers) {
      setShowAnswers(prev => ({
        ...prev,
        [questionId]: true
      }));
    }
  }, [questions, selectedAnswers, confidenceScores, selectedImage, settings.autoRevealAnswers]);

  // Handle confidence change
  const handleConfidenceChange = useCallback((questionId: string, confidence: number) => {
    setConfidenceScores(prev => ({
      ...prev,
      [questionId]: confidence
    }));
  }, []);

  // Export functions
  const handleExportResponses = useCallback(() => {
    if (session.responses.length === 0) {
      alert('No responses to export. Please answer some questions first.');
      return;
    }
    // Create session data for export
    const sessionData: QASessionData = {
      sessionId: session.sessionId,
      imageUrl: selectedImage?.urls?.regular || '',
      description: descriptionText || '',
      language: 'es',
      questions: questions.map((q, idx) => ({ 
        id: q.id || `q_${idx}`, 
        question: q.question, 
        answer: q.options[q.correctAnswer],
        options: q.options, 
        correctAnswer: q.correctAnswer,
        difficulty: q.difficulty === 'beginner' ? 'facil' : 
                    q.difficulty === 'intermediate' ? 'medio' : 'dificil',
        category: 'general'
      })),
      userResponses: session.responses,
      sessionMetadata: {
        startTime: session.startTime,
        endTime: getCurrentTimestamp(),
        totalTime: session.timeSpent,
        score: (session.responses.filter(r => r.isCorrect).length / session.responses.length) * 100,
        accuracy: (session.responses.filter(r => r.isCorrect).length / session.responses.length) * 100,
        streak: session.streak
      }
    };
    
    const csvData = QAExporter.exportToCSV(sessionData);
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qa_session_${session.sessionId}_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [session.responses]);

  const handleExportSession = useCallback(() => {
    const qaSession: QASessionData = {
      sessionId: session.sessionId,
      imageUrl: selectedImage?.urls?.regular || '',
      description: descriptionText || '',
      language: 'es',
      questions: questions.map((q, idx) => ({ 
        id: q.id || `q_${idx}`, 
        question: q.question, 
        answer: q.options[q.correctAnswer],
        options: q.options, 
        correctAnswer: q.correctAnswer,
        difficulty: q.difficulty === 'beginner' ? 'facil' : 
                    q.difficulty === 'intermediate' ? 'medio' : 'dificil',
        category: 'general'
      })),
      userResponses: session.responses,
      sessionMetadata: {
        startTime: session.startTime,
        endTime: getCurrentTimestamp(),
        totalTime: session.timeSpent,
        score: session.responses.filter(r => r.isCorrect).length,
        accuracy: session.responses.length > 0 
          ? (session.responses.filter(r => r.isCorrect).length / session.responses.length) * 100
          : 0,
        streak: session.streak
      }
    };
    
    const csvData = QAExporter.exportToCSV(qaSession);
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qa_session_full_${session.sessionId}_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [session, questions, selectedImage, descriptionText]);

  // Computed values
  const currentQuestion = questions[currentIndex];
  const answeredQuestions = new Set(questions.map((q, index) => submittedAnswers[q.id] ? index : -1).filter(i => i !== -1));
  const correctAnswers = new Set(questions.map((q, index) => {
    if (!submittedAnswers[q.id]) return -1;
    const selectedIndex = parseInt(selectedAnswers[q.id] || '0');
    return selectedIndex === q.correctAnswer ? index : -1;
  }).filter(i => i !== -1));
  
  const stats = useMemo(() => {
    const answered = session.responses.length;
    const correct = session.responses.filter(r => r.isCorrect).length;
    const accuracy = answered > 0 ? (correct / answered) * 100 : 0;
    
    return {
      answered,
      correct,
      accuracy,
      remaining: questions.length - currentIndex - 1
    };
  }, [session.responses, questions.length, currentIndex]);

  // Effects
  useEffect(() => {
    if (selectedImage && descriptionText) {
      generateQuestions();
    }
  }, [selectedImage, descriptionText, generateQuestions]);

  // Render loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Enhanced Q&A System</h2>
          <div className="text-blue-600 animate-pulse">Generating questions...</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="space-y-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-12 bg-gray-100 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Enhanced Q&A System</h2>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
          <div className="text-red-600 font-medium">Error: {error}</div>
          <button
            onClick={generateQuestions}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Render empty state
  if (!selectedImage || !descriptionText) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Enhanced Q&A System</h2>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            Select an image and generate a description to start the Q&A session.
          </p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Enhanced Q&A System</h2>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm text-center">
          <button
            onClick={generateQuestions}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 mx-auto"
          >
            <Target className="h-5 w-5" />
            <span>Generate Questions</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Enhanced Q&A System</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Settings"
          >
            <Settings className="h-5 w-5" />
          </button>
          <button
            onClick={handleExportResponses}
            disabled={session.responses.length === 0}
            className="p-2 text-orange-600 hover:text-orange-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20"
            title="Export Responses"
          >
            <Download className="h-5 w-5" />
          </button>
          <button
            onClick={generateQuestions}
            className="p-2 text-blue-600 hover:text-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
            title="Regenerate Questions"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <h3 className="font-semibold mb-4">Q&A Settings</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Question Count</label>
              <select
                value={settings.questionCount}
                onChange={(e) => setSettings(prev => ({ ...prev, questionCount: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value={3}>3 Questions</option>
                <option value={5}>5 Questions</option>
                <option value={8}>8 Questions</option>
                <option value={10}>10 Questions</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Difficulty</label>
              <select
                value={settings.difficulty}
                onChange={(e) => setSettings(prev => ({ ...prev, difficulty: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Language</label>
              <select
                value={settings.language}
                onChange={(e) => setSettings(prev => ({ ...prev, language: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="both">Both Languages</option>
                <option value="en">English Only</option>
                <option value="es">Spanish Only</option>
              </select>
            </div>
            <div>
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={settings.includeHints}
                  onChange={(e) => setSettings(prev => ({ ...prev, includeHints: e.target.checked }))}
                  className="rounded"
                />
                <span>Include Hints</span>
              </label>
              <label className="flex items-center space-x-2 text-sm mt-2">
                <input
                  type="checkbox"
                  checked={settings.autoRevealAnswers}
                  onChange={(e) => setSettings(prev => ({ ...prev, autoRevealAnswers: e.target.checked }))}
                  className="rounded"
                />
                <span>Auto-reveal Answers</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Question Counter */}
      <QuestionCounter
        currentIndex={currentIndex}
        totalQuestions={questions.length}
        answeredCount={stats.answered}
        correctCount={stats.correct}
        streak={session.streak}
        sessionScore={{
          percentage: Math.round(stats.accuracy),
          grade: stats.accuracy >= 90 ? 'A+' : stats.accuracy >= 80 ? 'A' : stats.accuracy >= 70 ? 'B' : stats.accuracy >= 60 ? 'C' : 'D'
        }}
      />

      {/* Navigation */}
      <QuestionNavigator
        currentIndex={currentIndex}
        totalQuestions={questions.length}
        onPrevious={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
        onNext={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))}
        onGoToQuestion={setCurrentIndex}
        onReset={() => {
          setSelectedAnswers({});
          setSubmittedAnswers({});
          setShowAnswers({});
          setCurrentIndex(0);
          setSession(prev => ({ ...prev, responses: [], streak: 0 }));
        }}
        answeredQuestions={answeredQuestions}
        correctAnswers={correctAnswers}
      />

      {/* Current Question */}
      {currentQuestion && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-xl font-semibold mb-6">{currentQuestion.question}</h3>
          
          <AnswerInput
            questionId={currentQuestion.id}
            options={currentQuestion.options.map((option, index) => ({
              id: index.toString(),
              text: option,
              correct: index === currentQuestion.correctAnswer
            }))}
            selectedAnswer={selectedAnswers[currentQuestion.id] || null}
            isSubmitted={submittedAnswers[currentQuestion.id] || false}
            isCorrect={correctAnswers.has(currentIndex)}
            onAnswerSelect={(answerId) => handleAnswerSelect(currentQuestion.id, answerId)}
            onSubmit={() => handleSubmitAnswer(currentQuestion.id)}
            onConfidenceChange={(confidence) => handleConfidenceChange(currentQuestion.id, confidence)}
            showFeedback={true}
          />
        </div>
      )}

      {/* Show Answer Component */}
      {currentQuestion && submittedAnswers[currentQuestion.id] && (
        <ShowAnswer
          questionId={currentQuestion.id}
          answer={currentQuestion.options[currentQuestion.correctAnswer]}
          explanation={currentQuestion.explanation}
          hints={settings.includeHints ? currentQuestion.hints : []}
          isRevealed={showAnswers[currentQuestion.id] || false}
          onReveal={() => setShowAnswers(prev => ({ ...prev, [currentQuestion.id]: true }))}
          onHide={() => setShowAnswers(prev => ({ ...prev, [currentQuestion.id]: false }))}
          difficulty={currentQuestion.difficulty}
          category={currentQuestion.type}
        />
      )}

      {/* Session Summary */}
      {stats.answered > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Session Progress</h3>
              <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                <span>Answered: {stats.answered}/{questions.length}</span>
                <span>Accuracy: {Math.round(stats.accuracy)}%</span>
                <span>Streak: {session.streak}</span>
              </div>
            </div>
            <button
              onClick={handleExportSession}
              disabled={session.responses.length === 0}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Export Session</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};