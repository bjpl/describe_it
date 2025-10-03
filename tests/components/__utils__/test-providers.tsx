/**
 * Test Provider Wrappers
 *
 * Specialized provider wrappers for different testing scenarios
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from './test-utils';

/**
 * Minimal provider wrapper
 * Use when you don't need auth or theme
 */
export function MinimalProviders({ children }: { children: React.ReactNode }) {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

/**
 * Auth-only provider wrapper
 * Use when testing auth-dependent components
 */
interface AuthOnlyProvidersProps {
  children: React.ReactNode;
  mockUser?: any;
}

export function AuthOnlyProviders({ children, mockUser }: AuthOnlyProvidersProps) {
  const queryClient = createTestQueryClient();

  // Setup mock auth context
  if (mockUser) {
    window.localStorage.setItem('user', JSON.stringify(mockUser));
  }

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

/**
 * Query-only provider wrapper
 * Use when testing components with data fetching
 */
interface QueryOnlyProvidersProps {
  children: React.ReactNode;
  queryClient?: QueryClient;
}

export function QueryOnlyProviders({ children, queryClient }: QueryOnlyProvidersProps) {
  const testQueryClient = queryClient || createTestQueryClient();

  return (
    <QueryClientProvider client={testQueryClient}>
      {children}
    </QueryClientProvider>
  );
}

/**
 * Mock router provider for testing navigation
 */
interface MockRouterProviderProps {
  children: React.ReactNode;
  initialRoute?: string;
  push?: jest.Mock;
  replace?: jest.Mock;
  back?: jest.Mock;
}

export function MockRouterProvider({
  children,
  initialRoute = '/',
  push = jest.fn(),
  replace = jest.fn(),
  back = jest.fn(),
}: MockRouterProviderProps) {
  // Mock Next.js router
  const router = {
    pathname: initialRoute,
    route: initialRoute,
    query: {},
    asPath: initialRoute,
    push,
    replace,
    back,
    prefetch: jest.fn(),
    beforePopState: jest.fn(),
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
    isFallback: false,
    isLocaleDomain: false,
    isReady: true,
    isPreview: false,
  };

  return children as React.ReactElement;
}

/**
 * Form provider wrapper for testing forms
 */
interface FormProviderProps {
  children: React.ReactNode;
  initialValues?: Record<string, any>;
  onSubmit?: jest.Mock;
}

export function FormProvider({
  children,
  initialValues = {},
  onSubmit = jest.fn(),
}: FormProviderProps) {
  return children as React.ReactElement;
}

/**
 * Toast/Notification provider wrapper
 */
interface ToastProviderProps {
  children: React.ReactNode;
}

export function MockToastProvider({ children }: ToastProviderProps) {
  return children as React.ReactElement;
}

/**
 * Feature flag provider for testing feature toggles
 */
interface FeatureFlagProviderProps {
  children: React.ReactNode;
  flags?: Record<string, boolean>;
}

export function FeatureFlagProvider({
  children,
  flags = {},
}: FeatureFlagProviderProps) {
  // Mock feature flag context
  return children as React.ReactElement;
}

/**
 * A/B test provider for testing experiments
 */
interface ABTestProviderProps {
  children: React.ReactNode;
  experiments?: Record<string, string>;
}

export function ABTestProvider({
  children,
  experiments = {},
}: ABTestProviderProps) {
  // Mock A/B testing context
  return children as React.ReactElement;
}

/**
 * Analytics provider for testing tracking
 */
interface AnalyticsProviderProps {
  children: React.ReactNode;
  trackEvent?: jest.Mock;
  trackPageView?: jest.Mock;
}

export function MockAnalyticsProvider({
  children,
  trackEvent = jest.fn(),
  trackPageView = jest.fn(),
}: AnalyticsProviderProps) {
  // Mock analytics context
  return children as React.ReactElement;
}

/**
 * Combined test provider with all mocks
 * Use for integration tests
 */
interface FullTestProviderProps {
  children: React.ReactNode;
  queryClient?: QueryClient;
  mockUser?: any;
  initialRoute?: string;
  flags?: Record<string, boolean>;
}

export function FullTestProvider({
  children,
  queryClient,
  mockUser,
  initialRoute,
  flags,
}: FullTestProviderProps) {
  return (
    <QueryOnlyProviders queryClient={queryClient}>
      <AuthOnlyProviders mockUser={mockUser}>
        <MockRouterProvider initialRoute={initialRoute}>
          <FeatureFlagProvider flags={flags}>
            <MockToastProvider>
              <MockAnalyticsProvider>
                {children}
              </MockAnalyticsProvider>
            </MockToastProvider>
          </FeatureFlagProvider>
        </MockRouterProvider>
      </AuthOnlyProviders>
    </QueryOnlyProviders>
  );
}
