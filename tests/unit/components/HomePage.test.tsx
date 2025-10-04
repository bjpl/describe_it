import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import HomePage from '@/app/page';

// Mock the custom hooks
vi.mock('@/hooks/usePerformanceMonitor', () => ({
  usePerformanceMonitor: () => ({
    trackRenderStart: vi.fn(),
    trackRenderEnd: vi.fn(),
    performanceState: {
      renderTime: 50,
      memoryUsage: 1024,
      alerts: [],
      metrics: []
    },
    getPerformanceScore: vi.fn(() => 95)
  })
}));

vi.mock('@/hooks/useDescriptions', () => ({
  useDescriptions: () => ({
    descriptions: [],
    isLoading: false,
    error: null,
    generateDescription: vi.fn()
  })
}));

// Mock lazy components
vi.mock('@/components/LazyComponents', () => ({
  LazyWrapper: ({ children, fallback }: any) => children || fallback,
  preloadCriticalComponents: vi.fn()
}));

// Mock the lazy imported components
vi.mock('@/components/ImageSearch/ImageSearch', () => ({
  ImageSearch: ({ onImageSelect }: any) => (
    <div data-testid="image-search">
      <button onClick={() => onImageSelect?.({ id: '1', urls: { regular: 'test-url' } })}>
        Select Test Image
      </button>
    </div>
  )
}));

vi.mock('@/components/DescriptionPanel', () => ({
  DescriptionPanel: () => <div data-testid="description-panel">Description Panel</div>
}));

vi.mock('@/components/QAPanel', () => ({
  default: () => <div data-testid="qa-panel">QA Panel</div>
}));

vi.mock('@/components/EnhancedPhrasesPanel', () => ({
  default: () => <div data-testid="phrases-panel">Phrases Panel</div>
}));

vi.mock('@/components/SettingsModal', () => ({
  SettingsModal: ({ isOpen, onClose }: any) => 
    isOpen ? <div data-testid="settings-modal" onClick={onClose}>Settings Modal</div> : null
}));

// Mock providers
vi.mock('@/providers/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: any) => children
}));

describe('HomePage Component', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up after each test
    vi.resetAllMocks();
  });

  describe('Rendering', () => {
    it('should render the main page structure', () => {
      render(<HomePage />);
      
      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByText('Describe It')).toBeInTheDocument();
      expect(screen.getByText('Spanish Learning with AI')).toBeInTheDocument();
    });

    it('should render all navigation tabs', () => {
      render(<HomePage />);
      
      expect(screen.getByText('Search Images')).toBeInTheDocument();
      expect(screen.getByText('Descriptions')).toBeInTheDocument();
      expect(screen.getByText('Q&A Practice')).toBeInTheDocument();
      expect(screen.getByText('Vocabulary')).toBeInTheDocument();
    });

    it('should render settings button', () => {
      render(<HomePage />);
      
      const settingsButton = screen.getByRole('button', { name: /settings/i });
      expect(settingsButton).toBeInTheDocument();
    });

    it('should show performance indicator in development mode', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      render(<HomePage />);
      
      expect(screen.getByText(/Performance:/)).toBeInTheDocument();
      
      process.env.NODE_ENV = originalNodeEnv;
    });
  });

  describe('Tab Navigation', () => {
    it('should start with search tab active', () => {
      render(<HomePage />);
      
      expect(screen.getByTestId('image-search')).toBeInTheDocument();
    });

    it('should switch to description tab when clicked', async () => {
      render(<HomePage />);
      
      const descriptionTab = screen.getByText('Descriptions');
      await user.click(descriptionTab);
      
      // Should show empty state since no image is selected
      expect(screen.getByText('No image selected')).toBeInTheDocument();
    });

    it('should switch to Q&A tab when clicked', async () => {
      render(<HomePage />);
      
      const qaTab = screen.getByText('Q&A Practice');
      await user.click(qaTab);
      
      expect(screen.getByText('No image selected')).toBeInTheDocument();
    });

    it('should switch to vocabulary tab when clicked', async () => {
      render(<HomePage />);
      
      const vocabularyTab = screen.getByText('Vocabulary');
      await user.click(vocabularyTab);
      
      expect(screen.getByText('No image selected')).toBeInTheDocument();
    });
  });

  describe('Image Selection Flow', () => {
    it('should switch to description tab when image is selected', async () => {
      render(<HomePage />);
      
      // Start on search tab
      expect(screen.getByTestId('image-search')).toBeInTheDocument();
      
      // Select an image
      const selectButton = screen.getByText('Select Test Image');
      await user.click(selectButton);
      
      // Should automatically switch to description tab and show the panel
      await waitFor(() => {
        expect(screen.getByTestId('description-panel')).toBeInTheDocument();
      });
    });

    it('should show description panel when image is selected and description tab is active', async () => {
      render(<HomePage />);
      
      // Select an image first
      const selectButton = screen.getByText('Select Test Image');
      await user.click(selectButton);
      
      // Should show description panel
      await waitFor(() => {
        expect(screen.getByTestId('description-panel')).toBeInTheDocument();
      });
    });

    it('should show QA panel when image is selected and QA tab is clicked', async () => {
      render(<HomePage />);
      
      // Select an image
      const selectButton = screen.getByText('Select Test Image');
      await user.click(selectButton);
      
      // Switch to QA tab
      const qaTab = screen.getByText('Q&A Practice');
      await user.click(qaTab);
      
      await waitFor(() => {
        expect(screen.getByTestId('qa-panel')).toBeInTheDocument();
      });
    });
  });

  describe('Settings Modal', () => {
    it('should open settings modal when settings button is clicked', async () => {
      render(<HomePage />);
      
      const settingsButton = screen.getByRole('button', { name: /settings/i });
      await user.click(settingsButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('settings-modal')).toBeInTheDocument();
      });
    });

    it('should close settings modal when close is triggered', async () => {
      render(<HomePage />);
      
      // Open modal
      const settingsButton = screen.getByRole('button', { name: /settings/i });
      await user.click(settingsButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('settings-modal')).toBeInTheDocument();
      });
      
      // Close modal
      const modal = screen.getByTestId('settings-modal');
      await user.click(modal);
      
      await waitFor(() => {
        expect(screen.queryByTestId('settings-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('Empty States', () => {
    it('should show empty state for tabs that require an image when no image is selected', async () => {
      render(<HomePage />);
      
      const descriptionTab = screen.getByText('Descriptions');
      await user.click(descriptionTab);
      
      expect(screen.getByText('No image selected')).toBeInTheDocument();
      expect(screen.getByText(/Search and select an image/)).toBeInTheDocument();
    });

    it('should provide navigation back to search from empty state', async () => {
      render(<HomePage />);
      
      const descriptionTab = screen.getByText('Descriptions');
      await user.click(descriptionTab);
      
      const goToSearchButton = screen.getByText('Go to Search');
      await user.click(goToSearchButton);
      
      expect(screen.getByTestId('image-search')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle component initialization errors gracefully', () => {
      // Mock console.error to prevent test output pollution
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Component should still render even with initialization issues
      render(<HomePage />);
      
      expect(screen.getByText('Describe It')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Responsive Design', () => {
    it('should render navigation tabs in scrollable container', () => {
      render(<HomePage />);
      
      const nav = screen.getByRole('navigation');
      expect(nav).toBeInTheDocument();
      
      // Check for overflow-x-auto class in navigation
      const tabContainer = nav.querySelector('.overflow-x-auto');
      expect(tabContainer).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<HomePage />);
      
      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('should have focusable tab buttons', () => {
      render(<HomePage />);
      
      const tabs = screen.getAllByRole('button').filter(button => 
        ['Search Images', 'Descriptions', 'Q&A Practice', 'Vocabulary'].includes(button.textContent || '')
      );
      
      tabs.forEach(tab => {
        expect(tab).toHaveAttribute('tabIndex', expect.any(String));
      });
    });
  });

  describe('Performance', () => {
    it('should preload critical components on mount', async () => {
      const preloadSpy = vi.fn();
      vi.doMock('@/components/LazyComponents', () => ({
        LazyWrapper: ({ children }: any) => children,
        preloadCriticalComponents: preloadSpy
      }));
      
      render(<HomePage />);
      
      // Wait for useEffect to run
      await waitFor(() => {
        expect(preloadSpy).toHaveBeenCalled();
      });
    });

    it('should track render performance in development', () => {
      const trackRenderStartSpy = vi.fn();
      const trackRenderEndSpy = vi.fn();
      
      vi.doMock('@/hooks/usePerformanceMonitor', () => ({
        usePerformanceMonitor: () => ({
          trackRenderStart: trackRenderStartSpy,
          trackRenderEnd: trackRenderEndSpy,
          performanceState: { alerts: [] },
          getPerformanceScore: () => 95
        })
      }));
      
      render(<HomePage />);
      
      expect(trackRenderStartSpy).toHaveBeenCalled();
    });
  });
});
