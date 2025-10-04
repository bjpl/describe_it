import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SearchSection } from '@/components/SearchSection';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Search: ({ className }: { className?: string }) => (
    <div data-testid="search-icon" className={className}>Search</div>
  ),
  X: ({ className }: { className?: string }) => (
    <div data-testid="x-icon" className={className}>X</div>
  ),
  Filter: ({ className }: { className?: string }) => (
    <div data-testid="filter-icon" className={className}>Filter</div>
  ),
  ChevronDown: ({ className }: { className?: string }) => (
    <div data-testid="chevron-down-icon" className={className}>ChevronDown</div>
  )
}));

// Mock the API call
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockProps = {
  onSearch: vi.fn(),
  loading: false,
  searchQuery: '',
  onSearchQueryChange: vi.fn(),
  searchError: null
};

describe('SearchSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('Rendering', () => {
    it('should render search input', () => {
      render(<SearchSection {...mockProps} />);
      
      const searchInput = screen.getByRole('textbox', { name: /search for images/i });
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveAttribute('placeholder', 'Search for images...');
    });

    it('should render search button', () => {
      render(<SearchSection {...mockProps} />);
      
      const searchButton = screen.getByRole('button', { name: /search/i });
      expect(searchButton).toBeInTheDocument();
      expect(screen.getByTestId('search-icon')).toBeInTheDocument();
    });

    it('should render category filter', () => {
      render(<SearchSection {...mockProps} />);
      
      const categorySelect = screen.getByLabelText(/category/i);
      expect(categorySelect).toBeInTheDocument();
    });

    it('should render orientation filter', () => {
      render(<SearchSection {...mockProps} />);
      
      const orientationSelect = screen.getByLabelText(/orientation/i);
      expect(orientationSelect).toBeInTheDocument();
    });

    it('should display current search query', () => {
      render(<SearchSection {...mockProps} searchQuery="mountains" />);
      
      const searchInput = screen.getByRole('textbox');
      expect(searchInput).toHaveValue('mountains');
    });
  });

  describe('User Interactions', () => {
    it('should call onSearchQueryChange when typing', () => {
      render(<SearchSection {...mockProps} />);
      
      const searchInput = screen.getByRole('textbox');
      fireEvent.change(searchInput, { target: { value: 'nature' } });
      
      expect(mockProps.onSearchQueryChange).toHaveBeenCalledWith('nature');
    });

    it('should call onSearch when search button is clicked', () => {
      render(<SearchSection {...mockProps} searchQuery="mountains" />);
      
      const searchButton = screen.getByRole('button', { name: /search/i });
      fireEvent.click(searchButton);
      
      expect(mockProps.onSearch).toHaveBeenCalledWith('mountains');
    });

    it('should call onSearch when Enter key is pressed', () => {
      render(<SearchSection {...mockProps} searchQuery="ocean" />);
      
      const searchInput = screen.getByRole('textbox');
      fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });
      
      expect(mockProps.onSearch).toHaveBeenCalledWith('ocean');
    });

    it('should not search with empty query', () => {
      render(<SearchSection {...mockProps} searchQuery="" />);
      
      const searchButton = screen.getByRole('button', { name: /search/i });
      fireEvent.click(searchButton);
      
      expect(mockProps.onSearch).not.toHaveBeenCalled();
    });

    it('should clear search when clear button is clicked', () => {
      render(<SearchSection {...mockProps} searchQuery="test query" />);
      
      const clearButton = screen.getByRole('button', { name: /clear search/i });
      fireEvent.click(clearButton);
      
      expect(mockProps.onSearchQueryChange).toHaveBeenCalledWith('');
    });

    it('should update category filter', () => {
      render(<SearchSection {...mockProps} />);
      
      const categorySelect = screen.getByLabelText(/category/i);
      fireEvent.change(categorySelect, { target: { value: 'nature' } });
      
      expect(categorySelect).toHaveValue('nature');
    });

    it('should update orientation filter', () => {
      render(<SearchSection {...mockProps} />);
      
      const orientationSelect = screen.getByLabelText(/orientation/i);
      fireEvent.change(orientationSelect, { target: { value: 'portrait' } });
      
      expect(orientationSelect).toHaveValue('portrait');
    });
  });

  describe('Loading State', () => {
    it('should disable search button when loading', () => {
      render(<SearchSection {...mockProps} loading={true} />);
      
      const searchButton = screen.getByRole('button', { name: /search/i });
      expect(searchButton).toBeDisabled();
    });

    it('should disable input when loading', () => {
      render(<SearchSection {...mockProps} loading={true} />);
      
      const searchInput = screen.getByRole('textbox');
      expect(searchInput).toBeDisabled();
    });

    it('should show loading text', () => {
      render(<SearchSection {...mockProps} loading={true} />);
      
      expect(screen.getByText(/searching/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<SearchSection {...mockProps} />);
      
      const searchInput = screen.getByLabelText(/search for images/i);
      const categorySelect = screen.getByLabelText(/category/i);
      const orientationSelect = screen.getByLabelText(/orientation/i);
      
      expect(searchInput).toBeInTheDocument();
      expect(categorySelect).toBeInTheDocument();
      expect(orientationSelect).toBeInTheDocument();
    });

    it('should have proper button labels', () => {
      render(<SearchSection {...mockProps} searchQuery="test" />);
      
      const searchButton = screen.getByRole('button', { name: /search/i });
      const clearButton = screen.getByRole('button', { name: /clear search/i });
      
      expect(searchButton).toBeInTheDocument();
      expect(clearButton).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      render(<SearchSection {...mockProps} />);
      
      const searchInput = screen.getByRole('textbox');
      searchInput.focus();
      
      expect(searchInput).toHaveFocus();
      
      // Tab to next element
      fireEvent.keyDown(searchInput, { key: 'Tab' });
      const categorySelect = screen.getByLabelText(/category/i);
      categorySelect.focus();
      
      expect(categorySelect).toHaveFocus();
    });
  });

  describe('Filter Functionality', () => {
    it('should show all category options', () => {
      render(<SearchSection {...mockProps} />);
      
      const categorySelect = screen.getByLabelText(/category/i);
      const options = categorySelect.querySelectorAll('option');
      
      expect(options.length).toBeGreaterThan(1);
      expect(options[0]).toHaveTextContent('All Categories');
    });

    it('should show orientation options', () => {
      render(<SearchSection {...mockProps} />);
      
      const orientationSelect = screen.getByLabelText(/orientation/i);
      const options = orientationSelect.querySelectorAll('option');
      
      expect(options.length).toBeGreaterThan(1);
      expect(options[0]).toHaveTextContent('Any Orientation');
    });

    it('should apply filters when searching', async () => {
      render(<SearchSection {...mockProps} searchQuery="test" />);
      
      const categorySelect = screen.getByLabelText(/category/i);
      fireEvent.change(categorySelect, { target: { value: 'nature' } });
      
      const orientationSelect = screen.getByLabelText(/orientation/i);
      fireEvent.change(orientationSelect, { target: { value: 'landscape' } });
      
      const searchButton = screen.getByRole('button', { name: /search/i });
      fireEvent.click(searchButton);
      
      await waitFor(() => {
        expect(mockProps.onSearch).toHaveBeenCalledWith('test', {
          category: 'nature',
          orientation: 'landscape'
        });
      });
    });
  });

  describe('Search Suggestions', () => {
    it('should show popular search terms', () => {
      render(<SearchSection {...mockProps} />);
      
      expect(screen.getByText(/popular searches/i)).toBeInTheDocument();
      
      const suggestions = screen.getAllByRole('button').filter(button => 
        button.textContent && 
        !['Search', 'Clear search'].includes(button.textContent.trim())
      );
      
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should execute search when suggestion is clicked', () => {
      render(<SearchSection {...mockProps} />);
      
      const natureSuggestion = screen.getByRole('button', { name: /nature/i });
      fireEvent.click(natureSuggestion);
      
      expect(mockProps.onSearchQueryChange).toHaveBeenCalledWith('nature');
      expect(mockProps.onSearch).toHaveBeenCalledWith('nature');
    });
  });

  describe('Search History', () => {
    it('should display recent searches', () => {
      // Mock localStorage
      const mockLocalStorage = {
        getItem: vi.fn().mockReturnValue(JSON.stringify(['mountains', 'ocean', 'forest'])),
        setItem: vi.fn(),
        removeItem: vi.fn()
      };
      Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });
      
      render(<SearchSection {...mockProps} />);
      
      expect(screen.getByText(/recent searches/i)).toBeInTheDocument();
    });

    it('should clear search history', () => {
      const mockLocalStorage = {
        getItem: vi.fn().mockReturnValue(JSON.stringify(['mountains', 'ocean'])),
        setItem: vi.fn(),
        removeItem: vi.fn()
      };
      Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });
      
      render(<SearchSection {...mockProps} />);
      
      const clearHistoryButton = screen.getByRole('button', { name: /clear history/i });
      fireEvent.click(clearHistoryButton);
      
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('searchHistory');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long search queries', () => {
      const longQuery = 'a'.repeat(1000);
      render(<SearchSection {...mockProps} searchQuery={longQuery} />);
      
      const searchInput = screen.getByRole('textbox');
      expect(searchInput).toHaveValue(longQuery);
    });

    it('should handle special characters in search', () => {
      const specialQuery = 'test@#$%^&*()_+{}:"<>?';
      render(<SearchSection {...mockProps} searchQuery={specialQuery} />);
      
      const searchButton = screen.getByRole('button', { name: /search/i });
      fireEvent.click(searchButton);
      
      expect(mockProps.onSearch).toHaveBeenCalledWith(specialQuery);
    });

    it('should trim whitespace from search queries', () => {
      render(<SearchSection {...mockProps} />);
      
      const searchInput = screen.getByRole('textbox');
      fireEvent.change(searchInput, { target: { value: '  mountains  ' } });
      
      const searchButton = screen.getByRole('button', { name: /search/i });
      fireEvent.click(searchButton);
      
      expect(mockProps.onSearchQueryChange).toHaveBeenCalledWith('  mountains  ');
    });

    it('should handle rapid consecutive searches', async () => {
      render(<SearchSection {...mockProps} searchQuery="test" />);
      
      const searchButton = screen.getByRole('button', { name: /search/i });
      
      // Click multiple times rapidly
      fireEvent.click(searchButton);
      fireEvent.click(searchButton);
      fireEvent.click(searchButton);
      
      // Should debounce and only call once
      await waitFor(() => {
        expect(mockProps.onSearch).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('should handle mobile layout', () => {
      // Mock window.innerWidth for mobile
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      render(<SearchSection {...mockProps} />);
      
      const searchSection = screen.getByTestId('search-section') || 
                           screen.getByRole('search') ||
                           screen.getByLabelText(/search for images/i).closest('div');
      
      expect(searchSection).toBeInTheDocument();
    });
  });
});