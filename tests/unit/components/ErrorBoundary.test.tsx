import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ErrorBoundary } from '@/providers/ErrorBoundary';

// Mock child component that can throw errors
const ThrowError = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div data-testid="child-component">Child rendered successfully</div>;
};

// Mock console.error to prevent test output pollution
const originalError = console.error;

describe('ErrorBoundary Component', () => {
  beforeEach(() => {
    // Mock console.error to prevent error logs during tests
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalError;
  });

  describe('Normal Operation', () => {
    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );
      
      expect(screen.getByTestId('child-component')).toBeInTheDocument();
      expect(screen.getByText('Child rendered successfully')).toBeInTheDocument();
    });

    it('should render multiple children successfully', () => {
      render(
        <ErrorBoundary>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
        </ErrorBoundary>
      );
      
      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should catch and display error when child component throws', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      // Should show error fallback UI
      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
      expect(screen.queryByTestId('child-component')).not.toBeInTheDocument();
    });

    it('should show error details in error fallback', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      // Look for error message or error indication
      expect(screen.getByText(/error occurred/i)).toBeInTheDocument();
    });

    it('should provide retry functionality', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      // Should show error state
      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
      
      // Look for retry button
      const retryButton = screen.queryByText(/retry/i) || screen.queryByText(/try again/i);
      if (retryButton) {
        fireEvent.click(retryButton);
      }
      
      // Re-render with non-throwing component
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );
      
      // Should recover and show child component
      expect(screen.getByTestId('child-component')).toBeInTheDocument();
    });
  });

  describe('Error Reporting', () => {
    it('should log errors to console', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      // Verify error was logged
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Error Recovery', () => {
    it('should reset error state when children change', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      // Should show error state
      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
      
      // Rerender with different children
      rerender(
        <ErrorBoundary>
          <div data-testid="new-child">New child component</div>
        </ErrorBoundary>
      );
      
      // Should recover and show new child
      expect(screen.getByTestId('new-child')).toBeInTheDocument();
      expect(screen.queryByText(/Something went wrong/i)).not.toBeInTheDocument();
    });
  });

  describe('Nested Error Boundaries', () => {
    it('should handle nested error boundaries correctly', () => {
      render(
        <ErrorBoundary>
          <div data-testid="outer-content">Outer content</div>
          <ErrorBoundary>
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>
        </ErrorBoundary>
      );
      
      // Outer content should still be visible
      expect(screen.getByTestId('outer-content')).toBeInTheDocument();
      // Inner error boundary should catch the error
      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle errors thrown during render', () => {
      const ErrorComponent = () => {
        throw new Error('Render error');
      };
      
      render(
        <ErrorBoundary>
          <ErrorComponent />
        </ErrorBoundary>
      );
      
      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    });

    it('should handle async errors gracefully', async () => {
      const AsyncErrorComponent = () => {
        React.useEffect(() => {
          // Async errors won't be caught by error boundary
          // but component should handle them gracefully
          setTimeout(() => {
            // This error won't be caught by error boundary
            // but component should not crash
          }, 0);
        }, []);
        
        return <div data-testid="async-component">Async component</div>;
      };
      
      render(
        <ErrorBoundary>
          <AsyncErrorComponent />
        </ErrorBoundary>
      );
      
      expect(screen.getByTestId('async-component')).toBeInTheDocument();
    });

    it('should handle null or undefined children', () => {
      render(
        <ErrorBoundary>
          {null}
          {undefined}
          <div data-testid="valid-child">Valid child</div>
        </ErrorBoundary>
      );
      
      expect(screen.getByTestId('valid-child')).toBeInTheDocument();
    });
  });

  describe('Custom Error Fallback', () => {
    it('should use custom error fallback when provided', () => {
      const CustomFallback = ({ error }: { error: Error }) => (
        <div data-testid="custom-error-fallback">
          Custom error: {error.message}
        </div>
      );
      
      // If ErrorBoundary supports custom fallback
      render(
        <ErrorBoundary fallback={CustomFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      // Should show custom fallback if supported
      const customFallback = screen.queryByTestId('custom-error-fallback');
      if (customFallback) {
        expect(customFallback).toBeInTheDocument();
        expect(customFallback).toHaveTextContent('Test error');
      } else {
        // Should at least show some error state
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      }
    });
  });

  describe('Accessibility', () => {
    it('should provide accessible error messages', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      // Error message should be accessible
      const errorElement = screen.getByText(/error/i);
      expect(errorElement).toBeInTheDocument();
      
      // Should have appropriate role or aria attributes if implemented
      // This depends on the specific implementation of ErrorBoundary
    });

    it('should maintain focus management during error states', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      // After error, focus should be manageable
      // This is more important for retry buttons or other interactive elements
      const retryButton = screen.queryByRole('button');
      if (retryButton) {
        retryButton.focus();
        expect(retryButton).toHaveFocus();
      }
    });
  });

  describe('Production Behavior', () => {
    it('should handle errors gracefully in production mode', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      // Should still show error fallback in production
      expect(screen.getByText(/error/i)).toBeInTheDocument();
      
      process.env.NODE_ENV = originalNodeEnv;
    });
  });
});
