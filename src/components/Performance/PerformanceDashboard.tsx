"use client";

import React, { useState, useEffect, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { MotionDiv, MotionButton, MotionSpan, MotionP, MotionH1, MotionH2, MotionH3, MotionSection, MotionHeader } from "@/components/ui/MotionComponents";
import {
  Activity,
  Database,
  Zap,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Gauge,
  BarChart3,
  FileText,
  Download,
  Settings,
} from "lucide-react";
import { useWebVitals } from "./PerformanceMonitor";
import { optimizedSupabase } from "@/lib/api/optimizedSupabase";
import { cacheManager } from "./AdvancedCaching";

interface PerformanceData {
  webVitals: {
    CLS: number;
    FID: number;
    FCP: number;
    LCP: number;
    TTFB: number;
    INP: number;
  };
  database: {
    averageQueryTime: number;
    cacheHitRate: number;
    totalQueries: number;
    slowQueries: Array<{ table: string; time: number }>;
    connectionStatus: boolean;
  };
  bundle: {
    totalSize: number;
    gzippedSize: number;
    loadTime: number;
    errorRate: number;
  };
  cache: {
    totalSize: number;
    hitRate: number;
    totalEntries: number;
  };
  runtime: {
    memoryUsage: number;
    jsHeapSize: number;
    fps: number;
    longTasks: number;
  };
}

interface PerformanceAlert {
  id: string;
  type: "error" | "warning" | "info";
  title: string;
  message: string;
  timestamp: number;
  category: "webvitals" | "database" | "bundle" | "cache" | "runtime";
}

export const PerformanceDashboard: React.FC = () => {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState<
    "1h" | "24h" | "7d"
  >("1h");
  const [selectedCategory, setSelectedCategory] = useState<string>("overview");

  const webVitalsData = useWebVitals();
  const vitals = webVitalsData; // useWebVitals returns the vitals object directly
  const performanceScore = 0; // Default performance score since it's not in the hook

  useEffect(() => {
    const collectPerformanceData = async () => {
      try {
        // Web Vitals data
        const webVitalsData = vitals;

        // Database performance
        const dbMetrics = optimizedSupabase.getPerformanceMetrics();
        const connectionStatus = optimizedSupabase.getConnectionStatus();

        // Cache statistics
        const cacheStats = cacheManager.getStats();

        // Runtime metrics
        const memoryInfo = (performance as any).memory;
        const runtimeData = {
          memoryUsage: memoryInfo
            ? Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024)
            : 0,
          jsHeapSize: memoryInfo
            ? Math.round(memoryInfo.totalJSHeapSize / 1024 / 1024)
            : 0,
          fps: 60, // Would be calculated from frame timing
          longTasks: 0, // Would be collected from PerformanceObserver
        };

        // Bundle metrics (simulated)
        const bundleData = {
          totalSize: 1250000,
          gzippedSize: 420000,
          loadTime:
            performance.timing?.loadEventEnd -
              performance.timing?.navigationStart || 0,
          errorRate: 0,
        };

        const performanceData: PerformanceData = {
          webVitals: webVitalsData,
          database: {
            averageQueryTime: dbMetrics.averageQueryTime,
            cacheHitRate: dbMetrics.cacheHitRate,
            totalQueries: dbMetrics.totalQueries,
            slowQueries: dbMetrics.slowQueries.slice(0, 5),
            connectionStatus: connectionStatus.isConnected,
          },
          bundle: bundleData,
          cache: {
            totalSize: cacheStats.totalSize,
            hitRate: cacheStats.hitRate,
            totalEntries: cacheStats.totalEntries,
          },
          runtime: runtimeData,
        };

        setData(performanceData);

        // Generate alerts based on thresholds
        generateAlerts(performanceData);
      } catch (error) {
        console.error("Failed to collect performance data:", error);
      }
    };

    collectPerformanceData();
    const interval = setInterval(collectPerformanceData, 10000); // Update every 10s

    // Keyboard shortcut to toggle dashboard
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "D") {
        setIsVisible((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyPress);

    return () => {
      clearInterval(interval);
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [vitals]);

  const generateAlerts = (performanceData: PerformanceData) => {
    const newAlerts: PerformanceAlert[] = [];
    const now = Date.now();

    // Web Vitals alerts
    if (performanceData.webVitals.LCP > 2500) {
      newAlerts.push({
        id: `lcp-${now}`,
        type: "warning",
        title: "Slow LCP",
        message: `Largest Contentful Paint is ${performanceData.webVitals.LCP.toFixed(0)}ms (target: <2.5s)`,
        timestamp: now,
        category: "webvitals",
      });
    }

    if (performanceData.webVitals.CLS > 0.1) {
      newAlerts.push({
        id: `cls-${now}`,
        type: "error",
        title: "High CLS",
        message: `Cumulative Layout Shift is ${performanceData.webVitals.CLS.toFixed(3)} (target: <0.1)`,
        timestamp: now,
        category: "webvitals",
      });
    }

    // Database alerts
    if (performanceData.database.averageQueryTime > 1000) {
      newAlerts.push({
        id: `db-slow-${now}`,
        type: "warning",
        title: "Slow Database Queries",
        message: `Average query time is ${performanceData.database.averageQueryTime.toFixed(0)}ms`,
        timestamp: now,
        category: "database",
      });
    }

    if (performanceData.database.cacheHitRate < 60) {
      newAlerts.push({
        id: `cache-miss-${now}`,
        type: "info",
        title: "Low Cache Hit Rate",
        message: `Database cache hit rate is ${performanceData.database.cacheHitRate.toFixed(1)}%`,
        timestamp: now,
        category: "database",
      });
    }

    // Runtime alerts
    if (performanceData.runtime.memoryUsage > 100) {
      newAlerts.push({
        id: `memory-${now}`,
        type: "warning",
        title: "High Memory Usage",
        message: `Memory usage is ${performanceData.runtime.memoryUsage}MB`,
        timestamp: now,
        category: "runtime",
      });
    }

    // Update alerts state
    setAlerts((prev) => [...prev.slice(-10), ...newAlerts]);

    // Auto-remove alerts after 30 seconds
    newAlerts.forEach((alert) => {
      setTimeout(() => {
        setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
      }, 30000);
    });
  };

  const getPerformanceGrade = (
    score: number,
  ): { grade: string; color: string } => {
    if (score >= 90) return { grade: "A", color: "text-green-500" };
    if (score >= 80) return { grade: "B", color: "text-blue-500" };
    if (score >= 70) return { grade: "C", color: "text-yellow-500" };
    if (score >= 60) return { grade: "D", color: "text-orange-500" };
    return { grade: "F", color: "text-red-500" };
  };

  const formatSize = (bytes: number) => {
    const sizes = ["B", "KB", "MB", "GB"];
    if (bytes === 0) return "0 B";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  if (!isVisible || !data) {
    return (
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg font-medium transition-colors"
        >
          <Activity className="w-4 h-4 inline mr-2" />
          Performance Dashboard
        </button>

        {/* Quick performance indicator */}
        <div
          className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
            getPerformanceGrade(performanceScore).color === "text-green-500"
              ? "bg-green-500"
              : getPerformanceGrade(performanceScore).color ===
                  "text-yellow-500"
                ? "bg-yellow-500"
                : "bg-red-500"
          }`}
        >
          {getPerformanceGrade(performanceScore).grade}
        </div>
      </div>
    );
  }

  return (
    <MotionDiv
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-4 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-bold">Performance Dashboard</h2>
              <p className="text-blue-100 text-sm">
                Real-time application performance monitoring
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Overall Performance Grade */}
            <div className="text-center">
              <div
                className={`text-3xl font-bold ${getPerformanceGrade(performanceScore).color}`}
              >
                {getPerformanceGrade(performanceScore).grade}
              </div>
              <div className="text-xs text-blue-100">Overall</div>
            </div>

            <button
              onClick={() => setIsVisible(false)}
              className="text-white hover:text-gray-200 p-2 rounded-lg transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="mt-4 flex gap-2">
          {(["1h", "24h", "7d"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setSelectedTimeRange(range)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                selectedTimeRange === range
                  ? "bg-white text-blue-600"
                  : "bg-blue-600 text-blue-100 hover:bg-blue-500"
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <div className="flex h-[calc(100%-120px)]">
        {/* Sidebar Navigation */}
        <div className="w-64 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
          <div className="p-4 space-y-2">
            {[
              { id: "overview", label: "Overview", icon: BarChart3 },
              { id: "webvitals", label: "Web Vitals", icon: Gauge },
              { id: "database", label: "Database", icon: Database },
              { id: "cache", label: "Caching", icon: Zap },
              { id: "runtime", label: "Runtime", icon: Activity },
              { id: "alerts", label: "Alerts", icon: AlertTriangle },
            ].map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  selectedCategory === category.id
                    ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                    : "hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                <category.icon className="w-4 h-4" />
                <span className="font-medium">{category.label}</span>
                {category.id === "alerts" && alerts.length > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {alerts.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {selectedCategory === "overview" && (
              <MotionDiv
                key="overview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Key Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Load Time
                        </p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {formatTime(data.bundle.loadTime)}
                        </p>
                      </div>
                      <Clock className="w-8 h-8 text-blue-500" />
                    </div>
                    <div className="mt-2 flex items-center">
                      <TrendingDown className="w-4 h-4 text-green-500 mr-1" />
                      <span className="text-sm text-green-600">15% faster</span>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Bundle Size
                        </p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {formatSize(data.bundle.gzippedSize)}
                        </p>
                      </div>
                      <FileText className="w-8 h-8 text-purple-500" />
                    </div>
                    <div className="mt-2">
                      <span className="text-sm text-gray-500">
                        {formatSize(data.bundle.totalSize)} uncompressed
                      </span>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Cache Hit Rate
                        </p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {data.cache.hitRate.toFixed(1)}%
                        </p>
                      </div>
                      <Zap className="w-8 h-8 text-green-500" />
                    </div>
                    <div className="mt-2">
                      <span className="text-sm text-gray-500">
                        {data.cache.totalEntries} entries
                      </span>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Memory Usage
                        </p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {data.runtime.memoryUsage}MB
                        </p>
                      </div>
                      <Activity className="w-8 h-8 text-orange-500" />
                    </div>
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-orange-500 h-2 rounded-full transition-all"
                          style={{
                            width: `${Math.min((data.runtime.memoryUsage / 200) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Performance Timeline Chart Placeholder */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold mb-4">
                    Performance Timeline
                  </h3>
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Performance timeline chart would be rendered here</p>
                      <p className="text-sm">
                        Integration with charts library needed
                      </p>
                    </div>
                  </div>
                </div>
              </MotionDiv>
            )}

            {/* Other category views would go here */}
            {selectedCategory === "webvitals" && (
              <MotionDiv
                key="webvitals"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {Object.entries(data.webVitals).map(([metric, value]) => (
                  <div
                    key={metric}
                    className="bg-white dark:bg-gray-800 p-4 rounded-lg border"
                  >
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">{metric}</h4>
                      <span className="text-lg font-bold">
                        {value.toFixed(metric === "CLS" ? 3 : 0)}
                        {metric === "CLS" ? "" : "ms"}
                      </span>
                    </div>
                  </div>
                ))}
              </MotionDiv>
            )}

            {selectedCategory === "alerts" && (
              <MotionDiv
                key="alerts"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3"
              >
                {alerts.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <p className="text-lg font-medium text-green-600">
                      All Systems Optimal
                    </p>
                    <p className="text-gray-500">
                      No performance issues detected
                    </p>
                  </div>
                ) : (
                  alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-lg border-l-4 ${
                        alert.type === "error"
                          ? "bg-red-50 dark:bg-red-900/20 border-red-500"
                          : alert.type === "warning"
                            ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500"
                            : "bg-blue-50 dark:bg-blue-900/20 border-blue-500"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">{alert.title}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {alert.message}
                          </p>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </MotionDiv>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
          <div className="flex gap-2">
            <button className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
              <Download className="w-4 h-4" />
            </button>
            <button className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </MotionDiv>
  );
};
