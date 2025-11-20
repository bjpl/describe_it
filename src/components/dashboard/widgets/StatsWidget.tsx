"use client";

import React from 'react';
import { DashboardStatsCard } from '@/components/Dashboard/DashboardLayout';
import {
  Trophy,
  Flame,
  Target,
  BookOpen,
  TrendingUp,
  Clock
} from 'lucide-react';
import type { DashboardStats } from '../types';

interface StatsWidgetProps {
  stats: DashboardStats;
  loading?: boolean;
}

export function StatsWidget({ stats, loading = false }: StatsWidgetProps) {
  const widgets = [
    {
      title: 'Total Points',
      value: stats.totalPoints.toLocaleString(),
      description: 'All-time points earned',
      trend: {
        value: 12,
        label: 'vs last week',
        positive: true,
      },
      icon: <Trophy className="w-6 h-6" />,
    },
    {
      title: 'Current Streak',
      value: `${stats.currentStreak} days`,
      description: 'Keep it up!',
      trend: {
        value: stats.currentStreak > 0 ? 100 : 0,
        label: 'active',
        positive: stats.currentStreak > 0,
      },
      icon: <Flame className="w-6 h-6" />,
    },
    {
      title: 'Accuracy',
      value: `${stats.accuracy.toFixed(1)}%`,
      description: 'Overall performance',
      trend: {
        value: 3,
        label: 'improvement',
        positive: true,
      },
      icon: <Target className="w-6 h-6" />,
    },
    {
      title: 'Words Today',
      value: stats.wordsToday.toString(),
      description: `${stats.totalWords} total`,
      icon: <BookOpen className="w-6 h-6" />,
    },
    {
      title: 'Completion Rate',
      value: `${stats.completionRate.toFixed(0)}%`,
      description: 'Tasks completed',
      trend: {
        value: 5,
        label: 'increase',
        positive: true,
      },
      icon: <TrendingUp className="w-6 h-6" />,
    },
    {
      title: 'Avg Session',
      value: `${stats.averageSessionTime} min`,
      description: 'Focus time',
      icon: <Clock className="w-6 h-6" />,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {widgets.map((widget, index) => (
        <DashboardStatsCard
          key={index}
          title={widget.title}
          value={widget.value}
          description={widget.description}
          trend={widget.trend}
          icon={widget.icon}
          loading={loading}
        />
      ))}
    </div>
  );
}
