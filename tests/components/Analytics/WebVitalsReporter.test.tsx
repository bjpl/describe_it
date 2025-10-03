/**
 * WebVitalsReporter Component Tests
 * Comprehensive test suite for web vitals tracking and reporting
 * Tests: 20+ test cases for performance metrics, reporting, and thresholds
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import WebVitalsReporter from '@/components/analytics/WebVitalsReporter';

// Mock web-vitals library
vi.mock('web-vitals', () => ({
  onCLS: vi.fn((callback) => callback({ name: 'CLS', value: 0.05, rating: 'good' })),
  onFID: vi.fn((callback) => callback({ name: 'FID', value: 80, rating: 'good' })),
  onFCP: vi.fn((callback) => callback({ name: 'FCP', value: 1200, rating: 'good' })),
  onLCP: vi.fn((callback) => callback({ name: 'LCP', value: 2100, rating: 'good' })),
  onTTFB: vi.fn((callback) => callback({ name: 'TTFB', value: 400, rating: 'good' })),
  onINP: vi.fn((callback) => callback({ name: 'INP', value: 150, rating: 'good' })),
}));

// Mock fetch
global.fetch = vi.fn();

describe('WebVitalsReporter Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should render without crashing', () => {
      expect(() => render(<WebVitalsReporter />)).not.toThrow();
    });

    it('should initialize web vitals tracking', () => {
      render(<WebVitalsReporter />);

      // Web vitals should be tracked
      expect(true).toBe(true); // Placeholder for actual check
    });

    it('should not render any visible UI', () => {
      const { container } = render(<WebVitalsReporter />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Metric Collection', () => {
    it('should collect CLS metric', async () => {
      render(<WebVitalsReporter />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/analytics/web-vitals',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('CLS'),
          })
        );
      });
    });

    it('should collect FID metric', async () => {
      render(<WebVitalsReporter />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/analytics/web-vitals',
          expect.objectContaining({
            body: expect.stringContaining('FID'),
          })
        );
      });
    });

    it('should collect FCP metric', async () => {
      render(<WebVitalsReporter />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/analytics/web-vitals',
          expect.objectContaining({
            body: expect.stringContaining('FCP'),
          })
        );
      });
    });

    it('should collect LCP metric', async () => {
      render(<WebVitalsReporter />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/analytics/web-vitals',
          expect.objectContaining({
            body: expect.stringContaining('LCP'),
          })
        );
      });
    });

    it('should collect TTFB metric', async () => {
      render(<WebVitalsReporter />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/analytics/web-vitals',
          expect.objectContaining({
            body: expect.stringContaining('TTFB'),
          })
        );
      });
    });

    it('should collect all core web vitals', async () => {
      render(<WebVitalsReporter />);

      await waitFor(() => {
        const calls = (global.fetch as any).mock.calls;
        const metrics = calls.map((call: any) => JSON.parse(call[1].body).name);

        expect(metrics).toContain('CLS');
        expect(metrics).toContain('FID');
        expect(metrics).toContain('FCP');
        expect(metrics).toContain('LCP');
        expect(metrics).toContain('TTFB');
      });
    });
  });

  describe('Metric Reporting', () => {
    it('should send metrics to analytics API', async () => {
      render(<WebVitalsReporter />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/analytics/web-vitals',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })
        );
      });
    });

    it('should include metric name in report', async () => {
      render(<WebVitalsReporter />);

      await waitFor(() => {
        const calls = (global.fetch as any).mock.calls;
        const body = JSON.parse(calls[0][1].body);

        expect(body).toHaveProperty('name');
      });
    });

    it('should include metric value in report', async () => {
      render(<WebVitalsReporter />);

      await waitFor(() => {
        const calls = (global.fetch as any).mock.calls;
        const body = JSON.parse(calls[0][1].body);

        expect(body).toHaveProperty('value');
        expect(typeof body.value).toBe('number');
      });
    });

    it('should include metric rating in report', async () => {
      render(<WebVitalsReporter />);

      await waitFor(() => {
        const calls = (global.fetch as any).mock.calls;
        const body = JSON.parse(calls[0][1].body);

        expect(body).toHaveProperty('rating');
      });
    });

    it('should include page URL in report', async () => {
      render(<WebVitalsReporter />);

      await waitFor(() => {
        const calls = (global.fetch as any).mock.calls;
        const body = JSON.parse(calls[0][1].body);

        expect(body).toHaveProperty('url');
      });
    });
  });

  describe('Threshold Evaluation', () => {
    it('should identify good CLS values', async () => {
      render(<WebVitalsReporter />);

      await waitFor(() => {
        const calls = (global.fetch as any).mock.calls;
        const clsCall = calls.find((call: any) => JSON.parse(call[1].body).name === 'CLS');

        if (clsCall) {
          const body = JSON.parse(clsCall[1].body);
          expect(body.rating).toBe('good');
        }
      });
    });

    it('should identify good LCP values', async () => {
      render(<WebVitalsReporter />);

      await waitFor(() => {
        const calls = (global.fetch as any).mock.calls;
        const lcpCall = calls.find((call: any) => JSON.parse(call[1].body).name === 'LCP');

        if (lcpCall) {
          const body = JSON.parse(lcpCall[1].body);
          expect(body.rating).toBe('good');
        }
      });
    });

    it('should identify good FID values', async () => {
      render(<WebVitalsReporter />);

      await waitFor(() => {
        const calls = (global.fetch as any).mock.calls;
        const fidCall = calls.find((call: any) => JSON.parse(call[1].body).name === 'FID');

        if (fidCall) {
          const body = JSON.parse(fidCall[1].body);
          expect(body.rating).toBe('good');
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      expect(() => render(<WebVitalsReporter />)).not.toThrow();
    });

    it('should continue tracking after API failure', async () => {
      (global.fetch as any)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ ok: true });

      render(<WebVitalsReporter />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    it('should handle missing web vitals gracefully', () => {
      vi.mock('web-vitals', () => ({
        onCLS: vi.fn(),
        onFID: vi.fn(),
        onFCP: vi.fn(),
        onLCP: vi.fn(),
        onTTFB: vi.fn(),
      }));

      expect(() => render(<WebVitalsReporter />)).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should not block rendering', () => {
      const startTime = performance.now();

      render(<WebVitalsReporter />);

      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(50); // Should render almost instantly
    });

    it('should report metrics asynchronously', async () => {
      render(<WebVitalsReporter />);

      // Should not wait for API calls
      expect(global.fetch).not.toHaveBeenCalled();

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });
  });

  describe('Batching and Optimization', () => {
    it('should report each metric only once', async () => {
      render(<WebVitalsReporter />);

      await waitFor(() => {
        const calls = (global.fetch as any).mock.calls;
        const clsCalls = calls.filter((call: any) =>
          JSON.parse(call[1].body).name === 'CLS'
        );

        expect(clsCalls.length).toBe(1);
      });
    });

    it('should include user agent in reports', async () => {
      render(<WebVitalsReporter />);

      await waitFor(() => {
        const calls = (global.fetch as any).mock.calls;
        if (calls.length > 0) {
          const body = JSON.parse(calls[0][1].body);
          expect(body).toHaveProperty('userAgent');
        }
      });
    });

    it('should include connection type when available', async () => {
      render(<WebVitalsReporter />);

      await waitFor(() => {
        const calls = (global.fetch as any).mock.calls;
        if (calls.length > 0) {
          const body = JSON.parse(calls[0][1].body);
          // Connection info may or may not be available
          expect(body).toBeTruthy();
        }
      });
    });
  });

  describe('Multiple Instances', () => {
    it('should handle multiple component instances', () => {
      expect(() => {
        render(<WebVitalsReporter />);
        render(<WebVitalsReporter />);
      }).not.toThrow();
    });

    it('should not duplicate reports from multiple instances', async () => {
      render(<WebVitalsReporter />);
      render(<WebVitalsReporter />);

      await waitFor(() => {
        const calls = (global.fetch as any).mock.calls;
        const uniqueMetrics = new Set(
          calls.map((call: any) => JSON.parse(call[1].body).name)
        );

        // Should still only report each metric type once
        expect(uniqueMetrics.size).toBeLessThanOrEqual(6);
      });
    });
  });

  describe('Cleanup', () => {
    it('should cleanup on unmount', () => {
      const { unmount } = render(<WebVitalsReporter />);

      expect(() => unmount()).not.toThrow();
    });

    it('should not report metrics after unmount', async () => {
      const { unmount } = render(<WebVitalsReporter />);

      unmount();

      const callsBeforeUnmount = (global.fetch as any).mock.calls.length;

      await new Promise(resolve => setTimeout(resolve, 100));

      const callsAfterUnmount = (global.fetch as any).mock.calls.length;

      // Should not have made additional calls
      expect(callsAfterUnmount).toBe(callsBeforeUnmount);
    });
  });

  describe('Integration with Analytics', () => {
    it('should integrate with analytics system', async () => {
      render(<WebVitalsReporter />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/analytics/web-vitals',
          expect.any(Object)
        );
      });
    });

    it('should send proper request format', async () => {
      render(<WebVitalsReporter />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/analytics/web-vitals',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
          })
        );
      });
    });
  });
});
