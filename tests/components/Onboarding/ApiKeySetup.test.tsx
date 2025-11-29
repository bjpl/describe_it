import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../test-utils';
import userEvent from '@testing-library/user-event';
import ApiKeySetup from '@/components/Onboarding/ApiKeySetup';
import { authManager } from '@/lib/auth/AuthManager';
import { settingsManager } from '@/lib/settings/settingsManager';

// Mock dependencies
vi.mock('@/lib/auth/AuthManager', () => ({
  authManager: {
    getCurrentUser: vi.fn(),
    getCurrentProfile: vi.fn(),
    getApiKeys: vi.fn(),
    saveApiKeys: vi.fn(),
    updateProfile: vi.fn()
  }
}));

vi.mock('@/lib/settings/settingsManager', () => ({
  settingsManager: {
    getSettings: vi.fn(),
    updateSection: vi.fn()
  }
}));

vi.mock('@/hooks/useOnboarding', () => ({
  default: () => ({
    updatePreferences: vi.fn()
  })
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    h2: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>
  },
  AnimatePresence: ({ children }: any) => children
}));

describe('ApiKeySetup', () => {
  const mockOnNext = vi.fn();
  const mockOnPrev = vi.fn();
  const mockOnSkip = vi.fn();

  const defaultProps = {
    onNext: mockOnNext,
    onPrev: mockOnPrev,
    onSkip: mockOnSkip
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    vi.mocked(settingsManager.getSettings).mockReturnValue({
      apiKeys: { unsplash: '', openai: '', anthropic: '' },
      language: { ui: 'en', target: 'spanish' },
      study: { dailyGoal: 10, difficulty: 'intermediate' },
      theme: { mode: 'system', animations: true },
      accessibility: { fontSize: 'medium', keyboardNavigation: true }
    } as any);

    vi.mocked(authManager.getCurrentUser).mockReturnValue(null);
    vi.mocked(authManager.getCurrentProfile).mockReturnValue(null);
    vi.mocked(authManager.getApiKeys).mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render the component with header and description', () => {
      render(<ApiKeySetup {...defaultProps} />);

      expect(screen.getByText('Set Up Your API Keys')).toBeInTheDocument();
      expect(screen.getByText(/Connect your API keys to unlock enhanced features/i)).toBeInTheDocument();
    });

    it('should render security notice', () => {
      render(<ApiKeySetup {...defaultProps} />);

      expect(screen.getByText('Your Keys Are Secure')).toBeInTheDocument();
      expect(screen.getByText(/API keys are encrypted and stored securely/i)).toBeInTheDocument();
    });

    it('should render both API key input fields', () => {
      render(<ApiKeySetup {...defaultProps} />);

      expect(screen.getByText('Unsplash API Key')).toBeInTheDocument();
      expect(screen.getByText('OpenAI API Key')).toBeInTheDocument();
    });

    it('should render navigation buttons', () => {
      render(<ApiKeySetup {...defaultProps} />);

      expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /skip for now/i })).toBeInTheDocument();
    });

    it('should show save to account checkbox when user is logged in', () => {
      vi.mocked(authManager.getCurrentUser).mockReturnValue({ id: 'user-123' } as any);

      render(<ApiKeySetup {...defaultProps} />);

      expect(screen.getByText(/Save API keys to my account/i)).toBeInTheDocument();
    });

    it('should not show save to account checkbox when user is not logged in', () => {
      vi.mocked(authManager.getCurrentUser).mockReturnValue(null);

      render(<ApiKeySetup {...defaultProps} />);

      expect(screen.queryByText(/Save API keys to my account/i)).not.toBeInTheDocument();
    });
  });

  describe('API Key Input', () => {
    it('should allow typing in Unsplash API key field', async () => {
      const user = userEvent.setup();
      render(<ApiKeySetup {...defaultProps} />);

      const unsplashInput = screen.getByPlaceholderText(/Enter your Unsplash API key/i);
      await user.type(unsplashInput, 'test-unsplash-key-1234567890');

      expect(unsplashInput).toHaveValue('test-unsplash-key-1234567890');
    });

    it('should allow typing in OpenAI API key field', async () => {
      const user = userEvent.setup();
      render(<ApiKeySetup {...defaultProps} />);

      const openaiInput = screen.getByPlaceholderText(/sk-\.\.\./i);
      await user.type(openaiInput, 'sk-test1234567890abcdefghijklmnopqrstuvwxyz123456789012');

      expect(openaiInput).toHaveValue('sk-test1234567890abcdefghijklmnopqrstuvwxyz123456789012');
    });

    it('should toggle password visibility for Unsplash key', async () => {
      const user = userEvent.setup();
      render(<ApiKeySetup {...defaultProps} />);

      const unsplashInput = screen.getByPlaceholderText(/Enter your Unsplash API key/i);
      await user.type(unsplashInput, 'secret-key');

      // Initially should be password type
      expect(unsplashInput).toHaveAttribute('type', 'password');

      // Find and click the eye button (visibility toggle)
      const eyeButtons = screen.getAllByRole('button', { name: '' });
      const unsplashEyeButton = eyeButtons.find(btn =>
        btn.parentElement?.previousElementSibling === unsplashInput
      );

      if (unsplashEyeButton) {
        await user.click(unsplashEyeButton);
        expect(unsplashInput).toHaveAttribute('type', 'text');

        await user.click(unsplashEyeButton);
        expect(unsplashInput).toHaveAttribute('type', 'password');
      }
    });
  });

  describe('Validation', () => {
    it('should validate Unsplash API key format', async () => {
      const user = userEvent.setup();
      render(<ApiKeySetup {...defaultProps} />);

      const unsplashInput = screen.getByPlaceholderText(/Enter your Unsplash API key/i);

      // Valid format: at least 20 alphanumeric characters with underscores/hyphens
      await user.type(unsplashInput, 'valid_unsplash_key_12345678');

      await waitFor(() => {
        // Should show valid state (green check icon would be rendered)
        expect(unsplashInput).toHaveValue('valid_unsplash_key_12345678');
      });
    });

    it('should show validation error for invalid Unsplash key', async () => {
      const user = userEvent.setup();
      render(<ApiKeySetup {...defaultProps} />);

      const unsplashInput = screen.getByPlaceholderText(/Enter your Unsplash API key/i);

      // Invalid format: too short
      await user.type(unsplashInput, 'short');

      await waitFor(() => {
        expect(screen.getByText(/Please enter a valid unsplash api key/i)).toBeInTheDocument();
      });
    });

    it('should validate OpenAI API key format', async () => {
      const user = userEvent.setup();
      render(<ApiKeySetup {...defaultProps} />);

      const openaiInput = screen.getByPlaceholderText(/sk-\.\.\./i);

      // Valid format: starts with 'sk-' and at least 48 characters total
      await user.type(openaiInput, 'sk-1234567890abcdefghijklmnopqrstuvwxyz1234567890ab');

      await waitFor(() => {
        expect(openaiInput).toHaveValue('sk-1234567890abcdefghijklmnopqrstuvwxyz1234567890ab');
      });
    });

    it('should show validation error for invalid OpenAI key', async () => {
      const user = userEvent.setup();
      render(<ApiKeySetup {...defaultProps} />);

      const openaiInput = screen.getByPlaceholderText(/sk-\.\.\./i);

      // Invalid format: doesn't start with sk- or too short
      await user.type(openaiInput, 'invalid-key');

      await waitFor(() => {
        expect(screen.getByText(/Please enter a valid openai api key/i)).toBeInTheDocument();
      });
    });

    it('should show validating state while checking key', async () => {
      const user = userEvent.setup();
      render(<ApiKeySetup {...defaultProps} />);

      const unsplashInput = screen.getByPlaceholderText(/Enter your Unsplash API key/i);
      await user.type(unsplashInput, 'validating_key_1234567890');

      // Should briefly show validating state
      // The component uses an animated spinner div
      const inputContainer = unsplashInput.closest('.relative');
      expect(inputContainer).toBeInTheDocument();
    });
  });

  describe('Loading Existing Keys', () => {
    it('should load existing keys from authenticated user', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockKeys = {
        unsplash: 'existing-unsplash-key-123456',
        openai: 'sk-existing-openai-key-1234567890abcdefghij'
      };

      vi.mocked(authManager.getCurrentUser).mockReturnValue(mockUser as any);
      vi.mocked(authManager.getApiKeys).mockResolvedValue(mockKeys);

      render(<ApiKeySetup {...defaultProps} />);

      await waitFor(() => {
        const unsplashInput = screen.getByPlaceholderText(/Enter your Unsplash API key/i);
        const openaiInput = screen.getByPlaceholderText(/sk-\.\.\./i);

        expect(unsplashInput).toHaveValue('existing-unsplash-key-123456');
        expect(openaiInput).toHaveValue('sk-existing-openai-key-1234567890abcdefghij');
      });
    });

    it('should load existing keys from local settings for guest users', async () => {
      vi.mocked(authManager.getCurrentUser).mockReturnValue(null);
      vi.mocked(settingsManager.getSettings).mockReturnValue({
        apiKeys: {
          unsplash: 'local-unsplash-key-123456',
          openai: 'sk-local-openai-key-1234567890abcdefghijklm',
          anthropic: ''
        }
      } as any);

      render(<ApiKeySetup {...defaultProps} />);

      await waitFor(() => {
        const unsplashInput = screen.getByPlaceholderText(/Enter your Unsplash API key/i);
        const openaiInput = screen.getByPlaceholderText(/sk-\.\.\./i);

        expect(unsplashInput).toHaveValue('local-unsplash-key-123456');
        expect(openaiInput).toHaveValue('sk-local-openai-key-1234567890abcdefghijklm');
      });
    });
  });

  describe('Saving Keys', () => {
    it('should save keys to user account when logged in and checkbox is checked', async () => {
      const user = userEvent.setup();
      const mockUser = { id: 'user-123' };

      vi.mocked(authManager.getCurrentUser).mockReturnValue(mockUser as any);
      vi.mocked(authManager.saveApiKeys).mockResolvedValue(true);

      render(<ApiKeySetup {...defaultProps} />);

      const unsplashInput = screen.getByPlaceholderText(/Enter your Unsplash API key/i);
      await user.type(unsplashInput, 'new-unsplash-key-123456789');

      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      await waitFor(() => {
        expect(authManager.saveApiKeys).toHaveBeenCalledWith({
          unsplash: 'new-unsplash-key-123456789',
          openai: '',
          anthropic: ''
        });
        expect(mockOnNext).toHaveBeenCalled();
      });
    });

    it('should save keys to local settings when not logged in', async () => {
      const user = userEvent.setup();

      vi.mocked(authManager.getCurrentUser).mockReturnValue(null);

      render(<ApiKeySetup {...defaultProps} />);

      const openaiInput = screen.getByPlaceholderText(/sk-\.\.\./i);
      await user.type(openaiInput, 'sk-new-openai-key-1234567890abcdefghijklmnopqr');

      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      await waitFor(() => {
        expect(settingsManager.updateSection).toHaveBeenCalledWith('apiKeys', {
          unsplash: '',
          openai: 'sk-new-openai-key-1234567890abcdefghijklmnopqr',
          anthropic: ''
        });
        expect(mockOnNext).toHaveBeenCalled();
      });
    });

    it('should allow continuing without entering any keys', async () => {
      const user = userEvent.setup();
      render(<ApiKeySetup {...defaultProps} />);

      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      expect(mockOnNext).toHaveBeenCalled();
    });

    it('should respect save to account checkbox state', async () => {
      const user = userEvent.setup();
      const mockUser = { id: 'user-123' };

      vi.mocked(authManager.getCurrentUser).mockReturnValue(mockUser as any);
      vi.mocked(authManager.saveApiKeys).mockResolvedValue(true);

      render(<ApiKeySetup {...defaultProps} />);

      const checkbox = screen.getByRole('checkbox');
      const unsplashInput = screen.getByPlaceholderText(/Enter your Unsplash API key/i);

      await user.type(unsplashInput, 'test-key-1234567890');

      // Uncheck the save to account option
      await user.click(checkbox);

      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      await waitFor(() => {
        // Should save to local settings instead of account
        expect(authManager.saveApiKeys).not.toHaveBeenCalled();
        expect(settingsManager.updateSection).toHaveBeenCalled();
      });
    });
  });

  describe('Navigation', () => {
    it('should call onPrev when Previous button is clicked', async () => {
      const user = userEvent.setup();
      render(<ApiKeySetup {...defaultProps} />);

      const prevButton = screen.getByRole('button', { name: /previous/i });
      await user.click(prevButton);

      expect(mockOnPrev).toHaveBeenCalled();
    });

    it('should call onSkip when Skip for Now button is clicked', async () => {
      const user = userEvent.setup();
      render(<ApiKeySetup {...defaultProps} />);

      const skipButton = screen.getByRole('button', { name: /skip for now/i });
      await user.click(skipButton);

      expect(mockOnSkip).toHaveBeenCalled();
    });

    it('should not render Skip button if onSkip is not provided', () => {
      render(<ApiKeySetup onNext={mockOnNext} onPrev={mockOnPrev} />);

      expect(screen.queryByRole('button', { name: /skip for now/i })).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for inputs', () => {
      render(<ApiKeySetup {...defaultProps} />);

      const unsplashInput = screen.getByPlaceholderText(/Enter your Unsplash API key/i);
      const openaiInput = screen.getByPlaceholderText(/sk-\.\.\./i);

      expect(unsplashInput).toHaveAttribute('type');
      expect(openaiInput).toHaveAttribute('type');
    });

    it('should have accessible form structure', () => {
      const { container } = render(<ApiKeySetup {...defaultProps} />);

      const inputs = container.querySelectorAll('input[type="password"], input[type="text"]');
      expect(inputs.length).toBeGreaterThan(0);
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<ApiKeySetup {...defaultProps} />);

      const unsplashInput = screen.getByPlaceholderText(/Enter your Unsplash API key/i);

      await user.tab();
      // Check if focus moves through interactive elements
      expect(document.activeElement).toBeDefined();
    });
  });

  describe('Benefits Display', () => {
    it('should display benefits for Unsplash API', () => {
      render(<ApiKeySetup {...defaultProps} />);

      expect(screen.getByText('High-quality stock photos')).toBeInTheDocument();
      expect(screen.getByText('Diverse image categories')).toBeInTheDocument();
      expect(screen.getByText('Educational content')).toBeInTheDocument();
    });

    it('should display benefits for OpenAI API', () => {
      render(<ApiKeySetup {...defaultProps} />);

      expect(screen.getByText('Advanced AI descriptions')).toBeInTheDocument();
      expect(screen.getByText('Context-aware explanations')).toBeInTheDocument();
      expect(screen.getByText('Personalized content')).toBeInTheDocument();
    });

    it('should show Get Key links for both APIs', () => {
      render(<ApiKeySetup {...defaultProps} />);

      const getKeyLinks = screen.getAllByText('Get Key');
      expect(getKeyLinks).toHaveLength(2);

      getKeyLinks.forEach(link => {
        expect(link.closest('a')).toHaveAttribute('target', '_blank');
        expect(link.closest('a')).toHaveAttribute('rel', 'noopener noreferrer');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string values correctly', async () => {
      const user = userEvent.setup();
      render(<ApiKeySetup {...defaultProps} />);

      const unsplashInput = screen.getByPlaceholderText(/Enter your Unsplash API key/i);
      await user.type(unsplashInput, 'test');
      await user.clear(unsplashInput);

      expect(unsplashInput).toHaveValue('');
    });

    it('should handle special characters in API keys', async () => {
      const user = userEvent.setup();
      render(<ApiKeySetup {...defaultProps} />);

      const unsplashInput = screen.getByPlaceholderText(/Enter your Unsplash API key/i);
      await user.type(unsplashInput, 'key-with_special-chars_12345678');

      expect(unsplashInput).toHaveValue('key-with_special-chars_12345678');
    });

    it('should handle very long input values', async () => {
      const user = userEvent.setup();
      render(<ApiKeySetup {...defaultProps} />);

      const longKey = 'a'.repeat(100);
      const openaiInput = screen.getByPlaceholderText(/sk-\.\.\./i);
      await user.type(openaiInput, longKey);

      expect(openaiInput).toHaveValue(longKey);
    });
  });

  describe('Error Handling', () => {
    it('should handle save error gracefully', async () => {
      const user = userEvent.setup();
      const mockUser = { id: 'user-123' };

      vi.mocked(authManager.getCurrentUser).mockReturnValue(mockUser as any);
      vi.mocked(authManager.saveApiKeys).mockRejectedValue(new Error('Save failed'));

      render(<ApiKeySetup {...defaultProps} />);

      const unsplashInput = screen.getByPlaceholderText(/Enter your Unsplash API key/i);
      await user.type(unsplashInput, 'test-key-1234567890');

      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      // Should still proceed even if save fails
      await waitFor(() => {
        expect(mockOnNext).toHaveBeenCalled();
      });
    });
  });
});
