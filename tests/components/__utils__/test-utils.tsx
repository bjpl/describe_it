/**
 * Custom Test Utilities
 *
 * Provides enhanced rendering utilities with all necessary providers
 * for comprehensive component testing.
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/providers/AuthProvider';
import { ThemeProvider } from 'next-themes';

/**
 * Custom render options extending RTL's RenderOptions
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  /** Initial route for testing navigation */
  initialRoute?: string;
  /** Mock auth state */
  authState?: {
    user: any | null;
    loading: boolean;
  };
  /** Custom query client configuration */
  queryClient?: QueryClient;
  /** Theme configuration */
  theme?: 'light' | 'dark' | 'system';
}

/**
 * Creates a fresh QueryClient instance for each test
 * Prevents state leakage between tests
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: () => {},
      warn: () => {},
      error: () => {},
    },
  });
}

/**
 * All Providers Wrapper
 * Wraps components with all necessary providers for testing
 */
interface AllProvidersProps {
  children: React.ReactNode;
  queryClient?: QueryClient;
  theme?: 'light' | 'dark' | 'system';
}

function AllProviders({ children, queryClient, theme = 'light' }: AllProvidersProps) {
  const testQueryClient = queryClient || createTestQueryClient();

  return (
    <QueryClientProvider client={testQueryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme={theme}
        enableSystem={theme === 'system'}
        disableTransitionOnChange
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

/**
 * Custom render function with all providers
 *
 * @example
 * ```tsx
 * const { getByText } = renderWithProviders(<MyComponent />);
 * ```
 *
 * @example With options
 * ```tsx
 * const { getByRole } = renderWithProviders(
 *   <MyComponent />,
 *   { theme: 'dark', initialRoute: '/dashboard' }
 * );
 * ```
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: CustomRenderOptions
): RenderResult {
  const {
    queryClient,
    theme,
    ...renderOptions
  } = options || {};

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <AllProviders queryClient={queryClient} theme={theme}>
      {children}
    </AllProviders>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

/**
 * Render with specific auth state
 *
 * @example
 * ```tsx
 * const user = createMockUser();
 * renderWithAuth(<MyComponent />, { user });
 * ```
 */
export function renderWithAuth(
  ui: ReactElement,
  authState?: { user: any | null; loading?: boolean },
  options?: CustomRenderOptions
): RenderResult {
  // Mock localStorage for auth
  if (authState?.user) {
    window.localStorage.setItem('auth-token', 'mock-token');
    window.localStorage.setItem('user', JSON.stringify(authState.user));
  }

  return renderWithProviders(ui, options);
}

/**
 * Cleanup function for tests
 * Clears all mocks and storage
 */
export function cleanupTest(): void {
  window.localStorage.clear();
  window.sessionStorage.clear();
  jest.clearAllMocks();
}

/**
 * Wait for loading states to complete
 * Useful for async components
 */
export async function waitForLoadingToFinish(): Promise<void> {
  const { waitFor } = await import('@testing-library/react');
  await waitFor(() => {
    const loadingElements = document.querySelectorAll('[data-testid*="loading"]');
    expect(loadingElements.length).toBe(0);
  });
}

/**
 * Simulate user interaction delay
 * More realistic than immediate actions
 */
export function delay(ms: number = 100): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a mock IntersectionObserver
 * Required for components using intersection observer
 */
export function mockIntersectionObserver(): void {
  global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    takeRecords() { return []; }
    unobserve() {}
  } as any;
}

/**
 * Create a mock ResizeObserver
 * Required for components using resize observer
 */
export function mockResizeObserver(): void {
  global.ResizeObserver = class ResizeObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    unobserve() {}
  } as any;
}

/**
 * Mock window.matchMedia
 * Required for responsive components
 */
export function mockMatchMedia(matches: boolean = false): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

/**
 * Setup all common browser API mocks
 * Call this in beforeAll for tests that need browser APIs
 */
export function setupBrowserMocks(): void {
  mockIntersectionObserver();
  mockResizeObserver();
  mockMatchMedia();
}

// Re-export everything from RTL
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
