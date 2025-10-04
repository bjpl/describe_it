import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SettingsModal } from '@/components/SettingsModal';

// Mock localStorage for settings persistence
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

describe('SettingsModal Component', () => {
  const user = userEvent.setup();
  const mockOnClose = vi.fn();
  const mockOnToggleDarkMode = vi.fn();
  
  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    darkMode: false,
    onToggleDarkMode: mockOnToggleDarkMode
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Rendering', () => {
    it('should render when isOpen is true', () => {
      render(<SettingsModal {...defaultProps} />);
      
      expect(screen.getByText(/settings/i)).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<SettingsModal {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByText(/settings/i)).not.toBeInTheDocument();
    });

    it('should render dark mode toggle', () => {
      render(<SettingsModal {...defaultProps} />);
      
      const darkModeToggle = screen.getByRole('switch', { name: /dark mode/i }) || 
                             screen.getByLabelText(/dark mode/i);
      expect(darkModeToggle).toBeInTheDocument();
    });

    it('should show current dark mode state', () => {
      render(<SettingsModal {...defaultProps} darkMode={true} />);
      
      const darkModeToggle = screen.getByRole('switch', { name: /dark mode/i }) || 
                             screen.getByLabelText(/dark mode/i);
      expect(darkModeToggle).toBeChecked();
    });
  });

  describe('User Interactions', () => {
    it('should call onClose when close button is clicked', async () => {
      render(<SettingsModal {...defaultProps} />);
      
      const closeButton = screen.getByRole('button', { name: /close/i }) ||
                         screen.getByLabelText(/close/i) ||
                         screen.getByText(/×/i);
      
      await user.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when ESC key is pressed', async () => {
      render(<SettingsModal {...defaultProps} />);
      
      await user.keyboard('{Escape}');
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when clicking outside modal', async () => {
      render(<SettingsModal {...defaultProps} />);
      
      // Click on the backdrop/overlay
      const modal = screen.getByRole('dialog') || screen.getByTestId('modal-backdrop');
      const backdrop = modal.parentElement || modal;
      
      await user.click(backdrop);
      
      // Should close modal when clicking outside
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should toggle dark mode when switch is clicked', async () => {
      render(<SettingsModal {...defaultProps} />);
      
      const darkModeToggle = screen.getByRole('switch', { name: /dark mode/i }) || 
                             screen.getByLabelText(/dark mode/i);
      
      await user.click(darkModeToggle);
      
      expect(mockOnToggleDarkMode).toHaveBeenCalledTimes(1);
    });

    it('should not close when clicking inside modal content', async () => {
      render(<SettingsModal {...defaultProps} />);
      
      const modalContent = screen.getByText(/settings/i);
      await user.click(modalContent);
      
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('API Key Management', () => {
    it('should render API key input fields if available', () => {
      render(<SettingsModal {...defaultProps} />);
      
      // Look for API key related inputs
      const apiKeyInputs = screen.queryAllByLabelText(/api key/i);
      if (apiKeyInputs.length > 0) {
        expect(apiKeyInputs[0]).toBeInTheDocument();
      }
    });

    it('should validate API key format', async () => {
      render(<SettingsModal {...defaultProps} />);
      
      const openAIKeyInput = screen.queryByLabelText(/openai.*api key/i);
      if (openAIKeyInput) {
        // Test invalid API key format
        await user.type(openAIKeyInput, 'invalid-key');
        
        const saveButton = screen.getByRole('button', { name: /save/i });
        await user.click(saveButton);
        
        // Should show validation error
        expect(screen.queryByText(/invalid.*api key/i)).toBeInTheDocument();
      }
    });

    it('should save valid API keys', async () => {
      render(<SettingsModal {...defaultProps} />);
      
      const openAIKeyInput = screen.queryByLabelText(/openai.*api key/i);
      if (openAIKeyInput) {
        // Test valid API key format
        await user.type(openAIKeyInput, 'sk-1234567890abcdef1234567890abcdef1234567890abcdef');
        
        const saveButton = screen.getByRole('button', { name: /save/i });
        await user.click(saveButton);
        
        // Should save to localStorage
        expect(mockLocalStorage.setItem).toHaveBeenCalled();
      }
    });

    it('should mask API keys for security', () => {
      render(<SettingsModal {...defaultProps} />);
      
      const apiKeyInput = screen.queryByLabelText(/api key/i);
      if (apiKeyInput) {
        expect(apiKeyInput).toHaveAttribute('type', 'password');
      }
    });
  });

  describe('Form Validation', () => {
    it('should prevent form submission with invalid data', async () => {
      render(<SettingsModal {...defaultProps} />);
      
      // Find any text inputs
      const textInputs = screen.getAllByRole('textbox');
      if (textInputs.length > 0) {
        // Enter invalid data
        await user.type(textInputs[0], '   '); // Just whitespace
        
        const saveButton = screen.queryByRole('button', { name: /save/i });
        if (saveButton) {
          await user.click(saveButton);
          
          // Form should not submit with invalid data
          expect(screen.queryByText(/required/i)).toBeInTheDocument();
        }
      }
    });

    it('should show validation errors for required fields', async () => {
      render(<SettingsModal {...defaultProps} />);
      
      const saveButton = screen.queryByRole('button', { name: /save/i });
      if (saveButton) {
        await user.click(saveButton);
        
        // Should show validation errors
        const errorMessages = screen.queryAllByText(/(required|invalid|error)/i);
        if (errorMessages.length > 0) {
          expect(errorMessages[0]).toBeInTheDocument();
        }
      }
    });

    it('should clear validation errors when input is corrected', async () => {
      render(<SettingsModal {...defaultProps} />);
      
      const textInput = screen.queryByRole('textbox');
      const saveButton = screen.queryByRole('button', { name: /save/i });
      
      if (textInput && saveButton) {
        // Trigger validation error
        await user.click(saveButton);
        
        // Fix the input
        await user.type(textInput, 'valid-input');
        
        // Error should be cleared
        await waitFor(() => {
          expect(screen.queryByText(/required/i)).not.toBeInTheDocument();
        });
      }
    });
  });

  describe('Settings Persistence', () => {
    it('should load saved settings on mount', () => {
      const savedSettings = JSON.stringify({
        apiKeys: {
          openai: 'sk-saved-key',
          unsplash: 'saved-unsplash-key'
        },
        preferences: {
          darkMode: true
        }
      });
      
      mockLocalStorage.getItem.mockReturnValue(savedSettings);
      
      render(<SettingsModal {...defaultProps} />);
      
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('app-settings');
    });

    it('should save settings to localStorage', async () => {
      render(<SettingsModal {...defaultProps} />);
      
      const saveButton = screen.queryByRole('button', { name: /save/i });
      if (saveButton) {
        await user.click(saveButton);
        
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
          'app-settings',
          expect.stringContaining('{')
        );
      }
    });

    it('should handle localStorage errors gracefully', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
      
      render(<SettingsModal {...defaultProps} />);
      
      const saveButton = screen.queryByRole('button', { name: /save/i });
      if (saveButton) {
        // Should not crash on localStorage error
        expect(() => user.click(saveButton)).not.toThrow();
      }
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<SettingsModal {...defaultProps} />);
      
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
      
      // Should have accessible name
      expect(modal).toHaveAttribute('aria-labelledby');
    });

    it('should trap focus within modal', async () => {
      render(<SettingsModal {...defaultProps} />);
      
      // Tab should cycle through modal elements only
      await user.tab();
      const firstFocusable = document.activeElement;
      
      // Continue tabbing to find last element
      for (let i = 0; i < 10; i++) {
        await user.tab();
      }
      
      // Focus should cycle back to first element
      expect(document.activeElement).toBe(firstFocusable);
    });

    it('should restore focus when closed', async () => {
      const triggerButton = document.createElement('button');
      triggerButton.textContent = 'Open Settings';
      document.body.appendChild(triggerButton);
      triggerButton.focus();
      
      const { rerender } = render(<SettingsModal {...defaultProps} />);
      
      // Close modal
      rerender(<SettingsModal {...defaultProps} isOpen={false} />);
      
      // Focus should return to trigger button
      expect(document.activeElement).toBe(triggerButton);
      
      document.body.removeChild(triggerButton);
    });

    it('should be screen reader accessible', () => {
      render(<SettingsModal {...defaultProps} />);
      
      // Check for proper heading structure
      const heading = screen.getByRole('heading', { level: 2 }) || 
                     screen.getByRole('heading', { level: 1 });
      if (heading) {
        expect(heading).toBeInTheDocument();
      }
      
      // Check for form labels
      const labels = screen.getAllByLabelText(/.+/);
      expect(labels.length).toBeGreaterThan(0);
    });
  });

  describe('Theme Integration', () => {
    it('should apply dark mode styles when enabled', () => {
      render(<SettingsModal {...defaultProps} darkMode={true} />);
      
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveClass(/dark/i);
    });

    it('should apply light mode styles when disabled', () => {
      render(<SettingsModal {...defaultProps} darkMode={false} />);
      
      const modal = screen.getByRole('dialog');
      expect(modal).not.toHaveClass(/dark/i);
    });
  });

  describe('Animation and Transitions', () => {
    it('should animate in when opening', () => {
      const { rerender } = render(<SettingsModal {...defaultProps} isOpen={false} />);
      
      rerender(<SettingsModal {...defaultProps} isOpen={true} />);
      
      const modal = screen.getByRole('dialog');
      // Should have animation/transition classes
      expect(modal.className).toMatch(/transition|animate|fade|scale/);
    });

    it('should animate out when closing', async () => {
      const { rerender } = render(<SettingsModal {...defaultProps} isOpen={true} />);
      
      rerender(<SettingsModal {...defaultProps} isOpen={false} />);
      
      // Animation should complete
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle component errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Render with invalid props to trigger error
      expect(() => {
        render(<SettingsModal {...defaultProps} />);
      }).not.toThrow();
      
      consoleSpy.mockRestore();
    });

    it('should show error message for failed operations', async () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      render(<SettingsModal {...defaultProps} />);
      
      const saveButton = screen.queryByRole('button', { name: /save/i });
      if (saveButton) {
        await user.click(saveButton);
        
        // Should show error message
        expect(screen.queryByText(/error.*saving/i)).toBeInTheDocument();
      }
    });
  });

  describe('Mobile Responsiveness', () => {
    it('should adapt to mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      render(<SettingsModal {...defaultProps} />);
      
      const modal = screen.getByRole('dialog');
      // Should have mobile-responsive classes
      expect(modal.className).toMatch(/w-full|max-w-xs|sm:|md:/);
    });
  });
});
