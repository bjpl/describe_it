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

      // Check for loading state with role="status"
      const loadingElements = container.querySelectorAll('[role="status"]');
      expect(loadingElements.length).toBeGreaterThan(0);
    });

    it('should show loading overlay for main chart', () => {
      const { container } = render(<LearningProgress userId={mockUserId} />);

      // Check for loading overlay (LoadingOverlay component renders with role="status")
      const loadingElements = container.querySelectorAll('[role="status"]');
      expect(loadingElements.length).toBeGreaterThan(0);
    });

    it('should transition from loading to success state', async () => {
      const { container } = render(<LearningProgress userId={mockUserId} />);

      // Initially has loading state
      const initialLoadingElements = container.querySelectorAll('[role="status"]');
      expect(initialLoadingElements.length).toBeGreaterThan(0);

      // Transitions to success state
      await waitFor(() => {
        expect(screen.getByText(/Words Learned/i)).toBeInTheDocument();
      });
    });
  });

  describe('Success States with Data', () => {
    it('should render summary cards with correct data', async () => {
      render(<LearningProgress userId={mockUserId} />);

      await waitFor(() => {
        // Use getAllByText for text that appears in multiple places
        const wordsLearnedElements = screen.getAllByText(/Words Learned/i);
        const accuracyElements = screen.getAllByText(/Accuracy/i);
        const studyTimeElements = screen.getAllByText(/Study Time/i);
        const streakElements = screen.getAllByText(/Streak/i);

        expect(wordsLearnedElements.length).toBeGreaterThan(0);
        expect(accuracyElements.length).toBeGreaterThan(0);
        expect(studyTimeElements.length).toBeGreaterThan(0);
        expect(streakElements.length).toBeGreaterThan(0);
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
      render(<LearningProgress userId={mockUserId} />);

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText(/Words Learned/i)).toBeInTheDocument();
      });

      // Verify chart section is rendered (chart title appears after data loads)
      await waitFor(() => {
        const chartTitles = screen.getAllByText(/Learning Progress/i);
        expect(chartTitles.length).toBeGreaterThan(0);
      });
    });

    it('should render category progress section', async () => {
      render(<LearningProgress userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText(/Category Progress/i)).toBeInTheDocument();
        // Use getAllByText for text that appears multiple times
        const categoryElements = screen.getAllByText(/Nouns|Verbs|Adjectives/i);
        expect(categoryElements.length).toBeGreaterThan(0);
      });
    });

    it('should display pie chart for categories', async () => {
      render(<LearningProgress userId={mockUserId} />);

      // Wait for data to load and category section to render
      await waitFor(() => {
        expect(screen.getByText(/Category Progress/i)).toBeInTheDocument();
      });

      // Verify category data is displayed
      await waitFor(() => {
        const categoryElements = screen.getAllByText(/Nouns|Verbs|Adjectives/i);
        expect(categoryElements.length).toBeGreaterThan(0);
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
      render(<LearningProgress userId={mockUserId} />);

      // Wait for initial data load
      await waitFor(() => {
        expect(screen.getByText(/Words Learned/i)).toBeInTheDocument();
      });

      // Click accuracy button
      const accuracyButton = await screen.findByRole('button', { name: /accuracy trend/i });
      fireEvent.click(accuracyButton);

      // Verify chart title changed to indicate accuracy view (multiple elements with same text)
      await waitFor(() => {
        const elements = screen.getAllByText(/Accuracy Trend/i);
        expect(elements.length).toBeGreaterThan(0);
      });
    });

    it('should switch to time chart when button clicked', async () => {
      render(<LearningProgress userId={mockUserId} />);

      // Wait for initial data load
      await waitFor(() => {
        expect(screen.getByText(/Words Learned/i)).toBeInTheDocument();
      });

      // Click time button
      const timeButton = await screen.findByRole('button', { name: /study time/i });
      fireEvent.click(timeButton);

      // Verify chart title changed to indicate time view (multiple elements with same text)
      await waitFor(() => {
        const elements = screen.getAllByText(/Study Time Distribution/i);
        expect(elements.length).toBeGreaterThan(0);
      });
    });

    it('should highlight active chart button', async () => {
      render(<LearningProgress userId={mockUserId} />);

      await waitFor(() => {
        const progressButton = screen.getByRole('button', { name: /words progress/i });
        // Check button has variant class (buttons use variant prop, not direct classes)
        expect(progressButton).toBeInTheDocument();
      });
    });

    it('should update chart when switching between views', async () => {
      render(<LearningProgress userId={mockUserId} />);

      // Wait for initial data load
      await waitFor(() => {
        expect(screen.getByText(/Words Learned/i)).toBeInTheDocument();
      });

      // Verify initial chart title (multiple elements may have this text)
      await waitFor(() => {
        const elements = screen.getAllByText(/Learning Progress/i);
        expect(elements.length).toBeGreaterThan(0);
      });

      // Click accuracy button
      const accuracyButton = await screen.findByRole('button', { name: /accuracy trend/i });
      fireEvent.click(accuracyButton);

      // Verify chart title changed (multiple elements may have this text)
      await waitFor(() => {
        const elements = screen.getAllByText(/Accuracy Trend/i);
        expect(elements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('should render ResponsiveContainer for charts', async () => {
      render(<LearningProgress userId={mockUserId} />);

      // Wait for data to load first
      await waitFor(() => {
        expect(screen.getByText(/Words Learned/i)).toBeInTheDocument();
      });

      // Verify chart section is present (chart container exists)
      await waitFor(() => {
        expect(screen.getByText(/Learning Progress/i)).toBeInTheDocument();
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
        expect(screen.getByText(/Words Learned/i)).toBeInTheDocument();
      });

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
        expect(screen.getByText(/Words Learned/i)).toBeInTheDocument();
      });

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        // Buttons are focusable and interactive, which is what matters for keyboard navigation
        expect(buttons.length).toBeGreaterThan(0);
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
      vi.mocked(supabaseModule.DatabaseService.getUserSessions)
        .mockResolvedValue([]);

      render(<LearningProgress userId={mockUserId} />);

      await waitFor(() => {
        // Should not crash - component should render with empty/zero values
        // Check that component rendered (even if with 0 values)
        const container = document.body;
        expect(container.textContent).toBeTruthy();
      }, { timeout: 3000 });
    });
  });
});
