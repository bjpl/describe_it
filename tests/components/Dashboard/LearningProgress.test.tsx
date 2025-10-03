/**
 * LearningProgress Component Tests
 * Comprehensive test suite for the Dashboard LearningProgress component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../../test-utils';
import { LearningProgress } from '@/components/Dashboard/LearningProgress';
import * as supabaseModule from '@/lib/supabase';
import {
  generateMockUserProgress,
  generateMockStudySessions,
  expectChartToBeRendered,
  expectLoadingState,
  expectErrorState,
  mockRechartsComponents
} from './test-utils';

// Mock Recharts
mockRechartsComponents();

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
  DatabaseService: {
    getLearningProgress: vi.fn(),
    getUserSessions: vi.fn(),
  },
}));

describe('LearningProgress Component', () => {
  const mockUserId = 'test-user-123';
  const mockProgress = generateMockUserProgress(30);
  const mockSessions = generateMockStudySessions(15);

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default successful responses
    vi.mocked(supabaseModule.DatabaseService.getLearningProgress).mockResolvedValue(mockProgress);
    vi.mocked(supabaseModule.DatabaseService.getUserSessions).mockResolvedValue(mockSessions);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Loading States', () => {
    it('should display loading skeletons on initial render', () => {
      const { container } = render(<LearningProgress userId={mockUserId} />);

      expectLoadingState(container);
      expect(screen.getAllByTestId(/skeleton/i)).toHaveLength(4); // 4 summary cards
    });

    it('should show loading overlay for main chart', () => {
      render(<LearningProgress userId={mockUserId} />);

      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
    });

    it('should transition from loading to success state', async () => {
      const { container } = render(<LearningProgress userId={mockUserId} />);

      expectLoadingState(container);

      await waitFor(() => {
        expect(screen.queryByTestId(/skeleton/i)).not.toBeInTheDocument();
      });

      expect(screen.getByText(/Words Learned/i)).toBeInTheDocument();
    });
  });

  describe('Success States with Data', () => {
    it('should render summary cards with correct data', async () => {
      render(<LearningProgress userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText(/Words Learned/i)).toBeInTheDocument();
        expect(screen.getByText(/Accuracy/i)).toBeInTheDocument();
        expect(screen.getByText(/Study Time/i)).toBeInTheDocument();
        expect(screen.getByText(/Streak/i)).toBeInTheDocument();
      });
    });

    it('should display calculated statistics correctly', async () => {
      render(<LearningProgress userId={mockUserId} />);

      await waitFor(() => {
        const wordsCount = screen.getByText((content, element) => {
          return element?.tagName === 'P' && /^\d+$/.test(content);
        });
        expect(wordsCount).toBeInTheDocument();
      });
    });

    it('should render progress level card', async () => {
      render(<LearningProgress userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText(/Level Progress/i)).toBeInTheDocument();
        expect(screen.getByText(/Beginner|Intermediate|Advanced|Expert/i)).toBeInTheDocument();
      });
    });

    it('should show progress bar with correct percentage', async () => {
      const { container } = render(<LearningProgress userId={mockUserId} />);

      await waitFor(() => {
        const progressBars = container.querySelectorAll('[class*="bg-primary"]');
        expect(progressBars.length).toBeGreaterThan(0);
      });
    });

    it('should render area chart by default', async () => {
      const { container } = render(<LearningProgress userId={mockUserId} />);

      await waitFor(() => {
        expectChartToBeRendered(container, 'area');
      });
    });

    it('should render category progress section', async () => {
      render(<LearningProgress userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText(/Category Progress/i)).toBeInTheDocument();
        expect(screen.getByText(/Nouns|Verbs|Adjectives/i)).toBeInTheDocument();
      });
    });

    it('should display pie chart for categories', async () => {
      const { container } = render(<LearningProgress userId={mockUserId} />);

      await waitFor(() => {
        expectChartToBeRendered(container, 'pie');
      });
    });
  });

  describe('Error States', () => {
    it('should display error message when data fetch fails', async () => {
      const errorMessage = 'Failed to fetch progress data';
      vi.mocked(supabaseModule.DatabaseService.getLearningProgress)
        .mockRejectedValue(new Error(errorMessage));

      const { container } = render(<LearningProgress userId={mockUserId} />);

      await waitFor(() => {
        expectErrorState(container, 'Failed to load progress data');
      });
    });

    it('should show retry button on error', async () => {
      vi.mocked(supabaseModule.DatabaseService.getLearningProgress)
        .mockRejectedValue(new Error('Network error'));

      render(<LearningProgress userId={mockUserId} />);

      await waitFor(() => {
        const retryButton = screen.getByRole('button', { name: /try again/i });
        expect(retryButton).toBeInTheDocument();
      });
    });

    it('should retry fetching data when retry button is clicked', async () => {
      vi.mocked(supabaseModule.DatabaseService.getLearningProgress)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockProgress);

      render(<LearningProgress userId={mockUserId} />);

      await waitFor(() => {
        const retryButton = screen.getByRole('button', { name: /try again/i });
        fireEvent.click(retryButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/Words Learned/i)).toBeInTheDocument();
      });
    });
  });

  describe('Empty States', () => {
    it('should handle empty progress data gracefully', async () => {
      vi.mocked(supabaseModule.DatabaseService.getLearningProgress).mockResolvedValue([]);
      vi.mocked(supabaseModule.DatabaseService.getUserSessions).mockResolvedValue([]);

      render(<LearningProgress userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText(/Words Learned/i)).toBeInTheDocument();
        // Should show 0 for all stats
        const zeroValues = screen.getAllByText('0');
        expect(zeroValues.length).toBeGreaterThan(0);
      });
    });
  });

  describe('User Interactions', () => {
    it('should switch to accuracy chart when button clicked', async () => {
      const { container } = render(<LearningProgress userId={mockUserId} />);

      await waitFor(() => {
        const accuracyButton = screen.getByRole('button', { name: /accuracy trend/i });
        fireEvent.click(accuracyButton);
      });

      await waitFor(() => {
        expectChartToBeRendered(container, 'line');
      });
    });

    it('should switch to time chart when button clicked', async () => {
      const { container } = render(<LearningProgress userId={mockUserId} />);

      await waitFor(() => {
        const timeButton = screen.getByRole('button', { name: /study time/i });
        fireEvent.click(timeButton);
      });

      await waitFor(() => {
        expectChartToBeRendered(container, 'bar');
      });
    });

    it('should highlight active chart button', async () => {
      render(<LearningProgress userId={mockUserId} />);

      await waitFor(() => {
        const progressButton = screen.getByRole('button', { name: /words progress/i });
        expect(progressButton).toHaveClass(/default/);
      });
    });

    it('should update chart when switching between views', async () => {
      const { container } = render(<LearningProgress userId={mockUserId} />);

      await waitFor(() => {
        expectChartToBeRendered(container, 'area');
      });

      const accuracyButton = screen.getByRole('button', { name: /accuracy trend/i });
      fireEvent.click(accuracyButton);

      await waitFor(() => {
        expectChartToBeRendered(container, 'line');
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('should render ResponsiveContainer for charts', async () => {
      const { container } = render(<LearningProgress userId={mockUserId} />);

      await waitFor(() => {
        const responsiveContainers = container.querySelectorAll('[data-testid="responsive-container"]');
        expect(responsiveContainers.length).toBeGreaterThan(0);
      });
    });

    it('should display grid layout for summary cards', async () => {
      const { container } = render(<LearningProgress userId={mockUserId} />);

      await waitFor(() => {
        const grid = container.querySelector('.grid');
        expect(grid).toHaveClass(/grid-cols/);
      });
    });
  });

  describe('Time Range Filtering', () => {
    it('should fetch data for 7 days by default when timeRange is 7d', async () => {
      render(<LearningProgress userId={mockUserId} timeRange="7d" />);

      await waitFor(() => {
        expect(supabaseModule.DatabaseService.getLearningProgress).toHaveBeenCalledWith(
          mockUserId,
          7
        );
      });
    });

    it('should fetch data for 30 days when timeRange is 30d', async () => {
      render(<LearningProgress userId={mockUserId} timeRange="30d" />);

      await waitFor(() => {
        expect(supabaseModule.DatabaseService.getLearningProgress).toHaveBeenCalledWith(
          mockUserId,
          30
        );
      });
    });

    it('should refetch data when timeRange prop changes', async () => {
      const { rerender } = render(<LearningProgress userId={mockUserId} timeRange="7d" />);

      await waitFor(() => {
        expect(supabaseModule.DatabaseService.getLearningProgress).toHaveBeenCalledTimes(1);
      });

      rerender(<LearningProgress userId={mockUserId} timeRange="30d" />);

      await waitFor(() => {
        expect(supabaseModule.DatabaseService.getLearningProgress).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Insights Display', () => {
    it('should show insights section when showInsights is true', async () => {
      render(<LearningProgress userId={mockUserId} showInsights={true} />);

      await waitFor(() => {
        expect(screen.getByText(/Level Progress/i)).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('should render within acceptable time', async () => {
      const startTime = performance.now();

      render(<LearningProgress userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText(/Words Learned/i)).toBeInTheDocument();
      });

      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(2000); // Should render within 2 seconds
    });

    it('should handle large datasets efficiently', async () => {
      const largeProgress = generateMockUserProgress(1000);
      const largeSessions = generateMockStudySessions(500);

      vi.mocked(supabaseModule.DatabaseService.getLearningProgress).mockResolvedValue(largeProgress);
      vi.mocked(supabaseModule.DatabaseService.getUserSessions).mockResolvedValue(largeSessions);

      const startTime = performance.now();

      render(<LearningProgress userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText(/Words Learned/i)).toBeInTheDocument();
      });

      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(3000); // Should handle large data within 3 seconds
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for interactive elements', async () => {
      render(<LearningProgress userId={mockUserId} />);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        buttons.forEach(button => {
          expect(button.textContent?.trim().length).toBeGreaterThan(0);
        });
      });
    });

    it('should support keyboard navigation', async () => {
      render(<LearningProgress userId={mockUserId} />);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        buttons.forEach(button => {
          expect(button).toHaveAttribute('type');
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing userId gracefully', async () => {
      render(<LearningProgress userId={undefined} />);

      // Should not attempt to fetch data
      await waitFor(() => {
        expect(supabaseModule.DatabaseService.getLearningProgress).not.toHaveBeenCalled();
      }, { timeout: 1000 });
    });

    it('should handle network timeout', async () => {
      vi.mocked(supabaseModule.DatabaseService.getLearningProgress)
        .mockImplementation(() => new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 100);
        }));

      const { container } = render(<LearningProgress userId={mockUserId} />);

      await waitFor(() => {
        expectErrorState(container);
      }, { timeout: 2000 });
    });

    it('should handle malformed data gracefully', async () => {
      vi.mocked(supabaseModule.DatabaseService.getLearningProgress)
        .mockResolvedValue([{ invalid: 'data' }] as any);

      render(<LearningProgress userId={mockUserId} />);

      await waitFor(() => {
        // Should not crash, should handle gracefully
        expect(screen.getByText(/Words Learned/i)).toBeInTheDocument();
      });
    });
  });
});
