import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import Home from '@/app/page';

// Mock the next/navigation module
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
}));

// Mock API responses
global.fetch = vi.fn();

const mockSuccessfulImageSearch = {
  results: [
    {
      id: 'test-image-1',
      urls: {
        regular: 'https://test.com/image1.jpg',
        small: 'https://test.com/image1-small.jpg',
      },
      alt_description: 'Test image 1',
      description: 'A beautiful test image',
    },
  ],
  total: 1,
  totalPages: 1,
};

const mockDescriptionResponse = {
  success: true,
  data: {
    text: 'Generated description text',
  },
};

describe('Home Page - User Flow Tests', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.resetAllMocks();
    
    // Mock successful API responses by default
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/images/search')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSuccessfulImageSearch),
        });
      }
      if (url.includes('/api/descriptions/generate')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockDescriptionResponse),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });

    // Mock window.matchMedia for dark mode
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Image Search Flow', () => {
    it('should perform complete image search workflow', async () => {
      const user = userEvent.setup();
      render(<Home />);

      // Step 1: Enter search query
      const searchInput = screen.getByPlaceholderText('Search for images...');
      await user.type(searchInput, 'beautiful landscape');
      
      expect(searchInput).toHaveValue('beautiful landscape');

      // Step 2: Click search button
      const searchButton = screen.getByRole('button', { name: /search for images/i });
      await user.click(searchButton);

      // Step 3: Verify loading state
      await waitFor(() => {
        expect(screen.getByText('Searching...')).toBeInTheDocument();
      });

      // Step 4: Wait for search results
      await waitFor(() => {
        expect(screen.getByText('Search Results')).toBeInTheDocument();
      });

      // Verify API was called with correct parameters
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/images/search?query=beautiful%20landscape')
      );
    });

    it('should handle Enter key in search input', async () => {
      const user = userEvent.setup();
      render(<Home />);

      const searchInput = screen.getByPlaceholderText('Search for images...');
      await user.type(searchInput, 'test query');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/images/search?query=test%20query')
        );
      });
    });

    it('should show error for empty search', async () => {
      const user = userEvent.setup();
      render(<Home />);

      const searchButton = screen.getByRole('button', { name: /search for images/i });
      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText('Please enter a search term')).toBeInTheDocument();
      });
    });

    it('should handle search API failure gracefully', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));
      
      const user = userEvent.setup();
      render(<Home />);

      const searchInput = screen.getByPlaceholderText('Search for images...');
      await user.type(searchInput, 'test');
      
      const searchButton = screen.getByRole('button', { name: /search for images/i });
      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to search images. Please try again.')).toBeInTheDocument();
      });
    });

    it('should handle empty search results', async () => {
      (global.fetch as any).mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ results: [], total: 0 }),
        })
      );

      const user = userEvent.setup();
      render(<Home />);

      const searchInput = screen.getByPlaceholderText('Search for images...');
      await user.type(searchInput, 'nonexistent');
      
      const searchButton = screen.getByRole('button', { name: /search for images/i });
      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText('No images found. Try a different search term.')).toBeInTheDocument();
      });
    });
  });

  describe('Description Generation Flow', () => {
    it('should complete description generation workflow', async () => {
      const user = userEvent.setup();
      render(<Home />);

      // First search for images
      const searchInput = screen.getByPlaceholderText('Search for images...');
      await user.type(searchInput, 'test');
      
      const searchButton = screen.getByRole('button', { name: /search for images/i });
      await user.click(searchButton);

      // Wait for image to be selected
      await waitFor(() => {
        expect(screen.getByText('Search Results')).toBeInTheDocument();
      });

      // Generate descriptions
      const generateButton = screen.getByRole('button', { name: /generate description/i });
      await user.click(generateButton);

      // Verify loading state
      await waitFor(() => {
        expect(screen.getByText('Generating...')).toBeInTheDocument();
      });

      // Verify descriptions are generated
      await waitFor(() => {
        expect(screen.getByText('Generated description text')).toBeInTheDocument();
      });

      // Verify both API calls were made
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

    it('should handle description generation failure', async () => {
      const user = userEvent.setup();
      render(<Home />);

      // Mock successful search but failed description generation
      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/api/images/search')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockSuccessfulImageSearch),
          });
        }
        if (url.includes('/api/descriptions/generate')) {
          return Promise.reject(new Error('API Error'));
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      // Search for images first
      const searchInput = screen.getByPlaceholderText('Search for images...');
      await user.type(searchInput, 'test');
      await user.click(screen.getByRole('button', { name: /search for images/i }));

      // Wait for results and generate descriptions
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /generate description/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /generate description/i }));

      // Should fall back to demo descriptions
      await waitFor(() => {
        expect(screen.getByText(/using demo descriptions/i)).toBeInTheDocument();
      });
    });
  });

  describe('Style Selector Changes', () => {
    it('should change description style and clear previous descriptions', async () => {
      const user = userEvent.setup();
      render(<Home />);

      // Search and select image first
      const searchInput = screen.getByPlaceholderText('Search for images...');
      await user.type(searchInput, 'test');
      await user.click(screen.getByRole('button', { name: /search for images/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /generate description/i })).toBeInTheDocument();
      });

      // Generate initial descriptions
      await user.click(screen.getByRole('button', { name: /generate description/i }));
      await waitFor(() => {
        expect(screen.getByText('Generated description text')).toBeInTheDocument();
      });

      // Change style
      const styleSelect = screen.getByDisplayValue('Conversacional (Conversational)');
      await user.selectOptions(styleSelect, 'poetico');

      // Descriptions should be cleared (useEffect dependency on selectedStyle)
      expect(screen.queryByText('Generated description text')).not.toBeInTheDocument();
    });

    it('should include selected style in API request', async () => {
      const user = userEvent.setup();
      render(<Home />);

      // Search for images
      const searchInput = screen.getByPlaceholderText('Search for images...');
      await user.type(searchInput, 'test');
      await user.click(screen.getByRole('button', { name: /search for images/i }));

      await waitFor(() => {
        expect(screen.getByDisplayValue('Conversacional (Conversational)')).toBeInTheDocument();
      });

      // Change to academic style
      const styleSelect = screen.getByDisplayValue('Conversacional (Conversational)');
      await user.selectOptions(styleSelect, 'academico');

      // Generate descriptions
      await user.click(screen.getByRole('button', { name: /generate description/i }));

      // Verify API was called with academic style
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/descriptions/generate',
          expect.objectContaining({
            body: expect.stringContaining('"style":"academico"'),
          })
        );
      });
    });
  });

  describe('Dark Mode Functionality', () => {
    it('should initialize dark mode from system preference', () => {
      // Mock system dark mode preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-color-scheme: dark)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      render(<Home />);

      // Should have dark class applied
      expect(document.documentElement).toHaveClass('dark');
    });

    it('should toggle dark mode when button is clicked', async () => {
      const user = userEvent.setup();
      render(<Home />);

      // Open settings modal
      const settingsButton = screen.getByTitle('Settings');
      await user.click(settingsButton);

      // Toggle dark mode
      const darkModeToggle = screen.getByRole('switch', { name: /toggle dark mode/i });
      await user.click(darkModeToggle);

      // Should toggle dark class
      expect(document.documentElement).toHaveClass('dark');
    });

    it('should persist dark mode preference in localStorage', async () => {
      const user = userEvent.setup();
      
      // Mock localStorage
      const localStorageMock = {
        setItem: vi.fn(),
        getItem: vi.fn(),
        removeItem: vi.fn(),
      };
      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
        writable: true,
      });

      render(<Home />);

      // Open settings and toggle dark mode
      const settingsButton = screen.getByTitle('Settings');
      await user.click(settingsButton);

      const darkModeToggle = screen.getByRole('switch', { name: /toggle dark mode/i });
      await user.click(darkModeToggle);

      // Should save to localStorage
      expect(localStorageMock.setItem).toHaveBeenCalledWith('darkMode', 'true');
    });
  });

  describe('Export Functionality', () => {
    it('should disable export button when no descriptions are generated', () => {
      render(<Home />);

      const exportButton = screen.getByTitle(/generate descriptions first to export/i);
      expect(exportButton).toBeDisabled();
    });

    it('should enable export after descriptions are generated', async () => {
      const user = userEvent.setup();
      render(<Home />);

      // Search, generate descriptions
      const searchInput = screen.getByPlaceholderText('Search for images...');
      await user.type(searchInput, 'test');
      await user.click(screen.getByRole('button', { name: /search for images/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /generate description/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /generate description/i }));

      await waitFor(() => {
        expect(screen.getByText('Generated description text')).toBeInTheDocument();
      });

      // Export button should now be enabled
      const exportButton = screen.getByTitle(/export data/i);
      expect(exportButton).not.toBeDisabled();
    });
  });

  describe('Tab Navigation', () => {
    it('should switch between tabs correctly', async () => {
      const user = userEvent.setup();
      render(<Home />);

      // Should start on descriptions tab
      expect(screen.getByRole('tab', { name: /descriptions/i })).toHaveAttribute('data-state', 'active');

      // Switch to Q&A tab
      await user.click(screen.getByRole('tab', { name: /q&a/i }));
      expect(screen.getByRole('tab', { name: /q&a/i })).toHaveAttribute('data-state', 'active');

      // Switch to phrases tab
      await user.click(screen.getByRole('tab', { name: /phrases & vocabulary/i }));
      expect(screen.getByRole('tab', { name: /phrases & vocabulary/i })).toHaveAttribute('data-state', 'active');
    });
  });

  describe('Modal Functionality', () => {
    it('should open and close settings modal', async () => {
      const user = userEvent.setup();
      render(<Home />);

      // Open settings
      const settingsButton = screen.getByTitle('Settings');
      await user.click(settingsButton);

      expect(screen.getByRole('heading', { name: /settings/i })).toBeInTheDocument();

      // Close settings
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(screen.queryByRole('heading', { name: /settings/i })).not.toBeInTheDocument();
    });

    it('should open and close info modal', async () => {
      const user = userEvent.setup();
      render(<Home />);

      // Open info
      const infoButton = screen.getByTitle('About');
      await user.click(infoButton);

      expect(screen.getByRole('heading', { name: /about describe it/i })).toBeInTheDocument();

      // Close info
      const closeButton = screen.getAllByRole('button', { name: /close/i })[0];
      await user.click(closeButton);

      expect(screen.queryByRole('heading', { name: /about describe it/i })).not.toBeInTheDocument();
    });
  });
});

describe('Edge Cases and Error Handling', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('should handle special characters in search input', async () => {
    const user = userEvent.setup();
    
    (global.fetch as any).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockSuccessfulImageSearch),
      })
    );

    render(<Home />);

    const searchInput = screen.getByPlaceholderText('Search for images...');
    await user.type(searchInput, 'café & résumé!@#$%');
    await user.click(screen.getByRole('button', { name: /search for images/i }));

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('caf%C3%A9%20%26%20r%C3%A9sum%C3%A9!%40%23%24%25')
    );
  });

  it('should handle rapid search submissions', async () => {
    const user = userEvent.setup();
    let callCount = 0;
    
    (global.fetch as any).mockImplementation(() => {
      callCount++;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockSuccessfulImageSearch),
      });
    });

    render(<Home />);

    const searchInput = screen.getByPlaceholderText('Search for images...');
    const searchButton = screen.getByRole('button', { name: /search for images/i });

    await user.type(searchInput, 'test');
    
    // Rapidly click search button
    await user.click(searchButton);
    await user.click(searchButton);
    await user.click(searchButton);

    // Should handle rapid clicks appropriately (button should be disabled during loading)
    await waitFor(() => {
      expect(callCount).toBeGreaterThan(0);
    });
  });

  it('should handle long description text gracefully', async () => {
    const longDescription = 'A'.repeat(1000);
    
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/images/search')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSuccessfulImageSearch),
        });
      }
      if (url.includes('/api/descriptions/generate')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { text: longDescription },
          }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    const user = userEvent.setup();
    render(<Home />);

    // Generate long descriptions
    const searchInput = screen.getByPlaceholderText('Search for images...');
    await user.type(searchInput, 'test');
    await user.click(screen.getByRole('button', { name: /search for images/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /generate description/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /generate description/i }));

    await waitFor(() => {
      expect(screen.getByText(longDescription)).toBeInTheDocument();
    });
  });

  it('should handle network timeouts', async () => {
    const user = userEvent.setup();
    
    // Mock slow network response
    (global.fetch as any).mockImplementation(() =>
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Network timeout')), 100)
      )
    );

    render(<Home />);

    const searchInput = screen.getByPlaceholderText('Search for images...');
    await user.type(searchInput, 'test');
    await user.click(screen.getByRole('button', { name: /search for images/i }));

    await waitFor(() => {
      expect(screen.getByText('Failed to search images. Please try again.')).toBeInTheDocument();
    });
  });
});