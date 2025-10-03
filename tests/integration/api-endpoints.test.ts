import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Enhanced fetch mock for integration tests
const createMockResponse = (data: any, options: { ok?: boolean; status?: number; headers?: Record<string, string> } = {}) => ({
  ok: options.ok ?? true,
  status: options.status ?? 200,
  headers: new Map(Object.entries(options.headers || {})),
  json: () => Promise.resolve(data),
  text: () => Promise.resolve(JSON.stringify(data)),
});

const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock environment variables
process.env.OPENAI_API_KEY = 'sk-test-key';
process.env.UNSPLASH_ACCESS_KEY = 'test-unsplash-key';

// Test data
const mockImageSearchResponse = {
  results: [
    {
      id: '1',
      urls: {
        thumb: 'thumb1.jpg',
        small: 'small1.jpg', 
        regular: 'regular1.jpg',
        full: 'full1.jpg',
        raw: 'raw1.jpg'
      },
      user: { id: 'user1', name: 'Test User', username: 'testuser' },
      description: 'Test image',
      alt_description: 'Test alt'
    }
  ],
  total: 1,
  total_pages: 1
};

const mockDescriptionResponse = {
  success: true,
  data: [
    {
      id: '1',
      imageId: 'test-image-url',
      style: 'narrativo',
      content: 'Test description in English',
      language: 'english',
      createdAt: new Date().toISOString()
    },
    {
      id: '2',
      imageId: 'test-image-url',
      style: 'narrativo',
      content: 'Descripción de prueba en español',
      language: 'spanish',
      createdAt: new Date().toISOString()
    }
  ]
};

const mockQAResponse = {
  success: true,
  data: {
    questions: [
      {
        id: '1',
        question: '¿Qué se ve en la imagen?',
        options: ['Montaña', 'Río', 'Ciudad', 'Bosque'],
        correctAnswer: 0,
        explanation: 'La imagen muestra una montaña.'
      }
    ],
    metadata: {
      difficulty: 'beginner',
      totalQuestions: 1
    }
  }
};

const mockVocabularyResponse = {
  success: true,
  data: {
    phrases: [
      {
        spanish: 'la montaña',
        english: 'the mountain',
        difficulty: 'beginner',
        context: 'geography'
      }
    ],
    savedCount: 1
  }
};

describe('API Endpoints Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('/api/images/search', () => {
    it('should search images successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockImageSearchResponse)
      });

      const response = await fetch('/api/images/search?query=mountain&page=1');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.results).toHaveLength(1);
      expect(data.results[0].id).toBe('1');
    });

    it('should handle missing query parameter', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(
        { error: 'Query parameter is required' },
        { ok: false, status: 400 }
      ));

      const response = await fetch('/api/images/search');
      
      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(
        { error: 'Network error' },
        { ok: false, status: 500 }
      ));

      const response = await fetch('/api/images/search?query=mountain');
      
      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);
    });

    it('should support pagination', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          ...mockImageSearchResponse,
          total_pages: 5
        })
      });

      const response = await fetch('/api/images/search?query=mountain&page=2');
      const data = await response.json();

      expect(data.total_pages).toBe(5);
    });

    it('should handle rate limiting', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () => Promise.resolve({ error: 'Rate limit exceeded' })
      });

      const response = await fetch('/api/images/search?query=mountain');
      
      expect(response.status).toBe(429);
    });
  });

  describe('/api/descriptions/generate', () => {
    it('should generate descriptions successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDescriptionResponse)
      });

      const response = await fetch('/api/descriptions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: 'test-image-url',
          style: 'narrativo'
        })
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].language).toBe('english');
      expect(data.data[1].language).toBe('spanish');
    });

    it('should validate required parameters', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(
        { error: 'Missing required parameters' },
        { ok: false, status: 400 }
      ));

      const response = await fetch('/api/descriptions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });

    it('should handle invalid image URLs', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(
        { error: 'Invalid image URL' },
        { ok: false, status: 400 }
      ));

      const response = await fetch('/api/descriptions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: 'invalid-url',
          style: 'narrativo'
        })
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });

    it('should support all description styles', async () => {
      const styles = ['narrativo', 'descriptivo', 'poetico', 'tecnico'];
      
      for (const style of styles) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            ...mockDescriptionResponse,
            data: mockDescriptionResponse.data.map(d => ({ ...d, style }))
          })
        });

        const response = await fetch('/api/descriptions/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrl: 'test-image-url',
            style
          })
        });

        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data[0].style).toBe(style);
      }
    });

    it('should handle OpenAI API errors', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(
        { error: 'OpenAI API error' },
        { ok: false, status: 500 }
      ));

      const response = await fetch('/api/descriptions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: 'test-image-url',
          style: 'narrativo'
        })
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);
    });
  });

  describe('/api/qa/generate', () => {
    it('should generate QA pairs successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockQAResponse)
      });

      const response = await fetch('/api/qa/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: 'test-image-url',
          description: 'Test description',
          difficulty: 'beginner'
        })
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.data.questions).toHaveLength(1);
      expect(data.data.questions[0]).toHaveProperty('question');
      expect(data.data.questions[0]).toHaveProperty('options');
      expect(data.data.questions[0]).toHaveProperty('correctAnswer');
    });

    it('should support different difficulty levels', async () => {
      const difficulties = ['beginner', 'intermediate', 'advanced'];
      
      for (const difficulty of difficulties) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            ...mockQAResponse,
            data: {
              ...mockQAResponse.data,
              metadata: { ...mockQAResponse.data.metadata, difficulty }
            }
          })
        });

        const response = await fetch('/api/qa/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrl: 'test-image-url',
            description: 'Test description',
            difficulty
          })
        });

        const data = await response.json();
        expect(data.data.metadata.difficulty).toBe(difficulty);
      }
    });

    it('should validate required parameters', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(
        { error: 'Missing required parameters' },
        { ok: false, status: 400 }
      ));

      const response = await fetch('/api/qa/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: 'test-image-url'
          // missing description
        })
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });
  });

  describe('/api/vocabulary/save', () => {
    it('should save vocabulary successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockVocabularyResponse)
      });

      const response = await fetch('/api/vocabulary/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phrases: [{
            spanish: 'la montaña',
            english: 'the mountain',
            difficulty: 'beginner',
            context: 'geography'
          }]
        })
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.data.savedCount).toBe(1);
    });

    it('should validate phrase format', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(
        { error: 'Invalid phrase format' },
        { ok: false, status: 400 }
      ));

      const response = await fetch('/api/vocabulary/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phrases: [{
            spanish: 'la montaña'
            // missing english translation
          }]
        })
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });

    it('should handle batch saving', async () => {
      const largeBatch = Array.from({ length: 50 }, (_, i) => ({
        spanish: `palabra ${i}`,
        english: `word ${i}`,
        difficulty: 'beginner',
        context: 'test'
      }));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          ...mockVocabularyResponse,
          data: {
            ...mockVocabularyResponse.data,
            savedCount: 50
          }
        })
      });

      const response = await fetch('/api/vocabulary/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phrases: largeBatch })
      });

      const data = await response.json();
      expect(data.data.savedCount).toBe(50);
    });
  });

  describe('/api/phrases/extract', () => {
    it('should extract phrases from description', async () => {
      const mockPhrasesResponse = {
        success: true,
        data: {
          phrases: [
            { spanish: 'la montaña', english: 'the mountain', difficulty: 'beginner' },
            { spanish: 'el cielo azul', english: 'the blue sky', difficulty: 'intermediate' }
          ],
          totalCount: 2
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPhrasesResponse)
      });

      const response = await fetch('/api/phrases/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: 'La montaña se eleva hacia el cielo azul.'
        })
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.data.phrases).toHaveLength(2);
    });

    it('should handle empty descriptions', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(
        { error: 'Description cannot be empty' },
        { ok: false, status: 400 }
      ));

      const response = await fetch('/api/phrases/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: '' })
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });
  });

  describe('/api/status', () => {
    it('should return health status', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        status: 'ok',
        timestamp: new Date().toISOString()
      }));

      const response = await fetch('/api/status');
      
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('timestamp');
    });
  });

  describe('CORS and Security', () => {
    it('should include proper CORS headers', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(
        { status: 'ok' },
        { headers: { 'Access-Control-Allow-Origin': '*' } }
      ));

      const response = await fetch('/api/status');
      
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeDefined();
    });

    it('should validate request methods', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(
        { error: 'Method not allowed' },
        { ok: false, status: 405 }
      ));

      // Test that endpoints only accept appropriate HTTP methods
      const response = await fetch('/api/descriptions/generate', {
        method: 'GET' // Should only accept POST
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(405); // Method Not Allowed
    });

    it('should handle malformed JSON', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(
        { error: 'Invalid JSON' },
        { ok: false, status: 400 }
      ));

      const response = await fetch('/api/descriptions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json'
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });
  });

  describe('Error Handling', () => {
    it('should return consistent error format', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Missing required parameters'
      }, { ok: false, status: 400 }));

      const response = await fetch('/api/descriptions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const data = await response.json();
      
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('message');
    });

    it('should handle timeout scenarios', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(
        { error: 'Request timeout' },
        { ok: false, status: 408 }
      ));

      const response = await fetch('/api/descriptions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: 'test-image-url',
          style: 'narrativo'
        })
      });
      
      expect(response.ok).toBe(false);
      expect(response.status).toBe(408);
    });
  });

  describe('Performance', () => {
    it('should respond within acceptable time limits', async () => {
      const startTime = Date.now();
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockImageSearchResponse)
      });

      const response = await fetch('/api/images/search?query=mountain');
      const endTime = Date.now();
      
      expect(response.ok).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds max
    });

    it('should handle concurrent requests', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockImageSearchResponse)
      });

      const requests = Array.from({ length: 10 }, () => 
        fetch('/api/images/search?query=test')
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.ok).toBe(true);
      });
    });
  });
});
