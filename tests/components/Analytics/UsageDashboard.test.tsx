/**
 * UsageDashboard Component Tests
 * Comprehensive test suite for the Analytics UsageDashboard component
 * Tests: 35+ test cases for dashboard, charts, WebSocket, and exports
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import UsageDashboard from '@/components/analytics/UsageDashboard';
import { mockRechartsComponents } from '../Dashboard/test-utils';

// Mock Recharts
mockRechartsComponents();

// Mock WebSocket
const mockWebSocket = {
  onopen: vi.fn(),
  onmessage: vi.fn(),
  onclose: vi.fn(),
  onerror: vi.fn(),
  close: vi.fn(),
  send: vi.fn(),
};

global.WebSocket = vi.fn(() => mockWebSocket) as any;

// Mock fetch
global.fetch = vi.fn();

describe('UsageDashboard Component', () => {
  const mockMetrics = [
    {
      timestamp: Date.now(),
      apiCalls: 150,
      errors: 5,
      avgResponseTime: 245,
      activeUsers: 42,
      totalCost: 12.5,
    },
  ];

  const mockApiKeys = [
    {
      keyHash: 'abc123def456',
      keyName: 'Production API Key',
      requests: 1250,
      errors: 15,
      cost: 45.75,
      lastUsed: Date.now(),
      rateLimitHits: 3,
    },
    {
      keyHash: 'xyz789uvw012',
      keyName: 'Development API Key',
      requests: 350,
      errors: 2,
      cost: 8.25,
      lastUsed: Date.now() - 3600000,
      rateLimitHits: 0,
    },
  ];

  const mockAlerts = [
    {
      id: 'alert-1',
      severity: 'high' as const,
      message: 'High error rate detected',
      timestamp: Date.now(),
      resolved: false,
    },
    {
      id: 'alert-2',
      severity: 'medium' as const,
      message: 'Response time degradation',
      timestamp: Date.now() - 300000,
      resolved: false,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        metrics: mockMetrics,
        apiKeys: mockApiKeys,
        alerts: mockAlerts,
      }),
      blob: async () => new Blob(['test data'], { type: 'application/json' }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial Rendering', () => {
    it('should render dashboard header', () => {
      render(<UsageDashboard />);
      expect(screen.getByText('Usage Analytics Dashboard')).toBeInTheDocument();
    });

    it('should show connection status indicator', () => {
      render(<UsageDashboard />);
      expect(screen.getByText(/connected|disconnected/i)).toBeInTheDocument();
    });

    it('should render time range selector', () => {
      render(<UsageDashboard />);
      const selector = screen.getByRole('combobox');
      expect(selector).toBeInTheDocument();
    });

    it('should render export buttons', () => {
      render(<UsageDashboard />);
      expect(screen.getByText('Export JSON')).toBeInTheDocument();
      expect(screen.getByText('Export CSV')).toBeInTheDocument();
    });

    it('should have default time range of 24h', () => {
      render(<UsageDashboard />);
      const selector = screen.getByRole('combobox') as HTMLSelectElement;
      expect(selector.value).toBe('24h');
    });
  });

  describe('KPI Cards', () => {
    it('should display all four KPI cards', async () => {
      render(<UsageDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Total Requests')).toBeInTheDocument();
        expect(screen.getByText('Error Rate')).toBeInTheDocument();
        expect(screen.getByText('Avg Response Time')).toBeInTheDocument();
        expect(screen.getByText('Total Cost')).toBeInTheDocument();
      });
    });

    it('should display total requests count', async () => {
      render(<UsageDashboard />);

      await waitFor(() => {
        expect(screen.getByText('150')).toBeInTheDocument();
      });
    });

    it('should calculate and display error rate', async () => {
      render(<UsageDashboard />);

      await waitFor(() => {
        const errorRate = (5 / 150) * 100;
        expect(screen.getByText(new RegExp(errorRate.toFixed(2)))).toBeInTheDocument();
      });
    });

    it('should display average response time in ms', async () => {
      render(<UsageDashboard />);

      await waitFor(() => {
        expect(screen.getByText('245ms')).toBeInTheDocument();
      });
    });

    it('should display total cost with currency symbol', async () => {
      render(<UsageDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/\$12\.50/)).toBeInTheDocument();
      });
    });

    it('should handle zero metrics gracefully', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ metrics: [], apiKeys: [], alerts: [] }),
      });

      render(<UsageDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Total Requests')).toBeInTheDocument();
        expect(screen.getByText('0')).toBeInTheDocument();
      });
    });
  });

  describe('Charts Rendering', () => {
    it('should render API calls and errors line chart', async () => {
      const { container } = render(<UsageDashboard />);

      await waitFor(() => {
        expect(container.querySelector('[data-testid="line-chart"]')).toBeInTheDocument();
      });
    });

    it('should render response time chart', async () => {
      const { container } = render(<UsageDashboard />);

      await waitFor(() => {
        const charts = container.querySelectorAll('[data-testid="line-chart"]');
        expect(charts.length).toBeGreaterThan(1);
      });
    });

    it('should render cost over time chart', async () => {
      const { container } = render(<UsageDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Cost Over Time')).toBeInTheDocument();
      });
    });

    it('should render API key usage doughnut chart', async () => {
      const { container } = render(<UsageDashboard />);

      await waitFor(() => {
        expect(container.querySelector('[data-testid="pie-chart"]')).toBeInTheDocument();
      });
    });

    it('should display chart titles', async () => {
      render(<UsageDashboard />);

      await waitFor(() => {
        expect(screen.getByText('API Calls & Errors Over Time')).toBeInTheDocument();
        expect(screen.getByText('Response Time')).toBeInTheDocument();
        expect(screen.getByText('API Key Usage')).toBeInTheDocument();
      });
    });
  });

  describe('API Keys Table', () => {
    it('should render API keys performance table', async () => {
      render(<UsageDashboard />);

      await waitFor(() => {
        expect(screen.getByText('API Key Performance')).toBeInTheDocument();
      });
    });

    it('should display table headers', async () => {
      render(<UsageDashboard />);

      await waitFor(() => {
        expect(screen.getByText('API Key')).toBeInTheDocument();
        expect(screen.getByText('Requests')).toBeInTheDocument();
        expect(screen.getByText('Errors')).toBeInTheDocument();
        expect(screen.getByText('Error Rate')).toBeInTheDocument();
        expect(screen.getByText('Cost')).toBeInTheDocument();
        expect(screen.getByText('Rate Limit Hits')).toBeInTheDocument();
      });
    });

    it('should display all API keys', async () => {
      render(<UsageDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Production API Key')).toBeInTheDocument();
        expect(screen.getByText('Development API Key')).toBeInTheDocument();
      });
    });

    it('should format large numbers with locale separators', async () => {
      render(<UsageDashboard />);

      await waitFor(() => {
        expect(screen.getByText('1,250')).toBeInTheDocument();
      });
    });

    it('should calculate error rate per key', async () => {
      render(<UsageDashboard />);

      await waitFor(() => {
        const errorRate = (15 / 1250) * 100;
        expect(screen.getByText(new RegExp(errorRate.toFixed(1)))).toBeInTheDocument();
      });
    });

    it('should color-code error rates', async () => {
      const { container } = render(<UsageDashboard />);

      await waitFor(() => {
        const errorRateBadges = container.querySelectorAll('.rounded-full');
        expect(errorRateBadges.length).toBeGreaterThan(0);
      });
    });

    it('should display cost with 2 decimal places', async () => {
      render(<UsageDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/\$45\.75/)).toBeInTheDocument();
        expect(screen.getByText(/\$8\.25/)).toBeInTheDocument();
      });
    });

    it('should show rate limit hits count', async () => {
      render(<UsageDashboard />);

      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument();
      });
    });
  });

  describe('Alerts Section', () => {
    it('should render alerts section', async () => {
      render(<UsageDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Recent Anomaly Alerts')).toBeInTheDocument();
      });
    });

    it('should display all unresolved alerts', async () => {
      render(<UsageDashboard />);

      await waitFor(() => {
        expect(screen.getByText('High error rate detected')).toBeInTheDocument();
        expect(screen.getByText('Response time degradation')).toBeInTheDocument();
      });
    });

    it('should show severity badges', async () => {
      render(<UsageDashboard />);

      await waitFor(() => {
        expect(screen.getByText('HIGH')).toBeInTheDocument();
        expect(screen.getByText('MEDIUM')).toBeInTheDocument();
      });
    });

    it('should color-code severity levels', async () => {
      const { container } = render(<UsageDashboard />);

      await waitFor(() => {
        const highSeverity = screen.getByText('HIGH').closest('div');
        expect(highSeverity).toHaveClass(/red/i);
      });
    });

    it('should display alert timestamps', async () => {
      render(<UsageDashboard />);

      await waitFor(() => {
        const dateElements = container.querySelectorAll('.text-xs.text-gray-500');
        expect(dateElements.length).toBeGreaterThan(0);
      });
    });

    it('should show resolve button for unresolved alerts', async () => {
      render(<UsageDashboard />);

      await waitFor(() => {
        const resolveButtons = screen.getAllByText('Resolve');
        expect(resolveButtons.length).toBe(2);
      });
    });

    it('should hide resolve button for resolved alerts', async () => {
      const resolvedAlerts = [
        { ...mockAlerts[0], resolved: true },
      ];

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          metrics: mockMetrics,
          apiKeys: mockApiKeys,
          alerts: resolvedAlerts,
        }),
      });

      render(<UsageDashboard />);

      await waitFor(() => {
        expect(screen.queryByText('Resolve')).not.toBeInTheDocument();
      });
    });

    it('should show empty state when no alerts', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          metrics: mockMetrics,
          apiKeys: mockApiKeys,
          alerts: [],
        }),
      });

      render(<UsageDashboard />);

      await waitFor(() => {
        expect(screen.getByText('No alerts in the selected time range')).toBeInTheDocument();
      });
    });
  });

  describe('WebSocket Connection', () => {
    it('should initialize WebSocket connection', () => {
      render(<UsageDashboard />);
      expect(global.WebSocket).toHaveBeenCalled();
    });

    it('should show connected status when WebSocket opens', async () => {
      render(<UsageDashboard />);

      // Simulate WebSocket connection
      if (mockWebSocket.onopen) {
        mockWebSocket.onopen({} as Event);
      }

      await waitFor(() => {
        expect(screen.getByText('Real-time connected')).toBeInTheDocument();
      });
    });

    it('should show disconnected status initially', () => {
      render(<UsageDashboard />);
      expect(screen.getByText('Disconnected')).toBeInTheDocument();
    });

    it('should handle WebSocket message for metrics update', async () => {
      render(<UsageDashboard />);

      const newMetric = {
        type: 'metrics_update',
        payload: {
          timestamp: Date.now(),
          apiCalls: 200,
          errors: 3,
          avgResponseTime: 180,
          activeUsers: 50,
          totalCost: 15.0,
        },
      };

      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage({ data: JSON.stringify(newMetric) } as MessageEvent);
      }

      await waitFor(() => {
        expect(screen.getByText('200')).toBeInTheDocument();
      });
    });

    it('should close WebSocket on component unmount', () => {
      const { unmount } = render(<UsageDashboard />);
      unmount();
      expect(mockWebSocket.close).toHaveBeenCalled();
    });
  });

  describe('Time Range Selection', () => {
    it('should change time range when selector is updated', async () => {
      render(<UsageDashboard />);

      const selector = screen.getByRole('combobox') as HTMLSelectElement;
      fireEvent.change(selector, { target: { value: '7d' } });

      await waitFor(() => {
        expect(selector.value).toBe('7d');
      });
    });

    it('should fetch new data when time range changes', async () => {
      render(<UsageDashboard />);

      const selector = screen.getByRole('combobox');
      fireEvent.change(selector, { target: { value: '30d' } });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('timeRange=30d')
        );
      });
    });

    it('should have all time range options', () => {
      render(<UsageDashboard />);

      expect(screen.getByText('Last Hour')).toBeInTheDocument();
      expect(screen.getByText('Last 24 Hours')).toBeInTheDocument();
      expect(screen.getByText('Last 7 Days')).toBeInTheDocument();
      expect(screen.getByText('Last 30 Days')).toBeInTheDocument();
    });
  });

  describe('Export Functionality', () => {
    it('should export JSON when JSON button clicked', async () => {
      const createElementSpy = vi.spyOn(document, 'createElement');
      render(<UsageDashboard />);

      const exportButton = screen.getByText('Export JSON');
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('format=json')
        );
      });

      createElementSpy.mockRestore();
    });

    it('should export CSV when CSV button clicked', async () => {
      const createElementSpy = vi.spyOn(document, 'createElement');
      render(<UsageDashboard />);

      const exportButton = screen.getByText('Export CSV');
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('format=csv')
        );
      });

      createElementSpy.mockRestore();
    });

    it('should include time range in export request', async () => {
      render(<UsageDashboard />);

      const selector = screen.getByRole('combobox');
      fireEvent.change(selector, { target: { value: '7d' } });

      await waitFor(() => {
        const exportButton = screen.getByText('Export JSON');
        fireEvent.click(exportButton);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('timeRange=7d')
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle fetch errors gracefully', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      render(<UsageDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Total Requests')).toBeInTheDocument();
      });
    });

    it('should handle WebSocket errors', () => {
      render(<UsageDashboard />);

      if (mockWebSocket.onerror) {
        mockWebSocket.onerror(new Event('error'));
      }

      expect(screen.getByText('Disconnected')).toBeInTheDocument();
    });

    it('should handle malformed WebSocket messages', async () => {
      render(<UsageDashboard />);

      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage({ data: 'invalid json' } as MessageEvent);
      }

      // Should not crash
      expect(screen.getByText('Usage Analytics Dashboard')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible labels for interactive elements', () => {
      render(<UsageDashboard />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button.textContent?.trim().length).toBeGreaterThan(0);
      });
    });

    it('should have proper semantic HTML structure', () => {
      const { container } = render(<UsageDashboard />);

      expect(container.querySelector('h1')).toBeInTheDocument();
      expect(container.querySelector('h3')).toBeInTheDocument();
      expect(container.querySelector('table')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render within acceptable time', async () => {
      const startTime = performance.now();

      render(<UsageDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Total Requests')).toBeInTheDocument();
      });

      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(2000);
    });

    it('should limit event queue size', async () => {
      render(<UsageDashboard />);

      // Simulate 150 metric updates
      for (let i = 0; i < 150; i++) {
        if (mockWebSocket.onmessage) {
          mockWebSocket.onmessage({
            data: JSON.stringify({
              type: 'metrics_update',
              payload: { ...mockMetrics[0], timestamp: Date.now() + i },
            }),
          } as MessageEvent);
        }
      }

      // Component should handle this without crashing
      expect(screen.getByText('Usage Analytics Dashboard')).toBeInTheDocument();
    });
  });
});
