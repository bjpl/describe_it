'use client';

import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { motion } from 'framer-motion';

interface ProgressStats {
  totalPoints: number;
  currentStreak: number;
  accuracy: number;
  totalWords: number;
  wordsToday: number;
  averageSessionTime: number;
}

interface ProgressOverTime {
  date: string;
  points: number;
  wordsLearned: number;
}

interface SkillBreakdown {
  category: string;
  count: number;
  percentage: number;
}

interface CompletionData {
  name: string;
  value: number;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function ProgressDashboard() {
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [progressData, setProgressData] = useState<ProgressOverTime[]>([]);
  const [skillData, setSkillData] = useState<SkillBreakdown[]>([]);
  const [completionData, setCompletionData] = useState<CompletionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [statsRes, analyticsRes] = await Promise.all([
        fetch('/api/progress/stats'),
        fetch('/api/progress/analytics'),
      ]);

      if (!statsRes.ok || !analyticsRes.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const statsData = await statsRes.json();
      const analyticsData = await analyticsRes.json();

      setStats(statsData.stats);
      setProgressData(analyticsData.progressOverTime || []);
      setSkillData(analyticsData.skillBreakdown || []);
      setCompletionData(analyticsData.completionData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-lg font-semibold text-red-800 mb-2">
          Error Loading Dashboard
        </h3>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Points"
          value={stats.totalPoints.toLocaleString()}
          icon="🏆"
          color="blue"
        />
        <StatCard
          title="Current Streak"
          value={`${stats.currentStreak} days`}
          icon="🔥"
          color="orange"
        />
        <StatCard
          title="Accuracy"
          value={`${stats.accuracy.toFixed(1)}%`}
          icon="🎯"
          color="green"
        />
        <StatCard
          title="Words Today"
          value={stats.wordsToday.toString()}
          icon="📚"
          color="purple"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Progress Over Time */}
        <ChartCard title="Progress Over Time">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={progressData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="points"
                stroke="#3B82F6"
                strokeWidth={2}
                name="Points"
              />
              <Line
                type="monotone"
                dataKey="wordsLearned"
                stroke="#10B981"
                strokeWidth={2}
                name="Words Learned"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Skill Breakdown */}
        <ChartCard title="Skill Breakdown">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={skillData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#3B82F6" name="Words" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Completion Rate */}
        <ChartCard title="Completion Rate">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={completionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {completionData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Additional Stats */}
        <ChartCard title="Learning Insights">
          <div className="space-y-4 p-4">
            <InsightRow
              label="Total Vocabulary"
              value={stats.totalWords.toString()}
              trend="+12%"
              trendUp={true}
            />
            <InsightRow
              label="Avg Session Time"
              value={`${stats.averageSessionTime} min`}
              trend="+5%"
              trendUp={true}
            />
            <InsightRow
              label="Review Accuracy"
              value={`${stats.accuracy.toFixed(1)}%`}
              trend="+3%"
              trendUp={true}
            />
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

// Helper Components

interface StatCardProps {
  title: string;
  value: string;
  icon: string;
  color: 'blue' | 'orange' | 'green' | 'purple';
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    orange: 'bg-orange-50 border-orange-200 text-orange-800',
    green: 'bg-green-50 border-green-200 text-green-800',
    purple: 'bg-purple-50 border-purple-200 text-purple-800',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-6 rounded-lg border-2 ${colorClasses[color]}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="text-sm opacity-75">{title}</div>
    </motion.div>
  );
}

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
}

function ChartCard({ title, children }: ChartCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-lg p-6"
    >
      <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
      {children}
    </motion.div>
  );
}

interface InsightRowProps {
  label: string;
  value: string;
  trend: string;
  trendUp: boolean;
}

function InsightRow({ label, value, trend, trendUp }: InsightRowProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-600">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-semibold text-gray-800">{value}</span>
        <span
          className={`text-sm ${trendUp ? 'text-green-600' : 'text-red-600'}`}
        >
          {trend}
        </span>
      </div>
    </div>
  );
}

function renderCustomLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: any) {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
  const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      className="font-semibold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-gray-200 rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-96 bg-gray-200 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
