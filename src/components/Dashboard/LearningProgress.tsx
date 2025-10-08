"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingOverlay, CardSkeletonEnhanced } from "@/components/ui/LoadingStates";
import { supabase, DatabaseService } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import {
  Calendar,
  TrendingUp,
  Target,
  Award,
  Clock,
  BookOpen,
  Brain,
  Zap
} from "lucide-react";
import type { UserProgress, StudySession } from "@/types/database";
import { logger } from '@/lib/logger';

interface LearningProgressProps {
  className?: string;
  userId?: string;
  timeRange?: "7d" | "30d" | "90d" | "1y";
  showInsights?: boolean;
}

interface ProgressData {
  date: string;
  wordsLearned: number;
  accuracy: number;
  timeSpent: number; // minutes
  sessionsCompleted: number;
}

interface ProgressSummary {
  totalWords: number;
  averageAccuracy: number;
  totalTimeSpent: number;
  streak: number;
  level: string;
  nextLevelProgress: number;
  weeklyGoalProgress: number;
}

interface CategoryProgress {
  category: string;
  mastered: number;
  learning: number;
  total: number;
  color: string;
}

const CHART_COLORS = {
  primary: "#3b82f6",
  secondary: "#10b981",
  accent: "#f59e0b",
  danger: "#ef4444",
  muted: "#6b7280"
};

const CATEGORY_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"
];

export function LearningProgress({
  className,
  userId,
  timeRange = "30d",
  showInsights = true
}: LearningProgressProps) {
  const [progressData, setProgressData] = useState<ProgressData[]>([]);
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [categoryProgress, setCategoryProgress] = useState<CategoryProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeChart, setActiveChart] = useState<"progress" | "accuracy" | "time">("progress");

  useEffect(() => {
    fetchProgressData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, timeRange]); // fetchProgressData is stable

  const fetchProgressData = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      setError(null);

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      const daysBack = {
        "7d": 7,
        "30d": 30,
        "90d": 90,
        "1y": 365
      }[timeRange];
      startDate.setDate(endDate.getDate() - daysBack);

      // Fetch user progress and sessions
      const [progress, sessions] = await Promise.all([
        DatabaseService.getLearningProgress(userId, daysBack),
        DatabaseService.getUserSessions(userId, daysBack)
      ]);

      // Transform data for charts
      const dailyData = generateDailyProgressData(progress, sessions as StudySession[], startDate, endDate);
      setProgressData(dailyData);

      // Calculate summary statistics
      const progressSummary = calculateProgressSummary(progress, sessions as StudySession[]);
      setSummary(progressSummary);

      // Calculate category progress
      const categories = calculateCategoryProgress(progress);
      setCategoryProgress(categories);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch progress data";
      setError(errorMessage);
      logger.error("Error fetching progress data:", err);
    } finally {
      setLoading(false);
    }
  };

  const generateDailyProgressData = (
    progress: UserProgress[],
    sessions: StudySession[],
    startDate: Date,
    endDate: Date
  ): ProgressData[] => {
    const data: ProgressData[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayProgress = progress.filter(p => 
        p.last_reviewed.startsWith(dateStr)
      );
      const daySessions = sessions.filter(s => 
        s.started_at.startsWith(dateStr)
      );

      data.push({
        date: dateStr,
        wordsLearned: dayProgress.length,
        accuracy: daySessions.length > 0 
          ? daySessions.reduce((sum, s) => sum + s.accuracy, 0) / daySessions.length 
          : 0,
        timeSpent: daySessions.reduce((sum, s) => sum + (s.time_spent / 60), 0), // Convert to minutes
        sessionsCompleted: daySessions.length
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return data;
  };

  const calculateProgressSummary = (
    progress: UserProgress[],
    sessions: StudySession[]
  ): ProgressSummary => {
    const totalWords = progress.length;
    const averageAccuracy = sessions.length > 0 
      ? sessions.reduce((sum, s) => sum + s.accuracy, 0) / sessions.length 
      : 0;
    const totalTimeSpent = sessions.reduce((sum, s) => sum + s.time_spent, 0);
    
    // Calculate streak (simplified)
    const streak = calculateStreak(sessions);
    
    // Determine level based on total words
    const level = getLevelFromWords(totalWords);
    const nextLevelProgress = getNextLevelProgress(totalWords);
    
    // Calculate weekly goal progress (assume goal of 50 words/week)
    const weeklyGoalProgress = Math.min((totalWords % 50) / 50 * 100, 100);

    return {
      totalWords,
      averageAccuracy,
      totalTimeSpent,
      streak,
      level,
      nextLevelProgress,
      weeklyGoalProgress
    };
  };

  const calculateCategoryProgress = (progress: UserProgress[]): CategoryProgress[] => {
    // This would be based on your vocabulary categorization
    // For now, return mock data
    return [
      { category: "Nouns", mastered: 45, learning: 15, total: 60, color: CATEGORY_COLORS[0] },
      { category: "Verbs", mastered: 30, learning: 20, total: 50, color: CATEGORY_COLORS[1] },
      { category: "Adjectives", mastered: 25, learning: 10, total: 35, color: CATEGORY_COLORS[2] },
      { category: "Adverbs", mastered: 15, learning: 8, total: 23, color: CATEGORY_COLORS[3] },
      { category: "Phrases", mastered: 20, learning: 12, total: 32, color: CATEGORY_COLORS[4] }
    ];
  };

  const calculateStreak = (sessions: StudySession[]): number => {
    // Simplified streak calculation
    return 7; // Mock value
  };

  const getLevelFromWords = (totalWords: number): string => {
    if (totalWords < 50) return "Beginner";
    if (totalWords < 200) return "Intermediate";
    if (totalWords < 500) return "Advanced";
    return "Expert";
  };

  const getNextLevelProgress = (totalWords: number): number => {
    const thresholds = [50, 200, 500, 1000];
    const currentThreshold = thresholds.find(t => totalWords < t) || 1000;
    const previousThreshold = thresholds[thresholds.indexOf(currentThreshold) - 1] || 0;
    return ((totalWords - previousThreshold) / (currentThreshold - previousThreshold)) * 100;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  if (error) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="text-center p-8 border rounded-lg bg-destructive/5">
          <p className="text-sm text-destructive mb-2">Failed to load progress data</p>
          <p className="text-xs text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchProgressData} size="sm" variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <CardSkeletonEnhanced key={i} className="h-24" />
          ))
        ) : summary && (
          <>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Words Learned</p>
                  <p className="text-2xl font-bold">{summary.totalWords}</p>
                </div>
                <BookOpen className="h-8 w-8 text-muted-foreground" />
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Accuracy</p>
                  <p className="text-2xl font-bold">{summary.averageAccuracy.toFixed(0)}%</p>
                </div>
                <Target className="h-8 w-8 text-muted-foreground" />
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Study Time</p>
                  <p className="text-2xl font-bold">{Math.round(summary.totalTimeSpent / 60)}h</p>
                </div>
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Streak</p>
                  <p className="text-2xl font-bold">{summary.streak} days</p>
                </div>
                <Zap className="h-8 w-8 text-muted-foreground" />
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Progress Level Card */}
      {!loading && summary && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Level Progress</h3>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{summary.level}</Badge>
                <span className="text-sm text-muted-foreground">
                  {summary.nextLevelProgress.toFixed(0)}% to next level
                </span>
              </div>
            </div>
            <Award className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-500"
              style={{ width: `${summary.nextLevelProgress}%` }}
            />
          </div>
        </Card>
      )}

      {/* Chart Controls */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={activeChart === "progress" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveChart("progress")}
        >
          Words Progress
        </Button>
        <Button
          variant={activeChart === "accuracy" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveChart("accuracy")}
        >
          Accuracy Trend
        </Button>
        <Button
          variant={activeChart === "time" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveChart("time")}
        >
          Study Time
        </Button>
      </div>

      {/* Main Chart */}
      <Card className="p-6">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {activeChart === "progress" && "Learning Progress"}
            {activeChart === "accuracy" && "Accuracy Trend"}
            {activeChart === "time" && "Study Time Distribution"}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <LoadingOverlay isLoading={loading}>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%" as="div">
                {activeChart === "progress" && (
                  <AreaChart data={progressData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={formatDate}
                      className="text-xs"
                    />
                    <YAxis className="text-xs" />
                    <Tooltip
                      labelFormatter={(value) => formatDate(value as string)}
                      formatter={(value: number, name: string) => [
                        name === "wordsLearned" ? `${value} words` : value,
                        name === "wordsLearned" ? "Words Learned" : name
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="wordsLearned"
                      stroke={CHART_COLORS.primary}
                      fill={CHART_COLORS.primary}
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                )}
                
                {activeChart === "accuracy" && (
                  <LineChart data={progressData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={formatDate}
                      className="text-xs"
                    />
                    <YAxis 
                      domain={[0, 100]}
                      className="text-xs"
                    />
                    <Tooltip
                      labelFormatter={(value) => formatDate(value as string)}
                      formatter={(value: number) => [`${value.toFixed(1)}%`, "Accuracy"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="accuracy"
                      stroke={CHART_COLORS.secondary}
                      strokeWidth={2}
                      dot={{ fill: CHART_COLORS.secondary, strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                )}
                
                {activeChart === "time" && (
                  <BarChart data={progressData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={formatDate}
                      className="text-xs"
                    />
                    <YAxis className="text-xs" />
                    <Tooltip
                      labelFormatter={(value) => formatDate(value as string)}
                      formatter={(value: number) => [`${value.toFixed(0)} min`, "Study Time"]}
                    />
                    <Bar
                      dataKey="timeSpent"
                      fill={CHART_COLORS.accent}
                      radius={[2, 2, 0, 0]}
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </LoadingOverlay>
        </CardContent>
      </Card>

      {/* Category Progress */}
      {!loading && categoryProgress.length > 0 && (
        <Card className="p-6">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Category Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Category bars */}
              <div className="space-y-4">
                {categoryProgress.map((category, index) => (
                  <div key={category.category} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{category.category}</span>
                      <span className="text-muted-foreground">
                        {category.mastered}/{category.total}
                      </span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${(category.mastered / category.total) * 100}%`,
                          backgroundColor: category.color
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Pie chart */}
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryProgress}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="mastered"
                      label={({ category, mastered }) => `${category}: ${mastered}`}
                      labelLine={false}
                    >
                      {categoryProgress.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default LearningProgress;
