"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useErrorReporting } from '@/hooks/useErrorReporting';
import { performanceMonitor, getPerformanceSummary } from '@/lib/monitoring/performanceMonitor';
import { logger } from '@/lib/logger';
import { ErrorCategory, ErrorSeverity } from '@/lib/errorHandler';
import { safeParse, safeStringify, safeParseLocalStorage, safeSetLocalStorage } from "@/lib/utils/json-safe";
import {
  AlertTriangle,
  TrendingUp,
  Clock,
  Activity,
  BarChart3,
  RefreshCw,
  Download,
  Settings,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// Dashboard configuration
interface DashboardConfig {
  refreshInterval: number;
  showPerformanceMetrics: boolean;
  showErrorDetails: boolean;
  maxErrorsToShow: number;
  timeRange: 'hour' | 'day' | 'week';
}

// Error statistics interface
interface ErrorStats {
  totalErrors: number;
  errorsByCategory: Record<ErrorCategory, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  errorRate: number;
  topErrors: Array<{ message: string; count: number; severity: ErrorSeverity }>;
}

// Performance stats interface
interface PerformanceStats {
  averageLoadTime: number;
  slowestOperations: Array<{ name: string; duration: number }>;
  memoryUsage?: { used: number; total: number; percentage: number };
  recommendations: string[];
}

const ErrorDashboard: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const [config, setConfig] = useState<DashboardConfig>({
    refreshInterval: 30000, // 30 seconds
    showPerformanceMetrics: true,
    showErrorDetails: true,
    maxErrorsToShow: 10,
    timeRange: 'hour',
  });

  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'errors' | 'performance' | 'config'>('errors');
  const [performanceStats, setPerformanceStats] = useState<PerformanceStats | null>(null);
  
  const {
    errors,
    notifications,
    errorStats,
    clearErrors,
    clearNotifications,
    dismissNotification,
    isEnabled,
    setEnabled,
  } = useErrorReporting();

  // Auto-refresh data
  useEffect(() => {
    if (!isOpen || !isEnabled) return;

    const refreshData = () => {
      try {
        // Get performance summary
        const timeRangeMs = {
          hour: 60 * 60 * 1000,
          day: 24 * 60 * 60 * 1000,
          week: 7 * 24 * 60 * 60 * 1000,
        };

        const endTime = Date.now();
        const startTime = endTime - timeRangeMs[config.timeRange];
        const perfSummary = getPerformanceSummary({ start: startTime, end: endTime });

        // Calculate performance stats
        const avgDurations = Object.values(perfSummary.aggregations.averages);
        const averageLoadTime = avgDurations.length > 0 
          ? avgDurations.reduce((a, b) => a + b, 0) / avgDurations.length 
          : 0;

        const slowestOperations = Object.entries(perfSummary.aggregations.p95)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([name, duration]) => ({ name, duration }));

        setPerformanceStats({
          averageLoadTime,
          slowestOperations,
          memoryUsage: perfSummary.memoryStats,
          recommendations: perfSummary.recommendations,
        });

      } catch (error) {
        logger.error('Failed to refresh dashboard data', error as Error);
      }
    };

    refreshData();
    const interval = setInterval(refreshData, config.refreshInterval);

    return () => clearInterval(interval);
  }, [isOpen, isEnabled, config.refreshInterval, config.timeRange]);

  // Calculate additional error statistics
  const enhancedErrorStats = useMemo(() => {
    const now = Date.now();
    const timeRangeMs = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
    };

    const recentErrors = errors.filter(
      error => now - error.timestamp.getTime() <= timeRangeMs[config.timeRange]
    );

    // Calculate error rate (errors per minute)
    const errorRate = recentErrors.length / (timeRangeMs[config.timeRange] / (60 * 1000));

    // Group errors by message to find most common
    const errorGroups = recentErrors.reduce((acc, error) => {
      const key = error.message;
      if (!acc[key]) {
        acc[key] = { message: error.message, count: 0, severity: error.severity };
      }
      acc[key].count++;
      return acc;
    }, {} as Record<string, { message: string; count: number; severity: ErrorSeverity }>);

    const topErrors = Object.values(errorGroups)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalErrors: recentErrors.length,
      errorsByCategory: recentErrors.reduce((acc, error) => {
        acc[error.category] = (acc[error.category] || 0) + 1;
        return acc;
      }, {} as Record<ErrorCategory, number>),
      errorsBySeverity: recentErrors.reduce((acc, error) => {
        acc[error.severity] = (acc[error.severity] || 0) + 1;
        return acc;
      }, {} as Record<ErrorSeverity, number>),
      errorRate,
      topErrors,
    };
  }, [errors, config.timeRange]);

  // Export dashboard data
  const exportData = () => {
    const data = {
      timestamp: new Date().toISOString(),
      errorStats: enhancedErrorStats,
      performanceStats,
      errors: errors.slice(0, config.maxErrorsToShow),
      notifications,
      config,
    };

    const blob = new Blob([safeStringify(data, '{}')], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-dashboard-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Severity color mapping
  const getSeverityColor = (severity: ErrorSeverity) => {
    const colors = {
      [ErrorSeverity.LOW]: 'text-blue-600 bg-blue-100',
      [ErrorSeverity.MEDIUM]: 'text-yellow-600 bg-yellow-100',
      [ErrorSeverity.HIGH]: 'text-orange-600 bg-orange-100',
      [ErrorSeverity.CRITICAL]: 'text-red-600 bg-red-100',
    };
    return colors[severity] || 'text-gray-600 bg-gray-100';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-start justify-center pt-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold">Error & Performance Dashboard</h2>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEnabled(!isEnabled)}
              className={`px-3 py-1 rounded text-sm font-medium ${
                isEnabled 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {isEnabled ? 'Enabled' : 'Disabled'}
            </button>
            
            <button
              onClick={exportData}
              className="p-2 hover:bg-gray-100 rounded"
              title="Export data"
            >
              <Download className="w-4 h-4" />
            </button>
            
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isExpanded && (
          <>
            {/* Tabs */}
            <div className="flex border-b">
              {[
                { key: 'errors', label: 'Errors', icon: AlertTriangle },
                { key: 'performance', label: 'Performance', icon: TrendingUp },
                { key: 'config', label: 'Settings', icon: Settings },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as any)}
                  className={`flex items-center gap-2 px-4 py-2 font-medium ${
                    activeTab === key
                      ? 'border-b-2 border-blue-500 text-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4">
              {activeTab === 'errors' && (
                <ErrorsTab
                  errorStats={enhancedErrorStats}
                  errors={errors.slice(0, config.maxErrorsToShow)}
                  notifications={notifications}
                  onClearErrors={clearErrors}
                  onClearNotifications={clearNotifications}
                  onDismissNotification={dismissNotification}
                  getSeverityColor={getSeverityColor}
                  timeRange={config.timeRange}
                />
              )}

              {activeTab === 'performance' && performanceStats && (
                <PerformanceTab
                  performanceStats={performanceStats}
                  timeRange={config.timeRange}
                />
              )}

              {activeTab === 'config' && (
                <ConfigTab
                  config={config}
                  onConfigChange={setConfig}
                  isEnabled={isEnabled}
                  onEnabledChange={setEnabled}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Errors Tab Component
const ErrorsTab: React.FC<{
  errorStats: ErrorStats;
  errors: any[];
  notifications: any[];
  onClearErrors: () => void;
  onClearNotifications: () => void;
  onDismissNotification: (id: string) => void;
  getSeverityColor: (severity: ErrorSeverity) => string;
  timeRange: string;
}> = ({
  errorStats,
  errors,
  notifications,
  onClearErrors,
  onClearNotifications,
  onDismissNotification,
  getSeverityColor,
  timeRange,
}) => (
  <div className="space-y-6">
    {/* Error Summary Cards */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="bg-gradient-to-r from-red-50 to-red-100 p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-red-600">Total Errors</p>
            <p className="text-2xl font-bold text-red-900">{errorStats.totalErrors}</p>
          </div>
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
      </div>

      <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-yellow-600">Error Rate</p>
            <p className="text-2xl font-bold text-yellow-900">
              {errorStats.errorRate.toFixed(2)}/min
            </p>
          </div>
          <Clock className="w-8 h-8 text-yellow-500" />
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">Active Notifications</p>
            <p className="text-2xl font-bold text-blue-900">
              {notifications.filter(n => !n.dismissed).length}
            </p>
          </div>
          <Activity className="w-8 h-8 text-blue-500" />
        </div>
      </div>

      <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-purple-600">Time Range</p>
            <p className="text-lg font-bold text-purple-900 capitalize">{timeRange}</p>
          </div>
          <BarChart3 className="w-8 h-8 text-purple-500" />
        </div>
      </div>
    </div>

    {/* Error Breakdown */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* By Severity */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">Errors by Severity</h3>
        <div className="space-y-2">
          {Object.entries(errorStats.errorsBySeverity).map(([severity, count]) => (
            <div key={severity} className="flex items-center justify-between">
              <span className={`px-2 py-1 rounded text-sm font-medium ${getSeverityColor(severity as ErrorSeverity)}`}>
                {severity}
              </span>
              <span className="font-semibold">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* By Category */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">Errors by Category</h3>
        <div className="space-y-2">
          {Object.entries(errorStats.errorsByCategory).map(([category, count]) => (
            <div key={category} className="flex items-center justify-between">
              <span className="text-sm font-medium capitalize">{category.replace('_', ' ')}</span>
              <span className="font-semibold">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Top Errors */}
    {errorStats.topErrors.length > 0 && (
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Most Common Errors</h3>
          <button
            onClick={onClearErrors}
            className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
          >
            Clear All
          </button>
        </div>
        <div className="space-y-2">
          {errorStats.topErrors.map((error, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex-1 truncate">
                <span className="text-sm font-medium">{error.message}</span>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(error.severity)}`}>
                  {error.severity}
                </span>
                <span className="text-sm font-semibold text-gray-600">{error.count}x</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Recent Errors */}
    {errors.length > 0 && (
      <div className="bg-white border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">Recent Errors</h3>
        <div className="space-y-2 max-h-64 overflow-auto">
          {errors.map((error) => (
            <div key={error.id} className="p-3 bg-gray-50 rounded border-l-4 border-red-400">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(error.severity)}`}>
                      {error.severity}
                    </span>
                    <span className="text-xs text-gray-500">{error.category}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{error.message}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {error.timestamp.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);

// Performance Tab Component
const PerformanceTab: React.FC<{
  performanceStats: PerformanceStats;
  timeRange: string;
}> = ({ performanceStats, timeRange }) => (
  <div className="space-y-6">
    {/* Performance Overview */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-green-600">Avg Load Time</p>
            <p className="text-2xl font-bold text-green-900">
              {performanceStats.averageLoadTime.toFixed(2)}ms
            </p>
          </div>
          <TrendingUp className="w-8 h-8 text-green-500" />
        </div>
      </div>

      {performanceStats.memoryUsage && (
        <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Memory Usage</p>
              <p className="text-2xl font-bold text-purple-900">
                {performanceStats.memoryUsage.percentage.toFixed(1)}%
              </p>
            </div>
            <Activity className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">Time Range</p>
            <p className="text-lg font-bold text-blue-900 capitalize">{timeRange}</p>
          </div>
          <Clock className="w-8 h-8 text-blue-500" />
        </div>
      </div>
    </div>

    {/* Slowest Operations */}
    {performanceStats.slowestOperations.length > 0 && (
      <div className="bg-white border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">Slowest Operations (95th percentile)</h3>
        <div className="space-y-2">
          {performanceStats.slowestOperations.map((operation, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span className="text-sm font-medium truncate">{operation.name}</span>
              <span className="text-sm font-semibold text-orange-600 ml-4">
                {operation.duration.toFixed(2)}ms
              </span>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Recommendations */}
    {performanceStats.recommendations.length > 0 && (
      <div className="bg-white border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">Performance Recommendations</h3>
        <div className="space-y-2">
          {performanceStats.recommendations.map((recommendation, index) => (
            <div key={index} className="p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
              <p className="text-sm text-blue-800">{recommendation}</p>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);

// Config Tab Component
const ConfigTab: React.FC<{
  config: DashboardConfig;
  onConfigChange: (config: DashboardConfig) => void;
  isEnabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
}> = ({ config, onConfigChange, isEnabled, onEnabledChange }) => (
  <div className="space-y-6">
    <div className="bg-white border rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4">Dashboard Settings</h3>
      <div className="space-y-4">
        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => onEnabledChange(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm font-medium">Enable Error Reporting</span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Refresh Interval (seconds)</label>
          <select
            value={config.refreshInterval / 1000}
            onChange={(e) => onConfigChange({
              ...config,
              refreshInterval: parseInt(e.target.value) * 1000
            })}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="10">10 seconds</option>
            <option value="30">30 seconds</option>
            <option value="60">1 minute</option>
            <option value="300">5 minutes</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Time Range</label>
          <select
            value={config.timeRange}
            onChange={(e) => onConfigChange({
              ...config,
              timeRange: e.target.value as any
            })}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="hour">Last Hour</option>
            <option value="day">Last 24 Hours</option>
            <option value="week">Last Week</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Max Errors to Show</label>
          <input
            type="number"
            value={config.maxErrorsToShow}
            onChange={(e) => onConfigChange({
              ...config,
              maxErrorsToShow: parseInt(e.target.value)
            })}
            className="w-full px-3 py-2 border rounded-lg"
            min="5"
            max="100"
          />
        </div>

        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={config.showPerformanceMetrics}
              onChange={(e) => onConfigChange({
                ...config,
                showPerformanceMetrics: e.target.checked
              })}
              className="rounded"
            />
            <span className="text-sm font-medium">Show Performance Metrics</span>
          </label>
        </div>

        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={config.showErrorDetails}
              onChange={(e) => onConfigChange({
                ...config,
                showErrorDetails: e.target.checked
              })}
              className="rounded"
            />
            <span className="text-sm font-medium">Show Error Details</span>
          </label>
        </div>
      </div>
    </div>
  </div>
);

export default ErrorDashboard;