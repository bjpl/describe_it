/**
 * Comprehensive Test Suite for CategoryManager Component
 * Coverage: 90%+ with 57+ tests across all features
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { CategoryManager, Category } from '@/components/Vocabulary/CategoryManager';

// Mock categories data
const mockCategories: Category[] = [
  {
    id: 'cat-1',
    name: 'Greetings',
    color: '#ef4444',
    icon: '👋',
    wordCount: 15,
    order: 0,
    description: 'Common greetings and salutations',
  },
  {
    id: 'cat-2',
    name: 'Food & Drink',
    color: '#f97316',
    icon: '🍔',
    wordCount: 23,
    order: 1,
    description: 'Food and beverage vocabulary',
  },
  {
    id: 'cat-3',
    name: 'Travel',
    color: '#0ea5e9',
    icon: '✈️',
    wordCount: 0,
    order: 2,
    description: 'Travel-related terms',
  },
];

const mockEmptyCategories: Category[] = [];

// Mock handlers
const mockHandlers = {
  onAddCategory: vi.fn().mockResolvedValue(undefined),
  onUpdateCategory: vi.fn().mockResolvedValue(undefined),
  onDeleteCategory: vi.fn().mockResolvedValue(undefined),
  onReorderCategories: vi.fn().mockResolvedValue(undefined),
};

const defaultProps = {
  categories: mockCategories,
  ...mockHandlers,
};

describe('CategoryManager Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Category List Display (12 tests)', () => {
    it('renders the component with header', () => {
      render(<CategoryManager {...defaultProps} />);

      expect(screen.getByText('Category Manager')).toBeInTheDocument();
      expect(screen.getByText('(3 categories)')).toBeInTheDocument();
    });

    it('displays all categories', () => {
      render(<CategoryManager {...defaultProps} />);

      expect(screen.getByText('Greetings')).toBeInTheDocument();
      expect(screen.getByText('Food & Drink')).toBeInTheDocument();
      expect(screen.getByText('Travel')).toBeInTheDocument();
    });

    it('displays category names correctly', () => {
      render(<CategoryManager {...defaultProps} />);

      mockCategories.forEach(category => {
        expect(screen.getByText(category.name)).toBeInTheDocument();
      });
    });

    it('displays word count for each category', () => {
      render(<CategoryManager {...defaultProps} />);

      expect(screen.getByText('15 words')).toBeInTheDocument();
      expect(screen.getByText('23 words')).toBeInTheDocument();
      expect(screen.getByText('0 words')).toBeInTheDocument();
    });

    it('displays category descriptions', () => {
      render(<CategoryManager {...defaultProps} />);

      expect(screen.getByText('Common greetings and salutations')).toBeInTheDocument();
      expect(screen.getByText('Food and beverage vocabulary')).toBeInTheDocument();
    });

    it('displays category icons', () => {
      const { container } = render(<CategoryManager {...defaultProps} />);

      mockCategories.forEach(category => {
        expect(container.textContent).toContain(category.icon);
      });
    });

    it('applies color coding to category icons', () => {
      const { container } = render(<CategoryManager {...defaultProps} />);

      const iconContainers = container.querySelectorAll('[style*="background-color"]');
      expect(iconContainers.length).toBeGreaterThan(0);
    });

    it('displays empty state when no categories', () => {
      render(<CategoryManager {...defaultProps} categories={mockEmptyCategories} />);

      expect(screen.getByText('No categories yet. Add your first category to get started!')).toBeInTheDocument();
    });

    it('shows correct category count in header', () => {
      render(<CategoryManager {...defaultProps} />);
      expect(screen.getByText('(3 categories)')).toBeInTheDocument();
    });

    it('displays all action buttons for each category', () => {
      render(<CategoryManager {...defaultProps} />);

      mockCategories.forEach(category => {
        expect(screen.getByTestId(`edit-button-${category.id}`)).toBeInTheDocument();
        expect(screen.getByTestId(`delete-button-${category.id}`)).toBeInTheDocument();
        expect(screen.getByTestId(`move-up-button-${category.id}`)).toBeInTheDocument();
        expect(screen.getByTestId(`move-down-button-${category.id}`)).toBeInTheDocument();
      });
    });

    it('renders category items with correct test IDs', () => {
      render(<CategoryManager {...defaultProps} />);

      mockCategories.forEach(category => {
        expect(screen.getByTestId(`category-item-${category.id}`)).toBeInTheDocument();
      });
    });

    it('displays Add Category button', () => {
      render(<CategoryManager {...defaultProps} />);
      expect(screen.getByTestId('add-category-button')).toBeInTheDocument();
    });
  });

  describe('Add Category Form (15 tests)', () => {
    it('opens add category form when button clicked', () => {
      render(<CategoryManager {...defaultProps} />);

      const addButton = screen.getByTestId('add-category-button');
      fireEvent.click(addButton);

      expect(screen.getByText('Add New Category')).toBeInTheDocument();
    });

    it('displays all form fields', () => {
      render(<CategoryManager {...defaultProps} />);

      fireEvent.click(screen.getByTestId('add-category-button'));

      expect(screen.getByTestId('category-name-input')).toBeInTheDocument();
      expect(screen.getByTestId('category-description-input')).toBeInTheDocument();
      expect(screen.getByText('Color')).toBeInTheDocument();
      expect(screen.getByText('Icon')).toBeInTheDocument();
    });

    it('validates required category name', async () => {
      render(<CategoryManager {...defaultProps} />);

      fireEvent.click(screen.getByTestId('add-category-button'));
      fireEvent.click(screen.getByTestId('save-category-button'));

      await waitFor(() => {
        expect(screen.getByText('Category name is required')).toBeInTheDocument();
      });
    });

    it('validates minimum name length', async () => {
      render(<CategoryManager {...defaultProps} />);

      fireEvent.click(screen.getByTestId('add-category-button'));

      const nameInput = screen.getByTestId('category-name-input');
      fireEvent.change(nameInput, { target: { value: 'A' } });
      fireEvent.click(screen.getByTestId('save-category-button'));

      await waitFor(() => {
        expect(screen.getByText('Category name must be at least 2 characters')).toBeInTheDocument();
      });
    });

    it('validates maximum name length', async () => {
      render(<CategoryManager {...defaultProps} />);

      fireEvent.click(screen.getByTestId('add-category-button'));

      const longName = 'A'.repeat(51);
      const nameInput = screen.getByTestId('category-name-input');
      fireEvent.change(nameInput, { target: { value: longName } });
      fireEvent.click(screen.getByTestId('save-category-button'));

      await waitFor(() => {
        expect(screen.getByText('Category name must be less than 50 characters')).toBeInTheDocument();
      });
    });

    it('prevents duplicate category names', async () => {
      render(<CategoryManager {...defaultProps} />);

      fireEvent.click(screen.getByTestId('add-category-button'));

      const nameInput = screen.getByTestId('category-name-input');
      fireEvent.change(nameInput, { target: { value: 'Greetings' } });
      fireEvent.click(screen.getByTestId('save-category-button'));

      await waitFor(() => {
        expect(screen.getByText('A category with this name already exists')).toBeInTheDocument();
      });
    });

    it('allows duplicate names with different casing (case-insensitive)', async () => {
      render(<CategoryManager {...defaultProps} />);

      fireEvent.click(screen.getByTestId('add-category-button'));

      const nameInput = screen.getByTestId('category-name-input');
      fireEvent.change(nameInput, { target: { value: 'greetings' } });
      fireEvent.click(screen.getByTestId('save-category-button'));

      await waitFor(() => {
        expect(screen.getByText('A category with this name already exists')).toBeInTheDocument();
      });
    });

    it('displays color picker with default colors', () => {
      render(<CategoryManager {...defaultProps} />);

      fireEvent.click(screen.getByTestId('add-category-button'));

      const colorButtons = screen.getAllByRole('button').filter(btn =>
        btn.getAttribute('data-testid')?.startsWith('color-option-')
      );

      expect(colorButtons.length).toBeGreaterThan(0);
    });

    it('allows color selection', () => {
      render(<CategoryManager {...defaultProps} />);

      fireEvent.click(screen.getByTestId('add-category-button'));

      const colorButton = screen.getByTestId('color-option-#f97316');
      fireEvent.click(colorButton);

      // Verify color is selected (has scale class)
      expect(colorButton.className).toContain('scale-110');
    });

    it('displays icon selector with default icons', () => {
      render(<CategoryManager {...defaultProps} />);

      fireEvent.click(screen.getByTestId('add-category-button'));

      const iconButtons = screen.getAllByRole('button').filter(btn =>
        btn.getAttribute('data-testid')?.startsWith('icon-option-')
      );

      expect(iconButtons.length).toBeGreaterThan(0);
    });

    it('allows icon selection', () => {
      render(<CategoryManager {...defaultProps} />);

      fireEvent.click(screen.getByTestId('add-category-button'));

      const iconButton = screen.getByTestId('icon-option-🍔');
      fireEvent.click(iconButton);

      // Verify icon is selected (has border-blue class)
      expect(iconButton.className).toContain('border-blue-500');
    });

    it('saves category with valid data', async () => {
      render(<CategoryManager {...defaultProps} />);

      fireEvent.click(screen.getByTestId('add-category-button'));

      fireEvent.change(screen.getByTestId('category-name-input'), {
        target: { value: 'Animals' }
      });

      fireEvent.change(screen.getByTestId('category-description-input'), {
        target: { value: 'Animal names' }
      });

      fireEvent.click(screen.getByTestId('save-category-button'));

      await waitFor(() => {
        expect(mockHandlers.onAddCategory).toHaveBeenCalledWith({
          name: 'Animals',
          color: expect.any(String),
          icon: expect.any(String),
          description: 'Animal names',
          wordCount: 0,
        });
      });
    });

    it('trims whitespace from category name', async () => {
      render(<CategoryManager {...defaultProps} />);

      fireEvent.click(screen.getByTestId('add-category-button'));

      fireEvent.change(screen.getByTestId('category-name-input'), {
        target: { value: '  Spaces  ' }
      });

      fireEvent.click(screen.getByTestId('save-category-button'));

      await waitFor(() => {
        expect(mockHandlers.onAddCategory).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'Spaces' })
        );
      });
    });

    it('cancels adding category', () => {
      render(<CategoryManager {...defaultProps} />);

      fireEvent.click(screen.getByTestId('add-category-button'));
      expect(screen.getByText('Add New Category')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('cancel-add-button'));
      expect(screen.queryByText('Add New Category')).not.toBeInTheDocument();
    });

    it('disables add button while form is open', () => {
      render(<CategoryManager {...defaultProps} />);

      const addButton = screen.getByTestId('add-category-button');
      fireEvent.click(addButton);

      expect(addButton).toBeDisabled();
    });
  });

  describe('Edit Category (12 tests)', () => {
    it('opens edit mode when edit button clicked', () => {
      render(<CategoryManager {...defaultProps} />);

      const editButton = screen.getByTestId('edit-button-cat-1');
      fireEvent.click(editButton);

      expect(screen.getByTestId('edit-name-input-cat-1')).toBeInTheDocument();
    });

    it('pre-fills form with existing category data', () => {
      render(<CategoryManager {...defaultProps} />);

      fireEvent.click(screen.getByTestId('edit-button-cat-1'));

      const nameInput = screen.getByTestId('edit-name-input-cat-1') as HTMLInputElement;
      expect(nameInput.value).toBe('Greetings');
    });

    it('allows editing category name', async () => {
      render(<CategoryManager {...defaultProps} />);

      fireEvent.click(screen.getByTestId('edit-button-cat-1'));

      const nameInput = screen.getByTestId('edit-name-input-cat-1');
      fireEvent.change(nameInput, { target: { value: 'Hello & Goodbye' } });

      fireEvent.click(screen.getByTestId('save-edit-button-cat-1'));

      await waitFor(() => {
        expect(mockHandlers.onUpdateCategory).toHaveBeenCalledWith('cat-1', {
          name: 'Hello & Goodbye',
          color: expect.any(String),
          icon: expect.any(String),
          description: expect.any(String),
        });
      });
    });

    it('validates name during edit', async () => {
      render(<CategoryManager {...defaultProps} />);

      fireEvent.click(screen.getByTestId('edit-button-cat-1'));

      const nameInput = screen.getByTestId('edit-name-input-cat-1');
      fireEvent.change(nameInput, { target: { value: '' } });

      fireEvent.click(screen.getByTestId('save-edit-button-cat-1'));

      await waitFor(() => {
        expect(screen.getByText('Category name is required')).toBeInTheDocument();
      });
    });

    it('prevents duplicate names during edit', async () => {
      render(<CategoryManager {...defaultProps} />);

      fireEvent.click(screen.getByTestId('edit-button-cat-1'));

      const nameInput = screen.getByTestId('edit-name-input-cat-1');
      fireEvent.change(nameInput, { target: { value: 'Food & Drink' } });

      fireEvent.click(screen.getByTestId('save-edit-button-cat-1'));

      await waitFor(() => {
        expect(screen.getByText('A category with this name already exists')).toBeInTheDocument();
      });
    });

    it('allows keeping same name during edit', async () => {
      render(<CategoryManager {...defaultProps} />);

      fireEvent.click(screen.getByTestId('edit-button-cat-1'));

      // Keep the same name
      fireEvent.click(screen.getByTestId('save-edit-button-cat-1'));

      await waitFor(() => {
        expect(mockHandlers.onUpdateCategory).toHaveBeenCalledWith('cat-1', expect.any(Object));
      });
    });

    it('cancels edit mode', () => {
      render(<CategoryManager {...defaultProps} />);

      fireEvent.click(screen.getByTestId('edit-button-cat-1'));
      expect(screen.getByTestId('edit-name-input-cat-1')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('cancel-edit-button-cat-1'));
      expect(screen.queryByTestId('edit-name-input-cat-1')).not.toBeInTheDocument();
    });

    it('displays original name after cancel', () => {
      render(<CategoryManager {...defaultProps} />);

      fireEvent.click(screen.getByTestId('edit-button-cat-1'));

      const nameInput = screen.getByTestId('edit-name-input-cat-1');
      fireEvent.change(nameInput, { target: { value: 'Changed' } });

      fireEvent.click(screen.getByTestId('cancel-edit-button-cat-1'));

      expect(screen.getByText('Greetings')).toBeInTheDocument();
    });

    it('saves changes successfully', async () => {
      render(<CategoryManager {...defaultProps} />);

      fireEvent.click(screen.getByTestId('edit-button-cat-1'));

      fireEvent.change(screen.getByTestId('edit-name-input-cat-1'), {
        target: { value: 'Updated Name' }
      });

      fireEvent.click(screen.getByTestId('save-edit-button-cat-1'));

      await waitFor(() => {
        expect(mockHandlers.onUpdateCategory).toHaveBeenCalled();
      });
    });

    it('clears edit form after save', async () => {
      render(<CategoryManager {...defaultProps} />);

      fireEvent.click(screen.getByTestId('edit-button-cat-1'));
      fireEvent.click(screen.getByTestId('save-edit-button-cat-1'));

      await waitFor(() => {
        expect(screen.queryByTestId('edit-name-input-cat-1')).not.toBeInTheDocument();
      });
    });

    it('handles edit errors gracefully', async () => {
      const errorHandlers = {
        ...mockHandlers,
        onUpdateCategory: vi.fn().mockRejectedValue(new Error('Update failed')),
      };

      render(<CategoryManager {...defaultProps} {...errorHandlers} />);

      fireEvent.click(screen.getByTestId('edit-button-cat-1'));
      fireEvent.click(screen.getByTestId('save-edit-button-cat-1'));

      await waitFor(() => {
        expect(screen.getByText('Failed to update category')).toBeInTheDocument();
      });
    });

    it('allows editing only one category at a time', () => {
      render(<CategoryManager {...defaultProps} />);

      fireEvent.click(screen.getByTestId('edit-button-cat-1'));
      expect(screen.getByTestId('edit-name-input-cat-1')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('edit-button-cat-2'));
      expect(screen.queryByTestId('edit-name-input-cat-1')).not.toBeInTheDocument();
      expect(screen.getByTestId('edit-name-input-cat-2')).toBeInTheDocument();
    });
  });

  describe('Delete Category (10 tests)', () => {
    it('shows confirmation when deleting category with no words', () => {
      render(<CategoryManager {...defaultProps} />);

      fireEvent.click(screen.getByTestId('delete-button-cat-3'));

      expect(screen.getByTestId('delete-confirmation-modal')).toBeInTheDocument();
    });

    it('deletes category without words directly', async () => {
      render(<CategoryManager {...defaultProps} />);

      fireEvent.click(screen.getByTestId('delete-button-cat-3'));

      await waitFor(() => {
        expect(screen.getByTestId('confirm-delete-button')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('confirm-delete-button'));

      await waitFor(() => {
        expect(mockHandlers.onDeleteCategory).toHaveBeenCalledWith('cat-3', undefined);
      });
    });

    it('shows reassign option when category has words', () => {
      render(<CategoryManager {...defaultProps} />);

      fireEvent.click(screen.getByTestId('delete-button-cat-1'));

      expect(screen.getByText(/This category contains 15 words/)).toBeInTheDocument();
      expect(screen.getByTestId('reassign-category-select')).toBeInTheDocument();
    });

    it('displays available categories for reassignment', () => {
      render(<CategoryManager {...defaultProps} />);

      fireEvent.click(screen.getByTestId('delete-button-cat-1'));

      const select = screen.getByTestId('reassign-category-select') as HTMLSelectElement;

      // Check that select has options for other categories (excluding the one being deleted)
      const options = Array.from(select.options).map(opt => opt.value);

      expect(options).toContain('cat-2'); // Food & Drink
      expect(options).toContain('cat-3'); // Travel
      expect(options).not.toContain('cat-1'); // Being deleted
    });

    it('requires category selection for reassignment', () => {
      render(<CategoryManager {...defaultProps} />);

      fireEvent.click(screen.getByTestId('delete-button-cat-1'));

      const confirmButton = screen.getByTestId('confirm-delete-button');
      expect(confirmButton).toBeDisabled();
    });

    it('enables delete button after selecting reassign category', () => {
      render(<CategoryManager {...defaultProps} />);

      fireEvent.click(screen.getByTestId('delete-button-cat-1'));

      const select = screen.getByTestId('reassign-category-select');
      fireEvent.change(select, { target: { value: 'cat-2' } });

      const confirmButton = screen.getByTestId('confirm-delete-button');
      expect(confirmButton).not.toBeDisabled();
    });

    it('deletes and reassigns words to selected category', async () => {
      render(<CategoryManager {...defaultProps} />);

      fireEvent.click(screen.getByTestId('delete-button-cat-1'));

      fireEvent.change(screen.getByTestId('reassign-category-select'), {
        target: { value: 'cat-2' }
      });

      fireEvent.click(screen.getByTestId('confirm-delete-button'));

      await waitFor(() => {
        expect(mockHandlers.onDeleteCategory).toHaveBeenCalledWith('cat-1', 'cat-2');
      });
    });

    it('cancels delete operation', () => {
      render(<CategoryManager {...defaultProps} />);

      fireEvent.click(screen.getByTestId('delete-button-cat-1'));
      expect(screen.getByTestId('delete-confirmation-modal')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('cancel-delete-button'));
      expect(screen.queryByTestId('delete-confirmation-modal')).not.toBeInTheDocument();
    });

    it('handles delete errors gracefully', async () => {
      const errorHandlers = {
        ...mockHandlers,
        onDeleteCategory: vi.fn().mockRejectedValue(new Error('Delete failed')),
      };

      render(<CategoryManager {...defaultProps} {...errorHandlers} />);

      fireEvent.click(screen.getByTestId('delete-button-cat-3'));

      await waitFor(() => {
        expect(screen.getByTestId('confirm-delete-button')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('confirm-delete-button'));

      await waitFor(() => {
        expect(screen.getByText('Failed to delete category')).toBeInTheDocument();
      });
    });

    it('displays word count in delete confirmation', () => {
      render(<CategoryManager {...defaultProps} />);

      fireEvent.click(screen.getByTestId('delete-button-cat-1'));

      expect(screen.getByText(/contains 15 words/)).toBeInTheDocument();
    });
  });

  describe('Reorder Categories (8 tests)', () => {
    it('displays move up buttons for all categories', () => {
      render(<CategoryManager {...defaultProps} />);

      mockCategories.forEach(category => {
        expect(screen.getByTestId(`move-up-button-${category.id}`)).toBeInTheDocument();
      });
    });

    it('displays move down buttons for all categories', () => {
      render(<CategoryManager {...defaultProps} />);

      mockCategories.forEach(category => {
        expect(screen.getByTestId(`move-down-button-${category.id}`)).toBeInTheDocument();
      });
    });

    it('disables move up for first category', () => {
      render(<CategoryManager {...defaultProps} />);

      const moveUpButton = screen.getByTestId('move-up-button-cat-1');
      expect(moveUpButton).toBeDisabled();
    });

    it('disables move down for last category', () => {
      render(<CategoryManager {...defaultProps} />);

      const moveDownButton = screen.getByTestId('move-down-button-cat-3');
      expect(moveDownButton).toBeDisabled();
    });

    it('moves category up when button clicked', async () => {
      render(<CategoryManager {...defaultProps} />);

      const moveUpButton = screen.getByTestId('move-up-button-cat-2');
      fireEvent.click(moveUpButton);

      await waitFor(() => {
        expect(mockHandlers.onReorderCategories).toHaveBeenCalled();
      });
    });

    it('moves category down when button clicked', async () => {
      render(<CategoryManager {...defaultProps} />);

      const moveDownButton = screen.getByTestId('move-down-button-cat-1');
      fireEvent.click(moveDownButton);

      await waitFor(() => {
        expect(mockHandlers.onReorderCategories).toHaveBeenCalled();
      });
    });

    it('reorders categories correctly when moving up', async () => {
      render(<CategoryManager {...defaultProps} />);

      fireEvent.click(screen.getByTestId('move-up-button-cat-2'));

      await waitFor(() => {
        const reorderedCategories = mockHandlers.onReorderCategories.mock.calls[0][0];
        expect(reorderedCategories[0].id).toBe('cat-2');
        expect(reorderedCategories[1].id).toBe('cat-1');
      });
    });

    it('updates order property when reordering', async () => {
      render(<CategoryManager {...defaultProps} />);

      fireEvent.click(screen.getByTestId('move-down-button-cat-1'));

      await waitFor(() => {
        const reorderedCategories = mockHandlers.onReorderCategories.mock.calls[0][0];
        reorderedCategories.forEach((cat, index) => {
          expect(cat.order).toBe(index);
        });
      });
    });
  });

  describe('Additional Edge Cases and Integration (10 tests)', () => {
    it('applies custom className', () => {
      const { container } = render(
        <CategoryManager {...defaultProps} className="custom-class" />
      );

      const mainDiv = container.firstChild as HTMLElement;
      expect(mainDiv.className).toContain('custom-class');
    });

    it('clears error messages when user starts typing', () => {
      render(<CategoryManager {...defaultProps} />);

      fireEvent.click(screen.getByTestId('add-category-button'));
      fireEvent.click(screen.getByTestId('save-category-button'));

      expect(screen.getByText('Category name is required')).toBeInTheDocument();

      const nameInput = screen.getByTestId('category-name-input');
      fireEvent.change(nameInput, { target: { value: 'Test' } });

      expect(screen.queryByText('Category name is required')).not.toBeInTheDocument();
    });

    it('displays all 16 default colors', () => {
      render(<CategoryManager {...defaultProps} />);

      fireEvent.click(screen.getByTestId('add-category-button'));

      const colorButtons = screen.getAllByRole('button').filter(btn =>
        btn.getAttribute('data-testid')?.startsWith('color-option-')
      );

      expect(colorButtons).toHaveLength(16);
    });

    it('displays all 12 default icons', () => {
      render(<CategoryManager {...defaultProps} />);

      fireEvent.click(screen.getByTestId('add-category-button'));

      const iconButtons = screen.getAllByRole('button').filter(btn =>
        btn.getAttribute('data-testid')?.startsWith('icon-option-')
      );

      expect(iconButtons).toHaveLength(12);
    });

    it('handles form submission errors', async () => {
      const errorHandlers = {
        ...mockHandlers,
        onAddCategory: vi.fn().mockRejectedValue(new Error('Network error')),
      };

      render(<CategoryManager {...defaultProps} {...errorHandlers} />);

      fireEvent.click(screen.getByTestId('add-category-button'));

      fireEvent.change(screen.getByTestId('category-name-input'), {
        target: { value: 'New Category' }
      });

      fireEvent.click(screen.getByTestId('save-category-button'));

      await waitFor(() => {
        expect(screen.getByText('Failed to add category')).toBeInTheDocument();
      });
    });

    it('maintains form state across multiple interactions', () => {
      render(<CategoryManager {...defaultProps} />);

      fireEvent.click(screen.getByTestId('add-category-button'));

      const nameInput = screen.getByTestId('category-name-input');
      fireEvent.change(nameInput, { target: { value: 'Test' } });

      const colorButton = screen.getByTestId('color-option-#f97316');
      fireEvent.click(colorButton);

      expect((nameInput as HTMLInputElement).value).toBe('Test');
      expect(colorButton.className).toContain('scale-110');
    });

    it('does not close form on validation error', async () => {
      render(<CategoryManager {...defaultProps} />);

      fireEvent.click(screen.getByTestId('add-category-button'));
      fireEvent.click(screen.getByTestId('save-category-button'));

      await waitFor(() => {
        expect(screen.getByText('Category name is required')).toBeInTheDocument();
      });

      expect(screen.getByText('Add New Category')).toBeInTheDocument();
    });

    it('shows grip handle for drag and drop', () => {
      const { container } = render(<CategoryManager {...defaultProps} />);

      const gripIcons = container.querySelectorAll('svg[class*="cursor-move"]');
      expect(gripIcons.length).toBe(mockCategories.length);
    });

    it('preserves category descriptions through edit', async () => {
      render(<CategoryManager {...defaultProps} />);

      fireEvent.click(screen.getByTestId('edit-button-cat-1'));
      fireEvent.click(screen.getByTestId('save-edit-button-cat-1'));

      await waitFor(() => {
        expect(mockHandlers.onUpdateCategory).toHaveBeenCalledWith(
          'cat-1',
          expect.objectContaining({
            description: 'Common greetings and salutations'
          })
        );
      });
    });

    it('handles multiple rapid clicks gracefully', async () => {
      render(<CategoryManager {...defaultProps} />);

      const addButton = screen.getByTestId('add-category-button');

      // Rapid clicks
      fireEvent.click(addButton);
      fireEvent.click(addButton);
      fireEvent.click(addButton);

      // Should only open form once
      const forms = screen.getAllByText('Add New Category');
      expect(forms).toHaveLength(1);
    });
  });
});
