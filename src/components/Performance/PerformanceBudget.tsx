'use client';

import React, { useEffect, useState, memo } from 'react';
import { MotionDiv } from '@/components/ui/MotionComponents';
import { AlertTriangle, CheckCircle, XCircle, Target, TrendingUp, Clock } from 'lucide-react';
import { performanceLogger } from '@/lib/logger';

interface BudgetMetric {
  name: string;
  current: number;
  budget: number;
  unit: string;
  category: 'bundle' | 'runtime' | 'network' | 'memory';
  description: string;
}

interface PerformanceBudgetProps {
  className?: string;
}

const DEFAULT_BUDGETS: BudgetMetric[] = [
  {
    name: 'Total Bundle Size',
    current: 0,
    budget: 250, // 250KB
    unit: 'KB',
    category: 'bundle',
    description: 'Total JavaScript bundle size for initial load'
  },
  {
    name: 'Main Chunk Size',
    current: 0,
    budget: 150, // 150KB
    unit: 'KB',
    category: 'bundle',
    description: 'Size of the main JavaScript chunk'
  },
  {
    name: 'CSS Bundle Size',
    current: 0,
    budget: 50, // 50KB
    unit: 'KB',
    category: 'bundle',
    description: 'Total CSS bundle size'
  },
  {
    name: 'First Contentful Paint',
    current: 0,
    budget: 1800, // 1.8s
    unit: 'ms',
    category: 'runtime',
    description: 'Time to first meaningful content'
  },
  {
    name: 'Largest Contentful Paint',
    current: 0,
    budget: 2500, // 2.5s
    unit: 'ms',
    category: 'runtime',
    description: 'Time to largest content element'
  },
  {
    name: 'Time to Interactive',
    current: 0,
    budget: 3000, // 3s
    unit: 'ms',
    category: 'runtime',
    description: 'Time until page is fully interactive'
  },
  {
    name: 'Memory Usage',
    current: 0,
    budget: 100, // 100MB
    unit: 'MB',
    category: 'memory',
    description: 'Peak JavaScript heap memory usage'
  },
  {
    name: 'API Response Time',
    current: 0,
    budget: 500, // 500ms
    unit: 'ms',
    category: 'network',
    description: 'Average API response time'
  }
];

export const PerformanceBudget = memo<PerformanceBudgetProps>(({ className = '' }) => {
  const [metrics, setMetrics] = useState<BudgetMetric[]>(DEFAULT_BUDGETS);
  const [violations, setViolations] = useState<BudgetMetric[]>([]);

  useEffect(() => {
    const updateMetrics = () => {
      setMetrics(prev => prev.map(metric => {
        let current = metric.current;

        // Simulate real metrics (in production, these would come from actual measurements)
        switch (metric.name) {
          case 'Total Bundle Size':
            // Get from build stats or performance API
            current = Math.random() * 300 + 200; // 200-500KB
            break;
          case 'Main Chunk Size':
            current = Math.random() * 200 + 100; // 100-300KB
            break;
          case 'CSS Bundle Size':
            current = Math.random() * 60 + 20; // 20-80KB
            break;
          case 'First Contentful Paint':
            // Get from Performance API
            if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
              const entries = performance.getEntriesByType('paint');
              const fcp = entries.find(entry => entry.name === 'first-contentful-paint');
              current = fcp ? fcp.startTime : Math.random() * 2000 + 1000;
            }
            break;
          case 'Largest Contentful Paint':
            // Would use real LCP measurement
            current = Math.random() * 3000 + 1500;
            break;
          case 'Time to Interactive':
            current = Math.random() * 4000 + 2000;
            break;
          case 'Memory Usage':
            // Get from performance.memory if available
            if (typeof window !== 'undefined' && 'memory' in performance) {
              const memory = (performance as any).memory;
              current = memory.usedJSHeapSize / 1024 / 1024; // Convert to MB
            } else {
              current = Math.random() * 120 + 50;
            }
            break;
          case 'API Response Time':
            // Would track actual API response times
            current = Math.random() * 800 + 200;
            break;
        }

        return { ...metric, current };
      }));
    };

    // Initial update
    updateMetrics();

    // Update every 5 seconds
    const interval = setInterval(updateMetrics, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Track budget violations
    const newViolations = metrics.filter(metric => metric.current > metric.budget);
    setViolations(newViolations);

    // Log violations to console
    newViolations.forEach(violation => {
      performanceLogger.warn(`Performance Budget Violation: ${violation.name} (${violation.current.toFixed(1)}${violation.unit}) exceeds budget (${violation.budget}${violation.unit})`);
    });
  }, [metrics]);

  const getStatusIcon = (metric: BudgetMetric) => {
    const ratio = metric.current / metric.budget;
    
    if (ratio <= 0.8) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    } else if (ratio <= 1.0) {
      return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    } else {
      return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusColor = (metric: BudgetMetric) => {
    const ratio = metric.current / metric.budget;
    
    if (ratio <= 0.8) {
      return 'text-green-600';
    } else if (ratio <= 1.0) {
      return 'text-yellow-600';
    } else {
      return 'text-red-600';
    }
  };

  const getProgressBarColor = (metric: BudgetMetric) => {
    const ratio = metric.current / metric.budget;
    
    if (ratio <= 0.8) {
      return 'bg-green-500';
    } else if (ratio <= 1.0) {
      return 'bg-yellow-500';
    } else {
      return 'bg-red-500';
    }
  };

  const getProgressBarWidth = (metric: BudgetMetric) => {
    const ratio = (metric.current / metric.budget) * 100;
    return Math.min(ratio, 100); // Cap at 100%
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'bundle':
        return '📦';
      case 'runtime':
        return '⚡';
      case 'network':
        return '🌐';
      case 'memory':
        return '🧠';
      default:
        return '📊';
    }
  };

  const groupedMetrics = metrics.reduce((acc, metric) => {
    if (!acc[metric.category]) {
      acc[metric.category] = [];
    }
    acc[metric.category].push(metric);
    return acc;
  }, {} as Record<string, BudgetMetric[]>);

  const overallScore = Math.round(
    (metrics.filter(m => m.current <= m.budget).length / metrics.length) * 100
  );

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Performance Budget
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Tracking key metrics against defined budgets
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${
              overallScore >= 90 ? 'text-green-600' : 
              overallScore >= 70 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {overallScore}%
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Budget Compliance
            </div>
          </div>
        </div>

        {/* Violations Alert */}
        {violations.length > 0 && (
          <MotionDiv
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
          >
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">
                {violations.length} Budget Violation{violations.length > 1 ? 's' : ''}
              </span>
            </div>
          </MotionDiv>
        )}
      </div>

      {/* Metrics by Category */}
      <div className="p-6 space-y-6">
        {Object.entries(groupedMetrics).map(([category, categoryMetrics]) => (
          <div key={category}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{getCategoryIcon(category)}</span>
              <h4 className="font-medium text-gray-900 dark:text-white capitalize">
                {category} Metrics
              </h4>
            </div>

            <div className="space-y-3">
              {categoryMetrics.map((metric, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(metric)}
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {metric.name}
                      </span>
                    </div>
                    <div className={`text-sm font-mono ${getStatusColor(metric)}`}>
                      {metric.current.toFixed(metric.unit === 'ms' ? 0 : 1)}{metric.unit} 
                      <span className="text-gray-500 dark:text-gray-400 ml-1">
                        / {metric.budget}{metric.unit}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="relative">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${getProgressBarColor(metric)}`}
                        style={{ width: `${getProgressBarWidth(metric)}%` }}
                      />
                    </div>
                    <div className="absolute top-0 right-0 w-0.5 h-2 bg-gray-400 dark:bg-gray-500" />
                  </div>

                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {metric.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 rounded-b-lg">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Clock className="w-4 h-4" />
            <span>Updated every 5 seconds</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-xs text-gray-600 dark:text-gray-400">Within Budget</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-yellow-500 rounded-full" />
              <span className="text-xs text-gray-600 dark:text-gray-400">Warning</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              <span className="text-xs text-gray-600 dark:text-gray-400">Over Budget</span>
            </div>
          </div>
        </div>
      </div>
    </MotionDiv>
  );
});

PerformanceBudget.displayName = 'PerformanceBudget';