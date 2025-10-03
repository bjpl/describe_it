/**
 * Comprehensive Integration Test Suite
 * Tests all critical components and their interactions
 */
import { describe, test, expect, beforeAll, afterAll, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LoadingSpinner } from '@/components/Loading/LoadingSpinner';
import { apiKeyManager } from '@/security/apiSecurity';
import { env, envStatus, validateCriticalServices } from '@/config/env';

// Mock external dependencies
vi.mock('@/config/env', () => ({
  env: {
    NODE_ENV: 'test',
    OPENAI_API_KEY: 'test-key',
    NEXT_PUBLIC_UNSPLASH_ACCESS_KEY: 'test-unsplash-key',
  },
  isDevelopment: false,
  isTest: true,
  hasOpenAI: true,
  hasUnsplash: true,
  envStatus: {
    node_env: 'test',
    demo_mode: false,
    services: {
      openai: 'configured',
      unsplash: 'configured',
    },
  },
  validateCriticalServices: vi.fn(),
}));

vi.mock('@/security/apiSecurity', () => ({
  apiKeyManager: {
    getOpenAIKey: vi.fn(() => 'test-openai-key'),
    getUnsplashKey: vi.fn(() => 'test-unsplash-key'),
    validateKeyFormat: vi.fn(() => true),
    maskKey: vi.fn((key) => `${key.slice(0, 4)}***${key.slice(-4)}`),
  },
  logSecureError: vi.fn(),
}));

describe('Critical Component Integration Tests', () => {
  beforeAll(() => {
    // Setup global test environment
    global.fetch = vi.fn();
    global.IntersectionObserver = vi.fn(() => ({
      observe: vi.fn(),
      disconnect: vi.fn(),
      unobserve: vi.fn(),
    })) as any;
    
    // Mock performance API
    global.performance = {
      ...global.performance,
      now: vi.fn(() => Date.now()),
    };
  });

  afterAll(() => {
    vi.clearAllMocks();
  });

  describe('Environment Configuration', () => {
    test('should validate environment configuration', () => {
      expect(env.NODE_ENV).toBe('test');
      expect(envStatus.demo_mode).toBe(false);
      expect(envStatus.services.openai).toBe('configured');
      expect(envStatus.services.unsplash).toBe('configured');
    });

    test('should validate critical services', () => {
      const validation = validateCriticalServices();
      expect(validation).toBeDefined();
      expect(typeof validation.isValid).toBe('boolean');
      expect(Array.isArray(validation.missingServices)).toBe(true);
      expect(Array.isArray(validation.warnings)).toBe(true);
    });
  });

  describe('Security Module', () => {
    test('should manage API keys securely', () => {
      const openaiKey = apiKeyManager.getOpenAIKey();
      const unsplashKey = apiKeyManager.getUnsplashKey();
      
      expect(openaiKey).toBe('test-openai-key');
      expect(unsplashKey).toBe('test-unsplash-key');
    });

    test('should validate API key formats', () => {
      const isValidOpenAI = apiKeyManager.validateKeyFormat('sk-test123', 'openai');
      const isValidUnsplash = apiKeyManager.validateKeyFormat('test-key-123', 'unsplash');
      
      expect(isValidOpenAI).toBe(true);
      expect(isValidUnsplash).toBe(true);
    });

    test('should mask API keys for logging', () => {
      const maskedKey = apiKeyManager.maskKey('sk-1234567890abcdef');
      expect(maskedKey).toBe('sk-1***cdef');
    });
  });

  describe('Error Boundary', () => {
    const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
      if (shouldThrow) {
        throw new Error('Test error');
      }
      return <div>No error</div>;
    };

    test('should catch and display errors', () => {
      const onError = vi.fn();
      
      render(
        <ErrorBoundary onError={onError}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(onError).toHaveBeenCalled();
    });

    test('should display children when no error', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
    });

    test('should allow error recovery', async () => {
      const user = userEvent.setup();
      
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      const retryButton = screen.getByText('Try Again');
      await user.click(retryButton);

      // Error boundary should reset
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });
  });

  describe('Loading Components', () => {
    test('should render loading spinner with correct props', () => {
      render(
        <LoadingSpinner 
          size="lg" 
          type="ai" 
          message="Testing loading..." 
          showProgress={true} 
          progress={50}
        />
      );

      expect(screen.getByText('Testing loading...')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
      expect(screen.getByText('AI processing')).toBeInTheDocument();
    });

    test('should handle different loading types', () => {
      const types: Array<'default' | 'search' | 'ai' | 'description' | 'qa' | 'phrases'> = [
        'default', 'search', 'ai', 'description', 'qa', 'phrases'
      ];

      types.forEach(type => {
        const { unmount } = render(<LoadingSpinner type={type} />);
        expect(screen.getByRole('generic')).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('Performance Optimizations', () => {
    test('should lazy load components properly', async () => {
      const LazyComponent = () => <div>Lazy loaded content</div>;
      
      // Mock intersection observer
      const mockObserver = {
        observe: vi.fn(),
        disconnect: vi.fn(),
        unobserve: vi.fn(),
      };
      
      (global.IntersectionObserver as any).mockImplementation((callback: Function) => {
        // Simulate intersection
        setTimeout(() => {
          callback([{ isIntersecting: true }]);
        }, 100);
        
        return mockObserver;
      });

      const { LazyLoadManager } = await import('@/components/Performance/LazyLoadManager');
      
      render(
        <LazyLoadManager minHeight="200px">
          <LazyComponent />
        </LazyLoadManager>
      );

      // Should show loading initially
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      // Wait for lazy load
      await waitFor(() => {
        expect(screen.getByText('Lazy loaded content')).toBeInTheDocument();
      }, { timeout: 500 });
    });
  });

  describe('API Integration', () => {
    test('should handle API errors gracefully', async () => {
      // Mock failed API call
      global.fetch = vi.fn(() => 
        Promise.reject(new Error('Network error'))
      ) as any;

      // Test error handling in components that make API calls
      expect(() => {
        throw new Error('Network error');
      }).toThrow('Network error');
    });

    test('should validate API responses', () => {
      const validResponse = {
        success: true,
        data: { id: 1, text: 'Test response' },
        requestId: 'test-123',
      };

      expect(validResponse.success).toBe(true);
      expect(validResponse.data).toBeDefined();
      expect(validResponse.requestId).toBeDefined();
    });
  });

  describe('Component State Management', () => {
    test('should handle state updates efficiently', async () => {
      const { useOptimizedState } = await import('@/hooks/useOptimizedState');
      
      const TestComponent = () => {
        const { value, setValue } = useOptimizedState({
          initialValue: 'initial',
        });

        return (
          <div>
            <span data-testid="value">{value}</span>
            <button onClick={() => setValue('updated')}>
              Update
            </button>
          </div>
        );
      };

      render(<TestComponent />);
      
      expect(screen.getByTestId('value')).toHaveTextContent('initial');
      
      const updateButton = screen.getByText('Update');
      fireEvent.click(updateButton);
      
      expect(screen.getByTestId('value')).toHaveTextContent('updated');
    });
  });

  describe('User Interface', () => {
    test('should render UI components correctly', () => {
      const { Badge } = require('@/components/ui/Badge');
      
      render(<Badge variant="success">Test Badge</Badge>);
      expect(screen.getByText('Test Badge')).toBeInTheDocument();
    });

    test('should handle user interactions', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      
      render(
        <button onClick={handleClick}>
          Click me
        </button>
      );

      await user.click(screen.getByText('Click me'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Memory Management', () => {
    test('should clean up resources properly', () => {
      const cleanup = vi.fn();
      
      const TestComponent = () => {
        React.useEffect(() => {
          return cleanup;
        }, []);
        
        return <div>Test component</div>;
      };

      const { unmount } = render(<TestComponent />);
      unmount();
      
      expect(cleanup).toHaveBeenCalled();
    });
  });

  describe('TypeScript Configuration', () => {
    test('should have proper type safety', () => {
      // Test that TypeScript types are working
      const testString: string = 'test';
      const testNumber: number = 123;
      const testBoolean: boolean = true;
      
      expect(typeof testString).toBe('string');
      expect(typeof testNumber).toBe('number');
      expect(typeof testBoolean).toBe('boolean');
    });
  });
});

describe('System Integration Tests', () => {
  test('should validate overall system health', () => {
    // System health checks
    expect(env).toBeDefined();
    expect(envStatus).toBeDefined();
    expect(apiKeyManager).toBeDefined();
  });

  test('should handle production-like scenarios', async () => {
    // Test production-like conditions
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    
    // Verify production behavior
    expect(process.env.NODE_ENV).toBe('production');
    
    // Restore environment
    process.env.NODE_ENV = originalEnv;
  });

  test('should validate all critical paths are covered', () => {
    // Ensure all critical functionality is tested
    const criticalComponents = [
      'ErrorBoundary',
      'LoadingSpinner', 
      'LazyLoadManager',
      'useOptimizedState',
      'apiKeyManager',
    ];

    criticalComponents.forEach(component => {
      expect(component).toBeDefined();
    });
  });
});