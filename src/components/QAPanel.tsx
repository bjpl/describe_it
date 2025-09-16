"use client";

import { useState, useEffect, useCallback, useMemo, memo } from "react";
import {
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertCircle,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react";
import {
  exportResponses,
  getCurrentTimestamp,
  type ResponseItem,
} from "../lib/export/csvExporter";
import { QAProgressIndicator, TextContentSkeleton } from "./ProgressIndicator";
import { safeParse, safeStringify, safeParseLocalStorage, safeSetLocalStorage } from "@/lib/utils/json-safe";

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
  style: "narrativo" | "poetico" | "academico" | "conversacional" | "infantil";
  onResponseUpdate?: (response: any) => void;
}

const QAPanel = memo<QAPanelProps>(function QAPanel({
  selectedImage,
  descriptionText,
  style,
  onResponseUpdate,
}) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{
    [key: string]: number;
  }>({});
  const [showResults, setShowResults] = useState<{ [key: string]: boolean }>(
    {},
  );
  const [showExplanations, setShowExplanations] = useState<{
    [key: string]: boolean;
  }>({});
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [userResponses, setUserResponses] = useState<ResponseItem[]>([]);

  // Create multiple choice question from Q&A API response
  const createMultipleChoiceFromQA = useCallback(
    (qa: any, index: number): Question => {
      const answer = qa.answer;
      const question = qa.question;

      // Create plausible incorrect options based on the content
      let options: string[] = [];
      
      // Generate distractor options based on the answer
      const distractors = [
        "No se puede ver esto en la imagen",
        "Lo contrario de lo que muestra la imagen",
        "Una interpretación incorrecta de la escena",
      ];

      // Always include the correct answer
      options = [answer, ...distractors];

      // Shuffle options
      const shuffledOptions = [...options];
      for (let i = shuffledOptions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
      }

      // Find correct answer index after shuffle
      const correctAnswerIndex = shuffledOptions.indexOf(answer);

      return {
        id: `q_${index}`,
        question: question,
        options: shuffledOptions,
        correctAnswer: correctAnswerIndex,
        explanation: `La respuesta correcta es: "${answer}". Esta respuesta se basa en la descripción generada de la imagen.`,
      };
    },
    [],
  );

  // Generate multiple choice questions from Q&A API response
  const generateQuestions = useCallback(async () => {
    if (!selectedImage) return;

    // Require description text for proper Q&A generation
    if (!descriptionText) {
      setError(
        "Please generate a description first to create questions based on the content.",
      );
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
      // Generate all questions in a single API call
      const response = await fetch("/api/qa/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: safeStringify({
          description: descriptionText,
          language: "es",
          count: 4, // Generate 4 questions
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to generate questions: ${response.status}`);
      }

      const data = await response.json();
      const qaResponses = data.questions || [];

      // Convert Q&A responses to multiple choice questions
      const generatedQuestions: Question[] = qaResponses.map((qa: any, index: number) => {
        return createMultipleChoiceFromQA(qa, index);
      });

      setQuestions(generatedQuestions);
    } catch (err) {
      console.error("Error generating questions:", err);
      setError(
        err instanceof Error ? err.message : "Failed to generate questions",
      );
    } finally {
      setLoading(false);
    }
  }, [selectedImage, descriptionText, createMultipleChoiceFromQA]);

  // Handle answer selection
  const handleAnswerSelect = useCallback(
    (questionId: string, answerIndex: number) => {
      if (showResults[questionId]) return; // Already answered

      setSelectedAnswers((prev) => ({
        ...prev,
        [questionId]: answerIndex,
      }));

      // Find the question and check if answer is correct
      const question = questions.find((q) => q.id === questionId);
      if (!question) return;

      const isCorrect = answerIndex === question.correctAnswer;

      // Show result
      setShowResults((prev) => ({
        ...prev,
        [questionId]: true,
      }));

      // Update score
      if (isCorrect) {
        setScore((prev) => ({
          correct: prev.correct + 1,
          total: prev.total + 1,
        }));
      } else {
        setScore((prev) => ({
          ...prev,
          total: prev.total + 1,
        }));
      }

      // Record user response for export
      const responseItem: ResponseItem = {
        question: question.question,
        user_answer: question.options[answerIndex],
        correct_answer: question.options[question.correctAnswer],
        timestamp: getCurrentTimestamp(),
      };

      setUserResponses((prev) => [...prev, responseItem]);

      // Notify parent component
      if (onResponseUpdate) {
        onResponseUpdate({
          imageId: selectedImage.id,
          question: question.question,
          answer: question.options[answerIndex],
          isCorrect,
          style,
        });
      }
    },
    [questions, showResults, selectedImage, style, onResponseUpdate],
  );

  // Toggle explanation visibility
  const toggleExplanation = useCallback((questionId: string) => {
    setShowExplanations((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  }, []);

  // Navigate between questions
  const handlePreviousQuestion = useCallback(() => {
    setCurrentQuestionIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNextQuestion = useCallback(() => {
    setCurrentQuestionIndex((prev) =>
      Math.min(questions.length - 1, prev + 1),
    );
  }, [questions.length]);

  // Export responses
  const handleExportResponses = useCallback(() => {
    if (userResponses.length === 0) {
      alert("No responses to export yet. Please answer some questions first.");
      return;
    }

    exportResponses(userResponses);
  }, [userResponses]);

  // Calculate progress
  const progress = useMemo(() => {
    if (questions.length === 0) return 0;
    return Math.round((Object.keys(showResults).length / questions.length) * 100);
  }, [questions.length, showResults]);

  const currentQuestion = questions[currentQuestionIndex];
  const isQuestionAnswered = currentQuestion
    ? showResults[currentQuestion.id]
    : false;

  if (!selectedImage) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">
          Please select an image to start the Q&A practice
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
          Q&A Practice - {style.charAt(0).toUpperCase() + style.slice(1)} Style
        </h3>

        {!descriptionText && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 inline mr-2" />
            <span className="text-amber-800 dark:text-amber-200">
              Please generate a description first. The Q&A will be based on the
              actual description content.
            </span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <button
            onClick={generateQuestions}
            disabled={loading || !descriptionText}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Generate Questions
              </>
            )}
          </button>

          {userResponses.length > 0 && (
            <button
              onClick={handleExportResponses}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export Responses
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {questions.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Progress: {Object.keys(showResults).length} / {questions.length}{" "}
              questions answered
            </span>
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
              Score: {score.correct} / {score.total}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 inline mr-2" />
          <span className="text-red-800 dark:text-red-200">{error}</span>
        </div>
      )}

      {/* Loading State */}
      <QAProgressIndicator isGenerating={loading} />

      {/* Question Display */}
      {currentQuestion && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          {/* Question Header */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
            <div className="flex gap-2">
              <button
                onClick={handlePreviousQuestion}
                disabled={currentQuestionIndex === 0}
                className="p-1 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={handleNextQuestion}
                disabled={currentQuestionIndex === questions.length - 1}
                className="p-1 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Question */}
          <h4 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">
            {currentQuestion.question}
          </h4>

          {/* Answer Options */}
          <div className="space-y-2">
            {currentQuestion.options.map((option, index) => {
              const isSelected =
                selectedAnswers[currentQuestion.id] === index;
              const isCorrect = index === currentQuestion.correctAnswer;
              const showResult = showResults[currentQuestion.id];

              return (
                <button
                  key={index}
                  onClick={() =>
                    handleAnswerSelect(currentQuestion.id, index)
                  }
                  disabled={isQuestionAnswered}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    showResult
                      ? isCorrect
                        ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                        : isSelected
                          ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                          : "border-gray-200 dark:border-gray-700"
                      : isSelected
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  } ${
                    isQuestionAnswered ? "cursor-not-allowed" : "cursor-pointer"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-gray-800 dark:text-gray-200">
                      {option}
                    </span>
                    {showResult && (
                      <>
                        {isCorrect && (
                          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                        )}
                        {isSelected && !isCorrect && (
                          <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        )}
                      </>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {isQuestionAnswered && currentQuestion.explanation && (
            <div className="mt-4">
              <button
                onClick={() => toggleExplanation(currentQuestion.id)}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 mb-2"
              >
                {showExplanations[currentQuestion.id] ? (
                  <>
                    <EyeOff className="h-4 w-4" />
                    Hide explanation
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    Show explanation
                  </>
                )}
              </button>
              {showExplanations[currentQuestion.id] && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-gray-700 dark:text-gray-300">
                    {currentQuestion.explanation}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Completion Message */}
      {questions.length > 0 && progress === 100 && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 text-center">
          <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-green-800 dark:text-green-200 mb-2">
            ¡Excellent Work!
          </h3>
          <p className="text-green-700 dark:text-green-300">
            You have completed all questions. Your final score is {score.correct}{" "}
            out of {score.total}.
          </p>
          <button
            onClick={generateQuestions}
            className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
          >
            Generate New Questions
          </button>
        </div>
      )}
    </div>
  );
});

export default QAPanel;