import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EmptyState, InlineEmptyState, SearchEmptyState } from '@/components/EmptyState';

describe('EmptyState Components', () => {
  describe('EmptyState', () => {
    it('renders with default props', () => {
      render(<EmptyState />);
      expect(screen.getByText('Nothing here yet')).toBeInTheDocument();
      expect(screen.getByText('Get started by adding some content.')).toBeInTheDocument();
    });

    it('renders different types correctly', () => {
      const { rerender } = render(<EmptyState type="search" />);
      expect(screen.getByText('No results found')).toBeInTheDocument();

      rerender(<EmptyState type="images" />);
      expect(screen.getByText('No images found')).toBeInTheDocument();

      rerender(<EmptyState type="vocabulary" />);
      expect(screen.getByText('No vocabulary words')).toBeInTheDocument();
    });

    it('renders custom title and description', () => {
      render(
        <EmptyState 
          title="Custom Empty Title"
          description="Custom empty description"
        />
      );
      expect(screen.getByText('Custom Empty Title')).toBeInTheDocument();
      expect(screen.getByText('Custom empty description')).toBeInTheDocument();
    });

    it('calls action when primary button is clicked', () => {
      const mockAction = vi.fn();
      render(
        <EmptyState 
          action={{ label: 'Add Item', onClick: mockAction }}
        />
      );
      
      const actionButton = screen.getByText('Add Item');
      fireEvent.click(actionButton);
      
      expect(mockAction).toHaveBeenCalledTimes(1);
    });

    it('calls secondary action when secondary button is clicked', () => {
      const mockSecondaryAction = vi.fn();
      render(
        <EmptyState 
          secondaryAction={{ label: 'Learn More', onClick: mockSecondaryAction }}
        />
      );
      
      const secondaryButton = screen.getByText('Learn More');
      fireEvent.click(secondaryButton);
      
      expect(mockSecondaryAction).toHaveBeenCalledTimes(1);
    });
  });

  describe('InlineEmptyState', () => {
    it('renders inline empty state', () => {
      render(<InlineEmptyState message="No data available" />);
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('renders correct icon for type', () => {
      const { container } = render(<InlineEmptyState type="search" />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('SearchEmptyState', () => {
    it('renders search empty state with query', () => {
      render(<SearchEmptyState query="test search" />);
      expect(screen.getByText('No results for "test search"')).toBeInTheDocument();
    });

    it('renders search empty state without query', () => {
      render(<SearchEmptyState />);
      expect(screen.getByText('No search results')).toBeInTheDocument();
    });

    it('calls clear search when clear button is clicked', () => {
      const mockClearSearch = vi.fn();
      render(
        <SearchEmptyState 
          query="test"
          onClearSearch={mockClearSearch}
        />
      );
      
      const clearButton = screen.getByText('Clear Search');
      fireEvent.click(clearButton);
      
      expect(mockClearSearch).toHaveBeenCalledTimes(1);
    });
  });
});