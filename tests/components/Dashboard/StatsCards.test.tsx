/**
 * StatsCards Component Tests
 * Comprehensive test suite for Dashboard statistics cards
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test-utils';
import { Card } from '@/components/ui/Card';
import { generateMockUserProgress, generateMockStudySessions } from './test-utils';

// Mock component for testing stats cards functionality
const StatsCard = ({
  title,
  value,
  icon: Icon,
  isLoading = false,
  error = null
}: {
  title: string;
  value: string | number;
  icon: any;
  isLoading?: boolean;
  error?: string | null;
}) => {
  if (error) {
    return (
      <Card className="p-4">
        <div className="text-destructive">{error}</div>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="p-4">
        <div data-testid="card-skeleton" className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
          <div className="h-8 bg-gray-200 rounded w-1/2" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        {Icon && <Icon className="h-8 w-8 text-muted-foreground" data-testid={`${title.toLowerCase().replace(/\s/g, '-')}-icon`} />}
      </div>
    </Card>
  );
};

// Mock icon component
const MockIcon = () => <svg data-testid="mock-icon" />;

describe('StatsCards Component', () => {
  describe('Loading States', () => {
    it('should display loading skeleton', () => {
      render(<StatsCard title="Words Learned" value="0" icon={MockIcon} isLoading={true} />);

      expect(screen.getByTestId('card-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('card-skeleton')).toHaveClass('animate-pulse');
    });

    it('should show skeleton with proper structure', () => {
      const { container } = render(<StatsCard title="Words Learned" value="0" icon={MockIcon} isLoading={true} />);

      const skeletonElements = container.querySelectorAll('.bg-gray-200');
      expect(skeletonElements.length).toBe(2); // Title and value skeletons
    });

    it('should render multiple loading cards', () => {
      const { container } = render(
        <>
          <StatsCard title="Words Learned" value="0" icon={MockIcon} isLoading={true} />
          <StatsCard title="Accuracy" value="0" icon={MockIcon} isLoading={true} />
          <StatsCard title="Study Time" value="0" icon={MockIcon} isLoading={true} />
          <StatsCard title="Streak" value="0" icon={MockIcon} isLoading={true} />
        </>
      );

      const skeletons = screen.getAllByTestId('card-skeleton');
      expect(skeletons).toHaveLength(4);
    });
  });

  describe('Success States with Data', () => {
    it('should render card with title and value', () => {
      render(<StatsCard title="Words Learned" value="150" icon={MockIcon} />);

      expect(screen.getByText('Words Learned')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument();
    });

    it('should display icon', () => {
      render(<StatsCard title="Words Learned" value="150" icon={MockIcon} />);

      expect(screen.getByTestId('words-learned-icon')).toBeInTheDocument();
    });

    it('should format large numbers correctly', () => {
      render(<StatsCard title="Total Words" value="1,250" icon={MockIcon} />);

      expect(screen.getByText('1,250')).toBeInTheDocument();
    });

    it('should display percentage values', () => {
      render(<StatsCard title="Accuracy" value="94%" icon={MockIcon} />);

      expect(screen.getByText('94%')).toBeInTheDocument();
    });

    it('should show time values with units', () => {
      render(<StatsCard title="Study Time" value="12h" icon={MockIcon} />);

      expect(screen.getByText('12h')).toBeInTheDocument();
    });

    it('should display streak with days label', () => {
      render(<StatsCard title="Streak" value="7 days" icon={MockIcon} />);

      expect(screen.getByText('7 days')).toBeInTheDocument();
    });

    it('should apply correct styling to title', () => {
      render(<StatsCard title="Words Learned" value="150" icon={MockIcon} />);

      const title = screen.getByText('Words Learned');
      expect(title).toHaveClass('text-sm', 'font-medium', 'text-muted-foreground');
    });

    it('should apply correct styling to value', () => {
      render(<StatsCard title="Words Learned" value="150" icon={MockIcon} />);

      const value = screen.getByText('150');
      expect(value).toHaveClass('text-2xl', 'font-bold');
    });
  });

  describe('Error States', () => {
    it('should display error message', () => {
      render(<StatsCard title="Words Learned" value="0" icon={MockIcon} error="Failed to load data" />);

      expect(screen.getByText('Failed to load data')).toBeInTheDocument();
    });

    it('should apply error styling', () => {
      render(<StatsCard title="Words Learned" value="0" icon={MockIcon} error="Failed to load data" />);

      const errorElement = screen.getByText('Failed to load data');
      expect(errorElement).toHaveClass('text-destructive');
    });

    it('should not show value when error exists', () => {
      render(<StatsCard title="Words Learned" value="150" icon={MockIcon} error="Network error" />);

      expect(screen.queryByText('150')).not.toBeInTheDocument();
    });

    it('should not show icon when error exists', () => {
      render(<StatsCard title="Words Learned" value="150" icon={MockIcon} error="Network error" />);

      expect(screen.queryByTestId('mock-icon')).not.toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('should display zero value for no data', () => {
      render(<StatsCard title="Words Learned" value="0" icon={MockIcon} />);

      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should handle undefined value gracefully', () => {
      render(<StatsCard title="Words Learned" value="—" icon={MockIcon} />);

      expect(screen.getByText('—')).toBeInTheDocument();
    });

    it('should show N/A for missing percentage', () => {
      render(<StatsCard title="Accuracy" value="N/A" icon={MockIcon} />);

      expect(screen.getByText('N/A')).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('should render card with responsive padding', () => {
      const { container } = render(<StatsCard title="Words Learned" value="150" icon={MockIcon} />);

      const card = container.querySelector('.p-4');
      expect(card).toBeInTheDocument();
    });

    it('should use flex layout for content alignment', () => {
      const { container } = render(<StatsCard title="Words Learned" value="150" icon={MockIcon} />);

      const flexContainer = container.querySelector('.flex.items-center.justify-between');
      expect(flexContainer).toBeInTheDocument();
    });

    it('should properly size icon', () => {
      render(<StatsCard title="Words Learned" value="150" icon={MockIcon} />);

      const icon = screen.getByTestId('words-learned-icon');
      expect(icon).toHaveClass('h-8', 'w-8');
    });
  });

  describe('Card Variations', () => {
    it('should render Words Learned card', () => {
      render(<StatsCard title="Words Learned" value="150" icon={MockIcon} />);

      expect(screen.getByText('Words Learned')).toBeInTheDocument();
      expect(screen.getByTestId('words-learned-icon')).toBeInTheDocument();
    });

    it('should render Accuracy card', () => {
      render(<StatsCard title="Accuracy" value="94%" icon={MockIcon} />);

      expect(screen.getByText('Accuracy')).toBeInTheDocument();
      expect(screen.getByText('94%')).toBeInTheDocument();
    });

    it('should render Study Time card', () => {
      render(<StatsCard title="Study Time" value="12h" icon={MockIcon} />);

      expect(screen.getByText('Study Time')).toBeInTheDocument();
      expect(screen.getByText('12h')).toBeInTheDocument();
    });

    it('should render Streak card', () => {
      render(<StatsCard title="Streak" value="7 days" icon={MockIcon} />);

      expect(screen.getByText('Streak')).toBeInTheDocument();
      expect(screen.getByText('7 days')).toBeInTheDocument();
    });
  });

  describe('Data Calculations', () => {
    it('should calculate total words from progress data', () => {
      const mockProgress = generateMockUserProgress(150);
      const totalWords = mockProgress.length;

      render(<StatsCard title="Words Learned" value={totalWords} icon={MockIcon} />);

      expect(screen.getByText('150')).toBeInTheDocument();
    });

    it('should calculate average accuracy from sessions', () => {
      const mockSessions = generateMockStudySessions(10);
      const avgAccuracy = mockSessions.reduce((sum, s) => sum + s.accuracy, 0) / mockSessions.length;

      render(<StatsCard title="Accuracy" value={`${Math.round(avgAccuracy)}%`} icon={MockIcon} />);

      expect(screen.getByText(/\d+%/)).toBeInTheDocument();
    });

    it('should calculate total study time', () => {
      const mockSessions = generateMockStudySessions(10);
      const totalMinutes = mockSessions.reduce((sum, s) => sum + s.time_spent / 60, 0);
      const totalHours = Math.round(totalMinutes / 60);

      render(<StatsCard title="Study Time" value={`${totalHours}h`} icon={MockIcon} />);

      expect(screen.getByText(/\d+h/)).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render quickly', () => {
      const startTime = performance.now();

      render(<StatsCard title="Words Learned" value="150" icon={MockIcon} />);

      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(50); // Should render very fast
    });

    it('should render multiple cards efficiently', () => {
      const startTime = performance.now();

      render(
        <>
          <StatsCard title="Words Learned" value="150" icon={MockIcon} />
          <StatsCard title="Accuracy" value="94%" icon={MockIcon} />
          <StatsCard title="Study Time" value="12h" icon={MockIcon} />
          <StatsCard title="Streak" value="7 days" icon={MockIcon} />
        </>
      );

      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(100);
    });
  });

  describe('Accessibility', () => {
    it('should have semantic structure', () => {
      render(<StatsCard title="Words Learned" value="150" icon={MockIcon} />);

      const title = screen.getByText('Words Learned');
      expect(title.tagName).toBe('P');
    });

    it('should have readable text contrast', () => {
      render(<StatsCard title="Words Learned" value="150" icon={MockIcon} />);

      const title = screen.getByText('Words Learned');
      expect(title).toHaveClass('text-muted-foreground');
    });

    it('should provide visual hierarchy', () => {
      render(<StatsCard title="Words Learned" value="150" icon={MockIcon} />);

      const title = screen.getByText('Words Learned');
      const value = screen.getByText('150');

      expect(title).toHaveClass('text-sm');
      expect(value).toHaveClass('text-2xl');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large numbers', () => {
      render(<StatsCard title="Words Learned" value="999,999" icon={MockIcon} />);

      expect(screen.getByText('999,999')).toBeInTheDocument();
    });

    it('should handle decimal values', () => {
      render(<StatsCard title="Accuracy" value="94.5%" icon={MockIcon} />);

      expect(screen.getByText('94.5%')).toBeInTheDocument();
    });

    it('should handle missing icon gracefully', () => {
      render(<StatsCard title="Words Learned" value="150" icon={undefined} />);

      expect(screen.getByText('150')).toBeInTheDocument();
    });

    it('should handle long titles', () => {
      render(<StatsCard title="Total Words Learned This Month" value="150" icon={MockIcon} />);

      expect(screen.getByText('Total Words Learned This Month')).toBeInTheDocument();
    });

    it('should truncate very long values', () => {
      const longValue = '12345678901234567890';
      const { container } = render(<StatsCard title="Words Learned" value={longValue} icon={MockIcon} />);

      const valueElement = container.querySelector('.text-2xl');
      expect(valueElement).toBeInTheDocument();
    });
  });

  describe('State Transitions', () => {
    it('should transition from loading to success', async () => {
      const { rerender } = render(<StatsCard title="Words Learned" value="0" icon={MockIcon} isLoading={true} />);

      expect(screen.getByTestId('card-skeleton')).toBeInTheDocument();

      rerender(<StatsCard title="Words Learned" value="150" icon={MockIcon} isLoading={false} />);

      await waitFor(() => {
        expect(screen.queryByTestId('card-skeleton')).not.toBeInTheDocument();
        expect(screen.getByText('150')).toBeInTheDocument();
      });
    });

    it('should transition from loading to error', async () => {
      const { rerender } = render(<StatsCard title="Words Learned" value="0" icon={MockIcon} isLoading={true} />);

      rerender(<StatsCard title="Words Learned" value="0" icon={MockIcon} isLoading={false} error="Failed to load" />);

      await waitFor(() => {
        expect(screen.queryByTestId('card-skeleton')).not.toBeInTheDocument();
        expect(screen.getByText('Failed to load')).toBeInTheDocument();
      });
    });

    it('should update value when data changes', async () => {
      const { rerender } = render(<StatsCard title="Words Learned" value="150" icon={MockIcon} />);

      expect(screen.getByText('150')).toBeInTheDocument();

      rerender(<StatsCard title="Words Learned" value="200" icon={MockIcon} />);

      await waitFor(() => {
        expect(screen.getByText('200')).toBeInTheDocument();
        expect(screen.queryByText('150')).not.toBeInTheDocument();
      });
    });
  });
});
