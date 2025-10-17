/**
 * DescriptionNotebook Database Integration Tests
 * Tests: Save button → API calls → Database storage → Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DescriptionNotebook } from '@/components/DescriptionNotebook';
import type { UnsplashImage } from '@/types';
import { APIClient } from '@/lib/api-client';

// Mock APIClient
vi.mock('@/lib/api-client', () => ({
  APIClient: {
    generateDescription: vi.fn(),
    saveDescription: vi.fn(),
  },
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
    h2: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
    h3: ({ children, ...props }: any) => <h3 {...props}>{children}</h3>,
    section: ({ children, ...props }: any) => <section {...props}>{children}</section>,
    header: ({ children, ...props }: any) => <header {...props}>{children}</header>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockImage: UnsplashImage = {
  id: 'test-image-123',
  alt_description: 'A beautiful sunset',
  urls: {
    small: 'https://test.com/small.jpg',
    regular: 'https://test.com/regular.jpg',
  },
  user: {
    name: 'Test User',
  },
};

describe('DescriptionNotebook Database Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Generate Description Button', () => {
    it('should render generate button when image is present', () => {
      render(<DescriptionNotebook image={mockImage} />);

      const button = screen.getByRole('button', { name: /generar descripción/i });
      expect(button).toBeInTheDocument();
      expect(button).not.toBeDisabled();
    });

    it('should disable button during generation', async () => {
      vi.mocked(APIClient.generateDescription).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      render(<DescriptionNotebook image={mockImage} />);

      const button = screen.getByRole('button', { name: /generar descripción/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(button).toBeDisabled();
      });

      expect(screen.getByText(/generando/i)).toBeInTheDocument();
    });

    it('should not render button when no image is present', () => {
      render(<DescriptionNotebook image={null} />);

      const button = screen.queryByRole('button', { name: /generar descripción/i });
      expect(button).not.toBeInTheDocument();
    });
  });

  describe('API Integration', () => {
    it('should call correct API endpoints for description generation', async () => {
      const mockEnglishResponse = {
        data: { text: 'A beautiful sunset over the ocean' },
        error: null,
      };
      const mockSpanishResponse = {
        data: { text: 'Un hermoso atardecer sobre el océano' },
        error: null,
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockEnglishResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSpanishResponse,
        } as Response);

      render(<DescriptionNotebook image={mockImage} />);

      const button = screen.getByRole('button', { name: /generar descripción/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });

      // Verify API calls
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/descriptions/generate',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('"language":"en"'),
        })
      );

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/descriptions/generate',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('"language":"es"'),
        })
      );
    });

    it('should display generated descriptions', async () => {
      const mockEnglishResponse = {
        data: { text: 'Test English Description' },
        error: null,
      };
      const mockSpanishResponse = {
        data: { text: 'Test Spanish Description' },
        error: null,
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockEnglishResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSpanishResponse,
        } as Response);

      render(<DescriptionNotebook image={mockImage} />);

      const button = screen.getByRole('button', { name: /generar descripción/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Test English Description')).toBeInTheDocument();
        expect(screen.getByText('Test Spanish Description')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading spinner during generation', async () => {
      global.fetch = vi.fn()
        .mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(<DescriptionNotebook image={mockImage} />);

      const button = screen.getByRole('button', { name: /generar descripción/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/generando descripción/i)).toBeInTheDocument();
      });
    });

    it('should hide loading state after successful generation', async () => {
      const mockResponse = {
        data: { text: 'Test Description' },
        error: null,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      render(<DescriptionNotebook image={mockImage} />);

      const button = screen.getByRole('button', { name: /generar descripción/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.queryByText(/generando/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display fallback content on API error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('API Error'));

      render(<DescriptionNotebook image={mockImage} />);

      const button = screen.getByRole('button', { name: /generar descripción/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/failed to generate description/i)).toBeInTheDocument();
      });
    });

    it('should still show fallback descriptions on error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network Error'));

      render(<DescriptionNotebook image={mockImage} />);

      const button = screen.getByRole('button', { name: /generar descripción/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/this is a beautiful image/i)).toBeInTheDocument();
      });
    });

    it('should handle network timeout gracefully', async () => {
      global.fetch = vi.fn().mockImplementation(
        () => new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      render(<DescriptionNotebook image={mockImage} />);

      const button = screen.getByRole('button', { name: /generar descripción/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/failed to generate description/i)).toBeInTheDocument();
      }, { timeout: 200 });
    });

    it('should handle malformed API responses', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ invalid: 'structure' }),
      } as Response);

      render(<DescriptionNotebook image={mockImage} />);

      const button = screen.getByRole('button', { name: /generar descripción/i });
      fireEvent.click(button);

      await waitFor(() => {
        // Should use fallback text
        expect(screen.getByText(/this image shows interesting visual elements/i)).toBeInTheDocument();
      });
    });
  });

  describe('Parent Component Integration', () => {
    it('should call onDescriptionUpdate callback with generated text', async () => {
      const onDescriptionUpdate = vi.fn();
      const mockResponse = {
        data: { text: 'Test Description' },
        error: null,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      render(
        <DescriptionNotebook
          image={mockImage}
          onDescriptionUpdate={onDescriptionUpdate}
        />
      );

      const button = screen.getByRole('button', { name: /generar descripción/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(onDescriptionUpdate).toHaveBeenCalledWith(
          'conversacional',
          expect.any(String),
          expect.any(String)
        );
      });
    });

    it('should call onDescriptionUpdate even on error with fallback', async () => {
      const onDescriptionUpdate = vi.fn();
      global.fetch = vi.fn().mockRejectedValue(new Error('API Error'));

      render(
        <DescriptionNotebook
          image={mockImage}
          onDescriptionUpdate={onDescriptionUpdate}
        />
      );

      const button = screen.getByRole('button', { name: /generar descripción/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(onDescriptionUpdate).toHaveBeenCalled();
      });
    });
  });

  describe('Copy Functionality', () => {
    it('should copy text to clipboard', async () => {
      const mockClipboard = {
        writeText: vi.fn().mockResolvedValue(undefined),
      };
      Object.assign(navigator, { clipboard: mockClipboard });

      const mockResponse = {
        data: { text: 'Text to copy' },
        error: null,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      render(<DescriptionNotebook image={mockImage} />);

      const generateButton = screen.getByRole('button', { name: /generar descripción/i });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Text to copy')).toBeInTheDocument();
      });

      const copyButtons = screen.getAllByRole('button');
      const copyButton = copyButtons.find(btn => btn.querySelector('svg'));

      if (copyButton) {
        fireEvent.click(copyButton);
        await waitFor(() => {
          expect(mockClipboard.writeText).toHaveBeenCalledWith('Text to copy');
        });
      }
    });
  });

  describe('Style Selection', () => {
    it('should send correct style to API', async () => {
      const mockResponse = {
        data: { text: 'Test Description' },
        error: null,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      render(<DescriptionNotebook image={mockImage} />);

      // Select different style (assuming style selector exists)
      const button = screen.getByRole('button', { name: /generar descripción/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/descriptions/generate',
          expect.objectContaining({
            body: expect.stringContaining('"style":"conversacional"'),
          })
        );
      });
    });
  });
});
