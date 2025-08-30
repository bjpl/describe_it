import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { createSearchResponse, createDescriptionResponse, createPhrasesResponse } from '../utils/test-factories';
import { performanceTestSuite, expectPerformance } from '../utils/performance-helpers';

// Import the components to test the full flow
import ImageSearch from '@/components/ImageSearch/ImageSearch';
import DescriptionTabs from '@/components/DescriptionTabs/DescriptionTabs';
import PhraseExtractor from '@/components/PhraseExtractor/PhraseExtractor';

// Create MSW server for API mocking
const server = setupServer(
  // Mock image search API
  rest.get('/api/images/search', (req, res, ctx) => {
    const query = req.url.searchParams.get('query');
    const page = parseInt(req.url.searchParams.get('page') || '1');
    
    if (!query) {
      return res(ctx.status(400), ctx.json({ error: 'Query required' }));
    }
    
    return res(
      ctx.status(200),
      ctx.json(createSearchResponse(query, 20))
    );
  }),
  
  // Mock description generation API
  rest.post('/api/descriptions/generate', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json(createDescriptionResponse('narrativo'))
    );
  }),
  
  // Mock phrase extraction API
  rest.post('/api/phrases/extract', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json(createPhrasesResponse(10))
    );
  })
);

// Test wrapper component that includes all necessary providers
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('Search to Description Flow Integration', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
  });
  
  afterAll(() => {
    server.close();
  });
  
  beforeEach(() => {
    server.resetHandlers();
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  describe('Complete User Journey', () => {
    it('should complete full search-to-description workflow', async () => {
      const user = userEvent.setup();
      
      // Mock a specific search response with known data
      const mockImage = {
        id: 'test-image-1',
        urls: {
          small: 'https://example.com/small.jpg',
          regular: 'https://example.com/regular.jpg',
          full: 'https://example.com/full.jpg',
        },
        alt_description: 'Spanish mountain landscape',
        description: 'Beautiful mountain landscape in Spain',
        user: { name: 'Test Photographer', username: 'testphoto' },
        width: 1920,
        height: 1080,
        color: '#4A90E2',
        likes: 150,
        created_at: '2023-01-01T00:00:00Z',
      };
      
      server.use(
        rest.get('/api/images/search', (req, res, ctx) => {
          return res(
            ctx.status(200),
            ctx.json({
              total: 1,
              total_pages: 1,
              results: [mockImage],
            })
          );
        })
      );
      
      const onImageSelect = vi.fn();
      
      render(
        <TestWrapper>
          <ImageSearch onImageSelect={onImageSelect} />
        </TestWrapper>
      );
      
      // 1. Enter search query
      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'spanish mountains');
      
      // 2. Submit search
      const searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);
      
      // 3. Wait for results and verify they appear
      await waitFor(() => {
        expect(screen.getByTestId('image-grid')).toBeInTheDocument();
      });
      
      const images = screen.getAllByRole('img');
      expect(images).toHaveLength(1);
      
      // 4. Select an image
      await user.click(images[0]);
      
      expect(onImageSelect).toHaveBeenCalledWith(mockImage);
    }, 10000);
    
    it('should handle search -> image selection -> description generation', async () => {
      const user = userEvent.setup();
      let selectedImage: any = null;
      
      const onImageSelect = (image: any) => {
        selectedImage = image;
      };
      
      const { rerender } = render(
        <TestWrapper>
          <ImageSearch onImageSelect={onImageSelect} />
        </TestWrapper>
      );
      
      // Perform search and select image
      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'mountains');
      
      const searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('image-grid')).toBeInTheDocument();
      });
      
      const firstImage = screen.getAllByRole('img')[0];
      await user.click(firstImage);
      
      // Wait for image selection callback
      await waitFor(() => {
        expect(selectedImage).not.toBeNull();
      });
      
      // Now render description component with selected image
      rerender(
        <TestWrapper>
          <DescriptionTabs image={selectedImage} />
        </TestWrapper>
      );
      
      // Generate description
      const generateButton = screen.getByRole('button', { name: /generate.*description/i });
      await user.click(generateButton);
      
      // Wait for description to appear
      await waitFor(() => {
        expect(screen.getByText(/esta es una descripción/i)).toBeInTheDocument();
      });
    }, 15000);
    
    it('should handle complete learning workflow: search -> describe -> extract phrases', async () => {
      const user = userEvent.setup();
      let selectedImage: any = null;
      let generatedDescription: any = null;
      
      const onImageSelect = (image: any) => {
        selectedImage = image;
      };
      
      const onDescriptionGenerated = (description: any) => {
        generatedDescription = description;
      };
      
      const { rerender } = render(
        <TestWrapper>
          <ImageSearch onImageSelect={onImageSelect} />
        </TestWrapper>
      );
      
      // Step 1: Search for images
      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'spanish culture');
      
      const searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('image-grid')).toBeInTheDocument();
      });
      
      // Step 2: Select an image
      const firstImage = screen.getAllByRole('img')[0];
      await user.click(firstImage);
      
      await waitFor(() => {
        expect(selectedImage).not.toBeNull();
      });
      
      // Step 3: Generate description
      rerender(
        <TestWrapper>
          <DescriptionTabs 
            image={selectedImage} 
            onDescriptionGenerated={onDescriptionGenerated}
          />
        </TestWrapper>
      );
      
      const generateButton = screen.getByRole('button', { name: /generate.*description/i });
      await user.click(generateButton);
      
      await waitFor(() => {
        expect(generatedDescription).not.toBeNull();
      });
      
      // Step 4: Extract phrases
      rerender(
        <TestWrapper>
          <PhraseExtractor description={generatedDescription} />
        </TestWrapper>
      );
      
      const extractButton = screen.getByRole('button', { name: /extract.*phrases/i });
      await user.click(extractButton);
      
      // Wait for phrases to appear
      await waitFor(() => {
        expect(screen.getByTestId('phrase-list')).toBeInTheDocument();
      });
      
      const phrases = screen.getAllByTestId('phrase-item');
      expect(phrases.length).toBeGreaterThan(0);
    }, 20000);
  });
  
  describe('Error Handling in Full Flow', () => {
    it('should handle search errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock search API to return error
      server.use(
        rest.get('/api/images/search', (req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ error: 'Server Error' }));
        })
      );
      
      render(
        <TestWrapper>
          <ImageSearch />
        </TestWrapper>
      );
      
      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'test');
      
      const searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);
      
      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/error.*occurred/i)).toBeInTheDocument();
      });
      
      // Should show retry option
      expect(screen.getByRole('button', { name: /try.*again/i })).toBeInTheDocument();
    });
    
    it('should handle description generation errors', async () => {
      const user = userEvent.setup();
      const mockImage = createSearchResponse('test', 1).results[0];
      
      // Mock description API to return error
      server.use(
        rest.post('/api/descriptions/generate', (req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ error: 'Generation Failed' }));
        })
      );
      
      render(
        <TestWrapper>
          <DescriptionTabs image={mockImage} />
        </TestWrapper>
      );
      
      const generateButton = screen.getByRole('button', { name: /generate.*description/i });
      await user.click(generateButton);
      
      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/failed.*generate/i)).toBeInTheDocument();
      });
    });
    
    it('should recover from network errors', async () => {
      const user = userEvent.setup();
      
      // First request fails
      server.use(
        rest.get('/api/images/search', (req, res, ctx) => {
          return res.networkError('Network Error');
        })
      );
      
      render(
        <TestWrapper>
          <ImageSearch />
        </TestWrapper>
      );
      
      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'test');
      
      const searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);
      
      // Should show network error
      await waitFor(() => {
        expect(screen.getByText(/network.*error/i)).toBeInTheDocument();
      });
      
      // Restore normal API behavior
      server.resetHandlers();
      
      // Retry should work
      const retryButton = screen.getByRole('button', { name: /try.*again/i });
      await user.click(retryButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('image-grid')).toBeInTheDocument();
      });
    });
  });
  
  describe('Performance in Full Flow', () => {
    it('should complete search workflow within performance thresholds', async () => {
      const metrics = await performanceTestSuite.measureExecutionTime(async () => {
        const user = userEvent.setup();
        
        const { container } = render(
          <TestWrapper>
            <ImageSearch />
          </TestWrapper>
        );
        
        const searchInput = screen.getByRole('searchbox');
        await user.type(searchInput, 'performance test');
        
        const searchButton = screen.getByRole('button', { name: /search/i });
        await user.click(searchButton);
        
        await waitFor(() => {
          expect(screen.getByTestId('image-grid')).toBeInTheDocument();
        });
        
        return container;
      });
      
      expectPerformance.toBeFasterThan(metrics, 3000); // Should complete in < 3 seconds
    });
    
    it('should handle large search results efficiently', async () => {
      // Mock large response
      server.use(
        rest.get('/api/images/search', (req, res, ctx) => {
          const largeResponse = createSearchResponse('test', 50);
          return res(ctx.status(200), ctx.json(largeResponse));
        })
      );
      
      const user = userEvent.setup();
      const startTime = performance.now();
      
      render(
        <TestWrapper>
          <ImageSearch />
        </TestWrapper>
      );
      
      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'large dataset');
      
      const searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('image-grid')).toBeInTheDocument();
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should handle large datasets reasonably fast
      expect(duration).toBeLessThan(5000);
      
      // Should render all images
      const images = screen.getAllByRole('img');
      expect(images).toHaveLength(50);
    });
  });
  
  describe('State Persistence Across Flow', () => {
    it('should maintain search state when navigating between components', async () => {
      const user = userEvent.setup();
      let selectedImage: any = null;
      
      const { rerender } = render(
        <TestWrapper>
          <ImageSearch onImageSelect={(img) => { selectedImage = img; }} />
        </TestWrapper>
      );
      
      // Perform search
      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'persistent state');
      
      const searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('image-grid')).toBeInTheDocument();
      });
      
      // Select image
      const firstImage = screen.getAllByRole('img')[0];
      await user.click(firstImage);
      
      await waitFor(() => {
        expect(selectedImage).not.toBeNull();
      });
      
      const originalSearchQuery = (searchInput as HTMLInputElement).value;
      
      // Navigate to description component
      rerender(
        <TestWrapper>
          <DescriptionTabs image={selectedImage} />
        </TestWrapper>
      );
      
      // Generate description
      const generateButton = screen.getByRole('button', { name: /generate.*description/i });
      await user.click(generateButton);
      
      // Navigate back to search
      rerender(
        <TestWrapper>
          <ImageSearch onImageSelect={(img) => { selectedImage = img; }} />
        </TestWrapper>
      );
      
      // Search query should be maintained
      const searchInputAfterReturn = screen.getByRole('searchbox');
      expect((searchInputAfterReturn as HTMLInputElement).value).toBe(originalSearchQuery);
    });
  });
  
  describe('Accessibility in Full Flow', () => {
    it('should maintain focus management throughout workflow', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ImageSearch />
        </TestWrapper>
      );
      
      // Start with keyboard navigation
      await user.tab();
      expect(screen.getByRole('searchbox')).toHaveFocus();
      
      // Type and submit with keyboard
      await user.type(screen.getByRole('searchbox'), 'accessibility test{enter}');
      
      await waitFor(() => {
        expect(screen.getByTestId('image-grid')).toBeInTheDocument();
      });
      
      // Navigate to first image with keyboard
      await user.tab();
      await user.tab(); // Might need multiple tabs depending on layout
      
      const firstImage = screen.getAllByRole('img')[0];
      await user.keyboard('{Enter}'); // Select image with keyboard
      
      // Focus should be managed properly throughout
      expect(document.activeElement).not.toBe(document.body);
    });
    
    it('should announce state changes to screen readers', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ImageSearch />
        </TestWrapper>
      );
      
      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'screen reader test');
      
      const searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);
      
      // Should have ARIA live region announcements
      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      });
      
      const statusElement = screen.getByRole('status');
      expect(statusElement.textContent).toMatch(/\d+ images? found/i);
    });
  });
});
