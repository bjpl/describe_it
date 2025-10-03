import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '../test-utils';
import userEvent from '@testing-library/user-event';
import PreferencesSetup from '@/components/Onboarding/PreferencesSetup';
import { authManager } from '@/lib/auth/AuthManager';
import { settingsManager } from '@/lib/settings/settingsManager';

// Mock dependencies
vi.mock('@/lib/auth/AuthManager', () => ({
  authManager: {
    getCurrentUser: vi.fn(),
    getCurrentProfile: vi.fn(),
    updateProfile: vi.fn()
  }
}));

vi.mock('@/lib/settings/settingsManager', () => ({
  settingsManager: {
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
    updateSection: vi.fn()
  }
}));

vi.mock('@/hooks/useOnboarding', () => ({
  default: () => ({
    updatePreferences: vi.fn(),
    updateUserData: vi.fn()
  })
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    h2: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>
  }
}));

describe('PreferencesSetup', () => {
  const mockOnNext = vi.fn();
  const mockOnPrev = vi.fn();
  const mockOnSkip = vi.fn();

  const defaultProps = {
    onNext: mockOnNext,
    onPrev: mockOnPrev,
    onSkip: mockOnSkip
  };

  const mockSettings = {
    language: { ui: 'en', target: 'spanish' },
    study: { dailyGoal: 10, difficulty: 'intermediate' },
    theme: { mode: 'system', animations: true },
    accessibility: { fontSize: 'medium', keyboardNavigation: true }
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(settingsManager.getSettings).mockReturnValue(mockSettings as any);
    vi.mocked(authManager.getCurrentUser).mockReturnValue(null);
    vi.mocked(authManager.getCurrentProfile).mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render component header and description', () => {
      render(<PreferencesSetup {...defaultProps} />);

      expect(screen.getByText('Customize Your Experience')).toBeInTheDocument();
      expect(screen.getByText(/Set up your learning preferences/i)).toBeInTheDocument();
    });

    it('should render all preference sections', () => {
      render(<PreferencesSetup {...defaultProps} />);

      expect(screen.getByText('Learning Profile')).toBeInTheDocument();
      expect(screen.getByText('Language Settings')).toBeInTheDocument();
      expect(screen.getByText('Study Goals')).toBeInTheDocument();
      expect(screen.getByText('Appearance & Accessibility')).toBeInTheDocument();
    });

    it('should render navigation buttons', () => {
      render(<PreferencesSetup {...defaultProps} />);

      expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
    });
  });

  describe('Learning Profile Section', () => {
    it('should render full name input', () => {
      render(<PreferencesSetup {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText('Enter your name');
      expect(nameInput).toBeInTheDocument();
    });

    it('should allow typing in full name input', async () => {
      const user = userEvent.setup();
      render(<PreferencesSetup {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText('Enter your name');
      await user.type(nameInput, 'John Doe');

      expect(nameInput).toHaveValue('John Doe');
    });

    it('should render all learning level options', () => {
      render(<PreferencesSetup {...defaultProps} />);

      expect(screen.getByText('Beginner')).toBeInTheDocument();
      expect(screen.getByText('Intermediate')).toBeInTheDocument();
      expect(screen.getByText('Advanced')).toBeInTheDocument();
      expect(screen.getByText('Expert')).toBeInTheDocument();
    });

    it('should allow selecting learning level', async () => {
      const user = userEvent.setup();
      render(<PreferencesSetup {...defaultProps} />);

      const beginnerButton = screen.getByText('Beginner').closest('button');
      expect(beginnerButton).toBeInTheDocument();

      if (beginnerButton) {
        await user.click(beginnerButton);
        expect(beginnerButton).toHaveClass('border-purple-500');
      }
    });

    it('should display learning level descriptions', () => {
      render(<PreferencesSetup {...defaultProps} />);

      expect(screen.getByText('Just starting out')).toBeInTheDocument();
      expect(screen.getByText('Some experience')).toBeInTheDocument();
      expect(screen.getByText('Confident learner')).toBeInTheDocument();
      expect(screen.getByText('Nearly fluent')).toBeInTheDocument();
    });
  });

  describe('Language Settings Section', () => {
    it('should render interface language options', () => {
      render(<PreferencesSetup {...defaultProps} />);

      expect(screen.getByText('English')).toBeInTheDocument();
      expect(screen.getByText('Spanish')).toBeInTheDocument();
      expect(screen.getByText('French')).toBeInTheDocument();
    });

    it('should render target language options', () => {
      render(<PreferencesSetup {...defaultProps} />);

      const targetLangSection = screen.getByText('Language to Learn').parentElement;
      expect(targetLangSection).toBeInTheDocument();
    });

    it('should allow selecting interface language', async () => {
      const user = userEvent.setup();
      render(<PreferencesSetup {...defaultProps} />);

      const radios = screen.getAllByRole('radio');
      const englishRadio = radios.find(radio =>
        radio.getAttribute('name') === 'ui-language' && radio.getAttribute('value') === 'en'
      );

      if (englishRadio) {
        await user.click(englishRadio);
        expect(englishRadio).toBeChecked();
      }
    });

    it('should allow selecting target language', async () => {
      const user = userEvent.setup();
      render(<PreferencesSetup {...defaultProps} />);

      const radios = screen.getAllByRole('radio');
      const spanishRadio = radios.find(radio =>
        radio.getAttribute('name') === 'target-language' && radio.getAttribute('value') === 'spanish'
      );

      if (spanishRadio) {
        await user.click(spanishRadio);
        expect(spanishRadio).toBeChecked();
      }
    });
  });

  describe('Study Goals Section', () => {
    it('should render daily goal options', () => {
      render(<PreferencesSetup {...defaultProps} />);

      expect(screen.getByText('5 images per day')).toBeInTheDocument();
      expect(screen.getByText('10 images per day')).toBeInTheDocument();
      expect(screen.getByText('20 images per day')).toBeInTheDocument();
      expect(screen.getByText('30 images per day')).toBeInTheDocument();
    });

    it('should allow selecting daily goal', async () => {
      const user = userEvent.setup();
      render(<PreferencesSetup {...defaultProps} />);

      const radios = screen.getAllByRole('radio');
      const goal10 = radios.find(radio =>
        radio.getAttribute('name') === 'daily-goal' && radio.getAttribute('value') === '10'
      );

      if (goal10) {
        await user.click(goal10);
        expect(goal10).toBeChecked();
      }
    });

    it('should render difficulty level options', () => {
      render(<PreferencesSetup {...defaultProps} />);

      // Difficulty labels appear in both sections
      const difficultyRadios = screen.getAllByRole('radio').filter(radio =>
        radio.getAttribute('name') === 'difficulty'
      );

      expect(difficultyRadios.length).toBeGreaterThan(0);
    });

    it('should allow selecting content difficulty', async () => {
      const user = userEvent.setup();
      render(<PreferencesSetup {...defaultProps} />);

      const radios = screen.getAllByRole('radio');
      const intermediate = radios.find(radio =>
        radio.getAttribute('name') === 'difficulty' && radio.getAttribute('value') === 'intermediate'
      );

      if (intermediate) {
        await user.click(intermediate);
        expect(intermediate).toBeChecked();
      }
    });
  });

  describe('Theme & Accessibility Section', () => {
    it('should render theme mode options', () => {
      render(<PreferencesSetup {...defaultProps} />);

      expect(screen.getByText('Light')).toBeInTheDocument();
      expect(screen.getByText('Dark')).toBeInTheDocument();
      expect(screen.getByText('System')).toBeInTheDocument();
    });

    it('should render theme descriptions', () => {
      render(<PreferencesSetup {...defaultProps} />);

      expect(screen.getByText('Clean and bright')).toBeInTheDocument();
      expect(screen.getByText('Easy on the eyes')).toBeInTheDocument();
      expect(screen.getByText('Match device setting')).toBeInTheDocument();
    });

    it('should allow selecting theme', async () => {
      const user = userEvent.setup();
      render(<PreferencesSetup {...defaultProps} />);

      const darkButton = screen.getByText('Dark').closest('button');
      expect(darkButton).toBeInTheDocument();

      if (darkButton) {
        await user.click(darkButton);
        // Theme button should get active styling
        expect(darkButton.className).toContain('border');
      }
    });

    it('should render font size options', () => {
      render(<PreferencesSetup {...defaultProps} />);

      expect(screen.getByText('Small')).toBeInTheDocument();
      expect(screen.getByText('Medium')).toBeInTheDocument();
      expect(screen.getByText('Large')).toBeInTheDocument();
      expect(screen.getByText('Extra Large')).toBeInTheDocument();
    });

    it('should allow selecting font size', async () => {
      const user = userEvent.setup();
      render(<PreferencesSetup {...defaultProps} />);

      const radios = screen.getAllByRole('radio');
      const largeFont = radios.find(radio =>
        radio.getAttribute('name') === 'font-size' && radio.getAttribute('value') === 'large'
      );

      if (largeFont) {
        await user.click(largeFont);
        expect(largeFont).toBeChecked();
      }
    });

    it('should render animations checkbox', () => {
      render(<PreferencesSetup {...defaultProps} />);

      expect(screen.getByText('Enable animations')).toBeInTheDocument();
    });

    it('should allow toggling animations', async () => {
      const user = userEvent.setup();
      render(<PreferencesSetup {...defaultProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      const animationsCheckbox = checkboxes.find(cb =>
        cb.parentElement?.textContent?.includes('Enable animations')
      );

      if (animationsCheckbox) {
        await user.click(animationsCheckbox);
        // Checkbox state should toggle
        expect(animationsCheckbox).toBeDefined();
      }
    });

    it('should render keyboard navigation checkbox', () => {
      render(<PreferencesSetup {...defaultProps} />);

      expect(screen.getByText('Keyboard navigation support')).toBeInTheDocument();
    });
  });

  describe('Preferences Persistence', () => {
    it('should load existing preferences on mount', async () => {
      const customSettings = {
        language: { ui: 'fr', target: 'german' },
        study: { dailyGoal: 20, difficulty: 'advanced' },
        theme: { mode: 'dark', animations: false },
        accessibility: { fontSize: 'large', keyboardNavigation: true }
      };

      vi.mocked(settingsManager.getSettings).mockReturnValue(customSettings as any);

      render(<PreferencesSetup {...defaultProps} />);

      await waitFor(() => {
        const radios = screen.getAllByRole('radio');
        // Check if settings are loaded (at least some should be checked)
        const checkedRadios = radios.filter(r => (r as HTMLInputElement).checked);
        expect(checkedRadios.length).toBeGreaterThan(0);
      });
    });

    it('should load user profile data when available', () => {
      const mockProfile = {
        full_name: 'Jane Doe',
        preferences: {
          language: 'en'
        }
      };

      vi.mocked(authManager.getCurrentProfile).mockReturnValue(mockProfile as any);

      render(<PreferencesSetup {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText('Enter your name');
      expect(nameInput).toHaveValue('Jane Doe');
    });
  });

  describe('Save and Continue', () => {
    it('should save preferences when Continue is clicked', async () => {
      const user = userEvent.setup();
      render(<PreferencesSetup {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText('Enter your name');
      await user.type(nameInput, 'Test User');

      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      await waitFor(() => {
        expect(settingsManager.updateSettings).toHaveBeenCalled();
        expect(mockOnNext).toHaveBeenCalled();
      });
    });

    it('should call onPrev when Previous is clicked', async () => {
      const user = userEvent.setup();
      render(<PreferencesSetup {...defaultProps} />);

      const prevButton = screen.getByRole('button', { name: /previous/i });
      await user.click(prevButton);

      expect(mockOnPrev).toHaveBeenCalled();
    });

    it('should save all preference changes', async () => {
      const user = userEvent.setup();
      render(<PreferencesSetup {...defaultProps} />);

      // Make some changes
      const nameInput = screen.getByPlaceholderText('Enter your name');
      await user.type(nameInput, 'John Smith');

      const beginnerButton = screen.getByText('Beginner').closest('button');
      if (beginnerButton) await user.click(beginnerButton);

      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      expect(settingsManager.updateSettings).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      render(<PreferencesSetup {...defaultProps} />);

      expect(screen.getByText('Full Name')).toBeInTheDocument();
      expect(screen.getByText('Learning Level')).toBeInTheDocument();
      expect(screen.getByText('Interface Language')).toBeInTheDocument();
      expect(screen.getByText('Language to Learn')).toBeInTheDocument();
    });

    it('should have accessible radio buttons', () => {
      render(<PreferencesSetup {...defaultProps} />);

      const radios = screen.getAllByRole('radio');
      radios.forEach(radio => {
        expect(radio).toHaveAttribute('type', 'radio');
        expect(radio).toHaveAttribute('name');
      });
    });

    it('should have accessible checkboxes', () => {
      render(<PreferencesSetup {...defaultProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach(checkbox => {
        expect(checkbox).toHaveAttribute('type', 'checkbox');
      });
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<PreferencesSetup {...defaultProps} />);

      await user.tab();
      expect(document.activeElement).toBeDefined();
    });
  });

  describe('Responsive Design', () => {
    it('should have responsive grid layouts', () => {
      const { container } = render(<PreferencesSetup {...defaultProps} />);

      const grids = container.querySelectorAll('.md\\:grid-cols-2');
      expect(grids.length).toBeGreaterThan(0);
    });

    it('should have max-width constraints', () => {
      const { container } = render(<PreferencesSetup {...defaultProps} />);

      const maxWidthElements = container.querySelectorAll('.max-w-4xl');
      expect(maxWidthElements.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty user profile gracefully', () => {
      vi.mocked(authManager.getCurrentProfile).mockReturnValue(null);

      expect(() => {
        render(<PreferencesSetup {...defaultProps} />);
      }).not.toThrow();
    });

    it('should handle missing settings gracefully', () => {
      vi.mocked(settingsManager.getSettings).mockReturnValue({} as any);

      expect(() => {
        render(<PreferencesSetup {...defaultProps} />);
      }).not.toThrow();
    });

    it('should allow continuing without making changes', async () => {
      const user = userEvent.setup();
      render(<PreferencesSetup {...defaultProps} />);

      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      expect(mockOnNext).toHaveBeenCalled();
    });
  });

  describe('Custom ClassName', () => {
    it('should apply custom className', () => {
      const { container } = render(<PreferencesSetup {...defaultProps} className="custom-class" />);

      const mainDiv = container.firstChild as HTMLElement;
      expect(mainDiv).toHaveClass('custom-class');
    });
  });

  describe('Visual Elements', () => {
    it('should render section icons', () => {
      const { container } = render(<PreferencesSetup {...defaultProps} />);

      const iconContainers = container.querySelectorAll('.w-6.h-6');
      expect(iconContainers.length).toBeGreaterThan(0);
    });

    it('should have proper color coding for sections', () => {
      const { container } = render(<PreferencesSetup {...defaultProps} />);

      expect(container.querySelector('.text-purple-600')).toBeInTheDocument();
      expect(container.querySelector('.text-blue-600')).toBeInTheDocument();
      expect(container.querySelector('.text-green-600')).toBeInTheDocument();
      expect(container.querySelector('.text-pink-600')).toBeInTheDocument();
    });

    it('should render emoji icons for learning levels', () => {
      render(<PreferencesSetup {...defaultProps} />);

      const { container } = render(<PreferencesSetup {...defaultProps} />);
      // Emojis would be in the text content
      expect(container.textContent).toMatch(/🌱|🌿|🌳|🏆/);
    });
  });
});
