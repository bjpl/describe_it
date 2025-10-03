/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import { ToastProvider, useToast } from '@/components/ui/Toast';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Test component to use the toast hook
function TestComponent() {
  const { toast, dismiss, dismissAll } = useToast();

  return (
    <div>
      <button onClick={() => toast({ title: 'Test Toast' })}>Show Toast</button>
      <button onClick={() => toast({ type: 'success', description: 'Success!' })}>Success Toast</button>
      <button onClick={() => toast({ type: 'error', description: 'Error!' })}>Error Toast</button>
      <button onClick={() => toast({ type: 'warning', description: 'Warning!' })}>Warning Toast</button>
      <button onClick={() => toast({ type: 'info', description: 'Info!' })}>Info Toast</button>
      <button onClick={dismissAll}>Dismiss All</button>
    </div>
  );
}

describe('Toast Components', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('ToastProvider', () => {
    it('should render children', () => {
      render(
        <ToastProvider>
          <div>Children content</div>
        </ToastProvider>
      );
      expect(screen.getByText('Children content')).toBeInTheDocument();
    });

    it('should throw error when useToast is used outside provider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      function BadComponent() {
        useToast(); // This should throw
        return null;
      }

      expect(() => render(<BadComponent />)).toThrow('useToast must be used within a ToastProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('Toast Creation', () => {
    it('should create and display a toast', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Toast'));
      expect(screen.getByText('Test Toast')).toBeInTheDocument();
    });

    it('should create success toast', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Success Toast'));
      expect(screen.getByText('Success!')).toBeInTheDocument();
    });

    it('should create error toast', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Error Toast'));
      expect(screen.getByText('Error!')).toBeInTheDocument();
    });

    it('should create warning toast', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Warning Toast'));
      expect(screen.getByText('Warning!')).toBeInTheDocument();
    });

    it('should create info toast', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Info Toast'));
      expect(screen.getByText('Info!')).toBeInTheDocument();
    });

    it('should display both title and description', () => {
      function TestWithTitleDesc() {
        const { toast } = useToast();
        return (
          <button onClick={() => toast({ title: 'Title', description: 'Description' })}>
            Show Toast
          </button>
        );
      }

      render(
        <ToastProvider>
          <TestWithTitleDesc />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Toast'));
      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
    });
  });

  describe('Toast Dismissal', () => {
    it('should dismiss toast when close button is clicked', async () => {
      function TestDismiss() {
        const { toast } = useToast();
        return (
          <button onClick={() => toast({ title: 'Dismissible Toast', dismissible: true })}>
            Show Toast
          </button>
        );
      }

      render(
        <ToastProvider>
          <TestDismiss />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Toast'));
      expect(screen.getByText('Dismissible Toast')).toBeInTheDocument();

      const closeButton = screen.getByLabelText('Close notification');
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('Dismissible Toast')).not.toBeInTheDocument();
      });
    });

    it('should dismiss all toasts', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      // Create multiple toasts
      fireEvent.click(screen.getByText('Show Toast'));
      fireEvent.click(screen.getByText('Success Toast'));
      fireEvent.click(screen.getByText('Error Toast'));

      expect(screen.getByText('Test Toast')).toBeInTheDocument();
      expect(screen.getByText('Success!')).toBeInTheDocument();
      expect(screen.getByText('Error!')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Dismiss All'));

      expect(screen.queryByText('Test Toast')).not.toBeInTheDocument();
      expect(screen.queryByText('Success!')).not.toBeInTheDocument();
      expect(screen.queryByText('Error!')).not.toBeInTheDocument();
    });

    it('should auto-dismiss after duration', async () => {
      function TestAutoDismiss() {
        const { toast } = useToast();
        return (
          <button onClick={() => toast({ description: 'Auto dismiss', duration: 1000 })}>
            Show Toast
          </button>
        );
      }

      render(
        <ToastProvider>
          <TestAutoDismiss />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Toast'));
      expect(screen.getByText('Auto dismiss')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.queryByText('Auto dismiss')).not.toBeInTheDocument();
      });
    });

    it('should not auto-dismiss when duration is 0', async () => {
      function TestNoDismiss() {
        const { toast } = useToast();
        return (
          <button onClick={() => toast({ description: 'No auto dismiss', duration: 0 })}>
            Show Toast
          </button>
        );
      }

      render(
        <ToastProvider>
          <TestNoDismiss />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Toast'));
      expect(screen.getByText('No auto dismiss')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(screen.getByText('No auto dismiss')).toBeInTheDocument();
    });
  });

  describe('Toast Actions', () => {
    it('should render action button', () => {
      function TestAction() {
        const { toast } = useToast();
        return (
          <button
            onClick={() =>
              toast({
                description: 'Action toast',
                action: { label: 'Undo', onClick: () => {} },
              })
            }
          >
            Show Toast
          </button>
        );
      }

      render(
        <ToastProvider>
          <TestAction />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Toast'));
      expect(screen.getByText('Undo')).toBeInTheDocument();
    });

    it('should call action onClick', () => {
      const handleAction = vi.fn();

      function TestAction() {
        const { toast } = useToast();
        return (
          <button
            onClick={() =>
              toast({
                description: 'Action toast',
                action: { label: 'Action', onClick: handleAction },
              })
            }
          >
            Show Toast
          </button>
        );
      }

      render(
        <ToastProvider>
          <TestAction />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Toast'));
      fireEvent.click(screen.getByText('Action'));
      expect(handleAction).toHaveBeenCalled();
    });
  });

  describe('Max Toasts Limit', () => {
    it('should respect maxToasts limit', () => {
      function TestMaxToasts() {
        const { toast } = useToast();
        return (
          <div>
            <button onClick={() => toast({ description: 'Toast 1' })}>Toast 1</button>
            <button onClick={() => toast({ description: 'Toast 2' })}>Toast 2</button>
            <button onClick={() => toast({ description: 'Toast 3' })}>Toast 3</button>
            <button onClick={() => toast({ description: 'Toast 4' })}>Toast 4</button>
          </div>
        );
      }

      render(
        <ToastProvider maxToasts={2}>
          <TestMaxToasts />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Toast 1'));
      fireEvent.click(screen.getByText('Toast 2'));
      fireEvent.click(screen.getByText('Toast 3'));

      expect(screen.getByText('Toast 3')).toBeInTheDocument();
      expect(screen.getByText('Toast 2')).toBeInTheDocument();
      expect(screen.queryByText('Toast 1')).not.toBeInTheDocument();
    });
  });

  describe('Toast Types and Styles', () => {
    it('should apply success styles', () => {
      function TestSuccess() {
        const { toast } = useToast();
        return (
          <button onClick={() => toast({ type: 'success', description: 'Success!' })}>
            Show
          </button>
        );
      }

      const { container } = render(
        <ToastProvider>
          <TestSuccess />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show'));

      const toastElement = container.querySelector('[role="alert"]');
      expect(toastElement).toHaveClass('border-green-200');
    });

    it('should apply error styles', () => {
      function TestError() {
        const { toast } = useToast();
        return (
          <button onClick={() => toast({ type: 'error', description: 'Error!' })}>
            Show
          </button>
        );
      }

      const { container } = render(
        <ToastProvider>
          <TestError />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show'));

      const toastElement = container.querySelector('[role="alert"]');
      expect(toastElement).toHaveClass('border-red-200');
    });
  });

  describe('Accessibility', () => {
    it('should have role="alert"', () => {
      function TestA11y() {
        const { toast } = useToast();
        return (
          <button onClick={() => toast({ description: 'Alert' })}>Show Toast</button>
        );
      }

      render(
        <ToastProvider>
          <TestA11y />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Toast'));
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should have aria-live="assertive"', () => {
      function TestA11y() {
        const { toast } = useToast();
        return (
          <button onClick={() => toast({ description: 'Alert' })}>Show Toast</button>
        );
      }

      render(
        <ToastProvider>
          <TestA11y />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Toast'));
      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'assertive');
    });

    it('should have aria-atomic="true"', () => {
      function TestA11y() {
        const { toast } = useToast();
        return (
          <button onClick={() => toast({ description: 'Alert' })}>Show Toast</button>
        );
      }

      render(
        <ToastProvider>
          <TestA11y />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Toast'));
      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-atomic', 'true');
    });

    it('should have region label for viewport', () => {
      render(
        <ToastProvider>
          <div />
        </ToastProvider>
      );

      expect(screen.getByRole('region', { name: 'Notifications' })).toBeInTheDocument();
    });
  });
});
