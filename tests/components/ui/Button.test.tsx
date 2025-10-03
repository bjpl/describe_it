import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import { Button } from '@/components/ui/Button';

describe('Button Component', () => {
  describe('Props Validation', () => {
    it('should render with default props', () => {
      render(<Button>Click me</Button>);
      const button = screen.getByRole('button', { name: /click me/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('bg-primary');
    });

    it('should render children correctly', () => {
      render(<Button>Test Button</Button>);
      expect(screen.getByText('Test Button')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<Button className="custom-class">Button</Button>);
      expect(screen.getByRole('button')).toHaveClass('custom-class');
    });
  });

  describe('Variants and States', () => {
    it('should render default variant', () => {
      render(<Button variant="default">Default</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-primary', 'text-primary-foreground');
    });

    it('should render secondary variant', () => {
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-secondary', 'text-secondary-foreground');
    });

    it('should render destructive variant', () => {
      render(<Button variant="destructive">Delete</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-destructive', 'text-destructive-foreground');
    });

    it('should render outline variant', () => {
      render(<Button variant="outline">Outline</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('border', 'border-input', 'bg-background');
    });

    it('should render ghost variant', () => {
      render(<Button variant="ghost">Ghost</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('hover:bg-accent');
    });

    it('should render link variant', () => {
      render(<Button variant="link">Link</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('text-primary', 'underline-offset-4');
    });
  });

  describe('Sizes', () => {
    it('should render default size', () => {
      render(<Button size="default">Default Size</Button>);
      expect(screen.getByRole('button')).toHaveClass('h-10', 'px-4', 'py-2');
    });

    it('should render small size', () => {
      render(<Button size="sm">Small</Button>);
      expect(screen.getByRole('button')).toHaveClass('h-9', 'px-3');
    });

    it('should render large size', () => {
      render(<Button size="lg">Large</Button>);
      expect(screen.getByRole('button')).toHaveClass('h-11', 'px-8');
    });

    it('should render icon size', () => {
      render(<Button size="icon">⚙</Button>);
      expect(screen.getByRole('button')).toHaveClass('h-10', 'w-10');
    });
  });

  describe('Click Handlers', () => {
    it('should call onClick when clicked', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click me</Button>);

      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when disabled', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick} disabled>Disabled</Button>);

      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should not call onClick when loading', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick} loading>Loading</Button>);

      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility (ARIA)', () => {
    it('should have proper role', () => {
      render(<Button>Button</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should have aria-disabled when disabled', () => {
      render(<Button disabled>Disabled</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true');
    });

    it('should have aria-disabled when loading', () => {
      render(<Button loading>Loading</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true');
    });

    it('should be focusable when not disabled', () => {
      render(<Button>Focusable</Button>);
      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();
    });

    it('should have focus ring classes', () => {
      render(<Button>Button</Button>);
      expect(screen.getByRole('button')).toHaveClass('focus-visible:ring-2');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should trigger onClick on Enter key', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Button</Button>);

      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });
      expect(handleClick).toHaveBeenCalled();
    });

    it('should trigger onClick on Space key', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Button</Button>);

      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: ' ', code: 'Space' });
      expect(handleClick).toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner when loading', () => {
      render(<Button loading>Loading</Button>);
      const spinner = screen.getByRole('button').querySelector('svg');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('animate-spin');
    });

    it('should hide left icon when loading', () => {
      render(<Button loading leftIcon={<span>📧</span>}>Send</Button>);
      const leftIcon = screen.queryByText('📧');
      expect(leftIcon).not.toBeInTheDocument();
    });

    it('should be disabled when loading', () => {
      render(<Button loading>Loading</Button>);
      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  describe('Icons', () => {
    it('should render left icon', () => {
      render(<Button leftIcon={<span data-testid="left-icon">←</span>}>Back</Button>);
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    });

    it('should render right icon', () => {
      render(<Button rightIcon={<span data-testid="right-icon">→</span>}>Next</Button>);
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });

    it('should render both left and right icons', () => {
      render(
        <Button
          leftIcon={<span data-testid="left-icon">←</span>}
          rightIcon={<span data-testid="right-icon">→</span>}
        >
          Both
        </Button>
      );
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });

    it('should have aria-hidden on icon elements', () => {
      render(<Button leftIcon={<span>←</span>}>Back</Button>);
      const iconContainer = screen.getByRole('button').querySelector('[aria-hidden="true"]');
      expect(iconContainer).toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled</Button>);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should have disabled styles', () => {
      render(<Button disabled>Disabled</Button>);
      expect(screen.getByRole('button')).toHaveClass('disabled:pointer-events-none', 'disabled:opacity-50');
    });
  });

  describe('Ref Forwarding', () => {
    it('should forward ref to button element', () => {
      const ref = React.createRef<HTMLButtonElement>();
      render(<Button ref={ref}>Button</Button>);
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });
  });

  describe('Display Name', () => {
    it('should have correct display name', () => {
      expect(Button.displayName).toBe('Button');
    });
  });

  describe('Snapshot Tests', () => {
    it('should match snapshot for default button', () => {
      const { container } = render(<Button>Default</Button>);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for all variants', () => {
      const variants = ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link'] as const;
      variants.forEach(variant => {
        const { container } = render(<Button variant={variant}>{variant}</Button>);
        expect(container.firstChild).toMatchSnapshot();
      });
    });
  });
});
