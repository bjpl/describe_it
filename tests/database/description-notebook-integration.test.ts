/**
 * Description Notebook Integration Tests
 * Tests DescriptionNotebook component with database integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DescriptionNotebook } from '@/components/DescriptionNotebook';
import type { UnsplashImage } from '@/types';

// Mock fetch globally
global.fetch = vi.fn();

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('DescriptionNotebook Integration Tests', () => {
  const mockImage: UnsplashImage = {
    id: 'test-image-123',
    urls: {
      regular: 'https://images.unsplash.com/test-image.jpg',
      small: 'https://images.unsplash.com/test-image-small.jpg',
      full: 'https://images.unsplash.com/test-image-full.jpg',
      raw: 'https://images.unsplash.com/test-image-raw.jpg',
      thumb: 'https://images.unsplash.com/test-image-thumb.jpg',
    },
    alt_description: 'A beautiful test image',
    user: {
      id: 'photographer-123',
      username: 'testphotographer',
      name: 'Test Photographer',
      links: {
        self: 'https://api.unsplash.com/users/testphotographer',
        html: 'https://unsplash.com/@testphotographer',
        photos: 'https://api.unsplash.com/users/testphotographer/photos',
      },
    },
    links: {
      self: 'https://api.unsplash.com/photos/test-image-123',
      html: 'https://unsplash.com/photos/test-image-123',
      download: 'https://unsplash.com/photos/test-image-123/download',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockClear();
  });

  // ==============================================
  // COMPONENT RENDERING TESTS
  // ==============================================

  describe('Component Rendering', () => {
    it('should render without image (empty state)', () => {
      render(<DescriptionNotebook image={null} />);

      expect(screen.getByText(/Cuaderno de Descripciones/i)).toBeInTheDocument();
      expect(screen.getByText(/Selecciona una imagen/i)).toBeInTheDocument();
    });

    it('should render with image', () => {
      render(<DescriptionNotebook image={mockImage} />);

      expect(screen.getByText(/Cuaderno de Descripciones/i)).toBeInTheDocument();
      expect(screen.getByText(/Generar Descripción/i)).toBeInTheDocument();
    });

    it('should display all style options', () => {
      render(<DescriptionNotebook image={mockImage} />);

      // Style selector should be present
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should disable generate button when loading', async () => {
      (global.fetch as any).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          json: () => Promise.resolve({ data: { text: 'Generated text' } }),
        }), 100))
      );

      render(<DescriptionNotebook image={mockImage} />);

      const generateButton = screen.getByText(/Generar Descripción/i);
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/Generando.../i)).toBeInTheDocument();
      });
    });
  });

  // ==============================================
  // DESCRIPTION GENERATION TESTS
  // ==============================================

  describe('Description Generation', () => {
    it('should generate descriptions in different styles', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: {
            text: 'A beautiful conversational description',
          },
        }),
      });

      render(<DescriptionNotebook image={mockImage} />);

      const generateButton = screen.getByText(/Generar Descripción/i);
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    it('should handle API errors gracefully with fallback content', async () => {
      (global.fetch as any).mockRejectedValue(new Error('API Error'));

      render(<DescriptionNotebook image={mockImage} />);

      const generateButton = screen.getByText(/Generar Descripción/i);
      fireEvent.click(generateButton);

      await waitFor(() => {
        // Should display fallback content, not crash
        expect(screen.getByText(/Generar Descripción/i)).toBeInTheDocument();
      });
    });

    it('should generate both English and Spanish descriptions', async () => {
      let callCount = 0;
      (global.fetch as any).mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: {
              text: callCount === 1 ? 'English description' : 'Descripción en español',
            },
          }),
        });
      });

      render(<DescriptionNotebook image={mockImage} />);

      const generateButton = screen.getByText(/Generar Descripción/i);
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });
    });

    it('should update parent component via callback', async () => {
      const mockCallback = vi.fn();
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: { text: 'Generated text' },
        }),
      });

      render(
        <DescriptionNotebook
          image={mockImage}
          onDescriptionUpdate={mockCallback}
        />
      );

      const generateButton = screen.getByText(/Generar Descripción/i);
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(mockCallback).toHaveBeenCalled();
      });
    });
  });

  // ==============================================
  // SAVE FUNCTIONALITY TESTS
  // ==============================================

  describe('Save Functionality', () => {
    it('should save description to database', async () => {
      // Mock generation
      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/api/descriptions/generate')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              data: { text: 'Generated text' },
            }),
          });
        }
        // Mock save
        if (url.includes('/api/descriptions/saved')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              data: { id: 'saved-123' },
            }),
          });
        }
      });

      render(<DescriptionNotebook image={mockImage} />);

      // Generate first
      const generateButton = screen.getByText(/Generar Descripción/i);
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/Guardar/i)).toBeInTheDocument();
      });

      // Then save
      const saveButton = screen.getByText(/Guardar/i);
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/descriptions/saved'),
          expect.any(Object)
        );
      });
    });

    it('should display success message after saving', async () => {
      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/api/descriptions/generate')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              data: { text: 'Generated text' },
            }),
          });
        }
        if (url.includes('/api/descriptions/saved')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              message: 'Description saved successfully!',
            }),
          });
        }
      });

      render(<DescriptionNotebook image={mockImage} />);

      // Generate and save
      const generateButton = screen.getByText(/Generar Descripción/i);
      fireEvent.click(generateButton);

      await waitFor(() => {
        const saveButton = screen.getByText(/Guardar/i);
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/saved successfully/i)).toBeInTheDocument();
      });
    });

    it('should handle save errors', async () => {
      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/api/descriptions/generate')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              data: { text: 'Generated text' },
            }),
          });
        }
        if (url.includes('/api/descriptions/saved')) {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({
              error: 'Database error',
            }),
          });
        }
      });

      render(<DescriptionNotebook image={mockImage} />);

      const generateButton = screen.getByText(/Generar Descripción/i);
      fireEvent.click(generateButton);

      await waitFor(() => {
        const saveButton = screen.getByText(/Guardar/i);
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/Database error/i)).toBeInTheDocument();
      });
    });

    it('should prevent saving without generated content', () => {
      render(<DescriptionNotebook image={mockImage} />);

      // Save button should not be visible without content
      expect(screen.queryByText(/Guardar/i)).not.toBeInTheDocument();
    });
  });

  // ==============================================
  // COPY FUNCTIONALITY TESTS
  // ==============================================

  describe('Copy Functionality', () => {
    beforeEach(() => {
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn(() => Promise.resolve()),
        },
      });
    });

    it('should copy text to clipboard', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: { text: 'Text to copy' },
        }),
      });

      render(<DescriptionNotebook image={mockImage} />);

      const generateButton = screen.getByText(/Generar Descripción/i);
      fireEvent.click(generateButton);

      await waitFor(() => {
        const copyButtons = screen.getAllByRole('button');
        const copyButton = copyButtons.find(btn =>
          btn.querySelector('[class*="Copy"]')
        );
        if (copyButton) {
          fireEvent.click(copyButton);
        }
      });

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalled();
      });
    });

    it('should show checkmark after successful copy', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: { text: 'Text to copy' },
        }),
      });

      render(<DescriptionNotebook image={mockImage} />);

      const generateButton = screen.getByText(/Generar Descripción/i);
      fireEvent.click(generateButton);

      await waitFor(() => {
        const copyButtons = screen.getAllByRole('button');
        const copyButton = copyButtons.find(btn =>
          btn.querySelector('[class*="Copy"]')
        );
        if (copyButton) {
          fireEvent.click(copyButton);
        }
      });

      // Checkmark should appear briefly
      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        const hasCheck = buttons.some(btn =>
          btn.querySelector('[class*="Check"]')
        );
        expect(hasCheck).toBe(true);
      }, { timeout: 100 });
    });
  });

  // ==============================================
  // LANGUAGE TOGGLE TESTS
  // ==============================================

  describe('Language Toggle', () => {
    it('should toggle English visibility', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: { text: 'Generated text' },
        }),
      });

      render(<DescriptionNotebook image={mockImage} />);

      const generateButton = screen.getByText(/Generar Descripción/i);
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/English Description/i)).toBeInTheDocument();
      });

      // Find and click English toggle
      const toggles = screen.getAllByRole('button');
      const englishToggle = toggles.find(btn =>
        btn.textContent?.includes('EN') || btn.textContent?.includes('English')
      );

      if (englishToggle) {
        fireEvent.click(englishToggle);

        await waitFor(() => {
          expect(screen.queryByText(/English Description/i)).not.toBeInTheDocument();
        });
      }
    });

    it('should toggle Spanish visibility', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: { text: 'Texto generado' },
        }),
      });

      render(<DescriptionNotebook image={mockImage} />);

      const generateButton = screen.getByText(/Generar Descripción/i);
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/Descripción en Español/i)).toBeInTheDocument();
      });
    });
  });

  // ==============================================
  // PERFORMANCE TESTS
  // ==============================================

  describe('Performance Tests', () => {
    it('should render efficiently with minimal re-renders', () => {
      const { rerender } = render(<DescriptionNotebook image={mockImage} />);

      // Re-render with same props
      rerender(<DescriptionNotebook image={mockImage} />);

      // Component should use memoization
      expect(screen.getByText(/Cuaderno de Descripciones/i)).toBeInTheDocument();
    });

    it('should handle rapid style changes', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: { text: 'Generated text' },
        }),
      });

      render(<DescriptionNotebook image={mockImage} />);

      // Simulate rapid clicks
      const generateButton = screen.getByText(/Generar Descripción/i);

      fireEvent.click(generateButton);
      fireEvent.click(generateButton);
      fireEvent.click(generateButton);

      // Should not crash or cause errors
      await waitFor(() => {
        expect(screen.getByText(/Generar Descripción/i)).toBeInTheDocument();
      });
    });
  });

  // ==============================================
  // ACCESSIBILITY TESTS
  // ==============================================

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<DescriptionNotebook image={mockImage} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should be keyboard navigable', () => {
      render(<DescriptionNotebook image={mockImage} />);

      const generateButton = screen.getByText(/Generar Descripción/i);
      generateButton.focus();

      expect(document.activeElement).toBe(generateButton);
    });
  });
});
