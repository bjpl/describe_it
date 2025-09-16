"use client";

import React, { useState, useEffect, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { MotionDiv, MotionButton, MotionSpan, MotionP, MotionH1, MotionH2, MotionH3, MotionSection, MotionHeader } from "@/components/ui/MotionComponents";
import {
  Package,
  Zap,
  AlertTriangle,
  TrendingUp,
  FileText,
  Layers,
} from "lucide-react";

interface BundleStats {
  totalSize: number;
  gzippedSize: number;
  chunks: Array<{
    name: string;
    size: number;
    modules: number;
    type: "main" | "vendor" | "async";
  }>;
  modules: Array<{
    name: string;
    size: number;
    optimizable: boolean;
  }>;
  duplicates: Array<{
    module: string;
    count: number;
    totalSize: number;
  }>;
  suggestions: Array<{
    type: "warning" | "info" | "error";
    message: string;
    impact: "high" | "medium" | "low";
  }>;
}

interface BundleAnalyzerProps {
  enabled?: boolean;
  onOptimizationSuggestion?: (suggestion: string) => void;
}

export const BundleAnalyzer: React.FC<BundleAnalyzerProps> = ({
  enabled = process.env.NODE_ENV === "development",
  onOptimizationSuggestion,
}) => {
  const [stats, setStats] = useState<BundleStats | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedChunk, setSelectedChunk] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    analyzeBundleSize();
  }, [enabled]);

  const analyzeBundleSize = async () => {
    setIsAnalyzing(true);

    try {
      // Simulate bundle analysis (in real implementation, this would call webpack-bundle-analyzer API)
      const mockStats: BundleStats = await simulateBundleAnalysis();
      setStats(mockStats);

      // Generate optimization suggestions
      generateOptimizationSuggestions(mockStats);
    } catch (error) {
      console.error("Bundle analysis failed:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const simulateBundleAnalysis = (): Promise<BundleStats> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          totalSize: 1250000, // 1.25MB
          gzippedSize: 420000, // 420KB
          chunks: [
            { name: "main", size: 450000, modules: 125, type: "main" },
            { name: "vendors", size: 650000, modules: 280, type: "vendor" },
            { name: "ui-libs", size: 100000, modules: 35, type: "async" },
            { name: "animations", size: 50000, modules: 12, type: "async" },
          ],
          modules: [
            { name: "framer-motion", size: 180000, optimizable: true },
            { name: "react-query", size: 125000, optimizable: false },
            { name: "lucide-react", size: 95000, optimizable: true },
            { name: "lodash-es", size: 85000, optimizable: true },
            { name: "@radix-ui/react-*", size: 150000, optimizable: false },
          ],
          duplicates: [
            { module: "react", count: 2, totalSize: 85000 },
            { module: "tslib", count: 3, totalSize: 45000 },
          ],
          suggestions: [
            {
              type: "warning",
              message: "Consider code splitting for framer-motion (180KB)",
              impact: "high",
            },
            {
              type: "info",
              message: "Tree-shake lucide-react icons (potential 40KB savings)",
              impact: "medium",
            },
            {
              type: "error",
              message: "Duplicate React instances found - check dependencies",
              impact: "high",
            },
          ],
        });
      }, 1500);
    });
  };

  const generateOptimizationSuggestions = (bundleStats: BundleStats) => {
    const suggestions = bundleStats.suggestions;

    suggestions.forEach((suggestion) => {
      if (suggestion.impact === "high") {
        onOptimizationSuggestion?.(suggestion.message);
      }
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getBundleScore = useMemo(() => {
    if (!stats) return 0;

    const sizeScore = Math.max(0, 100 - stats.gzippedSize / 10000); // Penalty for size > 1MB
    const duplicateScore = Math.max(0, 100 - stats.duplicates.length * 20);
    const optimizationScore =
      (stats.modules.filter((m) => !m.optimizable).length /
        stats.modules.length) *
      100;

    return Math.round((sizeScore + duplicateScore + optimizationScore) / 3);
  }, [stats]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  if (!enabled) return null;

  return (
    <div className="fixed bottom-20 right-4 z-40">
      <MotionDiv
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
      >
        {/* Header */}
        <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              <span className="text-sm font-medium">Bundle Analyzer</span>
            </div>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-white hover:text-gray-200 transition-colors"
            >
              {showDetails ? "−" : "+"}
            </button>
          </div>

          {stats && (
            <div className="mt-2 flex items-center justify-between text-sm">
              <span>{formatSize(stats.gzippedSize)} gzipped</span>
              <span className={getScoreColor(getBundleScore)}>
                Score: {getBundleScore}/100
              </span>
            </div>
          )}
        </div>

        {/* Loading State */}
        {isAnalyzing && (
          <div className="p-4 text-center">
            <MotionDiv
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"
            />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Analyzing bundle...
            </p>
          </div>
        )}

        {/* Detailed View */}
        <AnimatePresence>
          {showDetails && stats && !isAnalyzing && (
            <MotionDiv
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 max-h-96 overflow-y-auto">
                {/* Bundle Overview */}
                <div className="mb-4">
                  <h4 className="font-medium mb-2 flex items-center gap-1">
                    <Layers className="w-4 h-4" />
                    Bundle Overview
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                      <div className="text-gray-600 dark:text-gray-400">
                        Total
                      </div>
                      <div className="font-medium">
                        {formatSize(stats.totalSize)}
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                      <div className="text-gray-600 dark:text-gray-400">
                        Gzipped
                      </div>
                      <div className="font-medium">
                        {formatSize(stats.gzippedSize)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chunks */}
                <div className="mb-4">
                  <h4 className="font-medium mb-2">Chunks</h4>
                  <div className="space-y-1">
                    {stats.chunks.map((chunk) => (
                      <div
                        key={chunk.name}
                        className={`p-2 rounded text-sm cursor-pointer transition-colors ${
                          selectedChunk === chunk.name
                            ? "bg-blue-100 dark:bg-blue-900"
                            : "bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600"
                        }`}
                        onClick={() =>
                          setSelectedChunk(
                            selectedChunk === chunk.name ? null : chunk.name,
                          )
                        }
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{chunk.name}</span>
                          <span
                            className={`px-1 text-xs rounded ${
                              chunk.type === "main"
                                ? "bg-red-100 text-red-700"
                                : chunk.type === "vendor"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-green-100 text-green-700"
                            }`}
                          >
                            {chunk.type}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-600 dark:text-gray-400">
                          <span>{formatSize(chunk.size)}</span>
                          <span>{chunk.modules} modules</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Suggestions */}
                <div className="mb-4">
                  <h4 className="font-medium mb-2 flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    Optimization Suggestions
                  </h4>
                  <div className="space-y-2">
                    {stats.suggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className={`p-2 rounded-lg text-sm border-l-4 ${
                          suggestion.type === "error"
                            ? "bg-red-50 dark:bg-red-900/20 border-red-500"
                            : suggestion.type === "warning"
                              ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500"
                              : "bg-blue-50 dark:bg-blue-900/20 border-blue-500"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="font-medium">
                              {suggestion.message}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              Impact: {suggestion.impact}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Duplicates */}
                {stats.duplicates.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      Duplicate Modules
                    </h4>
                    <div className="space-y-1">
                      {stats.duplicates.map((duplicate) => (
                        <div
                          key={duplicate.module}
                          className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-sm"
                        >
                          <div className="font-medium">{duplicate.module}</div>
                          <div className="text-yellow-700 dark:text-yellow-300 text-xs">
                            {duplicate.count} instances •{" "}
                            {formatSize(duplicate.totalSize)} total
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="border-t border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800">
                <div className="flex gap-2">
                  <button
                    onClick={analyzeBundleSize}
                    disabled={isAnalyzing}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                  >
                    <Zap className="w-3 h-3 inline mr-1" />
                    Re-analyze
                  </button>
                  <button
                    onClick={() => {
                      const report = generateTextReport(stats);
                      navigator.clipboard?.writeText(report);
                    }}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                  >
                    <FileText className="w-3 h-3 inline mr-1" />
                    Copy Report
                  </button>
                </div>
              </div>
            </MotionDiv>
          )}
        </AnimatePresence>
      </MotionDiv>
    </div>
  );
};

// Generate text report for copying/sharing
const generateTextReport = (stats: BundleStats): string => {
  return `
Bundle Analysis Report
=====================

Overview:
- Total Size: ${formatSize(stats.totalSize)}
- Gzipped Size: ${formatSize(stats.gzippedSize)}
- Compression Ratio: ${((1 - stats.gzippedSize / stats.totalSize) * 100).toFixed(1)}%

Chunks:
${stats.chunks
  .map(
    (chunk) =>
      `- ${chunk.name} (${chunk.type}): ${formatSize(chunk.size)} (${chunk.modules} modules)`,
  )
  .join("\n")}

Optimization Suggestions:
${stats.suggestions.map((s) => `- [${s.type.toUpperCase()}] ${s.message} (Impact: ${s.impact})`).join("\n")}

${
  stats.duplicates.length > 0
    ? `
Duplicate Modules:
${stats.duplicates.map((d) => `- ${d.module}: ${d.count} instances, ${formatSize(d.totalSize)}`).join("\n")}
`
    : ""
}

Generated: ${new Date().toLocaleString()}
  `.trim();
};

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
