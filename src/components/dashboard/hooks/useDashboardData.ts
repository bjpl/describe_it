/**
 * Dashboard Data Hook
 * Centralized data fetching and state management
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useEffect } from 'react';
import type { DashboardData, DashboardError, TimeRange } from '../types';
import { logger } from '@/lib/logger';

interface UseDashboardDataOptions {
  userId?: string;
  timeRange?: TimeRange;
  refreshInterval?: number;
  enableRealtime?: boolean;
}

export function useDashboardData(options: UseDashboardDataOptions = {}) {
  const {
    userId,
    timeRange = '7d',
    refreshInterval = 30000,
    enableRealtime = false,
  } = options;

  const queryClient = useQueryClient();
  const [wsConnected, setWsConnected] = useState(false);

  // Fetch dashboard stats
  const statsQuery = useQuery({
    queryKey: ['dashboard', 'stats', userId, timeRange],
    queryFn: async () => {
      const response = await fetch(
        `/api/progress/stats?timeRange=${timeRange}${userId ? `&userId=${userId}` : ''}`
      );
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
    refetchInterval: refreshInterval,
    staleTime: 10000,
  });

  // Fetch analytics data
  const analyticsQuery = useQuery({
    queryKey: ['dashboard', 'analytics', userId, timeRange],
    queryFn: async () => {
      const response = await fetch(
        `/api/progress/analytics?timeRange=${timeRange}${userId ? `&userId=${userId}` : ''}`
      );
      if (!response.ok) throw new Error('Failed to fetch analytics');
      return response.json();
    },
    refetchInterval: refreshInterval,
    staleTime: 10000,
  });

  // Fetch performance metrics
  const performanceQuery = useQuery({
    queryKey: ['dashboard', 'performance'],
    queryFn: async () => {
      const response = await fetch('/api/monitoring/metrics');
      if (!response.ok) throw new Error('Failed to fetch performance');
      return response.json();
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });

  // Fetch user activity
  const activityQuery = useQuery({
    queryKey: ['dashboard', 'activity', userId],
    queryFn: async () => {
      const response = await fetch(
        `/api/sessions?limit=10${userId ? `&userId=${userId}` : ''}`
      );
      if (!response.ok) throw new Error('Failed to fetch activity');
      return response.json();
    },
    refetchInterval: refreshInterval,
    staleTime: 10000,
  });

  // WebSocket for real-time updates
  useEffect(() => {
    if (!enableRealtime) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/analytics/ws`;

    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          setWsConnected(true);
          logger.info('Dashboard WebSocket connected');
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            // Update relevant queries based on message type
            switch (data.type) {
              case 'stats_update':
                queryClient.setQueryData(
                  ['dashboard', 'stats', userId, timeRange],
                  data.payload
                );
                break;
              case 'analytics_update':
                queryClient.setQueryData(
                  ['dashboard', 'analytics', userId, timeRange],
                  data.payload
                );
                break;
              case 'activity_update':
                queryClient.invalidateQueries({
                  queryKey: ['dashboard', 'activity', userId],
                });
                break;
            }
          } catch (error) {
            logger.error('Error parsing WebSocket message:', error);
          }
        };

        ws.onerror = (error) => {
          logger.error('WebSocket error:', error);
          setWsConnected(false);
        };

        ws.onclose = () => {
          setWsConnected(false);
          logger.info('Dashboard WebSocket disconnected');

          // Attempt to reconnect after 5 seconds
          reconnectTimeout = setTimeout(connect, 5000);
        };
      } catch (error) {
        logger.error('Failed to create WebSocket:', error);
      }
    };

    connect();

    return () => {
      if (ws) {
        ws.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [enableRealtime, userId, timeRange, queryClient]);

  // Refresh all data
  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  }, [queryClient]);

  // Combine all data
  const isLoading =
    statsQuery.isLoading ||
    analyticsQuery.isLoading ||
    performanceQuery.isLoading ||
    activityQuery.isLoading;

  const error: DashboardError | null =
    statsQuery.error
      ? {
          type: 'fetch',
          message: 'Failed to load dashboard statistics',
          details: statsQuery.error,
        }
      : analyticsQuery.error
        ? {
            type: 'fetch',
            message: 'Failed to load analytics',
            details: analyticsQuery.error,
          }
        : null;

  const data: DashboardData | null =
    !isLoading && !error
      ? {
          stats: statsQuery.data?.stats || {
            totalPoints: 0,
            currentStreak: 0,
            accuracy: 0,
            totalWords: 0,
            wordsToday: 0,
            averageSessionTime: 0,
            completionRate: 0,
            vocabularyMastered: 0,
          },
          analytics: analyticsQuery.data || {
            progressOverTime: [],
            skillBreakdown: [],
            completionData: [],
            weeklyActivity: [],
          },
          performance: performanceQuery.data || {
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
          },
          activity: activityQuery.data || {
            recentSessions: [],
            topVocabulary: [],
          },
          lastUpdated: new Date().toISOString(),
        }
      : null;

  return {
    data,
    isLoading,
    error,
    refresh,
    wsConnected,
  };
}
