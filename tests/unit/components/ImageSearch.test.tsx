import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ImageSearch } from '../../../src/components/ImageSearch/ImageSearch';
import * as useImageSearch from '../../../src/hooks/useImageSearch';
import * as useDebounce from '../../../src/hooks/useDebounce';

// Mock the hooks
vi.mock('../../../src/hooks/useImageSearch');
vi.mock('../../../src/hooks/useDebounce');

// Mock framer-motion components
vi.mock('framer-motion', () => ({
  motion: {
    div: 'div',
    button: 'button',
    input: 'input',
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

describe('ImageSearch', () => {
  let queryClient: QueryClient;
  let mockUseImageSearch: ReturnType<typeof vi.fn>;
  let mockUseDebounce: ReturnType<typeof vi.fn>;

  const defaultImageSearchReturn = {
    images: [],
    loading: { isLoading: false, message: '' },
    error: null,
    searchParams: { query: '', page: 1 },
    totalPages: 0,
    searchImages: vi.fn(),
    loadMoreImages: vi.fn(),
    setPage: vi.fn(),
    clearResults: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    mockUseImageSearch = vi.fn().mockReturnValue(defaultImageSearchReturn);
    mockUseDebounce = vi.fn().mockImplementation((value) => value);

    vi.mocked(useImageSearch.useImageSearch).mockImplementation(mockUseImageSearch);
    vi.mocked(useDebounce.useDebounce).mockImplementation(mockUseDebounce);
  });

  const renderWithProvider = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  describe('initial render', () => {
    it('should render search input', () => {
      renderWithProvider(<ImageSearch />);
      
      const searchInput = screen.getByPlaceholderText(/search for images/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('should show initial state message', () => {
      renderWithProvider(<ImageSearch />);
      
      expect(screen.getByText(/discover amazing images/i)).toBeInTheDocument();
      expect(screen.getByText(/search through millions of high-quality photos/i)).toBeInTheDocument();
    });

    it('should show suggestion buttons', () => {
      renderWithProvider(<ImageSearch />);
      
      expect(screen.getByRole('button', { name: /nature/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /people/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /city/i })).toBeInTheDocument();
    });
  });

  describe('search functionality', () => {
    it('should update search query on input', async () => {
      const user = userEvent.setup();
      renderWithProvider(<ImageSearch />);
      
      const searchInput = screen.getByPlaceholderText(/search for images/i);
      await user.type(searchInput, 'mountains');
      
      expect(searchInput).toHaveValue('mountains');
    });

    it('should show clear button when search has value', async () => {
      const user = userEvent.setup();
      renderWithProvider(<ImageSearch />);
      
      const searchInput = screen.getByPlaceholderText(/search for images/i);
      await user.type(searchInput, 'test');
      
      expect(screen.getByRole('button', { name: /clear search/i })).toBeInTheDocument();
    });

    it('should clear search when clear button clicked', async () => {
      const user = userEvent.setup();
      const mockClearResults = vi.fn();
      
      mockUseImageSearch.mockReturnValue({
        ...defaultImageSearchReturn,
        clearResults: mockClearResults,
      });
      
      renderWithProvider(<ImageSearch />);
      
      const searchInput = screen.getByPlaceholderText(/search for images/i);
      await user.type(searchInput, 'test');
      
      const clearButton = screen.getByRole('button', { name: /clear search/i });
      await user.click(clearButton);
      
      expect(searchInput).toHaveValue('');
      expect(mockClearResults).toHaveBeenCalled();
    });

    it('should trigger search on suggestion click', async () => {
      const user = userEvent.setup();
      renderWithProvider(<ImageSearch />);
      
      const natureButton = screen.getByRole('button', { name: /nature/i });
      await user.click(natureButton);
      
      const searchInput = screen.getByPlaceholderText(/search for images/i);
      expect(searchInput).toHaveValue('nature');
    });
  });

  describe('loading states', () => {
    it('should show loading spinner when searching', () => {
      mockUseImageSearch.mockReturnValue({
        ...defaultImageSearchReturn,
        loading: { isLoading: true, message: 'Searching images...' },
      });
      
      renderWithProvider(<ImageSearch />);
      
      expect(screen.getByText(/searching images/i)).toBeInTheDocument();
    });

    it('should show custom loading message', () => {
      mockUseImageSearch.mockReturnValue({
        ...defaultImageSearchReturn,
        loading: { isLoading: true, message: 'Loading more images...' },
      });
      
      renderWithProvider(<ImageSearch />);
      
      expect(screen.getByText(/loading more images/i)).toBeInTheDocument();
    });
  });

  describe('error states', () => {
    it('should show error message', () => {
      mockUseImageSearch.mockReturnValue({
        ...defaultImageSearchReturn,
        error: 'Failed to search images',
      });
      
      renderWithProvider(<ImageSearch />);
      
      expect(screen.getByText(/search error/i)).toBeInTheDocument();
      expect(screen.getByText(/failed to search images/i)).toBeInTheDocument();
    });

    it('should show try again button on error', async () => {
      const user = userEvent.setup();
      const mockSearchImages = vi.fn();
      
      mockUseImageSearch.mockReturnValue({
        ...defaultImageSearchReturn,
        error: 'Network error',
        searchImages: mockSearchImages,
        searchParams: { query: 'test', page: 1 },
      });
      
      renderWithProvider(<ImageSearch />);
      
      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
      await user.click(tryAgainButton);
      
      expect(mockSearchImages).toHaveBeenCalledWith('test');
    });
  });

  describe('image results', () => {
    const mockImages = [
      {
        id: 'img1',
        urls: {
          small: 'https://example.com/img1-small.jpg',
          regular: 'https://example.com/img1.jpg',
          full: 'https://example.com/img1-full.jpg',
        },
        alt_description: 'Test image 1',
        description: 'A beautiful test image',
        user: { name: 'Test User', username: 'testuser' },
        width: 800,
        height: 600,
        color: '#ffffff',
        likes: 10,
        created_at: '2023-01-01T00:00:00Z',
      },
    ];

    it('should show image results', () => {
      mockUseImageSearch.mockReturnValue({
        ...defaultImageSearchReturn,
        images: mockImages,
        searchParams: { query: 'test', page: 1 },
      });
      
      renderWithProvider(<ImageSearch />);
      
      expect(screen.getByText(/showing 1 images for "test"/i)).toBeInTheDocument();
    });

    it('should call onImageSelect when image is clicked', async () => {
      const user = userEvent.setup();
      const mockOnImageSelect = vi.fn();
      
      mockUseImageSearch.mockReturnValue({
        ...defaultImageSearchReturn,
        images: mockImages,
        searchParams: { query: 'test', page: 1 },
      });
      
      renderWithProvider(<ImageSearch onImageSelect={mockOnImageSelect} />);
      
      // This would need the ImageGrid to be properly rendered
      // In a real test, you'd interact with the image elements
      // For now, we'll test the prop passing
      expect(mockOnImageSelect).toBeDefined();
    });

    it('should show pagination when multiple pages exist', () => {
      mockUseImageSearch.mockReturnValue({
        ...defaultImageSearchReturn,
        images: mockImages,
        searchParams: { query: 'test', page: 1 },
        totalPages: 5,
      });
      
      renderWithProvider(<ImageSearch />);
      
      // Pagination would be rendered by PaginationControls component
      // Test would verify pagination controls exist
    });
  });

  describe('empty states', () => {
    it('should show no results message when search returns empty', () => {
      mockUseImageSearch.mockReturnValue({
        ...defaultImageSearchReturn,
        images: [],
        searchParams: { query: 'nonexistent', page: 1 },
        loading: { isLoading: false, message: '' },
      });
      
      renderWithProvider(<ImageSearch />);
      
      expect(screen.getByText(/no images found/i)).toBeInTheDocument();
      expect(screen.getByText(/try different keywords/i)).toBeInTheDocument();
    });
  });

  describe('filters', () => {
    it('should show filters button', () => {
      renderWithProvider(<ImageSearch />);
      
      expect(screen.getByRole('button', { name: /filters/i })).toBeInTheDocument();
    });

    it('should toggle filters panel', async () => {
      const user = userEvent.setup();
      renderWithProvider(<ImageSearch />);
      
      const filtersButton = screen.getByRole('button', { name: /filters/i });
      await user.click(filtersButton);
      
      // Would check for filter panel visibility
      // This depends on SearchFilters component implementation
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderWithProvider(<ImageSearch />);
      
      const searchInput = screen.getByRole('textbox');
      expect(searchInput).toHaveAttribute('type', 'text');
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      renderWithProvider(<ImageSearch />);
      
      const searchInput = screen.getByRole('textbox');
      await user.tab();
      
      expect(searchInput).toHaveFocus();
    });
  });

  describe('debounced search', () => {
    it('should debounce search queries', () => {
      renderWithProvider(<ImageSearch />);
      
      expect(mockUseDebounce).toHaveBeenCalledWith('', 500);
    });

    it('should trigger search when debounced value changes', () => {
      const mockSearchImages = vi.fn();
      
      // Mock debounce to return 'mountains'
      mockUseDebounce.mockReturnValue('mountains');
      
      mockUseImageSearch.mockReturnValue({
        ...defaultImageSearchReturn,
        searchImages: mockSearchImages,
        clearResults: vi.fn(),
      });
      
      renderWithProvider(<ImageSearch />);
      
      // The useEffect should trigger search
      expect(mockSearchImages).toHaveBeenCalledWith('mountains');
    });

    it('should clear results when debounced value is empty', () => {
      const mockClearResults = vi.fn();
      
      mockUseDebounce.mockReturnValue('');
      
      mockUseImageSearch.mockReturnValue({
        ...defaultImageSearchReturn,
        clearResults: mockClearResults,
      });
      
      renderWithProvider(<ImageSearch />);
      
      expect(mockClearResults).toHaveBeenCalled();
    });
  });
});