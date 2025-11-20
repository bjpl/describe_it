"use client";

import React from 'react';
import { DashboardCard } from '@/components/Dashboard/DashboardLayout';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { ProgressAnalytics } from '../types';

interface ProgressChartWidgetProps {
  analytics: ProgressAnalytics;
  loading?: boolean;
}

export function ProgressChartWidget({ analytics, loading = false }: ProgressChartWidgetProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Progress Over Time */}
      <DashboardCard
        title="Progress Over Time"
        description="Your learning journey"
        loading={loading}
        colSpan={2}
      >
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={analytics.progressOverTime}>
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
      </DashboardCard>

      {/* Skill Breakdown */}
      <DashboardCard
        title="Skill Breakdown"
        description="Category distribution"
        loading={loading}
      >
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={analytics.skillBreakdown}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="category" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#3B82F6" name="Words" />
            <Bar dataKey="percentage" fill="#10B981" name="Mastery %" />
          </BarChart>
        </ResponsiveContainer>
      </DashboardCard>

      {/* Weekly Activity */}
      <DashboardCard
        title="Weekly Activity"
        description="Last 7 days"
        loading={loading}
      >
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={analytics.weeklyActivity}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="sessions" fill="#8B5CF6" name="Sessions" />
            <Bar dataKey="accuracy" fill="#F59E0B" name="Accuracy %" />
          </BarChart>
        </ResponsiveContainer>
      </DashboardCard>
    </div>
  );
}
