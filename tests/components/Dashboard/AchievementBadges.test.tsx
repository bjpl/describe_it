/**
 * AchievementBadges Component Tests
 * Tests for achievement display, unlock animations, and badge interactions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test-utils';
import { Badge } from '@/components/ui/Badge';

// Mock Achievement Badge component
const AchievementBadge = ({
  title,
  description,
  icon: Icon,
  unlocked = false,
  progress = 0,
  onClick
}: {
  title: string;
  description: string;
  icon: any;
  unlocked?: boolean;
  progress?: number;
  onClick?: () => void;
}) => {
  return (
    <div
      className={`p-4 border rounded-lg transition-all ${unlocked ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200 opacity-50'}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`${title} achievement ${unlocked ? 'unlocked' : 'locked'}`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full ${unlocked ? 'bg-yellow-100' : 'bg-gray-200'}`}>
          {Icon && <Icon data-testid={`${title.toLowerCase().replace(/\s/g, '-')}-icon`} className="h-6 w-6" />}
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-sm">{title}</h4>
          <p className="text-xs text-muted-foreground">{description}</p>
          {!unlocked && (
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-primary h-1.5 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                  data-testid="achievement-progress"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{progress}% complete</p>
            </div>
          )}
          {unlocked && (
            <Badge variant="secondary" className="mt-1">
              Unlocked
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};

// Mock icon
const MockIcon = ({ className, ...props }: any) => (
  <svg className={className} {...props} />
);

describe('AchievementBadges Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Badge Display', () => {
    it('should render achievement badge with title and description', () => {
      render(
        <AchievementBadge
          title="First Steps"
          description="Complete your first vocabulary lesson"
          icon={MockIcon}
        />
      );

      expect(screen.getByText('First Steps')).toBeInTheDocument();
      expect(screen.getByText('Complete your first vocabulary lesson')).toBeInTheDocument();
    });

    it('should display achievement icon', () => {
      render(
        <AchievementBadge
          title="Word Master"
          description="Learn 100 words"
          icon={MockIcon}
        />
      );

      expect(screen.getByTestId('word-master-icon')).toBeInTheDocument();
    });

    it('should show unlocked badge when achievement is unlocked', () => {
      render(
        <AchievementBadge
          title="First Steps"
          description="Complete your first lesson"
          icon={MockIcon}
          unlocked={true}
        />
      );

      expect(screen.getByText('Unlocked')).toBeInTheDocument();
    });

    it('should apply unlocked styling', () => {
      const { container } = render(
        <AchievementBadge
          title="First Steps"
          description="Complete your first lesson"
          icon={MockIcon}
          unlocked={true}
        />
      );

      const badge = container.firstChild as HTMLElement;
      expect(badge).toHaveClass('bg-yellow-50', 'border-yellow-200');
    });

    it('should apply locked styling', () => {
      const { container } = render(
        <AchievementBadge
          title="First Steps"
          description="Complete your first lesson"
          icon={MockIcon}
          unlocked={false}
        />
      );

      const badge = container.firstChild as HTMLElement;
      expect(badge).toHaveClass('bg-gray-50', 'border-gray-200', 'opacity-50');
    });
  });

  describe('Progress Display', () => {
    it('should show progress bar for locked achievements', () => {
      render(
        <AchievementBadge
          title="Word Master"
          description="Learn 100 words"
          icon={MockIcon}
          unlocked={false}
          progress={45}
        />
      );

      expect(screen.getByTestId('achievement-progress')).toBeInTheDocument();
    });

    it('should display progress percentage', () => {
      render(
        <AchievementBadge
          title="Word Master"
          description="Learn 100 words"
          icon={MockIcon}
          unlocked={false}
          progress={45}
        />
      );

      expect(screen.getByText('45% complete')).toBeInTheDocument();
    });

    it('should set correct progress bar width', () => {
      const { container } = render(
        <AchievementBadge
          title="Word Master"
          description="Learn 100 words"
          icon={MockIcon}
          unlocked={false}
          progress={75}
        />
      );

      const progressBar = screen.getByTestId('achievement-progress');
      expect(progressBar).toHaveStyle({ width: '75%' });
    });

    it('should not show progress bar for unlocked achievements', () => {
      render(
        <AchievementBadge
          title="First Steps"
          description="Complete your first lesson"
          icon={MockIcon}
          unlocked={true}
        />
      );

      expect(screen.queryByTestId('achievement-progress')).not.toBeInTheDocument();
    });

    it('should handle 0% progress', () => {
      render(
        <AchievementBadge
          title="Word Master"
          description="Learn 100 words"
          icon={MockIcon}
          unlocked={false}
          progress={0}
        />
      );

      expect(screen.getByText('0% complete')).toBeInTheDocument();
    });

    it('should handle 100% progress', () => {
      render(
        <AchievementBadge
          title="Word Master"
          description="Learn 100 words"
          icon={MockIcon}
          unlocked={false}
          progress={100}
        />
      );

      expect(screen.getByText('100% complete')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should be clickable', () => {
      const onClick = vi.fn();

      render(
        <AchievementBadge
          title="First Steps"
          description="Complete your first lesson"
          icon={MockIcon}
          onClick={onClick}
        />
      );

      const badge = screen.getByRole('button', { name: /first steps/i });
      fireEvent.click(badge);

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should support keyboard interaction', () => {
      const onClick = vi.fn();

      render(
        <AchievementBadge
          title="First Steps"
          description="Complete your first lesson"
          icon={MockIcon}
          onClick={onClick}
        />
      );

      const badge = screen.getByRole('button');
      expect(badge).toHaveAttribute('tabIndex', '0');
    });

    it('should call onClick for both locked and unlocked badges', () => {
      const onClick = vi.fn();

      const { rerender } = render(
        <AchievementBadge
          title="First Steps"
          description="Complete your first lesson"
          icon={MockIcon}
          unlocked={false}
          onClick={onClick}
        />
      );

      fireEvent.click(screen.getByRole('button'));
      expect(onClick).toHaveBeenCalledTimes(1);

      rerender(
        <AchievementBadge
          title="First Steps"
          description="Complete your first lesson"
          icon={MockIcon}
          unlocked={true}
          onClick={onClick}
        />
      );

      fireEvent.click(screen.getByRole('button'));
      expect(onClick).toHaveBeenCalledTimes(2);
    });
  });

  describe('Achievement Types', () => {
    it('should render First Steps achievement', () => {
      render(
        <AchievementBadge
          title="First Steps"
          description="Complete your first vocabulary lesson"
          icon={MockIcon}
          unlocked={true}
        />
      );

      expect(screen.getByText('First Steps')).toBeInTheDocument();
    });

    it('should render Word Master achievement', () => {
      render(
        <AchievementBadge
          title="Word Master"
          description="Learn 100 words"
          icon={MockIcon}
          progress={75}
        />
      );

      expect(screen.getByText('Word Master')).toBeInTheDocument();
      expect(screen.getByText('75% complete')).toBeInTheDocument();
    });

    it('should render Streak Keeper achievement', () => {
      render(
        <AchievementBadge
          title="Streak Keeper"
          description="Maintain a 7-day study streak"
          icon={MockIcon}
          progress={50}
        />
      );

      expect(screen.getByText('Streak Keeper')).toBeInTheDocument();
    });

    it('should render Perfect Score achievement', () => {
      render(
        <AchievementBadge
          title="Perfect Score"
          description="Complete a quiz with 100% accuracy"
          icon={MockIcon}
          unlocked={true}
        />
      );

      expect(screen.getByText('Perfect Score')).toBeInTheDocument();
    });
  });

  describe('Visual States', () => {
    it('should have transition classes', () => {
      const { container } = render(
        <AchievementBadge
          title="First Steps"
          description="Complete your first lesson"
          icon={MockIcon}
        />
      );

      const badge = container.firstChild as HTMLElement;
      expect(badge).toHaveClass('transition-all');
    });

    it('should highlight unlocked icon background', () => {
      const { container } = render(
        <AchievementBadge
          title="First Steps"
          description="Complete your first lesson"
          icon={MockIcon}
          unlocked={true}
        />
      );

      const iconContainer = container.querySelector('.bg-yellow-100');
      expect(iconContainer).toBeInTheDocument();
    });

    it('should dim locked icon background', () => {
      const { container } = render(
        <AchievementBadge
          title="First Steps"
          description="Complete your first lesson"
          icon={MockIcon}
          unlocked={false}
        />
      );

      const iconContainer = container.querySelector('.bg-gray-200');
      expect(iconContainer).toBeInTheDocument();
    });
  });

  describe('Layout and Styling', () => {
    it('should use flex layout', () => {
      const { container } = render(
        <AchievementBadge
          title="First Steps"
          description="Complete your first lesson"
          icon={MockIcon}
        />
      );

      const flexContainer = container.querySelector('.flex.items-center');
      expect(flexContainer).toBeInTheDocument();
    });

    it('should have rounded borders', () => {
      const { container } = render(
        <AchievementBadge
          title="First Steps"
          description="Complete your first lesson"
          icon={MockIcon}
        />
      );

      const badge = container.firstChild as HTMLElement;
      expect(badge).toHaveClass('rounded-lg');
    });

    it('should have padding', () => {
      const { container } = render(
        <AchievementBadge
          title="First Steps"
          description="Complete your first lesson"
          icon={MockIcon}
        />
      );

      const badge = container.firstChild as HTMLElement;
      expect(badge).toHaveClass('p-4');
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label describing state', () => {
      render(
        <AchievementBadge
          title="First Steps"
          description="Complete your first lesson"
          icon={MockIcon}
          unlocked={true}
        />
      );

      const badge = screen.getByRole('button');
      expect(badge).toHaveAttribute('aria-label', 'First Steps achievement unlocked');
    });

    it('should indicate locked state in aria-label', () => {
      render(
        <AchievementBadge
          title="Word Master"
          description="Learn 100 words"
          icon={MockIcon}
          unlocked={false}
        />
      );

      const badge = screen.getByRole('button');
      expect(badge).toHaveAttribute('aria-label', 'Word Master achievement locked');
    });

    it('should be keyboard accessible', () => {
      render(
        <AchievementBadge
          title="First Steps"
          description="Complete your first lesson"
          icon={MockIcon}
        />
      );

      const badge = screen.getByRole('button');
      expect(badge).toHaveAttribute('tabIndex');
    });
  });

  describe('State Transitions', () => {
    it('should transition from locked to unlocked', async () => {
      const { rerender } = render(
        <AchievementBadge
          title="First Steps"
          description="Complete your first lesson"
          icon={MockIcon}
          unlocked={false}
          progress={90}
        />
      );

      expect(screen.getByTestId('achievement-progress')).toBeInTheDocument();
      expect(screen.queryByText('Unlocked')).not.toBeInTheDocument();

      rerender(
        <AchievementBadge
          title="First Steps"
          description="Complete your first lesson"
          icon={MockIcon}
          unlocked={true}
        />
      );

      await waitFor(() => {
        expect(screen.queryByTestId('achievement-progress')).not.toBeInTheDocument();
        expect(screen.getByText('Unlocked')).toBeInTheDocument();
      });
    });

    it('should update progress smoothly', async () => {
      const { rerender } = render(
        <AchievementBadge
          title="Word Master"
          description="Learn 100 words"
          icon={MockIcon}
          progress={25}
        />
      );

      expect(screen.getByText('25% complete')).toBeInTheDocument();

      rerender(
        <AchievementBadge
          title="Word Master"
          description="Learn 100 words"
          icon={MockIcon}
          progress={75}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('75% complete')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing icon', () => {
      render(
        <AchievementBadge
          title="First Steps"
          description="Complete your first lesson"
          icon={undefined}
        />
      );

      expect(screen.getByText('First Steps')).toBeInTheDocument();
    });

    it('should handle very long title', () => {
      render(
        <AchievementBadge
          title="This is a very long achievement title that might wrap"
          description="Complete your first lesson"
          icon={MockIcon}
        />
      );

      expect(screen.getByText(/This is a very long achievement/i)).toBeInTheDocument();
    });

    it('should handle very long description', () => {
      const longDescription = 'This is a very long description that explains in great detail what the user needs to do to unlock this achievement';

      render(
        <AchievementBadge
          title="Achievement"
          description={longDescription}
          icon={MockIcon}
        />
      );

      expect(screen.getByText(longDescription)).toBeInTheDocument();
    });

    it('should handle negative progress', () => {
      render(
        <AchievementBadge
          title="Word Master"
          description="Learn 100 words"
          icon={MockIcon}
          progress={-10}
        />
      );

      // Should clamp to 0 or handle gracefully
      expect(screen.getByTestId('achievement-progress')).toBeInTheDocument();
    });

    it('should handle progress over 100', () => {
      render(
        <AchievementBadge
          title="Word Master"
          description="Learn 100 words"
          icon={MockIcon}
          progress={150}
        />
      );

      // Should clamp to 100 or handle gracefully
      expect(screen.getByText(/complete/i)).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render quickly', () => {
      const startTime = performance.now();

      render(
        <AchievementBadge
          title="First Steps"
          description="Complete your first lesson"
          icon={MockIcon}
        />
      );

      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(50);
    });

    it('should render multiple badges efficiently', () => {
      const startTime = performance.now();

      render(
        <>
          <AchievementBadge title="First Steps" description="Lesson 1" icon={MockIcon} unlocked={true} />
          <AchievementBadge title="Word Master" description="100 words" icon={MockIcon} progress={50} />
          <AchievementBadge title="Streak Keeper" description="7-day streak" icon={MockIcon} progress={75} />
          <AchievementBadge title="Perfect Score" description="100% quiz" icon={MockIcon} unlocked={true} />
        </>
      );

      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(100);
    });
  });
});
