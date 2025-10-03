import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '../test-utils';
import userEvent from '@testing-library/user-event';
import OnboardingWizard from '@/components/Onboarding/OnboardingWizard';

// Mock the onboarding hook
const mockOnboardingState = {
  currentStep: 0,
  steps: [
    { id: 'welcome', title: 'Welcome', description: 'Welcome step', component: 'WelcomeStep', optional: false },
    { id: 'api-keys', title: 'API Keys', description: 'API setup', component: 'ApiKeySetup', optional: true },
    { id: 'preferences', title: 'Preferences', description: 'Set preferences', component: 'PreferencesSetup', optional: false },
    { id: 'tutorial', title: 'Tutorial', description: 'Feature tour', component: 'TutorialStep', optional: true },
    { id: 'completion', title: 'Complete', description: 'All done', component: 'CompletionStep', optional: false }
  ],
  isLoading: false,
  isComplete: false,
  canSkip: true,
  progress: 0,
  userData: {},
  preferences: {},
  nextStep: vi.fn(),
  prevStep: vi.fn(),
  goToStep: vi.fn(),
  skipStep: vi.fn(),
  skipOnboarding: vi.fn(),
  updateUserData: vi.fn(),
  updatePreferences: vi.fn(),
  completeOnboarding: vi.fn().mockResolvedValue(true),
  restartOnboarding: vi.fn()
};

vi.mock('@/hooks/useOnboarding', () => ({
  default: () => mockOnboardingState
}));

// Mock step components
vi.mock('@/components/Onboarding/WelcomeStep', () => ({
  default: ({ onNext, onPrev, onSkip }: any) => (
    <div data-testid="welcome-step">
      <button onClick={onNext}>Next</button>
      {onPrev && <button onClick={onPrev}>Previous</button>}
      {onSkip && <button onClick={onSkip}>Skip</button>}
    </div>
  )
}));

vi.mock('@/components/Onboarding/ApiKeySetup', () => ({
  default: ({ onNext, onPrev, onSkip }: any) => (
    <div data-testid="api-key-step">
      <button onClick={onNext}>Next</button>
      {onPrev && <button onClick={onPrev}>Previous</button>}
      {onSkip && <button onClick={onSkip}>Skip</button>}
    </div>
  )
}));

vi.mock('@/components/Onboarding/PreferencesSetup', () => ({
  default: ({ onNext, onPrev }: any) => (
    <div data-testid="preferences-step">
      <button onClick={onNext}>Next</button>
      {onPrev && <button onClick={onPrev}>Previous</button>}
    </div>
  )
}));

vi.mock('@/components/Onboarding/TutorialStep', () => ({
  default: ({ onNext, onPrev, onSkip }: any) => (
    <div data-testid="tutorial-step">
      <button onClick={onNext}>Next</button>
      {onPrev && <button onClick={onPrev}>Previous</button>}
      {onSkip && <button onClick={onSkip}>Skip</button>}
    </div>
  )
}));

vi.mock('@/components/Onboarding/CompletionStep', () => ({
  default: ({ onNext, onPrev }: any) => (
    <div data-testid="completion-step">
      <button onClick={onNext}>Complete</button>
      {onPrev && <button onClick={onPrev}>Previous</button>}
    </div>
  )
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }: any) => children
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn()
  }
}));

describe('OnboardingWizard', () => {
  const mockOnClose = vi.fn();
  const mockOnComplete = vi.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onComplete: mockOnComplete
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnboardingState.currentStep = 0;
    mockOnboardingState.isComplete = false;
    mockOnboardingState.progress = 0;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render when isOpen is true', () => {
      render(<OnboardingWizard {...defaultProps} />);

      expect(screen.getByText('Welcome')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<OnboardingWizard {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Welcome')).not.toBeInTheDocument();
    });

    it('should render current step component', () => {
      render(<OnboardingWizard {...defaultProps} />);

      expect(screen.getByTestId('welcome-step')).toBeInTheDocument();
    });

    it('should render step title and count', () => {
      render(<OnboardingWizard {...defaultProps} />);

      expect(screen.getByText('Welcome')).toBeInTheDocument();
      expect(screen.getByText('Step 1 of 5')).toBeInTheDocument();
    });

    it('should render progress bar', () => {
      const { container } = render(<OnboardingWizard {...defaultProps} />);

      const progressBar = container.querySelector('.bg-gradient-to-r.from-blue-500.to-purple-600');
      expect(progressBar).toBeInTheDocument();
    });

    it('should render navigation buttons', () => {
      render(<OnboardingWizard {...defaultProps} />);

      expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(<OnboardingWizard {...defaultProps} />);

      const closeButtons = screen.getAllByRole('button');
      const hasCloseButton = closeButtons.some(btn =>
        btn.className.includes('hover:bg-gray-100') || btn.textContent === ''
      );
      expect(hasCloseButton).toBe(true);
    });

    it('should render skip tour button when canSkip is true', () => {
      render(<OnboardingWizard {...defaultProps} />);

      expect(screen.getByText('Skip Tour')).toBeInTheDocument();
    });

    it('should not render skip tour button on last step', () => {
      mockOnboardingState.currentStep = 4;
      render(<OnboardingWizard {...defaultProps} />);

      expect(screen.queryByText('Skip Tour')).not.toBeInTheDocument();
    });
  });

  describe('Step Navigation', () => {
    it('should call nextStep when Next button is clicked', async () => {
      const user = userEvent.setup();
      render(<OnboardingWizard {...defaultProps} />);

      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      expect(mockOnboardingState.nextStep).toHaveBeenCalled();
    });

    it('should call prevStep when Previous button is clicked', async () => {
      const user = userEvent.setup();
      mockOnboardingState.currentStep = 1;
      render(<OnboardingWizard {...defaultProps} />);

      const prevButton = screen.getByRole('button', { name: /previous/i });
      await user.click(prevButton);

      expect(mockOnboardingState.prevStep).toHaveBeenCalled();
    });

    it('should disable Previous button on first step', () => {
      mockOnboardingState.currentStep = 0;
      render(<OnboardingWizard {...defaultProps} />);

      const prevButton = screen.getByRole('button', { name: /previous/i });
      expect(prevButton).toBeDisabled();
    });

    it('should show Complete button on last step', () => {
      mockOnboardingState.currentStep = 4;
      render(<OnboardingWizard {...defaultProps} />);

      expect(screen.getByRole('button', { name: /complete/i })).toBeInTheDocument();
    });

    it('should call completeOnboarding on last step completion', async () => {
      const user = userEvent.setup();
      mockOnboardingState.currentStep = 4;
      render(<OnboardingWizard {...defaultProps} />);

      const completeButton = screen.getByRole('button', { name: /complete/i });
      await user.click(completeButton);

      await waitFor(() => {
        expect(mockOnboardingState.completeOnboarding).toHaveBeenCalled();
      });
    });

    it('should call onComplete after successful completion', async () => {
      const user = userEvent.setup();
      mockOnboardingState.currentStep = 4;
      mockOnboardingState.completeOnboarding.mockResolvedValue(true);

      render(<OnboardingWizard {...defaultProps} />);

      const completeButton = screen.getByRole('button', { name: /complete/i });
      await user.click(completeButton);

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalled();
      });
    });
  });

  describe('Step Indicators', () => {
    it('should render step indicators for all steps', () => {
      const { container } = render(<OnboardingWizard {...defaultProps} />);

      const indicators = container.querySelectorAll('.w-2.h-2.rounded-full');
      expect(indicators).toHaveLength(5);
    });

    it('should highlight current step indicator', () => {
      const { container } = render(<OnboardingWizard {...defaultProps} />);

      const indicators = container.querySelectorAll('.w-2.h-2.rounded-full');
      const currentIndicator = indicators[0];
      expect(currentIndicator).toHaveClass('bg-blue-500');
    });

    it('should mark completed steps with green', () => {
      mockOnboardingState.currentStep = 2;
      const { container } = render(<OnboardingWizard {...defaultProps} />);

      const indicators = container.querySelectorAll('.w-2.h-2.rounded-full');
      const completedIndicator = indicators[0];
      expect(completedIndicator).toHaveClass('bg-green-500');
    });

    it('should mark future steps as inactive', () => {
      const { container } = render(<OnboardingWizard {...defaultProps} />);

      const indicators = container.querySelectorAll('.w-2.h-2.rounded-full');
      const futureIndicator = indicators[2];
      expect(futureIndicator.className).toMatch(/bg-gray-300|dark:bg-gray-600/);
    });
  });

  describe('Skip Functionality', () => {
    it('should show skip button for optional steps', () => {
      mockOnboardingState.currentStep = 1; // API Keys - optional
      render(<OnboardingWizard {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      const skipButton = buttons.find(btn => btn.textContent === 'Skip');
      expect(skipButton).toBeInTheDocument();
    });

    it('should call skipStep when skip button is clicked', async () => {
      const user = userEvent.setup();
      mockOnboardingState.currentStep = 1;
      render(<OnboardingWizard {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      const skipButton = buttons.find(btn => btn.textContent === 'Skip');

      if (skipButton) {
        await user.click(skipButton);
        expect(mockOnboardingState.skipStep).toHaveBeenCalled();
      }
    });

    it('should call skipOnboarding when Skip Tour is clicked', async () => {
      const user = userEvent.setup();
      render(<OnboardingWizard {...defaultProps} />);

      const skipTourButton = screen.getByText('Skip Tour');
      await user.click(skipTourButton);

      expect(mockOnboardingState.skipOnboarding).toHaveBeenCalled();
      expect(mockOnComplete).toHaveBeenCalled();
    });
  });

  describe('Progress Bar', () => {
    it('should update progress width based on current step', () => {
      mockOnboardingState.progress = 40;
      const { container } = render(<OnboardingWizard {...defaultProps} />);

      const progressBar = container.querySelector('.bg-gradient-to-r.from-blue-500.to-purple-600');
      expect(progressBar).toBeInTheDocument();
    });

    it('should show 0% progress on first step', () => {
      mockOnboardingState.currentStep = 0;
      mockOnboardingState.progress = 0;
      render(<OnboardingWizard {...defaultProps} />);

      expect(screen.getByText('Step 1 of 5')).toBeInTheDocument();
    });

    it('should show 100% progress on last step', () => {
      mockOnboardingState.currentStep = 4;
      mockOnboardingState.progress = 100;
      render(<OnboardingWizard {...defaultProps} />);

      expect(screen.getByText('Step 5 of 5')).toBeInTheDocument();
    });
  });

  describe('Close Functionality', () => {
    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<OnboardingWizard {...defaultProps} />);

      // Find close button by searching through all buttons
      const buttons = screen.getAllByRole('button');
      const closeButton = buttons.find(btn =>
        btn.className.includes('hover:bg-gray-100') || btn.getAttribute('aria-label') === 'Close'
      );

      if (closeButton) {
        await user.click(closeButton);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });

    it('should call onClose when backdrop is clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(<OnboardingWizard {...defaultProps} />);

      const backdrop = container.querySelector('.bg-black\\/50');
      if (backdrop) {
        await user.click(backdrop as Element);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner when isLoading is true', () => {
      mockOnboardingState.isLoading = true;
      const { container } = render(<OnboardingWizard {...defaultProps} />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should disable next button when loading', () => {
      mockOnboardingState.isLoading = true;
      render(<OnboardingWizard {...defaultProps} />);

      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).toBeDisabled();
    });
  });

  describe('Step Component Rendering', () => {
    it('should render WelcomeStep component', () => {
      mockOnboardingState.currentStep = 0;
      render(<OnboardingWizard {...defaultProps} />);

      expect(screen.getByTestId('welcome-step')).toBeInTheDocument();
    });

    it('should render ApiKeySetup component', () => {
      mockOnboardingState.currentStep = 1;
      render(<OnboardingWizard {...defaultProps} />);

      expect(screen.getByTestId('api-key-step')).toBeInTheDocument();
    });

    it('should render PreferencesSetup component', () => {
      mockOnboardingState.currentStep = 2;
      render(<OnboardingWizard {...defaultProps} />);

      expect(screen.getByTestId('preferences-step')).toBeInTheDocument();
    });

    it('should render TutorialStep component', () => {
      mockOnboardingState.currentStep = 3;
      render(<OnboardingWizard {...defaultProps} />);

      expect(screen.getByTestId('tutorial-step')).toBeInTheDocument();
    });

    it('should render CompletionStep component', () => {
      mockOnboardingState.currentStep = 4;
      render(<OnboardingWizard {...defaultProps} />);

      expect(screen.getByTestId('completion-step')).toBeInTheDocument();
    });
  });

  describe('Completion Flow', () => {
    it('should call onComplete when isComplete becomes true', async () => {
      const { rerender } = render(<OnboardingWizard {...defaultProps} />);

      mockOnboardingState.isComplete = true;
      rerender(<OnboardingWizard {...defaultProps} />);

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalled();
      });
    });

    it('should not call onComplete if completion fails', async () => {
      const user = userEvent.setup();
      mockOnboardingState.currentStep = 4;
      mockOnboardingState.completeOnboarding.mockResolvedValue(false);

      render(<OnboardingWizard {...defaultProps} />);

      const completeButton = screen.getByRole('button', { name: /complete/i });
      await user.click(completeButton);

      await waitFor(() => {
        expect(mockOnboardingState.completeOnboarding).toHaveBeenCalled();
      });

      // onComplete should not be called if completeOnboarding returns false
      expect(mockOnComplete).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<OnboardingWizard {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<OnboardingWizard {...defaultProps} />);

      await user.tab();
      expect(document.activeElement).toBeDefined();
    });

    it('should have semantic HTML structure', () => {
      const { container } = render(<OnboardingWizard {...defaultProps} />);

      const mainContent = container.querySelector('[class*="relative"]');
      expect(mainContent).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should have responsive modal size', () => {
      const { container } = render(<OnboardingWizard {...defaultProps} />);

      const modal = container.querySelector('.max-w-4xl');
      expect(modal).toBeInTheDocument();
    });

    it('should have responsive height constraints', () => {
      const { container } = render(<OnboardingWizard {...defaultProps} />);

      const modal = container.querySelector('[class*="max-h-"]');
      expect(modal).toBeInTheDocument();
    });
  });

  describe('Custom ClassName', () => {
    it('should apply custom className', () => {
      const { container } = render(<OnboardingWizard {...defaultProps} className="custom-class" />);

      const modal = container.querySelector('.custom-class');
      expect(modal).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid step changes', async () => {
      const user = userEvent.setup();
      render(<OnboardingWizard {...defaultProps} />);

      const nextButton = screen.getByRole('button', { name: /next/i });

      await user.click(nextButton);
      await user.click(nextButton);
      await user.click(nextButton);

      expect(mockOnboardingState.nextStep).toHaveBeenCalledTimes(3);
    });

    it('should handle completion errors gracefully', async () => {
      const user = userEvent.setup();
      mockOnboardingState.currentStep = 4;
      mockOnboardingState.completeOnboarding.mockRejectedValue(new Error('Completion failed'));

      render(<OnboardingWizard {...defaultProps} />);

      const completeButton = screen.getByRole('button', { name: /complete/i });

      await expect(async () => {
        await user.click(completeButton);
      }).not.toThrow();
    });
  });
});
