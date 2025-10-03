import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LoadingState, InlineLoadingState, ButtonLoadingState } from '@/components/LoadingState';

describe('LoadingState Components', () => {
  describe('LoadingState', () => {
    it('renders with default props', () => {
      render(<LoadingState />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('renders with custom message', () => {
      render(<LoadingState message="Processing data..." />);
      expect(screen.getByText('Processing data...')).toBeInTheDocument();
    });

    it('renders with progress bar', () => {
      render(<LoadingState progress={50} />);
      expect(screen.getByText('Progress')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('renders as overlay', () => {
      const { container } = render(<LoadingState overlay />);
      expect(container.firstChild).toHaveClass('fixed', 'inset-0', 'z-50');
    });

    it('has proper accessibility attributes', () => {
      render(<LoadingState message="Loading content" />);
      const statusElement = screen.getByRole('status');
      expect(statusElement).toHaveAttribute('aria-live', 'polite');
      expect(statusElement).toHaveAttribute('aria-label', 'Loading content');
    });
  });

  describe('InlineLoadingState', () => {
    it('renders inline loading with message', () => {
      render(<InlineLoadingState message="Saving..." />);
      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });
  });

  describe('ButtonLoadingState', () => {
    it('renders button spinner', () => {
      const { container } = render(<ButtonLoadingState />);
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });
});