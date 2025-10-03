/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import { Dropdown, SimpleDropdown } from '@/components/ui/Dropdown';
import type { DropdownItem } from '@/components/ui/Dropdown';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockItems: DropdownItem[] = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3', disabled: true },
  { value: 'option4', label: 'Option 4', description: 'With description' },
];

describe('Dropdown Component', () => {
  describe('Basic Rendering', () => {
    it('should render with placeholder', () => {
      render(<Dropdown items={mockItems} onSelect={() => {}} placeholder="Select option" />);
      expect(screen.getByText('Select option')).toBeInTheDocument();
    });

    it('should render selected value', () => {
      render(<Dropdown items={mockItems} value="option1" onSelect={() => {}} />);
      expect(screen.getByText('Option 1')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <Dropdown items={mockItems} onSelect={() => {}} className="custom-dropdown" />
      );
      expect(container.querySelector('.custom-dropdown')).toBeInTheDocument();
    });
  });

  describe('Opening and Closing', () => {
    it('should open dropdown when trigger is clicked', () => {
      render(<Dropdown items={mockItems} onSelect={() => {}} />);

      const trigger = screen.getByRole('button');
      fireEvent.click(trigger);

      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('should close dropdown when clicking outside', async () => {
      render(<Dropdown items={mockItems} onSelect={() => {}} />);

      const trigger = screen.getByRole('button');
      fireEvent.click(trigger);

      expect(screen.getByRole('listbox')).toBeInTheDocument();

      fireEvent.mouseDown(document.body);

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });

    it('should close on Escape key', async () => {
      render(<Dropdown items={mockItems} onSelect={() => {}} />);

      const trigger = screen.getByRole('button');
      fireEvent.click(trigger);

      fireEvent.keyDown(trigger, { key: 'Escape', code: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });

    it('should close on Tab key', async () => {
      render(<Dropdown items={mockItems} onSelect={() => {}} />);

      const trigger = screen.getByRole('button');
      fireEvent.click(trigger);

      fireEvent.keyDown(trigger, { key: 'Tab', code: 'Tab' });

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });
  });

  describe('Item Selection', () => {
    it('should call onSelect when item is clicked', () => {
      const handleSelect = vi.fn();
      render(<Dropdown items={mockItems} onSelect={handleSelect} />);

      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('Option 1'));

      expect(handleSelect).toHaveBeenCalledWith('option1');
    });

    it('should not select disabled items', () => {
      const handleSelect = vi.fn();
      render(<Dropdown items={mockItems} onSelect={handleSelect} />);

      fireEvent.click(screen.getByRole('button'));
      const disabledOption = screen.getByText('Option 3');
      fireEvent.click(disabledOption);

      expect(handleSelect).not.toHaveBeenCalled();
    });

    it('should close after selection in single mode', async () => {
      render(<Dropdown items={mockItems} onSelect={() => {}} />);

      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('Option 1'));

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should open on Enter key', () => {
      render(<Dropdown items={mockItems} onSelect={() => {}} />);

      const trigger = screen.getByRole('button');
      fireEvent.keyDown(trigger, { key: 'Enter', code: 'Enter' });

      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('should open on Space key', () => {
      render(<Dropdown items={mockItems} onSelect={() => {}} />);

      const trigger = screen.getByRole('button');
      fireEvent.keyDown(trigger, { key: 'Space', code: 'Space' });

      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('should navigate items with ArrowDown', () => {
      render(<Dropdown items={mockItems} onSelect={() => {}} />);

      const trigger = screen.getByRole('button');
      fireEvent.click(trigger);

      fireEvent.keyDown(trigger, { key: 'ArrowDown', code: 'ArrowDown' });
      // Focus should move to first item
    });

    it('should navigate items with ArrowUp', () => {
      render(<Dropdown items={mockItems} onSelect={() => {}} />);

      const trigger = screen.getByRole('button');
      fireEvent.click(trigger);

      fireEvent.keyDown(trigger, { key: 'ArrowUp', code: 'ArrowUp' });
      // Focus should move to last item
    });
  });

  describe('Searchable Dropdown', () => {
    it('should show search input when searchable', () => {
      render(<Dropdown items={mockItems} onSelect={() => {}} searchable />);

      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    });

    it('should filter items based on search', () => {
      render(<Dropdown items={mockItems} onSelect={() => {}} searchable />);

      fireEvent.click(screen.getByRole('button'));
      const searchInput = screen.getByPlaceholderText('Search...');

      fireEvent.change(searchInput, { target: { value: 'Option 1' } });

      expect(screen.getByText('Option 1')).toBeInTheDocument();
      expect(screen.queryByText('Option 2')).not.toBeInTheDocument();
    });

    it('should show "No options found" when no matches', () => {
      render(<Dropdown items={mockItems} onSelect={() => {}} searchable />);

      fireEvent.click(screen.getByRole('button'));
      const searchInput = screen.getByPlaceholderText('Search...');

      fireEvent.change(searchInput, { target: { value: 'NonExistent' } });

      expect(screen.getByText('No options found')).toBeInTheDocument();
    });
  });

  describe('Multiple Selection', () => {
    it('should allow multiple selections', () => {
      const handleSelect = vi.fn();
      render(<Dropdown items={mockItems} onSelect={handleSelect} multiple />);

      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('Option 1'));
      fireEvent.click(screen.getByText('Option 2'));

      expect(handleSelect).toHaveBeenCalledTimes(2);
    });

    it('should show count when multiple items selected', () => {
      const handleSelect = vi.fn();
      const { rerender } = render(
        <Dropdown items={mockItems} value={['option1', 'option2']} onSelect={handleSelect} multiple />
      );

      expect(screen.getByText('2 selected')).toBeInTheDocument();
    });

    it('should not close after selection in multiple mode', () => {
      render(<Dropdown items={mockItems} onSelect={() => {}} multiple />);

      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('Option 1'));

      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('should not open when disabled', () => {
      render(<Dropdown items={mockItems} onSelect={() => {}} disabled />);

      const trigger = screen.getByRole('button');
      fireEvent.click(trigger);

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('should have disabled attribute', () => {
      render(<Dropdown items={mockItems} onSelect={() => {}} disabled />);

      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  describe('Item Icons and Descriptions', () => {
    it('should render item icons', () => {
      const itemsWithIcons: DropdownItem[] = [
        { value: 'home', label: 'Home', icon: <span data-testid="home-icon">🏠</span> },
      ];

      render(<Dropdown items={itemsWithIcons} onSelect={() => {}} />);

      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByTestId('home-icon')).toBeInTheDocument();
    });

    it('should render item descriptions', () => {
      render(<Dropdown items={mockItems} onSelect={() => {}} />);

      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByText('With description')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<Dropdown items={mockItems} onSelect={() => {}} />);

      const trigger = screen.getByRole('button');
      expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    it('should update aria-expanded when open', () => {
      render(<Dropdown items={mockItems} onSelect={() => {}} />);

      const trigger = screen.getByRole('button');
      fireEvent.click(trigger);

      expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });

    it('should have aria-selected on selected items', () => {
      render(<Dropdown items={mockItems} value="option1" onSelect={() => {}} />);

      fireEvent.click(screen.getByRole('button'));
      const selectedOption = screen.getByRole('option', { name: /option 1/i });

      expect(selectedOption).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Position Prop', () => {
    it('should support top position', () => {
      const { container } = render(
        <Dropdown items={mockItems} onSelect={() => {}} position="top" />
      );

      fireEvent.click(screen.getByRole('button'));
      expect(container.querySelector('.bottom-full')).toBeInTheDocument();
    });
  });
});

describe('SimpleDropdown Component', () => {
  it('should work with string array', () => {
    const options = ['Apple', 'Banana', 'Cherry'];
    render(<SimpleDropdown options={options} onSelect={() => {}} />);

    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Apple')).toBeInTheDocument();
  });

  it('should work with object array', () => {
    const options = [
      { value: 'apple', label: 'Apple' },
      { value: 'banana', label: 'Banana' },
    ];

    render(<SimpleDropdown options={options} onSelect={() => {}} />);

    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Apple')).toBeInTheDocument();
  });

  it('should call onSelect with value', () => {
    const handleSelect = vi.fn();
    const options = ['Apple', 'Banana'];

    render(<SimpleDropdown options={options} onSelect={handleSelect} />);

    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('Apple'));

    expect(handleSelect).toHaveBeenCalledWith('Apple');
  });
});
