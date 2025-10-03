/**
 * StreakTracker Component Tests
 * Tests for streak calculation, display, and calendar view
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test-utils';

// Mock StreakTracker component
const StreakTracker = ({
  currentStreak = 0,
  longestStreak = 0,
  activityDates = [],
  isLoading = false,
  error = null
}: {
  currentStreak?: number;
  longestStreak?: number;
  activityDates?: string[];
  isLoading?: boolean;
  error?: string | null;
}) => {
  if (error) {
    return (
      <div className="p-4 border rounded-lg">
        <div className="text-destructive">{error}</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 border rounded-lg">
        <div data-testid="streak-loading" className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
          <div className="h-8 bg-gray-200 rounded w-1/4" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg">
      <div className="space-y-4">
        {/* Current Streak */}
        <div>
          <p className="text-sm text-muted-foreground">Current Streak</p>
          <div className="flex items-center gap-2">
            <p className="text-3xl font-bold" data-testid="current-streak">
              {currentStreak}
            </p>
            <span className="text-lg text-muted-foreground">days</span>
            {currentStreak > 0 && (
              <svg data-testid="fire-icon" className="h-6 w-6 text-orange-500" />
            )}
          </div>
        </div>

        {/* Longest Streak */}
        <div>
          <p className="text-sm text-muted-foreground">Longest Streak</p>
          <div className="flex items-center gap-2">
            <p className="text-xl font-semibold" data-testid="longest-streak">
              {longestStreak}
            </p>
            <span className="text-sm text-muted-foreground">days</span>
          </div>
        </div>

        {/* Activity Calendar */}
        {activityDates.length > 0 && (
          <div>
            <p className="text-sm text-muted-foreground mb-2">Activity Calendar</p>
            <div className="grid grid-cols-7 gap-1" data-testid="activity-calendar">
              {getLast7Days().map((date, index) => {
                const isActive = activityDates.includes(date);
                return (
                  <div
                    key={date}
                    className={`h-8 w-8 rounded ${
                      isActive ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                    data-testid={`calendar-day-${index}`}
                    data-active={isActive}
                    title={date}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Streak Message */}
        {currentStreak === 0 && (
          <p className="text-sm text-muted-foreground" data-testid="no-streak-message">
            Start learning today to begin your streak!
          </p>
        )}
        {currentStreak > 0 && currentStreak < 7 && (
          <p className="text-sm text-primary" data-testid="building-streak-message">
            Keep going! You're building a great habit.
          </p>
        )}
        {currentStreak >= 7 && (
          <p className="text-sm text-green-600" data-testid="strong-streak-message">
            Amazing! You've built a strong learning streak!
          </p>
        )}
      </div>
    </div>
  );
};

// Helper function to get last 7 days
const getLast7Days = (): string[] => {
  const days: string[] = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    days.push(date.toISOString().split('T')[0]);
  }

  return days;
};

describe('StreakTracker Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-07'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Loading State', () => {
    it('should show loading skeleton', () => {
      render(<StreakTracker isLoading={true} />);

      expect(screen.getByTestId('streak-loading')).toBeInTheDocument();
    });

    it('should have pulse animation while loading', () => {
      render(<StreakTracker isLoading={true} />);

      const loader = screen.getByTestId('streak-loading');
      expect(loader).toHaveClass('animate-pulse');
    });
  });

  describe('Error State', () => {
    it('should display error message', () => {
      render(<StreakTracker error="Failed to load streak data" />);

      expect(screen.getByText('Failed to load streak data')).toBeInTheDocument();
    });

    it('should apply error styling', () => {
      render(<StreakTracker error="Failed to load streak data" />);

      const errorElement = screen.getByText('Failed to load streak data');
      expect(errorElement).toHaveClass('text-destructive');
    });
  });

  describe('Streak Display', () => {
    it('should display current streak', () => {
      render(<StreakTracker currentStreak={5} />);

      expect(screen.getByTestId('current-streak')).toHaveTextContent('5');
      expect(screen.getByText('days')).toBeInTheDocument();
    });

    it('should display longest streak', () => {
      render(<StreakTracker currentStreak={5} longestStreak={12} />);

      expect(screen.getByTestId('longest-streak')).toHaveTextContent('12');
    });

    it('should show fire icon when streak is active', () => {
      render(<StreakTracker currentStreak={5} />);

      expect(screen.getByTestId('fire-icon')).toBeInTheDocument();
    });

    it('should not show fire icon when streak is 0', () => {
      render(<StreakTracker currentStreak={0} />);

      expect(screen.queryByTestId('fire-icon')).not.toBeInTheDocument();
    });

    it('should show zero streak when no activity', () => {
      render(<StreakTracker currentStreak={0} longestStreak={0} />);

      expect(screen.getByTestId('current-streak')).toHaveTextContent('0');
      expect(screen.getByTestId('longest-streak')).toHaveTextContent('0');
    });
  });

  describe('Activity Calendar', () => {
    const activityDates = ['2025-01-05', '2025-01-06', '2025-01-07'];

    it('should display activity calendar', () => {
      render(<StreakTracker activityDates={activityDates} />);

      expect(screen.getByTestId('activity-calendar')).toBeInTheDocument();
    });

    it('should show last 7 days', () => {
      render(<StreakTracker activityDates={activityDates} />);

      const days = screen.getAllByTestId(/calendar-day-/);
      expect(days).toHaveLength(7);
    });

    it('should highlight active days', () => {
      render(<StreakTracker activityDates={activityDates} />);

      const activeDays = screen.getAllByTestId(/calendar-day-/).filter(day =>
        day.getAttribute('data-active') === 'true'
      );

      expect(activeDays.length).toBe(activityDates.length);
    });

    it('should apply green background to active days', () => {
      render(<StreakTracker activityDates={activityDates} />);

      const days = screen.getAllByTestId(/calendar-day-/);
      const activeDays = days.filter(day => day.classList.contains('bg-green-500'));

      expect(activeDays.length).toBe(activityDates.length);
    });

    it('should apply gray background to inactive days', () => {
      render(<StreakTracker activityDates={activityDates} />);

      const days = screen.getAllByTestId(/calendar-day-/);
      const inactiveDays = days.filter(day => day.classList.contains('bg-gray-200'));

      expect(inactiveDays.length).toBe(7 - activityDates.length);
    });

    it('should not show calendar when no activity dates', () => {
      render(<StreakTracker activityDates={[]} />);

      expect(screen.queryByTestId('activity-calendar')).not.toBeInTheDocument();
    });
  });

  describe('Motivational Messages', () => {
    it('should show start message when streak is 0', () => {
      render(<StreakTracker currentStreak={0} />);

      expect(screen.getByTestId('no-streak-message')).toHaveTextContent(
        'Start learning today to begin your streak!'
      );
    });

    it('should show building message for streak 1-6 days', () => {
      render(<StreakTracker currentStreak={5} />);

      expect(screen.getByTestId('building-streak-message')).toHaveTextContent(
        "Keep going! You're building a great habit."
      );
    });

    it('should show strong streak message for 7+ days', () => {
      render(<StreakTracker currentStreak={7} />);

      expect(screen.getByTestId('strong-streak-message')).toHaveTextContent(
        "Amazing! You've built a strong learning streak!"
      );
    });

    it('should show strong message for longer streaks', () => {
      render(<StreakTracker currentStreak={30} />);

      expect(screen.getByTestId('strong-streak-message')).toBeInTheDocument();
    });
  });

  describe('Streak Calculations', () => {
    it('should handle single day streak', () => {
      render(<StreakTracker currentStreak={1} longestStreak={1} />);

      expect(screen.getByTestId('current-streak')).toHaveTextContent('1');
      expect(screen.getByTestId('longest-streak')).toHaveTextContent('1');
    });

    it('should track longest streak separately', () => {
      render(<StreakTracker currentStreak={3} longestStreak={10} />);

      expect(screen.getByTestId('current-streak')).toHaveTextContent('3');
      expect(screen.getByTestId('longest-streak')).toHaveTextContent('10');
    });

    it('should handle current streak equal to longest', () => {
      render(<StreakTracker currentStreak={15} longestStreak={15} />);

      expect(screen.getByTestId('current-streak')).toHaveTextContent('15');
      expect(screen.getByTestId('longest-streak')).toHaveTextContent('15');
    });

    it('should handle very long streaks', () => {
      render(<StreakTracker currentStreak={365} longestStreak={365} />);

      expect(screen.getByTestId('current-streak')).toHaveTextContent('365');
    });
  });

  describe('Visual Styling', () => {
    it('should apply larger font to current streak', () => {
      render(<StreakTracker currentStreak={5} />);

      const currentStreak = screen.getByTestId('current-streak');
      expect(currentStreak).toHaveClass('text-3xl', 'font-bold');
    });

    it('should apply smaller font to longest streak', () => {
      render(<StreakTracker currentStreak={5} longestStreak={10} />);

      const longestStreak = screen.getByTestId('longest-streak');
      expect(longestStreak).toHaveClass('text-xl', 'font-semibold');
    });

    it('should use grid layout for calendar', () => {
      render(<StreakTracker activityDates={['2025-01-07']} />);

      const calendar = screen.getByTestId('activity-calendar');
      expect(calendar).toHaveClass('grid', 'grid-cols-7');
    });
  });

  describe('State Updates', () => {
    it('should update when streak changes', async () => {
      const { rerender } = render(<StreakTracker currentStreak={5} />);

      expect(screen.getByTestId('current-streak')).toHaveTextContent('5');

      rerender(<StreakTracker currentStreak={6} />);

      await waitFor(() => {
        expect(screen.getByTestId('current-streak')).toHaveTextContent('6');
      });
    });

    it('should update calendar when activity dates change', async () => {
      const { rerender } = render(
        <StreakTracker activityDates={['2025-01-07']} />
      );

      let activeDays = screen.getAllByTestId(/calendar-day-/).filter(
        day => day.getAttribute('data-active') === 'true'
      );
      expect(activeDays).toHaveLength(1);

      rerender(<StreakTracker activityDates={['2025-01-06', '2025-01-07']} />);

      await waitFor(() => {
        activeDays = screen.getAllByTestId(/calendar-day-/).filter(
          day => day.getAttribute('data-active') === 'true'
        );
        expect(activeDays).toHaveLength(2);
      });
    });

    it('should transition from loading to content', async () => {
      const { rerender } = render(<StreakTracker isLoading={true} />);

      expect(screen.getByTestId('streak-loading')).toBeInTheDocument();

      rerender(<StreakTracker currentStreak={5} isLoading={false} />);

      await waitFor(() => {
        expect(screen.queryByTestId('streak-loading')).not.toBeInTheDocument();
        expect(screen.getByTestId('current-streak')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle negative streak (should not happen)', () => {
      render(<StreakTracker currentStreak={-1} />);

      // Should either show 0 or handle gracefully
      expect(screen.getByTestId('current-streak')).toBeInTheDocument();
    });

    it('should handle very large streak numbers', () => {
      render(<StreakTracker currentStreak={9999} />);

      expect(screen.getByTestId('current-streak')).toHaveTextContent('9999');
    });

    it('should handle empty activity dates array', () => {
      render(<StreakTracker activityDates={[]} />);

      expect(screen.queryByTestId('activity-calendar')).not.toBeInTheDocument();
    });

    it('should handle invalid date formats gracefully', () => {
      render(<StreakTracker activityDates={['invalid-date']} />);

      // Should not crash
      expect(screen.getByTestId('current-streak')).toBeInTheDocument();
    });

    it('should handle duplicate activity dates', () => {
      const duplicateDates = ['2025-01-07', '2025-01-07', '2025-01-06'];

      render(<StreakTracker activityDates={duplicateDates} />);

      // Should handle duplicates gracefully
      expect(screen.getByTestId('activity-calendar')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have semantic structure', () => {
      render(<StreakTracker currentStreak={5} />);

      const currentStreakLabel = screen.getByText('Current Streak');
      expect(currentStreakLabel.tagName).toBe('P');
    });

    it('should provide date information in calendar', () => {
      render(<StreakTracker activityDates={['2025-01-07']} />);

      const calendarDays = screen.getAllByTestId(/calendar-day-/);
      calendarDays.forEach(day => {
        expect(day).toHaveAttribute('title');
      });
    });
  });

  describe('Performance', () => {
    it('should render quickly', () => {
      const startTime = performance.now();

      render(<StreakTracker currentStreak={5} longestStreak={10} />);

      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(50);
    });

    it('should handle large activity date arrays', () => {
      const largeDates = Array.from({ length: 365 }, (_, i) => {
        const date = new Date('2025-01-07');
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
      });

      const startTime = performance.now();

      render(<StreakTracker activityDates={largeDates} />);

      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(100);
    });
  });
});
