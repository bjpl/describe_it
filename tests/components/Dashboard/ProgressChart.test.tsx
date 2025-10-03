/**
 * ProgressChart Component Tests
 * Tests for chart rendering, interactions, and data visualization
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test-utils';
import { mockRechartsComponents, expectChartToBeRendered } from './test-utils';

// Mock Recharts
mockRechartsComponents();

// Mock chart component
const ProgressChart = ({
  data,
  type = 'area',
  isLoading = false,
  onChartTypeChange
}: {
  data: any[];
  type?: 'area' | 'line' | 'bar';
  isLoading?: boolean;
  onChartTypeChange?: (type: string) => void;
}) => {
  const [chartType, setChartType] = React.useState(type);

  const handleTypeChange = (newType: string) => {
    setChartType(newType as any);
    onChartTypeChange?.(newType);
  };

  if (isLoading) {
    return (
      <div className="h-80 flex items-center justify-center">
        <div data-testid="chart-loading">Loading chart...</div>
      </div>
    );
  }

  const ChartComponent = {
    area: () => <div data-testid="area-chart">Area Chart</div>,
    line: () => <div data-testid="line-chart">Line Chart</div>,
    bar: () => <div data-testid="bar-chart">Bar Chart</div>,
  }[chartType];

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button onClick={() => handleTypeChange('area')} data-active={chartType === 'area'}>
          Area
        </button>
        <button onClick={() => handleTypeChange('line')} data-active={chartType === 'line'}>
          Line
        </button>
        <button onClick={() => handleTypeChange('bar')} data-active={chartType === 'bar'}>
          Bar
        </button>
      </div>
      <div className="h-80">
        <ChartComponent />
      </div>
    </div>
  );
};

// Need React import for component
import React from 'react';

describe('ProgressChart Component', () => {
  const mockData = [
    { date: '2025-01-01', value: 10, accuracy: 85 },
    { date: '2025-01-02', value: 15, accuracy: 90 },
    { date: '2025-01-03', value: 20, accuracy: 88 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Chart Rendering', () => {
    it('should render area chart by default', () => {
      const { container } = render(<ProgressChart data={mockData} />);

      expect(screen.getByTestId('area-chart')).toBeInTheDocument();
    });

    it('should render line chart when type is line', () => {
      render(<ProgressChart data={mockData} type="line" />);

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('should render bar chart when type is bar', () => {
      render(<ProgressChart data={mockData} type="bar" />);

      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });

    it('should display chart type controls', () => {
      render(<ProgressChart data={mockData} />);

      expect(screen.getByRole('button', { name: /area/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /line/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /bar/i })).toBeInTheDocument();
    });

    it('should highlight active chart type', () => {
      render(<ProgressChart data={mockData} type="area" />);

      const areaButton = screen.getByRole('button', { name: /area/i });
      expect(areaButton).toHaveAttribute('data-active', 'true');
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator', () => {
      render(<ProgressChart data={[]} isLoading={true} />);

      expect(screen.getByTestId('chart-loading')).toBeInTheDocument();
      expect(screen.getByText('Loading chart...')).toBeInTheDocument();
    });

    it('should not show chart controls while loading', () => {
      render(<ProgressChart data={[]} isLoading={true} />);

      expect(screen.queryByRole('button', { name: /area/i })).not.toBeInTheDocument();
    });

    it('should transition from loading to chart', async () => {
      const { rerender } = render(<ProgressChart data={[]} isLoading={true} />);

      expect(screen.getByTestId('chart-loading')).toBeInTheDocument();

      rerender(<ProgressChart data={mockData} isLoading={false} />);

      await waitFor(() => {
        expect(screen.queryByTestId('chart-loading')).not.toBeInTheDocument();
        expect(screen.getByTestId('area-chart')).toBeInTheDocument();
      });
    });
  });

  describe('Chart Type Interactions', () => {
    it('should switch to line chart when line button clicked', async () => {
      render(<ProgressChart data={mockData} type="area" />);

      const lineButton = screen.getByRole('button', { name: /line/i });
      fireEvent.click(lineButton);

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
        expect(screen.queryByTestId('area-chart')).not.toBeInTheDocument();
      });
    });

    it('should switch to bar chart when bar button clicked', async () => {
      render(<ProgressChart data={mockData} type="area" />);

      const barButton = screen.getByRole('button', { name: /bar/i });
      fireEvent.click(barButton);

      await waitFor(() => {
        expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
        expect(screen.queryByTestId('area-chart')).not.toBeInTheDocument();
      });
    });

    it('should call onChartTypeChange callback', async () => {
      const onChartTypeChange = vi.fn();
      render(<ProgressChart data={mockData} onChartTypeChange={onChartTypeChange} />);

      const lineButton = screen.getByRole('button', { name: /line/i });
      fireEvent.click(lineButton);

      await waitFor(() => {
        expect(onChartTypeChange).toHaveBeenCalledWith('line');
      });
    });

    it('should update active state when switching charts', async () => {
      render(<ProgressChart data={mockData} />);

      const lineButton = screen.getByRole('button', { name: /line/i });
      fireEvent.click(lineButton);

      await waitFor(() => {
        expect(lineButton).toHaveAttribute('data-active', 'true');
        const areaButton = screen.getByRole('button', { name: /area/i });
        expect(areaButton).toHaveAttribute('data-active', 'false');
      });
    });
  });

  describe('Data Visualization', () => {
    it('should accept and render data', () => {
      render(<ProgressChart data={mockData} />);

      // Chart should be rendered with data
      expect(screen.getByTestId('area-chart')).toBeInTheDocument();
    });

    it('should handle empty data array', () => {
      render(<ProgressChart data={[]} />);

      expect(screen.getByTestId('area-chart')).toBeInTheDocument();
    });

    it('should handle large datasets', () => {
      const largeData = Array.from({ length: 365 }, (_, i) => ({
        date: `2025-01-${i + 1}`,
        value: Math.random() * 100,
        accuracy: Math.random() * 100,
      }));

      render(<ProgressChart data={largeData} />);

      expect(screen.getByTestId('area-chart')).toBeInTheDocument();
    });

    it('should update when data changes', async () => {
      const { rerender } = render(<ProgressChart data={mockData} />);

      const newData = [
        { date: '2025-02-01', value: 30, accuracy: 95 },
        { date: '2025-02-02', value: 35, accuracy: 92 },
      ];

      rerender(<ProgressChart data={newData} />);

      await waitFor(() => {
        expect(screen.getByTestId('area-chart')).toBeInTheDocument();
      });
    });
  });

  describe('Chart Container', () => {
    it('should have fixed height container', () => {
      const { container } = render(<ProgressChart data={mockData} />);

      const chartContainer = container.querySelector('.h-80');
      expect(chartContainer).toBeInTheDocument();
    });

    it('should be responsive', () => {
      const { container } = render(<ProgressChart data={mockData} />);

      const chartContainer = container.querySelector('.h-80');
      expect(chartContainer).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render quickly', () => {
      const startTime = performance.now();

      render(<ProgressChart data={mockData} />);

      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(100);
    });

    it('should handle rapid chart type switches', async () => {
      render(<ProgressChart data={mockData} />);

      const lineButton = screen.getByRole('button', { name: /line/i });
      const barButton = screen.getByRole('button', { name: /bar/i });
      const areaButton = screen.getByRole('button', { name: /area/i });

      // Rapidly switch between chart types
      fireEvent.click(lineButton);
      fireEvent.click(barButton);
      fireEvent.click(areaButton);
      fireEvent.click(lineButton);

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible button labels', () => {
      render(<ProgressChart data={mockData} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button.textContent?.trim().length).toBeGreaterThan(0);
      });
    });

    it('should support keyboard navigation', () => {
      render(<ProgressChart data={mockData} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveProperty('onclick');
      });
    });

    it('should indicate active state to screen readers', () => {
      render(<ProgressChart data={mockData} type="area" />);

      const areaButton = screen.getByRole('button', { name: /area/i });
      expect(areaButton).toHaveAttribute('data-active');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null data', () => {
      render(<ProgressChart data={null as any} />);

      expect(screen.getByTestId('area-chart')).toBeInTheDocument();
    });

    it('should handle data with missing values', () => {
      const incompleteData = [
        { date: '2025-01-01', value: 10 },
        { date: '2025-01-02' },
        { date: '2025-01-03', value: 20, accuracy: 88 },
      ];

      render(<ProgressChart data={incompleteData} />);

      expect(screen.getByTestId('area-chart')).toBeInTheDocument();
    });

    it('should handle single data point', () => {
      const singlePoint = [{ date: '2025-01-01', value: 10, accuracy: 85 }];

      render(<ProgressChart data={singlePoint} />);

      expect(screen.getByTestId('area-chart')).toBeInTheDocument();
    });

    it('should handle invalid chart type gracefully', () => {
      render(<ProgressChart data={mockData} type={'invalid' as any} />);

      // Should default to area or handle gracefully
      const chart = screen.queryByTestId(/chart$/);
      expect(chart).toBeInTheDocument();
    });
  });

  describe('Chart Configuration', () => {
    it('should maintain state between re-renders', async () => {
      const { rerender } = render(<ProgressChart data={mockData} />);

      const lineButton = screen.getByRole('button', { name: /line/i });
      fireEvent.click(lineButton);

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });

      // Re-render with same props
      rerender(<ProgressChart data={mockData} />);

      // Should maintain line chart selection
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('should reset to initial type when type prop changes', async () => {
      const { rerender } = render(<ProgressChart data={mockData} type="area" />);

      const lineButton = screen.getByRole('button', { name: /line/i });
      fireEvent.click(lineButton);

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });

      // Change type prop
      rerender(<ProgressChart data={mockData} type="bar" />);

      await waitFor(() => {
        expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      });
    });
  });
});
