'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Zap } from 'lucide-react';

interface PerformanceMetrics {
  fcp: number;
  lcp: number;
  cls: number;
  ttfb: number;
}

const BUDGETS = {
  fcp: { good: 1800, needsImprovement: 3000 },
  lcp: { good: 2500, needsImprovement: 4000 },
  cls: { good: 0.1, needsImprovement: 0.25 },
  ttfb: { good: 800, needsImprovement: 1800 },
};

export default function PerformanceBudget() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const showBudget =
      process.env.NODE_ENV === 'development' ||
      (typeof window !== 'undefined' && localStorage.getItem('show-performance-budget') === 'true');

    setIsVisible(showBudget);

    if (!showBudget || typeof window === 'undefined') return;

    // Simplified metrics collection
    const navigationEntry = performance.getEntriesByType('navigation')[0] as any;
    if (navigationEntry) {
      setMetrics({
        fcp: navigationEntry.domContentLoadedEventEnd || 0,
        lcp: navigationEntry.loadEventEnd || 0,
        cls: 0,
        ttfb: navigationEntry.responseStart || 0,
      });
    }
  }, []);

  const getStatus = (value: number, budget: { good: number; needsImprovement: number }) => {
    if (value <= budget.good) return 'good';
    if (value <= budget.needsImprovement) return 'needs-improvement';
    return 'poor';
  };

  if (!isVisible || !metrics) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Performance Budget
            </h3>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            ×
          </button>
        </div>
        <div className="space-y-2">
          {Object.entries(metrics).map(([key, value]) => {
            const budget = BUDGETS[key as keyof typeof BUDGETS];
            const status = getStatus(value, budget);
            const statusColor = status === 'good' ? 'bg-green-100 text-green-800' : status === 'needs-improvement' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800';
            
            return (
              <div key={key} className={`p-2 rounded-lg ${statusColor}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">{key.toUpperCase()}</span>
                  <span className="text-xs font-bold">{Math.round(value)}ms</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
