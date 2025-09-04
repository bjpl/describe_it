import { QAGeneration } from "@/types/api";

export interface QASessionData {
  sessionId: string;
  imageUrl: string;
  description: string;
  language: string;
  questions: QAGeneration[];
  userResponses: QAUserResponse[];
  sessionMetadata: {
    startTime: string;
    endTime?: string;
    totalTime?: number; // in seconds
    score: number;
    accuracy: number;
    streak: number;
  };
}

export interface QAUserResponse {
  questionIndex: number;
  questionId: string;
  question: string;
  correctAnswer: string;
  userAnswer: string;
  isCorrect: boolean;
  confidence?: number; // 0-100
  timeSpent?: number; // in seconds
  hintsUsed?: number;
  timestamp: string;
  difficulty: "facil" | "medio" | "dificil";
  category: string;
}

export class QAExporter {
  /**
   * Export Q&A session data to CSV format
   */
  static exportToCSV(sessionData: QASessionData): string {
    const headers = [
      "Session ID",
      "Question Index",
      "Question",
      "Correct Answer",
      "User Answer",
      "Is Correct",
      "Confidence (%)",
      "Time Spent (s)",
      "Difficulty",
      "Category",
      "Hints Used",
      "Timestamp",
      "Language",
      "Image URL",
      "Description",
    ];

    const rows = [
      headers.join(","),
      ...sessionData.userResponses.map((response) =>
        [
          sessionData.sessionId,
          response.questionIndex + 1,
          `"${response.question.replace(/"/g, '""')}"`,
          `"${response.correctAnswer.replace(/"/g, '""')}"`,
          `"${response.userAnswer.replace(/"/g, '""')}"`,
          response.isCorrect ? "Yes" : "No",
          response.confidence || "",
          response.timeSpent || "",
          response.difficulty,
          response.category,
          response.hintsUsed || 0,
          response.timestamp,
          sessionData.language,
          sessionData.imageUrl,
          `"${sessionData.description.substring(0, 100).replace(/"/g, '""')}..."`,
        ].join(","),
      ),
    ];

    return rows.join("\\n");
  }

  /**
   * Export Q&A session summary to CSV
   */
  static exportSummaryToCSV(sessionData: QASessionData): string {
    const summary = this.generateSessionSummary(sessionData);

    const headers = [
      "Session ID",
      "Start Time",
      "End Time",
      "Total Time (s)",
      "Total Questions",
      "Correct Answers",
      "Accuracy (%)",
      "Average Confidence (%)",
      "Average Time per Question (s)",
      "Longest Streak",
      "Language",
      "Easy Questions Correct",
      "Medium Questions Correct",
      "Hard Questions Correct",
      "Total Hints Used",
      "Image URL",
    ];

    const row = [
      sessionData.sessionId,
      sessionData.sessionMetadata.startTime,
      sessionData.sessionMetadata.endTime || "",
      sessionData.sessionMetadata.totalTime || "",
      summary.totalQuestions,
      summary.correctAnswers,
      summary.accuracy.toFixed(1),
      summary.averageConfidence.toFixed(1),
      summary.averageTimePerQuestion.toFixed(1),
      sessionData.sessionMetadata.streak,
      sessionData.language,
      summary.difficultyBreakdown.facil.correct,
      summary.difficultyBreakdown.medio.correct,
      summary.difficultyBreakdown.dificil.correct,
      summary.totalHintsUsed,
      sessionData.imageUrl,
    ];

    return [headers.join(","), row.join(",")].join("\\n");
  }

  /**
   * Generate detailed session analytics
   */
  static generateSessionSummary(sessionData: QASessionData) {
    const responses = sessionData.userResponses;
    const totalQuestions = responses.length;
    const correctAnswers = responses.filter((r) => r.isCorrect).length;
    const accuracy =
      totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

    // Confidence analysis
    const confidenceValues = responses
      .filter((r) => r.confidence !== undefined)
      .map((r) => r.confidence!);
    const averageConfidence =
      confidenceValues.length > 0
        ? confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length
        : 0;

    // Time analysis
    const timeValues = responses
      .filter((r) => r.timeSpent !== undefined)
      .map((r) => r.timeSpent!);
    const averageTimePerQuestion =
      timeValues.length > 0
        ? timeValues.reduce((a, b) => a + b, 0) / timeValues.length
        : 0;

    // Difficulty breakdown
    const difficultyBreakdown = {
      facil: { total: 0, correct: 0 },
      medio: { total: 0, correct: 0 },
      dificil: { total: 0, correct: 0 },
    };

    responses.forEach((response) => {
      difficultyBreakdown[response.difficulty].total++;
      if (response.isCorrect) {
        difficultyBreakdown[response.difficulty].correct++;
      }
    });

    // Category analysis
    const categoryStats: Record<string, { total: number; correct: number }> =
      {};
    responses.forEach((response) => {
      if (!categoryStats[response.category]) {
        categoryStats[response.category] = { total: 0, correct: 0 };
      }
      categoryStats[response.category].total++;
      if (response.isCorrect) {
        categoryStats[response.category].correct++;
      }
    });

    // Total hints used
    const totalHintsUsed = responses.reduce(
      (sum, r) => sum + (r.hintsUsed || 0),
      0,
    );

    return {
      totalQuestions,
      correctAnswers,
      accuracy,
      averageConfidence,
      averageTimePerQuestion,
      difficultyBreakdown,
      categoryStats,
      totalHintsUsed,
    };
  }

  /**
   * Export to downloadable CSV file
   */
  static downloadCSV(sessionData: QASessionData, includeDetails = true): void {
    const csvContent = includeDetails
      ? this.exportToCSV(sessionData)
      : this.exportSummaryToCSV(sessionData);

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `qa_responses_${sessionData.sessionId}_${new Date().toISOString().split("T")[0]}.csv`,
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  /**
   * Format session data for API export
   */
  static formatForAPI(sessionData: QASessionData): Record<string, any> {
    return {
      session: {
        id: sessionData.sessionId,
        metadata: sessionData.sessionMetadata,
        image: {
          url: sessionData.imageUrl,
          description: sessionData.description,
          language: sessionData.language,
        },
      },
      questions: sessionData.questions,
      responses: sessionData.userResponses,
      analytics: this.generateSessionSummary(sessionData),
    };
  }

  /**
   * Convert session data to JSON for backup/restore
   */
  static exportToJSON(sessionData: QASessionData): string {
    return JSON.stringify(this.formatForAPI(sessionData), null, 2);
  }

  /**
   * Generate learning insights from session data
   */
  static generateLearningInsights(sessionData: QASessionData): {
    strengths: string[];
    improvements: string[];
    recommendations: string[];
  } {
    const summary = this.generateSessionSummary(sessionData);
    const insights = {
      strengths: [] as string[],
      improvements: [] as string[],
      recommendations: [] as string[],
    };

    // Accuracy insights
    if (summary.accuracy >= 80) {
      insights.strengths.push("High accuracy - excellent understanding");
    } else if (summary.accuracy >= 60) {
      insights.strengths.push("Good accuracy - solid foundation");
    } else {
      insights.improvements.push("Focus on improving accuracy");
    }

    // Confidence insights
    if (summary.averageConfidence >= 70) {
      insights.strengths.push("High confidence in answers");
    } else if (summary.averageConfidence < 50) {
      insights.improvements.push("Build confidence through more practice");
    }

    // Difficulty analysis
    const { facil, medio, dificil } = summary.difficultyBreakdown;

    if (facil.total > 0 && facil.correct / facil.total >= 0.8) {
      insights.strengths.push("Strong performance on basic concepts");
    }

    if (medio.total > 0 && medio.correct / medio.total < 0.6) {
      insights.improvements.push("Practice intermediate level questions");
      insights.recommendations.push("Review medium difficulty topics");
    }

    if (dificil.total > 0 && dificil.correct / dificil.total >= 0.5) {
      insights.strengths.push("Good grasp of advanced concepts");
    } else if (dificil.total > 0) {
      insights.improvements.push("Focus on advanced topics");
      insights.recommendations.push("Spend more time with complex questions");
    }

    // Time insights
    if (summary.averageTimePerQuestion < 30) {
      insights.recommendations.push(
        "Consider taking more time to think through answers",
      );
    } else if (summary.averageTimePerQuestion > 120) {
      insights.recommendations.push(
        "Practice for faster recall and recognition",
      );
    }

    return insights;
  }
}

export default QAExporter;
