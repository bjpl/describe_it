"use client";

import React, { useState, useCallback, useMemo, memo } from "react";
import { Download, Play, RefreshCw, BarChart3 } from "lucide-react";
import useQASystem from "@/hooks/useQASystem";
import { QuestionNavigator } from "./QuestionNavigator";
import { QuestionCounter } from "./QuestionCounter";
import { ShowAnswer } from "./ShowAnswer";
import {
  performanceProfiler,
  useRenderCount,
} from "@/lib/utils/performance-helpers";

interface QASystemDemoProps {
  imageUrl: string;
  description: string;
  language?: "es" | "en";
}

const QASystemDemoBase: React.FC<QASystemDemoProps> = ({
  imageUrl,
  description,
  language = "es",
}) => {
  const [isStarted, setIsStarted] = useState(false);

  // Performance monitoring
  const renderCount = useRenderCount("QASystemDemo");

  React.useEffect(() => {
    performanceProfiler.startMark("QASystemDemo-render");
    return () => {
      performanceProfiler.endMark("QASystemDemo-render");
    };
  });

  const {
    // State
    questions,
    currentQuestion,
    currentIndex,
    isLoading,
    error,
    isSessionComplete,

    // Progress
    answeredQuestions,
    correctAnswers,
    totalAnswered,
    totalCorrect,
    accuracy,
    averageTimePerQuestion,
    currentStreak,
    maxStreak,
    progressPercentage,

    // Current question state
    selectedAnswer,
    isCurrentAnswered,
    isCurrentCorrect,
    isAnswerRevealed,
    currentConfidence,
    hasSelectedAnswer,
    canSubmit,

    // Navigation
    canGoPrevious,
    canGoNext,
    goToPrevious,
    goToNext,
    goToQuestion,

    // Actions
    selectAnswer,
    setConfidence,
    submitAnswer,
    revealAnswer,
    hideAnswer,
    resetSession,
    exportToCSV,
    getLearningInsights,
  } = useQASystem({
    imageUrl,
    description,
    language,
    questionCount: 5,
    config: {
      showConfidenceSlider: true,
      allowHints: true,
    },
    onSessionComplete: useCallback((sessionData: any) => {
      console.log("Session completed:", sessionData);
      setIsStarted(false);
    }, []),
    onQuestionAnswered: useCallback((response: any) => {
      console.log("Question answered:", response);
    }, []),
  });

  // Memoize expensive computations and callbacks
  const handleStartQuiz = useCallback(() => {
    setIsStarted(true);
  }, []);

  const handleResetQuiz = useCallback(() => {
    setIsStarted(false);
    resetSession();
  }, [resetSession]);

  // Memoize static content based on language
  const quizTitle = useMemo(
    () =>
      language === "es" ? "Sistema de Preguntas y Respuestas" : "Q&A System",
    [language],
  );

  const quizDescription = useMemo(
    () =>
      language === "es"
        ? "Pon a prueba tu comprensión de la imagen con preguntas interactivas basadas en la descripción generada."
        : "Test your understanding of the image with interactive questions based on the generated description.",
    [language],
  );

  const startButtonText = useMemo(
    () => (language === "es" ? "Comenzar Quiz" : "Start Quiz"),
    [language],
  );

  if (!isStarted) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto">
            <BarChart3 className="h-8 w-8 text-blue-600" />
          </div>

          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {quizTitle}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm max-w-md mx-auto">
              {quizDescription}
            </p>
          </div>

          <div className="flex justify-center space-x-3">
            <button
              onClick={handleStartQuiz}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Play className="h-4 w-4" />
              <span>{startButtonText}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center space-y-4">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400">
            {language === "es"
              ? "Generando preguntas..."
              : "Generating questions..."}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-red-200 dark:border-red-700 p-6">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
            <RefreshCw className="h-8 w-8 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-300 mb-2">
              {language === "es"
                ? "Error al generar preguntas"
                : "Error generating questions"}
            </h3>
            <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
          </div>
          <button
            onClick={handleResetQuiz}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            {language === "es" ? "Reintentar" : "Try Again"}
          </button>
        </div>
      </div>
    );
  }

  if (isSessionComplete) {
    const insights = getLearningInsights();

    return (
      <div className="space-y-6">
        {/* Session Complete Header */}
        <div className="bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-xl p-6 text-center">
          <h2 className="text-2xl font-bold mb-2">
            {language === "es" ? "¡Quiz Completado!" : "Quiz Complete!"}
          </h2>
          <p className="opacity-90">
            {language === "es"
              ? `Respondiste ${totalCorrect} de ${questions.length} preguntas correctamente (${accuracy}%)`
              : `You answered ${totalCorrect} out of ${questions.length} questions correctly (${accuracy}%)`}
          </p>
        </div>

        {/* Results Summary */}
        <QuestionCounter
          currentIndex={questions.length - 1}
          totalQuestions={questions.length}
          answeredCount={totalAnswered}
          correctCount={totalCorrect}
          timeSpent={Math.round(averageTimePerQuestion * questions.length)}
          averageTime={averageTimePerQuestion}
          streak={maxStreak}
          sessionScore={{
            percentage: accuracy,
            grade:
              accuracy >= 90
                ? "A+"
                : accuracy >= 80
                  ? "A"
                  : accuracy >= 70
                    ? "B"
                    : accuracy >= 60
                      ? "C"
                      : "D",
          }}
        />

        {/* Learning Insights */}
        {(insights.strengths.length > 0 ||
          insights.improvements.length > 0 ||
          insights.recommendations.length > 0) && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {language === "es"
                ? "Perspectivas de Aprendizaje"
                : "Learning Insights"}
            </h3>

            <div className="grid md:grid-cols-3 gap-4">
              {insights.strengths.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-green-700 dark:text-green-300">
                    {language === "es" ? "Fortalezas" : "Strengths"}
                  </h4>
                  <ul className="text-sm text-green-600 dark:text-green-400 space-y-1">
                    {insights.strengths.map((strength, index) => (
                      <li key={index}>• {strength}</li>
                    ))}
                  </ul>
                </div>
              )}

              {insights.improvements.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-yellow-700 dark:text-yellow-300">
                    {language === "es" ? "Áreas de Mejora" : "Areas to Improve"}
                  </h4>
                  <ul className="text-sm text-yellow-600 dark:text-yellow-400 space-y-1">
                    {insights.improvements.map((improvement, index) => (
                      <li key={index}>• {improvement}</li>
                    ))}
                  </ul>
                </div>
              )}

              {insights.recommendations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-blue-700 dark:text-blue-300">
                    {language === "es" ? "Recomendaciones" : "Recommendations"}
                  </h4>
                  <ul className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
                    {insights.recommendations.map((recommendation, index) => (
                      <li key={index}>• {recommendation}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4">
          <button
            onClick={() => exportToCSV(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>{language === "es" ? "Exportar CSV" : "Export CSV"}</span>
          </button>

          <button
            onClick={handleResetQuiz}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>{language === "es" ? "Nuevo Quiz" : "New Quiz"}</span>
          </button>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <QuestionCounter
        currentIndex={currentIndex}
        totalQuestions={questions.length}
        answeredCount={totalAnswered}
        correctCount={totalCorrect}
        streak={currentStreak}
        showDetails={false}
      />

      {/* Navigation */}
      <QuestionNavigator
        currentIndex={currentIndex}
        totalQuestions={questions.length}
        onPrevious={goToPrevious}
        onNext={goToNext}
        onGoToQuestion={goToQuestion}
        onReset={resetSession}
        answeredQuestions={answeredQuestions}
        correctAnswers={correctAnswers}
      />

      {/* Current Question */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {currentQuestion.question}
          </h3>

          {/* Simple Answer Interface (since AnswerInput expects options) */}
          <div className="space-y-3">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <p className="text-blue-900 dark:text-blue-300 text-sm">
                {language === "es"
                  ? "Este es un sistema de demostración. La respuesta correcta es:"
                  : "This is a demo system. The correct answer is:"}
              </p>
              <p className="font-medium text-blue-900 dark:text-blue-300 mt-2">
                {currentQuestion.answer}
              </p>
            </div>

            {!isCurrentAnswered && (
              <div className="flex justify-center">
                <button
                  onClick={submitAnswer}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  {language === "es" ? "Marcar como Vista" : "Mark as Viewed"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Show Answer Component */}
      <ShowAnswer
        questionId={currentQuestion.id || `q_${currentIndex}`}
        answer={currentQuestion.answer}
        explanation={`${language === "es" ? "Categoría" : "Category"}: ${currentQuestion.category}, ${language === "es" ? "Dificultad" : "Difficulty"}: ${currentQuestion.difficulty}`}
        isRevealed={isAnswerRevealed}
        onReveal={revealAnswer}
        onHide={hideAnswer}
        difficulty={
          currentQuestion.difficulty === "facil"
            ? "beginner"
            : currentQuestion.difficulty === "medio"
              ? "intermediate"
              : "advanced"
        }
        category={currentQuestion.category}
      />

      {/* Export Button */}
      {totalAnswered > 0 && (
        <div className="flex justify-center">
          <button
            onClick={() => exportToCSV(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
          >
            <Download className="h-4 w-4" />
            <span>
              {language === "es" ? "Exportar Progreso" : "Export Progress"}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};

// Memoized component with optimized comparison
export const QASystemDemo = memo(QASystemDemoBase, (prevProps, nextProps) => {
  return (
    prevProps.imageUrl === nextProps.imageUrl &&
    prevProps.description === nextProps.description &&
    prevProps.language === nextProps.language
  );
});

QASystemDemo.displayName = 'QASystemDemo';

export default QASystemDemo;
