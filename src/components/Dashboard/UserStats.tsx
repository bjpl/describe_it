"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingOverlay, CardSkeletonEnhanced } from "@/components/ui/LoadingStates";
import { supabase, DatabaseService } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
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
  Trophy,
  Target,
  Clock,
  Calendar,
  Zap,
  BookOpen,
  Brain,
  TrendingUp,
  Award,
  Star,
  Activity,
  Users,
  Globe,
  Flame,
  ChevronUp,
  ChevronDown
} from "lucide-react";
import type { UserProgress, StudySession } from "@/types/database";
import { logger } from '@/lib/logger';

interface UserStatsProps {
  className?: string;
  userId?: string;
  timeRange?: "7d" | "30d" | "90d" | "1y" | "all";
}

interface StatsData {
  overview: {
    totalWords: number;
    totalSessions: number;
    totalTimeSpent: number; // minutes
    currentStreak: number;
    longestStreak: number;
    averageAccuracy: number;
    level: string;
    experience: number;
    rank: number;
  };
  achievements: Achievement[];
  weeklyStats: WeeklyStats[];
  categoryBreakdown: CategoryStats[];
  timeDistribution: TimeStats[];
  comparisonStats: ComparisonStats;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  progress?: number;
  maxProgress?: number;
}

interface WeeklyStats {
  week: string;
  wordsLearned: number;
  sessionsCompleted: number;
  accuracy: number;
  timeSpent: number;
}

interface CategoryStats {
  category: string;
  count: number;
  accuracy: number;
  color: string;
}

interface TimeStats {
  hour: number;
  sessions: number;
  accuracy: number;
}

interface ComparisonStats {
  previousPeriod: {
    wordsLearned: number;
    accuracy: number;
    timeSpent: number;
    sessions: number;
  };
  percentageChanges: {
    words: number;
    accuracy: number;
    time: number;
    sessions: number;
  };
}

const ACHIEVEMENT_COLORS = {
  common: "bg-gray-100 text-gray-800",
  rare: "bg-blue-100 text-blue-800",
  epic: "bg-purple-100 text-purple-800",
  legendary: "bg-yellow-100 text-yellow-800"
};

const CATEGORY_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"
];

export function UserStats({
  className,
  userId,
  timeRange = "30d"
}: UserStatsProps) {
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<"overview" | "achievements" | "analytics">("overview");

  const fetchUserStats = useCallback(async () => {
    if (!userId) {
      // Create mock data for demo
      setTimeout(() => {
        setStatsData(generateMockStats());
        setLoading(false);
      }, 1000);
      return;
    }
    
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
        "1y": 365,
        "all": 3650 // 10 years
      }[timeRange];
      startDate.setDate(endDate.getDate() - daysBack);

      // Fetch data
      const [progress, sessions] = await Promise.all([
        DatabaseService.getLearningProgress(userId, daysBack),
        DatabaseService.getUserSessions(userId, daysBack)
      ]);

      // Process and aggregate data
      const stats = await processUserStats(
        progress,
        sessions as StudySession[],
        startDate,
        endDate
      );
      
      setStatsData(stats);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch user stats";
      setError(errorMessage);
      logger.error("Error fetching user stats:", err);
    } finally {
      setLoading(false);
    }
  }, [userId, timeRange]);

  useEffect(() => {
    fetchUserStats();
  }, [fetchUserStats]);

  const generateMockStats = (): StatsData => ({
    overview: {
      totalWords: 234,
      totalSessions: 67,
      totalTimeSpent: 1440, // 24 hours
      currentStreak: 7,
      longestStreak: 15,
      averageAccuracy: 87.5,
      level: "Intermediate",
      experience: 2340,
      rank: 142
    },
    achievements: [
      {
        id: "first_100",
        name: "Century Club",
        description: "Learn your first 100 words",
        icon: "trophy",
        earnedAt: "2024-01-15",
        rarity: "rare"
      },
      {
        id: "streak_7",
        name: "Week Warrior",
        description: "Maintain a 7-day learning streak",
        icon: "flame",
        earnedAt: "2024-02-01",
        rarity: "epic"
      },
      {
        id: "accuracy_master",
        name: "Accuracy Master",
        description: "Maintain 90%+ accuracy for 10 sessions",
        icon: "target",
        earnedAt: "2024-02-10",
        rarity: "legendary"
      },
      {
        id: "time_dedication",
        name: "Time Dedication",
        description: "Study for 20+ hours total",
        icon: "clock",
        earnedAt: "2024-02-20",
        rarity: "rare"
      }
    ],
    weeklyStats: Array.from({ length: 12 }, (_, i) => ({
      week: `Week ${i + 1}`,
      wordsLearned: Math.floor(Math.random() * 30) + 10,
      sessionsCompleted: Math.floor(Math.random() * 8) + 2,
      accuracy: Math.floor(Math.random() * 20) + 75,
      timeSpent: Math.floor(Math.random() * 200) + 60
    })),
    categoryBreakdown: [
      { category: "Nouns", count: 89, accuracy: 92, color: CATEGORY_COLORS[0] },
      { category: "Verbs", count: 67, accuracy: 85, color: CATEGORY_COLORS[1] },
      { category: "Adjectives", count: 45, accuracy: 88, color: CATEGORY_COLORS[2] },
      { category: "Adverbs", count: 23, accuracy: 83, color: CATEGORY_COLORS[3] },
      { category: "Phrases", count: 10, accuracy: 90, color: CATEGORY_COLORS[4] }
    ],
    timeDistribution: Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      sessions: Math.floor(Math.random() * 10),
      accuracy: Math.floor(Math.random() * 20) + 75
    })),
    comparisonStats: {
      previousPeriod: {
        wordsLearned: 187,
        accuracy: 82.3,
        timeSpent: 960,
        sessions: 52
      },
      percentageChanges: {
        words: 25.1,
        accuracy: 6.3,
        time: 50.0,
        sessions: 28.8
      }
    }
  });

  const processUserStats = async (
    progress: UserProgress[],
    sessions: StudySession[],
    startDate: Date,
    endDate: Date
  ): Promise<StatsData> => {
    // This would implement real data processing
    return generateMockStats();
  };

  const formatTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <ChevronUp className="h-3 w-3 text-emerald-500" />;
    if (change < 0) return <ChevronDown className="h-3 w-3 text-red-500" />;
    return null;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return "text-emerald-600";
    if (change < 0) return "text-red-600";
    return "text-muted-foreground";
  };

  if (error) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="text-center p-8 border rounded-lg bg-destructive/5">
          <p className="text-sm text-destructive mb-2">Failed to load user statistics</p>
          <p className="text-xs text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchUserStats} size="sm" variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* View Selector */}
      <div className="flex gap-2">
        <Button
          variant={selectedView === "overview" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedView("overview")}
        >
          <Activity className="h-4 w-4 mr-2" />
          Overview
        </Button>
        <Button
          variant={selectedView === "achievements" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedView("achievements")}
        >
          <Trophy className="h-4 w-4 mr-2" />
          Achievements
        </Button>
        <Button
          variant={selectedView === "analytics" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedView("analytics")}
        >
          <TrendingUp className="h-4 w-4 mr-2" />
          Analytics
        </Button>
      </div>

      <LoadingOverlay isLoading={loading}>
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <CardSkeletonEnhanced key={i} className="h-32" />
            ))}
          </div>
        ) : statsData && (
          <>
            {/* Overview Section */}
            {selectedView === "overview" && (
              <div className="space-y-6">
                {/* Key Metrics */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Words Learned</p>
                        <p className="text-2xl font-bold">{statsData.overview.totalWords}</p>
                        <div className="flex items-center text-xs mt-1">
                          {getChangeIcon(statsData.comparisonStats.percentageChanges.words)}
                          <span className={getChangeColor(statsData.comparisonStats.percentageChanges.words)}>
                            {Math.abs(statsData.comparisonStats.percentageChanges.words)}%
                          </span>
                        </div>
                      </div>
                      <BookOpen className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Accuracy</p>
                        <p className="text-2xl font-bold">{statsData.overview.averageAccuracy.toFixed(1)}%</p>
                        <div className="flex items-center text-xs mt-1">
                          {getChangeIcon(statsData.comparisonStats.percentageChanges.accuracy)}
                          <span className={getChangeColor(statsData.comparisonStats.percentageChanges.accuracy)}>
                            {Math.abs(statsData.comparisonStats.percentageChanges.accuracy)}%
                          </span>
                        </div>
                      </div>
                      <Target className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Study Time</p>
                        <p className="text-2xl font-bold">{formatTime(statsData.overview.totalTimeSpent)}</p>
                        <div className="flex items-center text-xs mt-1">
                          {getChangeIcon(statsData.comparisonStats.percentageChanges.time)}
                          <span className={getChangeColor(statsData.comparisonStats.percentageChanges.time)}>
                            {Math.abs(statsData.comparisonStats.percentageChanges.time)}%
                          </span>
                        </div>
                      </div>
                      <Clock className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Current Streak</p>
                        <p className="text-2xl font-bold">{statsData.overview.currentStreak}</p>
                        <p className="text-xs text-muted-foreground">Longest: {statsData.overview.longestStreak} days</p>
                      </div>
                      <Flame className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </Card>
                </div>

                {/* Level Progress */}
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">Level Progress</h3>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{statsData.overview.level}</Badge>
                        <span className="text-sm text-muted-foreground">
                          Rank #{statsData.overview.rank} • {statsData.overview.experience} XP
                        </span>
                      </div>
                    </div>
                    <Award className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="w-full bg-secondary rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${(statsData.overview.experience % 1000) / 10}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>{statsData.overview.experience % 1000} XP</span>
                    <span>Next level: {1000 - (statsData.overview.experience % 1000)} XP</span>
                  </div>
                </Card>

                {/* Category Breakdown */}
                <Card className="p-6">
                  <CardHeader className="px-0 pt-0">
                    <CardTitle>Learning Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="px-0 pb-0">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        {statsData.categoryBreakdown.map((category) => (
                          <div key={category.category} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: category.color }}
                              />
                              <span className="font-medium">{category.category}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-semibold">{category.count}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                {category.accuracy}% accuracy
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={statsData.categoryBreakdown as any}
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              dataKey="count"
                              label={({ category, count }: any) => `${category}: ${count}`}
                              labelLine={false}
                            >
                              {statsData.categoryBreakdown.map((entry, index) => (
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
              </div>
            )}

            {/* Achievements Section */}
            {selectedView === "achievements" && (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {statsData.achievements.map((achievement) => (
                    <Card key={achievement.id} className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-primary/10 rounded-full">
                          {achievement.icon === "trophy" && <Trophy className="h-5 w-5 text-primary" />}
                          {achievement.icon === "flame" && <Flame className="h-5 w-5 text-primary" />}
                          {achievement.icon === "target" && <Target className="h-5 w-5 text-primary" />}
                          {achievement.icon === "clock" && <Clock className="h-5 w-5 text-primary" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <h4 className="font-semibold">{achievement.name}</h4>
                            <Badge className={cn("text-xs", ACHIEVEMENT_COLORS[achievement.rarity])}>
                              {achievement.rarity}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {achievement.description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Earned: {new Date(achievement.earnedAt).toLocaleDateString()}
                          </p>
                          {achievement.progress && achievement.maxProgress && (
                            <div className="mt-2">
                              <div className="w-full bg-secondary rounded-full h-1">
                                <div
                                  className="bg-primary h-1 rounded-full"
                                  style={{ width: `${(achievement.progress / achievement.maxProgress) * 100}%` }}
                                />
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {achievement.progress} / {achievement.maxProgress}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Analytics Section */}
            {selectedView === "analytics" && (
              <div className="space-y-6">
                {/* Weekly Progress Chart */}
                <Card className="p-6">
                  <CardHeader className="px-0 pt-0">
                    <CardTitle>Weekly Progress</CardTitle>
                  </CardHeader>
                  <CardContent className="px-0 pb-0">
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={statsData.weeklyStats}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis dataKey="week" className="text-xs" />
                          <YAxis className="text-xs" />
                          <Tooltip />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="wordsLearned"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            name="Words Learned"
                          />
                          <Line
                            type="monotone"
                            dataKey="accuracy"
                            stroke="#10b981"
                            strokeWidth={2}
                            name="Accuracy %"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Time Distribution */}
                <Card className="p-6">
                  <CardHeader className="px-0 pt-0">
                    <CardTitle>Study Time Distribution</CardTitle>
                  </CardHeader>
                  <CardContent className="px-0 pb-0">
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={statsData.timeDistribution}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis 
                            dataKey="hour" 
                            className="text-xs"
                            tickFormatter={(hour) => `${hour}:00`}
                          />
                          <YAxis className="text-xs" />
                          <Tooltip
                            labelFormatter={(hour) => `${hour}:00 - ${hour + 1}:00`}
                            formatter={(value: number, name: string) => [
                              name === "sessions" ? `${value} sessions` : `${value}%`,
                              name === "sessions" ? "Sessions" : "Accuracy"
                            ]}
                          />
                          <Bar
                            dataKey="sessions"
                            fill="#3b82f6"
                            radius={[2, 2, 0, 0]}
                            name="Sessions"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </LoadingOverlay>
    </div>
  );
}

export default UserStats;
