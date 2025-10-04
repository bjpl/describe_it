/**
 * Comprehensive Authentication Flow Test
 * 
 * This test simulates the complete auth flow to identify where UI updates break:
 * 1. Initial page load with no auth
 * 2. Sign in flow
 * 3. Sign out flow  
 * 4. Sign in after sign out (the problematic flow)
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { AuthProvider } from '../src/context/AuthProvider';
import { UserMenu } from '../src/components/Auth/UserMenu';
import { authManager } from '../src/lib/auth/authManager';
import type { User, Profile } from '../src/types/auth';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock user data
const mockUser: User = {
  id: 'test-user-123',
  email: 'test@example.com',
  name: 'Test User',
  image: null,
  emailVerified: null,
};

const mockProfile: Profile = {
  id: 'profile-123',
  userId: 'test-user-123',
  displayName: 'Test User',
  bio: null,
  avatarUrl: null,
  website: null,
  location: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Auth state logging utility
const logAuthState = (step: string, description: string, additionalData?: any) => {
  const authState = authManager.getState();
  const localStorageData = mockLocalStorage.getItem('describe-it-auth');
  
  console.log(`[TEST] Step ${step}: ${description}`, {
    authState: {
      isAuthenticated: authState.isAuthenticated,
      user: authState.user,
      profile: authState.profile,
      isLoading: authState.isLoading,
    },
    localStorage: localStorageData,
    timestamp: new Date().toISOString(),
    ...additionalData,
  });
};

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
};

describe('Authentication Flow Integration Tests', () => {
  beforeAll(() => {
    // Reset all mocks before starting
    vi.clearAllMocks();
  });

  beforeEach(() => {
    // Reset auth state before each test
    authManager.getState().signOut();
    mockLocalStorage.clear();
    vi.clearAllMocks();
    
    logAuthState('SETUP', 'Test setup completed - fresh state');
  });

  afterEach(() => {
    // Cleanup after each test
    authManager.getState().signOut();
    mockLocalStorage.clear();
  });

  describe('Step 1: Initial Page Load (No Auth)', () => {
    it('should render with unauthenticated state', async () => {
      logAuthState('1.1', 'Starting initial page load test');
      
      const { container } = render(
        <TestWrapper>
          <UserMenu />
        </TestWrapper>
      );

      logAuthState('1.2', 'Component rendered, checking initial state');

      // Should show sign-in button
      await waitFor(() => {
        expect(screen.getByText('Sign In')).toBeInTheDocument();
      });

      logAuthState('1.3', 'Sign In button found - initial state correct');

      // Verify auth state is clean
      const authState = authManager.getState();
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.user).toBe(null);
      expect(authState.profile).toBe(null);

      logAuthState('1.4', 'Initial page load test completed successfully');
    });
  });

  describe('Step 2: Sign In Flow', () => {
    it('should successfully sign in and update UI', async () => {
      logAuthState('2.1', 'Starting sign in flow test');
      
      // Mock successful localStorage data
      const authData = {
        user: mockUser,
        profile: mockProfile,
        token: 'mock-token-123',
        expiresAt: Date.now() + 3600000, // 1 hour from now
      };
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(authData));

      const { container } = render(
        <TestWrapper>
          <UserMenu />
        </TestWrapper>
      );

      logAuthState('2.2', 'Component rendered, simulating sign in');

      // Simulate sign in
      await act(async () => {
        authManager.getState().setUser(mockUser, mockProfile);
      });

      logAuthState('2.3', 'AuthManager state updated, waiting for UI update');

      // Wait for UI to update
      await waitFor(() => {
        expect(screen.queryByText('Sign In')).not.toBeInTheDocument();
      }, { timeout: 3000 });

      logAuthState('2.4', 'UI updated - Sign In button removed');

      // Should show user menu
      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
      });

      logAuthState('2.5', 'User name displayed - sign in flow completed successfully');

      // Verify final auth state
      const finalAuthState = authManager.getState();
      expect(finalAuthState.isAuthenticated).toBe(true);
      expect(finalAuthState.user).toEqual(mockUser);
      expect(finalAuthState.profile).toEqual(mockProfile);
    });
  });

  describe('Step 3: Sign Out Flow', () => {
    it('should successfully sign out and update UI', async () => {
      logAuthState('3.1', 'Starting sign out flow test');
      
      // First, sign in
      await act(async () => {
        authManager.getState().setUser(mockUser, mockProfile);
      });

      logAuthState('3.2', 'Signed in, rendering component');

      const { container } = render(
        <TestWrapper>
          <UserMenu />
        </TestWrapper>
      );

      // Verify we're signed in
      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
      });

      logAuthState('3.3', 'Confirmed signed in state, proceeding with sign out');

      // Click on user menu to open dropdown
      const userButton = screen.getByText('Test User');
      await act(async () => {
        fireEvent.click(userButton);
      });

      logAuthState('3.4', 'User menu opened');

      // Find and click sign out button
      await waitFor(() => {
        expect(screen.getByText('Sign Out')).toBeInTheDocument();
      });

      const signOutButton = screen.getByText('Sign Out');
      
      await act(async () => {
        fireEvent.click(signOutButton);
      });

      logAuthState('3.5', 'Sign out button clicked, waiting for state update');

      // Wait for UI to update back to sign in
      await waitFor(() => {
        expect(screen.getByText('Sign In')).toBeInTheDocument();
      }, { timeout: 3000 });

      logAuthState('3.6', 'Sign out flow completed - Sign In button visible');

      // Verify auth state is clean
      const authState = authManager.getState();
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.user).toBe(null);
      expect(authState.profile).toBe(null);
    });
  });

  describe('Step 4: Sign In After Sign Out (Problematic Flow)', () => {
    it('should handle second sign in correctly after sign out', async () => {
      logAuthState('4.1', 'Starting problematic flow test - sign in after sign out');
      
      const { container, rerender } = render(
        <TestWrapper>
          <UserMenu />
        </TestWrapper>
      );

      // Step 4.1: Initial sign in
      logAuthState('4.2', 'Performing initial sign in');
      
      await act(async () => {
        authManager.getState().setUser(mockUser, mockProfile);
      });

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
      });

      logAuthState('4.3', 'Initial sign in successful');

      // Step 4.2: Sign out
      logAuthState('4.4', 'Performing sign out');
      
      const userButton = screen.getByText('Test User');
      await act(async () => {
        fireEvent.click(userButton);
      });

      const signOutButton = await screen.findByText('Sign Out');
      await act(async () => {
        fireEvent.click(signOutButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Sign In')).toBeInTheDocument();
      });

      logAuthState('4.5', 'Sign out completed');

      // Step 4.3: Second sign in (the problematic case)
      logAuthState('4.6', 'CRITICAL: Performing second sign in - this is where the issue occurs');
      
      // Clear all state to simulate the exact problematic scenario
      await act(async () => {
        authManager.getState().signOut();
      });

      logAuthState('4.7', 'State cleared, now setting user again');

      // Simulate the problematic scenario: localStorage has data but UI doesn't update
      const authData = {
        user: mockUser,
        profile: mockProfile,
        token: 'mock-token-456',
        expiresAt: Date.now() + 3600000,
      };
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(authData));

      await act(async () => {
        authManager.getState().setUser(mockUser, mockProfile);
      });

      logAuthState('4.8', 'AuthManager updated with user data, checking if UI updates');

      // This is where the bug likely manifests - UI doesn't update
      try {
        await waitFor(() => {
          expect(screen.queryByText('Sign In')).not.toBeInTheDocument();
        }, { timeout: 5000 });

        await waitFor(() => {
          expect(screen.getByText('Test User')).toBeInTheDocument();
        }, { timeout: 5000 });

        logAuthState('4.9', 'SUCCESS: Second sign in worked correctly');
      } catch (error) {
        logAuthState('4.10', 'FAILURE: Second sign in failed - UI did not update', {
          error: error.message,
          currentHTML: container.innerHTML,
          authManagerState: authManager.getState(),
        });
        
        // Re-render to force update and see if that fixes it
        rerender(
          <TestWrapper>
            <UserMenu />
          </TestWrapper>
        );

        logAuthState('4.11', 'Forced re-render completed, checking state again');
        
        // Check if re-render fixed the issue
        try {
          await waitFor(() => {
            expect(screen.getByText('Test User')).toBeInTheDocument();
          }, { timeout: 2000 });
          
          logAuthState('4.12', 'Re-render fixed the issue - this indicates a state propagation problem');
        } catch (rerenderError) {
          logAuthState('4.13', 'Re-render did not fix the issue - deeper problem exists', {
            rerenderError: rerenderError.message,
          });
        }

        throw error;
      }
    });
  });

  describe('State Synchronization Analysis', () => {
    it('should maintain consistency between AuthManager, Context, and Component', async () => {
      logAuthState('5.1', 'Starting state synchronization analysis');
      
      let contextValue: any = null;
      let componentProps: any = null;

      // Custom component to capture context and prop values
      const StateCapture = () => {
        const authContext = React.useContext(AuthContext);
        const authState = authManager.getState();
        
        contextValue = authContext;
        componentProps = {
          isAuthenticated: authState.isAuthenticated,
          user: authState.user,
          profile: authState.profile,
        };

        logAuthState('5.2', 'State captured from context and store', {
          contextValue,
          componentProps,
          storeState: authState,
        });

        return <UserMenu />;
      };

      render(
        <TestWrapper>
          <StateCapture />
        </TestWrapper>
      );

      // Test multiple state transitions
      const testStates = [
        { name: 'Initial', action: () => {} },
        { name: 'SignIn', action: () => authManager.getState().setUser(mockUser, mockProfile) },
        { name: 'SignOut', action: () => authManager.getState().signOut() },
        { name: 'SignInAgain', action: () => authManager.getState().setUser(mockUser, mockProfile) },
      ];

      for (const testState of testStates) {
        await act(async () => {
          testState.action();
        });

        await new Promise(resolve => setTimeout(resolve, 100)); // Allow for state propagation

        logAuthState(`5.${testStates.indexOf(testState) + 3}`, `State analysis: ${testState.name}`, {
          contextValue,
          componentProps,
          storeState: authManager.getState(),
          consistency: {
            contextMatchesStore: JSON.stringify(contextValue) === JSON.stringify(componentProps),
            allPropsMatch: contextValue?.isAuthenticated === componentProps?.isAuthenticated,
          },
        });
      }

      logAuthState('5.7', 'State synchronization analysis completed');
    });
  });
});