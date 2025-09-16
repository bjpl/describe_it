// Session Report Generator - Generate formatted reports with statistics and analytics
import {
  SessionSummary,
  SessionReport,
  LearningMetrics,
  SessionInteraction,
  InteractionType,
} from "../../types/session";
import { SessionLogger } from "./sessionLogger";
import { safeParse, safeStringify } from "@/lib/utils/json-safe";

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string;
    borderWidth?: number;
    fill?: boolean;
  }>;
}

export interface ProgressMetrics {
  accuracyTrend: Array<{ timestamp: number; accuracy: number }>;
  learningCurve: Array<{ session: number; score: number }>;
  activityHeatmap: Array<{ hour: number; activity: number }>;
  vocabularyGrowth: Array<{ date: string; cumulative: number; new: number }>;
  timeSpentByActivity: Record<string, number>;
  difficultyProgression: Array<{ timestamp: number; difficulty: number }>;
}

export interface VisualReportData {
  progressCharts: {
    learningScore: ChartData;
    vocabularyGrowth: ChartData;
    activityBreakdown: ChartData;
    timeAnalysis: ChartData;
    accuracyTrend: ChartData;
  };
  heatmaps: {
    activityByHour: Array<{ hour: number; count: number }>;
    learningIntensity: Array<{ period: string; intensity: number }>;
  };
  progressMetrics: ProgressMetrics;
}

export class SessionReportGenerator {
  constructor(private sessionLogger: SessionLogger) {}

  public generateDetailedReport(): SessionReport {
    const summary = this.sessionLogger.generateSummary();
    const learningMetrics = this.sessionLogger.getLearningMetrics();
    const interactions = this.sessionLogger.getInteractions();
    const recommendations = this.generateDetailedRecommendations(
      summary,
      learningMetrics,
    );

    return {
      summary,
      interactions,
      learningMetrics,
      recommendations,
      exportFormat: "json",
      generatedAt: Date.now(),
    };
  }

  public generateQuickSummary(): string {
    const summary = this.sessionLogger.generateSummary();
    const duration = Math.round(summary.totalDuration / 1000 / 60);

    return `Session ${summary.sessionId.split("_")[1]}: ${duration}min, ${summary.totalInteractions} actions, Score: ${summary.learningScore}/100`;
  }

  public generateLearningProgressReport(): {
    currentLevel: string;
    progressToNext: number;
    strengthAreas: string[];
    improvementAreas: string[];
    milestones: string[];
  } {
    const summary = this.sessionLogger.generateSummary();
    const learningMetrics = this.sessionLogger.getLearningMetrics();

    const strengthAreas: string[] = [];
    const improvementAreas: string[] = [];

    // Analyze performance areas
    if (summary.descriptionsGenerated >= 5) {
      strengthAreas.push("Content Creation");
    } else {
      improvementAreas.push("Generate more descriptions");
    }

    if (summary.vocabularySelected >= 20) {
      strengthAreas.push("Vocabulary Building");
    } else {
      improvementAreas.push("Select more vocabulary words");
    }

    if (summary.questionsGenerated >= 3) {
      strengthAreas.push("Critical Thinking");
    } else {
      improvementAreas.push("Practice with Q&A generation");
    }

    const milestones = this.calculateMilestones(summary);
    const progressToNext = this.calculateProgressToNext(summary);

    return {
      currentLevel: summary.comprehensionLevel,
      progressToNext,
      strengthAreas,
      improvementAreas,
      milestones,
    };
  }

  public generateTimeAnalysisReport(): {
    totalTime: number;
    activeTime: number;
    timeBreakdown: Record<string, number>;
    peakActivityPeriods: Array<{
      start: number;
      end: number;
      intensity: number;
    }>;
    efficiencyScore: number;
  } {
    const interactions = this.sessionLogger.getInteractions();
    const summary = this.sessionLogger.generateSummary();

    // Calculate time breakdown by activity type
    const timeBreakdown: Record<string, number> = {};
    const activityIntensity: Array<{ timestamp: number; count: number }> = [];

    // Group interactions by 5-minute windows
    const windowSize = 5 * 60 * 1000; // 5 minutes
    const windows: Record<number, number> = {};

    interactions.forEach((interaction) => {
      const windowStart =
        Math.floor(interaction.timestamp / windowSize) * windowSize;
      windows[windowStart] = (windows[windowStart] || 0) + 1;

      // Estimate time spent on each activity type
      const estimatedDuration = this.estimateActivityDuration(interaction.type);
      timeBreakdown[interaction.type] =
        (timeBreakdown[interaction.type] || 0) + estimatedDuration;
    });

    // Find peak activity periods
    const peakActivityPeriods = Object.entries(windows)
      .filter(([_, count]) => count >= 3) // At least 3 interactions in 5 minutes
      .map(([start, count]) => ({
        start: parseInt(start),
        end: parseInt(start) + windowSize,
        intensity: count,
      }))
      .sort((a, b) => b.intensity - a.intensity);

    const totalTime = summary.totalDuration;
    const activeTime = Object.values(timeBreakdown).reduce(
      (sum, time) => sum + time,
      0,
    );
    const efficiencyScore = Math.round((activeTime / totalTime) * 100);

    return {
      totalTime,
      activeTime,
      timeBreakdown,
      peakActivityPeriods: peakActivityPeriods.slice(0, 5), // Top 5 peak periods
      efficiencyScore,
    };
  }

  public generateComparisonReport(previousSessions: SessionSummary[]): {
    improvementAreas: string[];
    regressionAreas: string[];
    overallTrend: "improving" | "stable" | "declining";
    keyMetrics: Array<{
      metric: string;
      current: number;
      previous: number;
      change: number;
      trend: "up" | "down" | "stable";
    }>;
  } {
    const currentSummary = this.sessionLogger.generateSummary();

    if (previousSessions.length === 0) {
      return {
        improvementAreas: [],
        regressionAreas: [],
        overallTrend: "stable",
        keyMetrics: [],
      };
    }

    const previousAvg = this.calculateAverageMetrics(previousSessions);
    const improvementAreas: string[] = [];
    const regressionAreas: string[] = [];
    const keyMetrics: Array<{
      metric: string;
      current: number;
      previous: number;
      change: number;
      trend: "up" | "down" | "stable";
    }> = [];

    // Compare key metrics
    const comparisons = [
      {
        metric: "Learning Score",
        current: currentSummary.learningScore,
        previous: previousAvg.learningScore,
      },
      {
        metric: "Engagement Score",
        current: currentSummary.engagementScore,
        previous: previousAvg.engagementScore,
      },
      {
        metric: "Vocabulary Selected",
        current: currentSummary.vocabularySelected,
        previous: previousAvg.vocabularySelected,
      },
      {
        metric: "Descriptions Generated",
        current: currentSummary.descriptionsGenerated,
        previous: previousAvg.descriptionsGenerated,
      },
      {
        metric: "Questions Generated",
        current: currentSummary.questionsGenerated,
        previous: previousAvg.questionsGenerated,
      },
    ];

    let improvementCount = 0;
    let totalComparisons = 0;

    comparisons.forEach(({ metric, current, previous }) => {
      const change = ((current - previous) / previous) * 100;
      const trend =
        Math.abs(change) < 5 ? "stable" : change > 0 ? "up" : "down";

      keyMetrics.push({ metric, current, previous, change, trend });

      if (change > 10) {
        improvementAreas.push(metric);
        improvementCount++;
      } else if (change < -10) {
        regressionAreas.push(metric);
      }

      totalComparisons++;
    });

    const overallTrend =
      improvementCount > totalComparisons / 2
        ? "improving"
        : improvementCount === 0
          ? "declining"
          : "stable";

    return {
      improvementAreas,
      regressionAreas,
      overallTrend,
      keyMetrics,
    };
  }

  public generateVocabularyReport(): {
    totalWords: number;
    categoriesExplored: string[];
    favoriteCategory: string;
    wordDiversity: number;
    recommendedCategories: string[];
  } {
    const interactions = this.sessionLogger.getInteractions();
    const vocabularyInteractions = interactions.filter(
      (i) => i.type === "vocabulary_selected",
    );

    const categoryCount: Record<string, number> = {};
    let totalWords = 0;

    vocabularyInteractions.forEach((interaction) => {
      const category = interaction.data.vocabularyCategory || "unknown";
      const wordCount = interaction.data.selectedWords?.length || 0;

      categoryCount[category] = (categoryCount[category] || 0) + wordCount;
      totalWords += wordCount;
    });

    const categoriesExplored = Object.keys(categoryCount);
    const favoriteCategory =
      Object.entries(categoryCount).sort(([, a], [, b]) => b - a)[0]?.[0] ||
      "none";

    // Calculate word diversity (number of different categories used)
    const wordDiversity = categoriesExplored.length;

    // Recommend unexplored or underused categories
    const allCategories = [
      "objetos",
      "acciones",
      "lugares",
      "colores",
      "emociones",
      "conceptos",
    ];
    const recommendedCategories = allCategories.filter(
      (cat) =>
        !categoriesExplored.includes(cat) || (categoryCount[cat] || 0) < 5,
    );

    return {
      totalWords,
      categoriesExplored,
      favoriteCategory,
      wordDiversity,
      recommendedCategories,
    };
  }

  public generateErrorAnalysisReport(): {
    errorRate: number;
    commonErrors: Array<{ type: string; count: number; suggestion: string }>;
    errorTrends: Array<{ time: number; errorCount: number }>;
    stability: "excellent" | "good" | "fair" | "poor";
  } {
    const interactions = this.sessionLogger.getInteractions();
    const summary = this.sessionLogger.generateSummary();

    const errorInteractions = interactions.filter(
      (i) => i.type === "error_occurred",
    );
    const errorRate = (errorInteractions.length / interactions.length) * 100;

    const errorTypeCount: Record<string, number> = {};
    errorInteractions.forEach((interaction) => {
      const errorType = interaction.data.errorCode || "unknown";
      errorTypeCount[errorType] = (errorTypeCount[errorType] || 0) + 1;
    });

    const commonErrors = Object.entries(errorTypeCount)
      .map(([type, count]) => ({
        type,
        count,
        suggestion: this.getErrorSuggestion(type),
      }))
      .sort((a, b) => b.count - a.count);

    // Calculate error trends over time
    const timeWindows = 10;
    const sessionDuration = summary.totalDuration;
    const windowSize = sessionDuration / timeWindows;

    const errorTrends: Array<{ time: number; errorCount: number }> = [];

    for (let i = 0; i < timeWindows; i++) {
      const windowStart = summary.startTime + i * windowSize;
      const windowEnd = windowStart + windowSize;

      const errorsInWindow = errorInteractions.filter(
        (interaction) =>
          interaction.timestamp >= windowStart &&
          interaction.timestamp < windowEnd,
      ).length;

      errorTrends.push({
        time: windowStart,
        errorCount: errorsInWindow,
      });
    }

    const stability =
      errorRate < 2
        ? "excellent"
        : errorRate < 5
          ? "good"
          : errorRate < 10
            ? "fair"
            : "poor";

    return {
      errorRate,
      commonErrors,
      errorTrends,
      stability,
    };
  }

  private generateDetailedRecommendations(
    summary: SessionSummary,
    learningMetrics: LearningMetrics,
  ): string[] {
    const recommendations: string[] = [];

    // Learning score recommendations
    if (summary.learningScore < 30) {
      recommendations.push(
        "Focus on exploring different description styles to improve learning variety",
      );
      recommendations.push(
        "Try generating questions about the images to test comprehension",
      );
    } else if (summary.learningScore < 70) {
      recommendations.push(
        "Great progress! Try selecting more vocabulary words to boost your score",
      );
      recommendations.push(
        "Challenge yourself with more complex images and descriptions",
      );
    } else {
      recommendations.push(
        "Excellent learning engagement! Consider helping others or exploring advanced features",
      );
    }

    // Engagement recommendations
    if (summary.engagementScore < 50) {
      recommendations.push(
        "Take breaks between sessions to maintain focus and retention",
      );
      recommendations.push("Try shorter, more focused learning sessions");
    }

    // Activity-specific recommendations
    if (summary.descriptionsGenerated === 0) {
      recommendations.push(
        "Start by generating image descriptions to practice language skills",
      );
    }

    if (summary.vocabularySelected < 10) {
      recommendations.push(
        "Select vocabulary words while reading descriptions to build your lexicon",
      );
    }

    if (summary.questionsGenerated === 0) {
      recommendations.push(
        "Use Q&A generation to test and reinforce your understanding",
      );
    }

    // Error-based recommendations
    if (summary.errorCount > 0) {
      recommendations.push(
        "Check your internet connection if you experience frequent errors",
      );
      recommendations.push("Try refreshing the page if images fail to load");
    }

    // Comprehensive level recommendations
    switch (summary.comprehensionLevel) {
      case "beginner":
        recommendations.push(
          "Start with simple, conversational description styles",
        );
        recommendations.push(
          "Focus on basic vocabulary categories like objects and colors",
        );
        break;
      case "intermediate":
        recommendations.push(
          "Experiment with academic or poetic description styles",
        );
        recommendations.push(
          "Challenge yourself with abstract concepts and emotions",
        );
        break;
      case "advanced":
        recommendations.push(
          "Try mixing different description styles in one session",
        );
        recommendations.push(
          "Create your own vocabulary categories and word groups",
        );
        break;
    }

    return recommendations;
  }

  private calculateMilestones(summary: SessionSummary): string[] {
    const milestones: string[] = [];

    if (summary.totalInteractions >= 10)
      milestones.push("Active Learner (10+ interactions)");
    if (summary.descriptionsGenerated >= 5)
      milestones.push("Content Creator (5+ descriptions)");
    if (summary.vocabularySelected >= 20)
      milestones.push("Vocabulary Builder (20+ words)");
    if (summary.questionsGenerated >= 3)
      milestones.push("Critical Thinker (3+ questions)");
    if (summary.imagesViewed >= 10)
      milestones.push("Visual Explorer (10+ images)");
    if (summary.learningScore >= 70)
      milestones.push("High Achiever (70+ learning score)");
    if (summary.totalDuration >= 10 * 60 * 1000)
      milestones.push("Dedicated Learner (10+ minutes)");

    return milestones;
  }

  private calculateProgressToNext(summary: SessionSummary): number {
    // Calculate progress toward next comprehension level
    switch (summary.comprehensionLevel) {
      case "beginner":
        // Progress toward intermediate: need 50+ learning score and 20+ vocabulary
        const scoreProgress = Math.min(summary.learningScore / 50, 1) * 50;
        const vocabProgress = Math.min(summary.vocabularySelected / 20, 1) * 50;
        return Math.round((scoreProgress + vocabProgress) / 2);

      case "intermediate":
        // Progress toward advanced: need 80+ learning score and 50+ vocabulary
        const advScoreProgress = Math.min(summary.learningScore / 80, 1) * 50;
        const advVocabProgress =
          Math.min(summary.vocabularySelected / 50, 1) * 50;
        return Math.round((advScoreProgress + advVocabProgress) / 2);

      case "advanced":
        return 100; // Already at highest level

      default:
        return 0;
    }
  }

  private estimateActivityDuration(interactionType: InteractionType): number {
    // Estimate duration in milliseconds for different interaction types
    const durations: Record<InteractionType, number> = {
      search_query: 10000, // 10 seconds
      image_selected: 5000, // 5 seconds
      description_generated: 30000, // 30 seconds
      description_viewed: 45000, // 45 seconds
      qa_generated: 20000, // 20 seconds
      qa_viewed: 30000, // 30 seconds
      phrase_extracted: 15000, // 15 seconds
      vocabulary_selected: 10000, // 10 seconds
      settings_changed: 5000, // 5 seconds
      modal_opened: 2000, // 2 seconds
      modal_closed: 1000, // 1 second
      page_view: 1000, // 1 second
      error_occurred: 5000, // 5 seconds
      export_initiated: 3000, // 3 seconds
      data_exported: 3000, // 3 seconds
      session_started: 0,
      session_ended: 0,
    };

    return durations[interactionType] || 5000;
  }

  private calculateAverageMetrics(sessions: SessionSummary[]): SessionSummary {
    const count = sessions.length;

    const average: Partial<SessionSummary> = {
      learningScore:
        sessions.reduce((sum, s) => sum + s.learningScore, 0) / count,
      engagementScore:
        sessions.reduce((sum, s) => sum + s.engagementScore, 0) / count,
      vocabularySelected:
        sessions.reduce((sum, s) => sum + s.vocabularySelected, 0) / count,
      descriptionsGenerated:
        sessions.reduce((sum, s) => sum + s.descriptionsGenerated, 0) / count,
      questionsGenerated:
        sessions.reduce((sum, s) => sum + s.questionsGenerated, 0) / count,
      totalInteractions:
        sessions.reduce((sum, s) => sum + s.totalInteractions, 0) / count,
      imagesViewed:
        sessions.reduce((sum, s) => sum + s.imagesViewed, 0) / count,
    };

    return average as SessionSummary;
  }

  private getErrorSuggestion(errorType: string): string {
    const suggestions: Record<string, string> = {
      network_error: "Check your internet connection and try again",
      api_timeout: "Request timed out - try refreshing the page",
      rate_limit: "Too many requests - wait a moment before trying again",
      invalid_image: "Try selecting a different image",
      generation_failed:
        "Generation failed - check image quality and try again",
      storage_error: "Clear browser cache and cookies",
      unknown: "Refresh the page or try a different browser",
    };

    return suggestions[errorType] || suggestions["unknown"];
  }

  // Enhanced visual analytics
  public generateVisualReportData(): VisualReportData {
    const summary = this.sessionLogger.generateSummary();
    const interactions = this.sessionLogger.getInteractions();

    return {
      progressCharts: {
        learningScore: this.generateLearningScoreChart(summary),
        vocabularyGrowth: this.generateVocabularyGrowthChart(interactions),
        activityBreakdown: this.generateActivityBreakdownChart(summary),
        timeAnalysis: this.generateTimeAnalysisChart(),
        accuracyTrend: this.generateAccuracyTrendChart(interactions),
      },
      heatmaps: {
        activityByHour: this.generateActivityHeatmap(interactions),
        learningIntensity: this.generateLearningIntensityHeatmap(interactions),
      },
      progressMetrics: this.generateProgressMetrics(interactions, summary),
    };
  }

  public generateProgressMetrics(
    interactions: SessionInteraction[],
    summary: SessionSummary,
  ): ProgressMetrics {
    const timeSpentByActivity: Record<string, number> = {};

    interactions.forEach((interaction) => {
      const estimatedTime = this.estimateActivityDuration(interaction.type);
      timeSpentByActivity[interaction.type] =
        (timeSpentByActivity[interaction.type] || 0) + estimatedTime;
    });

    return {
      accuracyTrend: this.calculateAccuracyTrend(interactions),
      learningCurve: this.calculateLearningCurve(interactions),
      activityHeatmap: this.calculateActivityHeatmap(interactions),
      vocabularyGrowth: this.calculateVocabularyGrowth(interactions),
      timeSpentByActivity,
      difficultyProgression: this.calculateDifficultyProgression(interactions),
    };
  }

  private calculateAccuracyTrend(
    interactions: SessionInteraction[],
  ): Array<{ timestamp: number; accuracy: number }> {
    const qaInteractions = interactions.filter(
      (i) => i.type === "qa_generated" || i.type === "qa_viewed",
    );
    const windowSize = 5 * 60 * 1000; // 5-minute windows
    const windows: Record<number, { correct: number; total: number }> = {};

    qaInteractions.forEach((interaction) => {
      const windowStart =
        Math.floor(interaction.timestamp / windowSize) * windowSize;
      if (!windows[windowStart]) {
        windows[windowStart] = { correct: 0, total: 0 };
      }
      windows[windowStart].total++;
      // Simulate accuracy based on difficulty and engagement
      const difficulty = interaction.data.qaDifficulty;
      const baseAccuracy =
        difficulty === "facil" ? 0.85 : difficulty === "medio" ? 0.7 : 0.55;
      if (Math.random() < baseAccuracy) {
        windows[windowStart].correct++;
      }
    });

    return Object.entries(windows)
      .map(([timestamp, data]) => ({
        timestamp: parseInt(timestamp),
        accuracy: data.total > 0 ? (data.correct / data.total) * 100 : 0,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  private calculateLearningCurve(
    interactions: SessionInteraction[],
  ): Array<{ session: number; score: number }> {
    const sessionChunks = this.chunkInteractionsByTime(
      interactions,
      10 * 60 * 1000,
    ); // 10-minute sessions

    return sessionChunks.map((chunk, index) => {
      const score = this.calculateChunkScore(chunk);
      return { session: index + 1, score };
    });
  }

  private calculateActivityHeatmap(
    interactions: SessionInteraction[],
  ): Array<{ hour: number; activity: number }> {
    const hourlyActivity: Record<number, number> = {};

    interactions.forEach((interaction) => {
      const hour = new Date(interaction.timestamp).getHours();
      hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;
    });

    return Array.from({ length: 24 }, (_, hour) => ({
      hour,
      activity: hourlyActivity[hour] || 0,
    }));
  }

  private calculateVocabularyGrowth(
    interactions: SessionInteraction[],
  ): Array<{ date: string; cumulative: number; new: number }> {
    const vocabularyInteractions = interactions
      .filter((i) => i.type === "vocabulary_selected")
      .sort((a, b) => a.timestamp - b.timestamp);

    const dailyGrowth: Record<string, { cumulative: number; new: number }> = {};
    let cumulativeCount = 0;

    vocabularyInteractions.forEach((interaction) => {
      const date = new Date(interaction.timestamp).toDateString();
      const newWords = interaction.data.selectedWords?.length || 0;
      cumulativeCount += newWords;

      if (!dailyGrowth[date]) {
        dailyGrowth[date] = { cumulative: 0, new: 0 };
      }
      dailyGrowth[date].new += newWords;
      dailyGrowth[date].cumulative = cumulativeCount;
    });

    return Object.entries(dailyGrowth)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  private calculateDifficultyProgression(
    interactions: SessionInteraction[],
  ): Array<{ timestamp: number; difficulty: number }> {
    const qaInteractions = interactions
      .filter((i) => i.type === "qa_generated")
      .sort((a, b) => a.timestamp - b.timestamp);

    return qaInteractions.map((interaction) => {
      const difficulty = interaction.data.qaDifficulty;
      const difficultyValue =
        difficulty === "facil" ? 1 : difficulty === "medio" ? 2 : 3;
      return {
        timestamp: interaction.timestamp,
        difficulty: difficultyValue,
      };
    });
  }

  // Chart generation methods
  private generateLearningScoreChart(summary: SessionSummary): ChartData {
    return {
      labels: ["Learning Score", "Engagement Score"],
      datasets: [
        {
          label: "Current Session",
          data: [summary.learningScore, summary.engagementScore],
          backgroundColor: ["#3B82F6", "#10B981"],
          borderColor: "#2563EB",
          borderWidth: 2,
        },
      ],
    };
  }

  private generateVocabularyGrowthChart(
    interactions: SessionInteraction[],
  ): ChartData {
    const vocabularyGrowth = this.calculateVocabularyGrowth(interactions);

    return {
      labels: vocabularyGrowth.map((item) => item.date),
      datasets: [
        {
          label: "Cumulative Vocabulary",
          data: vocabularyGrowth.map((item) => item.cumulative),
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          borderColor: "#3B82F6",
          borderWidth: 2,
          fill: true,
        },
        {
          label: "New Words",
          data: vocabularyGrowth.map((item) => item.new),
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          borderColor: "#10B981",
          borderWidth: 2,
          fill: false,
        },
      ],
    };
  }

  private generateActivityBreakdownChart(summary: SessionSummary): ChartData {
    const activities = Object.entries(summary.interactionBreakdown)
      .filter(([_, count]) => count > 0)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 8); // Top 8 activities

    const colors = [
      "#3B82F6",
      "#10B981",
      "#F59E0B",
      "#EF4444",
      "#8B5CF6",
      "#06B6D4",
      "#F97316",
      "#84CC16",
    ];

    return {
      labels: activities.map(([type, _]) => this.formatInteractionType(type)),
      datasets: [
        {
          label: "Interactions",
          data: activities.map(([_, count]) => count),
          backgroundColor: colors.slice(0, activities.length),
          borderWidth: 0,
        },
      ],
    };
  }

  private generateTimeAnalysisChart(): ChartData {
    const timeAnalysis = this.generateTimeAnalysisReport();
    const activities = Object.entries(timeAnalysis.timeBreakdown)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 6);

    return {
      labels: activities.map(([type, _]) => this.formatInteractionType(type)),
      datasets: [
        {
          label: "Time Spent (minutes)",
          data: activities.map(([_, time]) => Math.round(time / 1000 / 60)),
          backgroundColor: "rgba(139, 92, 246, 0.8)",
          borderColor: "#8B5CF6",
          borderWidth: 2,
        },
      ],
    };
  }

  private generateAccuracyTrendChart(
    interactions: SessionInteraction[],
  ): ChartData {
    const accuracyTrend = this.calculateAccuracyTrend(interactions);

    return {
      labels: accuracyTrend.map((item) =>
        new Date(item.timestamp).toLocaleTimeString(),
      ),
      datasets: [
        {
          label: "Accuracy %",
          data: accuracyTrend.map((item) => item.accuracy),
          backgroundColor: "rgba(34, 197, 94, 0.1)",
          borderColor: "#22C55E",
          borderWidth: 2,
          fill: true,
        },
      ],
    };
  }

  private generateActivityHeatmap(
    interactions: SessionInteraction[],
  ): Array<{ hour: number; count: number }> {
    return this.calculateActivityHeatmap(interactions).map((item) => ({
      hour: item.hour,
      count: item.activity,
    }));
  }

  private generateLearningIntensityHeatmap(
    interactions: SessionInteraction[],
  ): Array<{ period: string; intensity: number }> {
    const chunks = this.chunkInteractionsByTime(interactions, 15 * 60 * 1000); // 15-minute chunks

    return chunks.map((chunk, index) => {
      const startTime = new Date(chunk[0]?.timestamp || Date.now());
      const period = `${startTime.getHours()}:${String(startTime.getMinutes()).padStart(2, "0")}`;
      const intensity = this.calculateChunkIntensity(chunk);

      return { period, intensity };
    });
  }

  // Helper methods
  private chunkInteractionsByTime(
    interactions: SessionInteraction[],
    chunkSize: number,
  ): SessionInteraction[][] {
    if (interactions.length === 0) return [];

    const sorted = interactions.sort((a, b) => a.timestamp - b.timestamp);
    const chunks: SessionInteraction[][] = [];
    let currentChunk: SessionInteraction[] = [];
    let chunkStart = sorted[0].timestamp;

    sorted.forEach((interaction) => {
      if (interaction.timestamp - chunkStart > chunkSize) {
        if (currentChunk.length > 0) {
          chunks.push([...currentChunk]);
          currentChunk = [];
        }
        chunkStart = interaction.timestamp;
      }
      currentChunk.push(interaction);
    });

    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  private calculateChunkScore(chunk: SessionInteraction[]): number {
    const weights = {
      description_generated: 10,
      qa_generated: 15,
      vocabulary_selected: 8,
      phrase_extracted: 5,
      image_selected: 3,
      search_query: 2,
    };

    const score = chunk.reduce((sum, interaction) => {
      const weight = (weights as any)[interaction.type] || 1;
      return sum + weight;
    }, 0);

    return Math.min(score, 100);
  }

  private calculateChunkIntensity(chunk: SessionInteraction[]): number {
    const highValueInteractions = [
      "description_generated",
      "qa_generated",
      "vocabulary_selected",
    ];
    const highValueCount = chunk.filter((i) =>
      highValueInteractions.includes(i.type),
    ).length;
    return (highValueCount / chunk.length) * 100;
  }

  private formatInteractionType(type: string): string {
    return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  }

  // Export methods
  public exportReport(
    format: "json" | "text" | "csv" | "pdf" = "json",
  ): string {
    const report = this.generateDetailedReport();

    switch (format) {
      case "json":
        return safeStringify(report, null, 2);
      case "text":
        return this.formatReportAsText(report);
      case "csv":
        return this.formatReportAsCSV(report);
      case "pdf":
        return this.generatePDFReport(report);
      default:
        return safeStringify(report, null, 2);
    }
  }

  public async exportVisualReport(
    format: "html" | "pdf" = "html",
  ): Promise<string> {
    const report = this.generateDetailedReport();
    const visualData = this.generateVisualReportData();

    if (format === "html") {
      return this.generateHTMLReport(report, visualData);
    } else {
      return this.generateEnhancedPDFReport(report, visualData);
    }
  }

  private formatReportAsText(report: SessionReport): string {
    const timeAnalysis = this.generateTimeAnalysisReport();
    const vocabularyReport = this.generateVocabularyReport();
    const errorAnalysis = this.generateErrorAnalysisReport();

    return `
COMPREHENSIVE SESSION REPORT
=============================
Session ID: ${report.summary.sessionId}
Generated: ${new Date(report.generatedAt).toLocaleString()}
Duration: ${Math.round(report.summary.totalDuration / 1000 / 60)} minutes
Total Interactions: ${report.summary.totalInteractions}

LEARNING PERFORMANCE
====================
Learning Score: ${report.summary.learningScore}/100
Engagement Score: ${report.summary.engagementScore}/100  
Comprehension Level: ${report.summary.comprehensionLevel}

ACTIVITY BREAKDOWN
==================
Searches Performed: ${report.summary.totalSearches}
Images Viewed: ${report.summary.imagesViewed}
Descriptions Generated: ${report.summary.descriptionsGenerated}
Questions Generated: ${report.summary.questionsGenerated}
Vocabulary Words Selected: ${report.summary.vocabularySelected}

VOCABULARY ANALYSIS
===================
Total Words: ${vocabularyReport.totalWords}
Categories Explored: ${vocabularyReport.categoriesExplored.join(", ")}
Favorite Category: ${vocabularyReport.favoriteCategory}
Word Diversity: ${vocabularyReport.wordDiversity}

TIME ANALYSIS  
=============
Total Session Time: ${Math.round(timeAnalysis.totalTime / 1000 / 60)} minutes
Active Learning Time: ${Math.round(timeAnalysis.activeTime / 1000 / 60)} minutes
Efficiency Score: ${timeAnalysis.efficiencyScore}%

ERROR ANALYSIS
==============
Error Rate: ${errorAnalysis.errorRate.toFixed(1)}%
System Stability: ${errorAnalysis.stability}
Common Issues: ${errorAnalysis.commonErrors
      .map((e) => e.type)
      .slice(0, 3)
      .join(", ")}

RECOMMENDATIONS
===============
${report.recommendations.map((r) => `• ${r}`).join("\n")}

MILESTONES ACHIEVED
===================
${this.calculateMilestones(report.summary)
  .map((m) => `🏆 ${m}`)
  .join("\n")}

=============================
Report generated by Describe It Learning Analytics
    `.trim();
  }

  private formatReportAsCSV(report: SessionReport): string {
    // Create CSV with multiple sheets worth of data
    const mainData = [
      ["Metric", "Value"],
      ["Session ID", report.summary.sessionId],
      [
        "Duration (minutes)",
        Math.round(report.summary.totalDuration / 1000 / 60).toString(),
      ],
      ["Total Interactions", report.summary.totalInteractions.toString()],
      ["Learning Score", report.summary.learningScore.toString()],
      ["Engagement Score", report.summary.engagementScore.toString()],
      ["Comprehension Level", report.summary.comprehensionLevel],
      ["Searches", report.summary.totalSearches.toString()],
      ["Images Viewed", report.summary.imagesViewed.toString()],
      [
        "Descriptions Generated",
        report.summary.descriptionsGenerated.toString(),
      ],
      ["Questions Generated", report.summary.questionsGenerated.toString()],
      ["Vocabulary Selected", report.summary.vocabularySelected.toString()],
    ];

    return mainData.map((row) => row.join(",")).join("\n");
  }

  private generatePDFReport(report: SessionReport): string {
    // For now, return formatted text that could be converted to PDF
    // In a real implementation, you'd use a PDF library
    return this.formatReportAsText(report);
  }

  private generateHTMLReport(
    report: SessionReport,
    visualData: VisualReportData,
  ): string {
    const timeAnalysis = this.generateTimeAnalysisReport();
    const vocabularyReport = this.generateVocabularyReport();

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Learning Session Report - ${report.summary.sessionId}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #f8fafc; }
    .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; }
    .header h1 { margin: 0; font-size: 2.5em; font-weight: 300; }
    .header p { margin: 10px 0 0; opacity: 0.9; font-size: 1.1em; }
    .content { padding: 40px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px; margin: 30px 0; }
    .card { background: #f8fafc; border-radius: 12px; padding: 25px; border: 1px solid #e2e8f0; }
    .card h3 { margin: 0 0 20px; color: #2d3748; font-size: 1.3em; }
    .metric { display: flex; justify-content: space-between; margin: 12px 0; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
    .metric:last-child { border-bottom: none; }
    .metric-value { font-weight: 600; color: #4a5568; }
    .score-circle { width: 120px; height: 120px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 2em; font-weight: bold; color: white; }
    .score-excellent { background: linear-gradient(135deg, #22c55e, #16a34a); }
    .score-good { background: linear-gradient(135deg, #3b82f6, #2563eb); }
    .score-fair { background: linear-gradient(135deg, #f59e0b, #d97706); }
    .score-poor { background: linear-gradient(135deg, #ef4444, #dc2626); }
    .progress-bar { width: 100%; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, #3b82f6, #8b5cf6); border-radius: 4px; }
    .recommendations { background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0; }
    .recommendations ul { margin: 10px 0; padding-left: 20px; }
    .milestones { display: flex; flex-wrap: wrap; gap: 10px; margin: 20px 0; }
    .milestone { background: #22c55e; color: white; padding: 8px 16px; border-radius: 20px; font-size: 0.9em; }
    .chart-placeholder { height: 200px; background: linear-gradient(135deg, #f8fafc, #e2e8f0); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #64748b; font-style: italic; }
    @media print { .container { box-shadow: none; } .header { background: #667eea !important; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Learning Session Report</h1>
      <p>Session ${report.summary.sessionId.split("_")[1]} • Generated ${new Date(report.generatedAt).toLocaleString()}</p>
      <p>Duration: ${Math.round(report.summary.totalDuration / 1000 / 60)} minutes • ${report.summary.totalInteractions} interactions</p>
    </div>
    
    <div class="content">
      <div class="grid">
        <div class="card">
          <h3>Learning Performance</h3>
          <div class="score-circle ${this.getScoreClass(report.summary.learningScore)}">
            ${report.summary.learningScore}
          </div>
          <div class="metric">
            <span>Engagement Score</span>
            <span class="metric-value">${report.summary.engagementScore}/100</span>
          </div>
          <div class="metric">
            <span>Comprehension Level</span>
            <span class="metric-value">${report.summary.comprehensionLevel}</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${report.summary.learningScore}%"></div>
          </div>
        </div>
        
        <div class="card">
          <h3>Activity Summary</h3>
          <div class="metric">
            <span>Searches Performed</span>
            <span class="metric-value">${report.summary.totalSearches}</span>
          </div>
          <div class="metric">
            <span>Images Viewed</span>
            <span class="metric-value">${report.summary.imagesViewed}</span>
          </div>
          <div class="metric">
            <span>Descriptions Generated</span>
            <span class="metric-value">${report.summary.descriptionsGenerated}</span>
          </div>
          <div class="metric">
            <span>Questions Created</span>
            <span class="metric-value">${report.summary.questionsGenerated}</span>
          </div>
          <div class="metric">
            <span>Vocabulary Words</span>
            <span class="metric-value">${report.summary.vocabularySelected}</span>
          </div>
        </div>
        
        <div class="card">
          <h3>Vocabulary Analysis</h3>
          <div class="metric">
            <span>Total Words</span>
            <span class="metric-value">${vocabularyReport.totalWords}</span>
          </div>
          <div class="metric">
            <span>Categories Explored</span>
            <span class="metric-value">${vocabularyReport.categoriesExplored.length}</span>
          </div>
          <div class="metric">
            <span>Favorite Category</span>
            <span class="metric-value">${vocabularyReport.favoriteCategory}</span>
          </div>
          <div class="metric">
            <span>Word Diversity</span>
            <span class="metric-value">${vocabularyReport.wordDiversity}/6</span>
          </div>
        </div>
        
        <div class="card">
          <h3>Time Analysis</h3>
          <div class="metric">
            <span>Total Time</span>
            <span class="metric-value">${Math.round(timeAnalysis.totalTime / 1000 / 60)}m</span>
          </div>
          <div class="metric">
            <span>Active Learning</span>
            <span class="metric-value">${Math.round(timeAnalysis.activeTime / 1000 / 60)}m</span>
          </div>
          <div class="metric">
            <span>Efficiency Score</span>
            <span class="metric-value">${timeAnalysis.efficiencyScore}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${timeAnalysis.efficiencyScore}%"></div>
          </div>
        </div>
      </div>
      
      <div class="card">
        <h3>Learning Progress Charts</h3>
        <div class="grid">
          <div class="chart-placeholder">Learning Score Trend Chart</div>
          <div class="chart-placeholder">Vocabulary Growth Chart</div>
          <div class="chart-placeholder">Activity Breakdown Chart</div>
          <div class="chart-placeholder">Time Analysis Chart</div>
        </div>
      </div>
      
      <div class="recommendations">
        <h3>📚 Personalized Recommendations</h3>
        <ul>
          ${report.recommendations.map((r) => `<li>${r}</li>`).join("")}
        </ul>
      </div>
      
      <div class="card">
        <h3>🏆 Milestones Achieved</h3>
        <div class="milestones">
          ${this.calculateMilestones(report.summary)
            .map((m) => `<div class="milestone">${m}</div>`)
            .join("")}
        </div>
      </div>
    </div>
  </div>
</body>
</html>
    `;
  }

  private async generateEnhancedPDFReport(
    report: SessionReport,
    visualData: VisualReportData,
  ): Promise<string> {
    // This would use jsPDF to create a comprehensive PDF with charts
    // For now, return the HTML version that can be printed to PDF
    return this.generateHTMLReport(report, visualData);
  }

  private getScoreClass(score: number): string {
    if (score >= 80) return "score-excellent";
    if (score >= 60) return "score-good";
    if (score >= 40) return "score-fair";
    return "score-poor";
  }
}

// Factory function for easy use
export function createReportGenerator(
  sessionLogger: SessionLogger,
): SessionReportGenerator {
  return new SessionReportGenerator(sessionLogger);
}
