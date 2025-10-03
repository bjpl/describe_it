import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../test-utils';
import userEvent from '@testing-library/user-event';
import WelcomeStep from '@/components/Onboarding/WelcomeStep';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>
  },
  AnimatePresence: ({ children }: any) => children
}));

describe('WelcomeStep', () => {
  const mockOnNext = vi.fn();
  const mockOnPrev = vi.fn();
  const mockOnSkip = vi.fn();

  const defaultProps = {
    onNext: mockOnNext,
    onPrev: mockOnPrev,
    onSkip: mockOnSkip
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render welcome header', () => {
      render(<WelcomeStep {...defaultProps} />);

      expect(screen.getByText(/Welcome to/i)).toBeInTheDocument();
      expect(screen.getByText(/Describe It!/i)).toBeInTheDocument();
    });

    it('should render welcome description', () => {
      render(<WelcomeStep {...defaultProps} />);

      expect(screen.getByText(/Transform your language learning with AI-powered visual descriptions/i)).toBeInTheDocument();
    });

    it('should render all feature cards', () => {
      render(<WelcomeStep {...defaultProps} />);

      expect(screen.getByText('Visual Learning')).toBeInTheDocument();
      expect(screen.getByText('Smart AI Descriptions')).toBeInTheDocument();
      expect(screen.getByText('Spaced Repetition')).toBeInTheDocument();
      expect(screen.getByText('Personalized Journey')).toBeInTheDocument();
    });

    it('should render feature descriptions', () => {
      render(<WelcomeStep {...defaultProps} />);

      expect(screen.getByText(/Learn with beautiful images that make vocabulary memorable/i)).toBeInTheDocument();
      expect(screen.getByText(/Get intelligent, context-aware descriptions powered by AI/i)).toBeInTheDocument();
      expect(screen.getByText(/Optimize your learning with scientifically proven techniques/i)).toBeInTheDocument();
      expect(screen.getByText(/Customize your experience to match your learning style/i)).toBeInTheDocument();
    });

    it('should render getting started section', () => {
      render(<WelcomeStep {...defaultProps} />);

      expect(screen.getByText("What's Next?")).toBeInTheDocument();
      expect(screen.getByText(/We'll guide you through setting up your API keys/i)).toBeInTheDocument();
    });

    it('should render setup steps badges', () => {
      render(<WelcomeStep {...defaultProps} />);

      expect(screen.getByText('API Setup')).toBeInTheDocument();
      expect(screen.getByText('Learning Preferences')).toBeInTheDocument();
      expect(screen.getByText('Feature Tour')).toBeInTheDocument();
    });

    it('should render statistics section', () => {
      render(<WelcomeStep {...defaultProps} />);

      expect(screen.getByText('10K+')).toBeInTheDocument();
      expect(screen.getByText('Active Learners')).toBeInTheDocument();
      expect(screen.getByText('95%')).toBeInTheDocument();
      expect(screen.getByText('Retention Rate')).toBeInTheDocument();
      expect(screen.getByText('50M+')).toBeInTheDocument();
      expect(screen.getByText('Images Described')).toBeInTheDocument();
    });
  });

  describe('Layout and Structure', () => {
    it('should render with proper flex layout', () => {
      const { container } = render(<WelcomeStep {...defaultProps} />);

      const mainDiv = container.firstChild as HTMLElement;
      expect(mainDiv).toHaveClass('flex', 'flex-col', 'h-full');
    });

    it('should have scrollable content area', () => {
      const { container } = render(<WelcomeStep {...defaultProps} />);

      const contentArea = container.querySelector('.overflow-y-auto');
      expect(contentArea).toBeInTheDocument();
    });

    it('should render features in grid layout', () => {
      const { container } = render(<WelcomeStep {...defaultProps} />);

      const grid = container.querySelector('.grid.md\\:grid-cols-2');
      expect(grid).toBeInTheDocument();
    });
  });

  describe('Feature Cards', () => {
    it('should render all four feature cards with icons', () => {
      const { container } = render(<WelcomeStep {...defaultProps} />);

      const featureCards = container.querySelectorAll('.bg-gray-50.dark\\:bg-gray-800');
      expect(featureCards.length).toBeGreaterThanOrEqual(4);
    });

    it('should have proper styling for feature cards', () => {
      const { container } = render(<WelcomeStep {...defaultProps} />);

      const firstCard = screen.getByText('Visual Learning').closest('div[class*="bg-gray-50"]');
      expect(firstCard).toBeInTheDocument();
      expect(firstCard).toHaveClass('p-6');
    });

    it('should display feature icons with gradient backgrounds', () => {
      const { container } = render(<WelcomeStep {...defaultProps} />);

      const gradientBgs = container.querySelectorAll('.bg-gradient-to-br.from-blue-500.to-purple-600');
      expect(gradientBgs.length).toBeGreaterThan(0);
    });
  });

  describe('Interactive Elements', () => {
    it('should have hover effects on feature cards', () => {
      const { container } = render(<WelcomeStep {...defaultProps} />);

      const featureCard = screen.getByText('Visual Learning').closest('div[class*="hover:shadow-lg"]');
      expect(featureCard).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      const { container } = render(<WelcomeStep {...defaultProps} />);

      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toBeInTheDocument();

      const h3Elements = container.querySelectorAll('h3');
      expect(h3Elements.length).toBeGreaterThan(0);

      const h4Element = screen.getByText("What's Next?");
      expect(h4Element.tagName).toBe('H4');
    });

    it('should have readable text contrast', () => {
      const { container } = render(<WelcomeStep {...defaultProps} />);

      const textElements = container.querySelectorAll('.text-gray-900, .text-gray-600');
      expect(textElements.length).toBeGreaterThan(0);
    });

    it('should support dark mode classes', () => {
      const { container } = render(<WelcomeStep {...defaultProps} />);

      const darkModeElements = container.querySelectorAll('[class*="dark:"]');
      expect(darkModeElements.length).toBeGreaterThan(0);
    });
  });

  describe('Content Validation', () => {
    it('should display correct statistics', () => {
      render(<WelcomeStep {...defaultProps} />);

      const stats = [
        { value: '10K+', label: 'Active Learners' },
        { value: '95%', label: 'Retention Rate' },
        { value: '50M+', label: 'Images Described' }
      ];

      stats.forEach(stat => {
        expect(screen.getByText(stat.value)).toBeInTheDocument();
        expect(screen.getByText(stat.label)).toBeInTheDocument();
      });
    });

    it('should display all feature benefits', () => {
      render(<WelcomeStep {...defaultProps} />);

      const features = [
        'Visual Learning',
        'Smart AI Descriptions',
        'Spaced Repetition',
        'Personalized Journey'
      ];

      features.forEach(feature => {
        expect(screen.getByText(feature)).toBeInTheDocument();
      });
    });

    it('should show onboarding time estimate', () => {
      render(<WelcomeStep {...defaultProps} />);

      expect(screen.getByText(/The entire process takes just 2-3 minutes/i)).toBeInTheDocument();
    });
  });

  describe('Styling and Theming', () => {
    it('should apply gradient to branding text', () => {
      const { container } = render(<WelcomeStep {...defaultProps} />);

      const brandingText = screen.getByText('Describe It!');
      expect(brandingText).toHaveClass('bg-gradient-to-r', 'from-blue-600', 'to-purple-600', 'bg-clip-text', 'text-transparent');
    });

    it('should have responsive grid layout', () => {
      const { container } = render(<WelcomeStep {...defaultProps} />);

      const grid = container.querySelector('.md\\:grid-cols-2');
      expect(grid).toBeInTheDocument();
    });

    it('should apply proper spacing', () => {
      const { container } = render(<WelcomeStep {...defaultProps} />);

      const contentArea = container.querySelector('.p-8');
      expect(contentArea).toBeInTheDocument();
    });
  });

  describe('Custom Class Name', () => {
    it('should apply custom className prop', () => {
      const { container } = render(<WelcomeStep {...defaultProps} className="custom-class" />);

      const mainDiv = container.firstChild as HTMLElement;
      expect(mainDiv).toHaveClass('custom-class');
    });

    it('should merge custom className with default classes', () => {
      const { container } = render(<WelcomeStep {...defaultProps} className="custom-class" />);

      const mainDiv = container.firstChild as HTMLElement;
      expect(mainDiv).toHaveClass('custom-class', 'flex', 'flex-col', 'h-full');
    });
  });

  describe('Responsive Design', () => {
    it('should have responsive text sizes', () => {
      const { container } = render(<WelcomeStep {...defaultProps} />);

      const heading = screen.getByText(/Welcome to/i).closest('h1');
      expect(heading).toHaveClass('text-4xl');
    });

    it('should have responsive padding', () => {
      const { container } = render(<WelcomeStep {...defaultProps} />);

      const sections = container.querySelectorAll('.p-6');
      expect(sections.length).toBeGreaterThan(0);
    });

    it('should have max-width constraints for readability', () => {
      const { container } = render(<WelcomeStep {...defaultProps} />);

      const maxWidthElements = container.querySelectorAll('.max-w-2xl, .max-w-4xl');
      expect(maxWidthElements.length).toBeGreaterThan(0);
    });
  });

  describe('Visual Elements', () => {
    it('should render icon containers with proper styling', () => {
      const { container } = render(<WelcomeStep {...defaultProps} />);

      const iconContainers = container.querySelectorAll('.w-12.h-12, .w-8.h-8');
      expect(iconContainers.length).toBeGreaterThan(0);
    });

    it('should render rounded elements', () => {
      const { container } = render(<WelcomeStep {...defaultProps} />);

      const roundedElements = container.querySelectorAll('[class*="rounded"]');
      expect(roundedElements.length).toBeGreaterThan(0);
    });

    it('should have border styling on info box', () => {
      const { container } = render(<WelcomeStep {...defaultProps} />);

      const infoBox = screen.getByText("What's Next?").closest('div[class*="border"]');
      expect(infoBox).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render without performance issues', () => {
      const startTime = performance.now();
      render(<WelcomeStep {...defaultProps} />);
      const endTime = performance.now();

      // Should render in less than 100ms
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should render all content in a single pass', () => {
      const { container } = render(<WelcomeStep {...defaultProps} />);

      // Check that all main sections are present
      expect(screen.getByText(/Welcome to/i)).toBeInTheDocument();
      expect(screen.getByText('Visual Learning')).toBeInTheDocument();
      expect(screen.getByText("What's Next?")).toBeInTheDocument();
      expect(screen.getByText('10K+')).toBeInTheDocument();
    });
  });

  describe('Props Handling', () => {
    it('should accept and ignore unused props gracefully', () => {
      expect(() => {
        render(<WelcomeStep {...defaultProps} isLoading={true} />);
      }).not.toThrow();
    });

    it('should work without optional props', () => {
      expect(() => {
        render(<WelcomeStep onNext={mockOnNext} />);
      }).not.toThrow();
    });
  });
});
