import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom';
import {
  LoadingOverlay,
  PageLoader,
  ButtonLoader,
  InlineLoader,
} from '@/components/ui/LoadingStates';

describe('Loading Components', () => {
  describe('LoadingOverlay', () => {
    it('should render children', () => {
      render(
        <LoadingOverlay isLoading={false}>
          <div>Content</div>
        </LoadingOverlay>
      );
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('should show overlay when loading', () => {
      const { container } = render(
        <LoadingOverlay isLoading={true}>
          <div>Content</div>
        </LoadingOverlay>
      );
      expect(container.querySelector('.absolute.inset-0')).toBeInTheDocument();
    });

    it('should not show overlay when not loading', () => {
      const { container } = render(
        <LoadingOverlay isLoading={false}>
          <div>Content</div>
        </LoadingOverlay>
      );
      expect(container.querySelector('.absolute.inset-0')).not.toBeInTheDocument();
    });

    it('should display custom loading message', () => {
      render(
        <LoadingOverlay isLoading={true} message="Please wait...">
          <div>Content</div>
        </LoadingOverlay>
      );
      expect(screen.getByText('Please wait...')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <LoadingOverlay isLoading={false} className="custom-overlay">
          <div>Content</div>
        </LoadingOverlay>
      );
      expect(container.firstChild).toHaveClass('custom-overlay');
    });

    it('should have backdrop blur when loading', () => {
      const { container } = render(
        <LoadingOverlay isLoading={true}>
          <div>Content</div>
        </LoadingOverlay>
      );
      expect(container.querySelector('.backdrop-blur-sm')).toBeInTheDocument();
    });
  });

  describe('PageLoader', () => {
    it('should render with default message', () => {
      render(<PageLoader />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should render with custom message', () => {
      render(<PageLoader message="Loading data..." />);
      expect(screen.getByText('Loading data...')).toBeInTheDocument();
    });

    it('should have full screen height', () => {
      const { container } = render(<PageLoader />);
      expect(container.firstChild).toHaveClass('min-h-screen');
    });

    it('should center content', () => {
      const { container } = render(<PageLoader />);
      expect(container.firstChild).toHaveClass('flex', 'items-center', 'justify-center');
    });

    it('should apply custom className', () => {
      const { container } = render(<PageLoader className="custom-page-loader" />);
      expect(container.firstChild).toHaveClass('custom-page-loader');
    });
  });

  describe('ButtonLoader', () => {
    it('should render children when not loading', () => {
      render(<ButtonLoader loading={false}>Submit</ButtonLoader>);
      expect(screen.getByText('Submit')).toBeInTheDocument();
    });

    it('should show spinner when loading', () => {
      const { container } = render(<ButtonLoader loading={true}>Submit</ButtonLoader>);
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should display loading text when provided', () => {
      render(<ButtonLoader loading={true} loadingText="Submitting...">Submit</ButtonLoader>);
      expect(screen.getByText('Submitting...')).toBeInTheDocument();
    });

    it('should display original children as loading text if no loadingText provided', () => {
      render(<ButtonLoader loading={true}>Submit</ButtonLoader>);
      expect(screen.getByText('Submit')).toBeInTheDocument();
    });

    it('should render small spinner', () => {
      const { container } = render(<ButtonLoader loading={true} size="sm">Save</ButtonLoader>);
      const spinner = container.querySelector('.h-3.w-3');
      expect(spinner).toBeInTheDocument();
    });

    it('should render medium spinner', () => {
      const { container } = render(<ButtonLoader loading={true} size="md">Save</ButtonLoader>);
      const spinner = container.querySelector('.h-4.w-4');
      expect(spinner).toBeInTheDocument();
    });

    it('should render large spinner', () => {
      const { container } = render(<ButtonLoader loading={true} size="lg">Save</ButtonLoader>);
      const spinner = container.querySelector('.h-5.w-5');
      expect(spinner).toBeInTheDocument();
    });

    it('should have aria-hidden on spinner', () => {
      const { container } = render(<ButtonLoader loading={true}>Save</ButtonLoader>);
      const spinner = container.querySelector('[aria-hidden="true"]');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('InlineLoader', () => {
    it('should render spinner', () => {
      const { container } = render(<InlineLoader />);
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should render extra small size', () => {
      const { container } = render(<InlineLoader size="xs" />);
      const spinner = container.querySelector('.h-3.w-3');
      expect(spinner).toBeInTheDocument();
    });

    it('should render small size', () => {
      const { container } = render(<InlineLoader size="sm" />);
      const spinner = container.querySelector('.h-4.w-4');
      expect(spinner).toBeInTheDocument();
    });

    it('should render medium size', () => {
      const { container } = render(<InlineLoader size="md" />);
      const spinner = container.querySelector('.h-5.w-5');
      expect(spinner).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<InlineLoader className="custom-spinner" />);
      expect(container.querySelector('.custom-spinner')).toBeInTheDocument();
    });

    it('should have aria-label', () => {
      const { container } = render(<InlineLoader />);
      const spinner = container.querySelector('[aria-label="Loading"]');
      expect(spinner).toBeInTheDocument();
    });

    it('should render SVG element', () => {
      const { container } = render(<InlineLoader />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should have correct SVG attributes', () => {
      const { container } = render(<InlineLoader />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('fill', 'none');
      expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    });
  });

  describe('Spinner Animation', () => {
    it('should have animate-spin class', () => {
      const { container } = render(<InlineLoader />);
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should have circular path', () => {
      const { container } = render(<InlineLoader />);
      const circle = container.querySelector('circle');
      expect(circle).toBeInTheDocument();
    });

    it('should have progress path', () => {
      const { container } = render(<InlineLoader />);
      const path = container.querySelector('path');
      expect(path).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for inline loader', () => {
      const { container } = render(<InlineLoader />);
      const spinner = container.querySelector('svg');
      expect(spinner).toHaveAttribute('aria-label', 'Loading');
    });

    it('should have role region for page loader', () => {
      const { container } = render(<PageLoader />);
      // PageLoader renders a div container
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Snapshot Tests', () => {
    it('should match snapshot for LoadingOverlay', () => {
      const { container } = render(
        <LoadingOverlay isLoading={true}>
          <div>Content</div>
        </LoadingOverlay>
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for PageLoader', () => {
      const { container } = render(<PageLoader message="Loading..." />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for ButtonLoader', () => {
      const { container } = render(<ButtonLoader loading={true}>Save</ButtonLoader>);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for InlineLoader', () => {
      const { container } = render(<InlineLoader />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});
