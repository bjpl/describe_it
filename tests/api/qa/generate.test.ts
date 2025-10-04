/**
 * QA Generation API Integration Tests
 * Tests /api/qa/generate endpoint
 * Priority: CRITICAL - Core business logic
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('../../../src/lib/api/openai-server', () => ({
  generateQA: vi.fn()
}));

vi.mock('../../../src/lib/services/database', () => ({
  saveQAToDatabase: vi.fn()
}));

vi.mock('../../../src/lib/logging/logger', () => ({
  apiLogger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}));

import { generateQA } from '../../../src/lib/api/openai-server';
import { saveQAToDatabase } from '../../../src/lib/services/database';

describe('QA Generation API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/qa/generate', () => {
    it('should generate Q&A from valid description', async () => {
      // Arrange
      const mockQA = {
        questions: [
          {
            id: '1',
            question: '¿Qué es esto?',
            answer: 'Es una manzana',
            difficulty: 'beginner' as const,
            type: 'multiple_choice' as const
          }
        ]
      };

      (generateQA as any).mockResolvedValue(mockQA);

      const request = new Request('http://localhost:3000/api/qa/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: 'Una manzana roja en la mesa',
          language: 'es',
          difficulty: 'beginner',
          count: 5
        })
      });

      // Act
      const { POST } = await import('../../../src/app/api/qa/generate/route');
      const response = await POST(request as NextRequest);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.questions).toBeDefined();
      expect(data.questions).toHaveLength(1);
      expect(generateQA).toHaveBeenCalledWith(expect.objectContaining({
        description: 'Una manzana roja en la mesa',
        language: 'es'
      }));
    });

    it('should reject empty description', async () => {
      const request = new Request('http://localhost:3000/api/qa/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: '',
          language: 'es'
        })
      });

      const { POST } = await import('../../../src/app/api/qa/generate/route');
      const response = await POST(request as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('description');
    });

    it('should handle invalid language codes', async () => {
      const request = new Request('http://localhost:3000/api/qa/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: 'Test description',
          language: 'invalid_lang'
        })
      });

      const { POST } = await import('../../../src/app/api/qa/generate/route');
      const response = await POST(request as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should handle OpenAI API errors gracefully', async () => {
      (generateQA as any).mockRejectedValue(new Error('OpenAI API error'));

      const request = new Request('http://localhost:3000/api/qa/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: 'Test description',
          language: 'es'
        })
      });

      const { POST } = await import('../../../src/app/api/qa/generate/route');
      const response = await POST(request as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('should validate difficulty levels', async () => {
      const validDifficulties = ['beginner', 'intermediate', 'advanced'];

      for (const difficulty of validDifficulties) {
        const request = new Request('http://localhost:3000/api/qa/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: 'Test',
            language: 'es',
            difficulty
          })
        });

        const { POST } = await import('../../../src/app/api/qa/generate/route');
        const response = await POST(request as NextRequest);

        expect(response.status).not.toBe(400);
      }
    });

    it('should enforce rate limiting', async () => {
      // Make multiple rapid requests
      const requests = Array.from({ length: 20 }, () =>
        new Request('http://localhost:3000/api/qa/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Forwarded-For': '192.168.1.1'
          },
          body: JSON.stringify({
            description: 'Test',
            language: 'es'
          })
        })
      );

      const { POST } = await import('../../../src/app/api/qa/generate/route');
      const responses = await Promise.all(
        requests.map(req => POST(req as NextRequest))
      );

      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should save generated Q&A to database when userId provided', async () => {
      const mockQA = {
        questions: [{ id: '1', question: 'Test?', answer: 'Answer' }]
      };

      (generateQA as any).mockResolvedValue(mockQA);
      (saveQAToDatabase as any).mockResolvedValue({ success: true });

      const request = new Request('http://localhost:3000/api/qa/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: 'Test',
          language: 'es',
          userId: 'user-123'
        })
      });

      const { POST } = await import('../../../src/app/api/qa/generate/route');
      await POST(request as NextRequest);

      expect(saveQAToDatabase).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          questions: mockQA.questions
        })
      );
    });

    it('should include proper CORS headers', async () => {
      const request = new Request('http://localhost:3000/api/qa/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: 'Test',
          language: 'es'
        })
      });

      const { POST } = await import('../../../src/app/api/qa/generate/route');
      const response = await POST(request as NextRequest);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBeDefined();
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });

    it('should handle malformed JSON gracefully', async () => {
      const request = new Request('http://localhost:3000/api/qa/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json {'
      });

      const { POST } = await import('../../../src/app/api/qa/generate/route');
      const response = await POST(request as NextRequest);

      expect(response.status).toBe(400);
    });

    it('should respect question count limits', async () => {
      const request = new Request('http://localhost:3000/api/qa/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: 'Test',
          language: 'es',
          count: 100 // Excessive count
        })
      });

      const { POST } = await import('../../../src/app/api/qa/generate/route');
      const response = await POST(request as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('count');
    });
  });

  describe('OPTIONS /api/qa/generate', () => {
    it('should handle CORS preflight requests', async () => {
      const request = new Request('http://localhost:3000/api/qa/generate', {
        method: 'OPTIONS'
      });

      const { OPTIONS } = await import('../../../src/app/api/qa/generate/route');
      if (OPTIONS) {
        const response = await OPTIONS(request as NextRequest);
        expect(response.status).toBe(200);
        expect(response.headers.get('Access-Control-Allow-Methods')).toBeDefined();
      }
    });
  });
});
