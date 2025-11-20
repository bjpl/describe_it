"use client";

import React from 'react';
import { DashboardCard } from '@/components/Dashboard/DashboardLayout';
import { Zap, Database, Activity, AlertCircle } from 'lucide-react';
import type { PerformanceMetrics } from '../types';

interface PerformanceWidgetProps {
  metrics: PerformanceMetrics;
  loading?: boolean;
}

export function PerformanceWidget({ metrics, loading = false }: PerformanceWidgetProps) {
  const getPerformanceColor = (value: number, thresholds: { good: number; poor: number }) => {
    if (value <= thresholds.good) return 'text-green-600 bg-green-50';
    if (value <= thresholds.poor) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const webVitalsItems = [
    {
      name: 'LCP',
      label: 'Largest Contentful Paint',
      value: `${metrics.webVitals.LCP.toFixed(0)}ms`,
      color: getPerformanceColor(metrics.webVitals.LCP, { good: 2500, poor: 4000 }),
    },
    {
      name: 'FID',
      label: 'First Input Delay',
      value: `${metrics.webVitals.FID.toFixed(0)}ms`,
      color: getPerformanceColor(metrics.webVitals.FID, { good: 100, poor: 300 }),
    },
    {
      name: 'CLS',
      label: 'Cumulative Layout Shift',
      value: metrics.webVitals.CLS.toFixed(3),
      color: getPerformanceColor(metrics.webVitals.CLS * 1000, { good: 100, poor: 250 }),
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Web Vitals */}
      <DashboardCard
        title="Web Vitals"
        description="Core performance metrics"
        loading={loading}
      >
        <div className="space-y-3">
          {webVitalsItems.map((item) => (
            <div key={item.name} className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <div className="font-medium text-sm">{item.label}</div>
                <div className="text-xs text-muted-foreground">{item.name}</div>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-semibold ${item.color}`}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </DashboardCard>

      {/* System Metrics */}
      <DashboardCard
        title="System Performance"
        description="Application health"
        loading={loading}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-blue-600" />
              <div>
                <div className="font-medium text-sm">Cache Hit Rate</div>
                <div className="text-xs text-muted-foreground">Data caching efficiency</div>
              </div>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {metrics.cacheHitRate.toFixed(1)}%
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-green-600" />
              <div>
                <div className="font-medium text-sm">Avg Response Time</div>
                <div className="text-xs text-muted-foreground">API performance</div>
              </div>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {metrics.averageResponseTime.toFixed(0)}ms
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-purple-600" />
              <div>
                <div className="font-medium text-sm">Error Rate</div>
                <div className="text-xs text-muted-foreground">Request failures</div>
              </div>
            </div>
            <div className="text-2xl font-bold text-purple-600">
              {metrics.errorRate.toFixed(2)}%
            </div>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}
