import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';

// API Integration Tests
describe('API Integration Tests', () => {
  let server: any;
  let app: any;
  const PORT = 3001;

  beforeAll(async () => {
    const dev = process.env.NODE_ENV !== 'production';
    app = next({ dev, port: PORT });
    const handle = app.getRequestHandler();
    
    await app.prepare();
    
    server = createServer((req, res) => {
      const parsedUrl = parse(req.url!, true);
      handle(req, res, parsedUrl);
    });
    
    await new Promise<void>((resolve) => {
      server.listen(PORT, resolve);
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(resolve);
      });
    }
    if (app) {
      await app.close();
    }
  });

  describe('Image Search API', () => {
    it('should return search results for valid query', async () => {
      const response = await fetch(`http://localhost:${PORT}/api/images/search?query=landscape`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('results');
      expect(Array.isArray(data.results)).toBe(true);
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('totalPages');
    });

    it('should handle empty search query', async () => {
      const response = await fetch(`http://localhost:${PORT}/api/images/search?query=`);
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('Invalid parameters');
    });

    it('should handle special characters in search query', async () => {
      const specialQuery = encodeURIComponent('café & résumé!');
      const response = await fetch(`http://localhost:${PORT}/api/images/search?query=${specialQuery}`);
      
      // Should either succeed or fail gracefully
      expect([200, 500].includes(response.status)).toBe(true);
      
      const data = await response.json();
      if (response.status === 200) {
        expect(data).toHaveProperty('results');
      } else {
        // Should fall back to demo data
        expect(data).toHaveProperty('results');
        expect(data.results[0].id).toBe('fallback-error');
      }
    });

    it('should include proper CORS headers', async () => {
      const response = await fetch(`http://localhost:${PORT}/api/images/search?query=test`);
      
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
    });

    it('should include cache headers for performance', async () => {
      const response = await fetch(`http://localhost:${PORT}/api/images/search?query=test`);
      
      const cacheControl = response.headers.get('Cache-Control');
      expect(cacheControl).toContain('public');
      expect(response.headers.get('X-Response-Time')).toBeDefined();
    });

    it('should handle pagination parameters', async () => {
      const response = await fetch(`http://localhost:${PORT}/api/images/search?query=test&page=2&per_page=10`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.currentPage).toBe(2);
    });

    it('should validate pagination limits', async () => {
      const response = await fetch(`http://localhost:${PORT}/api/images/search?query=test&per_page=100`);
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toContain('Invalid parameters');
    });
  });

  describe('Description Generation API', () => {
    it('should generate English descriptions', async () => {
      const payload = {
        imageUrl: 'https://picsum.photos/800/600?seed=test',
        style: 'conversacional',
        language: 'en',
        maxLength: 300,
      };

      const response = await fetch(`http://localhost:${PORT}/api/descriptions/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('text');
      expect(typeof data.data.text).toBe('string');
    });

    it('should generate Spanish descriptions', async () => {
      const payload = {
        imageUrl: 'https://picsum.photos/800/600?seed=test',
        style: 'conversacional',
        language: 'es',
        maxLength: 300,
      };

      const response = await fetch(`http://localhost:${PORT}/api/descriptions/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success || data.metadata?.fallback).toBe(true);
      expect(data.data.text).toBeDefined();
    });

    it('should handle different styles', async () => {
      const styles = ['narrativo', 'poetico', 'academico', 'conversacional', 'infantil'];
      
      for (const style of styles) {
        const payload = {
          imageUrl: 'https://picsum.photos/800/600?seed=test',
          style,
          language: 'en',
          maxLength: 300,
        };

        const response = await fetch(`http://localhost:${PORT}/api/descriptions/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        expect(response.status).toBe(200);
        
        const data = await response.json();
        expect(data).toHaveProperty('data');
        expect(data.data).toHaveProperty('text');
      }
    });

    it('should handle missing required fields', async () => {
      const payload = {
        style: 'conversacional',
        language: 'en',
        // missing imageUrl
      };

      const response = await fetch(`http://localhost:${PORT}/api/descriptions/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(400);
    });

    it('should validate style parameter', async () => {
      const payload = {
        imageUrl: 'https://picsum.photos/800/600?seed=test',
        style: 'invalid-style',
        language: 'en',
        maxLength: 300,
      };

      const response = await fetch(`http://localhost:${PORT}/api/descriptions/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(400);
    });

    it('should handle invalid image URLs gracefully', async () => {
      const payload = {
        imageUrl: 'invalid-url',
        style: 'conversacional',
        language: 'en',
        maxLength: 300,
      };

      const response = await fetch(`http://localhost:${PORT}/api/descriptions/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      // Should either succeed with fallback or return proper error
      expect([200, 400].includes(response.status)).toBe(true);
    });
  });

  describe('Q&A Generation API', () => {
    it('should generate Q&A for valid description', async () => {
      const payload = {
        description: 'A beautiful landscape with mountains and trees',
        style: 'conversacional',
        difficulty: 'beginner',
        questionCount: 3,
      };

      const response = await fetch(`http://localhost:${PORT}/api/qa/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('questions');
      expect(Array.isArray(data.data.questions)).toBe(true);
    });

    it('should handle different difficulty levels', async () => {
      const difficulties = ['beginner', 'intermediate', 'advanced'];
      
      for (const difficulty of difficulties) {
        const payload = {
          description: 'A beautiful landscape with mountains and trees',
          style: 'conversacional',
          difficulty,
          questionCount: 2,
        };

        const response = await fetch(`http://localhost:${PORT}/api/qa/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        expect(response.status).toBe(200);
        
        const data = await response.json();
        expect(data.data.questions).toBeDefined();
      }
    });

    it('should validate question count limits', async () => {
      const payload = {
        description: 'Test description',
        style: 'conversacional',
        difficulty: 'beginner',
        questionCount: 20, // Too many
      };

      const response = await fetch(`http://localhost:${PORT}/api/qa/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(400);
    });

    it('should handle empty description', async () => {
      const payload = {
        description: '',
        style: 'conversacional',
        difficulty: 'beginner',
        questionCount: 3,
      };

      const response = await fetch(`http://localhost:${PORT}/api/qa/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Phrases Extraction API', () => {
    it('should extract phrases from valid description', async () => {
      const payload = {
        description: 'Un hermoso paisaje con montañas verdes y un cielo azul',
        difficulty: 'beginner',
        maxPhrases: 10,
      };

      const response = await fetch(`http://localhost:${PORT}/api/phrases/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('vocabulary');
      expect(data.data).toHaveProperty('phrases');
      expect(Array.isArray(data.data.vocabulary)).toBe(true);
      expect(Array.isArray(data.data.phrases)).toBe(true);
    });

    it('should handle different difficulty levels for phrase extraction', async () => {
      const difficulties = ['beginner', 'intermediate', 'advanced'];
      
      for (const difficulty of difficulties) {
        const payload = {
          description: 'Una descripción en español para extraer frases y vocabulario',
          difficulty,
          maxPhrases: 5,
        };

        const response = await fetch(`http://localhost:${PORT}/api/phrases/extract`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        expect(response.status).toBe(200);
        
        const data = await response.json();
        expect(data.data.vocabulary).toBeDefined();
        expect(data.data.phrases).toBeDefined();
      }
    });

    it('should validate maxPhrases parameter', async () => {
      const payload = {
        description: 'Test description',
        difficulty: 'beginner',
        maxPhrases: 100, // Too many
      };

      const response = await fetch(`http://localhost:${PORT}/api/phrases/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(400);
    });

    it('should handle non-Spanish text gracefully', async () => {
      const payload = {
        description: 'This is English text, not Spanish',
        difficulty: 'beginner',
        maxPhrases: 5,
      };

      const response = await fetch(`http://localhost:${PORT}/api/phrases/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      // Should handle gracefully with fallback
      expect([200, 400].includes(response.status)).toBe(true);
    });
  });

  describe('Health Check API', () => {
    it('should return healthy status', async () => {
      const response = await fetch(`http://localhost:${PORT}/api/health`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('timestamp');
    });
  });

  describe('API Performance Tests', () => {
    it('should handle concurrent requests', async () => {
      const requests = Array(5).fill(null).map(() => 
        fetch(`http://localhost:${PORT}/api/images/search?query=test${Math.random()}`)
      );

      const responses = await Promise.all(requests);
      
      for (const response of responses) {
        expect([200, 500].includes(response.status)).toBe(true);
      }
    });

    it('should complete requests within reasonable time', async () => {
      const start = Date.now();
      
      const response = await fetch(`http://localhost:${PORT}/api/images/search?query=performance-test`);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
      
      expect(response.status).toBe(200);
    });

    it('should handle rate limiting gracefully', async () => {
      // Make many rapid requests
      const requests = Array(20).fill(null).map((_, i) => 
        fetch(`http://localhost:${PORT}/api/images/search?query=rate-limit-test-${i}`)
      );

      const responses = await Promise.all(requests);
      
      // All should either succeed or fail gracefully
      for (const response of responses) {
        expect([200, 429, 500].includes(response.status)).toBe(true);
      }
    });
  });

  describe('API Error Handling', () => {
    it('should handle malformed JSON in POST requests', async () => {
      const response = await fetch(`http://localhost:${PORT}/api/descriptions/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json{',
      });

      expect(response.status).toBe(400);
    });

    it('should handle missing Content-Type header', async () => {
      const response = await fetch(`http://localhost:${PORT}/api/descriptions/generate`, {
        method: 'POST',
        body: JSON.stringify({
          imageUrl: 'test.jpg',
          style: 'conversacional',
          language: 'en',
        }),
      });

      // Should handle gracefully or require proper headers
      expect([200, 400, 415].includes(response.status)).toBe(true);
    });

    it('should handle oversized request bodies', async () => {
      const largePayload = {
        imageUrl: 'test.jpg',
        style: 'conversacional',
        language: 'en',
        largeField: 'x'.repeat(10000000), // 10MB string
      };

      const response = await fetch(`http://localhost:${PORT}/api/descriptions/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(largePayload),
      });

      expect([400, 413].includes(response.status)).toBe(true);
    });
  });
});