import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';

describe('Tabs Components', () => {
  describe('Tabs Container', () => {
    it('should render children', () => {
      render(
        <Tabs>
          <div>Tab content</div>
        </Tabs>
      );
      expect(screen.getByText('Tab content')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <Tabs className="custom-tabs">
          <div>Content</div>
        </Tabs>
      );
      expect(container.firstChild).toHaveClass('custom-tabs');
    });

    it('should use defaultValue for initial state', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsContent value="tab1">Tab 1 Content</TabsContent>
          <TabsContent value="tab2">Tab 2 Content</TabsContent>
        </Tabs>
      );
      expect(screen.getByText('Tab 1 Content')).toBeInTheDocument();
      expect(screen.queryByText('Tab 2 Content')).not.toBeInTheDocument();
    });
  });

  describe('Controlled vs Uncontrolled', () => {
    it('should work in uncontrolled mode', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );

      expect(screen.getByText('Content 1')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Tab 2'));
      expect(screen.getByText('Content 2')).toBeInTheDocument();
      expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
    });

    it('should work in controlled mode', () => {
      const handleChange = vi.fn();
      const { rerender } = render(
        <Tabs value="tab1" onValueChange={handleChange}>
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );

      expect(screen.getByText('Content 1')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Tab 2'));
      expect(handleChange).toHaveBeenCalledWith('tab2');

      // Simulate parent updating value
      rerender(
        <Tabs value="tab2" onValueChange={handleChange}>
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );

      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });
  });

  describe('TabsList Component', () => {
    it('should render children', () => {
      render(
        <TabsList>
          <button>Tab 1</button>
        </TabsList>
      );
      expect(screen.getByText('Tab 1')).toBeInTheDocument();
    });

    it('should have default list styles', () => {
      const { container } = render(
        <TabsList>
          <button>Tab</button>
        </TabsList>
      );
      const list = container.firstChild;
      expect(list).toHaveClass('inline-flex', 'h-10', 'rounded-md', 'bg-muted');
    });

    it('should apply custom className', () => {
      const { container } = render(
        <TabsList className="custom-list">
          <button>Tab</button>
        </TabsList>
      );
      expect(container.firstChild).toHaveClass('custom-list');
    });
  });

  describe('TabsTrigger Component', () => {
    it('should render trigger button', () => {
      render(
        <Tabs>
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
        </Tabs>
      );
      expect(screen.getByText('Tab 1')).toBeInTheDocument();
    });

    it('should throw error when used outside Tabs context', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TabsTrigger value="tab1">Tab 1</TabsTrigger>);
      }).toThrow('TabsTrigger must be used within Tabs');

      consoleSpy.mockRestore();
    });

    it('should apply active styles when selected', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Active Tab</TabsTrigger>
            <TabsTrigger value="tab2">Inactive Tab</TabsTrigger>
          </TabsList>
        </Tabs>
      );

      const activeTab = screen.getByText('Active Tab');
      expect(activeTab).toHaveClass('bg-background', 'text-foreground', 'shadow-sm');
    });

    it('should apply inactive styles when not selected', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Active Tab</TabsTrigger>
            <TabsTrigger value="tab2">Inactive Tab</TabsTrigger>
          </TabsList>
        </Tabs>
      );

      const inactiveTab = screen.getByText('Inactive Tab');
      expect(inactiveTab).toHaveClass('hover:bg-accent');
    });

    it('should change active tab on click', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );

      fireEvent.click(screen.getByText('Tab 2'));
      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });

    it('should be disabled when disabled prop is true', () => {
      render(
        <Tabs>
          <TabsList>
            <TabsTrigger value="tab1" disabled>Disabled Tab</TabsTrigger>
          </TabsList>
        </Tabs>
      );

      const disabledTab = screen.getByText('Disabled Tab');
      expect(disabledTab).toBeDisabled();
    });

    it('should not change tab when disabled', () => {
      const handleChange = vi.fn();
      render(
        <Tabs onValueChange={handleChange}>
          <TabsList>
            <TabsTrigger value="tab1" disabled>Disabled Tab</TabsTrigger>
          </TabsList>
        </Tabs>
      );

      fireEvent.click(screen.getByText('Disabled Tab'));
      expect(handleChange).not.toHaveBeenCalled();
    });

    it('should apply custom className', () => {
      render(
        <Tabs>
          <TabsList>
            <TabsTrigger value="tab1" className="custom-trigger">Tab 1</TabsTrigger>
          </TabsList>
        </Tabs>
      );

      expect(screen.getByText('Tab 1')).toHaveClass('custom-trigger');
    });

    it('should have focus styles', () => {
      render(
        <Tabs>
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
        </Tabs>
      );

      expect(screen.getByText('Tab 1')).toHaveClass('focus-visible:outline-none', 'focus-visible:ring-2');
    });
  });

  describe('TabsContent Component', () => {
    it('should render content when value matches', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsContent value="tab1">Tab 1 Content</TabsContent>
        </Tabs>
      );
      expect(screen.getByText('Tab 1 Content')).toBeInTheDocument();
    });

    it('should not render content when value does not match', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsContent value="tab2">Tab 2 Content</TabsContent>
        </Tabs>
      );
      expect(screen.queryByText('Tab 2 Content')).not.toBeInTheDocument();
    });

    it('should throw error when used outside Tabs context', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TabsContent value="tab1">Content</TabsContent>);
      }).toThrow('TabsContent must be used within Tabs');

      consoleSpy.mockRestore();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsContent value="tab1" className="custom-content">Content</TabsContent>
        </Tabs>
      );

      const content = container.querySelector('.custom-content');
      expect(content).toBeInTheDocument();
    });

    it('should have focus ring styles', () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsContent value="tab1">Content</TabsContent>
        </Tabs>
      );

      const content = screen.getByText('Content').parentElement;
      expect(content).toHaveClass('focus-visible:outline-none', 'focus-visible:ring-2');
    });
  });

  describe('Complete Tabs Example', () => {
    it('should render complete tabs with multiple panels', () => {
      render(
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">Overview content</TabsContent>
          <TabsContent value="details">Details content</TabsContent>
          <TabsContent value="settings">Settings content</TabsContent>
        </Tabs>
      );

      expect(screen.getByText('Overview content')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Details'));
      expect(screen.getByText('Details content')).toBeInTheDocument();
      expect(screen.queryByText('Overview content')).not.toBeInTheDocument();

      fireEvent.click(screen.getByText('Settings'));
      expect(screen.getByText('Settings content')).toBeInTheDocument();
      expect(screen.queryByText('Details content')).not.toBeInTheDocument();
    });
  });

  describe('Snapshot Tests', () => {
    it('should match snapshot', () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});
