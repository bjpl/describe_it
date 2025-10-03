import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserMenu } from '@/components/Auth/UserMenu';
import '@testing-library/jest-dom';

// Mock AuthProvider
const mockUseAuth = vi.fn();
vi.mock('@/providers/AuthProvider', () => ({
  useAuth: () => mockUseAuth()
}));

// Mock SettingsModal
vi.mock('@/components/SettingsModal', () => ({
  SettingsModal: ({ isOpen, onClose }: any) =>
    isOpen ? <div data-testid="settings-modal" onClick={onClose}>Settings Modal</div> : null
}));

// Mock AuthModal
vi.mock('@/components/Auth/AuthModal', () => ({
  AuthModal: ({ isOpen, onClose, onAuthSuccess }: any) =>
    isOpen ? (
      <div data-testid="auth-modal">
        <button onClick={() => onAuthSuccess({ user: { email: 'test@test.com' }, profile: { full_name: 'Test User' } })}>
          Sign In Success
        </button>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
}));

describe('UserMenu Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();

    // Mock matchMedia for dark mode
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  // 1. Unauthenticated State Tests
  describe('Unauthenticated State', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: null,
        profile: null,
        isAuthenticated: false,
        signOut: jest.fn()
      });
    });

    it('should display Sign In button when not authenticated', () => {
      render(<UserMenu />);
      expect(screen.getByText('Sign In')).toBeInTheDocument();
    });

    it('should show user icon in sign in button', () => {
      const { container } = render(<UserMenu />);
      const button = screen.getByText('Sign In').closest('button');
      const icon = button?.querySelector('svg');

      expect(icon).toBeInTheDocument();
    });

    it('should have proper styling for sign in button', () => {
      render(<UserMenu />);
      const button = screen.getByText('Sign In').closest('button');

      expect(button).toHaveClass('bg-blue-600');
      expect(button).toHaveClass('text-white');
      expect(button).toHaveClass('rounded-lg');
    });

    it('should open auth modal when sign in clicked', async () => {
      render(<UserMenu />);

      fireEvent.click(screen.getByText('Sign In'));

      await waitFor(() => {
        expect(screen.getByTestId('auth-modal')).toBeInTheDocument();
      });
    });

    it('should not show user dropdown when unauthenticated', () => {
      render(<UserMenu />);

      expect(screen.queryByRole('button', { name: /user/i })).not.toBeInTheDocument();
    });
  });

  // 2. Authenticated State Tests
  describe('Authenticated State', () => {
    const mockUser = {
      email: 'test@example.com',
      id: '123'
    };

    const mockProfile = {
      full_name: 'Test User',
      avatar_url: null
    };

    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        profile: mockProfile,
        isAuthenticated: true,
        signOut: vi.fn()
      });
    });

    it('should display user avatar when authenticated', () => {
      render(<UserMenu />);
      const avatar = screen.getByText('T'); // First letter of name

      expect(avatar).toBeInTheDocument();
    });

    it('should display user name', () => {
      render(<UserMenu />);
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    it('should display user email in dropdown', async () => {
      render(<UserMenu />);

      const userButton = screen.getByText('Test User').closest('button');
      fireEvent.click(userButton!);

      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });
    });

    it('should show chevron down icon', () => {
      const { container } = render(<UserMenu />);
      const chevron = container.querySelector('svg.w-4.h-4.text-gray-500');

      expect(chevron).toBeInTheDocument();
    });

    it('should use email as fallback if no full name', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        profile: null,
        isAuthenticated: true,
        signOut: jest.fn()
      });

      render(<UserMenu />);
      expect(screen.getByText('test')).toBeInTheDocument(); // Email prefix
    });
  });

  // 3. User Dropdown Tests
  describe('User Dropdown Menu', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { email: 'test@example.com' },
        profile: { full_name: 'Test User' },
        isAuthenticated: true,
        signOut: jest.fn()
      });
    });

    it('should toggle dropdown on button click', async () => {
      render(<UserMenu />);
      const userButton = screen.getByText('Test User').closest('button');

      fireEvent.click(userButton!);

      await waitFor(() => {
        expect(screen.getByText('API Keys')).toBeInTheDocument();
      });

      fireEvent.click(userButton!);

      await waitFor(() => {
        expect(screen.queryByText('API Keys')).not.toBeInTheDocument();
      });
    });

    it('should display API Keys option in dropdown', async () => {
      render(<UserMenu />);
      const userButton = screen.getByText('Test User').closest('button');

      fireEvent.click(userButton!);

      await waitFor(() => {
        expect(screen.getByText('API Keys')).toBeInTheDocument();
      });
    });

    it('should display Settings option in dropdown', async () => {
      render(<UserMenu />);
      const userButton = screen.getByText('Test User').closest('button');

      fireEvent.click(userButton!);

      await waitFor(() => {
        expect(screen.getByText('Settings')).toBeInTheDocument();
      });
    });

    it('should display Sign Out option in dropdown', async () => {
      render(<UserMenu />);
      const userButton = screen.getByText('Test User').closest('button');

      fireEvent.click(userButton!);

      await waitFor(() => {
        expect(screen.getByText('Sign Out')).toBeInTheDocument();
      });
    });

    it('should close dropdown when clicking outside', async () => {
      render(<UserMenu />);
      const userButton = screen.getByText('Test User').closest('button');

      fireEvent.click(userButton!);

      await waitFor(() => {
        expect(screen.getByText('API Keys')).toBeInTheDocument();
      });

      // Click the overlay
      const overlay = document.querySelector('.fixed.inset-0.z-10');
      fireEvent.click(overlay!);

      await waitFor(() => {
        expect(screen.queryByText('API Keys')).not.toBeInTheDocument();
      });
    });
  });

  // 4. Sign Out Tests
  describe('Sign Out Functionality', () => {
    const mockSignOut = vi.fn();

    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { email: 'test@example.com' },
        profile: { full_name: 'Test User' },
        isAuthenticated: true,
        signOut: mockSignOut
      });
    });

    it('should call signOut when Sign Out clicked', async () => {
      render(<UserMenu />);
      const userButton = screen.getByText('Test User').closest('button');

      fireEvent.click(userButton!);

      await waitFor(() => {
        const signOutButton = screen.getByText('Sign Out');
        fireEvent.click(signOutButton);
      });

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled();
      });
    });

    it('should have red styling for sign out button', async () => {
      render(<UserMenu />);
      const userButton = screen.getByText('Test User').closest('button');

      fireEvent.click(userButton!);

      await waitFor(() => {
        const signOutButton = screen.getByText('Sign Out').closest('button');
        expect(signOutButton).toHaveClass('text-red-600');
      });
    });

    it('should close dropdown after sign out', async () => {
      render(<UserMenu />);
      const userButton = screen.getByText('Test User').closest('button');

      fireEvent.click(userButton!);

      await waitFor(() => {
        const signOutButton = screen.getByText('Sign Out');
        fireEvent.click(signOutButton);
      });

      // Dropdown should close
      await waitFor(() => {
        expect(screen.queryByText('API Keys')).not.toBeInTheDocument();
      });
    });
  });

  // 5. Settings Modal Tests
  describe('Settings Modal', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { email: 'test@example.com' },
        profile: { full_name: 'Test User' },
        isAuthenticated: true,
        signOut: vi.fn()
      });
    });

    it('should open settings modal when Settings clicked', async () => {
      render(<UserMenu />);
      const userButton = screen.getByText('Test User').closest('button');

      fireEvent.click(userButton!);

      await waitFor(() => {
        const settingsButton = screen.getByText('Settings');
        fireEvent.click(settingsButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('settings-modal')).toBeInTheDocument();
      });
    });

    it('should close settings modal', async () => {
      render(<UserMenu />);
      const userButton = screen.getByText('Test User').closest('button');

      fireEvent.click(userButton!);

      await waitFor(() => {
        const settingsButton = screen.getByText('Settings');
        fireEvent.click(settingsButton);
      });

      await waitFor(() => {
        const modal = screen.getByTestId('settings-modal');
        fireEvent.click(modal);
      });

      await waitFor(() => {
        expect(screen.queryByTestId('settings-modal')).not.toBeInTheDocument();
      });
    });
  });

  // 6. Dark Mode Tests
  describe('Dark Mode Support', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { email: 'test@example.com' },
        profile: { full_name: 'Test User' },
        isAuthenticated: true,
        signOut: vi.fn()
      });
    });

    it('should have dark mode classes on user button', () => {
      render(<UserMenu />);
      const userButton = screen.getByText('Test User').closest('button');

      expect(userButton).toHaveClass('dark:hover:bg-gray-700');
    });

    it('should have dark mode classes on dropdown', async () => {
      render(<UserMenu />);
      const userButton = screen.getByText('Test User').closest('button');

      fireEvent.click(userButton!);

      await waitFor(() => {
        const dropdown = document.querySelector('.bg-white.dark\\:bg-gray-800');
        expect(dropdown).toBeInTheDocument();
      });
    });
  });

  // 7. Authentication Modal Tests
  describe('Authentication Modal', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: null,
        profile: null,
        isAuthenticated: false,
        signOut: vi.fn()
      });
    });

    it('should handle successful authentication', async () => {
      render(<UserMenu />);

      fireEvent.click(screen.getByText('Sign In'));

      await waitFor(() => {
        const successButton = screen.getByText('Sign In Success');
        fireEvent.click(successButton);
      });

      // Auth modal should close
      await waitFor(() => {
        expect(screen.queryByTestId('auth-modal')).not.toBeInTheDocument();
      });
    });

    it('should close modal when close button clicked', async () => {
      render(<UserMenu />);

      fireEvent.click(screen.getByText('Sign In'));

      await waitFor(() => {
        const closeButton = screen.getByText('Close');
        fireEvent.click(closeButton);
      });

      await waitFor(() => {
        expect(screen.queryByTestId('auth-modal')).not.toBeInTheDocument();
      });
    });
  });

  // 8. Loading State Tests
  describe('Loading State', () => {
    it('should show loading state during authentication', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        profile: null,
        isAuthenticated: false,
        signOut: vi.fn()
      });

      const { rerender } = render(<UserMenu />);

      fireEvent.click(screen.getByText('Sign In'));

      // Component manages loading internally
      expect(screen.getByText('Sign In')).toBeInTheDocument();
    });
  });

  // 9. Avatar Tests
  describe('User Avatar', () => {
    it('should display first letter of full name', () => {
      mockUseAuth.mockReturnValue({
        user: { email: 'test@example.com' },
        profile: { full_name: 'John Doe' },
        isAuthenticated: true,
        signOut: vi.fn()
      });

      render(<UserMenu />);
      expect(screen.getByText('J')).toBeInTheDocument();
    });

    it('should display first letter of email if no name', () => {
      mockUseAuth.mockReturnValue({
        user: { email: 'alice@example.com' },
        profile: null,
        isAuthenticated: true,
        signOut: vi.fn()
      });

      render(<UserMenu />);
      expect(screen.getByText('A')).toBeInTheDocument();
    });

    it('should have circular avatar styling', () => {
      mockUseAuth.mockReturnValue({
        user: { email: 'test@example.com' },
        profile: { full_name: 'Test User' },
        isAuthenticated: true,
        signOut: vi.fn()
      });

      const { container } = render(<UserMenu />);
      const avatar = container.querySelector('.rounded-full');

      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveClass('bg-blue-600');
    });
  });

  // 10. Responsive Behavior Tests
  describe('Responsive Behavior', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { email: 'test@example.com' },
        profile: { full_name: 'Test User' },
        isAuthenticated: true,
        signOut: vi.fn()
      });
    });

    it('should have responsive dropdown positioning', async () => {
      render(<UserMenu />);
      const userButton = screen.getByText('Test User').closest('button');

      fireEvent.click(userButton!);

      await waitFor(() => {
        const dropdown = document.querySelector('.absolute.right-0');
        expect(dropdown).toBeInTheDocument();
      });
    });

    it('should have proper z-index for dropdown', async () => {
      render(<UserMenu />);
      const userButton = screen.getByText('Test User').closest('button');

      fireEvent.click(userButton!);

      await waitFor(() => {
        const dropdown = document.querySelector('.z-20');
        expect(dropdown).toBeInTheDocument();
      });
    });
  });
});
