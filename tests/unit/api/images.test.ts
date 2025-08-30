import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../../../src/app/api/images/search/route';
import { NextRequest } from 'next/server';

// Mock the unsplash service
const mockUnsplashService = {
  searchImages: vi.fn(),
};

vi.mock('../../../src/lib/api/unsplash', () => ({
  unsplashService: mockUnsplashService,
}));

describe('/api/images/search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/images/search', () => {
    it('should return images for valid search query', async () => {
      const mockResponse = {
        total: 100,
        total_pages: 5,
        results: [
          {
            id: 'test-image-1',
            urls: {
              small: 'https://example.com/image-small.jpg',
              regular: 'https://example.com/image.jpg',
              full: 'https://example.com/image-full.jpg',
            },
            alt_description: 'Test image',
            description: 'A beautiful test image',
            user: { name: 'Test User', username: 'testuser' },
            width: 800,
            height: 600,
            color: '#ffffff',
            likes: 10,
            created_at: '2023-01-01T00:00:00Z',
          },
        ],
      };

      mockUnsplashService.searchImages.mockResolvedValue(mockResponse);

      const request = new NextRequest('http://localhost:3000/api/images/search?query=nature&page=1&per_page=20');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockResponse);
      expect(mockUnsplashService.searchImages).toHaveBeenCalledWith({
        query: 'nature',
        page: 1,
        per_page: 20,
      });
    });

    it('should return 400 for missing query parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/images/search');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid parameters');
      expect(data.details).toBeDefined();
    });

    it('should return 400 for invalid page parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/images/search?query=nature&page=0');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid parameters');
    });

    it('should return 400 for invalid per_page parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/images/search?query=nature&per_page=50');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid parameters');
    });

    it('should handle valid optional parameters', async () => {
      const mockResponse = {
        total: 50,
        total_pages: 3,
        results: [],
      };

      mockUnsplashService.searchImages.mockResolvedValue(mockResponse);

      const request = new NextRequest(
        'http://localhost:3000/api/images/search?query=sunset&page=2&per_page=15&orientation=landscape&color=orange&orderBy=popular'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockUnsplashService.searchImages).toHaveBeenCalledWith({
        query: 'sunset',
        page: 2,
        per_page: 15,
        orientation: 'landscape',
        color: 'orange',
        orderBy: 'popular',
      });
    });

    it('should return 400 for invalid orientation', async () => {
      const request = new NextRequest('http://localhost:3000/api/images/search?query=nature&orientation=invalid');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid parameters');
    });

    it('should return 400 for invalid orderBy', async () => {
      const request = new NextRequest('http://localhost:3000/api/images/search?query=nature&orderBy=invalid');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid parameters');
    });

    it('should handle unsplash service errors', async () => {
      mockUnsplashService.searchImages.mockRejectedValue(new Error('Unsplash API error'));

      const request = new NextRequest('http://localhost:3000/api/images/search?query=nature');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to search images');
    });

    it('should handle rate limiting errors', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.name = 'RateLimitError';
      mockUnsplashService.searchImages.mockRejectedValue(rateLimitError);

      const request = new NextRequest('http://localhost:3000/api/images/search?query=nature');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to search images');
    });

    it('should use default values for optional parameters', async () => {
      const mockResponse = {
        total: 100,
        total_pages: 5,
        results: [],
      };

      mockUnsplashService.searchImages.mockResolvedValue(mockResponse);

      const request = new NextRequest('http://localhost:3000/api/images/search?query=test');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockUnsplashService.searchImages).toHaveBeenCalledWith({
        query: 'test',
        page: 1,
        per_page: 20,
      });
    });

    it('should handle empty search results', async () => {
      const mockResponse = {
        total: 0,
        total_pages: 0,
        results: [],
      };

      mockUnsplashService.searchImages.mockResolvedValue(mockResponse);

      const request = new NextRequest('http://localhost:3000/api/images/search?query=nonexistent');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.total).toBe(0);
      expect(data.results).toEqual([]);
    });

    it('should validate query length limits', async () => {
      const longQuery = 'a'.repeat(101); // Exceeds 100 character limit
      const request = new NextRequest(`http://localhost:3000/api/images/search?query=${longQuery}`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid parameters');
    });

    it('should handle special characters in query', async () => {
      const mockResponse = {
        total: 10,
        total_pages: 1,
        results: [],
      };

      mockUnsplashService.searchImages.mockResolvedValue(mockResponse);

      const specialQuery = encodeURIComponent('nature & wildlife');
      const request = new NextRequest(`http://localhost:3000/api/images/search?query=${specialQuery}`);
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockUnsplashService.searchImages).toHaveBeenCalledWith({
        query: 'nature & wildlife',
        page: 1,
        per_page: 20,
      });
    });
  });
});