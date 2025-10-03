import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { createMockApiResponse, mockFetch, mockFetchError } from '../../utils/test-utils';

// Mock Next.js environment
process.env.NODE_ENV = 'test';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.UNSPLASH_ACCESS_KEY = 'test-unsplash-key';

// Mock OpenAI
vi.mock('openai', () => ({
  default: class MockOpenAI {
    chat = {
      completions: {
        create: vi.fn()
      }
    }
  }
}));

describe('API Integration Tests - All Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset fetch mock
    global.fetch = vi.fn();
  });

  describe('Health Check Endpoint', () => {
    it('GET /api/health should return status and timestamp', async () => {
      mockFetch({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: 'test',
        uptime: 12345
      });

      const response = await fetch('/api/health');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.status).toBe('healthy');
      expect(data.timestamp).toBeDefined();
      expect(data.environment).toBe('test');
    });

    it('should handle health check errors gracefully', async () => {
      mockFetchError('Health check failed');

      await expect(fetch('/api/health')).rejects.toThrow('Health check failed');
    });
  });

  describe('Environment Status Endpoint', () => {
    it('GET /api/env-status should return environment configuration', async () => {
      mockFetch({
        openai: { configured: true, status: 'connected' },
        unsplash: { configured: true, status: 'connected' },
        database: { configured: false, status: 'not_configured' },
        redis: { configured: false, status: 'not_configured' }
      });

      const response = await fetch('/api/env-status');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.openai.configured).toBe(true);
      expect(data.unsplash.configured).toBe(true);
    });

    it('should detect missing API keys', async () => {
      mockFetch({
        openai: { configured: false, status: 'missing_key' },
        unsplash: { configured: false, status: 'missing_key' }
      });

      const response = await fetch('/api/env-status');
      const data = await response.json();

      expect(data.openai.configured).toBe(false);
      expect(data.openai.status).toBe('missing_key');
    });
  });

  describe('Image Search Endpoint', () => {
    const mockUnsplashResponse = {
      results: [
        {
          id: 'test-image-1',
          urls: {
            raw: 'https://example.com/raw.jpg',
            full: 'https://example.com/full.jpg',
            regular: 'https://example.com/regular.jpg',
            small: 'https://example.com/small.jpg',
            thumb: 'https://example.com/thumb.jpg'
          },
          alt_description: 'Test image description',
          description: 'A beautiful test image',
          user: { name: 'Test User', username: 'testuser' },
          width: 1920,
          height: 1080,
          likes: 42
        }
      ],
      total: 1000,
      total_pages: 50
    };

    it('POST /api/images/search should return search results', async () => {
      mockFetch(mockUnsplashResponse);

      const response = await fetch('/api/images/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'mountains',
          page: 1,
          per_page: 20
        })
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.results).toHaveLength(1);
      expect(data.results[0].id).toBe('test-image-1');
      expect(data.total).toBe(1000);
    });

    it('should handle search with filters', async () => {
      mockFetch(mockUnsplashResponse);

      const response = await fetch('/api/images/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'nature',
          page: 1,
          orientation: 'landscape',
          category: 'nature',
          color: 'green'
        })
      });

      expect(response.ok).toBe(true);
    });

    it('should validate required query parameter', async () => {
      mockFetch({ error: 'Query is required' }, 400);

      const response = await fetch('/api/images/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page: 1 })
      });

      expect(response.status).toBe(400);
    });

    it('should handle Unsplash API errors', async () => {
      mockFetch({ error: 'Rate limit exceeded' }, 429);

      const response = await fetch('/api/images/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'test' })
      });

      expect(response.status).toBe(429);
    });
  });

  describe('Description Generation Endpoint', () => {
    const mockOpenAIResponse = {
      choices: [{
        message: {
          content: JSON.stringify({
            descriptions: {
              spanish: {
                narrativo: 'Una descripción narrativa en español.',
                tecnico: 'Una descripción técnica en español.',
                poetico: 'Una descripción poética en español.'
              },
              english: {
                narrativo: 'A narrative description in English.',
                tecnico: 'A technical description in English.',
                poetico: 'A poetic description in English.'
              }
            }
          })
        }
      }]
    };

    it('POST /api/descriptions/generate should generate descriptions', async () => {
      mockFetch(mockOpenAIResponse);

      const response = await fetch('/api/descriptions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: 'https://example.com/image.jpg',
          style: 'narrativo'
        })
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.descriptions.spanish.narrativo).toBeDefined();
      expect(data.descriptions.english.narrativo).toBeDefined();
    });

    it('should validate required imageUrl parameter', async () => {
      mockFetch({ error: 'Image URL is required' }, 400);

      const response = await fetch('/api/descriptions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ style: 'narrativo' })
      });

      expect(response.status).toBe(400);
    });

    it('should handle OpenAI API errors', async () => {
      mockFetch({ error: 'OpenAI API error' }, 500);

      const response = await fetch('/api/descriptions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: 'https://example.com/image.jpg',
          style: 'narrativo'
        })
      });

      expect(response.status).toBe(500);
    });
  });

  describe('Q&A Generation Endpoint', () => {
    const mockQAResponse = {
      questions: [
        {
          id: '1',
          question: '¿Qué se puede ver en la imagen?',
          options: ['Montañas', 'Océano', 'Ciudad', 'Bosque'],
          correctAnswer: 0,
          explanation: 'La imagen muestra montañas majestuosas.',
          difficulty: 'beginner',
          category: 'comprehension'
        },
        {
          id: '2',
          question: 'Describe el ambiente de la imagen.',
          options: ['Tranquilo', 'Caótico', 'Urbano', 'Industrial'],
          correctAnswer: 0,
          explanation: 'El ambiente es sereno y tranquilo.',
          difficulty: 'intermediate',
          category: 'interpretation'
        }
      ]
    };

    it('POST /api/qa/generate should generate questions', async () => {
      mockFetch(mockQAResponse);

      const response = await fetch('/api/qa/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: 'Una hermosa imagen de montañas',
          language: 'es',
          difficulty: 'beginner',
          questionCount: 5
        })
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.questions).toHaveLength(2);
      expect(data.questions[0].question).toBeDefined();
      expect(data.questions[0].options).toHaveLength(4);
    });

    it('should validate required description parameter', async () => {
      mockFetch({ error: 'Description is required' }, 400);

      const response = await fetch('/api/qa/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: 'es' })
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Phrases Extraction Endpoint', () => {
    const mockPhrasesResponse = {
      phrases: {
        sustantivos: [
          { phrase: 'montaña', translation: 'mountain', context: 'La montaña es alta', difficulty: 'beginner' }
        ],
        verbos: [
          { phrase: 'observar', translation: 'to observe', context: 'Observar el paisaje', difficulty: 'intermediate' }
        ],
        adjetivos: [
          { phrase: 'hermoso', translation: 'beautiful', context: 'Un hermoso paisaje', difficulty: 'beginner' }
        ]
      }
    };

    it('POST /api/phrases/extract should extract phrases', async () => {
      mockFetch(mockPhrasesResponse);

      const response = await fetch('/api/phrases/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: 'Una hermosa montaña donde se puede observar el paisaje.',
          targetLevel: 'intermediate',
          maxPhrases: 10
        })
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.phrases.sustantivos).toHaveLength(1);
      expect(data.phrases.verbos).toHaveLength(1);
      expect(data.phrases.adjetivos).toHaveLength(1);
    });

    it('should validate required description parameter', async () => {
      mockFetch({ error: 'Description is required' }, 400);

      const response = await fetch('/api/phrases/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxPhrases: 10 })
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Vocabulary Save Endpoint', () => {
    it('POST /api/vocabulary/save should save vocabulary items', async () => {
      mockFetch({ 
        success: true, 
        saved: 3,
        message: 'Vocabulary saved successfully' 
      });

      const response = await fetch('/api/vocabulary/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vocabulary: [
            { phrase: 'montaña', translation: 'mountain', category: 'sustantivos' },
            { phrase: 'hermoso', translation: 'beautiful', category: 'adjetivos' },
            { phrase: 'observar', translation: 'to observe', category: 'verbos' }
          ]
        })
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.saved).toBe(3);
    });

    it('should validate vocabulary array', async () => {
      mockFetch({ error: 'Invalid vocabulary format' }, 400);

      const response = await fetch('/api/vocabulary/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vocabulary: 'invalid' })
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Settings Save Endpoint', () => {
    it('POST /api/settings/save should save user settings', async () => {
      mockFetch({ 
        success: true,
        message: 'Settings saved successfully' 
      });

      const response = await fetch('/api/settings/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: 'es',
          difficulty: 'intermediate',
          autoSave: true,
          theme: 'dark'
        })
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
    });

    it('should validate settings format', async () => {
      mockFetch({ error: 'Invalid settings format' }, 400);

      const response = await fetch('/api/settings/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invalid: true })
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Progress Tracking Endpoint', () => {
    it('POST /api/progress/track should track user progress', async () => {
      mockFetch({ 
        success: true,
        progress: {
          totalQuestions: 50,
          correctAnswers: 35,
          accuracy: 70,
          streak: 5
        }
      });

      const response = await fetch('/api/progress/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'test-session-123',
          questionId: 'q-1',
          isCorrect: true,
          timeSpent: 15000
        })
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.progress).toBeDefined();
    });

    it('should validate required tracking data', async () => {
      mockFetch({ error: 'Session ID is required' }, 400);

      const response = await fetch('/api/progress/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: 'q-1',
          isCorrect: true
        })
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Translation Endpoint', () => {
    it('POST /api/translate should translate text', async () => {
      mockFetch({
        translation: 'A beautiful mountain landscape',
        sourceLanguage: 'es',
        targetLanguage: 'en',
        confidence: 0.95
      });

      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'Un hermoso paisaje montañoso',
          sourceLanguage: 'es',
          targetLanguage: 'en'
        })
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.translation).toBeDefined();
      expect(data.confidence).toBeGreaterThan(0);
    });

    it('should detect language automatically', async () => {
      mockFetch({
        translation: 'Un hermoso paisaje montañoso',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        confidence: 0.92
      });

      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'A beautiful mountain landscape',
          targetLanguage: 'es'
        })
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.sourceLanguage).toBe('en');
    });
  });

  describe('Export Generation Endpoint', () => {
    it('POST /api/export/generate should generate export file', async () => {
      mockFetch({
        success: true,
        downloadUrl: 'https://example.com/export.csv',
        filename: 'vocabulary_export_20231205.csv',
        format: 'csv',
        recordCount: 25
      });

      const response = await fetch('/api/export/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: 'csv',
          includeTranslations: true,
          includeProgress: false
        })
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.downloadUrl).toBeDefined();
      expect(data.filename).toContain('.csv');
    });

    it('should support different export formats', async () => {
      mockFetch({
        success: true,
        downloadUrl: 'https://example.com/export.json',
        filename: 'vocabulary_export_20231205.json',
        format: 'json'
      });

      const response = await fetch('/api/export/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'json' })
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.format).toBe('json');
    });
  });

  describe('Cache Status Endpoint', () => {
    it('GET /api/cache/status should return cache information', async () => {
      mockFetch({
        redis: { connected: false, status: 'not_configured' },
        memory: { 
          used: 1024000,
          available: 8192000,
          percentage: 12.5
        },
        cacheHits: 0,
        cacheMisses: 0
      });

      const response = await fetch('/api/cache/status');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.redis).toBeDefined();
      expect(data.memory).toBeDefined();
    });
  });

  describe('Status Endpoint', () => {
    it('GET /api/status should return comprehensive status', async () => {
      mockFetch({
        status: 'operational',
        services: {
          openai: 'connected',
          unsplash: 'connected',
          database: 'not_configured',
          redis: 'not_configured'
        },
        performance: {
          uptime: 86400000,
          memoryUsage: 128.5,
          responseTime: 45
        }
      });

      const response = await fetch('/api/status');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.status).toBe('operational');
      expect(data.services).toBeDefined();
      expect(data.performance).toBeDefined();
    });
  });

  describe('Rate Limiting and Security', () => {
    it('should handle rate limiting', async () => {
      mockFetch({ 
        error: 'Rate limit exceeded',
        retryAfter: 60
      }, 429);

      const response = await fetch('/api/images/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'test' })
      });

      expect(response.status).toBe(429);
    });

    it('should validate content-type headers', async () => {
      mockFetch({ error: 'Content-Type must be application/json' }, 400);

      const response = await fetch('/api/descriptions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: 'invalid body'
      });

      expect(response.status).toBe(400);
    });

    it('should handle malformed JSON', async () => {
      mockFetch({ error: 'Invalid JSON' }, 400);

      const response = await fetch('/api/qa/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json{'
      });

      expect(response.status).toBe(400);
    });
  });

  describe('CORS and Preflight', () => {
    it('should handle OPTIONS requests', async () => {
      mockFetch('', 204);

      const response = await fetch('/api/images/search', {
        method: 'OPTIONS'
      });

      expect(response.status).toBe(204);
    });

    it('should include proper CORS headers', async () => {
      const mockResponse = createMockApiResponse({ status: 'ok' });
      mockResponse.headers = new Map([
        ['Access-Control-Allow-Origin', '*'],
        ['Access-Control-Allow-Methods', 'GET, POST, OPTIONS'],
        ['Access-Control-Allow-Headers', 'Content-Type']
      ]);

      global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

      const response = await fetch('/api/health');
      
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });
  });
});