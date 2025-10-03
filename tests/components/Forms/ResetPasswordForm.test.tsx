import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { ResetPasswordForm } from '@/components/Auth/ResetPasswordForm';

// Mock Next.js router
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock fetch
global.fetch = vi.fn();

describe('ResetPasswordForm', () => {
  const mockToken = 'valid-reset-token-123';

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockClear();
    mockPush.mockClear();
    localStorage.clear();
  });

  // ===== RENDERING TESTS (10 tests) =====
  describe('Rendering', () => {
    it('should render new password field', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ valid: true }),
      });

      render(<ResetPasswordForm token={mockToken} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
      });
    });

    it('should render confirm password field', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ valid: true }),
      });

      render(<ResetPasswordForm token={mockToken} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
      });
    });

    it('should render submit button', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ valid: true }),
      });

      render(<ResetPasswordForm token={mockToken} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument();
      });
    });

    it('should render password visibility toggles', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ valid: true }),
      });

      render(<ResetPasswordForm token={mockToken} />);

      await waitFor(() => {
        const toggleButtons = screen.getAllByLabelText(/show password/i);
        expect(toggleButtons).toHaveLength(2);
      });
    });

    it('should render password strength indicator', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ valid: true }),
      });

      render(<ResetPasswordForm token={mockToken} />);

      await waitFor(() => {
        const passwordInput = screen.getByLabelText(/new password/i);
        fireEvent.change(passwordInput, { target: { value: 'Test123!' } });
      });

      await waitFor(() => {
        expect(screen.getByText(/weak|medium|strong/i)).toBeInTheDocument();
      });
    });

    it('should render password requirements', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ valid: true }),
      });

      render(<ResetPasswordForm token={mockToken} />);

      await waitFor(() => {
        expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
      });
    });

    it('should show loading state during token validation', () => {
      (global.fetch as any).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<ResetPasswordForm token={mockToken} />);

      expect(screen.getByText(/validating reset link/i)).toBeInTheDocument();
    });

    it('should render cancel button when onCancel is provided', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ valid: true }),
      });

      const onCancel = vi.fn();
      render(<ResetPasswordForm token={mockToken} onCancel={onCancel} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      });
    });

    it('should render lock icons', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ valid: true }),
      });

      const { container } = render(<ResetPasswordForm token={mockToken} />);

      await waitFor(() => {
        const icons = container.querySelectorAll('svg[aria-hidden="true"]');
        expect(icons.length).toBeGreaterThan(0);
      });
    });

    it('should have correct heading hierarchy', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ valid: true }),
      });

      render(<ResetPasswordForm token={mockToken} />);

      await waitFor(() => {
        const heading = screen.getByRole('heading', { name: /create new password/i });
        expect(heading.tagName).toBe('H2');
      });
    });
  });

  // ===== VALIDATION TESTS (15 tests) =====
  describe('Validation', () => {
    beforeEach(async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ valid: true }),
      });
    });

    it('should validate minimum password length', async () => {
      render(<ResetPasswordForm token={mockToken} />);

      await waitFor(() => {
        const passwordInput = screen.getByLabelText(/new password/i);
        fireEvent.change(passwordInput, { target: { value: 'Short1!' } });
      });

      await waitFor(() => {
        expect(screen.getByText(/must be at least 8 characters/i)).toBeInTheDocument();
      });
    });

    it('should require lowercase letter', async () => {
      render(<ResetPasswordForm token={mockToken} />);

      await waitFor(() => {
        const passwordInput = screen.getByLabelText(/new password/i);
        fireEvent.change(passwordInput, { target: { value: 'PASSWORD123!' } });
      });

      await waitFor(() => {
        expect(screen.getByText(/must contain.*lowercase/i)).toBeInTheDocument();
      });
    });

    it('should require uppercase letter', async () => {
      render(<ResetPasswordForm token={mockToken} />);

      await waitFor(() => {
        const passwordInput = screen.getByLabelText(/new password/i);
        fireEvent.change(passwordInput, { target: { value: 'password123!' } });
      });

      await waitFor(() => {
        expect(screen.getByText(/must contain.*uppercase/i)).toBeInTheDocument();
      });
    });

    it('should require number', async () => {
      render(<ResetPasswordForm token={mockToken} />);

      await waitFor(() => {
        const passwordInput = screen.getByLabelText(/new password/i);
        fireEvent.change(passwordInput, { target: { value: 'Password!' } });
      });

      await waitFor(() => {
        expect(screen.getByText(/must contain.*number/i)).toBeInTheDocument();
      });
    });

    it('should require special character', async () => {
      render(<ResetPasswordForm token={mockToken} />);

      await waitFor(() => {
        const passwordInput = screen.getByLabelText(/new password/i);
        fireEvent.change(passwordInput, { target: { value: 'Password123' } });
      });

      await waitFor(() => {
        expect(screen.getByText(/must contain.*special character/i)).toBeInTheDocument();
      });
    });

    it('should show all requirements met for valid password', async () => {
      render(<ResetPasswordForm token={mockToken} />);

      await waitFor(() => {
        const passwordInput = screen.getByLabelText(/new password/i);
        fireEvent.change(passwordInput, { target: { value: 'ValidPass123!' } });
      });

      await waitFor(() => {
        expect(screen.getByText(/password meets all requirements/i)).toBeInTheDocument();
      });
    });

    it('should validate passwords match', async () => {
      render(<ResetPasswordForm token={mockToken} />);

      await waitFor(() => {
        const passwordInput = screen.getByLabelText(/new password/i);
        const confirmInput = screen.getByLabelText(/confirm new password/i);

        fireEvent.change(passwordInput, { target: { value: 'ValidPass123!' } });
        fireEvent.change(confirmInput, { target: { value: 'DifferentPass123!' } });
      });

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });
    });

    it('should show success indicator when passwords match', async () => {
      render(<ResetPasswordForm token={mockToken} />);

      await waitFor(() => {
        const passwordInput = screen.getByLabelText(/new password/i);
        const confirmInput = screen.getByLabelText(/confirm new password/i);

        fireEvent.change(passwordInput, { target: { value: 'ValidPass123!' } });
        fireEvent.change(confirmInput, { target: { value: 'ValidPass123!' } });
      });

      await waitFor(() => {
        expect(screen.getByText(/passwords match/i)).toBeInTheDocument();
      });
    });

    it('should calculate weak password strength', async () => {
      render(<ResetPasswordForm token={mockToken} />);

      await waitFor(() => {
        const passwordInput = screen.getByLabelText(/new password/i);
        fireEvent.change(passwordInput, { target: { value: 'password' } });
      });

      await waitFor(() => {
        expect(screen.getByText(/weak/i)).toBeInTheDocument();
      });
    });

    it('should calculate medium password strength', async () => {
      render(<ResetPasswordForm token={mockToken} />);

      await waitFor(() => {
        const passwordInput = screen.getByLabelText(/new password/i);
        fireEvent.change(passwordInput, { target: { value: 'Password1' } });
      });

      await waitFor(() => {
        expect(screen.getByText(/medium/i)).toBeInTheDocument();
      });
    });

    it('should calculate strong password strength', async () => {
      render(<ResetPasswordForm token={mockToken} />);

      await waitFor(() => {
        const passwordInput = screen.getByLabelText(/new password/i);
        fireEvent.change(passwordInput, { target: { value: 'StrongP@ssw0rd123!' } });
      });

      await waitFor(() => {
        expect(screen.getByText(/strong/i)).toBeInTheDocument();
      });
    });

    it('should disable submit when validation fails', async () => {
      render(<ResetPasswordForm token={mockToken} />);

      await waitFor(() => {
        const passwordInput = screen.getByLabelText(/new password/i);
        fireEvent.change(passwordInput, { target: { value: 'weak' } });
      });

      const submitButton = screen.getByRole('button', { name: /reset password/i });
      expect(submitButton).toBeDisabled();
    });

    it('should enable submit when all validation passes', async () => {
      render(<ResetPasswordForm token={mockToken} />);

      await waitFor(async () => {
        const passwordInput = screen.getByLabelText(/new password/i);
        const confirmInput = screen.getByLabelText(/confirm new password/i);

        await userEvent.type(passwordInput, 'ValidPass123!');
        await userEvent.type(confirmInput, 'ValidPass123!');
      });

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /reset password/i });
        expect(submitButton).not.toBeDisabled();
      });
    });

    it('should clear validation errors when typing', async () => {
      render(<ResetPasswordForm token={mockToken} />);

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /reset password/i });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });

      const passwordInput = screen.getByLabelText(/new password/i);
      await userEvent.type(passwordInput, 'V');

      expect(screen.queryByText(/password is required/i)).not.toBeInTheDocument();
    });

    it('should show validation error on empty password submission', async () => {
      render(<ResetPasswordForm token={mockToken} />);

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /reset password/i });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });
    });
  });

  // ===== RESET FLOW TESTS (12 tests) =====
  describe('Reset Flow', () => {
    beforeEach(() => {
      // Mock successful token validation
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ valid: true }),
      });
    });

    it('should successfully reset password', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<ResetPasswordForm token={mockToken} />);

      await waitFor(async () => {
        const passwordInput = screen.getByLabelText(/new password/i);
        const confirmInput = screen.getByLabelText(/confirm new password/i);

        await userEvent.type(passwordInput, 'NewPass123!');
        await userEvent.type(confirmInput, 'NewPass123!');

        const submitButton = screen.getByRole('button', { name: /reset password/i });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/password reset successful/i)).toBeInTheDocument();
      });
    });

    it('should handle invalid token error', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          json: async () => ({ error: 'Invalid token' }),
        });

      render(<ResetPasswordForm token={mockToken} />);

      await waitFor(() => {
        expect(screen.getByText(/invalid reset link/i)).toBeInTheDocument();
      });
    });

    it('should handle expired token error', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: async () => ({ error: 'Token expired' }),
        });

      render(<ResetPasswordForm token={mockToken} />);

      await waitFor(() => {
        expect(screen.getByText(/reset link has expired/i)).toBeInTheDocument();
      });
    });

    it('should redirect to login page after successful reset', async () => {
      vi.useFakeTimers();

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<ResetPasswordForm token={mockToken} />);

      await waitFor(async () => {
        const passwordInput = screen.getByLabelText(/new password/i);
        const confirmInput = screen.getByLabelText(/confirm new password/i);

        await userEvent.type(passwordInput, 'NewPass123!');
        await userEvent.type(confirmInput, 'NewPass123!');

        fireEvent.click(screen.getByRole('button', { name: /reset password/i }));
      });

      await waitFor(() => {
        expect(screen.getByText(/password reset successful/i)).toBeInTheDocument();
      });

      vi.advanceTimersByTime(3000);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login');
      });

      vi.useRealTimers();
    });

    it('should auto-login when enabled and session data returned', async () => {
      vi.useFakeTimers();

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          session: { user: { id: '123', email: 'test@example.com' } }
        }),
      });

      render(<ResetPasswordForm token={mockToken} autoLogin={true} />);

      await waitFor(async () => {
        const passwordInput = screen.getByLabelText(/new password/i);
        const confirmInput = screen.getByLabelText(/confirm new password/i);

        await userEvent.type(passwordInput, 'NewPass123!');
        await userEvent.type(confirmInput, 'NewPass123!');

        fireEvent.click(screen.getByRole('button', { name: /reset password/i }));
      });

      await waitFor(() => {
        expect(screen.getByText(/logging you in/i)).toBeInTheDocument();
      });

      vi.advanceTimersByTime(2000);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
        expect(localStorage.getItem('describe-it-auth')).toBeTruthy();
      });

      vi.useRealTimers();
    });

    it('should call onSuccess callback', async () => {
      const onSuccess = vi.fn();

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<ResetPasswordForm token={mockToken} onSuccess={onSuccess} />);

      await waitFor(async () => {
        const passwordInput = screen.getByLabelText(/new password/i);
        const confirmInput = screen.getByLabelText(/confirm new password/i);

        await userEvent.type(passwordInput, 'NewPass123!');
        await userEvent.type(confirmInput, 'NewPass123!');

        fireEvent.click(screen.getByRole('button', { name: /reset password/i }));
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(
        new TypeError('Failed to fetch')
      );

      render(<ResetPasswordForm token={mockToken} />);

      await waitFor(async () => {
        const passwordInput = screen.getByLabelText(/new password/i);
        const confirmInput = screen.getByLabelText(/confirm new password/i);

        await userEvent.type(passwordInput, 'NewPass123!');
        await userEvent.type(confirmInput, 'NewPass123!');

        fireEvent.click(screen.getByRole('button', { name: /reset password/i }));
      });

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    it('should handle rate limiting', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ error: 'Too many attempts' }),
      });

      render(<ResetPasswordForm token={mockToken} />);

      await waitFor(async () => {
        const passwordInput = screen.getByLabelText(/new password/i);
        const confirmInput = screen.getByLabelText(/confirm new password/i);

        await userEvent.type(passwordInput, 'NewPass123!');
        await userEvent.type(confirmInput, 'NewPass123!');

        fireEvent.click(screen.getByRole('button', { name: /reset password/i }));
      });

      await waitFor(() => {
        expect(screen.getByText(/too many attempts/i)).toBeInTheDocument();
      });
    });

    it('should disable form during submission', async () => {
      (global.fetch as any).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ ok: true, json: async () => ({}) }), 100))
      );

      render(<ResetPasswordForm token={mockToken} />);

      await waitFor(async () => {
        const passwordInput = screen.getByLabelText(/new password/i);
        const confirmInput = screen.getByLabelText(/confirm new password/i);

        await userEvent.type(passwordInput, 'NewPass123!');
        await userEvent.type(confirmInput, 'NewPass123!');

        fireEvent.click(screen.getByRole('button', { name: /reset password/i }));
      });

      const submitButton = screen.getByRole('button', { name: /resetting password/i });
      expect(submitButton).toBeDisabled();

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });

    it('should prevent double submission', async () => {
      (global.fetch as any).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ ok: true, json: async () => ({}) }), 100))
      );

      render(<ResetPasswordForm token={mockToken} />);

      await waitFor(async () => {
        const passwordInput = screen.getByLabelText(/new password/i);
        const confirmInput = screen.getByLabelText(/confirm new password/i);

        await userEvent.type(passwordInput, 'NewPass123!');
        await userEvent.type(confirmInput, 'NewPass123!');
      });

      const submitButton = screen.getByRole('button', { name: /reset password/i });
      fireEvent.click(submitButton);
      fireEvent.click(submitButton);
      fireEvent.click(submitButton);

      await waitFor(() => {
        // Only initial validation call + one reset call
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle cancel action', async () => {
      const onCancel = vi.fn();

      render(<ResetPasswordForm token={mockToken} onCancel={onCancel} />);

      await waitFor(() => {
        const cancelButton = screen.getByRole('button', { name: /cancel/i });
        fireEvent.click(cancelButton);
      });

      expect(onCancel).toHaveBeenCalled();
    });

    it('should show request new link button on token error', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          json: async () => ({ error: 'Invalid token' }),
        });

      render(<ResetPasswordForm token={mockToken} />);

      await waitFor(() => {
        const newLinkButton = screen.getByRole('button', { name: /request new reset link/i });
        expect(newLinkButton).toBeInTheDocument();
      });

      const newLinkButton = screen.getByRole('button', { name: /request new reset link/i });
      fireEvent.click(newLinkButton);

      expect(mockPush).toHaveBeenCalledWith('/forgot-password');
    });
  });

  // ===== ACCESSIBILITY TESTS (8 tests) =====
  describe('Accessibility', () => {
    beforeEach(() => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ valid: true }),
      });
    });

    it('should have proper form labels', async () => {
      render(<ResetPasswordForm token={mockToken} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
      });
    });

    it('should have required attributes on inputs', async () => {
      render(<ResetPasswordForm token={mockToken} />);

      await waitFor(() => {
        const passwordInput = screen.getByLabelText(/new password/i);
        const confirmInput = screen.getByLabelText(/confirm new password/i);

        expect(passwordInput).toHaveAttribute('required');
        expect(passwordInput).toHaveAttribute('aria-required', 'true');
        expect(confirmInput).toHaveAttribute('required');
        expect(confirmInput).toHaveAttribute('aria-required', 'true');
      });
    });

    it('should support keyboard navigation', async () => {
      render(<ResetPasswordForm token={mockToken} />);

      await waitFor(() => {
        const passwordInput = screen.getByLabelText(/new password/i);
        const confirmInput = screen.getByLabelText(/confirm new password/i);
        const submitButton = screen.getByRole('button', { name: /reset password/i });

        passwordInput.focus();
        expect(document.activeElement).toBe(passwordInput);

        confirmInput.focus();
        expect(document.activeElement).toBe(confirmInput);

        submitButton.focus();
        expect(document.activeElement).toBe(submitButton);
      });
    });

    it('should have aria-busy during submission', async () => {
      (global.fetch as any).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ ok: true, json: async () => ({}) }), 100))
      );

      render(<ResetPasswordForm token={mockToken} />);

      await waitFor(async () => {
        const passwordInput = screen.getByLabelText(/new password/i);
        const confirmInput = screen.getByLabelText(/confirm new password/i);

        await userEvent.type(passwordInput, 'NewPass123!');
        await userEvent.type(confirmInput, 'NewPass123!');

        const submitButton = screen.getByRole('button', { name: /reset password/i });
        fireEvent.click(submitButton);

        expect(submitButton).toHaveAttribute('aria-busy', 'true');
      });
    });

    it('should have accessible error messages', async () => {
      render(<ResetPasswordForm token={mockToken} />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /reset password/i }));
      });

      await waitFor(() => {
        const errorAlert = screen.getByRole('alert');
        expect(errorAlert).toHaveAttribute('aria-live', 'assertive');
      });
    });

    it('should have accessible success messages', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<ResetPasswordForm token={mockToken} />);

      await waitFor(async () => {
        const passwordInput = screen.getByLabelText(/new password/i);
        const confirmInput = screen.getByLabelText(/confirm new password/i);

        await userEvent.type(passwordInput, 'NewPass123!');
        await userEvent.type(confirmInput, 'NewPass123!');

        fireEvent.click(screen.getByRole('button', { name: /reset password/i }));
      });

      await waitFor(() => {
        const successStatus = screen.getByRole('status');
        expect(successStatus).toHaveAttribute('aria-live', 'polite');
      });
    });

    it('should have accessible password visibility toggles', async () => {
      render(<ResetPasswordForm token={mockToken} />);

      await waitFor(() => {
        const toggles = screen.getAllByLabelText(/show password/i);
        toggles.forEach(toggle => {
          expect(toggle).toHaveAttribute('type', 'button');
        });
      });
    });

    it('should toggle password visibility', async () => {
      render(<ResetPasswordForm token={mockToken} />);

      await waitFor(async () => {
        const passwordInput = screen.getByLabelText(/new password/i);
        expect(passwordInput).toHaveAttribute('type', 'password');

        const toggleButtons = screen.getAllByLabelText(/show password/i);
        fireEvent.click(toggleButtons[0]);

        expect(passwordInput).toHaveAttribute('type', 'text');

        const hideButton = screen.getAllByLabelText(/hide password/i)[0];
        fireEvent.click(hideButton);

        expect(passwordInput).toHaveAttribute('type', 'password');
      });
    });
  });
});
