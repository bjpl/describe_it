"use client";

import React, { useState } from 'react';
import { DashboardLayout, DashboardSection } from '@/components/Dashboard/DashboardLayout';
import { StatsWidget } from './widgets/StatsWidget';
import { ProgressChartWidget } from './widgets/ProgressChartWidget';
import { ActivityWidget } from './widgets/ActivityWidget';
import { PerformanceWidget } from './widgets/PerformanceWidget';
import { useDashboardData } from './hooks/useDashboardData';
import { RefreshCw, Download, Settings, WifiOff, Wifi } from 'lucide-react';
import type { TimeRange } from './types';

interface IntegratedDashboardProps {
  userId?: string;
  enableRealtime?: boolean;
}

export function IntegratedDashboard({
  userId,
  enableRealtime = true,
}: IntegratedDashboardProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const { data, isLoading, error, refresh, wsConnected } = useDashboardData({
    userId,
    timeRange,
    enableRealtime,
  });

  const handleExport = async () => {
    if (!data) return;

    const exportData = {
      ...data,
      exportedAt: new Date().toISOString(),
      timeRange,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout
      title="Learning Dashboard"
      description="Track your progress and performance"
    >
      {/* Header Actions */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {/* Time Range Selector */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>

          {/* Real-time Status */}
          {enableRealtime && (
            <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
              {wsConnected ? (
                <>
                  <Wifi className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-600 font-medium">Live</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Offline</span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh Button */}
          <button
            onClick={refresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={!data}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Export
          </button>

          {/* Settings Button */}
          <button
            className="p-2 border border-gray-300 rounded-lg hover:bg-muted transition-colors"
            title="Dashboard Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive rounded-lg">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-destructive/20 rounded-lg">
              <WifiOff className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h3 className="font-semibold text-destructive">Error Loading Dashboard</h3>
              <p className="text-sm text-destructive/80 mt-1">{error.message}</p>
              <button
                onClick={refresh}
                className="mt-2 text-sm text-destructive hover:underline"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Content */}
      <div className="space-y-8">
        {/* Stats Overview */}
        <DashboardSection
          title="Overview"
          description="Your learning statistics at a glance"
        >
          <StatsWidget
            stats={data?.stats || {
              totalPoints: 0,
              currentStreak: 0,
              accuracy: 0,
              totalWords: 0,
              wordsToday: 0,
              averageSessionTime: 0,
              completionRate: 0,
              vocabularyMastered: 0,
            }}
            loading={isLoading}
          />
        </DashboardSection>

        {/* Progress Charts */}
        <DashboardSection
          title="Progress Analytics"
          description="Visualize your learning journey"
        >
          <ProgressChartWidget
            analytics={data?.analytics || {
              progressOverTime: [],
              skillBreakdown: [],
              completionData: [],
              weeklyActivity: [],
            }}
            loading={isLoading}
          />
        </DashboardSection>

        {/* Activity Feed */}
        <DashboardSection
          title="Recent Activity"
          description="Your latest sessions and achievements"
        >
          <ActivityWidget
            activity={data?.activity || {
              recentSessions: [],
              topVocabulary: [],
            }}
            loading={isLoading}
          />
        </DashboardSection>

        {/* Performance Metrics */}
        <DashboardSection
          title="Performance"
          description="Application health and metrics"
        >
          <PerformanceWidget
            metrics={data?.performance || {
              webVitals: {
                LCP: 0,
                FID: 0,
                CLS: 0,
                FCP: 0,
                TTFB: 0,
                INP: 0,
              },
              cacheHitRate: 0,
              averageResponseTime: 0,
              errorRate: 0,
            }}
            loading={isLoading}
          />
        </DashboardSection>
      </div>

      {/* Last Updated */}
      {data && (
        <div className="mt-8 text-center text-sm text-muted-foreground">
          Last updated: {new Date(data.lastUpdated).toLocaleString()}
        </div>
      )}
    </DashboardLayout>
  );
}
