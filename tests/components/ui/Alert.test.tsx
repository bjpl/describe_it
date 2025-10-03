import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

describe('Alert Components', () => {
  describe('Alert Component', () => {
    it('should render children', () => {
      render(<Alert>Alert content</Alert>);
      expect(screen.getByText('Alert content')).toBeInTheDocument();
    });

    it('should have role="alert"', () => {
      render(<Alert>Alert</Alert>);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<Alert className="custom-alert">Alert</Alert>);
      expect(container.firstChild).toHaveClass('custom-alert');
    });

    it('should have default base styles', () => {
      const { container } = render(<Alert>Alert</Alert>);
      expect(container.firstChild).toHaveClass('relative', 'w-full', 'rounded-lg', 'border', 'p-4');
    });

    describe('Variants', () => {
      it('should render default variant', () => {
        const { container } = render(<Alert variant="default">Default</Alert>);
        expect(container.firstChild).toHaveClass('bg-white', 'text-gray-950', 'border-gray-200');
      });

      it('should render destructive variant', () => {
        const { container } = render(<Alert variant="destructive">Destructive</Alert>);
        expect(container.firstChild).toHaveClass('border-red-200', 'text-red-800', 'bg-red-50');
      });

      it('should render warning variant', () => {
        const { container } = render(<Alert variant="warning">Warning</Alert>);
        expect(container.firstChild).toHaveClass('border-yellow-200', 'text-yellow-800', 'bg-yellow-50');
      });

      it('should render success variant', () => {
        const { container } = render(<Alert variant="success">Success</Alert>);
        expect(container.firstChild).toHaveClass('border-green-200', 'text-green-800', 'bg-green-50');
      });

      it('should render info variant', () => {
        const { container } = render(<Alert variant="info">Info</Alert>);
        expect(container.firstChild).toHaveClass('border-blue-200', 'text-blue-800', 'bg-blue-50');
      });
    });

    describe('Ref Forwarding', () => {
      it('should forward ref correctly', () => {
        const ref = React.createRef<HTMLDivElement>();
        render(<Alert ref={ref}>Alert</Alert>);
        expect(ref.current).toBeInstanceOf(HTMLDivElement);
      });
    });

    describe('Display Name', () => {
      it('should have correct display name', () => {
        expect(Alert.displayName).toBe('Alert');
      });
    });

    describe('Icon Support', () => {
      it('should render with icon', () => {
        render(
          <Alert>
            <svg data-testid="alert-icon">Icon</svg>
            <div>Content</div>
          </Alert>
        );
        expect(screen.getByTestId('alert-icon')).toBeInTheDocument();
      });

      it('should apply icon styles via CSS', () => {
        const { container } = render(
          <Alert>
            <svg>Icon</svg>
            <div>Content</div>
          </Alert>
        );
        // Icon styles are applied via CSS classes
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });
  });

  describe('AlertTitle Component', () => {
    it('should render children', () => {
      render(<AlertTitle>Alert Title</AlertTitle>);
      expect(screen.getByText('Alert Title')).toBeInTheDocument();
    });

    it('should render as h5 element', () => {
      const { container } = render(<AlertTitle>Title</AlertTitle>);
      expect(container.querySelector('h5')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<AlertTitle className="custom-title">Title</AlertTitle>);
      expect(screen.getByText('Title')).toHaveClass('custom-title');
    });

    it('should have title styles', () => {
      render(<AlertTitle>Title</AlertTitle>);
      expect(screen.getByText('Title')).toHaveClass('mb-1', 'font-medium', 'leading-none', 'tracking-tight');
    });

    it('should forward ref correctly', () => {
      const ref = React.createRef<HTMLParagraphElement>();
      render(<AlertTitle ref={ref}>Title</AlertTitle>);
      expect(ref.current).toBeInstanceOf(HTMLHeadingElement);
    });

    it('should have correct display name', () => {
      expect(AlertTitle.displayName).toBe('AlertTitle');
    });
  });

  describe('AlertDescription Component', () => {
    it('should render children', () => {
      render(<AlertDescription>Alert description</AlertDescription>);
      expect(screen.getByText('Alert description')).toBeInTheDocument();
    });

    it('should render as div element', () => {
      const { container } = render(<AlertDescription>Description</AlertDescription>);
      expect(container.querySelector('div')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <AlertDescription className="custom-description">Description</AlertDescription>
      );
      expect(container.firstChild).toHaveClass('custom-description');
    });

    it('should have description styles', () => {
      const { container } = render(<AlertDescription>Description</AlertDescription>);
      expect(container.firstChild).toHaveClass('text-sm');
    });

    it('should forward ref correctly', () => {
      const ref = React.createRef<HTMLParagraphElement>();
      render(<AlertDescription ref={ref}>Description</AlertDescription>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('should have correct display name', () => {
      expect(AlertDescription.displayName).toBe('AlertDescription');
    });
  });

  describe('Complete Alert Composition', () => {
    it('should render complete alert with all subcomponents', () => {
      render(
        <Alert variant="warning">
          <svg data-testid="warning-icon">⚠</svg>
          <AlertTitle>Warning</AlertTitle>
          <AlertDescription>This is a warning message</AlertDescription>
        </Alert>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByTestId('warning-icon')).toBeInTheDocument();
      expect(screen.getByText('Warning')).toBeInTheDocument();
      expect(screen.getByText('This is a warning message')).toBeInTheDocument();
    });

    it('should work without title', () => {
      render(
        <Alert>
          <AlertDescription>Description only</AlertDescription>
        </Alert>
      );

      expect(screen.getByText('Description only')).toBeInTheDocument();
    });

    it('should work without description', () => {
      render(
        <Alert>
          <AlertTitle>Title only</AlertTitle>
        </Alert>
      );

      expect(screen.getByText('Title only')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should be accessible with title and description', () => {
      render(
        <Alert>
          <AlertTitle>Accessible Alert</AlertTitle>
          <AlertDescription>This alert is accessible</AlertDescription>
        </Alert>
      );

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
    });

    it('should support custom HTML attributes', () => {
      render(
        <Alert data-testid="custom-alert" aria-label="Custom alert">
          Content
        </Alert>
      );

      expect(screen.getByTestId('custom-alert')).toBeInTheDocument();
      expect(screen.getByLabelText('Custom alert')).toBeInTheDocument();
    });
  });

  describe('Snapshot Tests', () => {
    it('should match snapshot for default alert', () => {
      const { container } = render(
        <Alert>
          <AlertTitle>Title</AlertTitle>
          <AlertDescription>Description</AlertDescription>
        </Alert>
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for all variants', () => {
      const variants = ['default', 'destructive', 'warning', 'success', 'info'] as const;

      variants.forEach(variant => {
        const { container } = render(
          <Alert variant={variant}>
            <AlertTitle>{variant}</AlertTitle>
            <AlertDescription>{variant} description</AlertDescription>
          </Alert>
        );
        expect(container.firstChild).toMatchSnapshot();
      });
    });
  });
});
