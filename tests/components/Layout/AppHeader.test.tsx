import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AppHeader } from '@/components/AppHeader';
import '@testing-library/jest-dom';

// Mock dependencies
vi.mock('@/components/SessionReportModal', () => ({
  SessionReportModal: ({ isOpen, onClose }: any) =>
    isOpen ? <div data-testid="session-report-modal" onClick={onClose}>Session Report</div> : null
}));

vi.mock('@/components/ExportModal', () => ({
  __esModule: true,
  default: ({ isOpen, onClose }: any) =>
    isOpen ? <div data-testid="export-modal" onClick={onClose}>Export Modal</div> : null
}));

describe('AppHeader Component', () => {
  const defaultProps = {
    canExport: true,
    onExport: vi.fn(),
    onToggleSettings: vi.fn(),
    onToggleInfo: vi.fn(),
    sessionData: {
      descriptions: { 'img-1': 'Test description' },
      phrases: [],
      responses: [],
      searchHistory: ['test query']
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Logo Display Tests
  describe('Logo Display', () => {
    it('should display the app logo/title', () => {
      render(<AppHeader {...defaultProps} />);
      expect(screen.getByText('Describe It')).toBeInTheDocument();
    });

    it('should display the app tagline', () => {
      render(<AppHeader {...defaultProps} />);
      expect(screen.getByText('Spanish Learning through Images')).toBeInTheDocument();
    });

    it('should render logo in header element', () => {
      const { container } = render(<AppHeader {...defaultProps} />);
      const header = container.querySelector('header');
      expect(header).toBeInTheDocument();
      expect(header).toHaveClass('bg-white');
    });
  });

  // 2. Button Rendering Tests
  describe('Action Buttons', () => {
    it('should render analytics report button', () => {
      render(<AppHeader {...defaultProps} />);
      const reportButton = screen.getByTitle('View Session Analytics Report');
      expect(reportButton).toBeInTheDocument();
    });

    it('should render export button', () => {
      render(<AppHeader {...defaultProps} />);
      const exportButton = screen.getByTitle(/Export session data/);
      expect(exportButton).toBeInTheDocument();
    });

    it('should render settings button', () => {
      render(<AppHeader {...defaultProps} />);
      const settingsButton = screen.getByTitle('Settings');
      expect(settingsButton).toBeInTheDocument();
    });

    it('should render info/about button', () => {
      render(<AppHeader {...defaultProps} />);
      const infoButton = screen.getByTitle('About');
      expect(infoButton).toBeInTheDocument();
    });
  });

  // 3. Export Functionality Tests
  describe('Export Functionality', () => {
    it('should enable export button when canExport is true', () => {
      render(<AppHeader {...defaultProps} canExport={true} />);
      const exportButton = screen.getByTitle(/Export session data/);
      expect(exportButton).not.toBeDisabled();
    });

    it('should disable export button when canExport is false', () => {
      render(<AppHeader {...defaultProps} canExport={false} />);
      const exportButton = screen.getByTitle(/Use the app to generate/);
      expect(exportButton).toBeDisabled();
    });

    it('should show export modal when export button clicked', async () => {
      render(<AppHeader {...defaultProps} />);
      const exportButton = screen.getByTitle(/Export session data/);

      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(screen.getByTestId('export-modal')).toBeInTheDocument();
      });
    });

    it('should close export modal when close is triggered', async () => {
      render(<AppHeader {...defaultProps} />);
      const exportButton = screen.getByTitle(/Export session data/);

      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(screen.getByTestId('export-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('export-modal'));

      await waitFor(() => {
        expect(screen.queryByTestId('export-modal')).not.toBeInTheDocument();
      });
    });

    it('should not open export modal when disabled', () => {
      render(<AppHeader {...defaultProps} canExport={false} />);
      const exportButton = screen.getByTitle(/Use the app to generate/);

      fireEvent.click(exportButton);

      expect(screen.queryByTestId('export-modal')).not.toBeInTheDocument();
    });
  });

  // 4. Session Report Modal Tests
  describe('Session Report Modal', () => {
    it('should open session report modal when analytics button clicked', async () => {
      render(<AppHeader {...defaultProps} />);
      const reportButton = screen.getByTitle('View Session Analytics Report');

      fireEvent.click(reportButton);

      await waitFor(() => {
        expect(screen.getByTestId('session-report-modal')).toBeInTheDocument();
      });
    });

    it('should close session report modal', async () => {
      render(<AppHeader {...defaultProps} />);
      const reportButton = screen.getByTitle('View Session Analytics Report');

      fireEvent.click(reportButton);

      await waitFor(() => {
        expect(screen.getByTestId('session-report-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('session-report-modal'));

      await waitFor(() => {
        expect(screen.queryByTestId('session-report-modal')).not.toBeInTheDocument();
      });
    });
  });

  // 5. Settings Button Tests
  describe('Settings Button', () => {
    it('should call onToggleSettings when settings button clicked', () => {
      render(<AppHeader {...defaultProps} />);
      const settingsButton = screen.getByTitle('Settings');

      fireEvent.click(settingsButton);

      expect(defaultProps.onToggleSettings).toHaveBeenCalledTimes(1);
    });

    it('should have proper styling for settings button', () => {
      render(<AppHeader {...defaultProps} />);
      const settingsButton = screen.getByTitle('Settings');

      expect(settingsButton).toHaveClass('p-2');
      expect(settingsButton).toHaveClass('rounded-lg');
    });
  });

  // 6. Info Button Tests
  describe('Info Button', () => {
    it('should call onToggleInfo when info button clicked', () => {
      render(<AppHeader {...defaultProps} />);
      const infoButton = screen.getByTitle('About');

      fireEvent.click(infoButton);

      expect(defaultProps.onToggleInfo).toHaveBeenCalledTimes(1);
    });

    it('should display info icon', () => {
      const { container } = render(<AppHeader {...defaultProps} />);
      const infoButton = screen.getByTitle('About');
      const icon = infoButton.querySelector('svg');

      expect(icon).toBeInTheDocument();
    });
  });

  // 7. Dark Mode Tests
  describe('Dark Mode Support', () => {
    it('should have dark mode classes', () => {
      const { container } = render(<AppHeader {...defaultProps} />);
      const header = container.querySelector('header');

      expect(header).toHaveClass('dark:bg-gray-800');
    });

    it('should apply dark mode to text elements', () => {
      render(<AppHeader {...defaultProps} />);
      const title = screen.getByText('Describe It');

      expect(title).toHaveClass('dark:text-blue-400');
    });
  });

  // 8. Responsive Design Tests
  describe('Responsive Layout', () => {
    it('should render with responsive container', () => {
      const { container } = render(<AppHeader {...defaultProps} />);
      const mainContainer = container.querySelector('.max-w-7xl');

      expect(mainContainer).toBeInTheDocument();
      expect(mainContainer).toHaveClass('mx-auto');
    });

    it('should have responsive padding', () => {
      const { container } = render(<AppHeader {...defaultProps} />);
      const mainContainer = container.querySelector('.max-w-7xl');

      expect(mainContainer).toHaveClass('sm:px-6');
      expect(mainContainer).toHaveClass('lg:px-8');
    });
  });

  // 9. Accessibility Tests
  describe('Accessibility', () => {
    it('should have accessible button titles', () => {
      render(<AppHeader {...defaultProps} />);

      expect(screen.getByTitle('View Session Analytics Report')).toBeInTheDocument();
      expect(screen.getByTitle('Settings')).toBeInTheDocument();
      expect(screen.getByTitle('About')).toBeInTheDocument();
    });

    it('should have focus ring on buttons', () => {
      render(<AppHeader {...defaultProps} />);
      const buttons = screen.getAllByRole('button');

      buttons.forEach(button => {
        expect(button).toHaveClass('focus:outline-none');
        expect(button).toHaveClass('focus:ring-2');
      });
    });

    it('should indicate disabled state for export button', () => {
      render(<AppHeader {...defaultProps} canExport={false} />);
      const exportButton = screen.getByTitle(/Use the app to generate/);

      expect(exportButton).toHaveClass('disabled:opacity-50');
      expect(exportButton).toHaveClass('disabled:cursor-not-allowed');
    });
  });

  // 10. Session Data Processing Tests
  describe('Session Data Processing', () => {
    it('should handle empty session data', () => {
      render(<AppHeader {...defaultProps} sessionData={undefined} />);
      const exportButton = screen.getByTitle(/Export session data/);

      fireEvent.click(exportButton);

      // Should still open modal even with no data
      expect(screen.queryByTestId('export-modal')).toBeInTheDocument();
    });

    it('should process vocabulary items correctly', () => {
      const sessionData = {
        phrases: [
          {
            spanish_text: 'hola',
            english_translation: 'hello',
            part_of_speech: 'interjection',
            difficulty_level: 'beginner'
          }
        ],
        descriptions: {},
        responses: [],
        searchHistory: []
      };

      render(<AppHeader {...defaultProps} sessionData={sessionData} />);

      // Component should render without errors
      expect(screen.getByText('Describe It')).toBeInTheDocument();
    });

    it('should process Q&A responses correctly', () => {
      const sessionData = {
        phrases: [],
        descriptions: {},
        responses: [
          {
            question: 'What is this?',
            correct_answer: 'A dog',
            user_answer: 'A dog',
            timestamp: new Date().toISOString()
          }
        ],
        searchHistory: []
      };

      render(<AppHeader {...defaultProps} sessionData={sessionData} />);

      expect(screen.getByText('Describe It')).toBeInTheDocument();
    });
  });
});
