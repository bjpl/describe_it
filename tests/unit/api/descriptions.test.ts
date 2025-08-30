import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../../src/app/api/descriptions/generate/route';
import { NextRequest } from 'next/server';

// Mock the services
const mockOpenAIService = {
  generateDescription: vi.fn(),
};

const mockSupabaseService = {
  saveDescription: vi.fn(),
};

const mockGetServerSession = vi.fn();

vi.mock('../../../src/lib/api/openai', () => ({
  openAIService: mockOpenAIService,
}));

vi.mock('../../../src/lib/api/supabase', () => ({
  supabaseService: mockSupabaseService,
}));

vi.mock('next-auth/next', () => ({
  getServerSession: mockGetServerSession,
}));

describe('/api/descriptions/generate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/descriptions/generate', () => {
    const validRequest = {
      imageUrl: 'https://example.com/image.jpg',
      style: 'narrativo',
      language: 'es',
      maxLength: 300,
    };

    const mockDescription = {
      style: 'narrativo',
      text: 'Esta es una hermosa imagen que muestra...',
      language: 'es',
      wordCount: 25,
      generatedAt: '2023-01-01T12:00:00Z',
    };

    it('should generate description successfully without authentication', async () => {
      mockGetServerSession.mockResolvedValue(null);
      mockOpenAIService.generateDescription.mockResolvedValue(mockDescription);

      const request = new NextRequest('http://localhost:3000/api/descriptions/generate', {
        method: 'POST',
        body: JSON.stringify(validRequest),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockDescription);
      expect(mockOpenAIService.generateDescription).toHaveBeenCalledWith(validRequest);
      expect(mockSupabaseService.saveDescription).not.toHaveBeenCalled();
    });

    it('should generate and save description with authentication', async () => {
      const mockSession = {
        user: {
          id: 'user123',
          email: 'user@example.com',
        },
      };

      mockGetServerSession.mockResolvedValue(mockSession);
      mockOpenAIService.generateDescription.mockResolvedValue(mockDescription);
      mockSupabaseService.saveDescription.mockResolvedValue({ id: 'desc123', ...mockDescription });

      const request = new NextRequest('http://localhost:3000/api/descriptions/generate', {
        method: 'POST',
        body: JSON.stringify(validRequest),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockDescription);
      expect(mockOpenAIService.generateDescription).toHaveBeenCalledWith(validRequest);
      expect(mockSupabaseService.saveDescription).toHaveBeenCalledWith({
        ...mockDescription,
        userId: 'user123',
        imageUrl: validRequest.imageUrl,
      });
    });

    it('should return 400 for missing imageUrl', async () => {
      const invalidRequest = {
        style: 'narrativo',
        language: 'es',
      };

      const request = new NextRequest('http://localhost:3000/api/descriptions/generate', {
        method: 'POST',
        body: JSON.stringify(invalidRequest),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid parameters');
      expect(data.details).toBeDefined();
    });

    it('should return 400 for invalid imageUrl', async () => {
      const invalidRequest = {
        imageUrl: 'not-a-valid-url',
        style: 'narrativo',
      };

      const request = new NextRequest('http://localhost:3000/api/descriptions/generate', {
        method: 'POST',
        body: JSON.stringify(invalidRequest),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid parameters');
    });

    it('should return 400 for invalid style', async () => {
      const invalidRequest = {
        imageUrl: 'https://example.com/image.jpg',
        style: 'invalid-style',
      };

      const request = new NextRequest('http://localhost:3000/api/descriptions/generate', {
        method: 'POST',
        body: JSON.stringify(invalidRequest),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid parameters');
    });

    it('should return 400 for invalid language', async () => {
      const invalidRequest = {
        imageUrl: 'https://example.com/image.jpg',
        style: 'narrativo',
        language: 'invalid',
      };

      const request = new NextRequest('http://localhost:3000/api/descriptions/generate', {
        method: 'POST',
        body: JSON.stringify(invalidRequest),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid parameters');
    });

    it('should return 400 for invalid maxLength', async () => {
      const invalidRequest = {
        imageUrl: 'https://example.com/image.jpg',
        style: 'narrativo',
        maxLength: 50, // Below minimum of 100
      };

      const request = new NextRequest('http://localhost:3000/api/descriptions/generate', {
        method: 'POST',
        body: JSON.stringify(invalidRequest),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid parameters');
    });

    it('should use default values for optional parameters', async () => {
      const minimalRequest = {
        imageUrl: 'https://example.com/image.jpg',
        style: 'narrativo',
      };

      mockGetServerSession.mockResolvedValue(null);
      mockOpenAIService.generateDescription.mockResolvedValue(mockDescription);

      const request = new NextRequest('http://localhost:3000/api/descriptions/generate', {
        method: 'POST',
        body: JSON.stringify(minimalRequest),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockOpenAIService.generateDescription).toHaveBeenCalledWith({
        imageUrl: 'https://example.com/image.jpg',
        style: 'narrativo',
        language: 'es',
        maxLength: 300,
      });
    });

    it('should handle OpenAI service errors', async () => {
      mockGetServerSession.mockResolvedValue(null);
      mockOpenAIService.generateDescription.mockRejectedValue(new Error('OpenAI API error'));

      const request = new NextRequest('http://localhost:3000/api/descriptions/generate', {
        method: 'POST',
        body: JSON.stringify(validRequest),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to generate description');
    });

    it('should handle Supabase save errors gracefully', async () => {
      const mockSession = {
        user: {
          id: 'user123',
          email: 'user@example.com',
        },
      };

      mockGetServerSession.mockResolvedValue(mockSession);
      mockOpenAIService.generateDescription.mockResolvedValue(mockDescription);
      mockSupabaseService.saveDescription.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/descriptions/generate', {
        method: 'POST',
        body: JSON.stringify(validRequest),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to generate description');
    });

    it('should handle all valid styles', async () => {
      const styles = ['narrativo', 'poetico', 'academico', 'conversacional', 'infantil'];

      mockGetServerSession.mockResolvedValue(null);
      mockOpenAIService.generateDescription.mockResolvedValue(mockDescription);

      for (const style of styles) {
        const request = new NextRequest('http://localhost:3000/api/descriptions/generate', {
          method: 'POST',
          body: JSON.stringify({
            imageUrl: 'https://example.com/image.jpg',
            style,
          }),
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const response = await POST(request);
        expect(response.status).toBe(200);
      }
    });

    it('should handle custom prompts', async () => {
      const requestWithPrompt = {
        ...validRequest,
        customPrompt: 'Focus on the technical aspects of photography',
      };

      mockGetServerSession.mockResolvedValue(null);
      mockOpenAIService.generateDescription.mockResolvedValue(mockDescription);

      const request = new NextRequest('http://localhost:3000/api/descriptions/generate', {
        method: 'POST',
        body: JSON.stringify(requestWithPrompt),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockOpenAIService.generateDescription).toHaveBeenCalledWith(requestWithPrompt);
    });

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/descriptions/generate', {
        method: 'POST',
        body: '{"invalid": json}',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });
  });
});