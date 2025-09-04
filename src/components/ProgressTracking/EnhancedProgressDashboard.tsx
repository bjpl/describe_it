"use client";

import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Target,
  Clock,
  Award,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  Star,
  Flame,
  BookOpen,
  Brain,
  Zap,
  CheckCircle,
  Trophy,
  Timer,
  Users,
  Globe,
  Filter,
  Download,
  RefreshCw,
} from "lucide-react";

interface LearningSession {
  id: string;
  date: Date;
  duration: number;
  questionsAnswered: number;
  correctAnswers: number;
  accuracy: number;
  topic: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  streak: number;
}

interface LearningStats {
  totalSessions: number;
  totalTime: number;
  totalQuestions: number;
  totalCorrect: number;
  overallAccuracy: number;
  currentStreak: number;
  longestStreak: number;
  averageSessionTime: number;
  vocabularyLearned: number;
  conceptsMastered: number;
  weeklyGoalProgress: number;
  monthlyGoalProgress: number;
}

interface ProgressGoal {
  id: string;
  title: string;
  target: number;
  current: number;
  type: "sessions" | "accuracy" | "time" | "vocabulary";
  period: "daily" | "weekly" | "monthly";
  deadline: Date;
}

interface EnhancedProgressDashboardProps {
  sessions?: LearningSession[];
  stats?: LearningStats;
  goals?: ProgressGoal[];
  showDetailedCharts?: boolean;
  className?: string;
}

const EnhancedProgressDashboard: React.FC<EnhancedProgressDashboardProps> = ({
  sessions = [],
  stats,
  goals = [],
  showDetailedCharts = true,
  className = "",
}) => {
  const [timeFilter, setTimeFilter] = useState<"week" | "month" | "year">(
    "week",
  );
  const [selectedMetric, setSelectedMetric] = useState<
    "accuracy" | "sessions" | "time"
  >("accuracy");
  const [showGoals, setShowGoals] = useState(true);

  // Mock data if not provided
  const mockStats: LearningStats = {
    totalSessions: 24,
    totalTime: 1440, // 24 hours in minutes
    totalQuestions: 180,
    totalCorrect: 144,
    overallAccuracy: 80,
    currentStreak: 7,
    longestStreak: 12,
    averageSessionTime: 25,
    vocabularyLearned: 156,
    conceptsMastered: 23,
    weeklyGoalProgress: 85,
    monthlyGoalProgress: 67,
  };

  const mockGoals: ProgressGoal[] = [
    {
      id: "1",
      title: "Daily Practice",
      target: 1,
      current: 1,
      type: "sessions",
      period: "daily",
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
    {
      id: "2",
      title: "Weekly Accuracy",
      target: 85,
      current: 82,
      type: "accuracy",
      period: "weekly",
      deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    },
    {
      id: "3",
      title: "Monthly Vocabulary",
      target: 200,
      current: 156,
      type: "vocabulary",
      period: "monthly",
      deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    },
  ];

  const displayStats = stats || mockStats;
  const displayGoals = goals.length > 0 ? goals : mockGoals;

  // Calculate trend data
  const trendData = useMemo(() => {
    const days = 7;
    const data = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const sessionsForDay = sessions.filter(
        (s) => s.date.toDateString() === date.toDateString(),
      );

      data.push({
        date,
        sessions: sessionsForDay.length,
        accuracy:
          sessionsForDay.length > 0
            ? Math.round(
                sessionsForDay.reduce((acc, s) => acc + s.accuracy, 0) /
                  sessionsForDay.length,
              )
            : 0,
        time: sessionsForDay.reduce((acc, s) => acc + s.duration, 0),
      });
    }

    return data;
  }, [sessions, timeFilter]);

  const getStreakColor = (streak: number) => {
    if (streak >= 10) return "text-purple-600";
    if (streak >= 5) return "text-orange-600";
    if (streak >= 3) return "text-yellow-600";
    return "text-green-600";
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 90) return "text-green-600";
    if (accuracy >= 80) return "text-blue-600";
    if (accuracy >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const StatCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    value: string | number;
    subtitle?: string;
    trend?: "up" | "down" | "neutral";
    trendValue?: string;
    color?: string;
  }> = ({
    icon,
    title,
    value,
    subtitle,
    trend,
    trendValue,
    color = "blue",
  }) => (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
    >
      <div className="flex items-start justify-between">
        <div
          className={`w-12 h-12 rounded-lg bg-${color}-100 dark:bg-${color}-900/30 flex items-center justify-center`}
        >
          {icon}
        </div>
        {trend && trendValue && (
          <div
            className={`flex items-center gap-1 text-sm ${
              trend === "up"
                ? "text-green-600"
                : trend === "down"
                  ? "text-red-600"
                  : "text-gray-600"
            }`}
          >
            {trend === "up" && <TrendingUp className="h-4 w-4" />}
            {trend === "down" && <TrendingDown className="h-4 w-4" />}
            <span>{trendValue}</span>
          </div>
        )}
      </div>
      <div className="mt-4">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {value}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm">{title}</p>
        {subtitle && (
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            {subtitle}
          </p>
        )}
      </div>
    </motion.div>
  );

  const GoalProgress: React.FC<{ goal: ProgressGoal }> = ({ goal }) => {
    const progress = Math.min((goal.current / goal.target) * 100, 100);
    const isCompleted = progress >= 100;
    const daysLeft = Math.ceil(
      (goal.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-gray-900 dark:text-gray-100">
            {goal.title}
          </h4>
          {isCompleted && <CheckCircle className="h-5 w-5 text-green-600" />}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>
              {goal.current} / {goal.target}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>

          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <motion.div
              className={`h-2 rounded-full ${
                isCompleted
                  ? "bg-green-500"
                  : progress >= 80
                    ? "bg-blue-500"
                    : "bg-yellow-500"
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, delay: 0.2 }}
            />
          </div>

          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-500">
            <span className="capitalize">{goal.period} goal</span>
            <span>{daysLeft > 0 ? `${daysLeft} days left` : "Expired"}</span>
          </div>
        </div>
      </motion.div>
    );
  };

  const MiniChart: React.FC<{ data: any[]; metric: string }> = ({
    data,
    metric,
  }) => (
    <div className="h-20 flex items-end justify-between gap-1">
      {data.map((item, index) => {
        const value = item[metric];
        const maxValue = Math.max(...data.map((d) => d[metric]));
        const height = maxValue > 0 ? (value / maxValue) * 100 : 0;

        return (
          <motion.div
            key={index}
            className="flex-1 bg-blue-500 rounded-t min-h-[4px]"
            style={{ height: `${Math.max(height, 8)}%` }}
            initial={{ height: 0 }}
            animate={{ height: `${Math.max(height, 8)}%` }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          />
        );
      })}
    </div>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Learning Progress
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Track your Spanish learning journey
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>

          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <RefreshCw className="h-4 w-4" />
          </button>

          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Key Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Target className="h-6 w-6 text-blue-600" />}
          title="Overall Accuracy"
          value={`${displayStats.overallAccuracy}%`}
          trend="up"
          trendValue="+2.5%"
          color="blue"
        />

        <StatCard
          icon={
            <Flame
              className={`h-6 w-6 ${getStreakColor(displayStats.currentStreak)}`}
            />
          }
          title="Current Streak"
          value={`${displayStats.currentStreak} days`}
          subtitle={`Best: ${displayStats.longestStreak} days`}
          color="orange"
        />

        <StatCard
          icon={<Clock className="h-6 w-6 text-green-600" />}
          title="Total Study Time"
          value={formatTime(displayStats.totalTime)}
          subtitle={`Avg: ${displayStats.averageSessionTime}m/session`}
          color="green"
        />

        <StatCard
          icon={<BookOpen className="h-6 w-6 text-purple-600" />}
          title="Vocabulary Learned"
          value={displayStats.vocabularyLearned}
          trend="up"
          trendValue="+12 this week"
          color="purple"
        />
      </div>

      {/* Progress Charts */}
      {showDetailedCharts && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Trend Chart */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Weekly Progress
              </h3>

              <div className="flex gap-2">
                {(["accuracy", "sessions", "time"] as const).map((metric) => (
                  <button
                    key={metric}
                    onClick={() => setSelectedMetric(metric)}
                    className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
                      selectedMetric === metric
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    {metric}
                  </button>
                ))}
              </div>
            </div>

            <MiniChart data={trendData} metric={selectedMetric} />

            <div className="flex justify-between mt-2 text-xs text-gray-500">
              {trendData.map((item, index) => (
                <span key={index}>
                  {item.date.toLocaleDateString("en", { weekday: "short" })}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Achievement Highlights */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Recent Achievements
            </h3>

            <div className="space-y-3">
              <motion.div
                className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg"
                whileHover={{ scale: 1.02 }}
              >
                <Trophy className="h-8 w-8 text-yellow-600" />
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">
                    Week Warrior
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    7 days streak achieved!
                  </p>
                </div>
              </motion.div>

              <motion.div
                className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg"
                whileHover={{ scale: 1.02 }}
              >
                <Star className="h-8 w-8 text-green-600" />
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">
                    Accuracy Master
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    90%+ accuracy this week
                  </p>
                </div>
              </motion.div>

              <motion.div
                className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
                whileHover={{ scale: 1.02 }}
              >
                <Brain className="h-8 w-8 text-blue-600" />
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">
                    Vocabulary Builder
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    156 new words learned
                  </p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Goals Section */}
      <AnimatePresence>
        {showGoals && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Learning Goals
              </h3>
              <button
                onClick={() => setShowGoals(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <Filter className="h-4 w-4" />
              </button>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {displayGoals.map((goal) => (
                <GoalProgress key={goal.id} goal={goal} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Actions */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Quick Actions
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <Activity className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium">Start Quiz</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <BookOpen className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium">Review Words</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <Target className="h-5 w-5 text-purple-600" />
            <span className="text-sm font-medium">Set Goal</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <BarChart3 className="h-5 w-5 text-orange-600" />
            <span className="text-sm font-medium">View Report</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default EnhancedProgressDashboard;
