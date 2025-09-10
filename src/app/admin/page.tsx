/**
 * Admin Dashboard - Monitoring and Analytics Overview
 * Provides comprehensive system monitoring and user analytics
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell 
} from 'recharts';
import { 
  AlertTriangle, 
  Activity, 
  Users, 
  Zap, 
  TrendingUp, 
  Clock, 
  Database,
  Wifi,
  RefreshCw 
} from 'lucide-react';

interface AdminDashboardData {
  analytics: {
    totalUsers: number;
    activeUsers: number;
    totalSessions: number;
    avgSessionDuration: number;
    topFeatures: Array<{ name: string; usage: number }>;
    userTiers: Array<{ tier: string; count: number }>;
  };
  errors: {
    totalErrors: number;
    criticalErrors: number;
    errorRate: number;
    topErrors: Array<{ message: string; count: number; severity: string }>;
    errorTrends: Array<{ date: string; count: number }>;
  };
  performance: {
    avgResponseTime: number;
    apiSuccess: number;
    webVitals: {
      fcp: number;
      lcp: number;
      fid: number;
      cls: number;
    };
    slowQueries: Array<{ query: string; duration: number }>;
  };
  system: {
    serverHealth: 'healthy' | 'warning' | 'critical';
    databaseHealth: 'healthy' | 'warning' | 'critical';
    cacheHitRate: number;
    memoryUsage: number;
    uptime: number;
  };
}

export default function AdminDashboard() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/analytics');
      const dashboardData = await response.json();
      setData(dashboardData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy': return '🟢';
      case 'warning': return '🟡';
      case 'critical': return '🔴';
      default: return '⚪';
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load dashboard data. Please check your connection and try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-600">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            onClick={() => setAutoRefresh(!autoRefresh)}
            size="sm"
          >
            <Activity className="w-4 h-4 mr-2" />
            Auto Refresh
          </Button>
          <Button onClick={fetchDashboardData} size="sm" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Server Health</p>
                <p className={`text-lg font-bold ${getHealthColor(data.system.serverHealth)}`}>
                  {getHealthIcon(data.system.serverHealth)} {data.system.serverHealth}
                </p>
              </div>
              <Wifi className="w-6 h-6 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Database</p>
                <p className={`text-lg font-bold ${getHealthColor(data.system.databaseHealth)}`}>
                  {getHealthIcon(data.system.databaseHealth)} {data.system.databaseHealth}
                </p>
              </div>
              <Database className="w-6 h-6 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Error Rate</p>
                <p className="text-lg font-bold">
                  {data.errors.errorRate.toFixed(2)}%
                </p>
              </div>
              <AlertTriangle className="w-6 h-6 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Avg Response</p>
                <p className="text-lg font-bold">
                  {data.performance.avgResponseTime}ms
                </p>
              </div>
              <Zap className="w-6 h-6 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Key Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Key Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Users</span>
                    <Badge variant="secondary">{data.analytics.totalUsers}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Users</span>
                    <Badge variant="secondary">{data.analytics.activeUsers}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Sessions</span>
                    <Badge variant="secondary">{data.analytics.totalSessions}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Session Duration</span>
                    <Badge variant="secondary">{Math.round(data.analytics.avgSessionDuration / 60)}m</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* System Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Cache Hit Rate</span>
                    <Badge variant="secondary">{data.system.cacheHitRate.toFixed(1)}%</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Memory Usage</span>
                    <Badge variant="secondary">{data.system.memoryUsage.toFixed(1)}%</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>API Success Rate</span>
                    <Badge variant="secondary">{data.performance.apiSuccess.toFixed(1)}%</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Uptime</span>
                    <Badge variant="secondary">{Math.round(data.system.uptime / 3600)}h</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Feature Usage */}
            <Card>
              <CardHeader>
                <CardTitle>Feature Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.analytics.topFeatures}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="usage" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* User Tiers */}
            <Card>
              <CardHeader>
                <CardTitle>User Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.analytics.userTiers}
                      dataKey="count"
                      nameKey="tier"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      label
                    >
                      {data.analytics.userTiers.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`hsl(${index * 137.5}, 70%, 50%)`} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Errors Tab */}
        <TabsContent value="errors" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Error Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Error Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.errors.errorTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#ef4444" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top Errors */}
            <Card>
              <CardHeader>
                <CardTitle>Top Errors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.errors.topErrors.map((error, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex-1">
                        <p className="font-medium text-sm truncate">{error.message}</p>
                        <Badge 
                          variant={error.severity === 'critical' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {error.severity}
                        </Badge>
                      </div>
                      <Badge variant="outline">{error.count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Web Vitals */}
            <Card>
              <CardHeader>
                <CardTitle>Web Vitals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>First Contentful Paint</span>
                    <Badge variant="secondary">{data.performance.webVitals.fcp.toFixed(0)}ms</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Largest Contentful Paint</span>
                    <Badge variant="secondary">{data.performance.webVitals.lcp.toFixed(0)}ms</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>First Input Delay</span>
                    <Badge variant="secondary">{data.performance.webVitals.fid.toFixed(0)}ms</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Cumulative Layout Shift</span>
                    <Badge variant="secondary">{data.performance.webVitals.cls.toFixed(3)}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Slow Queries */}
            <Card>
              <CardHeader>
                <CardTitle>Slow Queries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.performance.slowQueries.map((query, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <code className="text-sm truncate flex-1">{query.query}</code>
                      <Badge variant="outline">{query.duration.toFixed(0)}ms</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                User Activity Monitor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-gray-500">User activity monitoring will be implemented here</p>
                <p className="text-sm text-gray-400 mt-2">
                  This will show real-time user sessions, learning progress, and engagement metrics
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}