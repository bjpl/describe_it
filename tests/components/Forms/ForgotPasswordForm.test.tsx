import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { ForgotPasswordForm } from '@/components/Auth/ForgotPasswordForm';

// Mock fetch
global.fetch = vi.fn();

describe('ForgotPasswordForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockClear();
  });

  // ===== RENDERING TESTS (8 tests) =====
  describe('Rendering', () => {
    it('should render email input field', () => {
      render(<ForgotPasswordForm />);
      const emailInput = screen.getByLabelText(/email address/i);
      expect(emailInput).toBeInTheDocument();
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('should render submit button with correct text', () => {
      render(<ForgotPasswordForm />);
      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      expect(submitButton).toBeInTheDocument();
    });

    it('should render back to login link when onBack is provided', () => {
      const onBack = vi.fn();
      render(<ForgotPasswordForm onBack={onBack} />);
      const backLink = screen.getByLabelText(/back to login/i);
      expect(backLink).toBeInTheDocument();
    });

    it('should not render back to login link when onBack is not provided', () => {
      render(<ForgotPasswordForm />);
      const backLink = screen.queryByLabelText(/back to login/i);
      expect(backLink).not.toBeInTheDocument();
    });

    it('should render instructions text', () => {
      render(<ForgotPasswordForm />);
      expect(screen.getByText(/reset your password/i)).toBeInTheDocument();
      expect(screen.getByText(/enter your email address/i)).toBeInTheDocument();
    });

    it('should render email icon', () => {
      render(<ForgotPasswordForm />);
      const emailInput = screen.getByLabelText(/email address/i);
      expect(emailInput.previousSibling).toBeInTheDocument();
    });

    it('should have correct heading hierarchy', () => {
      render(<ForgotPasswordForm />);
      const heading = screen.getByRole('heading', { name: /reset your password/i });
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe('H2');
    });

    it('should render form with noValidate attribute', () => {
      const { container } = render(<ForgotPasswordForm />);
      const form = container.querySelector('form');
      expect(form).toHaveAttribute('noValidate');
    });
  });

  // ===== VALIDATION TESTS (10 tests) =====
  describe('Validation', () => {
    it('should show error when email is empty', async () => {
      render(<ForgotPasswordForm />);
      const submitButton = screen.getByRole('button', { name: /send reset link/i });

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });
    });

    it('should show error for invalid email format', async () => {
      render(<ForgotPasswordForm />);
      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /send reset link/i });

      await userEvent.type(emailInput, 'invalid-email');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument();
      });
    });

    it('should accept valid email format', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<ForgotPasswordForm />);
      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /send reset link/i });

      await userEvent.type(emailInput, 'test@example.com');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    it('should show error message with correct role', async () => {
      render(<ForgotPasswordForm />);
      const submitButton = screen.getByRole('button', { name: /send reset link/i });

      fireEvent.click(submitButton);

      await waitFor(() => {
        const errorAlert = screen.getByRole('alert');
        expect(errorAlert).toBeInTheDocument();
        expect(errorAlert).toHaveAttribute('aria-live', 'assertive');
      });
    });

    it('should clear error when user starts typing', async () => {
      render(<ForgotPasswordForm />);
      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /send reset link/i });

      // Trigger error
      fireEvent.click(submitButton);
      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });

      // Start typing
      await userEvent.type(emailInput, 't');

      expect(screen.queryByText(/email is required/i)).not.toBeInTheDocument();
    });

    it('should validate email with multiple dots', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<ForgotPasswordForm />);
      const emailInput = screen.getByLabelText(/email address/i);

      await userEvent.type(emailInput, 'user@sub.domain.com');
      fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    it('should reject email without domain', async () => {
      render(<ForgotPasswordForm />);
      const emailInput = screen.getByLabelText(/email address/i);

      await userEvent.type(emailInput, 'test@');
      fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument();
      });
    });

    it('should reject email without @', async () => {
      render(<ForgotPasswordForm />);
      const emailInput = screen.getByLabelText(/email address/i);

      await userEvent.type(emailInput, 'testexample.com');
      fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument();
      });
    });

    it('should set aria-invalid on email input when error occurs', async () => {
      render(<ForgotPasswordForm />);
      const emailInput = screen.getByLabelText(/email address/i);

      fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(emailInput).toHaveAttribute('aria-invalid', 'true');
      });
    });

    it('should associate error message with email input using aria-describedby', async () => {
      render(<ForgotPasswordForm />);
      const emailInput = screen.getByLabelText(/email address/i);

      fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(emailInput).toHaveAttribute('aria-describedby', 'email-error');
      });
    });
  });

  // ===== SUBMIT FLOW TESTS (12 tests) =====
  describe('Submit Flow', () => {
    it('should successfully send reset email', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<ForgotPasswordForm />);
      const emailInput = screen.getByLabelText(/email address/i);

      await userEvent.type(emailInput, 'test@example.com');
      fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(screen.getByText(/check your email/i)).toBeInTheDocument();
      });
    });

    it('should call onSuccess callback when email is sent', async () => {
      const onSuccess = vi.fn();
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<ForgotPasswordForm onSuccess={onSuccess} />);
      const emailInput = screen.getByLabelText(/email address/i);

      await userEvent.type(emailInput, 'test@example.com');
      fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith('test@example.com');
      });
    });

    it('should handle 404 email not found error', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Email not found' }),
      });

      render(<ForgotPasswordForm />);
      const emailInput = screen.getByLabelText(/email address/i);

      await userEvent.type(emailInput, 'nonexistent@example.com');
      fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(screen.getByText(/no account found with this email/i)).toBeInTheDocument();
      });
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(
        new TypeError('Failed to fetch')
      );

      render(<ForgotPasswordForm />);
      const emailInput = screen.getByLabelText(/email address/i);

      await userEvent.type(emailInput, 'test@example.com');
      fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    it('should handle rate limiting (429 error)', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ error: 'Too many requests' }),
      });

      render(<ForgotPasswordForm />);
      const emailInput = screen.getByLabelText(/email address/i);

      await userEvent.type(emailInput, 'test@example.com');
      fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(screen.getByText(/too many requests/i)).toBeInTheDocument();
      });
    });

    it('should show confirmation message with email', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<ForgotPasswordForm />);
      const emailInput = screen.getByLabelText(/email address/i);
      const testEmail = 'test@example.com';

      await userEvent.type(emailInput, testEmail);
      fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(screen.getByText(new RegExp(testEmail, 'i'))).toBeInTheDocument();
      });
    });

    it('should enable resend functionality after timer', async () => {
      vi.useFakeTimers();

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<ForgotPasswordForm />);
      const emailInput = screen.getByLabelText(/email address/i);

      await userEvent.type(emailInput, 'test@example.com');
      fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(screen.getByText(/check your email/i)).toBeInTheDocument();
      });

      // Fast-forward 60 seconds
      vi.advanceTimersByTime(60000);

      await waitFor(() => {
        expect(screen.getByLabelText(/resend reset email/i)).toBeInTheDocument();
      });

      vi.useRealTimers();
    });

    it('should show resend timer countdown', async () => {
      vi.useFakeTimers();

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<ForgotPasswordForm />);
      const emailInput = screen.getByLabelText(/email address/i);

      await userEvent.type(emailInput, 'test@example.com');
      fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(screen.getByText(/you can resend in 60 seconds/i)).toBeInTheDocument();
      });

      vi.advanceTimersByTime(10000);

      await waitFor(() => {
        expect(screen.getByText(/you can resend in 50 seconds/i)).toBeInTheDocument();
      });

      vi.useRealTimers();
    });

    it('should allow resending email', async () => {
      vi.useFakeTimers();

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<ForgotPasswordForm />);
      const emailInput = screen.getByLabelText(/email address/i);

      await userEvent.type(emailInput, 'test@example.com');
      fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      vi.advanceTimersByTime(60000);

      await waitFor(() => {
        const resendButton = screen.getByLabelText(/resend reset email/i);
        expect(resendButton).toBeInTheDocument();
      });

      const resendButton = screen.getByLabelText(/resend reset email/i);
      fireEvent.click(resendButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });

      vi.useRealTimers();
    });

    it('should prevent double submission', async () => {
      (global.fetch as any).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ ok: true, json: async () => ({}) }), 100))
      );

      render(<ForgotPasswordForm />);
      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /send reset link/i });

      await userEvent.type(emailInput, 'test@example.com');

      // Click multiple times rapidly
      fireEvent.click(submitButton);
      fireEvent.click(submitButton);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });
    });

    it('should disable submit button while loading', async () => {
      (global.fetch as any).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ ok: true, json: async () => ({}) }), 100))
      );

      render(<ForgotPasswordForm />);
      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /send reset link/i });

      await userEvent.type(emailInput, 'test@example.com');
      fireEvent.click(submitButton);

      expect(submitButton).toBeDisabled();

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });

    it('should handle server errors (500)', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' }),
      });

      render(<ForgotPasswordForm />);
      const emailInput = screen.getByLabelText(/email address/i);

      await userEvent.type(emailInput, 'test@example.com');
      fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(screen.getByText(/server error/i)).toBeInTheDocument();
      });
    });
  });

  // ===== ACCESSIBILITY TESTS (10 tests) =====
  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      render(<ForgotPasswordForm />);
      const emailLabel = screen.getByLabelText(/email address/i);
      expect(emailLabel).toBeInTheDocument();
    });

    it('should have required attribute on email input', () => {
      render(<ForgotPasswordForm />);
      const emailInput = screen.getByLabelText(/email address/i);
      expect(emailInput).toHaveAttribute('required');
      expect(emailInput).toHaveAttribute('aria-required', 'true');
    });

    it('should support keyboard navigation', async () => {
      const onBack = jest.fn();
      render(<ForgotPasswordForm onBack={onBack} />);

      const backButton = screen.getByLabelText(/back to login/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /send reset link/i });

      backButton.focus();
      expect(document.activeElement).toBe(backButton);

      emailInput.focus();
      expect(document.activeElement).toBe(emailInput);

      submitButton.focus();
      expect(document.activeElement).toBe(submitButton);
    });

    it('should handle Enter key submission', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<ForgotPasswordForm />);
      const emailInput = screen.getByLabelText(/email address/i);

      await userEvent.type(emailInput, 'test@example.com');
      fireEvent.keyPress(emailInput, { key: 'Enter', code: 'Enter', charCode: 13 });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    it('should have aria-busy attribute during submission', async () => {
      (global.fetch as any).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ ok: true, json: async () => ({}) }), 100))
      );

      render(<ForgotPasswordForm />);
      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /send reset link/i });

      await userEvent.type(emailInput, 'test@example.com');
      fireEvent.click(submitButton);

      expect(submitButton).toHaveAttribute('aria-busy', 'true');

      await waitFor(() => {
        expect(submitButton).toHaveAttribute('aria-busy', 'false');
      });
    });

    it('should have success message with proper role', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<ForgotPasswordForm />);
      const emailInput = screen.getByLabelText(/email address/i);

      await userEvent.type(emailInput, 'test@example.com');
      fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        const successMessage = screen.getByRole('status');
        expect(successMessage).toHaveAttribute('aria-live', 'polite');
      });
    });

    it('should hide decorative icons from screen readers', () => {
      render(<ForgotPasswordForm />);
      const { container } = render(<ForgotPasswordForm />);
      const icons = container.querySelectorAll('svg[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should have accessible button labels', () => {
      const onBack = jest.fn();
      render(<ForgotPasswordForm onBack={onBack} />);

      expect(screen.getByLabelText(/back to login/i)).toBeInTheDocument();
    });

    it('should provide clear error messages', async () => {
      render(<ForgotPasswordForm />);
      fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        const error = screen.getByRole('alert');
        expect(error).toHaveTextContent(/email is required/i);
      });
    });

    it('should have proper heading structure for screen readers', () => {
      render(<ForgotPasswordForm />);
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent(/reset your password/i);
    });
  });
});
