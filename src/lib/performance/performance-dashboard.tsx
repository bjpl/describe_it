/**
 * Performance Monitoring Dashboard
 *
 * Visual dashboard for monitoring app performance in development
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { queryOptimizer } from './query-optimizer';
import { reactProfiler } from './react-profiler';
import { bundleAnalyzer } from './bundle-analyzer';

interface PerformanceData {
  queries: ReturnType<typeof queryOptimizer.getPerformanceStats>;
  react: ReturnType<typeof reactProfiler.generateReport>;
  bundle: ReturnType<typeof bundleAnalyzer.analyzeBundle>;
  timestamp: number;
}

export function PerformanceDashboard() {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<PerformanceData | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Refresh data
  const refreshData = () => {
    setData({
      queries: queryOptimizer.getPerformanceStats(),
      react: reactProfiler.generateReport(),
      bundle: bundleAnalyzer.analyzeBundle(),
      timestamp: Date.now(),
    });
  };

  // Auto-refresh every 5 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    refreshData();
    const interval = setInterval(refreshData, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Calculate overall performance score
  const performanceScore = useMemo(() => {
    if (!data) return 100;

    let score = 100;

    // Penalize for slow queries
    const slowQueryRatio = data.queries.queries.slowQueries / (data.queries.queries.total || 1);
    score -= slowQueryRatio * 20;

    // Penalize for poor cache hit rate
    const cacheHitRate = data.queries.queries.cacheHitRate || 0;
    if (cacheHitRate < 50) score -= 15;
    else if (cacheHitRate < 70) score -= 10;

    // Penalize for slow React components
    const slowComponentRatio =
      data.react.summary.slowComponents / (data.react.summary.totalComponents || 1);
    score -= slowComponentRatio * 25;

    // Penalize for bundle size issues
    const criticalBundleIssues = data.bundle.suggestions.filter(s => s.severity === 'high').length;
    score -= criticalBundleIssues * 10;

    return Math.max(0, Math.round(score));
  }, [data]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-blue-700 transition-colors z-50"
        type="button"
      >
        📊 Performance ({performanceScore}/100)
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-[600px] max-h-[80vh] overflow-auto z-50 border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-lg">Performance Monitor</h3>
          <div
            className={`px-2 py-1 rounded text-sm font-medium ${
              performanceScore >= 90
                ? 'bg-green-100 text-green-800'
                : performanceScore >= 70
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
            }`}
          >
            Score: {performanceScore}/100
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            Auto-refresh
          </label>
          <button
            onClick={refreshData}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            type="button"
          >
            Refresh
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            type="button"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content */}
      {data && (
        <div className="p-4 space-y-6">
          {/* Database Queries */}
          <Section title="Database Queries">
            <MetricRow
              label="Total Queries"
              value={data.queries.queries.total.toString()}
            />
            <MetricRow
              label="Avg Response Time"
              value={`${data.queries.queries.averageTime.toFixed(2)}ms`}
              status={data.queries.queries.averageTime < 100 ? 'good' : 'warning'}
            />
            <MetricRow
              label="P95 Response Time"
              value={`${data.queries.queries.p95Time?.toFixed(2) || 0}ms`}
              status={(data.queries.queries.p95Time || 0) < 200 ? 'good' : 'warning'}
            />
            <MetricRow
              label="Cache Hit Rate"
              value={`${data.queries.queries.cacheHitRate.toFixed(1)}%`}
              status={data.queries.queries.cacheHitRate > 70 ? 'good' : 'warning'}
            />
            <MetricRow
              label="Slow Queries"
              value={data.queries.queries.slowQueries.toString()}
              status={data.queries.queries.slowQueries === 0 ? 'good' : 'error'}
            />
          </Section>

          {/* React Performance */}
          <Section title="React Components">
            <MetricRow
              label="Total Components"
              value={data.react.summary.totalComponents.toString()}
            />
            <MetricRow
              label="Total Renders"
              value={data.react.summary.totalRenders.toString()}
            />
            <MetricRow
              label="Avg Render Time"
              value={`${data.react.summary.averageRenderTime.toFixed(2)}ms`}
              status={data.react.summary.averageRenderTime < 16 ? 'good' : 'warning'}
            />
            <MetricRow
              label="Slow Components"
              value={data.react.summary.slowComponents.toString()}
              status={data.react.summary.slowComponents === 0 ? 'good' : 'warning'}
            />

            {data.react.components.slice(0, 5).length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  Top Components by Re-renders:
                </div>
                {data.react.components.slice(0, 5).map(comp => (
                  <div
                    key={comp.name}
                    className="flex items-center justify-between text-xs bg-gray-50 dark:bg-gray-900 p-2 rounded"
                  >
                    <span className="font-mono truncate flex-1">{comp.name}</span>
                    <span
                      className={`px-2 py-0.5 rounded ${
                        comp.budgetStatus === 'good'
                          ? 'bg-green-100 text-green-800'
                          : comp.budgetStatus === 'warning'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {comp.metrics.renderCount} renders
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Bundle Size */}
          <Section title="Bundle Size">
            <MetricRow
              label="Total Size"
              value={formatBytes(data.bundle.totalSize)}
            />
            <MetricRow
              label="Chunks"
              value={data.bundle.chunks.length.toString()}
            />
            <MetricRow
              label="High Priority Issues"
              value={data.bundle.suggestions.filter(s => s.severity === 'high').length.toString()}
              status={
                data.bundle.suggestions.filter(s => s.severity === 'high').length === 0
                  ? 'good'
                  : 'error'
              }
            />

            {data.bundle.suggestions.slice(0, 3).length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  Top Suggestions:
                </div>
                {data.bundle.suggestions.slice(0, 3).map((suggestion, index) => (
                  <div
                    key={index}
                    className="text-xs bg-gray-50 dark:bg-gray-900 p-2 rounded space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{suggestion.type}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          suggestion.severity === 'high'
                            ? 'bg-red-100 text-red-800'
                            : suggestion.severity === 'medium'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {suggestion.severity}
                      </span>
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                      {suggestion.recommendation}
                    </div>
                    <div className="text-green-600 dark:text-green-400">
                      Savings: {formatBytes(suggestion.estimatedSavings)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => {
                const report = reactProfiler.generateReport();
                console.log('Performance Report:', report);
                alert('Report logged to console');
              }}
              className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-sm flex-1"
              type="button"
            >
              Log Report
            </button>
            <button
              onClick={() => {
                reactProfiler.reset();
                queryOptimizer.resetMetrics();
                refreshData();
              }}
              className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-sm flex-1"
              type="button"
            >
              Reset Metrics
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper Components

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">{title}</h4>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function MetricRow({
  label,
  value,
  status = 'neutral',
}: {
  label: string;
  value: string;
  status?: 'good' | 'warning' | 'error' | 'neutral';
}) {
  const statusColors = {
    good: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    error: 'text-red-600 dark:text-red-400',
    neutral: 'text-gray-900 dark:text-gray-100',
  };

  return (
    <div className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-900 p-2 rounded">
      <span className="text-gray-600 dark:text-gray-400">{label}</span>
      <span className={`font-mono font-medium ${statusColors[status]}`}>{value}</span>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
