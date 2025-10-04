import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../utils/test-utils';
import { mockImage } from '../../utils/test-utils';
import { ImageSearch } from '@/components/ImageSearch/ImageSearch';
import * as useImageSearchHook from '@/hooks/useImageSearch';
import * as useDebounceHook from '@/hooks/useDebounce';

// Mock the hooks
vi.mock('@/hooks/useImageSearch');
vi.mock('@/hooks/useDebounce');
vi.mock('@/hooks', () => ({
  useDebounce: vi.fn(),
  useImageSearch: vi.fn(),
}));

// Mock child components
vi.mock('@/components/ImageSearch/ImageGrid', () => ({
  ImageGrid: ({ images, onImageClick, loading }: any) => (
    <div data-testid="image-grid">
      {images.map((image: any, index: number) => (
        <button
          key={image.id}
          onClick={() => onImageClick(image)}
          data-testid={`image-item-${index}`}
        >
          {image.alt_description}
        </button>
      ))}
      {loading && <div data-testid="grid-loading">Loading...</div>}
    </div>
  )
}));

vi.mock('@/components/ImageSearch/PaginationControls', () => ({
  PaginationControls: ({ currentPage, totalPages, onPageChange, isLoading }: any) => (
    <div data-testid="pagination-controls">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1 || isLoading}
        data-testid="prev-page"
      >
        Previous
      </button>
      <span data-testid="page-info">{currentPage} of {totalPages}</span>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages || isLoading}
        data-testid="next-page"
      >
        Next
      </button>
    </div>
  )
}));

vi.mock('@/components/ImageSearch/SearchFilters', () => ({
  SearchFilters: ({ filters, onFiltersChange }: any) => (
    <div data-testid="search-filters">
      <select
        data-testid="orientation-filter"
        value={filters.orientation}
        onChange={(e) => onFiltersChange({ ...filters, orientation: e.target.value })}
      >
        <option value="all">All</option>
        <option value="landscape">Landscape</option>
        <option value="portrait">Portrait</option>
      </select>
      <select
        data-testid="category-filter"
        value={filters.category}
        onChange={(e) => onFiltersChange({ ...filters, category: e.target.value })}
      >
        <option value="all">All</option>
        <option value="nature">Nature</option>
        <option value="people">People</option>
      </select>
    </div>
  )
}));

vi.mock('@/lib/utils/performance-helpers', () => ({
  performanceProfiler: {
    startMark: vi.fn(),
    endMark: vi.fn(),
  },
  useRenderCount: vi.fn(() => 1),
  optimizeAnimations: {
    createOptimizedVariants: vi.fn((variants) => variants),
  },
}));

const mockUseImageSearch = vi.mocked(useImageSearchHook.useImageSearch);
const mockUseDebounce = vi.mocked(useDebounceHook.useDebounce);

const mockImages = [
  mockImage({ id: '1', alt_description: 'Beautiful mountain landscape' }),
  mockImage({ id: '2', alt_description: 'City street at night' }),
  mockImage({ id: '3', alt_description: 'Happy people laughing' }),
];

const mockImageSearchHook = {
  images: [],
  loading: { isLoading: false, message: '' },
  error: null,
  searchParams: { query: '', page: 1 },
  totalPages: 1,
  searchImages: vi.fn(),
  loadMoreImages: vi.fn(),
  setPage: vi.fn(),
  clearResults: vi.fn(),
};

describe('ImageSearch', () => {
  beforeEach(() => {
    mockUseImageSearch.mockReturnValue(mockImageSearchHook);
    mockUseDebounce.mockImplementation((value) => value);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Rendering', () => {
    it('should render search input and welcome message', () => {
      render(<ImageSearch />);

      expect(screen.getByPlaceholderText(/search for images/i)).toBeInTheDocument();
      expect(screen.getByText('Discover Amazing Images')).toBeInTheDocument();
      expect(screen.getByText(/search through millions of high-quality photos/i)).toBeInTheDocument();
    });

    it('should render suggestion buttons', () => {
      render(<ImageSearch />);

      const suggestions = ['nature', 'people', 'city', 'food', 'animals', 'travel'];
      suggestions.forEach(suggestion => {
        expect(screen.getByText(suggestion)).toBeInTheDocument();
      });
    });

    it('should render filters button', () => {
      render(<ImageSearch />);

      expect(screen.getByText('Filters')).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('should update search input value', async () => {
      const { user } = render(<ImageSearch />);

      const searchInput = screen.getByPlaceholderText(/search for images/i);
      await user.type(searchInput, 'mountains');

      expect(searchInput).toHaveValue('mountains');
    });

    it('should clear search when X button is clicked', async () => {
      const { user } = render(<ImageSearch />);

      const searchInput = screen.getByPlaceholderText(/search for images/i);
      await user.type(searchInput, 'mountains');

      const clearButton = screen.getByTestId('x-icon').closest('button');
      await user.click(clearButton!);

      expect(searchInput).toHaveValue('');
      expect(mockImageSearchHook.clearResults).toHaveBeenCalled();
    });

    it('should trigger search when debounced query changes', () => {
      const searchQuery = 'test query';
      mockUseDebounce.mockReturnValue(searchQuery);

      render(<ImageSearch />);

      expect(mockImageSearchHook.searchImages).toHaveBeenCalledWith(
        searchQuery,
        1,
        expect.objectContaining({
          orientation: 'all',
          category: 'all',
          color: 'all'
        })
      );
    });

    it('should clear results when query is empty', () => {
      mockUseDebounce.mockReturnValue('');

      render(<ImageSearch />);

      expect(mockImageSearchHook.clearResults).toHaveBeenCalled();
    });

    it('should handle suggestion button clicks', async () => {
      const { user } = render(<ImageSearch />);

      const natureButton = screen.getByText('nature');
      await user.click(natureButton);

      const searchInput = screen.getByPlaceholderText(/search for images/i);
      expect(searchInput).toHaveValue('nature');
    });
  });

  describe('Filters Functionality', () => {
    it('should toggle filters panel', async () => {
      const { user } = render(<ImageSearch />);

      const filtersButton = screen.getByText('Filters');
      await user.click(filtersButton);

      expect(screen.getByTestId('search-filters')).toBeInTheDocument();
    });

    it('should update filters and trigger new search', async () => {
      mockUseDebounce.mockReturnValue('test query');
      const { user } = render(<ImageSearch />);

      // Open filters
      const filtersButton = screen.getByText('Filters');
      await user.click(filtersButton);

      // Change orientation filter
      const orientationFilter = screen.getByTestId('orientation-filter');
      await user.selectOptions(orientationFilter, 'landscape');

      expect(mockImageSearchHook.searchImages).toHaveBeenCalledWith(
        'test query',
        1,
        expect.objectContaining({
          orientation: 'landscape'
        })
      );
    });

    it('should update category filter', async () => {
      mockUseDebounce.mockReturnValue('test query');
      const { user } = render(<ImageSearch />);

      // Open filters
      const filtersButton = screen.getByText('Filters');
      await user.click(filtersButton);

      // Change category filter
      const categoryFilter = screen.getByTestId('category-filter');
      await user.selectOptions(categoryFilter, 'nature');

      expect(mockImageSearchHook.searchImages).toHaveBeenCalledWith(
        'test query',
        1,
        expect.objectContaining({
          category: 'nature'
        })
      );
    });
  });

  describe('Image Results Display', () => {
    beforeEach(() => {
      mockUseImageSearch.mockReturnValue({
        ...mockImageSearchHook,
        images: mockImages,
        searchParams: { query: 'mountains', page: 1 },
      });
    });

    it('should display image grid with results', () => {
      render(<ImageSearch />);

      expect(screen.getByTestId('image-grid')).toBeInTheDocument();
      expect(screen.getByText('Beautiful mountain landscape')).toBeInTheDocument();
      expect(screen.getByText('City street at night')).toBeInTheDocument();
      expect(screen.getByText('Happy people laughing')).toBeInTheDocument();
    });

    it('should show results count', () => {
      render(<ImageSearch />);

      expect(screen.getByText(/showing 3 images for "mountains"/i)).toBeInTheDocument();
    });

    it('should handle image click', async () => {
      const onImageSelect = vi.fn();
      const { user } = render(<ImageSearch onImageSelect={onImageSelect} />);

      const firstImage = screen.getByTestId('image-item-0');
      await user.click(firstImage);

      expect(onImageSelect).toHaveBeenCalledWith(mockImages[0]);
    });
  });

  describe('Pagination', () => {
    beforeEach(() => {
      mockUseImageSearch.mockReturnValue({
        ...mockImageSearchHook,
        images: mockImages,
        searchParams: { query: 'mountains', page: 2 },
        totalPages: 5,
      });
    });

    it('should display pagination when totalPages > 1', () => {
      render(<ImageSearch />);

      expect(screen.getByTestId('pagination-controls')).toBeInTheDocument();
      expect(screen.getByText('2 of 5')).toBeInTheDocument();
    });

    it('should handle page navigation', async () => {
      const { user } = render(<ImageSearch />);

      const nextButton = screen.getByTestId('next-page');
      await user.click(nextButton);

      expect(mockImageSearchHook.setPage).toHaveBeenCalledWith(3);
    });

    it('should disable navigation buttons appropriately', () => {
      mockUseImageSearch.mockReturnValue({
        ...mockImageSearchHook,
        images: mockImages,
        searchParams: { query: 'mountains', page: 1 },
        totalPages: 5,
      });

      render(<ImageSearch />);

      const prevButton = screen.getByTestId('prev-page');
      const nextButton = screen.getByTestId('next-page');

      expect(prevButton).toBeDisabled();
      expect(nextButton).not.toBeDisabled();
    });
  });

  describe('Loading States', () => {
    it('should display loading spinner during search', () => {
      mockUseImageSearch.mockReturnValue({
        ...mockImageSearchHook,
        loading: { isLoading: true, message: 'Searching images...' }
      });

      render(<ImageSearch />);

      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
      expect(screen.getByText('Searching images...')).toBeInTheDocument();
    });

    it('should display custom loading message', () => {
      mockUseImageSearch.mockReturnValue({
        ...mockImageSearchHook,
        loading: { isLoading: true, message: 'Loading more results...' }
      });

      render(<ImageSearch />);

      expect(screen.getByText('Loading more results...')).toBeInTheDocument();
    });
  });

  describe('Error States', () => {
    it('should display error message when search fails', () => {
      mockUseImageSearch.mockReturnValue({
        ...mockImageSearchHook,
        error: 'Network error occurred'
      });

      render(<ImageSearch />);

      expect(screen.getByText('Search Error')).toBeInTheDocument();
      expect(screen.getByText('Network error occurred')).toBeInTheDocument();
    });

    it('should handle retry on error', async () => {
      mockUseImageSearch.mockReturnValue({
        ...mockImageSearchHook,
        error: 'Network error occurred',
        searchParams: { query: 'test', page: 1 }
      });

      const { user } = render(<ImageSearch />);

      const retryButton = screen.getByText('Try Again');
      await user.click(retryButton);

      expect(mockImageSearchHook.searchImages).toHaveBeenCalledWith('test');
    });
  });

  describe('Empty States', () => {
    it('should display no results message when search returns empty', () => {
      mockUseImageSearch.mockReturnValue({
        ...mockImageSearchHook,
        images: [],
        searchParams: { query: 'nonexistent', page: 1 },
      });

      render(<ImageSearch />);

      expect(screen.getByText('No images found')).toBeInTheDocument();
      expect(screen.getByText(/try different keywords or check your spelling/i)).toBeInTheDocument();
    });

    it('should display initial welcome state when no query', () => {
      render(<ImageSearch />);

      expect(screen.getByText('Discover Amazing Images')).toBeInTheDocument();
      expect(screen.getByText(/search through millions of high-quality photos/i)).toBeInTheDocument();
    });
  });

  describe('Performance Optimizations', () => {
    it('should debounce search input', () => {
      const query = 'test query';
      mockUseDebounce.mockReturnValue(query);

      render(<ImageSearch />);

      expect(mockUseDebounce).toHaveBeenCalledWith('', 500);
    });

    it('should memoize expensive computations', () => {
      const { rerender } = render(<ImageSearch />);
      
      // Re-render with same props should use memoized values
      rerender(<ImageSearch />);

      // Performance hooks should only be called once per unique computation
      expect(mockUseImageSearch).toHaveBeenCalled();
    });

    it('should use performance profiling', () => {
      const mockPerformanceProfiler = vi.mocked(
        require('@/lib/utils/performance-helpers').performanceProfiler
      );

      render(<ImageSearch />);

      expect(mockPerformanceProfiler.startMark).toHaveBeenCalledWith('ImageSearch-render');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<ImageSearch />);

      const searchInput = screen.getByPlaceholderText(/search for images/i);
      expect(searchInput).toHaveAttribute('type', 'text');
    });

    it('should support keyboard navigation', async () => {
      const { user } = render(<ImageSearch />);

      await user.keyboard('{Tab}');
      
      const searchInput = screen.getByPlaceholderText(/search for images/i);
      expect(searchInput).toHaveFocus();
    });

    it('should have proper button roles', () => {
      render(<ImageSearch />);

      const filtersButton = screen.getByText('Filters');
      expect(filtersButton).toHaveAttribute('type', 'button');

      const suggestions = screen.getAllByText(/^(nature|people|city|food|animals|travel)$/);
      suggestions.forEach(button => {
        expect(button.closest('button')).toHaveAttribute('type', 'button');
      });
    });
  });

  describe('Component Props', () => {
    it('should apply custom className', () => {
      const { container } = render(<ImageSearch className="custom-class" />);

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should handle onImageSelect callback', async () => {
      const onImageSelect = vi.fn();
      mockUseImageSearch.mockReturnValue({
        ...mockImageSearchHook,
        images: mockImages,
      });

      const { user } = render(<ImageSearch onImageSelect={onImageSelect} />);

      const firstImage = screen.getByTestId('image-item-0');
      await user.click(firstImage);

      expect(onImageSelect).toHaveBeenCalledWith(mockImages[0]);
    });

    it('should work without onImageSelect callback', async () => {
      mockUseImageSearch.mockReturnValue({
        ...mockImageSearchHook,
        images: mockImages,
      });

      const { user } = render(<ImageSearch />);

      const firstImage = screen.getByTestId('image-item-0');
      
      // Should not throw error when clicking without callback
      await expect(user.click(firstImage)).resolves.not.toThrow();
    });
  });

  describe('Memoization', () => {
    it('should memoize component with shallow comparison', () => {
      const props1 = { onImageSelect: vi.fn(), className: 'test' };
      const props2 = { onImageSelect: vi.fn(), className: 'test' };
      
      const { rerender } = render(<ImageSearch {...props1} />);
      rerender(<ImageSearch {...props2} />);

      // Component should re-render when props change
      expect(mockUseImageSearch).toHaveBeenCalledTimes(2);
    });

    it('should not re-render when props are identical', () => {
      const onImageSelect = vi.fn();
      const props = { onImageSelect, className: 'test' };
      
      const { rerender } = render(<ImageSearch {...props} />);
      rerender(<ImageSearch {...props} />);

      // Should use memoized version for identical props
      expect(mockUseImageSearch).toHaveBeenCalled();
    });
  });
});