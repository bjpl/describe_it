/**
 * Mock Service Worker (MSW) Setup
 * Provides HTTP request interception for testing external API calls
 */

import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { beforeAll, afterEach, afterAll } from 'vitest';
import { mockOpenAIResponses } from './openai.mock';
import { mockUnsplashPhotos, mockSearchResponses } from './unsplash.mock';

// Define API endpoints
const OPENAI_API_BASE = 'https://api.openai.com/v1';
const UNSPLASH_API_BASE = 'https://api.unsplash.com';

// Request handlers
export const restHandlers = [
  // OpenAI Chat Completions
  http.post(`${OPENAI_API_BASE}/chat/completions`, async ({ request }) => {
    const body = await request.json() as any;
    
    // Check authorization
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { error: { message: 'Invalid API key provided', type: 'invalid_request_error' } },
        { status: 401 }
      );
    }

    // Simulate rate limiting
    const apiKey = authHeader.replace('Bearer ', '');
    if (apiKey === 'rate-limited-key') {
      return HttpResponse.json(
        { error: { message: 'Rate limit exceeded', type: 'rate_limit_error' } },
        { status: 429 }
      );
    }

    // Check for vision request
    const isVisionRequest = body.messages?.some((msg: any) => 
      msg.content?.some?.((content: any) => content.type === 'image_url')
    );

    // Check for vocabulary request
    const isVocabularyRequest = body.messages?.some((msg: any) => 
      typeof msg.content === 'string' && msg.content.includes('vocabulary')
    );

    // Check for QA request
    const isQARequest = body.messages?.some((msg: any) => 
      typeof msg.content === 'string' && msg.content.includes('questions')
    );

    // Return appropriate response
    if (isVisionRequest) {
      return HttpResponse.json(mockOpenAIResponses.visionSuccess);
    } else if (isVocabularyRequest) {
      return HttpResponse.json(mockOpenAIResponses.textSuccess);
    } else if (isQARequest) {
      return HttpResponse.json(mockOpenAIResponses.qaSuccess);
    }

    return HttpResponse.json(mockOpenAIResponses.visionSuccess);
  }),

  // Unsplash Search Photos
  http.get(`${UNSPLASH_API_BASE}/search/photos`, ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('query');
    const page = parseInt(url.searchParams.get('page') || '1');
    const perPage = parseInt(url.searchParams.get('per_page') || '10');
    
    // Check authorization
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Client-ID ')) {
      return HttpResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Simulate rate limiting
    const clientId = authHeader.replace('Client-ID ', '');
    if (clientId === 'rate-limited-client') {
      return HttpResponse.json(
        { error: 'Rate Limit Exceeded' },
        { status: 403 }
      );
    }

    if (!query) {
      return HttpResponse.json(mockSearchResponses.empty);
    }

    // Filter photos based on query
    const filteredPhotos = mockUnsplashPhotos.filter(photo =>
      photo.description?.toLowerCase().includes(query.toLowerCase()) ||
      photo.alt_description?.toLowerCase().includes(query.toLowerCase()) ||
      photo.tags.some(tag => tag.title.toLowerCase().includes(query.toLowerCase()))
    );

    // Paginate results
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    const paginatedResults = filteredPhotos.slice(startIndex, endIndex);

    return HttpResponse.json({
      total: filteredPhotos.length,
      total_pages: Math.ceil(filteredPhotos.length / perPage),
      results: paginatedResults
    });
  }),

  // Unsplash Random Photos
  http.get(`${UNSPLASH_API_BASE}/photos/random`, ({ request }) => {
    const url = new URL(request.url);
    const count = parseInt(url.searchParams.get('count') || '1');
    
    // Check authorization
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Client-ID ')) {
      return HttpResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (count === 1) {
      return HttpResponse.json(mockUnsplashPhotos[0]);
    }
    
    return HttpResponse.json(mockUnsplashPhotos.slice(0, Math.min(count, mockUnsplashPhotos.length)));
  }),

  // Local API routes for testing
  http.post('/api/descriptions/generate', async ({ request }) => {
    const body = await request.json() as any;
    
    if (!body.imageUrl) {
      return HttpResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    if (!body.apiKey) {
      return HttpResponse.json(
        { error: 'API key is required' },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      success: true,
      description: 'A beautiful landscape with mountains and sunset',
      vocabulary: [
        { word: 'beautiful', definition: 'pleasing to look at', examples: ['The sunset is beautiful.'] },
        { word: 'landscape', definition: 'a section of scenery or land', examples: ['The mountain landscape is breathtaking.'] }
      ],
      questions: [
        { question: 'What time of day is shown?', answer: 'Sunset', difficulty: 'easy' },
        { question: 'What geographical features are visible?', answer: 'Mountains', difficulty: 'medium' }
      ]
    });
  }),

  // Images search API
  http.get('/api/images/search', ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('query');
    
    if (!query) {
      return HttpResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    return HttpResponse.json({
      success: true,
      images: mockUnsplashPhotos.slice(0, 3).map(photo => ({
        id: photo.id,
        url: photo.urls.regular,
        thumbnail: photo.urls.thumb,
        description: photo.description,
        photographer: photo.user.name,
        photographerUrl: photo.user.links.html
      }))
    });
  }),

  // Health check endpoint
  http.get('/api/health', () => {
    return HttpResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        openai: 'operational',
        unsplash: 'operational',
        database: 'operational'
      }
    });
  })
];

// Error simulation handlers
export const errorHandlers = [
  // OpenAI service unavailable
  http.post(`${OPENAI_API_BASE}/chat/completions`, () => {
    return HttpResponse.json(
      { error: { message: 'Service temporarily unavailable', type: 'service_unavailable' } },
      { status: 503 }
    );
  }),

  // Unsplash service unavailable
  http.get(`${UNSPLASH_API_BASE}/search/photos`, () => {
    return HttpResponse.json(
      { error: 'Service temporarily unavailable' },
      { status: 503 }
    );
  })
];

// Create server instance
export const server = setupServer(...restHandlers);

// Test environment setup
export const setupMSW = () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'warn' });
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });
};

// Utility functions for test scenarios
export const simulateNetworkError = () => {
  server.use(
    http.post(`${OPENAI_API_BASE}/chat/completions`, () => {
      return HttpResponse.error();
    }),
    http.get(`${UNSPLASH_API_BASE}/search/photos`, () => {
      return HttpResponse.error();
    })
  );
};

export const simulateTimeout = (delay: number = 5000) => {
  server.use(
    http.post(`${OPENAI_API_BASE}/chat/completions`, async () => {
      await new Promise(resolve => setTimeout(resolve, delay));
      return HttpResponse.json(mockOpenAIResponses.visionSuccess);
    }),
    http.get(`${UNSPLASH_API_BASE}/search/photos`, async ({ request }) => {
      await new Promise(resolve => setTimeout(resolve, delay));
      const url = new URL(request.url);
      const query = url.searchParams.get('query');
      return HttpResponse.json(query ? mockSearchResponses.success : mockSearchResponses.empty);
    })
  );
};

export const simulateRateLimiting = () => {
  let requestCount = 0;
  const RATE_LIMIT = 5;

  server.use(
    http.post(`${OPENAI_API_BASE}/chat/completions`, () => {
      requestCount++;
      if (requestCount > RATE_LIMIT) {
        return HttpResponse.json(
          { error: { message: 'Rate limit exceeded', type: 'rate_limit_error' } },
          { status: 429 }
        );
      }
      return HttpResponse.json(mockOpenAIResponses.visionSuccess);
    })
  );
};

export const resetRequestCount = () => {
  // Reset any stateful counters used in rate limiting simulation
  server.resetHandlers();
};

export default server;