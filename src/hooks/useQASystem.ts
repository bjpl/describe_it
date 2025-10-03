import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { logger } from '@/lib/logger';

export interface QAQuestion {
  id: string;
  question: string;
  answer: string;
  category: string;
  difficulty: "facil" | "medio" | "dificil";
  context?: string;
  explanation?: string;
  hints?: string[];
}

export interface QAResponse {
  questionId: string;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  timestamp: string;
  responseTime: number;
  confidence?: number;
}

export interface QASessionData {
  questions: QAQuestion[];
  responses: QAResponse[];
  startTime: number;
  endTime?: number;
  totalTime: number;
  accuracy: number;
  averageResponseTime: number;
}

export interface QASystemConfig {
  showConfidenceSlider?: boolean;
  allowHints?: boolean;
  timeLimit?: number;
  randomizeOrder?: boolean;
}

export interface LearningInsights {
  strengths: string[];
  improvements: string[];
  recommendations: string[];
}

interface UseQASystemProps {
  imageUrl: string;
  description: string;
  language?: "es" | "en";
  questionCount?: number;
  config?: QASystemConfig;
  onSessionComplete?: (sessionData: QASessionData) => void;
  onQuestionAnswered?: (response: QAResponse) => void;
}

export default function useQASystem({
  imageUrl,
  description,
  language = "es",
  questionCount = 5,
  config = {},
  onSessionComplete,
  onQuestionAnswered,
}: UseQASystemProps) {
  // State
  const [questions, setQuestions] = useState<QAQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);

  // Response tracking
  const [responses, setResponses] = useState<Map<string, QAResponse>>(
    new Map(),
  );
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(
    new Set(),
  );
  const [correctAnswers, setCorrectAnswers] = useState<Set<number>>(new Set());

  // Current question state
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [currentConfidence, setCurrentConfidence] = useState<number>(50);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState<number | null>(
    null,
  );

  // Refs
  const sessionDataRef = useRef<QASessionData | null>(null);

  // Generate questions from description
  const generateQuestions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Mock question generation - in a real app, this would call an API
      const mockQuestions: QAQuestion[] = [
        {
          id: "q1",
          question:
            language === "es"
              ? "¿Qué elementos principales puedes identificar en esta imagen?"
              : "What main elements can you identify in this image?",
          answer:
            language === "es"
              ? "Los elementos principales incluyen colores, formas y objetos específicos."
              : "The main elements include colors, shapes, and specific objects.",
          category: "observación",
          difficulty: "facil",
        },
        {
          id: "q2",
          question:
            language === "es"
              ? "¿Cuál es el ambiente o contexto de la imagen?"
              : "What is the atmosphere or context of the image?",
          answer:
            language === "es"
              ? "El ambiente refleja el contexto visual y emocional de la escena."
              : "The atmosphere reflects the visual and emotional context of the scene.",
          category: "interpretación",
          difficulty: "medio",
        },
        {
          id: "q3",
          question:
            language === "es"
              ? "¿Qué emociones o sensaciones transmite la imagen?"
              : "What emotions or feelings does the image convey?",
          answer:
            language === "es"
              ? "La imagen transmite diversas emociones según los colores y composición."
              : "The image conveys various emotions based on colors and composition.",
          category: "análisis",
          difficulty: "medio",
        },
        {
          id: "q4",
          question:
            language === "es"
              ? "¿Cómo describirías el estilo visual de esta imagen?"
              : "How would you describe the visual style of this image?",
          answer:
            language === "es"
              ? "El estilo visual puede ser moderno, clásico, artístico o fotográfico."
              : "The visual style can be modern, classic, artistic, or photographic.",
          category: "estética",
          difficulty: "dificil",
        },
        {
          id: "q5",
          question:
            language === "es"
              ? "¿Qué historia o narrativa podrías crear basándote en esta imagen?"
              : "What story or narrative could you create based on this image?",
          answer:
            language === "es"
              ? "La narrativa surge de los elementos visuales y su interpretación personal."
              : "The narrative emerges from visual elements and personal interpretation.",
          category: "creatividad",
          difficulty: "dificil",
        },
      ];

      const selectedQuestions = mockQuestions.slice(0, questionCount);
      setQuestions(selectedQuestions);
      setSessionStartTime(Date.now());
      setQuestionStartTime(Date.now());

      // Initialize session data
      sessionDataRef.current = {
        questions: selectedQuestions,
        responses: [],
        startTime: Date.now(),
        totalTime: 0,
        accuracy: 0,
        averageResponseTime: 0,
      };
    } catch (err) {
      setError("Failed to generate questions. Please try again.");
      logger.error("Question generation error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [imageUrl, description, language, questionCount]);

  // Initialize questions when component mounts or dependencies change
  useEffect(() => {
    if (imageUrl && description) {
      generateQuestions();
    }
  }, [generateQuestions]);

  // Computed values
  const currentQuestion = questions[currentIndex] || null;
  const totalAnswered = answeredQuestions.size;
  const totalCorrect = correctAnswers.size;
  const accuracy =
    totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
  const progressPercentage =
    questions.length > 0 ? (totalAnswered / questions.length) * 100 : 0;
  const isSessionComplete =
    totalAnswered === questions.length && questions.length > 0;

  // Navigation
  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < questions.length - 1;

  // Current question state
  const isCurrentAnswered = answeredQuestions.has(currentIndex);
  const isCurrentCorrect = correctAnswers.has(currentIndex);
  const hasSelectedAnswer = selectedAnswer.trim().length > 0;
  const canSubmit = hasSelectedAnswer && !isCurrentAnswered;

  // Response time and streak calculations
  const averageTimePerQuestion = useMemo(() => {
    const totalTime = Array.from(responses.values()).reduce(
      (sum, response) => sum + response.responseTime,
      0,
    );
    return responses.size > 0 ? totalTime / responses.size / 1000 : 0; // Convert to seconds
  }, [responses]);

  const currentStreak = useMemo(() => {
    let streak = 0;
    for (let i = currentIndex; i >= 0; i--) {
      if (correctAnswers.has(i)) {
        streak++;
      } else if (answeredQuestions.has(i)) {
        break;
      }
    }
    return streak;
  }, [currentIndex, correctAnswers, answeredQuestions]);

  const maxStreak = useMemo(() => {
    let maxStreak = 0;
    let currentStreak = 0;

    for (let i = 0; i < questions.length; i++) {
      if (correctAnswers.has(i)) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else if (answeredQuestions.has(i)) {
        currentStreak = 0;
      }
    }

    return maxStreak;
  }, [questions.length, correctAnswers, answeredQuestions]);

  // Actions
  const selectAnswer = useCallback((answer: string) => {
    setSelectedAnswer(answer);
  }, []);

  const setConfidence = useCallback((confidence: number) => {
    setCurrentConfidence(confidence);
  }, []);

  const submitAnswer = useCallback(() => {
    if (!currentQuestion || !hasSelectedAnswer || isCurrentAnswered) return;

    const responseTime = questionStartTime ? Date.now() - questionStartTime : 0;
    const isCorrect = true; // In demo mode, we'll consider all answers correct

    const response: QAResponse = {
      questionId: currentQuestion.id,
      question: currentQuestion.question,
      userAnswer: selectedAnswer,
      correctAnswer: currentQuestion.answer,
      isCorrect,
      timestamp: new Date().toISOString(),
      responseTime,
      confidence: config.showConfidenceSlider ? currentConfidence : undefined,
    };

    // Update state
    setResponses((prev) => new Map(prev.set(currentQuestion.id, response)));
    setAnsweredQuestions((prev) => new Set(prev).add(currentIndex));
    if (isCorrect) {
      setCorrectAnswers((prev) => new Set(prev).add(currentIndex));
    }

    // Reset for next question
    setSelectedAnswer("");
    setCurrentConfidence(50);
    setIsAnswerRevealed(false);

    // Call callback
    onQuestionAnswered?.(response);

    // Update session data
    if (sessionDataRef.current) {
      sessionDataRef.current.responses.push(response);
    }
  }, [
    currentQuestion,
    selectedAnswer,
    hasSelectedAnswer,
    isCurrentAnswered,
    questionStartTime,
    currentConfidence,
    config.showConfidenceSlider,
    currentIndex,
    onQuestionAnswered,
  ]);

  const revealAnswer = useCallback(() => {
    setIsAnswerRevealed(true);
  }, []);

  const hideAnswer = useCallback(() => {
    setIsAnswerRevealed(false);
  }, []);

  const goToPrevious = useCallback(() => {
    if (canGoPrevious) {
      setCurrentIndex(currentIndex - 1);
      setQuestionStartTime(Date.now());
      setSelectedAnswer("");
      setIsAnswerRevealed(false);
    }
  }, [canGoPrevious, currentIndex]);

  const goToNext = useCallback(() => {
    if (canGoNext) {
      setCurrentIndex(currentIndex + 1);
      setQuestionStartTime(Date.now());
      setSelectedAnswer("");
      setIsAnswerRevealed(false);
    }
  }, [canGoNext, currentIndex]);

  const goToQuestion = useCallback(
    (index: number) => {
      if (index >= 0 && index < questions.length) {
        setCurrentIndex(index);
        setQuestionStartTime(Date.now());
        setSelectedAnswer("");
        setIsAnswerRevealed(false);
      }
    },
    [questions.length],
  );

  const resetSession = useCallback(() => {
    setCurrentIndex(0);
    setResponses(new Map());
    setAnsweredQuestions(new Set());
    setCorrectAnswers(new Set());
    setSelectedAnswer("");
    setCurrentConfidence(50);
    setIsAnswerRevealed(false);
    setSessionStartTime(Date.now());
    setQuestionStartTime(Date.now());
    sessionDataRef.current = null;
  }, []);

  const exportToCSV = useCallback(
    (includeSessionData: boolean = true) => {
      const headers = [
        "Question",
        "User Answer",
        "Correct Answer",
        "Is Correct",
        "Response Time (ms)",
        "Timestamp",
      ];
      if (config.showConfidenceSlider) {
        headers.push("Confidence");
      }

      const rows = Array.from(responses.values()).map((response) => {
        const row = [
          response.question,
          response.userAnswer,
          response.correctAnswer,
          response.isCorrect.toString(),
          response.responseTime.toString(),
          response.timestamp,
        ];

        if (config.showConfidenceSlider && response.confidence !== undefined) {
          row.push(response.confidence.toString());
        }

        return row;
      });

      const csvContent = [headers, ...rows]
        .map((row) =>
          row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","),
        )
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `qa-session-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
    },
    [responses, config.showConfidenceSlider],
  );

  const getLearningInsights = useCallback((): LearningInsights => {
    const insights: LearningInsights = {
      strengths: [],
      improvements: [],
      recommendations: [],
    };

    if (totalAnswered === 0) return insights;

    // Analyze strengths
    if (accuracy >= 80) {
      insights.strengths.push("Excellent comprehension skills");
    }
    if (averageTimePerQuestion < 30) {
      insights.strengths.push("Quick response time");
    }
    if (currentStreak >= 3) {
      insights.strengths.push("Consistent performance");
    }

    // Analyze improvements
    if (accuracy < 60) {
      insights.improvements.push("Focus on understanding image content");
    }
    if (averageTimePerQuestion > 60) {
      insights.improvements.push("Work on response speed");
    }

    // Recommendations
    if (accuracy < 70) {
      insights.recommendations.push("Practice with more varied images");
      insights.recommendations.push(
        "Review vocabulary related to visual descriptions",
      );
    }
    if (totalAnswered < questions.length) {
      insights.recommendations.push(
        "Complete all questions for better assessment",
      );
    }

    return insights;
  }, [
    totalAnswered,
    accuracy,
    averageTimePerQuestion,
    currentStreak,
    questions.length,
  ]);

  // Complete session when all questions are answered
  useEffect(() => {
    if (isSessionComplete && sessionDataRef.current && sessionStartTime) {
      const endTime = Date.now();
      const sessionData: QASessionData = {
        ...sessionDataRef.current,
        endTime,
        totalTime: endTime - sessionStartTime,
        accuracy,
        averageResponseTime: averageTimePerQuestion * 1000, // Convert back to milliseconds
      };

      onSessionComplete?.(sessionData);
    }
  }, [
    isSessionComplete,
    sessionStartTime,
    accuracy,
    averageTimePerQuestion,
    onSessionComplete,
  ]);

  return {
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
  };
}

// Re-export the hook with a named export as well
export { useQASystem };
