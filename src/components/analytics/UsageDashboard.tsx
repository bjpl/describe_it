'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { safeParse, safeStringify, safeParseLocalStorage, safeSetLocalStorage } from "@/lib/utils/json-safe";
import { logger } from '@/lib/logger';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
  ArcElement
);

interface UsageMetrics {
  timestamp: number;
  apiCalls: number;
  errors: number;
  avgResponseTime: number;
  activeUsers: number;
  totalCost: number;
}

interface ApiKeyMetrics {
  keyHash: string;
  keyName: string;
  requests: number;
  errors: number;
  cost: number;
  lastUsed: number;
  rateLimitHits: number;
}

interface AnomalyAlert {
  id: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  timestamp: number;
  resolved: boolean;
}

export default function UsageDashboard() {
  const [metrics, setMetrics] = useState<UsageMetrics[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeyMetrics[]>([]);
  const [alerts, setAlerts] = useState<AnomalyAlert[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Initialize WebSocket connection for real-time updates
    const initWebSocket = () => {
      const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/analytics/ws`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        logger.info('Analytics WebSocket connected');
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = safeParse(event.data);
          
          switch (data.type) {
            case 'metrics_update':
              setMetrics(prev => [...prev.slice(-99), data.payload]); // Keep last 100 points
              break;
            case 'api_keys_update':
              setApiKeys(data.payload);
              break;
            case 'alert':
              setAlerts(prev => [data.payload, ...prev.slice(0, 49)]); // Keep last 50 alerts
              break;
          }
        } catch (error) {
          logger.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        logger.info('Analytics WebSocket disconnected');
        // Attempt to reconnect after 5 seconds
        setTimeout(initWebSocket, 5000);
      };

      wsRef.current.onerror = (error) => {
        logger.error('WebSocket error:', error);
      };
    };

    initWebSocket();

    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    // Load initial data
    fetchInitialData();
  }, [selectedTimeRange]);

  const fetchInitialData = async () => {
    try {
      const response = await fetch(`/api/analytics/dashboard?timeRange=${selectedTimeRange}`);
      const data = await response.json();
      
      setMetrics(data.metrics || []);
      setApiKeys(data.apiKeys || []);
      setAlerts(data.alerts || []);
    } catch (error) {
      logger.error('Error fetching dashboard data:', error);
    }
  };

  const exportData = async (format: 'json' | 'csv') => {
    try {
      const response = await fetch(`/api/analytics/export?format=${format}&timeRange=${selectedTimeRange}`);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `analytics_${selectedTimeRange}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      logger.error('Error exporting data:', error);
    }
  };

  // Chart data preparation
  const lineChartData = {
    labels: metrics.map(m => new Date(m.timestamp).toLocaleTimeString()),
    datasets: [
      {
        label: 'API Calls',
        data: metrics.map(m => m.apiCalls),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1,
      },
      {
        label: 'Errors',
        data: metrics.map(m => m.errors),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.1,
      },
    ],
  };

  const responseTimeChartData = {
    labels: metrics.map(m => new Date(m.timestamp).toLocaleTimeString()),
    datasets: [
      {
        label: 'Avg Response Time (ms)',
        data: metrics.map(m => m.avgResponseTime),
        borderColor: 'rgb(153, 102, 255)',
        backgroundColor: 'rgba(153, 102, 255, 0.2)',
        tension: 0.1,
      },
    ],
  };

  const costChartData = {
    labels: metrics.map(m => new Date(m.timestamp).toLocaleTimeString()),
    datasets: [
      {
        label: 'Total Cost ($)',
        data: metrics.map(m => m.totalCost),
        borderColor: 'rgb(255, 206, 86)',
        backgroundColor: 'rgba(255, 206, 86, 0.2)',
        tension: 0.1,
      },
    ],
  };

  const apiKeyUsageData = {
    labels: apiKeys.map(key => key.keyName || `Key ${key.keyHash.slice(0, 8)}`),
    datasets: [
      {
        label: 'Requests',
        data: apiKeys.map(key => key.requests),
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 205, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)',
        ],
      },
    ],
  };

  const errorRateData = {
    labels: apiKeys.map(key => key.keyName || `Key ${key.keyHash.slice(0, 8)}`),
    datasets: [
      {
        label: 'Error Rate (%)',
        data: apiKeys.map(key => key.requests > 0 ? (key.errors / key.requests) * 100 : 0),
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'API Usage Analytics',
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Time',
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Count',
        },
      },
    },
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const currentMetrics = metrics.length > 0 ? metrics[metrics.length - 1] : null;
  const totalRequests = currentMetrics ? currentMetrics.apiCalls : 0;
  const totalErrors = currentMetrics ? currentMetrics.errors : 0;
  const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Usage Analytics Dashboard</h1>
          <div className="flex items-center mt-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} mr-2`}></div>
            <span className="text-sm text-gray-600">
              {isConnected ? 'Real-time connected' : 'Disconnected'}
            </span>
          </div>
        </div>
        <div className="flex space-x-4">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <button
            onClick={() => exportData('json')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Export JSON
          </button>
          <button
            onClick={() => exportData('csv')}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700">Total Requests</h3>
          <p className="text-3xl font-bold text-blue-600">{totalRequests.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700">Error Rate</h3>
          <p className="text-3xl font-bold text-red-600">{errorRate.toFixed(2)}%</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700">Avg Response Time</h3>
          <p className="text-3xl font-bold text-green-600">
            {currentMetrics ? currentMetrics.avgResponseTime.toFixed(0) : 0}ms
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700">Total Cost</h3>
          <p className="text-3xl font-bold text-purple-600">
            ${currentMetrics ? currentMetrics.totalCost.toFixed(2) : 0}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">API Calls & Errors Over Time</h3>
          <Line data={lineChartData} options={chartOptions} />
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">Response Time</h3>
          <Line data={responseTimeChartData} options={chartOptions} />
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">Cost Over Time</h3>
          <Line data={costChartData} options={chartOptions} />
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">API Key Usage</h3>
          <Doughnut data={apiKeyUsageData} />
        </div>
      </div>

      {/* API Keys Table */}
      <div className="bg-white rounded-lg shadow-md mb-8">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold">API Key Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">API Key</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requests</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Errors</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Error Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate Limit Hits</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Used</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {apiKeys.map((key) => (
                <tr key={key.keyHash}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {key.keyName || `...${key.keyHash.slice(-8)}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {key.requests.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {key.errors.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      key.requests > 0 && (key.errors / key.requests) > 0.1 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {key.requests > 0 ? ((key.errors / key.requests) * 100).toFixed(1) : 0}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${key.cost.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {key.rateLimitHits}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(key.lastUsed).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Alerts */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Recent Anomaly Alerts</h3>
        </div>
        <div className="p-6">
          {alerts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No alerts in the selected time range</p>
          ) : (
            <div className="space-y-4">
              {alerts.slice(0, 10).map((alert) => (
                <div key={alert.id} className="flex items-start space-x-4 p-4 border border-gray-200 rounded-md">
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                    {alert.severity.toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{alert.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(alert.timestamp).toLocaleString()}
                    </p>
                  </div>
                  {!alert.resolved && (
                    <button
                      onClick={() => {
                        // Handle alert resolution
                        setAlerts(prev => 
                          prev.map(a => a.id === alert.id ? { ...a, resolved: true } : a)
                        );
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}