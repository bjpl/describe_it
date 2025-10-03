import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from '@/components/ui/Card';

describe('Card Components', () => {
  describe('Card Component', () => {
    describe('Props Validation', () => {
      it('should render children correctly', () => {
        render(<Card>Card Content</Card>);
        expect(screen.getByText('Card Content')).toBeInTheDocument();
      });

      it('should apply custom className', () => {
        render(<Card className="custom-card">Content</Card>);
        const card = screen.getByText('Content').parentElement;
        expect(card).toHaveClass('custom-card');
      });

      it('should render as div by default', () => {
        const { container } = render(<Card>Content</Card>);
        expect(container.querySelector('div')).toBeInTheDocument();
      });
    });

    describe('Clickable Card', () => {
      it('should render as button when clickable', () => {
        render(<Card clickable>Clickable Card</Card>);
        const card = screen.getByText('Clickable Card').parentElement;
        expect(card?.tagName).toBe('BUTTON');
      });

      it('should call onClick when clicked', () => {
        const handleClick = vi.fn();
        render(<Card clickable onClick={handleClick}>Click me</Card>);

        const card = screen.getByText('Click me').parentElement;
        if (card) fireEvent.click(card);
        expect(handleClick).toHaveBeenCalledTimes(1);
      });

      it('should have hover styles when clickable', () => {
        render(<Card clickable>Hover Card</Card>);
        const card = screen.getByText('Hover Card').parentElement;
        expect(card).toHaveClass('hover:shadow-md', 'transition-shadow', 'cursor-pointer');
      });

      it('should have focus styles when clickable', () => {
        render(<Card clickable>Focus Card</Card>);
        const card = screen.getByText('Focus Card').parentElement;
        expect(card).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-ring');
      });

      it('should not call onClick when not clickable', () => {
        const handleClick = vi.fn();
        render(<Card onClick={handleClick}>Not Clickable</Card>);

        const card = screen.getByText('Not Clickable').parentElement;
        if (card) fireEvent.click(card);
        expect(handleClick).not.toHaveBeenCalled();
      });
    });

    describe('Accessibility', () => {
      it('should accept role prop', () => {
        render(<Card role="article">Article Card</Card>);
        expect(screen.getByRole('article')).toBeInTheDocument();
      });

      it('should accept aria-label', () => {
        render(<Card aria-label="Product card">Content</Card>);
        const card = screen.getByLabelText('Product card');
        expect(card).toBeInTheDocument();
      });

      it('should accept aria-labelledby', () => {
        render(
          <Card aria-labelledby="card-title">
            <h2 id="card-title">Title</h2>
          </Card>
        );
        const card = screen.getByText('Title').closest('[aria-labelledby="card-title"]');
        expect(card).toBeInTheDocument();
      });
    });

    describe('Mouse Events', () => {
      it('should call onMouseEnter', () => {
        const handleMouseEnter = vi.fn();
        render(<Card onMouseEnter={handleMouseEnter}>Hover me</Card>);

        const card = screen.getByText('Hover me').parentElement;
        if (card) fireEvent.mouseEnter(card);
        expect(handleMouseEnter).toHaveBeenCalledTimes(1);
      });

      it('should call onMouseLeave', () => {
        const handleMouseLeave = vi.fn();
        render(<Card onMouseLeave={handleMouseLeave}>Leave me</Card>);

        const card = screen.getByText('Leave me').parentElement;
        if (card) fireEvent.mouseLeave(card);
        expect(handleMouseLeave).toHaveBeenCalledTimes(1);
      });
    });

    describe('Default Styles', () => {
      it('should have base card styles', () => {
        render(<Card>Styled Card</Card>);
        const card = screen.getByText('Styled Card').parentElement;
        expect(card).toHaveClass('rounded-lg', 'border', 'bg-card', 'shadow-sm');
      });
    });
  });

  describe('CardHeader Component', () => {
    it('should render children', () => {
      render(<CardHeader>Header Content</CardHeader>);
      expect(screen.getByText('Header Content')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<CardHeader className="custom-header">Header</CardHeader>);
      expect(screen.getByText('Header').parentElement).toHaveClass('custom-header');
    });

    it('should have default header styles', () => {
      render(<CardHeader>Header</CardHeader>);
      const header = screen.getByText('Header').parentElement;
      expect(header).toHaveClass('flex', 'flex-col', 'space-y-1.5', 'p-6');
    });
  });

  describe('CardTitle Component', () => {
    it('should render children', () => {
      render(<CardTitle>Card Title</CardTitle>);
      expect(screen.getByText('Card Title')).toBeInTheDocument();
    });

    it('should render as h3 by default', () => {
      const { container } = render(<CardTitle>Title</CardTitle>);
      expect(container.querySelector('h3')).toBeInTheDocument();
    });

    it('should render as custom heading element', () => {
      const { container } = render(<CardTitle as="h1">H1 Title</CardTitle>);
      expect(container.querySelector('h1')).toBeInTheDocument();
    });

    it('should support all heading levels', () => {
      const levels = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;
      levels.forEach(level => {
        const { container } = render(<CardTitle as={level}>{level}</CardTitle>);
        expect(container.querySelector(level)).toBeInTheDocument();
      });
    });

    it('should apply custom className', () => {
      render(<CardTitle className="custom-title">Title</CardTitle>);
      expect(screen.getByText('Title')).toHaveClass('custom-title');
    });

    it('should have title styles', () => {
      render(<CardTitle>Title</CardTitle>);
      const title = screen.getByText('Title');
      expect(title).toHaveClass('text-2xl', 'font-semibold', 'tracking-tight');
    });
  });

  describe('CardDescription Component', () => {
    it('should render children', () => {
      render(<CardDescription>Description text</CardDescription>);
      expect(screen.getByText('Description text')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<CardDescription className="custom-desc">Description</CardDescription>);
      expect(screen.getByText('Description')).toHaveClass('custom-desc');
    });

    it('should have description styles', () => {
      render(<CardDescription>Description</CardDescription>);
      expect(screen.getByText('Description')).toHaveClass('text-sm', 'text-muted-foreground');
    });
  });

  describe('CardContent Component', () => {
    it('should render children', () => {
      render(<CardContent>Content area</CardContent>);
      expect(screen.getByText('Content area')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<CardContent className="custom-content">Content</CardContent>);
      expect(screen.getByText('Content').parentElement).toHaveClass('custom-content');
    });

    it('should have content styles', () => {
      render(<CardContent>Content</CardContent>);
      const content = screen.getByText('Content').parentElement;
      expect(content).toHaveClass('p-6', 'pt-0');
    });
  });

  describe('CardFooter Component', () => {
    it('should render children', () => {
      render(<CardFooter>Footer content</CardFooter>);
      expect(screen.getByText('Footer content')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<CardFooter className="custom-footer">Footer</CardFooter>);
      expect(screen.getByText('Footer').parentElement).toHaveClass('custom-footer');
    });

    it('should have footer styles', () => {
      render(<CardFooter>Footer</CardFooter>);
      const footer = screen.getByText('Footer').parentElement;
      expect(footer).toHaveClass('flex', 'items-center', 'p-6', 'pt-0');
    });
  });

  describe('Complete Card Composition', () => {
    it('should render complete card structure', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Product Name</CardTitle>
            <CardDescription>Product description</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Main content</p>
          </CardContent>
          <CardFooter>
            <button>Action</button>
          </CardFooter>
        </Card>
      );

      expect(screen.getByText('Product Name')).toBeInTheDocument();
      expect(screen.getByText('Product description')).toBeInTheDocument();
      expect(screen.getByText('Main content')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /action/i })).toBeInTheDocument();
    });
  });

  describe('Snapshot Tests', () => {
    it('should match snapshot for basic card', () => {
      const { container } = render(
        <Card>
          <CardHeader>
            <CardTitle>Title</CardTitle>
            <CardDescription>Description</CardDescription>
          </CardHeader>
          <CardContent>Content</CardContent>
          <CardFooter>Footer</CardFooter>
        </Card>
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for clickable card', () => {
      const { container } = render(
        <Card clickable onClick={() => {}}>
          Clickable Card
        </Card>
      );
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});
