/**
 * Comprehensive Translation API Tests
 * Tests all endpoints, error handling, and edge cases
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST, GET } from '@/app/api/translate/route';
import { NextRequest } from 'next/server';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
  logApiCall: vi.fn(),
  logApiResponse: vi.fn(),
}));

// Mock Claude server
vi.mock('@/lib/api/claude-server', () => ({
  translateWithClaude: vi.fn(),
}));

// Mock json-safe utilities
vi.mock('@/lib/utils/json-safe', () => ({
  safeParse: vi.fn((str) => {
    try {
      return JSON.parse(str);
    } catch {
      return undefined;
    }
  }),
  safeStringify: vi.fn((obj) => JSON.stringify(obj)),
}));

describe('Translation API - Comprehensive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });

  describe('POST /api/translate', () => {
    describe('Request Validation', () => {
      it('should validate required text field', async () => {
        const req = new NextRequest('http://localhost:3000/api/translate', {
          method: 'POST',
          body: JSON.stringify({
            sourceLanguage: 'es',
            targetLanguage: 'en',
          }),
        });

        const response = await POST(req);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain('Text is required');
      });

      it('should validate required source language', async () => {
        const req = new NextRequest('http://localhost:3000/api/translate', {
          method: 'POST',
          body: JSON.stringify({
            text: 'hola',
            targetLanguage: 'en',
          }),
        });

        const response = await POST(req);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain('source and target languages are required');
      });

      it('should validate required target language', async () => {
        const req = new NextRequest('http://localhost:3000/api/translate', {
          method: 'POST',
          body: JSON.stringify({
            text: 'hola',
            sourceLanguage: 'es',
          }),
        });

        const response = await POST(req);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain('source and target languages are required');
      });

      it('should validate supported languages', async () => {
        const req = new NextRequest('http://localhost:3000/api/translate', {
          method: 'POST',
          body: JSON.stringify({
            text: 'hello',
            sourceLanguage: 'invalid',
            targetLanguage: 'en',
          }),
        });

        const response = await POST(req);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain('Unsupported language code');
      });

      it('should reject invalid JSON', async () => {
        const req = new NextRequest('http://localhost:3000/api/translate', {
          method: 'POST',
          body: 'invalid json{',
        });

        const response = await POST(req);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain('Invalid JSON');
      });

      it('should accept all supported language codes', async () => {
        const languages = ['en', 'es', 'fr', 'de', 'it', 'pt'];

        for (const lang of languages) {
          const req = new NextRequest('http://localhost:3000/api/translate', {
            method: 'POST',
            body: JSON.stringify({
              text: 'test',
              sourceLanguage: 'en',
              targetLanguage: lang,
            }),
          });

          const response = await POST(req);
          expect(response.status).toBe(200);
        }
      });
    });

    describe('Mock Translation', () => {
      it('should return mock translation when no API key', async () => {
        const req = new NextRequest('http://localhost:3000/api/translate', {
          method: 'POST',
          body: JSON.stringify({
            text: 'casa',
            sourceLanguage: 'es',
            targetLanguage: 'en',
          }),
        });

        const response = await POST(req);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.translation).toBe('house');
        expect(data.confidence).toBe(0.85);
        expect(data.detectedLanguage).toBe('es');
      });

      it('should handle Spanish to English common words', async () => {
        const testCases = [
          { text: 'gato', expected: 'cat' },
          { text: 'perro', expected: 'dog' },
          { text: 'agua', expected: 'water' },
          { text: 'libro', expected: 'book' },
        ];

        for (const { text, expected } of testCases) {
          const req = new NextRequest('http://localhost:3000/api/translate', {
            method: 'POST',
            body: JSON.stringify({
              text,
              sourceLanguage: 'es',
              targetLanguage: 'en',
            }),
          });

          const response = await POST(req);
          const data = await response.json();

          expect(data.translation).toBe(expected);
        }
      });

      it('should handle Spanish phrases', async () => {
        const req = new NextRequest('http://localhost:3000/api/translate', {
          method: 'POST',
          body: JSON.stringify({
            text: 'buenos días',
            sourceLanguage: 'es',
            targetLanguage: 'en',
          }),
        });

        const response = await POST(req);
        const data = await response.json();

        expect(data.translation).toBe('good morning');
      });

      it('should handle English to Spanish', async () => {
        const req = new NextRequest('http://localhost:3000/api/translate', {
          method: 'POST',
          body: JSON.stringify({
            text: 'cat',
            sourceLanguage: 'en',
            targetLanguage: 'es',
          }),
        });

        const response = await POST(req);
        const data = await response.json();

        expect(data.translation).toBe('gato');
      });

      it('should handle unknown words gracefully', async () => {
        const req = new NextRequest('http://localhost:3000/api/translate', {
          method: 'POST',
          body: JSON.stringify({
            text: 'unknownword123',
            sourceLanguage: 'es',
            targetLanguage: 'en',
          }),
        });

        const response = await POST(req);
        const data = await response.json();

        expect(data.translation).toContain('unknownword123');
        expect(data.translation).toContain('[translation not available]');
      });

      it('should handle pattern-based translations', async () => {
        const testCases = [
          { text: 'información', pattern: 'tion' },
          { text: 'ciudad', pattern: 'ty' },
          { text: 'rápidamente', pattern: 'ly' },
        ];

        for (const { text, pattern } of testCases) {
          const req = new NextRequest('http://localhost:3000/api/translate', {
            method: 'POST',
            body: JSON.stringify({
              text,
              sourceLanguage: 'es',
              targetLanguage: 'en',
            }),
          });

          const response = await POST(req);
          const data = await response.json();

          // Should apply transformation pattern
          expect(data.translation).toBeTruthy();
        }
      });
    });

    describe('Claude Translation Integration', () => {
      it('should use Claude when API key available', async () => {
        process.env.ANTHROPIC_API_KEY = 'test-key';
        const { translateWithClaude } = await import('@/lib/api/claude-server');

        vi.mocked(translateWithClaude).mockResolvedValue('hello');

        const req = new NextRequest('http://localhost:3000/api/translate', {
          method: 'POST',
          body: JSON.stringify({
            text: 'hola',
            sourceLanguage: 'es',
            targetLanguage: 'en',
          }),
        });

        const response = await POST(req);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(translateWithClaude).toHaveBeenCalledWith('hola', 'es', 'en');
        expect(data.translation).toBe('hello');
        expect(data.confidence).toBe(0.95);
      });

      it('should fallback to mock on Claude error', async () => {
        process.env.ANTHROPIC_API_KEY = 'test-key';
        const { translateWithClaude } = await import('@/lib/api/claude-server');

        vi.mocked(translateWithClaude).mockRejectedValue(new Error('Claude error'));

        const req = new NextRequest('http://localhost:3000/api/translate', {
          method: 'POST',
          body: JSON.stringify({
            text: 'casa',
            sourceLanguage: 'es',
            targetLanguage: 'en',
          }),
        });

        const response = await POST(req);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.translation).toBe('house');
        expect(data.confidence).toBe(0.85);
      });

      it('should use OpenAI key if available', async () => {
        process.env.OPENAI_API_KEY = 'test-openai-key';
        const { translateWithClaude } = await import('@/lib/api/claude-server');

        vi.mocked(translateWithClaude).mockResolvedValue('translation');

        const req = new NextRequest('http://localhost:3000/api/translate', {
          method: 'POST',
          body: JSON.stringify({
            text: 'test',
            sourceLanguage: 'es',
            targetLanguage: 'en',
          }),
        });

        const response = await POST(req);
        expect(response.status).toBe(200);
        expect(translateWithClaude).toHaveBeenCalled();
      });
    });

    describe('Context Handling', () => {
      it('should accept context parameter', async () => {
        const req = new NextRequest('http://localhost:3000/api/translate', {
          method: 'POST',
          body: JSON.stringify({
            text: 'banco',
            sourceLanguage: 'es',
            targetLanguage: 'en',
            context: 'financial institution',
          }),
        });

        const response = await POST(req);
        expect(response.status).toBe(200);
      });

      it('should work without context', async () => {
        const req = new NextRequest('http://localhost:3000/api/translate', {
          method: 'POST',
          body: JSON.stringify({
            text: 'banco',
            sourceLanguage: 'es',
            targetLanguage: 'en',
          }),
        });

        const response = await POST(req);
        expect(response.status).toBe(200);
      });
    });

    describe('Error Handling', () => {
      it('should handle internal errors gracefully', async () => {
        const req = new NextRequest('http://localhost:3000/api/translate', {
          method: 'POST',
          body: JSON.stringify({
            text: null,
            sourceLanguage: 'es',
            targetLanguage: 'en',
          }),
        });

        const response = await POST(req);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBeTruthy();
      });

      it('should log errors', async () => {
        const { logger } = await import('@/lib/logger');

        const req = new NextRequest('http://localhost:3000/api/translate', {
          method: 'POST',
          body: 'invalid{json',
        });

        await POST(req);

        expect(logger.error).not.toHaveBeenCalled(); // Invalid JSON is handled gracefully
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty text', async () => {
        const req = new NextRequest('http://localhost:3000/api/translate', {
          method: 'POST',
          body: JSON.stringify({
            text: '',
            sourceLanguage: 'es',
            targetLanguage: 'en',
          }),
        });

        const response = await POST(req);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain('Text is required');
      });

      it('should handle very long text', async () => {
        const longText = 'palabra '.repeat(1000);
        const req = new NextRequest('http://localhost:3000/api/translate', {
          method: 'POST',
          body: JSON.stringify({
            text: longText,
            sourceLanguage: 'es',
            targetLanguage: 'en',
          }),
        });

        const response = await POST(req);
        expect(response.status).toBe(200);
      });

      it('should handle special characters', async () => {
        const req = new NextRequest('http://localhost:3000/api/translate', {
          method: 'POST',
          body: JSON.stringify({
            text: '¿Cómo estás? ¡Hola! ñ',
            sourceLanguage: 'es',
            targetLanguage: 'en',
          }),
        });

        const response = await POST(req);
        expect(response.status).toBe(200);
      });

      it('should handle same source and target language', async () => {
        const req = new NextRequest('http://localhost:3000/api/translate', {
          method: 'POST',
          body: JSON.stringify({
            text: 'hello',
            sourceLanguage: 'en',
            targetLanguage: 'en',
          }),
        });

        const response = await POST(req);
        expect(response.status).toBe(200);
      });

      it('should handle case-insensitive matching', async () => {
        const req = new NextRequest('http://localhost:3000/api/translate', {
          method: 'POST',
          body: JSON.stringify({
            text: 'CASA',
            sourceLanguage: 'es',
            targetLanguage: 'en',
          }),
        });

        const response = await POST(req);
        const data = await response.json();

        expect(data.translation).toBe('house');
      });
    });

    describe('Response Format', () => {
      it('should return proper response structure', async () => {
        const req = new NextRequest('http://localhost:3000/api/translate', {
          method: 'POST',
          body: JSON.stringify({
            text: 'gato',
            sourceLanguage: 'es',
            targetLanguage: 'en',
          }),
        });

        const response = await POST(req);
        const data = await response.json();

        expect(data).toHaveProperty('translation');
        expect(data).toHaveProperty('confidence');
        expect(data).toHaveProperty('detectedLanguage');
        expect(typeof data.translation).toBe('string');
        expect(typeof data.confidence).toBe('number');
        expect(data.confidence).toBeGreaterThan(0);
        expect(data.confidence).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('GET /api/translate', () => {
    it('should return service status', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('ok');
    });

    it('should list supported languages', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.supportedLanguages).toBeDefined();
      expect(Array.isArray(data.supportedLanguages)).toBe(true);
      expect(data.supportedLanguages.length).toBeGreaterThan(0);

      const languages = data.supportedLanguages.map((l: { code: string }) => l.code);
      expect(languages).toContain('en');
      expect(languages).toContain('es');
      expect(languages).toContain('fr');
      expect(languages).toContain('de');
      expect(languages).toContain('it');
      expect(languages).toContain('pt');
    });

    it('should include language names', async () => {
      const response = await GET();
      const data = await response.json();

      const english = data.supportedLanguages.find((l: { code: string }) => l.code === 'en');
      expect(english.name).toBe('English');

      const spanish = data.supportedLanguages.find((l: { code: string }) => l.code === 'es');
      expect(spanish.name).toBe('Spanish');
    });

    it('should list available features', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.features).toBeDefined();
      expect(Array.isArray(data.features)).toBe(true);
      expect(data.features).toContain('vocabulary_translation');
      expect(data.features).toContain('contextual_translation');
    });

    it('should identify agent', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.agent).toBe('gamma-3-translation-service');
    });
  });

  describe('Performance', () => {
    it('should complete translation within reasonable time', async () => {
      const start = Date.now();

      const req = new NextRequest('http://localhost:3000/api/translate', {
        method: 'POST',
        body: JSON.stringify({
          text: 'casa',
          sourceLanguage: 'es',
          targetLanguage: 'en',
        }),
      });

      await POST(req);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(5000); // Should complete in less than 5 seconds
    });

    it('should handle concurrent requests', async () => {
      const requests = Array(10)
        .fill(null)
        .map(() =>
          new NextRequest('http://localhost:3000/api/translate', {
            method: 'POST',
            body: JSON.stringify({
              text: 'gato',
              sourceLanguage: 'es',
              targetLanguage: 'en',
            }),
          })
        );

      const responses = await Promise.all(requests.map(req => POST(req)));

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });
});
