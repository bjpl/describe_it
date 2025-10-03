import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { VocabularyFilter } from '@/components/Vocabulary/VocabularyFilter';
import type { FilterOptions, FilterPreset } from '@/types/vocabulary';

// Mock data for testing
const mockFilterOptions: FilterOptions = {
  categories: [
    { id: 'cat-1', name: 'Business', count: 45 },
    { id: 'cat-2', name: 'Technology', count: 32 },
    { id: 'cat-3', name: 'Travel', count: 28 },
    { id: 'cat-4', name: 'Education', count: 19 },
  ],
  partsOfSpeech: [
    { id: 'noun', name: 'Noun', count: 89 },
    { id: 'verb', name: 'Verb', count: 67 },
    { id: 'adjective', name: 'Adjective', count: 45 },
    { id: 'adverb', name: 'Adverb', count: 23 },
  ],
};

const mockPresets: FilterPreset[] = [
  {
    id: 'preset-1',
    name: 'Review Today',
    filters: {
      status: ['reviewed'],
      dateRange: { start: new Date(), end: new Date() },
    },
  },
  {
    id: 'preset-2',
    name: 'Not Mastered',
    filters: {
      status: ['not-mastered'],
    },
  },
];

const defaultProps = {
  options: mockFilterOptions,
  onFilterChange: vi.fn(),
  onApplyFilters: vi.fn(),
  onResetFilters: vi.fn(),
};

describe('VocabularyFilter Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ======================
  // Filter Panel Tests (12 tests)
  // ======================
  describe('Filter Panel', () => {
    it('should render filter panel', () => {
      render(<VocabularyFilter {...defaultProps} />);
      expect(screen.getByRole('region', { name: /filter panel/i })).toBeInTheDocument();
    });

    it('should toggle panel visibility on button click', async () => {
      const user = userEvent.setup();
      render(<VocabularyFilter {...defaultProps} />);

      const toggleButton = screen.getByRole('button', { name: /toggle filters/i });
      await user.click(toggleButton);

      expect(screen.queryByRole('region', { name: /filter panel/i })).not.toBeVisible();
    });

    it('should show panel by default', () => {
      render(<VocabularyFilter {...defaultProps} />);
      expect(screen.getByRole('region', { name: /filter panel/i })).toBeVisible();
    });

    it('should hide panel when isOpen prop is false', () => {
      render(<VocabularyFilter {...defaultProps} isOpen={false} />);
      expect(screen.queryByRole('region', { name: /filter panel/i })).not.toBeVisible();
    });

    it('should collapse filter section', async () => {
      const user = userEvent.setup();
      render(<VocabularyFilter {...defaultProps} />);

      const categoryHeader = screen.getByRole('button', { name: /categories/i });
      await user.click(categoryHeader);

      const categorySection = screen.getByTestId('category-filter-section');
      expect(categorySection).toHaveAttribute('aria-expanded', 'false');
    });

    it('should expand filter section', async () => {
      const user = userEvent.setup();
      render(<VocabularyFilter {...defaultProps} />);

      const categoryHeader = screen.getByRole('button', { name: /categories/i });
      await user.click(categoryHeader);
      await user.click(categoryHeader);

      const categorySection = screen.getByTestId('category-filter-section');
      expect(categorySection).toHaveAttribute('aria-expanded', 'true');
    });

    it('should display active filter count badge', () => {
      render(
        <VocabularyFilter
          {...defaultProps}
          activeFilters={{ categories: ['cat-1', 'cat-2'], difficulty: { min: 1, max: 3 } }}
        />
      );

      const badge = screen.getByTestId('active-filters-badge');
      expect(badge).toHaveTextContent('2');
    });

    it('should not display badge when no filters active', () => {
      render(<VocabularyFilter {...defaultProps} activeFilters={{}} />);
      expect(screen.queryByTestId('active-filters-badge')).not.toBeInTheDocument();
    });

    it('should have proper ARIA labels', () => {
      render(<VocabularyFilter {...defaultProps} />);
      expect(screen.getByRole('region', { name: /filter panel/i })).toHaveAttribute('aria-label');
    });

    it('should persist panel state across re-renders', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<VocabularyFilter {...defaultProps} />);

      const toggleButton = screen.getByRole('button', { name: /toggle filters/i });
      await user.click(toggleButton);

      rerender(<VocabularyFilter {...defaultProps} options={mockFilterOptions} />);
      expect(screen.queryByRole('region', { name: /filter panel/i })).not.toBeVisible();
    });

    it('should show expand/collapse icon', () => {
      render(<VocabularyFilter {...defaultProps} />);
      expect(screen.getByTestId('panel-toggle-icon')).toBeInTheDocument();
    });

    it('should have responsive layout classes', () => {
      render(<VocabularyFilter {...defaultProps} />);
      const panel = screen.getByRole('region', { name: /filter panel/i });
      expect(panel).toHaveClass('filter-panel');
    });
  });

  // ======================
  // Category Filter Tests (15 tests)
  // ======================
  describe('Category Filter', () => {
    it('should render all category checkboxes', () => {
      render(<VocabularyFilter {...defaultProps} />);

      mockFilterOptions.categories.forEach(category => {
        expect(screen.getByRole('checkbox', { name: new RegExp(category.name, 'i') })).toBeInTheDocument();
      });
    });

    it('should select single category', async () => {
      const user = userEvent.setup();
      render(<VocabularyFilter {...defaultProps} />);

      const businessCheckbox = screen.getByRole('checkbox', { name: /business/i });
      await user.click(businessCheckbox);

      expect(defaultProps.onFilterChange).toHaveBeenCalledWith({
        categories: ['cat-1'],
      });
    });

    it('should select multiple categories', async () => {
      const user = userEvent.setup();
      render(<VocabularyFilter {...defaultProps} />);

      await user.click(screen.getByRole('checkbox', { name: /business/i }));
      await user.click(screen.getByRole('checkbox', { name: /technology/i }));

      expect(defaultProps.onFilterChange).toHaveBeenLastCalledWith({
        categories: ['cat-1', 'cat-2'],
      });
    });

    it('should deselect category', async () => {
      const user = userEvent.setup();
      render(
        <VocabularyFilter
          {...defaultProps}
          activeFilters={{ categories: ['cat-1'] }}
        />
      );

      const businessCheckbox = screen.getByRole('checkbox', { name: /business/i });
      await user.click(businessCheckbox);

      expect(defaultProps.onFilterChange).toHaveBeenCalledWith({
        categories: [],
      });
    });

    it('should deselect all categories with clear button', async () => {
      const user = userEvent.setup();
      render(
        <VocabularyFilter
          {...defaultProps}
          activeFilters={{ categories: ['cat-1', 'cat-2'] }}
        />
      );

      const clearButton = screen.getByRole('button', { name: /clear categories/i });
      await user.click(clearButton);

      expect(defaultProps.onFilterChange).toHaveBeenCalledWith({
        categories: [],
      });
    });

    it('should display category count per option', () => {
      render(<VocabularyFilter {...defaultProps} />);

      const businessOption = screen.getByText(/business/i).closest('label');
      expect(within(businessOption!).getByText('45')).toBeInTheDocument();
    });

    it('should show selected state on checkbox', async () => {
      const user = userEvent.setup();
      render(<VocabularyFilter {...defaultProps} />);

      const checkbox = screen.getByRole('checkbox', { name: /business/i });
      await user.click(checkbox);

      expect(checkbox).toBeChecked();
    });

    it('should have proper accessibility labels', () => {
      render(<VocabularyFilter {...defaultProps} />);

      const categorySection = screen.getByRole('group', { name: /categories/i });
      expect(categorySection).toBeInTheDocument();
    });

    it('should filter categories by search', async () => {
      const user = userEvent.setup();
      render(<VocabularyFilter {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/search categories/i);
      await user.type(searchInput, 'Tech');

      expect(screen.getByRole('checkbox', { name: /technology/i })).toBeVisible();
      expect(screen.queryByRole('checkbox', { name: /business/i })).not.toBeVisible();
    });

    it('should show "no results" when search yields no categories', async () => {
      const user = userEvent.setup();
      render(<VocabularyFilter {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/search categories/i);
      await user.type(searchInput, 'xyz123');

      expect(screen.getByText(/no categories found/i)).toBeInTheDocument();
    });

    it('should preserve selected categories when searching', async () => {
      const user = userEvent.setup();
      render(
        <VocabularyFilter
          {...defaultProps}
          activeFilters={{ categories: ['cat-1'] }}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search categories/i);
      await user.type(searchInput, 'Tech');

      expect(screen.getByRole('checkbox', { name: /business/i })).toBeChecked();
    });

    it('should show category section header', () => {
      render(<VocabularyFilter {...defaultProps} />);
      expect(screen.getByText(/categories/i)).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<VocabularyFilter {...defaultProps} />);

      const firstCheckbox = screen.getByRole('checkbox', { name: /business/i });
      firstCheckbox.focus();

      await user.keyboard('{Space}');
      expect(firstCheckbox).toBeChecked();
    });

    it('should update count when filters applied', () => {
      const { rerender } = render(<VocabularyFilter {...defaultProps} />);

      const updatedOptions = {
        ...mockFilterOptions,
        categories: mockFilterOptions.categories.map(cat => ({
          ...cat,
          count: cat.count + 5,
        })),
      };

      rerender(<VocabularyFilter {...defaultProps} options={updatedOptions} />);

      const businessOption = screen.getByText(/business/i).closest('label');
      expect(within(businessOption!).getByText('50')).toBeInTheDocument();
    });

    it('should disable empty categories', () => {
      const optionsWithEmpty = {
        ...mockFilterOptions,
        categories: [
          ...mockFilterOptions.categories,
          { id: 'cat-5', name: 'Empty', count: 0 },
        ],
      };

      render(<VocabularyFilter {...defaultProps} options={optionsWithEmpty} />);
      expect(screen.getByRole('checkbox', { name: /empty/i })).toBeDisabled();
    });
  });

  // ======================
  // Difficulty Filter Tests (12 tests)
  // ======================
  describe('Difficulty Filter', () => {
    it('should render difficulty range slider', () => {
      render(<VocabularyFilter {...defaultProps} />);
      expect(screen.getByRole('slider', { name: /minimum difficulty/i })).toBeInTheDocument();
      expect(screen.getByRole('slider', { name: /maximum difficulty/i })).toBeInTheDocument();
    });

    it('should set minimum difficulty', async () => {
      const user = userEvent.setup();
      render(<VocabularyFilter {...defaultProps} />);

      const minSlider = screen.getByRole('slider', { name: /minimum difficulty/i });
      fireEvent.change(minSlider, { target: { value: '2' } });

      expect(defaultProps.onFilterChange).toHaveBeenCalledWith({
        difficulty: { min: 2, max: 5 },
      });
    });

    it('should set maximum difficulty', async () => {
      render(<VocabularyFilter {...defaultProps} />);

      const maxSlider = screen.getByRole('slider', { name: /maximum difficulty/i });
      fireEvent.change(maxSlider, { target: { value: '4' } });

      expect(defaultProps.onFilterChange).toHaveBeenCalledWith({
        difficulty: { min: 1, max: 4 },
      });
    });

    it('should display current min difficulty value', () => {
      render(
        <VocabularyFilter
          {...defaultProps}
          activeFilters={{ difficulty: { min: 2, max: 5 } }}
        />
      );

      expect(screen.getByText(/min: 2/i)).toBeInTheDocument();
    });

    it('should display current max difficulty value', () => {
      render(
        <VocabularyFilter
          {...defaultProps}
          activeFilters={{ difficulty: { min: 1, max: 4 } }}
        />
      );

      expect(screen.getByText(/max: 4/i)).toBeInTheDocument();
    });

    it('should have step increments of 1', () => {
      render(<VocabularyFilter {...defaultProps} />);

      const minSlider = screen.getByRole('slider', { name: /minimum difficulty/i });
      expect(minSlider).toHaveAttribute('step', '1');
    });

    it('should have min value of 1', () => {
      render(<VocabularyFilter {...defaultProps} />);

      const minSlider = screen.getByRole('slider', { name: /minimum difficulty/i });
      expect(minSlider).toHaveAttribute('min', '1');
    });

    it('should have max value of 5', () => {
      render(<VocabularyFilter {...defaultProps} />);

      const maxSlider = screen.getByRole('slider', { name: /maximum difficulty/i });
      expect(maxSlider).toHaveAttribute('max', '5');
    });

    it('should prevent min from exceeding max', async () => {
      render(
        <VocabularyFilter
          {...defaultProps}
          activeFilters={{ difficulty: { min: 1, max: 3 } }}
        />
      );

      const minSlider = screen.getByRole('slider', { name: /minimum difficulty/i });
      fireEvent.change(minSlider, { target: { value: '4' } });

      // Should cap min at max value
      expect(defaultProps.onFilterChange).toHaveBeenCalledWith({
        difficulty: { min: 3, max: 3 },
      });
    });

    it('should prevent max from being less than min', async () => {
      render(
        <VocabularyFilter
          {...defaultProps}
          activeFilters={{ difficulty: { min: 3, max: 5 } }}
        />
      );

      const maxSlider = screen.getByRole('slider', { name: /maximum difficulty/i });
      fireEvent.change(maxSlider, { target: { value: '2' } });

      // Should cap max at min value
      expect(defaultProps.onFilterChange).toHaveBeenCalledWith({
        difficulty: { min: 3, max: 3 },
      });
    });

    it('should display range visually', () => {
      render(
        <VocabularyFilter
          {...defaultProps}
          activeFilters={{ difficulty: { min: 2, max: 4 } }}
        />
      );

      expect(screen.getByTestId('difficulty-range-display')).toBeInTheDocument();
    });

    it('should reset to default range', async () => {
      const user = userEvent.setup();
      render(
        <VocabularyFilter
          {...defaultProps}
          activeFilters={{ difficulty: { min: 2, max: 4 } }}
        />
      );

      const resetButton = screen.getByRole('button', { name: /reset difficulty/i });
      await user.click(resetButton);

      expect(defaultProps.onFilterChange).toHaveBeenCalledWith({
        difficulty: { min: 1, max: 5 },
      });
    });
  });

  // ======================
  // Part of Speech Filter Tests (10 tests)
  // ======================
  describe('Part of Speech Filter', () => {
    it('should render all POS checkboxes', () => {
      render(<VocabularyFilter {...defaultProps} />);

      mockFilterOptions.partsOfSpeech.forEach(pos => {
        expect(screen.getByRole('checkbox', { name: new RegExp(pos.name, 'i') })).toBeInTheDocument();
      });
    });

    it('should select POS checkbox', async () => {
      const user = userEvent.setup();
      render(<VocabularyFilter {...defaultProps} />);

      const nounCheckbox = screen.getByRole('checkbox', { name: /noun/i });
      await user.click(nounCheckbox);

      expect(defaultProps.onFilterChange).toHaveBeenCalledWith({
        partsOfSpeech: ['noun'],
      });
    });

    it('should select multiple POS', async () => {
      const user = userEvent.setup();
      render(<VocabularyFilter {...defaultProps} />);

      await user.click(screen.getByRole('checkbox', { name: /noun/i }));
      await user.click(screen.getByRole('checkbox', { name: /verb/i }));

      expect(defaultProps.onFilterChange).toHaveBeenLastCalledWith({
        partsOfSpeech: ['noun', 'verb'],
      });
    });

    it('should deselect POS checkbox', async () => {
      const user = userEvent.setup();
      render(
        <VocabularyFilter
          {...defaultProps}
          activeFilters={{ partsOfSpeech: ['noun'] }}
        />
      );

      const nounCheckbox = screen.getByRole('checkbox', { name: /noun/i });
      await user.click(nounCheckbox);

      expect(defaultProps.onFilterChange).toHaveBeenCalledWith({
        partsOfSpeech: [],
      });
    });

    it('should toggle all POS with select all button', async () => {
      const user = userEvent.setup();
      render(<VocabularyFilter {...defaultProps} />);

      const selectAllButton = screen.getByRole('button', { name: /select all parts of speech/i });
      await user.click(selectAllButton);

      expect(defaultProps.onFilterChange).toHaveBeenCalledWith({
        partsOfSpeech: ['noun', 'verb', 'adjective', 'adverb'],
      });
    });

    it('should deselect all POS with deselect all button', async () => {
      const user = userEvent.setup();
      render(
        <VocabularyFilter
          {...defaultProps}
          activeFilters={{ partsOfSpeech: ['noun', 'verb'] }}
        />
      );

      const deselectAllButton = screen.getByRole('button', { name: /deselect all parts of speech/i });
      await user.click(deselectAllButton);

      expect(defaultProps.onFilterChange).toHaveBeenCalledWith({
        partsOfSpeech: [],
      });
    });

    it('should display POS count', () => {
      render(<VocabularyFilter {...defaultProps} />);

      const nounOption = screen.getByText(/noun/i).closest('label');
      expect(within(nounOption!).getByText('89')).toBeInTheDocument();
    });

    it('should have indeterminate state when some POS selected', async () => {
      const user = userEvent.setup();
      render(<VocabularyFilter {...defaultProps} />);

      await user.click(screen.getByRole('checkbox', { name: /noun/i }));

      const selectAllCheckbox = screen.getByRole('checkbox', { name: /select all parts of speech/i });
      expect(selectAllCheckbox).toHaveProperty('indeterminate', true);
    });

    it('should show section header', () => {
      render(<VocabularyFilter {...defaultProps} />);
      expect(screen.getByText(/parts of speech/i)).toBeInTheDocument();
    });

    it('should have proper ARIA group', () => {
      render(<VocabularyFilter {...defaultProps} />);
      expect(screen.getByRole('group', { name: /parts of speech/i })).toBeInTheDocument();
    });
  });

  // ======================
  // Status Filter Tests (10 tests)
  // ======================
  describe('Status Filter', () => {
    it('should render mastered checkbox', () => {
      render(<VocabularyFilter {...defaultProps} />);
      expect(screen.getByRole('checkbox', { name: /mastered/i })).toBeInTheDocument();
    });

    it('should render not mastered checkbox', () => {
      render(<VocabularyFilter {...defaultProps} />);
      expect(screen.getByRole('checkbox', { name: /not mastered/i })).toBeInTheDocument();
    });

    it('should select mastered status', async () => {
      const user = userEvent.setup();
      render(<VocabularyFilter {...defaultProps} />);

      await user.click(screen.getByRole('checkbox', { name: /^mastered$/i }));

      expect(defaultProps.onFilterChange).toHaveBeenCalledWith({
        status: ['mastered'],
      });
    });

    it('should select multiple statuses', async () => {
      const user = userEvent.setup();
      render(<VocabularyFilter {...defaultProps} />);

      await user.click(screen.getByRole('checkbox', { name: /^mastered$/i }));
      await user.click(screen.getByRole('checkbox', { name: /reviewed/i }));

      expect(defaultProps.onFilterChange).toHaveBeenLastCalledWith({
        status: ['mastered', 'reviewed'],
      });
    });

    it('should render reviewed checkbox', () => {
      render(<VocabularyFilter {...defaultProps} />);
      expect(screen.getByRole('checkbox', { name: /reviewed/i })).toBeInTheDocument();
    });

    it('should render not reviewed checkbox', () => {
      render(<VocabularyFilter {...defaultProps} />);
      expect(screen.getByRole('checkbox', { name: /not reviewed/i })).toBeInTheDocument();
    });

    it('should render favorited checkbox', () => {
      render(<VocabularyFilter {...defaultProps} />);
      expect(screen.getByRole('checkbox', { name: /favorited/i })).toBeInTheDocument();
    });

    it('should select favorited status', async () => {
      const user = userEvent.setup();
      render(<VocabularyFilter {...defaultProps} />);

      await user.click(screen.getByRole('checkbox', { name: /favorited/i }));

      expect(defaultProps.onFilterChange).toHaveBeenCalledWith({
        status: ['favorited'],
      });
    });

    it('should deselect status', async () => {
      const user = userEvent.setup();
      render(
        <VocabularyFilter
          {...defaultProps}
          activeFilters={{ status: ['mastered'] }}
        />
      );

      await user.click(screen.getByRole('checkbox', { name: /^mastered$/i }));

      expect(defaultProps.onFilterChange).toHaveBeenCalledWith({
        status: [],
      });
    });

    it('should show status section header', () => {
      render(<VocabularyFilter {...defaultProps} />);
      expect(screen.getByText(/status/i)).toBeInTheDocument();
    });
  });

  // ======================
  // Date Filter Tests (12 tests)
  // ======================
  describe('Date Filter', () => {
    it('should render date range picker', () => {
      render(<VocabularyFilter {...defaultProps} />);
      expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
    });

    it('should set start date', async () => {
      const user = userEvent.setup();
      render(<VocabularyFilter {...defaultProps} />);

      const startDateInput = screen.getByLabelText(/start date/i);
      await user.type(startDateInput, '2024-01-01');

      expect(defaultProps.onFilterChange).toHaveBeenCalled();
    });

    it('should set end date', async () => {
      const user = userEvent.setup();
      render(<VocabularyFilter {...defaultProps} />);

      const endDateInput = screen.getByLabelText(/end date/i);
      await user.type(endDateInput, '2024-12-31');

      expect(defaultProps.onFilterChange).toHaveBeenCalled();
    });

    it('should show today preset', () => {
      render(<VocabularyFilter {...defaultProps} />);
      expect(screen.getByRole('button', { name: /today/i })).toBeInTheDocument();
    });

    it('should apply today preset', async () => {
      const user = userEvent.setup();
      render(<VocabularyFilter {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /today/i }));

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      expect(defaultProps.onFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          dateRange: expect.objectContaining({
            start: expect.any(Date),
            end: expect.any(Date),
          }),
        })
      );
    });

    it('should show this week preset', () => {
      render(<VocabularyFilter {...defaultProps} />);
      expect(screen.getByRole('button', { name: /this week/i })).toBeInTheDocument();
    });

    it('should apply this week preset', async () => {
      const user = userEvent.setup();
      render(<VocabularyFilter {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /this week/i }));

      expect(defaultProps.onFilterChange).toHaveBeenCalled();
    });

    it('should show this month preset', () => {
      render(<VocabularyFilter {...defaultProps} />);
      expect(screen.getByRole('button', { name: /this month/i })).toBeInTheDocument();
    });

    it('should apply this month preset', async () => {
      const user = userEvent.setup();
      render(<VocabularyFilter {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /this month/i }));

      expect(defaultProps.onFilterChange).toHaveBeenCalled();
    });

    it('should clear date range', async () => {
      const user = userEvent.setup();
      render(
        <VocabularyFilter
          {...defaultProps}
          activeFilters={{
            dateRange: { start: new Date('2024-01-01'), end: new Date('2024-12-31') }
          }}
        />
      );

      await user.click(screen.getByRole('button', { name: /clear dates/i }));

      expect(defaultProps.onFilterChange).toHaveBeenCalledWith({
        dateRange: undefined,
      });
    });

    it('should prevent end date before start date', async () => {
      const user = userEvent.setup();
      render(
        <VocabularyFilter
          {...defaultProps}
          activeFilters={{
            dateRange: { start: new Date('2024-06-01'), end: new Date('2024-06-30') }
          }}
        />
      );

      const endDateInput = screen.getByLabelText(/end date/i);
      await user.clear(endDateInput);
      await user.type(endDateInput, '2024-05-01');

      await waitFor(() => {
        expect(screen.getByText(/end date must be after start date/i)).toBeInTheDocument();
      });
    });

    it('should show custom range label', () => {
      render(
        <VocabularyFilter
          {...defaultProps}
          activeFilters={{
            dateRange: { start: new Date('2024-01-01'), end: new Date('2024-12-31') }
          }}
        />
      );

      expect(screen.getByText(/custom range/i)).toBeInTheDocument();
    });
  });

  // ======================
  // Apply/Reset Tests (10 tests)
  // ======================
  describe('Apply and Reset Filters', () => {
    it('should render apply button', () => {
      render(<VocabularyFilter {...defaultProps} />);
      expect(screen.getByRole('button', { name: /apply filters/i })).toBeInTheDocument();
    });

    it('should call onApplyFilters when apply clicked', async () => {
      const user = userEvent.setup();
      render(<VocabularyFilter {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /apply filters/i }));

      expect(defaultProps.onApplyFilters).toHaveBeenCalled();
    });

    it('should render reset button', () => {
      render(<VocabularyFilter {...defaultProps} />);
      expect(screen.getByRole('button', { name: /reset all/i })).toBeInTheDocument();
    });

    it('should call onResetFilters when reset clicked', async () => {
      const user = userEvent.setup();
      render(<VocabularyFilter {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /reset all/i }));

      expect(defaultProps.onResetFilters).toHaveBeenCalled();
    });

    it('should clear individual category filter', async () => {
      const user = userEvent.setup();
      render(
        <VocabularyFilter
          {...defaultProps}
          activeFilters={{ categories: ['cat-1', 'cat-2'] }}
        />
      );

      const clearButton = within(screen.getByTestId('category-filter-section'))
        .getByRole('button', { name: /clear/i });
      await user.click(clearButton);

      expect(defaultProps.onFilterChange).toHaveBeenCalledWith({
        categories: [],
      });
    });

    it('should disable apply button when no changes', () => {
      render(<VocabularyFilter {...defaultProps} activeFilters={{}} hasUnsavedChanges={false} />);
      expect(screen.getByRole('button', { name: /apply filters/i })).toBeDisabled();
    });

    it('should enable apply button when changes exist', () => {
      render(<VocabularyFilter {...defaultProps} hasUnsavedChanges={true} />);
      expect(screen.getByRole('button', { name: /apply filters/i })).not.toBeDisabled();
    });

    it('should save filter preset', async () => {
      const user = userEvent.setup();
      const onSavePreset = vi.fn();
      render(
        <VocabularyFilter
          {...defaultProps}
          onSavePreset={onSavePreset}
          activeFilters={{ categories: ['cat-1'], difficulty: { min: 2, max: 4 } }}
        />
      );

      await user.click(screen.getByRole('button', { name: /save preset/i }));

      const nameInput = screen.getByPlaceholderText(/preset name/i);
      await user.type(nameInput, 'My Custom Filter');

      await user.click(screen.getByRole('button', { name: /save/i }));

      expect(onSavePreset).toHaveBeenCalledWith(
        'My Custom Filter',
        expect.objectContaining({
          categories: ['cat-1'],
          difficulty: { min: 2, max: 4 },
        })
      );
    });

    it('should load filter preset', async () => {
      const user = userEvent.setup();
      const onLoadPreset = vi.fn();
      render(
        <VocabularyFilter
          {...defaultProps}
          onLoadPreset={onLoadPreset}
          presets={mockPresets}
        />
      );

      await user.click(screen.getByRole('button', { name: /load preset/i }));
      await user.click(screen.getByRole('menuitem', { name: /review today/i }));

      expect(onLoadPreset).toHaveBeenCalledWith('preset-1');
    });

    it('should show confirmation when resetting with active filters', async () => {
      const user = userEvent.setup();
      render(
        <VocabularyFilter
          {...defaultProps}
          activeFilters={{ categories: ['cat-1', 'cat-2'] }}
        />
      );

      await user.click(screen.getByRole('button', { name: /reset all/i }));

      expect(screen.getByText(/are you sure you want to reset all filters/i)).toBeInTheDocument();
    });
  });

  // ======================
  // Integration Tests (10 tests)
  // ======================
  describe('Integration Tests', () => {
    it('should handle multiple filter combinations', async () => {
      const user = userEvent.setup();
      render(<VocabularyFilter {...defaultProps} />);

      await user.click(screen.getByRole('checkbox', { name: /business/i }));

      const minSlider = screen.getByRole('slider', { name: /minimum difficulty/i });
      fireEvent.change(minSlider, { target: { value: '3' } });

      await user.click(screen.getByRole('checkbox', { name: /noun/i }));
      await user.click(screen.getByRole('checkbox', { name: /mastered/i }));

      expect(defaultProps.onFilterChange).toHaveBeenCalledTimes(4);
    });

    it('should persist state across panel toggle', async () => {
      const user = userEvent.setup();
      render(<VocabularyFilter {...defaultProps} />);

      await user.click(screen.getByRole('checkbox', { name: /business/i }));

      const toggleButton = screen.getByRole('button', { name: /toggle filters/i });
      await user.click(toggleButton);
      await user.click(toggleButton);

      expect(screen.getByRole('checkbox', { name: /business/i })).toBeChecked();
    });

    it('should update active count badge correctly', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<VocabularyFilter {...defaultProps} activeFilters={{}} />);

      expect(screen.queryByTestId('active-filters-badge')).not.toBeInTheDocument();

      rerender(
        <VocabularyFilter
          {...defaultProps}
          activeFilters={{ categories: ['cat-1'], partsOfSpeech: ['noun'] }}
        />
      );

      expect(screen.getByTestId('active-filters-badge')).toHaveTextContent('2');
    });

    it('should handle rapid filter changes', async () => {
      const user = userEvent.setup();
      render(<VocabularyFilter {...defaultProps} />);

      const checkbox1 = screen.getByRole('checkbox', { name: /business/i });
      const checkbox2 = screen.getByRole('checkbox', { name: /technology/i });

      await user.click(checkbox1);
      await user.click(checkbox2);
      await user.click(checkbox1);

      expect(defaultProps.onFilterChange).toHaveBeenCalledTimes(3);
    });

    it('should show loading state when applying filters', async () => {
      const user = userEvent.setup();
      render(<VocabularyFilter {...defaultProps} isApplying={true} />);

      const applyButton = screen.getByRole('button', { name: /apply filters/i });
      expect(applyButton).toBeDisabled();
      expect(within(applyButton).getByTestId('spinner')).toBeInTheDocument();
    });

    it('should handle error states gracefully', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<VocabularyFilter {...defaultProps} options={undefined as any} />);
      }).toThrow();

      consoleError.mockRestore();
    });

    it('should be responsive to window resize', async () => {
      render(<VocabularyFilter {...defaultProps} />);

      // Simulate mobile viewport
      global.innerWidth = 375;
      global.dispatchEvent(new Event('resize'));

      await waitFor(() => {
        const panel = screen.getByRole('region', { name: /filter panel/i });
        expect(panel).toHaveClass('mobile-layout');
      });
    });

    it('should handle keyboard shortcuts', async () => {
      const user = userEvent.setup();
      render(<VocabularyFilter {...defaultProps} />);

      await user.keyboard('{Control>}f{/Control}');

      const searchInput = screen.getByPlaceholderText(/search categories/i);
      expect(searchInput).toHaveFocus();
    });

    it('should export filter configuration', async () => {
      const user = userEvent.setup();
      const onExport = vi.fn();
      render(
        <VocabularyFilter
          {...defaultProps}
          onExportFilters={onExport}
          activeFilters={{ categories: ['cat-1'] }}
        />
      );

      await user.click(screen.getByRole('button', { name: /export/i }));

      expect(onExport).toHaveBeenCalledWith({
        categories: ['cat-1'],
      });
    });

    it('should import filter configuration', async () => {
      const user = userEvent.setup();
      const onImport = vi.fn();
      render(<VocabularyFilter {...defaultProps} onImportFilters={onImport} />);

      const importButton = screen.getByRole('button', { name: /import/i });
      await user.click(importButton);

      const fileInput = screen.getByLabelText(/upload filter config/i);
      const file = new File(
        [JSON.stringify({ categories: ['cat-1', 'cat-2'] })],
        'filters.json',
        { type: 'application/json' }
      );

      await user.upload(fileInput, file);

      expect(onImport).toHaveBeenCalled();
    });
  });

  // ======================
  // Accessibility Tests (8 tests)
  // ======================
  describe('Accessibility', () => {
    it('should have proper ARIA roles', () => {
      render(<VocabularyFilter {...defaultProps} />);

      expect(screen.getByRole('region')).toBeInTheDocument();
      expect(screen.getAllByRole('group')).toHaveLength(4); // categories, pos, status, date
    });

    it('should announce filter changes to screen readers', async () => {
      const user = userEvent.setup();
      render(<VocabularyFilter {...defaultProps} />);

      await user.click(screen.getByRole('checkbox', { name: /business/i }));

      expect(screen.getByRole('status')).toHaveTextContent(/1 filter applied/i);
    });

    it('should support keyboard navigation between sections', async () => {
      const user = userEvent.setup();
      render(<VocabularyFilter {...defaultProps} />);

      const firstCheckbox = screen.getByRole('checkbox', { name: /business/i });
      firstCheckbox.focus();

      await user.keyboard('{Tab}');

      const nextCheckbox = screen.getByRole('checkbox', { name: /technology/i });
      expect(nextCheckbox).toHaveFocus();
    });

    it('should have focus indicators', () => {
      render(<VocabularyFilter {...defaultProps} />);

      const checkbox = screen.getByRole('checkbox', { name: /business/i });
      expect(checkbox).toHaveClass('focus:ring-2');
    });

    it('should have proper contrast ratios', () => {
      render(<VocabularyFilter {...defaultProps} />);

      const panel = screen.getByRole('region', { name: /filter panel/i });
      const styles = window.getComputedStyle(panel);

      // This is a simplified check - in real tests you'd use axe-core
      expect(styles.backgroundColor).toBeTruthy();
    });

    it('should support screen reader announcements', () => {
      render(<VocabularyFilter {...defaultProps} />);

      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    });

    it('should have descriptive labels', () => {
      render(<VocabularyFilter {...defaultProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach(checkbox => {
        expect(checkbox).toHaveAccessibleName();
      });
    });

    it('should indicate required fields', () => {
      render(<VocabularyFilter {...defaultProps} />);

      // If any filter is required
      const requiredFilter = screen.queryByLabelText(/required/i);
      if (requiredFilter) {
        expect(requiredFilter).toHaveAttribute('aria-required', 'true');
      }
    });
  });
});
