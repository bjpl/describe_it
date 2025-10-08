/**
 * Admin Analytics API Endpoint
 * Provides aggregated analytics data for the admin dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { captureError } from '@/lib/monitoring/sentry';
import { apiLogger } from '@/lib/logger';
import { asLogContext } from '@/lib/utils/typeGuards';

export async function GET(request: NextRequest) {
  try {
    // In production, add authentication check here
    // const isAdmin = await verifyAdminAccess(request);
    // if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [
      analyticsData,
      errorData,
      performanceData,
      systemData
    ] = await Promise.all([
      getAnalyticsData(),
      getErrorData(),
      getPerformanceData(),
      getSystemData(),
    ]);

    return NextResponse.json({
      analytics: analyticsData,
      errors: errorData,
      performance: performanceData,
      system: systemData,
    });

  } catch (error) {
    apiLogger.error('Admin analytics API error:', asLogContext({ error: error instanceof Error ? error.message : String(error) }));
    captureError(error as Error, {
      endpoint: '/api/admin/analytics',
      method: 'GET',
    });

    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}

async function getAnalyticsData() {
  try {
    // Get user metrics
    const { data: userMetrics } = await supabase
      .from('analytics_events')
      .select('user_id, user_tier, timestamp')
      .not('user_id', 'is', null);

    // Calculate unique users and active users (last 24h)
    const uniqueUsers = new Set(
      Array.isArray(userMetrics) ? userMetrics.map(u => 'user_id' in u ? u.user_id : null).filter(Boolean) : []
    ).size;
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const activeUsers = new Set(
      Array.isArray(userMetrics)
        ? userMetrics
            .filter(u => 'timestamp' in u && 'user_id' in u && u.timestamp >= last24h)
            .map(u => 'user_id' in u ? u.user_id : null)
            .filter(Boolean)
        : []
    ).size;

    // Get session data
    const { data: sessionData } = await supabase
      .from('analytics_events')
      .select('session_id, timestamp, properties')
      .eq('event_name' as any, 'learning_session_ended');

    const totalSessions = Array.isArray(sessionData) ? sessionData.length : 0;
    const avgSessionDuration = Array.isArray(sessionData) && totalSessions > 0
      ? sessionData.reduce((acc, session) => {
          return acc + ('properties' in session && session.properties?.sessionDuration || 0);
        }, 0) / totalSessions
      : 0;

    // Get feature usage
    const { data: featureData } = await supabase
      .from('analytics_events')
      .select('properties')
      .eq('event_name' as any, 'feature_used');

    const featureUsage = Array.isArray(featureData)
      ? featureData.reduce((acc, event) => {
          if ('properties' in event) {
            const featureName = event.properties?.featureName;
            if (featureName) {
              acc[featureName] = (acc[featureName] || 0) + 1;
            }
          }
          return acc;
        }, {} as Record<string, number>)
      : {};

    const topFeatures = Object.entries(featureUsage)
      .map(([name, usage]) => ({ name, usage }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 10);

    // Get user tier distribution
    const userTiers = Array.isArray(userMetrics)
      ? userMetrics.reduce((acc, user) => {
          if ('user_tier' in user) {
            const tier = user.user_tier || 'free';
            acc[tier] = (acc[tier] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>)
      : {};

    const userTierData = Object.entries(userTiers)
      .map(([tier, count]) => ({ tier, count }));

    return {
      totalUsers: uniqueUsers,
      activeUsers,
      totalSessions,
      avgSessionDuration,
      topFeatures,
      userTiers: userTierData,
    };

  } catch (error) {
    apiLogger.error('Failed to get analytics data:', asLogContext({ error: error instanceof Error ? error.message : String(error) }));
    return {
      totalUsers: 0,
      activeUsers: 0,
      totalSessions: 0,
      avgSessionDuration: 0,
      topFeatures: [],
      userTiers: [],
    };
  }
}

async function getErrorData() {
  try {
    // Get error metrics
    const { data: errorEvents } = await supabase
      .from('analytics_events')
      .select('timestamp, properties')
      .eq('event_name' as any, 'error_occurred');

    const totalErrors = Array.isArray(errorEvents) ? errorEvents.length : 0;
    const criticalErrors = Array.isArray(errorEvents)
      ? errorEvents.filter(e => 'properties' in e && e.properties?.severity === 'critical').length
      : 0;

    // Calculate error rate (errors per 100 requests)
    const { data: requestEvents } = await supabase
      .from('analytics_events')
      .select('timestamp')
      .eq('event_name' as any, 'api_request');

    const totalRequests = Array.isArray(requestEvents) ? requestEvents.length : 1;
    const errorRate = (totalErrors / totalRequests) * 100;

    // Get top errors
    const errorTypes = Array.isArray(errorEvents)
      ? errorEvents.reduce((acc, event) => {
          if ('properties' in event) {
            const message = event.properties?.errorMessage || 'Unknown error';
            const severity = event.properties?.severity || 'medium';
            const key = `${message.substring(0, 100)}...`;

            if (!acc[key]) {
              acc[key] = { message: key, count: 0, severity };
            }
            acc[key].count++;
          }
          return acc;
        }, {} as Record<string, { message: string; count: number; severity: string }>)
      : {};

    const topErrors = Object.values(errorTypes)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Get error trends (last 7 days)
    const errorTrends = await getErrorTrends();

    return {
      totalErrors,
      criticalErrors,
      errorRate,
      topErrors,
      errorTrends,
    };

  } catch (error) {
    apiLogger.error('Failed to get error data:', asLogContext({ error: error instanceof Error ? error.message : String(error) }));
    return {
      totalErrors: 0,
      criticalErrors: 0,
      errorRate: 0,
      topErrors: [],
      errorTrends: [],
    };
  }
}

async function getErrorTrends() {
  try {
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: errors } = await supabase
      .from('analytics_events')
      .select('timestamp')
      .eq('event_name' as any, 'error_occurred')
      .gte('timestamp', last7Days);

    // Group errors by date
    const errorsByDate = Array.isArray(errors)
      ? errors.reduce((acc, error) => {
          if ('timestamp' in error) {
            const date = new Date(error.timestamp).toISOString().split('T')[0];
            acc[date] = (acc[date] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>)
      : {};

    // Fill in missing dates with 0
    const trends = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];
      trends.push({
        date: new Date(date).toLocaleDateString(),
        count: errorsByDate[date] || 0,
      });
    }

    return trends;

  } catch (error) {
    apiLogger.error('Failed to get error trends:', asLogContext({ error: error instanceof Error ? error.message : String(error) }));
    return [];
  }
}

async function getPerformanceData() {
  try {
    // Get API response times
    const { data: apiEvents } = await supabase
      .from('analytics_events')
      .select('properties')
      .eq('event_name' as any, 'api_request');

    const responseTimes = Array.isArray(apiEvents)
      ? apiEvents
          .map(e => 'properties' in e ? e.properties?.responseTime : null)
          .filter((t): t is number => typeof t === 'number')
      : [];
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

    // Calculate API success rate
    const { data: apiErrors } = await supabase
      .from('analytics_events')
      .select('timestamp')
      .eq('event_name' as any, 'api_error');

    const totalApiRequests = Array.isArray(apiEvents) ? apiEvents.length : 1;
    const totalApiErrors = Array.isArray(apiErrors) ? apiErrors.length : 0;
    const apiSuccess = ((totalApiRequests - totalApiErrors) / totalApiRequests) * 100;

    // Get web vitals
    const { data: vitalsEvents } = await supabase
      .from('analytics_events')
      .select('properties')
      .eq('event_name' as any, 'web_vitals')
      .order('timestamp', { ascending: false })
      .limit(10);

    const latestVitals =
      Array.isArray(vitalsEvents) && vitalsEvents.length > 0 && 'properties' in vitalsEvents[0]
        ? vitalsEvents[0].properties?.vitals || {}
        : {};
    const webVitals = {
      fcp: latestVitals.fcp || 0,
      lcp: latestVitals.lcp || 0,
      fid: latestVitals.fid || 0,
      cls: latestVitals.cls || 0,
    };

    // Get slow queries (simulated - replace with actual slow query detection)
    const slowQueries = [
      { query: 'SELECT * FROM analytics_events WHERE...', duration: 1240 },
      { query: 'UPDATE user_progress SET...', duration: 980 },
      { query: 'INSERT INTO vocabulary_learned...', duration: 750 },
    ];

    return {
      avgResponseTime: Math.round(avgResponseTime),
      apiSuccess,
      webVitals,
      slowQueries,
    };

  } catch (error) {
    apiLogger.error('Failed to get performance data:', error);
    return {
      avgResponseTime: 0,
      apiSuccess: 100,
      webVitals: { fcp: 0, lcp: 0, fid: 0, cls: 0 },
      slowQueries: [],
    };
  }
}

async function getSystemData() {
  try {
    // These would typically come from your infrastructure monitoring
    // For now, we'll return simulated values
    const systemData = {
      serverHealth: 'healthy' as const,
      databaseHealth: 'healthy' as const,
      cacheHitRate: 85.7,
      memoryUsage: 68.2,
      uptime: 145 * 3600, // 145 hours in seconds
    };

    // In production, you might check:
    // - Server response times
    // - Database connection pool status
    // - Cache statistics
    // - Memory usage from monitoring tools
    // - Actual uptime from infrastructure

    return systemData;

  } catch (error) {
    apiLogger.error('Failed to get system data:', error);
    return {
      serverHealth: 'warning' as const,
      databaseHealth: 'warning' as const,
      cacheHitRate: 0,
      memoryUsage: 0,
      uptime: 0,
    };
  }
}