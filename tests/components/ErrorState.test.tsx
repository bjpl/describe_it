import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ErrorState, InlineErrorState, NetworkErrorState } from '@/components/ErrorState';

describe('ErrorState Components', () => {
  describe('ErrorState', () => {
    it('renders with default props', () => {
      render(<ErrorState />);
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument();
    });

    it('renders with custom title and message', () => {
      render(
        <ErrorState 
          title="Custom Error" 
          message="This is a custom error message" 
        />
      );
      expect(screen.getByText('Custom Error')).toBeInTheDocument();
      expect(screen.getByText('This is a custom error message')).toBeInTheDocument();
    });

    it('displays error code when provided', () => {
      render(<ErrorState code="ERR_404" />);
      expect(screen.getByText('Error Code: ERR_404')).toBeInTheDocument();
    });

    it('calls onRetry when retry button is clicked', () => {
      const mockRetry = vi.fn();
      render(<ErrorState onRetry={mockRetry} />);
      
      const retryButton = screen.getByText('Try Again');
      fireEvent.click(retryButton);
      
      expect(mockRetry).toHaveBeenCalledTimes(1);
    });

    it('shows retrying state', () => {
      render(<ErrorState onRetry={() => {}} retrying />);
      expect(screen.getByText('Retrying...')).toBeInTheDocument();
    });

    it('shows navigation buttons when provided', () => {
      const mockGoBack = vi.fn();
      const mockGoHome = vi.fn();
      
      render(
        <ErrorState 
          onGoBack={mockGoBack}
          onGoHome={mockGoHome}
          showNavigation
        />
      );
      
      expect(screen.getByText('Back')).toBeInTheDocument();
      expect(screen.getByText('Home')).toBeInTheDocument();
    });
  });

  describe('InlineErrorState', () => {
    it('renders inline error with retry', () => {
      const mockRetry = vi.fn();
      render(<InlineErrorState onRetry={mockRetry} />);
      
      expect(screen.getByText('Error occurred')).toBeInTheDocument();
      fireEvent.click(screen.getByLabelText('Retry'));
      expect(mockRetry).toHaveBeenCalled();
    });
  });

  describe('NetworkErrorState', () => {
    it('renders network-specific error message', () => {
      render(<NetworkErrorState />);
      expect(screen.getByText('Connection Problem')).toBeInTheDocument();
      expect(screen.getByText(/Unable to connect to the server/)).toBeInTheDocument();
    });
  });
});