/**
 * Test utilities for React 19 compatibility
 * Enhanced rendering and testing helpers
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { vi } from 'vitest';

// Enhanced wrapper for providers
interface AllTheProvidersProps {
  children: React.ReactNode;
}

const AllTheProviders = ({ children }: AllTheProvidersProps) => {
  return (
    <div data-testid="test-wrapper">
      {children}
    </div>
  );
};

// React 19 compatible custom render
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
): RenderResult => {
  return render(ui, { wrapper: AllTheProviders, ...options });
};

// Enhanced render with performance tracking
const renderWithPerformance = async (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
): Promise<{ result: RenderResult; renderTime: number }> => {
  const startTime = performance.now();
  const result = customRender(ui, options);
  
  // Wait for any async operations to complete
  await new Promise(resolve => setTimeout(resolve, 0));
  
  const renderTime = performance.now() - startTime;
  
  return { result, renderTime };
};

// Mock user event utilities for React 19
export const createMockUserEvent = () => ({
  click: vi.fn(),
  type: vi.fn(),
  clear: vi.fn(),
  keyboard: vi.fn(),
  pointer: vi.fn(),
  upload: vi.fn(),
  selectOptions: vi.fn(),
  deselectOptions: vi.fn(),
  tab: vi.fn(),
  hover: vi.fn(),
  unhover: vi.fn(),
  dblClick: vi.fn(),
  tripleClick: vi.fn(),
  setup: () => createMockUserEvent(),
});

// Enhanced test data factories for React 19
export const createTestProps = {
  withDefaults: <T extends Record<string, any>>(overrides: Partial<T> = {}): T => ({
    'data-testid': 'test-component',
    ...overrides,
  } as T),
  
  withHandlers: (handlers: Record<string, any> = {}) => ({
    onClick: vi.fn(),
    onChange: vi.fn(),
    onSubmit: vi.fn(),
    onBlur: vi.fn(),
    onFocus: vi.fn(),
    ...handlers,
  }),
  
  withAccessibility: (overrides: Record<string, any> = {}) => ({
    role: 'button',
    'aria-label': 'Test component',
    'aria-describedby': 'test-description',
    tabIndex: 0,
    ...overrides,
  }),
};

// React 19 compatible async utilities
export const waitForCondition = async (
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 50
): Promise<void> => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const result = await condition();
      if (result) return;
    } catch (error) {
      // Continue checking
    }
    
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`Condition not met within ${timeout}ms`);
};

// Enhanced error boundary for testing
export class TestErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: (error: Error) => void },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return <div data-testid="error-boundary">Error: {this.state.error?.message}</div>;
    }

    return this.props.children;
  }
}

// Memory leak detection for React 19
export const createMemoryTracker = () => {
  const initialMemory = typeof process !== 'undefined' && process.memoryUsage 
    ? process.memoryUsage().heapUsed 
    : 0;
  
  return {
    getMemoryUsage: () => {
      if (typeof process !== 'undefined' && process.memoryUsage) {
        return process.memoryUsage().heapUsed - initialMemory;
      }
      return 0;
    },
    
    checkForLeaks: (threshold = 10 * 1024 * 1024) => { // 10MB
      const usage = typeof process !== 'undefined' && process.memoryUsage 
        ? process.memoryUsage().heapUsed - initialMemory
        : 0;
      
      if (usage > threshold) {
        console.warn(`Memory usage increased by ${Math.round(usage / 1024 / 1024)}MB`);
      }
      
      return usage;
    }
  };
};

// Performance assertion helpers for React 19
export const performanceMatchers = {
  toRenderFast: (renderTime: number, threshold = 100) => {
    const pass = renderTime <= threshold;
    return {
      pass,
      message: () => 
        `Expected render time ${renderTime}ms to be ${pass ? 'above' : 'below'} ${threshold}ms`
    };
  },
  
  toUseMemoryEfficiently: (memoryUsage: number, threshold = 50 * 1024 * 1024) => {
    const pass = memoryUsage <= threshold;
    return {
      pass,
      message: () => 
        `Expected memory usage ${Math.round(memoryUsage / 1024 / 1024)}MB to be ${pass ? 'above' : 'below'} ${Math.round(threshold / 1024 / 1024)}MB`
    };
  }
};

// React 19 compatible act utility
export const actCompat = async (callback: () => void | Promise<void>): Promise<void> => {
  // In React 19, act might not be needed in all cases
  // but we provide compatibility
  try {
    const { act } = await import('@testing-library/react');
    return act(callback);
  } catch {
    // Fallback for cases where act is not available
    return callback();
  }
};

// Export utilities
export {
  customRender as render,
  renderWithPerformance,
  AllTheProviders,
};

// Re-export everything from testing library for convenience
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';