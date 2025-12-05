/**
 * Bundle Size Analyzer
 *
 * Tools for analyzing and optimizing bundle size:
 * - Dynamic import recommendations
 * - Tree-shaking helpers
 * - Code splitting analysis
 * - Bundle size budgets
 */

import React from 'react';
import { logger } from '@/lib/logger';

export interface BundleMetrics {
  totalSize: number;
  chunks: ChunkInfo[];
  suggestions: BundleSuggestion[];
  timestamp: number;
}

export interface ChunkInfo {
  name: string;
  size: number;
  modules: string[];
  isAsync: boolean;
  priority: 'high' | 'normal' | 'low';
}

export interface BundleSuggestion {
  type: 'code-split' | 'dynamic-import' | 'tree-shake' | 'lazy-load';
  severity: 'high' | 'medium' | 'low';
  description: string;
  estimatedSavings: number;
  recommendation: string;
}

export interface BundleBudget {
  maxInitialBundle: number; // bytes
  maxAsyncChunk: number; // bytes
  maxTotalSize: number; // bytes
}

const DEFAULT_BUDGET: BundleBudget = {
  maxInitialBundle: 200 * 1024, // 200 KB
  maxAsyncChunk: 100 * 1024, // 100 KB
  maxTotalSize: 1024 * 1024, // 1 MB
};

// Heavy dependencies that should be code-split
const HEAVY_DEPENDENCIES = [
  { name: '@anthropic-ai/sdk', minSize: 50 * 1024, recommendation: 'Lazy load AI SDK' },
  { name: 'chart.js', minSize: 100 * 1024, recommendation: 'Load charts on demand' },
  { name: 'framer-motion', minSize: 80 * 1024, recommendation: 'Use dynamic imports for animations' },
  { name: 'html2canvas', minSize: 120 * 1024, recommendation: 'Load on export feature use' },
  { name: 'jspdf', minSize: 100 * 1024, recommendation: 'Load on PDF export' },
  { name: 'recharts', minSize: 150 * 1024, recommendation: 'Code split chart components' },
];

class BundleAnalyzer {
  private budget: BundleBudget = DEFAULT_BUDGET;
  private metrics: BundleMetrics | null = null;

  /**
   * Set bundle size budget
   */
  setBudget(budget: Partial<BundleBudget>): void {
    this.budget = { ...this.budget, ...budget };
  }

  /**
   * Analyze bundle and generate suggestions
   */
  analyzeBundle(bundleData?: {
    chunks?: ChunkInfo[];
    totalSize?: number;
  }): BundleMetrics {
    const chunks = bundleData?.chunks || this.detectChunks();
    const totalSize = bundleData?.totalSize || this.estimateTotalSize(chunks);

    const suggestions: BundleSuggestion[] = [];

    // Check against budget
    const initialChunks = chunks.filter(c => !c.isAsync);
    const initialSize = initialChunks.reduce((sum, c) => sum + c.size, 0);

    if (initialSize > this.budget.maxInitialBundle) {
      suggestions.push({
        type: 'code-split',
        severity: 'high',
        description: 'Initial bundle exceeds budget',
        estimatedSavings: initialSize - this.budget.maxInitialBundle,
        recommendation: `Split initial bundle. Current: ${this.formatBytes(initialSize)}, Budget: ${this.formatBytes(this.budget.maxInitialBundle)}`,
      });
    }

    if (totalSize > this.budget.maxTotalSize) {
      suggestions.push({
        type: 'tree-shake',
        severity: 'medium',
        description: 'Total bundle size exceeds budget',
        estimatedSavings: totalSize - this.budget.maxTotalSize,
        recommendation: `Review dependencies and enable tree-shaking. Current: ${this.formatBytes(totalSize)}, Budget: ${this.formatBytes(this.budget.maxTotalSize)}`,
      });
    }

    // Check for heavy dependencies
    suggestions.push(...this.analyzeHeavyDependencies(chunks));

    // Check for large async chunks
    chunks.filter(c => c.isAsync && c.size > this.budget.maxAsyncChunk).forEach(chunk => {
      suggestions.push({
        type: 'code-split',
        severity: 'medium',
        description: `Async chunk '${chunk.name}' is too large`,
        estimatedSavings: chunk.size - this.budget.maxAsyncChunk,
        recommendation: `Further split ${chunk.name} into smaller chunks`,
      });
    });

    this.metrics = {
      totalSize,
      chunks,
      suggestions: suggestions.sort((a, b) => {
        const severityOrder = { high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      }),
      timestamp: Date.now(),
    };

    return this.metrics;
  }

  /**
   * Get code splitting recommendations
   */
  getCodeSplitRecommendations(): string[] {
    const recommendations: string[] = [];

    // Route-based splitting
    recommendations.push(
      '// Route-based code splitting',
      'const AdminPage = React.lazy(() => import("./pages/AdminPage"));',
      'const ProgressPage = React.lazy(() => import("./pages/ProgressPage"));',
      'const SettingsPage = React.lazy(() => import("./pages/SettingsPage"));',
      ''
    );

    // Feature-based splitting
    recommendations.push(
      '// Feature-based code splitting',
      'const ChartComponents = React.lazy(() => import("./components/Charts"));',
      'const ExportFeature = React.lazy(() => import("./features/Export"));',
      'const AnalyticsFeature = React.lazy(() => import("./features/Analytics"));',
      ''
    );

    // Heavy library splitting
    recommendations.push(
      '// Heavy library code splitting',
      'const PDFExport = React.lazy(() => import("./utils/pdfExport"));',
      'const ImageProcessor = React.lazy(() => import("./utils/imageProcessing"));',
      ''
    );

    return recommendations;
  }

  /**
   * Get tree-shaking recommendations
   */
  getTreeShakingRecommendations(): string[] {
    return [
      '// Use named imports instead of namespace imports',
      '// Bad: import * as Icons from "lucide-react"',
      '// Good: import { Search, Settings } from "lucide-react"',
      '',
      '// Enable sideEffects: false in package.json',
      '"sideEffects": false,',
      '',
      '// Use ES modules instead of CommonJS',
      '// Bad: const component = require("./Component")',
      '// Good: import component from "./Component"',
      '',
      '// Avoid default exports for better tree-shaking',
      '// export const MyComponent = () => {...}',
      '// export { MyComponent }',
    ];
  }

  /**
   * Generate lazy loading template
   */
  generateLazyLoadingTemplate(componentName: string, importPath: string): string {
    return `
import React, { Suspense } from 'react';
import { LoadingSpinner } from '@/components/Loading';

const Lazy${componentName} = React.lazy(() =>
  import('${importPath}').then(module => ({
    default: module.${componentName}
  }))
);

export function ${componentName}Wrapper(props) {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Lazy${componentName} {...props} />
    </Suspense>
  );
}
`.trim();
  }

  /**
   * Get bundle size report
   */
  getReport(): string {
    if (!this.metrics) {
      this.analyzeBundle();
    }

    const { totalSize, chunks, suggestions } = this.metrics!;

    const lines: string[] = [
      '=== BUNDLE SIZE ANALYSIS REPORT ===',
      '',
      `Total Bundle Size: ${this.formatBytes(totalSize)}`,
      `Budget: ${this.formatBytes(this.budget.maxTotalSize)}`,
      `Status: ${totalSize > this.budget.maxTotalSize ? '❌ EXCEEDS' : '✅ OK'}`,
      '',
      '--- Chunks ---',
    ];

    chunks.forEach(chunk => {
      const status = chunk.isAsync
        ? chunk.size > this.budget.maxAsyncChunk
          ? '❌'
          : '✅'
        : chunk.size > this.budget.maxInitialBundle
          ? '❌'
          : '✅';

      lines.push(
        `${status} ${chunk.name} (${chunk.isAsync ? 'async' : 'initial'}): ${this.formatBytes(chunk.size)}`
      );
    });

    if (suggestions.length > 0) {
      lines.push('', '--- Optimization Suggestions ---');

      suggestions.forEach((suggestion, index) => {
        lines.push(
          '',
          `${index + 1}. [${suggestion.severity.toUpperCase()}] ${suggestion.type}`,
          `   ${suggestion.description}`,
          `   Potential Savings: ${this.formatBytes(suggestion.estimatedSavings)}`,
          `   Recommendation: ${suggestion.recommendation}`
        );
      });
    }

    lines.push('', '=== END REPORT ===');

    return lines.join('\n');
  }

  /**
   * Export metrics as JSON
   */
  exportMetrics(): string {
    if (!this.metrics) {
      this.analyzeBundle();
    }

    return JSON.stringify(this.metrics, null, 2);
  }

  // Private methods

  private detectChunks(): ChunkInfo[] {
    // In a real implementation, this would analyze webpack/vite stats
    // For now, return estimated chunks based on known routes
    return [
      {
        name: 'main',
        size: 180 * 1024,
        modules: ['react', 'react-dom', 'next'],
        isAsync: false,
        priority: 'high',
      },
      {
        name: 'vendors',
        size: 250 * 1024,
        modules: ['@supabase/supabase-js', '@tanstack/react-query'],
        isAsync: false,
        priority: 'high',
      },
      {
        name: 'charts',
        size: 120 * 1024,
        modules: ['chart.js', 'recharts'],
        isAsync: true,
        priority: 'normal',
      },
      {
        name: 'export',
        size: 150 * 1024,
        modules: ['html2canvas', 'jspdf'],
        isAsync: true,
        priority: 'low',
      },
    ];
  }

  private estimateTotalSize(chunks: ChunkInfo[]): number {
    return chunks.reduce((sum, chunk) => sum + chunk.size, 0);
  }

  private analyzeHeavyDependencies(chunks: ChunkInfo[]): BundleSuggestion[] {
    const suggestions: BundleSuggestion[] = [];

    HEAVY_DEPENDENCIES.forEach(dep => {
      const hasInInitial = chunks
        .filter(c => !c.isAsync)
        .some(c => c.modules.some(m => m.includes(dep.name)));

      if (hasInInitial) {
        suggestions.push({
          type: 'dynamic-import',
          severity: 'high',
          description: `Heavy dependency '${dep.name}' in initial bundle`,
          estimatedSavings: dep.minSize,
          recommendation: dep.recommendation,
        });
      }
    });

    return suggestions;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}

// Export singleton instance
export const bundleAnalyzer = new BundleAnalyzer();

// Export helper functions

/**
 * Create a code-split HOC for a component
 */
export function createLazyComponent<P extends object>(
  importFn: () => Promise<{ default: React.ComponentType<P> } | React.ComponentType<P>>,
  fallback?: React.ReactNode
) {
  const LazyComponent = React.lazy(async () => {
    const module = await importFn();
    return 'default' in module ? module : { default: module as React.ComponentType<P> };
  });

  return function LazyWrapper(props: P) {
    return React.createElement(
      React.Suspense,
      { fallback: fallback || React.createElement('div', null, 'Loading...') },
      React.createElement(LazyComponent, props)
    );
  };
}

/**
 * Preload a lazy component
 */
export function preloadComponent(
  importFn: () => Promise<unknown>
): void {
  // Start loading the component
  importFn().catch(err => {
    logger.error('Failed to preload component', err as Error);
  });
}

/**
 * Check if code splitting is supported
 */
export function isCodeSplittingSupported(): boolean {
  return typeof React.lazy === 'function';
}

// Need to import React for JSX
import React from 'react';
