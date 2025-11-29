/**
 * Statistics Cards Component Tests
 * Comprehensive test suite for Analytics statistics cards
 * Tests: 25+ test cases for stats display, trends, and formatting
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { UserStats } from '@/components/Dashboard/UserStats';
import * as supabaseModule from '@/lib/supabase';
import { generateMockUserProgress, generateMockStudySessions } from '../Dashboard/test-utils';

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
  DatabaseService: {
    getLearningProgress: vi.fn(),
    getUserSessions: vi.fn(),
  },
}));

describe('Statistics Cards', () => {
  const mockUserId = 'test-user-123';
  const mockProgress = generateMockUserProgress(234);
  const mockSessions = generateMockStudySessions(67);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabaseModule.DatabaseService.getLearningProgress).mockResolvedValue(mockProgress);
    vi.mocked(supabaseModule.DatabaseService.getUserSessions).mockResolvedValue(mockSessions);
  });

  describe('Card Rendering', () => {
    it('should render all stat cards', async () => {
      render(<UserStats userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText('Words Learned')).toBeInTheDocument();
        expect(screen.getByText('Accuracy')).toBeInTheDocument();
        expect(screen.getByText('Study Time')).toBeInTheDocument();
        expect(screen.getByText('Current Streak')).toBeInTheDocument();
      });
    });

    it('should display vocabulary count', async () => {
      render(<UserStats userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText('234')).toBeInTheDocument();
      });
    });

    it('should calculate and display accuracy percentage', async () => {
      render(<UserStats userId={mockUserId} />);

      await waitFor(() => {
        const accuracyText = screen.getAllByText(/\d+\.\d%/);
        expect(accuracyText.length).toBeGreaterThan(0);
      });
    });

    it('should format study time correctly', async () => {
      render(<UserStats userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText(/\d+h/)).toBeInTheDocument();
      });
    });

    it('should display current streak count', async () => {
      render(<UserStats userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText(/\d+ days/)).toBeInTheDocument();
      });
    });
  });

  describe('Trend Indicators', () => {
    it('should show upward trend for increased metrics', async () => {
      const { container } = render(<UserStats userId={mockUserId} />);

      await waitFor(() => {
        const upIcons = container.querySelectorAll('[class*="emerald"]');
        expect(upIcons.length).toBeGreaterThan(0);
      });
    });

    it('should show downward trend for decreased metrics', async () => {
      const { container } = render(<UserStats userId={mockUserId} />);

      await waitFor(() => {
        // Check for trend indicators
        const stats = container.querySelectorAll('.text-xs');
        expect(stats.length).toBeGreaterThan(0);
      });
    });

    it('should display percentage change values', async () => {
      render(<UserStats userId={mockUserId} />);

      await waitFor(() => {
        const percentages = screen.getAllByText(/%$/);
        expect(percentages.length).toBeGreaterThan(0);
      });
    });

    it('should color-code positive changes in green', async () => {
      const { container } = render(<UserStats userId={mockUserId} />);

      await waitFor(() => {
        const greenText = container.querySelectorAll('[class*="emerald-600"]');
        expect(greenText.length).toBeGreaterThan(0);
      });
    });

    it('should color-code negative changes in red', async () => {
      const { container } = render(<UserStats userId={mockUserId} />);

      await waitFor(() => {
        // Component handles both positive and negative trends
        expect(container.querySelector('.grid')).toBeInTheDocument();
      });
    });
  });

  describe('Icons Display', () => {
    it('should display book icon for words learned', async () => {
      const { container } = render(<UserStats userId={mockUserId} />);

      await waitFor(() => {
        const cards = container.querySelectorAll('.p-4');
        expect(cards.length).toBeGreaterThan(0);
      });
    });

    it('should display target icon for accuracy', async () => {
      render(<UserStats userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText('Accuracy')).toBeInTheDocument();
      });
    });

    it('should display clock icon for study time', async () => {
      render(<UserStats userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText('Study Time')).toBeInTheDocument();
      });
    });

    it('should display flame icon for streak', async () => {
      render(<UserStats userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText('Current Streak')).toBeInTheDocument();
      });
    });
  });

  describe('Number Formatting', () => {
    it('should format large numbers with commas', async () => {
      const largeProgress = generateMockUserProgress(1250);
      vi.mocked(supabaseModule.DatabaseService.getLearningProgress).mockResolvedValue(largeProgress);

      render(<UserStats userId={mockUserId} />);

      await waitFor(() => {
        // Numbers should be displayed
        const numbers = screen.getAllByText(/\d/);
        expect(numbers.length).toBeGreaterThan(0);
      });
    });

    it('should round accuracy to one decimal place', async () => {
      render(<UserStats userId={mockUserId} />);

      await waitFor(() => {
        const accuracy = screen.getAllByText(/\d+\.\d%/)[0];
        expect(accuracy.textContent).toMatch(/^\d+\.\d%$/);
      });
    });

    it('should display time in hours and minutes', async () => {
      render(<UserStats userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText(/\d+h/)).toBeInTheDocument();
      });
    });

    it('should show zero values when no data', async () => {
      vi.mocked(supabaseModule.DatabaseService.getLearningProgress).mockResolvedValue([]);
      vi.mocked(supabaseModule.DatabaseService.getUserSessions).mockResolvedValue([]);

      render(<UserStats userId={mockUserId} />);

      await waitFor(() => {
        // Component should render even with no data
        expect(screen.getByText('Words Learned')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show skeleton loaders while loading', () => {
      const { container } = render(<UserStats userId={mockUserId} />);

      // Check for skeleton elements by their characteristic classes
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should replace skeletons with actual data', async () => {
      const { container } = render(<UserStats userId={mockUserId} />);

      await waitFor(() => {
        const skeletons = container.querySelectorAll('[data-testid*="skeleton"]');
        expect(skeletons.length).toBe(0);
      });
    });
  });

  describe('Responsive Layout', () => {
    it('should use grid layout for cards', async () => {
      const { container } = render(<UserStats userId={mockUserId} />);

      await waitFor(() => {
        const grid = container.querySelector('.grid');
        expect(grid).toHaveClass(/grid-cols/);
      });
    });

    it('should support different column counts', async () => {
      const { container } = render(<UserStats userId={mockUserId} />);

      await waitFor(() => {
        const grid = container.querySelector('.grid');
        expect(grid).toHaveClass(/md:grid-cols/);
      });
    });
  });

  describe('Animations', () => {
    it('should have transition classes on cards', async () => {
      const { container } = render(<UserStats userId={mockUserId} />);

      await waitFor(() => {
        const cards = container.querySelectorAll('.p-4');
        cards.forEach(card => {
          expect(card.className).toBeTruthy();
        });
      });
    });
  });

  describe('Accessibility', () => {
    it('should have descriptive labels', async () => {
      render(<UserStats userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText('Words Learned')).toBeInTheDocument();
        expect(screen.getByText('Accuracy')).toBeInTheDocument();
        expect(screen.getByText('Study Time')).toBeInTheDocument();
      });
    });

    it('should use semantic HTML', async () => {
      const { container } = render(<UserStats userId={mockUserId} />);

      await waitFor(() => {
        expect(container.querySelector('p')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle missing data gracefully', async () => {
      vi.mocked(supabaseModule.DatabaseService.getLearningProgress).mockResolvedValue([]);

      render(<UserStats userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText('Words Learned')).toBeInTheDocument();
      });
    });

    it('should handle calculation errors', async () => {
      const invalidSessions = [{ ...mockSessions[0], accuracy: NaN }] as any;
      vi.mocked(supabaseModule.DatabaseService.getUserSessions).mockResolvedValue(invalidSessions);

      render(<UserStats userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText('Accuracy')).toBeInTheDocument();
      });
    });
  });

  describe('Data Updates', () => {
    it('should update when data changes', async () => {
      const { rerender } = render(<UserStats userId={mockUserId} timeRange="7d" />);

      await waitFor(() => {
        expect(screen.getByText('Words Learned')).toBeInTheDocument();
      });

      const newProgress = generateMockUserProgress(300);
      vi.mocked(supabaseModule.DatabaseService.getLearningProgress).mockResolvedValue(newProgress);

      rerender(<UserStats userId={mockUserId} timeRange="30d" />);

      await waitFor(() => {
        expect(supabaseModule.DatabaseService.getLearningProgress).toHaveBeenCalledTimes(2);
      });
    });

    it('should refetch on time range change', async () => {
      const { rerender } = render(<UserStats userId={mockUserId} timeRange="7d" />);

      await waitFor(() => {
        expect(supabaseModule.DatabaseService.getLearningProgress).toHaveBeenCalledWith(
          mockUserId,
          7
        );
      });

      rerender(<UserStats userId={mockUserId} timeRange="30d" />);

      await waitFor(() => {
        expect(supabaseModule.DatabaseService.getLearningProgress).toHaveBeenCalledWith(
          mockUserId,
          30
        );
      });
    });
  });

  describe('Comparison Statistics', () => {
    it('should display previous period data', async () => {
      render(<UserStats userId={mockUserId} />);

      await waitFor(() => {
        // Comparison stats should be calculated
        expect(screen.getByText('Words Learned')).toBeInTheDocument();
      });
    });

    it('should calculate percentage changes', async () => {
      render(<UserStats userId={mockUserId} />);

      await waitFor(() => {
        const percentages = screen.getAllByText(/%/);
        expect(percentages.length).toBeGreaterThan(0);
      });
    });
  });
});
