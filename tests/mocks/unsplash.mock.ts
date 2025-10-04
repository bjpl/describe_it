/**
 * Unsplash API Mock for Testing
 * Provides comprehensive mocking for Unsplash API calls including search, random photos, and error scenarios
 */

import { vi } from 'vitest';

// Mock response types
export interface MockUnsplashPhoto {
  id: string;
  created_at: string;
  updated_at: string;
  width: number;
  height: number;
  color: string;
  blur_hash: string;
  description: string;
  alt_description: string;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  links: {
    self: string;
    html: string;
    download: string;
  };
  user: {
    id: string;
    username: string;
    name: string;
    portfolio_url: string;
    bio: string;
    location: string;
    links: {
      self: string;
      html: string;
      photos: string;
    };
    profile_image: {
      small: string;
      medium: string;
      large: string;
    };
  };
  exif: {
    make: string;
    model: string;
    exposure_time: string;
    aperture: string;
    focal_length: string;
    iso: number;
  };
  tags: Array<{
    type: string;
    title: string;
  }>;
}

export interface MockUnsplashSearchResponse {
  total: number;
  total_pages: number;
  results: MockUnsplashPhoto[];
}

// Mock fixtures for different scenarios
export const mockUnsplashPhotos: MockUnsplashPhoto[] = [
  {
    id: 'mock-photo-1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    width: 4000,
    height: 3000,
    color: '#FF6B35',
    blur_hash: 'LFC$yHwc8^$yIAS$%M%00KxukYIp',
    description: 'A beautiful sunset over mountains',
    alt_description: 'orange and pink clouds over mountain range during sunset',
    urls: {
      raw: 'https://images.unsplash.com/photo-1641234567890?raw',
      full: 'https://images.unsplash.com/photo-1641234567890?full',
      regular: 'https://images.unsplash.com/photo-1641234567890?regular',
      small: 'https://images.unsplash.com/photo-1641234567890?small',
      thumb: 'https://images.unsplash.com/photo-1641234567890?thumb'
    },
    links: {
      self: 'https://api.unsplash.com/photos/mock-photo-1',
      html: 'https://unsplash.com/photos/mock-photo-1',
      download: 'https://unsplash.com/photos/mock-photo-1/download'
    },
    user: {
      id: 'mock-user-1',
      username: 'naturephotographer',
      name: 'Nature Photographer',
      portfolio_url: 'https://example.com/portfolio',
      bio: 'Capturing the beauty of nature',
      location: 'Mountain View, CA',
      links: {
        self: 'https://api.unsplash.com/users/naturephotographer',
        html: 'https://unsplash.com/@naturephotographer',
        photos: 'https://api.unsplash.com/users/naturephotographer/photos'
      },
      profile_image: {
        small: 'https://images.unsplash.com/profile-small',
        medium: 'https://images.unsplash.com/profile-medium',
        large: 'https://images.unsplash.com/profile-large'
      }
    },
    exif: {
      make: 'Canon',
      model: 'EOS 5D Mark IV',
      exposure_time: '1/125',
      aperture: 'f/8.0',
      focal_length: '24.0',
      iso: 100
    },
    tags: [
      { type: 'landing_page', title: 'nature' },
      { type: 'regular', title: 'sunset' },
      { type: 'regular', title: 'mountains' }
    ]
  },
  {
    id: 'mock-photo-2',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    width: 3000,
    height: 4000,
    color: '#2E8B57',
    blur_hash: 'L9F~k@4n?bxv00-;%NRj2?xto#s:',
    description: 'Forest landscape with morning mist',
    alt_description: 'misty forest with tall pine trees in morning light',
    urls: {
      raw: 'https://images.unsplash.com/photo-1641234567891?raw',
      full: 'https://images.unsplash.com/photo-1641234567891?full',
      regular: 'https://images.unsplash.com/photo-1641234567891?regular',
      small: 'https://images.unsplash.com/photo-1641234567891?small',
      thumb: 'https://images.unsplash.com/photo-1641234567891?thumb'
    },
    links: {
      self: 'https://api.unsplash.com/photos/mock-photo-2',
      html: 'https://unsplash.com/photos/mock-photo-2',
      download: 'https://unsplash.com/photos/mock-photo-2/download'
    },
    user: {
      id: 'mock-user-2',
      username: 'forestexplorer',
      name: 'Forest Explorer',
      portfolio_url: 'https://example.com/forest-portfolio',
      bio: 'Exploring the wilderness',
      location: 'Pacific Northwest',
      links: {
        self: 'https://api.unsplash.com/users/forestexplorer',
        html: 'https://unsplash.com/@forestexplorer',
        photos: 'https://api.unsplash.com/users/forestexplorer/photos'
      },
      profile_image: {
        small: 'https://images.unsplash.com/profile-small-2',
        medium: 'https://images.unsplash.com/profile-medium-2',
        large: 'https://images.unsplash.com/profile-large-2'
      }
    },
    exif: {
      make: 'Nikon',
      model: 'D850',
      exposure_time: '1/60',
      aperture: 'f/11.0',
      focal_length: '35.0',
      iso: 200
    },
    tags: [
      { type: 'landing_page', title: 'forest' },
      { type: 'regular', title: 'mist' },
      { type: 'regular', title: 'trees' }
    ]
  }
];

export const mockSearchResponses = {
  success: {
    total: 1000,
    total_pages: 100,
    results: mockUnsplashPhotos
  },
  empty: {
    total: 0,
    total_pages: 0,
    results: []
  },
  single: {
    total: 1,
    total_pages: 1,
    results: [mockUnsplashPhotos[0]]
  }
};

// Mock Unsplash client
export class MockUnsplashClient {
  search = {
    photos: vi.fn()
  };
  photos = {
    getRandom: vi.fn()
  };

  constructor(private scenario: 'success' | 'empty' | 'error' | 'rateLimited' = 'success') {
    this.setupMocks();
  }

  private setupMocks() {
    // Setup search photos mock
    this.search.photos.mockImplementation(async (query: string, params?: any) => {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 50));

      if (this.scenario === 'error') {
        throw new Error('Unsplash API error');
      }

      if (this.scenario === 'rateLimited') {
        const error = new Error('Rate limit exceeded');
        (error as any).status = 403;
        throw error;
      }

      if (this.scenario === 'empty' || !query.trim()) {
        return mockSearchResponses.empty;
      }

      // Filter photos based on query
      const filteredPhotos = mockUnsplashPhotos.filter(photo =>
        photo.description?.toLowerCase().includes(query.toLowerCase()) ||
        photo.alt_description?.toLowerCase().includes(query.toLowerCase()) ||
        photo.tags.some(tag => tag.title.toLowerCase().includes(query.toLowerCase()))
      );

      return {
        total: filteredPhotos.length > 0 ? 1000 : 0,
        total_pages: filteredPhotos.length > 0 ? 100 : 0,
        results: filteredPhotos.length > 0 ? filteredPhotos : []
      };
    });

    // Setup random photos mock
    this.photos.getRandom.mockImplementation(async (params?: any) => {
      await new Promise(resolve => setTimeout(resolve, 50));

      if (this.scenario === 'error') {
        throw new Error('Unsplash API error');
      }

      if (this.scenario === 'rateLimited') {
        const error = new Error('Rate limit exceeded');
        (error as any).status = 403;
        throw error;
      }

      const count = params?.count || 1;
      if (count === 1) {
        return mockUnsplashPhotos[0];
      }
      
      return mockUnsplashPhotos.slice(0, Math.min(count, mockUnsplashPhotos.length));
    });
  }

  setScenario(scenario: 'success' | 'empty' | 'error' | 'rateLimited') {
    this.scenario = scenario;
    this.setupMocks();
  }

  resetMocks() {
    this.search.photos.mockReset();
    this.photos.getRandom.mockReset();
    this.setupMocks();
  }
}

// Factory for creating mock instances
export const createMockUnsplash = (scenario: 'success' | 'empty' | 'error' | 'rateLimited' = 'success') => {
  return new MockUnsplashClient(scenario);
};

// Mock for createApi function (commonly used pattern)
export const mockCreateApi = vi.fn(() => createMockUnsplash());

// Test utilities
export const setupUnsplashMocks = () => {
  vi.mock('unsplash-js', () => ({
    createApi: mockCreateApi
  }));
};

export const expectUnsplashSearchCall = (mockClient: MockUnsplashClient, query?: string, params?: any) => {
  expect(mockClient.search.photos).toHaveBeenCalled();
  
  if (query) {
    expect(mockClient.search.photos).toHaveBeenCalledWith(
      query,
      params ? expect.objectContaining(params) : expect.any(Object)
    );
  }
};

export const getLastUnsplashSearchCall = (mockClient: MockUnsplashClient) => {
  const calls = mockClient.search.photos.mock.calls;
  return calls[calls.length - 1];
};

// Performance testing utilities
export const createPerformanceUnsplashMock = (delay: number = 2000) => {
  const mock = createMockUnsplash();
  
  mock.search.photos.mockImplementation(async (query: string, params?: any) => {
    await new Promise(resolve => setTimeout(resolve, delay));
    return mockSearchResponses.success;
  });
  
  return mock;
};

// Load testing utilities
export const createLoadTestMock = (requestCount: number = 100) => {
  const mock = createMockUnsplash();
  let currentRequests = 0;
  
  mock.search.photos.mockImplementation(async (query: string, params?: any) => {
    currentRequests++;
    
    if (currentRequests > requestCount) {
      const error = new Error('Rate limit exceeded');
      (error as any).status = 403;
      throw error;
    }
    
    return mockSearchResponses.success;
  });
  
  return mock;
};