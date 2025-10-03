'use client';

import React, { useEffect, useState, memo } from 'react';
import { getCLS, getFID, getFCP, getLCP, getTTFB, getINP } from 'web-vitals';
import { MotionDiv, MotionButton } from '@/components/ui/MotionComponents';
import { Activity, AlertTriangle, CheckCircle, XCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { safeParse, safeStringify, safeParseLocalStorage, safeSetLocalStorage } from "@/lib/utils/json-safe";
import { performanceLogger } from '@/lib/logger';

interface WebVital {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  timestamp: number;
}

interface VitalThresholds {
  good: number;
  needsImprovement: number;
}

const THRESHOLDS: Record<string, VitalThresholds> = {
  CLS: { good: 0.1, needsImprovement: 0.25 },
  FID: { good: 100, needsImprovement: 300 },
  FCP: { good: 1800, needsImprovement: 3000 },
  LCP: { good: 2500, needsImprovement: 4000 },
  TTFB: { good: 800, needsImprovement: 1800 },
  INP: { good: 200, needsImprovement: 500 },
};

const formatValue = (name: string, value: number): string => {
  if (name === 'CLS') {
    return value.toFixed(3);
  }
  return Math.round(value).toString();
};

const getUnit = (name: string): string => {
  if (name === 'CLS') return '';
  return 'ms';
};

const getRatingColor = (rating: string): string => {
  switch (rating) {
    case 'good':
      return 'text-green-500';
    case 'needs-improvement':
      return 'text-yellow-500';
    case 'poor':
      return 'text-red-500';
    default:
      return 'text-gray-500';
  }
};

const getRatingIcon = (rating: string) => {
  switch (rating) {
    case 'good':
      return <CheckCircle className="w-4 h-4" />;
    case 'needs-improvement':
      return <AlertTriangle className="w-4 h-4" />;
    case 'poor':
      return <XCircle className="w-4 h-4" />;
    default:
      return null;
  }
};

export const WebVitalsMonitor = memo(() => {
  const [vitals, setVitals] = useState<Record<string, WebVital>>({});
  const [isVisible, setIsVisible] = useState(false);
  const [history, setHistory] = useState<WebVital[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleVital = (vital: any) => {
      const newVital: WebVital = {
        name: vital.name,
        value: vital.value,
        rating: vital.rating,
        delta: vital.delta,
        id: vital.id,
        timestamp: Date.now(),
      };

      setVitals(prev => ({
        ...prev,
        [vital.name]: newVital,
      }));

      setHistory(prev => [...prev, newVital].slice(-50)); // Keep last 50 measurements

      // Log performance issues
      if (vital.rating === 'poor') {
        performanceLogger.warn(`Poor Web Vital: ${vital.name} = ${vital.value} (${vital.rating})`);
      }
    };

    // Initialize Web Vitals collection
    getCLS(handleVital);
    getFID(handleVital);
    getFCP(handleVital);
    getLCP(handleVital);
    getTTFB(handleVital);
    getINP(handleVital);

    // Keyboard shortcut to toggle visibility
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'V') {
        setIsVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  const calculateScore = (): number => {
    const vitalEntries = Object.values(vitals);
    if (vitalEntries.length === 0) return 100;

    let score = 0;
    vitalEntries.forEach(vital => {
      switch (vital.rating) {
        case 'good':
          score += 100;
          break;
        case 'needs-improvement':
          score += 50;
          break;
        case 'poor':
          score += 0;
          break;
      }
    });

    return Math.round(score / vitalEntries.length);
  };

  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getTrend = (vital: WebVital): 'up' | 'down' | 'stable' => {
    const recent = history
      .filter(h => h.name === vital.name)
      .slice(-5);

    if (recent.length < 2) return 'stable';

    const first = recent[0].value;
    const last = recent[recent.length - 1].value;
    const change = ((last - first) / first) * 100;

    if (Math.abs(change) < 5) return 'stable';
    return change > 0 ? 'up' : 'down';
  };

  const exportMetrics = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      currentVitals: vitals,
      history: history,
      score: calculateScore(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    const blob = new Blob([safeStringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `web-vitals-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const score = calculateScore();

  if (!isVisible) {
    return (
      <MotionButton
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 left-4 z-50 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        title="Show Web Vitals (Ctrl+Shift+V)"
      >
        <Activity className="w-5 h-5" />
      </MotionButton>
    );
  }

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
      className="fixed bottom-4 left-4 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-4 min-w-80 max-w-md"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Web Vitals</h3>
          <div className={`px-2 py-1 rounded text-xs font-medium ${getScoreColor(score)}`}>
            {score}/100
          </div>
        </div>
        <div className="flex items-center gap-1">
          <MotionButton
            onClick={exportMetrics}
            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="Export metrics"
          >
            📊
          </MotionButton>
          <button
            onClick={() => setIsVisible(false)}
            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ×
          </button>
        </div>
      </div>

      {/* Vitals Grid */}
      <div className="space-y-3">
        {Object.entries(vitals).map(([name, vital]) => {
          const trend = getTrend(vital);
          const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : null;

          return (
            <div
              key={name}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <div className={getRatingColor(vital.rating)}>
                  {getRatingIcon(vital.rating)}
                </div>
                <div>
                  <div className="font-medium text-sm text-gray-900 dark:text-white">
                    {name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {THRESHOLDS[name] && (
                      <>Good: &lt;{THRESHOLDS[name].good}{getUnit(name)}</>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`font-mono text-lg ${getRatingColor(vital.rating)}`}>
                  {formatValue(name, vital.value)}{getUnit(name)}
                </div>
                <div className="flex items-center gap-1 justify-end">
                  {TrendIcon && (
                    <TrendIcon className={`w-3 h-3 ${
                      trend === 'up' ? 'text-red-500' : 'text-green-500'
                    }`} />
                  )}
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Δ{formatValue(name, vital.delta)}{getUnit(name)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600 text-xs text-gray-500 dark:text-gray-400">
        Press Ctrl+Shift+V to toggle • {Object.keys(vitals).length} metrics tracked
      </div>
    </MotionDiv>
  );
});

WebVitalsMonitor.displayName = 'WebVitalsMonitor';