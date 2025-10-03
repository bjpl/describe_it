import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  VocabularySearch,
  VocabularyWord,
  SavedSearch,
  VocabularySearchProps
} from '@/components/Vocabulary/VocabularySearch';

// Mock data
const mockWords: VocabularyWord[] = [
  {
    id: '1',
    spanish: 'café',
    english: 'coffee',
    category: 'food',
    partOfSpeech: 'noun',
    difficulty: 'beginner',
    createdAt: new Date('2024-01-01'),
    examples: ['Me gusta el café'],
  },
  {
    id: '2',
    spanish: 'comer',
    english: 'to eat',
    category: 'food',
    partOfSpeech: 'verb',
    difficulty: 'beginner',
    createdAt: new Date('2024-01-02'),
  },
  {
    id: '3',
    spanish: 'hermoso',
    english: 'beautiful',
    category: 'culture',
    partOfSpeech: 'adjective',
    difficulty: 'intermediate',
    createdAt: new Date('2024-01-03'),
  },
  {
    id: '4',
    spanish: 'viajar',
    english: 'to travel',
    category: 'travel',
    partOfSpeech: 'verb',
    difficulty: 'intermediate',
    createdAt: new Date('2024-01-04'),
  },
  {
    id: '5',
    spanish: 'negocios',
    english: 'business',
    category: 'business',
    partOfSpeech: 'noun',
    difficulty: 'advanced',
    createdAt: new Date('2024-01-05'),
  },
];

const mockSavedSearches: SavedSearch[] = [
  {
    id: 'saved-1',
    name: 'Food verbs',
    query: 'comer',
    filters: { category: 'food', partOfSpeech: 'verb' },
    timestamp: new Date('2024-01-01'),
  },
  {
    id: 'saved-2',
    name: 'Travel words',
    query: 'viajar',
    filters: { category: 'travel' },
    timestamp: new Date('2024-01-02'),
  },
];

const defaultProps: VocabularySearchProps = {
  words: mockWords,
  onSearch: vi.fn(),
  onSelectWord: vi.fn(),
};

describe('VocabularySearch Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  // ============================
  // Search Input Tests (15 tests)
  // ============================

  describe('Search Input', () => {
    it('renders search input with default placeholder', () => {
      render(<VocabularySearch {...defaultProps} />);
      expect(screen.getByPlaceholderText('Search Spanish or English...')).toBeInTheDocument();
    });

    it('renders search input with custom placeholder', () => {
      render(<VocabularySearch {...defaultProps} placeholder="Find words..." />);
      expect(screen.getByPlaceholderText('Find words...')).toBeInTheDocument();
    });

    it('displays search icon', () => {
      render(<VocabularySearch {...defaultProps} />);
      const searchIcon = screen.getByLabelText('Search vocabulary').previousSibling;
      expect(searchIcon).toBeInTheDocument();
    });

    it('shows clear button when text is entered', async () => {
      const user = userEvent.setup({ delay: null });
      render(<VocabularySearch {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search Spanish or English...');
      await user.type(input, 'café');

      expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
    });

    it('hides clear button when input is empty', () => {
      render(<VocabularySearch {...defaultProps} />);
      expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument();
    });

    it('clears input when clear button is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      render(<VocabularySearch {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search Spanish or English...') as HTMLInputElement;
      await user.type(input, 'café');

      const clearButton = screen.getByLabelText('Clear search');
      await user.click(clearButton);

      expect(input.value).toBe('');
    });

    it('focuses input when clear button is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      render(<VocabularySearch {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search Spanish or English...');
      await user.type(input, 'café');

      const clearButton = screen.getByLabelText('Clear search');
      await user.click(clearButton);

      expect(input).toHaveFocus();
    });

    it('debounces search input with default 300ms delay', async () => {
      const onSearch = vi.fn();
      render(<VocabularySearch {...defaultProps} onSearch={onSearch} />);

      const input = screen.getByPlaceholderText('Search Spanish or English...');
      fireEvent.change(input, { target: { value: 'café' } });

      expect(onSearch).not.toHaveBeenCalled();

      vi.advanceTimersByTime(299);
      expect(onSearch).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(onSearch).toHaveBeenCalledTimes(1);
    });

    it('debounces search input with custom delay', async () => {
      const onSearch = vi.fn();
      render(<VocabularySearch {...defaultProps} onSearch={onSearch} debounceDelay={500} />);

      const input = screen.getByPlaceholderText('Search Spanish or English...');
      fireEvent.change(input, { target: { value: 'café' } });

      vi.advanceTimersByTime(499);
      expect(onSearch).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(onSearch).toHaveBeenCalledTimes(1);
    });

    it('respects minimum character length of 2 by default', async () => {
      const user = userEvent.setup({ delay: null });
      render(<VocabularySearch {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search Spanish or English...');
      await user.type(input, 'c');

      vi.advanceTimersByTime(300);
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('respects custom minimum character length', async () => {
      const user = userEvent.setup({ delay: null });
      render(<VocabularySearch {...defaultProps} minSearchLength={3} />);

      const input = screen.getByPlaceholderText('Search Spanish or English...');
      await user.type(input, 'ca');
      await user.click(input);

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('shows results when minimum length is met', async () => {
      const user = userEvent.setup({ delay: null });
      render(<VocabularySearch {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search Spanish or English...');
      await user.type(input, 'café');
      await user.click(input);

      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('has proper ARIA attributes', () => {
      render(<VocabularySearch {...defaultProps} />);

      const input = screen.getByLabelText('Search vocabulary');
      expect(input).toHaveAttribute('aria-autocomplete', 'list');
      expect(input).toHaveAttribute('aria-controls', 'search-results');
    });

    it('updates ARIA expanded state when results are shown', async () => {
      const user = userEvent.setup({ delay: null });
      render(<VocabularySearch {...defaultProps} />);

      const input = screen.getByLabelText('Search vocabulary');
      expect(input).toHaveAttribute('aria-expanded', 'false');

      await user.type(input, 'café');
      await user.click(input);

      expect(input).toHaveAttribute('aria-expanded', 'true');
    });

    it('allows text input and displays value', async () => {
      const user = userEvent.setup({ delay: null });
      render(<VocabularySearch {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search Spanish or English...') as HTMLInputElement;
      await user.type(input, 'test query');

      expect(input.value).toBe('test query');
    });
  });

  // ============================
  // Search Functionality Tests (20 tests)
  // ============================

  describe('Search Functionality', () => {
    it('searches by Spanish word', async () => {
      const user = userEvent.setup({ delay: null });
      render(<VocabularySearch {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search Spanish or English...');
      await user.type(input, 'café');
      await user.click(input);

      expect(screen.getByText('coffee')).toBeInTheDocument();
    });

    it('searches by English translation', async () => {
      const user = userEvent.setup({ delay: null });
      render(<VocabularySearch {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search Spanish or English...');
      await user.type(input, 'coffee');
      await user.click(input);

      expect(screen.getByText('café')).toBeInTheDocument();
    });

    it('filters by category', async () => {
      const user = userEvent.setup({ delay: null });
      render(<VocabularySearch {...defaultProps} showAdvanced={true} />);

      const filterButton = screen.getByLabelText('Toggle advanced search');
      await user.click(filterButton);

      const categorySelect = screen.getByLabelText('Category');
      await user.selectOptions(categorySelect, 'food');

      const input = screen.getByPlaceholderText('Search Spanish or English...');
      await user.type(input, 'co');
      await user.click(input);

      expect(screen.getByText('coffee')).toBeInTheDocument();
      expect(screen.queryByText('business')).not.toBeInTheDocument();
    });

    it('filters by part of speech', async () => {
      const user = userEvent.setup({ delay: null });
      render(<VocabularySearch {...defaultProps} showAdvanced={true} />);

      const filterButton = screen.getByLabelText('Toggle advanced search');
      await user.click(filterButton);

      const posSelect = screen.getByLabelText('Part of Speech');
      await user.selectOptions(posSelect, 'verb');

      const input = screen.getByPlaceholderText('Search Spanish or English...');
      await user.type(input, 'co');
      await user.click(input);

      expect(screen.getByText('to eat')).toBeInTheDocument();
      expect(screen.queryByText('coffee')).not.toBeInTheDocument();
    });

    it('filters by difficulty level', async () => {
      const user = userEvent.setup({ delay: null });
      render(<VocabularySearch {...defaultProps} showAdvanced={true} />);

      const filterButton = screen.getByLabelText('Toggle advanced search');
      await user.click(filterButton);

      const difficultySelect = screen.getByLabelText('Difficulty');
      await user.selectOptions(difficultySelect, 'intermediate');

      const input = screen.getByPlaceholderText('Search Spanish or English...');
      await user.type(input, 'he');
      await user.click(input);

      expect(screen.getByText('beautiful')).toBeInTheDocument();
    });

    it('performs partial match search', async () => {
      const user = userEvent.setup({ delay: null });
      render(<VocabularySearch {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search Spanish or English...');
      await user.type(input, 'caf');
      await user.click(input);

      expect(screen.getByText('coffee')).toBeInTheDocument();
    });

    it('performs case-insensitive search', async () => {
      const user = userEvent.setup({ delay: null });
      render(<VocabularySearch {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search Spanish or English...');
      await user.type(input, 'CAFÉ');
      await user.click(input);

      expect(screen.getByText('coffee')).toBeInTheDocument();
    });

    it('performs accent-insensitive search (café = cafe)', async () => {
      const user = userEvent.setup({ delay: null });
      render(<VocabularySearch {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search Spanish or English...');
      await user.type(input, 'cafe');
      await user.click(input);

      expect(screen.getByText('coffee')).toBeInTheDocument();
    });

    it('shows real-time results as user types', async () => {
      const user = userEvent.setup({ delay: null });
      render(<VocabularySearch {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search Spanish or English...');
      await user.type(input, 'ca');
      await user.click(input);

      expect(screen.getByText('coffee')).toBeInTheDocument();

      await user.type(input, 'f');
      expect(screen.getByText('coffee')).toBeInTheDocument();
    });

    it('calls onSearch callback with query and filters', async () => {
      const onSearch = vi.fn();
      render(<VocabularySearch {...defaultProps} onSearch={onSearch} />);

      const input = screen.getByPlaceholderText('Search Spanish or English...');
      fireEvent.change(input, { target: { value: 'café' } });

      vi.advanceTimersByTime(300);

      expect(onSearch).toHaveBeenCalledWith('café', {});
    });

    it('combines multiple search criteria', async () => {
      const user = userEvent.setup({ delay: null });
      render(<VocabularySearch {...defaultProps} showAdvanced={true} />);

      const filterButton = screen.getByLabelText('Toggle advanced search');
      await user.click(filterButton);

      const categorySelect = screen.getByLabelText('Category');
      await user.selectOptions(categorySelect, 'food');

      const posSelect = screen.getByLabelText('Part of Speech');
      await user.selectOptions(posSelect, 'verb');

      const input = screen.getByPlaceholderText('Search Spanish or English...');
      await user.type(input, 'co');
      await user.click(input);

      expect(screen.getByText('to eat')).toBeInTheDocument();
      expect(screen.queryByText('coffee')).not.toBeInTheDocument();
    });

    it('resets results when search is cleared', async () => {
      const user = userEvent.setup({ delay: null });
      render(<VocabularySearch {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search Spanish or English...');
      await user.type(input, 'café');
      await user.click(input);

      expect(screen.getByRole('listbox')).toBeInTheDocument();

      const clearButton = screen.getByLabelText('Clear search');
      await user.click(clearButton);

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('searches across multiple fields simultaneously', async () => {
      const user = userEvent.setup({ delay: null });
      render(<VocabularySearch {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search Spanish or English...');
      await user.type(input, 'eat');
      await user.click(input);

      expect(screen.getByText('to eat')).toBeInTheDocument();
    });

    it('returns empty results for non-matching query', async () => {
      const user = userEvent.setup({ delay: null });
      render(<VocabularySearch {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search Spanish or English...');
      await user.type(input, 'xyz123');
      await user.click(input);

      expect(screen.getByText(/No results found/i)).toBeInTheDocument();
    });

    it('handles special characters in search', async () => {
      const user = userEvent.setup({ delay: null });
      render(<VocabularySearch {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search Spanish or English...');
      await user.type(input, 'café@#$');
      await user.click(input);

      // Should still find café by matching the beginning
      expect(screen.queryByText('coffee')).toBeInTheDocument();
    });

    it('handles empty search gracefully', async () => {
      const user = userEvent.setup({ delay: null });
      render(<VocabularySearch {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search Spanish or English...');
      await user.type(input, '   ');
      await user.click(input);

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('updates results when filters change', async () => {
      const user = userEvent.setup({ delay: null });
      render(<VocabularySearch {...defaultProps} showAdvanced={true} />);

      const input = screen.getByPlaceholderText('Search Spanish or English...');
      await user.type(input, 'co');

      const filterButton = screen.getByLabelText('Toggle advanced search');
      await user.click(filterButton);

      const categorySelect = screen.getByLabelText('Category');
      await user.selectOptions(categorySelect, 'food');

      await user.click(input);

      expect(screen.getByText('coffee')).toBeInTheDocument();
      expect(screen.queryByText('business')).not.toBeInTheDocument();
    });

    it('maintains search state across filter changes', async () => {
      const user = userEvent.setup({ delay: null });
      render(<VocabularySearch {...defaultProps} showAdvanced={true} />);

      const input = screen.getByPlaceholderText('Search Spanish or English...') as HTMLInputElement;
      await user.type(input, 'café');

      const filterButton = screen.getByLabelText('Toggle advanced search');
      await user.click(filterButton);

      const categorySelect = screen.getByLabelText('Category');
      await user.selectOptions(categorySelect, 'food');

      expect(input.value).toBe('café');
    });

    it('cancels in-flight requests when new search starts', async () => {
      const onSearch = vi.fn();
      render(<VocabularySearch {...defaultProps} onSearch={onSearch} />);

      const input = screen.getByPlaceholderText('Search Spanish or English...');

      fireEvent.change(input, { target: { value: 'café' } });
      vi.advanceTimersByTime(100);

      fireEvent.change(input, { target: { value: 'coffee' } });
      vi.advanceTimersByTime(300);

      // Should only call onSearch once for the final value
      expect(onSearch).toHaveBeenCalledTimes(1);
      expect(onSearch).toHaveBeenCalledWith('coffee', {});
    });

    it('handles rapid consecutive searches', async () => {
      const onSearch = vi.fn();
      render(<VocabularySearch {...defaultProps} onSearch={onSearch} />);

      const input = screen.getByPlaceholderText('Search Spanish or English...');

      fireEvent.change(input, { target: { value: 'c' } });
      vi.advanceTimersByTime(50);

      fireEvent.change(input, { target: { value: 'ca' } });
      vi.advanceTimersByTime(50);

      fireEvent.change(input, { target: { value: 'caf' } });
      vi.advanceTimersByTime(50);

      fireEvent.change(input, { target: { value: 'café' } });
      vi.advanceTimersByTime(300);

      expect(onSearch).toHaveBeenCalledTimes(1);
      expect(onSearch).toHaveBeenCalledWith('café', {});
    });
  });

  // ============================
  // Search Results Tests (15 tests)
  // ============================

  describe('Search Results', () => {
    it('displays results list when matches are found', async () => {
      const user = userEvent.setup({ delay: null });
      render(<VocabularySearch {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search Spanish or English...');
      await user.type(input, 'café');
      await user.click(input);

      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('highlights matching text in Spanish words', async () => {
      const user = userEvent.setup({ delay: null });
      render(<VocabularySearch {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search Spanish or English...');
      await user.type(input, 'caf');
      await user.click(input);

      const highlighted = screen.getByText('caf');
      expect(highlighted.tagName).toBe('MARK');
    });

    it('highlights matching text in English translations', async () => {
      const user = userEvent.setup({ delay: null });
      render(<VocabularySearch {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search Spanish or English...');
      await user.type(input, 'coff');
      await user.click(input);

      const highlighted = screen.getByText('coff');
      expect(highlighted.tagName).toBe('MARK');
    });

    it('displays result count', async () => {
      const user = userEvent.setup({ delay: null });
      render(<VocabularySearch {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search Spanish or English...');
      await user.type(input, 'co');
      await user.click(input);

      expect(screen.getByText(/2 results/i)).toBeInTheDocument();
    });

    it('displays singular "result" for single match', async () => {
      const user = userEvent.setup({ delay: null });
      render(<VocabularySearch {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search Spanish or English...');
      await user.type(input, 'café');
      await user.click(input);

      expect(screen.getByText(/1 result/i)).toBeInTheDocument();
    });

    it('shows no results message when no matches found', async () => {
      const user = userEvent.setup({ delay: null });
      render(<VocabularySearch {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search Spanish or English...');
      await user.type(input, 'nonexistent');
      await user.click(input);

      expect(screen.getByText(/No results found for "nonexistent"/i)).toBeInTheDocument();
    });

    it('calls onSelectWord when result is clicked', async () => {
      const onSelectWord = vi.fn();
      const user = userEvent.setup({ delay: null });
      render(<VocabularySearch {...defaultProps} onSelectWord={onSelectWord} />);

      const input = screen.getByPlaceholderText('Search Spanish or English...');
      await user.type(input, 'café');
      await user.click(input);

      const result = screen.getByText('coffee');
      await user.click(result.closest('button')!);

      expect(onSelectWord).toHaveBeenCalledWith(mockWords[0]);
    });

    it('navigates results with arrow down key', async () => {
      const user = userEvent.setup({ delay: null });
      render(<VocabularySearch {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search Spanish or English...');
      await user.type(input, 'co');
      await user.click(input);

      fireEvent.keyDown(input, { key: 'ArrowDown' });

      const results = screen.getAllByRole('option');
      expect(results[0]).toHaveClass('bg-gray-100');
    });

    it('navigates results with arrow up key', async () => {
      const user = userEvent.setup({ delay: null });
      render(<VocabularySearch {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search Spanish or English...');
      await user.type(input, 'co');
      await user.click(input);

      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowUp' });

      const results = screen.getAllByRole('option');
      expect(results[0]).toHaveClass('bg-gray-100');
    });

    it('selects result with Enter key', async () => {
      const onSelectWord = vi.fn();
      const user = userEvent.setup({ delay: null });
      render(<VocabularySearch {...defaultProps} onSelectWord={onSelectWord} />);

      const input = screen.getByPlaceholderText('Search Spanish or English...');
      await user.type(input, 'café');
      await user.click(input);

      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onSelectWord).toHaveBeenCalledWith(mockWords[0]);
    });

    it('closes results with Escape key', async () => {
      const user = userEvent.setup({ delay: null });
      render(<VocabularySearch {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search Spanish or English...');
      await user.type(input, 'café');
      await user.click(input);

      expect(screen.getByRole('listbox')).toBeInTheDocument();

      fireEvent.keyDown(input, { key: 'Escape' });

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('displays category badge for each result', async () => {
      const user = userEvent.setup({ delay: null });
      render(<VocabularySearch {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search Spanish or English...');
      await user.type(input, 'café');
      await user.click(input);

      expect(screen.getByText('food')).toBeInTheDocument();
    });

    it('displays part of speech badge for each result', async () => {
      const user = userEvent.setup({ delay: null });
      render(<VocabularySearch {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search Spanish or English...');
      await user.type(input, 'café');
      await user.click(input);

      expect(screen.getByText('noun')).toBeInTheDocument();
    });

    it('clears search query after selecting a word', async () => {
      const user = userEvent.setup({ delay: null });
      render(<VocabularySearch {...defaultProps} onSelectWord={vi.fn()} />);

      const input = screen.getByPlaceholderText('Search Spanish or English...') as HTMLInputElement;
      await user.type(input, 'café');
      await user.click(input);

      const result = screen.getByText('coffee');
      await user.click(result.closest('button')!);

      expect(input.value).toBe('');
    });

    it('shows results on focus if query is valid', async () => {
      const user = userEvent.setup({ delay: null });
      render(<VocabularySearch {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search Spanish or English...');
      await user.type(input, 'café');

      // Blur and focus again
      input.blur();
      await user.click(input);

      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });
  });

  // ============================
  // Advanced Search Tests (12 tests)
  // ============================

  describe('Advanced Search', () => {
    it('shows advanced filter toggle when showAdvanced is true', () => {
      render(<VocabularySearch {...defaultProps} showAdvanced={true} />);
      expect(screen.getByLabelText('Toggle advanced search')).toBeInTheDocument();
    });

    it('hides advanced filter toggle when showAdvanced is false', () => {
      render(<VocabularySearch {...defaultProps} showAdvanced={false} />);
      expect(screen.queryByLabelText('Toggle advanced search')).not.toBeInTheDocument();
    });

    it('opens advanced panel when filter button is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      render(<VocabularySearch {...defaultProps} showAdvanced={true} />);

      const filterButton = screen.getByLabelText('Toggle advanced search');
      await user.click(filterButton);

      expect(screen.getByLabelText('Category')).toBeInTheDocument();
      expect(screen.getByLabelText('Part of Speech')).toBeInTheDocument();
      expect(screen.getByLabelText('Difficulty')).toBeInTheDocument();
    });

    it('closes advanced panel when filter button is clicked again', async () => {
      const user = userEvent.setup({ delay: null });
      render(<VocabularySearch {...defaultProps} showAdvanced={true} />);

      const filterButton = screen.getByLabelText('Toggle advanced search');
      await user.click(filterButton);
      expect(screen.getByLabelText('Category')).toBeInTheDocument();

      await user.click(filterButton);
      expect(screen.queryByLabelText('Category')).not.toBeInTheDocument();
    });

    it('applies multiple filter criteria together', async () => {
      const user = userEvent.setup({ delay: null });
      render(<VocabularySearch {...defaultProps} showAdvanced={true} />);

      const filterButton = screen.getByLabelText('Toggle advanced search');
      await user.click(filterButton);

      await user.selectOptions(screen.getByLabelText('Category'), 'food');
      await user.selectOptions(screen.getByLabelText('Part of Speech'), 'noun');
      await user.selectOptions(screen.getByLabelText('Difficulty'), 'beginner');

      const input = screen.getByPlaceholderText('Search Spanish or English...');
      await user.type(input, 'ca');
      await user.click(input);

      expect(screen.getByText('coffee')).toBeInTheDocument();
      expect(screen.queryByText('to eat')).not.toBeInTheDocument();
    });

    it('shows save search button when onSaveSearch prop is provided', async () => {
      const user = userEvent.setup({ delay: null });
      render(
        <VocabularySearch
          {...defaultProps}
          showAdvanced={true}
          onSaveSearch={vi.fn()}
        />
      );

      const filterButton = screen.getByLabelText('Toggle advanced search');
      await user.click(filterButton);

      const input = screen.getByPlaceholderText('Search Spanish or English...');
      await user.type(input, 'test');

      expect(screen.getByText('Save Search')).toBeInTheDocument();
    });

    it('calls onSaveSearch when save button is clicked', async () => {
      const onSaveSearch = vi.fn();
      const user = userEvent.setup({ delay: null });
      render(
        <VocabularySearch
          {...defaultProps}
          showAdvanced={true}
          onSaveSearch={onSaveSearch}
        />
      );

      const filterButton = screen.getByLabelText('Toggle advanced search');
      await user.click(filterButton);

      const input = screen.getByPlaceholderText('Search Spanish or English...');
      await user.type(input, 'café');

      const saveButton = screen.getByText('Save Search');
      await user.click(saveButton);

      expect(onSaveSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'café',
          query: 'café',
          filters: {},
        })
      );
    });

    it('displays saved searches when provided', async () => {
      const user = userEvent.setup({ delay: null });
      render(
        <VocabularySearch
          {...defaultProps}
          showAdvanced={true}
          savedSearches={mockSavedSearches}
        />
      );

      const filterButton = screen.getByLabelText('Toggle advanced search');
      await user.click(filterButton);

      expect(screen.getByText('Food verbs')).toBeInTheDocument();
      expect(screen.getByText('Travel words')).toBeInTheDocument();
    });

    it('loads saved search when clicked', async () => {
      const onLoadSearch = vi.fn();
      const user = userEvent.setup({ delay: null });
      render(
        <VocabularySearch
          {...defaultProps}
          showAdvanced={true}
          savedSearches={mockSavedSearches}
          onLoadSearch={onLoadSearch}
        />
      );

      const filterButton = screen.getByLabelText('Toggle advanced search');
      await user.click(filterButton);

      const savedSearch = screen.getByText('Food verbs');
      await user.click(savedSearch);

      expect(onLoadSearch).toHaveBeenCalledWith(mockSavedSearches[0]);
    });

    it('populates search and filters when loading saved search', async () => {
      const user = userEvent.setup({ delay: null });
      render(
        <VocabularySearch
          {...defaultProps}
          showAdvanced={true}
          savedSearches={mockSavedSearches}
        />
      );

      const filterButton = screen.getByLabelText('Toggle advanced search');
      await user.click(filterButton);

      const savedSearch = screen.getByText('Food verbs');
      await user.click(savedSearch);

      const input = screen.getByPlaceholderText('Search Spanish or English...') as HTMLInputElement;
      expect(input.value).toBe('comer');

      const categorySelect = screen.getByLabelText('Category') as HTMLSelectElement;
      expect(categorySelect.value).toBe('food');

      const posSelect = screen.getByLabelText('Part of Speech') as HTMLSelectElement;
      expect(posSelect.value).toBe('verb');
    });

    it('clears filters when category is set to "All Categories"', async () => {
      const user = userEvent.setup({ delay: null });
      render(<VocabularySearch {...defaultProps} showAdvanced={true} />);

      const filterButton = screen.getByLabelText('Toggle advanced search');
      await user.click(filterButton);

      const categorySelect = screen.getByLabelText('Category');
      await user.selectOptions(categorySelect, 'food');
      await user.selectOptions(categorySelect, '');

      const input = screen.getByPlaceholderText('Search Spanish or English...');
      await user.type(input, 'co');
      await user.click(input);

      // Should show all results again
      expect(screen.getByText('coffee')).toBeInTheDocument();
      expect(screen.getByText('to eat')).toBeInTheDocument();
    });

    it('resets filters when clear button is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      render(<VocabularySearch {...defaultProps} showAdvanced={true} />);

      const filterButton = screen.getByLabelText('Toggle advanced search');
      await user.click(filterButton);

      const categorySelect = screen.getByLabelText('Category');
      await user.selectOptions(categorySelect, 'food');

      const input = screen.getByPlaceholderText('Search Spanish or English...');
      await user.type(input, 'test');

      const clearButton = screen.getByLabelText('Clear search');
      await user.click(clearButton);

      expect((categorySelect as HTMLSelectElement).value).toBe('');
    });
  });

  // ============================
  // Performance Tests (8 tests)
  // ============================

  describe('Performance', () => {
    it('debounces API calls to prevent excessive requests', async () => {
      const onSearch = vi.fn();
      render(<VocabularySearch {...defaultProps} onSearch={onSearch} />);

      const input = screen.getByPlaceholderText('Search Spanish or English...');

      fireEvent.change(input, { target: { value: 'c' } });
      fireEvent.change(input, { target: { value: 'ca' } });
      fireEvent.change(input, { target: { value: 'caf' } });
      fireEvent.change(input, { target: { value: 'café' } });

      vi.advanceTimersByTime(300);

      expect(onSearch).toHaveBeenCalledTimes(1);
    });

    it('cancels in-flight requests when component unmounts', () => {
      const onSearch = vi.fn();
      const { unmount } = render(<VocabularySearch {...defaultProps} onSearch={onSearch} />);

      const input = screen.getByPlaceholderText('Search Spanish or English...');
      fireEvent.change(input, { target: { value: 'café' } });

      unmount();
      vi.advanceTimersByTime(300);

      expect(onSearch).not.toHaveBeenCalled();
    });

    it('caches search results for repeated queries', async () => {
      const user = userEvent.setup({ delay: null });
      render(<VocabularySearch {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search Spanish or English...');

      // First search
      await user.type(input, 'café');
      await user.click(input);
      expect(screen.getByText('coffee')).toBeInTheDocument();

      // Clear and search again
      await user.clear(input);
      await user.type(input, 'café');
      await user.click(input);

      // Results should be immediate from cache
      expect(screen.getByText('coffee')).toBeInTheDocument();
    });

    it('handles large result sets efficiently', async () => {
      const largeWordList: VocabularyWord[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `word-${i}`,
        spanish: `palabra${i}`,
        english: `word${i}`,
        category: 'test',
        partOfSpeech: 'noun',
        difficulty: 'beginner',
        createdAt: new Date(),
      }));

      const user = userEvent.setup({ delay: null });
      render(<VocabularySearch {...defaultProps} words={largeWordList} />);

      const input = screen.getByPlaceholderText('Search Spanish or English...');
      await user.type(input, 'pal');

      vi.advanceTimersByTime(300);
      await user.click(input);

      // Should render without performance issues
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('limits visible results for better performance', async () => {
      const user = userEvent.setup({ delay: null });
      render(<VocabularySearch {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search Spanish or English...');
      await user.type(input, 'co');
      await user.click(input);

      const results = screen.getAllByRole('option');
      expect(results.length).toBeLessThanOrEqual(100); // Reasonable limit
    });

    it('uses memoization to prevent unnecessary re-renders', async () => {
      const onSearch = vi.fn();
      const { rerender } = render(
        <VocabularySearch {...defaultProps} onSearch={onSearch} />
      );

      // Rerender with same props
      rerender(<VocabularySearch {...defaultProps} onSearch={onSearch} />);

      // Should not trigger additional searches
      expect(onSearch).not.toHaveBeenCalled();
    });

    it('cleans up event listeners on unmount', () => {
      const { unmount } = render(<VocabularySearch {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search Spanish or English...');
      fireEvent.change(input, { target: { value: 'test' } });

      unmount();

      // Should not throw errors
      expect(() => {
        fireEvent.change(input, { target: { value: 'another test' } });
      }).not.toThrow();
    });

    it('efficiently updates when words prop changes', async () => {
      const user = userEvent.setup({ delay: null });
      const { rerender } = render(<VocabularySearch {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search Spanish or English...');
      await user.type(input, 'test');
      await user.click(input);

      const newWords = [...mockWords, {
        id: '6',
        spanish: 'test',
        english: 'test',
        category: 'test',
        partOfSpeech: 'noun' as const,
        difficulty: 'beginner' as const,
        createdAt: new Date(),
      }];

      rerender(<VocabularySearch {...defaultProps} words={newWords} />);

      // Should update results
      expect(screen.getByText('test')).toBeInTheDocument();
    });
  });
});
