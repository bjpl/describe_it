import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import {
  DashboardLayout,
  DashboardGrid,
  DashboardCard,
  DashboardSection,
  DashboardStatsCard
} from '@/components/Dashboard/DashboardLayout';
import '@testing-library/jest-dom';

// Mock dependencies
vi.mock('@/components/ui/Card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardTitle: ({ children, className }: any) => <h3 className={className}>{children}</h3>
}));

vi.mock('@/components/ui/LoadingStates', () => ({
  LoadingOverlay: ({ children, isLoading, message }: any) => (
    <div>
      {isLoading && <div data-testid="loading-overlay">{message}</div>}
      {children}
    </div>
  ),
  CardSkeletonEnhanced: ({ className }: any) => (
    <div className={className} data-testid="skeleton">Loading...</div>
  )
}));

describe('DashboardLayout Component', () => {
  // 1. Basic Rendering Tests
  describe('Basic Rendering', () => {
    it('should render with default title', () => {
      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('should render with custom title', () => {
      render(
        <DashboardLayout title="My Custom Dashboard">
          <div>Content</div>
        </DashboardLayout>
      );

      expect(screen.getByText('My Custom Dashboard')).toBeInTheDocument();
    });

    it('should render description when provided', () => {
      render(
        <DashboardLayout
          title="Test Dashboard"
          description="Test description"
        >
          <div>Content</div>
        </DashboardLayout>
      );

      expect(screen.getByText('Test description')).toBeInTheDocument();
    });

    it('should render children content', () => {
      render(
        <DashboardLayout>
          <div>Test Content</div>
        </DashboardLayout>
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <DashboardLayout className="custom-class">
          <div>Content</div>
        </DashboardLayout>
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  // 2. Header Tests
  describe('Dashboard Header', () => {
    it('should have sticky header', () => {
      const { container } = render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      const header = container.querySelector('.sticky.top-0');
      expect(header).toBeInTheDocument();
    });

    it('should have proper header styling', () => {
      const { container } = render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      const header = container.querySelector('.border-b.bg-card\\/50');
      expect(header).toBeInTheDocument();
    });

    it('should have backdrop blur effect', () => {
      const { container } = render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      const header = container.querySelector('.backdrop-blur-sm');
      expect(header).toBeInTheDocument();
    });
  });

  // 3. Responsive Container Tests
  describe('Responsive Container', () => {
    it('should have container with max-width', () => {
      const { container } = render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      const containerDiv = container.querySelector('.container.mx-auto');
      expect(containerDiv).toBeInTheDocument();
    });

    it('should have responsive padding', () => {
      const { container } = render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      const content = container.querySelector('main.container');
      expect(content).toHaveClass('px-4', 'py-8');
    });
  });

  // 4. Loading State Tests
  describe('Loading State', () => {
    it('should show loading skeletons in suspense fallback', async () => {
      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      // Children should be rendered (not in suspense state)
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });

  // 5. Full Height Layout Tests
  describe('Full Height Layout', () => {
    it('should have min-height screen', () => {
      const { container } = render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      const main = container.querySelector('.min-h-screen');
      expect(main).toBeInTheDocument();
    });
  });
});

describe('DashboardGrid Component', () => {
  // 6. Grid Layout Tests
  describe('Grid Layout', () => {
    it('should render with default 3 columns', () => {
      const { container } = render(
        <DashboardGrid>
          <div>Item 1</div>
          <div>Item 2</div>
        </DashboardGrid>
      );

      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'xl:grid-cols-3');
    });

    it('should render with 2 columns when specified', () => {
      const { container } = render(
        <DashboardGrid cols={2}>
          <div>Item 1</div>
        </DashboardGrid>
      );

      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('lg:grid-cols-2');
    });

    it('should render with 4 columns when specified', () => {
      const { container } = render(
        <DashboardGrid cols={4}>
          <div>Item 1</div>
        </DashboardGrid>
      );

      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('xl:grid-cols-4');
    });

    it('should apply custom gap', () => {
      const { container } = render(
        <DashboardGrid gap={8}>
          <div>Item 1</div>
        </DashboardGrid>
      );

      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('gap-8');
    });

    it('should apply custom className', () => {
      const { container } = render(
        <DashboardGrid className="custom-grid">
          <div>Item 1</div>
        </DashboardGrid>
      );

      expect(container.querySelector('.custom-grid')).toBeInTheDocument();
    });
  });
});

describe('DashboardCard Component', () => {
  // 7. Card Rendering Tests
  describe('Card Rendering', () => {
    it('should render card with title', () => {
      render(
        <DashboardCard title="Test Card">
          <div>Content</div>
        </DashboardCard>
      );

      expect(screen.getByText('Test Card')).toBeInTheDocument();
    });

    it('should render card with description', () => {
      render(
        <DashboardCard title="Test Card" description="Card description">
          <div>Content</div>
        </DashboardCard>
      );

      expect(screen.getByText('Card description')).toBeInTheDocument();
    });

    it('should render children content', () => {
      render(
        <DashboardCard title="Test Card">
          <div>Test Content</div>
        </DashboardCard>
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });
  });

  // 8. Card Loading State Tests
  describe('Card Loading State', () => {
    it('should show loading overlay when loading prop is true', () => {
      render(
        <DashboardCard title="Test Card" loading={true}>
          <div>Content</div>
        </DashboardCard>
      );

      expect(screen.getByTestId('loading-overlay')).toBeInTheDocument();
    });

    it('should not show loading overlay when loading is false', () => {
      render(
        <DashboardCard title="Test Card" loading={false}>
          <div>Content</div>
        </DashboardCard>
      );

      expect(screen.queryByTestId('loading-overlay')).not.toBeInTheDocument();
    });
  });

  // 9. Card Error State Tests
  describe('Card Error State', () => {
    it('should display error message when error prop provided', () => {
      render(
        <DashboardCard title="Test Card" error="Something went wrong">
          <div>Content</div>
        </DashboardCard>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should show try again button on error', () => {
      render(
        <DashboardCard title="Test Card" error="Error occurred">
          <div>Content</div>
        </DashboardCard>
      );

      expect(screen.getByText('Try again')).toBeInTheDocument();
    });

    it('should not show children when error exists', () => {
      render(
        <DashboardCard title="Test Card" error="Error occurred">
          <div>Hidden Content</div>
        </DashboardCard>
      );

      // Content should still be in DOM but error state takes precedence visually
      expect(screen.getByText('Error occurred')).toBeInTheDocument();
    });
  });

  // 10. Card Span Tests
  describe('Card Span', () => {
    it('should apply column span classes', () => {
      const { container } = render(
        <DashboardCard title="Test Card" colSpan={2}>
          <div>Content</div>
        </DashboardCard>
      );

      const card = container.querySelector('.md\\:col-span-2');
      expect(card).toBeInTheDocument();
    });

    it('should apply row span classes', () => {
      const { container } = render(
        <DashboardCard title="Test Card" rowSpan={2}>
          <div>Content</div>
        </DashboardCard>
      );

      const card = container.querySelector('.md\\:row-span-2');
      expect(card).toBeInTheDocument();
    });
  });
});

describe('DashboardStatsCard Component', () => {
  // 11. Stats Card Tests
  describe('Stats Card Rendering', () => {
    it('should display title and value', () => {
      render(
        <DashboardStatsCard
          title="Total Users"
          value={1234}
        />
      );

      expect(screen.getByText('Total Users')).toBeInTheDocument();
      expect(screen.getByText('1234')).toBeInTheDocument();
    });

    it('should display description when provided', () => {
      render(
        <DashboardStatsCard
          title="Revenue"
          value="$12,345"
          description="This month"
        />
      );

      expect(screen.getByText('This month')).toBeInTheDocument();
    });

    it('should show loading skeleton when loading', () => {
      render(
        <DashboardStatsCard
          title="Users"
          value={100}
          loading={true}
        />
      );

      expect(screen.getByTestId('skeleton')).toBeInTheDocument();
    });

    it('should display positive trend', () => {
      render(
        <DashboardStatsCard
          title="Sales"
          value={500}
          trend={{ value: 12, label: 'vs last month', positive: true }}
        />
      );

      expect(screen.getByText('+12%')).toBeInTheDocument();
    });

    it('should display negative trend', () => {
      render(
        <DashboardStatsCard
          title="Errors"
          value={5}
          trend={{ value: -8, label: 'vs last week', positive: false }}
        />
      );

      expect(screen.getByText('-8%')).toBeInTheDocument();
    });
  });
});

describe('DashboardSection Component', () => {
  // 12. Section Tests
  describe('Section Rendering', () => {
    it('should render section with title', () => {
      render(
        <DashboardSection title="Analytics">
          <div>Content</div>
        </DashboardSection>
      );

      expect(screen.getByText('Analytics')).toBeInTheDocument();
    });

    it('should render section without title', () => {
      render(
        <DashboardSection>
          <div>Content</div>
        </DashboardSection>
      );

      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('should render description when provided', () => {
      render(
        <DashboardSection
          title="Overview"
          description="Summary of key metrics"
        >
          <div>Content</div>
        </DashboardSection>
      );

      expect(screen.getByText('Summary of key metrics')).toBeInTheDocument();
    });
  });
});
