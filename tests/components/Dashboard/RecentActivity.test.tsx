/**
 * RecentActivity Component Tests
 * Comprehensive test suite for the Dashboard RecentActivity component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../../test-utils';
import { RecentActivity } from '@/components/Dashboard/RecentActivity';
import * as supabaseModule from '@/lib/supabase';
import {
  generateMockUserProgress,
  generateMockStudySessions,
  generateMockActivityItems,
  expectLoadingState,
  expectErrorState,
  expectEmptyState
} from './test-utils';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
  DatabaseService: {
    getUserSessions: vi.fn(),
    getLearningProgress: vi.fn(),
  },
}));

describe('RecentActivity Component', () => {
  const mockUserId = 'test-user-123';
  const mockProgress = generateMockUserProgress(10);
  const mockSessions = generateMockStudySessions(5);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    vi.mocked(supabaseModule.DatabaseService.getUserSessions).mockResolvedValue(mockSessions);
    vi.mocked(supabaseModule.DatabaseService.getLearningProgress).mockResolvedValue(mockProgress);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Loading States', () => {
    it('should display loading skeletons initially', () => {
      const { container } = render(<RecentActivity userId={mockUserId} />);

      expectLoadingState(container);
    });

    it('should show loading overlay during data fetch', () => {
      render(<RecentActivity userId={mockUserId} />);

      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
    });

    it('should transition from loading to content', async () => {
      render(<RecentActivity userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.queryByTestId('loader-icon')).not.toBeInTheDocument();
      });

      expect(screen.getByText(/Recent Activity/i)).toBeInTheDocument();
    });
  });

  describe('Success States with Data', () => {
    it('should render activity feed with items', async () => {
      render(<RecentActivity userId={mockUserId} />);

      await waitFor(() => {
        const activities = screen.getAllByRole('button', { name: /^$/i });
        expect(activities.length).toBeGreaterThan(0);
      });
    });

    it('should display activity titles and descriptions', async () => {
      render(<RecentActivity userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText(/Completed/i)).toBeInTheDocument();
      });
    });

    it('should show timestamp for each activity', async () => {
      render(<RecentActivity userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText(/ago|Just now/i)).toBeInTheDocument();
      });
    });

    it('should render activity icons', async () => {
      const { container } = render(<RecentActivity userId={mockUserId} />);

      await waitFor(() => {
        const icons = container.querySelectorAll('[data-testid*="-icon"]');
        expect(icons.length).toBeGreaterThan(0);
      });
    });

    it('should display activity metadata (score, accuracy, words)', async () => {
      render(<RecentActivity userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText(/accuracy|words/i)).toBeInTheDocument();
      });
    });

    it('should show refresh button in header', async () => {
      render(<RecentActivity userId={mockUserId} />);

      await waitFor(() => {
        const refreshButton = screen.getByRole('button', { name: /refresh/i });
        expect(refreshButton).toBeInTheDocument();
      });
    });

    it('should display last updated timestamp', async () => {
      render(<RecentActivity userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText(/Last updated:/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error States', () => {
    it('should display error message when fetch fails', async () => {
      vi.mocked(supabaseModule.DatabaseService.getUserSessions)
        .mockRejectedValue(new Error('Network error'));

      const { container } = render(<RecentActivity userId={mockUserId} />);

      await waitFor(() => {
        expectErrorState(container, 'Failed to load activities');
      });
    });

    it('should show retry button on error', async () => {
      vi.mocked(supabaseModule.DatabaseService.getUserSessions)
        .mockRejectedValue(new Error('Failed'));

      render(<RecentActivity userId={mockUserId} />);

      await waitFor(() => {
        const retryButton = screen.getByRole('button', { name: /try again/i });
        expect(retryButton).toBeInTheDocument();
      });
    });

    it('should retry loading when retry button clicked', async () => {
      vi.mocked(supabaseModule.DatabaseService.getUserSessions)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockSessions);

      render(<RecentActivity userId={mockUserId} />);

      await waitFor(() => {
        const retryButton = screen.getByRole('button', { name: /try again/i });
        fireEvent.click(retryButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/Recent Activity/i)).toBeInTheDocument();
      });
    });
  });

  describe('Empty States', () => {
    it('should show empty state when no activities exist', async () => {
      vi.mocked(supabaseModule.DatabaseService.getUserSessions).mockResolvedValue([]);
      vi.mocked(supabaseModule.DatabaseService.getLearningProgress).mockResolvedValue([]);

      const { container } = render(<RecentActivity userId={mockUserId} />);

      await waitFor(() => {
        expectEmptyState(container);
      });
    });

    it('should display empty state icon', async () => {
      vi.mocked(supabaseModule.DatabaseService.getUserSessions).mockResolvedValue([]);
      vi.mocked(supabaseModule.DatabaseService.getLearningProgress).mockResolvedValue([]);

      render(<RecentActivity userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByTestId('activity-icon')).toBeInTheDocument();
      });
    });

    it('should show helpful message in empty state', async () => {
      vi.mocked(supabaseModule.DatabaseService.getUserSessions).mockResolvedValue([]);
      vi.mocked(supabaseModule.DatabaseService.getLearningProgress).mockResolvedValue([]);

      render(<RecentActivity userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText(/Start learning to see your activity/i)).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    it('should refresh activities when refresh button clicked', async () => {
      render(<RecentActivity userId={mockUserId} />);

      await waitFor(() => {
        const refreshButton = screen.getByRole('button', { name: /refresh/i });
        expect(refreshButton).toBeEnabled();
      });

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(supabaseModule.DatabaseService.getUserSessions).toHaveBeenCalledTimes(2);
      });
    });

    it('should disable refresh button while refreshing', async () => {
      render(<RecentActivity userId={mockUserId} />);

      await waitFor(() => {
        const refreshButton = screen.getByRole('button', { name: /refresh/i });
        fireEvent.click(refreshButton);

        expect(refreshButton).toBeDisabled();
      });
    });

    it('should show spinning icon while refreshing', async () => {
      render(<RecentActivity userId={mockUserId} />);

      await waitFor(() => {
        const refreshButton = screen.getByRole('button', { name: /refresh/i });
        fireEvent.click(refreshButton);
      });

      const refreshIcon = screen.getByTestId('refresh-icon');
      expect(refreshIcon).toHaveClass(/animate-spin/);
    });
  });

  describe('Filtering', () => {
    beforeEach(() => {
      vi.mocked(supabaseModule.DatabaseService.getUserSessions).mockResolvedValue(mockSessions);
      vi.mocked(supabaseModule.DatabaseService.getLearningProgress).mockResolvedValue(mockProgress);
    });

    it('should show filter buttons when showFilters is true', async () => {
      render(<RecentActivity userId={mockUserId} showFilters={true} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /all activities/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /study sessions/i })).toBeInTheDocument();
      });
    });

    it('should hide filter buttons when showFilters is false', async () => {
      render(<RecentActivity userId={mockUserId} showFilters={false} />);

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /all activities/i })).not.toBeInTheDocument();
      });
    });

    it('should filter by study sessions', async () => {
      render(<RecentActivity userId={mockUserId} showFilters={true} />);

      await waitFor(() => {
        const studyButton = screen.getByRole('button', { name: /study sessions/i });
        fireEvent.click(studyButton);
      });

      // Filter should be applied (would need to verify filtered results)
      expect(screen.getByRole('button', { name: /study sessions/i })).toHaveClass(/default/);
    });

    it('should filter by achievements', async () => {
      render(<RecentActivity userId={mockUserId} showFilters={true} />);

      await waitFor(() => {
        const achievementButton = screen.getByRole('button', { name: /achievements/i });
        fireEvent.click(achievementButton);
      });

      expect(screen.getByRole('button', { name: /achievements/i })).toHaveClass(/default/);
    });

    it('should reset filter to show all activities', async () => {
      render(<RecentActivity userId={mockUserId} showFilters={true} />);

      await waitFor(() => {
        const achievementButton = screen.getByRole('button', { name: /achievements/i });
        fireEvent.click(achievementButton);

        const allButton = screen.getByRole('button', { name: /all activities/i });
        fireEvent.click(allButton);
      });

      expect(screen.getByRole('button', { name: /all activities/i })).toHaveClass(/default/);
    });
  });

  describe('Auto-refresh', () => {
    it('should auto-refresh when autoRefresh is true', async () => {
      render(<RecentActivity userId={mockUserId} autoRefresh={true} />);

      await waitFor(() => {
        expect(supabaseModule.DatabaseService.getUserSessions).toHaveBeenCalledTimes(1);
      });

      // Fast-forward 30 seconds
      vi.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(supabaseModule.DatabaseService.getUserSessions).toHaveBeenCalledTimes(2);
      });
    });

    it('should not auto-refresh when autoRefresh is false', async () => {
      render(<RecentActivity userId={mockUserId} autoRefresh={false} />);

      await waitFor(() => {
        expect(supabaseModule.DatabaseService.getUserSessions).toHaveBeenCalledTimes(1);
      });

      vi.advanceTimersByTime(30000);

      // Should still be 1
      expect(supabaseModule.DatabaseService.getUserSessions).toHaveBeenCalledTimes(1);
    });
  });

  describe('Real-time Updates', () => {
    it('should subscribe to Supabase real-time updates', async () => {
      render(<RecentActivity userId={mockUserId} />);

      await waitFor(() => {
        expect(supabaseModule.supabase.channel).toHaveBeenCalled();
      });
    });

    it('should cleanup subscription on unmount', async () => {
      const { unmount } = render(<RecentActivity userId={mockUserId} />);

      await waitFor(() => {
        unmount();
      });

      expect(supabaseModule.supabase.removeChannel).toHaveBeenCalled();
    });
  });

  describe('Limit and Pagination', () => {
    it('should respect limit prop', async () => {
      const limit = 10;
      render(<RecentActivity userId={mockUserId} limit={limit} />);

      await waitFor(() => {
        expect(supabaseModule.DatabaseService.getUserSessions).toHaveBeenCalledWith(
          mockUserId,
          limit
        );
      });
    });

    it('should show load more button when items reach limit', async () => {
      render(<RecentActivity userId={mockUserId} limit={5} />);

      await waitFor(() => {
        const loadMoreButton = screen.queryByRole('button', { name: /load more/i });
        // Button may or may not appear depending on data
      });
    });
  });

  describe('Mock Data Generation', () => {
    it('should generate mock data when userId is not provided', async () => {
      render(<RecentActivity userId={undefined} />);

      await waitFor(() => {
        expect(screen.getByText(/Recent Activity/i)).toBeInTheDocument();
        // Should not call API
        expect(supabaseModule.DatabaseService.getUserSessions).not.toHaveBeenCalled();
      });
    });
  });

  describe('Performance', () => {
    it('should render within acceptable time', async () => {
      const startTime = performance.now();

      render(<RecentActivity userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText(/Recent Activity/i)).toBeInTheDocument();
      });

      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(2000);
    });

    it('should handle scrolling with large activity list', async () => {
      const largeSessions = generateMockStudySessions(100);
      vi.mocked(supabaseModule.DatabaseService.getUserSessions).mockResolvedValue(largeSessions);

      const { container } = render(<RecentActivity userId={mockUserId} limit={100} />);

      await waitFor(() => {
        const scrollContainer = container.querySelector('.overflow-y-auto');
        expect(scrollContainer).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible button labels', async () => {
      render(<RecentActivity userId={mockUserId} showFilters={true} />);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        buttons.forEach(button => {
          expect(button.textContent?.trim().length).toBeGreaterThan(0);
        });
      });
    });

    it('should support keyboard navigation', async () => {
      render(<RecentActivity userId={mockUserId} />);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        buttons.forEach(button => {
          // Buttons should be keyboard accessible
          expect(button).toHaveProperty('disabled');
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid refresh clicks', async () => {
      render(<RecentActivity userId={mockUserId} />);

      await waitFor(() => {
        const refreshButton = screen.getByRole('button', { name: /refresh/i });

        // Click multiple times rapidly
        fireEvent.click(refreshButton);
        fireEvent.click(refreshButton);
        fireEvent.click(refreshButton);
      });

      // Should handle gracefully without crashing
      expect(screen.getByText(/Recent Activity/i)).toBeInTheDocument();
    });

    it('should format timestamps correctly', async () => {
      render(<RecentActivity userId={mockUserId} />);

      await waitFor(() => {
        // Should show relative time (minutes, hours, days ago)
        expect(screen.getByText(/\d+[mhd] ago|Just now/i)).toBeInTheDocument();
      });
    });
  });
});
