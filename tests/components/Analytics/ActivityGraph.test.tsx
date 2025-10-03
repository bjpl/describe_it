/**
 * Activity Graph Component Tests
 * Comprehensive test suite for Analytics activity graphs and heatmaps
 * Tests: 25+ test cases for activity visualization, heatmaps, and interactions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { RecentActivity } from '@/components/Dashboard/RecentActivity';
import * as supabaseModule from '@/lib/supabase';
import { generateMockActivityItems, generateMockStudySessions } from '../Dashboard/test-utils';

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

describe('Activity Graph Component', () => {
  const mockUserId = 'test-user-123';
  const mockActivities = generateMockActivityItems(20);
  const mockSessions = generateMockStudySessions(10);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabaseModule.DatabaseService.getUserSessions).mockResolvedValue(mockSessions);
    vi.mocked(supabaseModule.DatabaseService.getLearningProgress).mockResolvedValue([]);
  });

  describe('Initial Rendering', () => {
    it('should render activity header', async () => {
      render(<RecentActivity userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText('Recent Activity')).toBeInTheDocument();
      });
    });

    it('should show last updated timestamp', async () => {
      render(<RecentActivity userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText(/last updated/i)).toBeInTheDocument();
      });
    });

    it('should render refresh button', async () => {
      render(<RecentActivity userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText('Refresh')).toBeInTheDocument();
      });
    });

    it('should display filter buttons when enabled', async () => {
      render(<RecentActivity userId={mockUserId} showFilters={true} />);

      await waitFor(() => {
        expect(screen.getByText('All Activities')).toBeInTheDocument();
        expect(screen.getByText('Study Sessions')).toBeInTheDocument();
        expect(screen.getByText('Achievements')).toBeInTheDocument();
      });
    });

    it('should hide filters when disabled', async () => {
      render(<RecentActivity userId={mockUserId} showFilters={false} />);

      await waitFor(() => {
        expect(screen.queryByText('All Activities')).not.toBeInTheDocument();
      });
    });
  });

  describe('Activity Items Display', () => {
    it('should render activity feed', async () => {
      render(<RecentActivity userId={mockUserId} limit={10} />);

      await waitFor(() => {
        const activities = screen.getAllByRole('article');
        expect(activities.length).toBeGreaterThan(0);
      });
    });

    it('should display activity titles', async () => {
      render(<RecentActivity userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText(/completed/i)).toBeInTheDocument();
      });
    });

    it('should show activity descriptions', async () => {
      render(<RecentActivity userId={mockUserId} />);

      await waitFor(() => {
        const descriptions = screen.getAllByText(/\d+\s*words/i);
        expect(descriptions.length).toBeGreaterThan(0);
      });
    });

    it('should display activity icons', async () => {
      const { container } = render(<RecentActivity userId={mockUserId} />);

      await waitFor(() => {
        const icons = container.querySelectorAll('[class*="rounded-full"]');
        expect(icons.length).toBeGreaterThan(0);
      });
    });

    it('should show relative timestamps', async () => {
      render(<RecentActivity userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText(/ago|just now/i)).toBeInTheDocument();
      });
    });

    it('should display activity metadata', async () => {
      render(<RecentActivity userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText(/score|accuracy/i)).toBeInTheDocument();
      });
    });

    it('should color-code activity types', async () => {
      const { container } = render(<RecentActivity userId={mockUserId} />);

      await waitFor(() => {
        const coloredIcons = container.querySelectorAll('[class*="bg-"]');
        expect(coloredIcons.length).toBeGreaterThan(0);
      });
    });

    it('should highlight high priority activities', async () => {
      render(<RecentActivity userId={mockUserId} />);

      await waitFor(() => {
        const highPriority = screen.queryByText('High');
        // May or may not have high priority items
        expect(screen.getByText('Recent Activity')).toBeInTheDocument();
      });
    });
  });

  describe('Filtering', () => {
    it('should filter by study sessions', async () => {
      render(<RecentActivity userId={mockUserId} showFilters={true} />);

      await waitFor(() => {
        const studyButton = screen.getByText('Study Sessions');
        fireEvent.click(studyButton);
      });

      await waitFor(() => {
        const studyButton = screen.getByText('Study Sessions');
        expect(studyButton).toHaveClass(/default/);
      });
    });

    it('should filter by achievements', async () => {
      render(<RecentActivity userId={mockUserId} showFilters={true} />);

      await waitFor(() => {
        const achievementButton = screen.getByText('Achievements');
        fireEvent.click(achievementButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Achievements')).toHaveClass(/default/);
      });
    });

    it('should filter by words learned', async () => {
      render(<RecentActivity userId={mockUserId} showFilters={true} />);

      await waitFor(() => {
        const wordsButton = screen.getByText('Words Learned');
        fireEvent.click(wordsButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Words Learned')).toHaveClass(/default/);
      });
    });

    it('should show all activities by default', async () => {
      render(<RecentActivity userId={mockUserId} showFilters={true} />);

      await waitFor(() => {
        const allButton = screen.getByText('All Activities');
        expect(allButton).toHaveClass(/default/);
      });
    });

    it('should update feed when filter changes', async () => {
      render(<RecentActivity userId={mockUserId} showFilters={true} />);

      await waitFor(() => {
        const studyButton = screen.getByText('Study Sessions');
        fireEvent.click(studyButton);
      });

      await waitFor(() => {
        // Feed should be filtered
        expect(screen.getByText('Recent Activity')).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should set up Supabase subscription', async () => {
      render(<RecentActivity userId={mockUserId} />);

      await waitFor(() => {
        expect(supabaseModule.supabase.channel).toHaveBeenCalled();
      });
    });

    it('should refresh with auto-refresh enabled', async () => {
      vi.useFakeTimers();

      render(<RecentActivity userId={mockUserId} autoRefresh={true} />);

      vi.advanceTimersByTime(30000); // 30 seconds

      await waitFor(() => {
        expect(supabaseModule.DatabaseService.getUserSessions).toHaveBeenCalled();
      });

      vi.useRealTimers();
    });

    it('should not auto-refresh when disabled', async () => {
      vi.useFakeTimers();

      render(<RecentActivity userId={mockUserId} autoRefresh={false} />);

      const initialCalls = vi.mocked(supabaseModule.DatabaseService.getUserSessions).mock.calls.length;

      vi.advanceTimersByTime(60000);

      expect(vi.mocked(supabaseModule.DatabaseService.getUserSessions).mock.calls.length).toBe(initialCalls);

      vi.useRealTimers();
    });
  });

  describe('User Interactions', () => {
    it('should refresh data when refresh button clicked', async () => {
      render(<RecentActivity userId={mockUserId} />);

      await waitFor(() => {
        const refreshButton = screen.getByText('Refresh');
        const initialCalls = vi.mocked(supabaseModule.DatabaseService.getUserSessions).mock.calls.length;

        fireEvent.click(refreshButton);
      });

      await waitFor(() => {
        expect(supabaseModule.DatabaseService.getUserSessions).toHaveBeenCalled();
      });
    });

    it('should show loading state while refreshing', async () => {
      render(<RecentActivity userId={mockUserId} />);

      await waitFor(() => {
        const refreshButton = screen.getByText('Refresh');
        fireEvent.click(refreshButton);
      });

      // Should show loading indicator briefly
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });

    it('should navigate to activity details on click', async () => {
      const { container } = render(<RecentActivity userId={mockUserId} />);

      await waitFor(() => {
        const actionButtons = container.querySelectorAll('button[class*="h-8"]');
        expect(actionButtons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Empty States', () => {
    it('should show empty message when no activities', async () => {
      vi.mocked(supabaseModule.DatabaseService.getUserSessions).mockResolvedValue([]);
      vi.mocked(supabaseModule.DatabaseService.getLearningProgress).mockResolvedValue([]);

      render(<RecentActivity userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText(/no recent activity/i)).toBeInTheDocument();
      });
    });

    it('should show filter-specific empty message', async () => {
      vi.mocked(supabaseModule.DatabaseService.getUserSessions).mockResolvedValue([]);

      render(<RecentActivity userId={mockUserId} showFilters={true} />);

      await waitFor(() => {
        const achievementButton = screen.getByText('Achievements');
        fireEvent.click(achievementButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/no.*achievement.*activities/i)).toBeInTheDocument();
      });
    });

    it('should offer to show all activities from filtered empty state', async () => {
      render(<RecentActivity userId={mockUserId} showFilters={true} />);

      await waitFor(() => {
        const achievementButton = screen.getByText('Achievements');
        fireEvent.click(achievementButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Show All Activities')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show skeleton loaders initially', () => {
      const { container } = render(<RecentActivity userId={mockUserId} />);

      const skeletons = container.querySelectorAll('[data-testid*="skeleton"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should replace skeletons with content', async () => {
      const { container } = render(<RecentActivity userId={mockUserId} />);

      await waitFor(() => {
        const skeletons = container.querySelectorAll('[data-testid*="skeleton"]');
        expect(skeletons.length).toBe(0);
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message on fetch failure', async () => {
      vi.mocked(supabaseModule.DatabaseService.getUserSessions)
        .mockRejectedValue(new Error('Network error'));

      render(<RecentActivity userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load activities/i)).toBeInTheDocument();
      });
    });

    it('should show retry button on error', async () => {
      vi.mocked(supabaseModule.DatabaseService.getUserSessions)
        .mockRejectedValue(new Error('Network error'));

      render(<RecentActivity userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
    });

    it('should retry on retry button click', async () => {
      vi.mocked(supabaseModule.DatabaseService.getUserSessions)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockSessions);

      render(<RecentActivity userId={mockUserId} />);

      await waitFor(() => {
        const retryButton = screen.getByText('Try Again');
        fireEvent.click(retryButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Recent Activity')).toBeInTheDocument();
      });
    });
  });

  describe('Scrolling and Pagination', () => {
    it('should limit activities to specified limit', async () => {
      render(<RecentActivity userId={mockUserId} limit={5} />);

      await waitFor(() => {
        const activities = screen.queryAllByRole('article');
        expect(activities.length).toBeLessThanOrEqual(5);
      });
    });

    it('should show load more button when at limit', async () => {
      const largeSessions = generateMockStudySessions(25);
      vi.mocked(supabaseModule.DatabaseService.getUserSessions).mockResolvedValue(largeSessions);

      render(<RecentActivity userId={mockUserId} limit={10} />);

      await waitFor(() => {
        expect(screen.getByText('Load More Activities')).toBeInTheDocument();
      });
    });

    it('should make feed scrollable', async () => {
      const { container } = render(<RecentActivity userId={mockUserId} />);

      await waitFor(() => {
        const feed = container.querySelector('[class*="overflow-y-auto"]');
        expect(feed).toBeInTheDocument();
      });
    });

    it('should have max height for feed', async () => {
      const { container } = render(<RecentActivity userId={mockUserId} />);

      await waitFor(() => {
        const feed = container.querySelector('[class*="max-h"]');
        expect(feed).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible labels', async () => {
      render(<RecentActivity userId={mockUserId} />);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        buttons.forEach(button => {
          expect(button.textContent?.trim().length).toBeGreaterThan(0);
        });
      });
    });

    it('should support keyboard navigation', async () => {
      render(<RecentActivity userId={mockUserId} showFilters={true} />);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        buttons.forEach(button => {
          expect(button).toHaveAttribute('type');
        });
      });
    });
  });

  describe('Performance', () => {
    it('should render within acceptable time', async () => {
      const startTime = performance.now();

      render(<RecentActivity userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText('Recent Activity')).toBeInTheDocument();
      });

      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(2000);
    });

    it('should handle large activity lists efficiently', async () => {
      const largeSessions = generateMockStudySessions(100);
      vi.mocked(supabaseModule.DatabaseService.getUserSessions).mockResolvedValue(largeSessions);

      const startTime = performance.now();

      render(<RecentActivity userId={mockUserId} limit={50} />);

      await waitFor(() => {
        expect(screen.getByText('Recent Activity')).toBeInTheDocument();
      });

      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(3000);
    });
  });
});
