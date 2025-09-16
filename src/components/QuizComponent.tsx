"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Check,
  X,
  Clock,
  Target,
  Trophy,
  RefreshCw,
  Volume2,
} from "lucide-react";
import { SavedPhrase } from "@/types/api";
import {
  getDifficultyColor,
  getCategoryColor,
} from "@/lib/utils/phrase-helpers";

interface QuizQuestion {
  id: string;
  phrase: SavedPhrase;
  type: "definition" | "translation" | "context" | "multipleChoice";
  question: string;
  correctAnswer: string;
  options?: string[];
  hint?: string;
}

interface QuizComponentProps {
  phrases: SavedPhrase[];
  onComplete: (results: QuizResults) => void;
  questionCount?: number;
  timeLimit?: number; // seconds
  showHints?: boolean;
}

export interface QuizResults {
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number;
  accuracy: number;
  questionsWithAnswers: Array<{
    question: QuizQuestion;
    userAnswer: string;
    isCorrect: boolean;
    timeSpent: number;
  }>;
}

export const QuizComponent: React.FC<QuizComponentProps> = ({
  phrases,
  onComplete,
  questionCount = 10,
  timeLimit,
  showHints = true,
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [questionStartTime, setQuestionStartTime] = useState<Date>(new Date());
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [answers, setAnswers] = useState<
    Array<{
      question: QuizQuestion;
      userAnswer: string;
      isCorrect: boolean;
      timeSpent: number;
    }>
  >([]);

  // Generate quiz questions
  const questions = useMemo(() => {
    const shuffledPhrases = [...phrases].sort(() => Math.random() - 0.5);
    const selectedPhrases = shuffledPhrases.slice(
      0,
      Math.min(questionCount, phrases.length),
    );

    return selectedPhrases.map((phrase, index) => {
      const questionTypes: Array<QuizQuestion["type"]> = [
        "definition",
        "translation",
        "context",
        "multipleChoice",
      ];
      const randomType =
        questionTypes[Math.floor(Math.random() * questionTypes.length)];

      return generateQuestion(
        phrase,
        randomType,
        index.toString(),
        selectedPhrases,
      );
    });
  }, [phrases, questionCount]);

  const currentQuestion = questions[currentQuestionIndex];

  // Initialize timer
  useEffect(() => {
    if (timeLimit) {
      setTimeRemaining(timeLimit);
    }
    setStartTime(new Date());
    setQuestionStartTime(new Date());
  }, [timeLimit]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          // Time's up - submit current answer and end quiz
          handleSubmitAnswer(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  const handleSubmitAnswer = (timeUp: boolean = false) => {
    if (!currentQuestion) return;

    const questionEndTime = new Date();
    const timeSpent = Math.round(
      (questionEndTime.getTime() - questionStartTime.getTime()) / 1000,
    );

    let finalAnswer = "";
    let isCorrect = false;

    if (currentQuestion.type === "multipleChoice") {
      if (selectedOption !== null && currentQuestion.options) {
        finalAnswer = currentQuestion.options[selectedOption];
        isCorrect =
          finalAnswer.toLowerCase().trim() ===
          currentQuestion.correctAnswer.toLowerCase().trim();
      }
    } else {
      finalAnswer = userAnswer.trim();
      isCorrect = checkAnswer(finalAnswer, currentQuestion.correctAnswer);
    }

    // If time's up and no answer provided, mark as incorrect
    if (timeUp && !finalAnswer) {
      isCorrect = false;
      finalAnswer = "(No answer - time expired)";
    }

    const answerRecord = {
      question: currentQuestion,
      userAnswer: finalAnswer,
      isCorrect,
      timeSpent,
    };

    const newAnswers = [...answers, answerRecord];
    setAnswers(newAnswers);

    // Show result for current question
    setShowResult(true);

    // Move to next question or finish quiz
    setTimeout(() => {
      if (
        currentQuestionIndex + 1 >= questions.length ||
        (timeRemaining !== null && timeRemaining <= 0)
      ) {
        // Quiz complete
        const endTime = new Date();
        const totalTime = Math.round(
          (endTime.getTime() - startTime.getTime()) / 1000,
        );

        const results: QuizResults = {
          totalQuestions: questions.length,
          correctAnswers: newAnswers.filter((a) => a.isCorrect).length,
          timeSpent: totalTime,
          accuracy: Math.round(
            (newAnswers.filter((a) => a.isCorrect).length / questions.length) *
              100,
          ),
          questionsWithAnswers: newAnswers,
        };

        onComplete(results);
      } else {
        // Next question
        setCurrentQuestionIndex((prev) => prev + 1);
        setUserAnswer("");
        setSelectedOption(null);
        setShowResult(false);
        setShowHint(false);
        setQuestionStartTime(new Date());
      }
    }, 2000);
  };

  const speakText = (text: string) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "es-ES";
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!currentQuestion) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 dark:text-gray-400">Loading quiz...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Quiz header */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            <span className="font-medium">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-600" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {answers.filter((a) => a.isCorrect).length} correct
            </span>
          </div>
        </div>

        {timeRemaining !== null && (
          <div
            className={`flex items-center gap-2 ${timeRemaining < 30 ? "text-red-600" : "text-gray-600 dark:text-gray-400"}`}
          >
            <Clock className="h-4 w-4" />
            <span className="font-mono font-medium">
              {formatTime(timeRemaining)}
            </span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{
            width: `${((currentQuestionIndex + (showResult ? 1 : 0)) / questions.length) * 100}%`,
          }}
        />
      </div>

      {/* Question card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <div className="space-y-4">
          {/* Question metadata */}
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-sm ${getCategoryColor(currentQuestion.phrase.category)}`}
            >
              {currentQuestion.phrase.category}
            </span>
            <span
              className={`px-3 py-1 rounded-full text-sm ${getDifficultyColor(currentQuestion.phrase.difficulty)}`}
            >
              {currentQuestion.phrase.difficulty}
            </span>
            <button
              onClick={() => speakText(currentQuestion.phrase.phrase)}
              className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
              title="Listen to pronunciation"
            >
              <Volume2 className="h-4 w-4" />
            </button>
          </div>

          {/* Question */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {currentQuestion.question}
            </h3>

            {currentQuestion.type !== "multipleChoice" && (
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 py-2">
                &ldquo;{currentQuestion.phrase.phrase}&rdquo;
              </p>
            )}
          </div>

          {/* Answer input/options */}
          {!showResult && (
            <div className="space-y-4">
              {currentQuestion.type === "multipleChoice" ? (
                <div className="space-y-2">
                  {currentQuestion.options?.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedOption(index)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        selectedOption === index
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            selectedOption === index
                              ? "border-blue-500 bg-blue-500"
                              : "border-gray-300 dark:border-gray-600"
                          }`}
                        >
                          {selectedOption === index && (
                            <div className="w-2 h-2 rounded-full bg-white" />
                          )}
                        </div>
                        <span className="text-gray-900 dark:text-gray-100">
                          {option}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <input
                  type="text"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && userAnswer.trim()) {
                      handleSubmitAnswer();
                    }
                  }}
                  placeholder="Enter your answer..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  autoFocus
                />
              )}

              {/* Hint */}
              {showHints && currentQuestion.hint && (
                <div className="space-y-2">
                  <button
                    onClick={() => setShowHint(!showHint)}
                    className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    {showHint ? "Hide hint" : "Show hint"}
                  </button>

                  {showHint && (
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                      <p className="text-sm text-purple-800 dark:text-purple-300">
                        <strong>Hint:</strong> {currentQuestion.hint}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Result display */}
          {showResult && (
            <div
              className={`p-4 rounded-lg border-2 ${
                answers[currentQuestionIndex]?.isCorrect
                  ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                  : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {answers[currentQuestionIndex]?.isCorrect ? (
                  <>
                    <Check className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-800 dark:text-green-300">
                      Correct!
                    </span>
                  </>
                ) : (
                  <>
                    <X className="h-5 w-5 text-red-600" />
                    <span className="font-medium text-red-800 dark:text-red-300">
                      Incorrect
                    </span>
                  </>
                )}
              </div>

              <div className="space-y-2 text-sm">
                {!answers[currentQuestionIndex]?.isCorrect && (
                  <p className="text-gray-700 dark:text-gray-300">
                    <strong>Your answer:</strong>{" "}
                    {answers[currentQuestionIndex]?.userAnswer || "No answer"}
                  </p>
                )}
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Correct answer:</strong>{" "}
                  {currentQuestion.correctAnswer}
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  <strong>Context:</strong> {currentQuestion.phrase.context}
                </p>
              </div>
            </div>
          )}

          {/* Submit button */}
          {!showResult && (
            <button
              onClick={() => handleSubmitAnswer()}
              disabled={
                (currentQuestion.type === "multipleChoice" &&
                  selectedOption === null) ||
                (currentQuestion.type !== "multipleChoice" &&
                  !userAnswer.trim())
              }
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Submit Answer
            </button>
          )}
        </div>
      </div>

      {/* Quiz stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-blue-600">
            {answers.length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Answered
          </div>
        </div>
        <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-green-600">
            {answers.filter((a) => a.isCorrect).length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Correct
          </div>
        </div>
        <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-purple-600">
            {answers.length > 0
              ? Math.round(
                  (answers.filter((a) => a.isCorrect).length / answers.length) *
                    100,
                )
              : 0}
            %
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Accuracy
          </div>
        </div>
      </div>

      {/* Keyboard shortcuts */}
      <div className="text-center text-xs text-gray-500 dark:text-gray-400">
        <p>
          <strong>Tip:</strong> Press Enter to submit your answer
        </p>
      </div>
    </div>
  );
};

// Helper functions
function generateQuestion(
  phrase: SavedPhrase,
  type: QuizQuestion["type"],
  id: string,
  allPhrases: SavedPhrase[],
): QuizQuestion {
  const baseQuestion: Omit<
    QuizQuestion,
    "question" | "correctAnswer" | "options" | "hint"
  > = {
    id,
    phrase,
    type,
  };

  switch (type) {
    case "definition":
      return {
        ...baseQuestion,
        question: "What does this phrase mean?",
        correctAnswer: phrase.definition,
        hint: phrase.context.substring(0, 100) + "...",
      };

    case "translation":
      if (phrase.translation) {
        return {
          ...baseQuestion,
          question: "What is the English translation?",
          correctAnswer: phrase.translation,
          hint: `This is a ${phrase.partOfSpeech}`,
        };
      }
      // Fallback to definition if no translation
      return generateQuestion(phrase, "definition", id, allPhrases);

    case "context":
      return {
        ...baseQuestion,
        question:
          'Complete the context: "' +
          phrase.context.replace(phrase.phrase, "____") +
          '"',
        correctAnswer: phrase.phrase,
        hint: `This is a ${phrase.partOfSpeech} in the ${phrase.category} category`,
      };

    case "multipleChoice":
      const otherPhrases = allPhrases.filter(
        (p) => p.id !== phrase.id && p.category === phrase.category,
      );
      const wrongOptions = otherPhrases
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((p) => p.definition);

      const options = [phrase.definition, ...wrongOptions].sort(
        () => Math.random() - 0.5,
      );

      return {
        ...baseQuestion,
        question: `What does "${phrase.phrase}" mean?`,
        correctAnswer: phrase.definition,
        options,
        hint: phrase.context.substring(0, 100) + "...",
      };

    default:
      return generateQuestion(phrase, "definition", id, allPhrases);
  }
}

function checkAnswer(userAnswer: string, correctAnswer: string): boolean {
  const normalize = (text: string) =>
    text
      .toLowerCase()
      .trim()
      .replace(/[.,!?;:"'()[\]{}]/g, "")
      .replace(/\s+/g, " ");

  const normalizedUser = normalize(userAnswer);
  const normalizedCorrect = normalize(correctAnswer);

  // Exact match
  if (normalizedUser === normalizedCorrect) return true;

  // Partial match (80% similarity using simple word overlap)
  const userWords = normalizedUser.split(" ");
  const correctWords = normalizedCorrect.split(" ");

  const commonWords = userWords.filter(
    (word) =>
      word.length > 2 &&
      correctWords.some(
        (cWord) => cWord.includes(word) || word.includes(cWord),
      ),
  );

  const similarity =
    commonWords.length / Math.max(userWords.length, correctWords.length);
  return similarity >= 0.8;
}

export default QuizComponent;
