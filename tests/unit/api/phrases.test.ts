import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../../src/app/api/phrases/extract/route';
import { NextRequest } from 'next/server';

// Mock the services
const mockOpenAIService = {
  extractPhrases: vi.fn(),
};

const mockSupabaseService = {
  savePhrase: vi.fn(),
};

vi.mock('../../../src/lib/api/openai', () => ({
  openAIService: mockOpenAIService,
}));

vi.mock('../../../src/lib/api/supabase', () => ({
  supabaseService: mockSupabaseService,
}));

describe('/api/phrases/extract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/phrases/extract', () => {
    const validRequest = {
      text: 'Esta es una hermosa imagen que muestra un paisaje montañoso con un cielo azul brillante.',
      descriptionId: 'desc123',
      categories: ['sustantivos', 'adjetivos'],
      maxPhrases: 15,
    };

    const mockPhrases = {
      phrases: [
        {
          id: 'phrase1',
          text: 'paisaje montañoso',
          category: 'sustantivos',
          translation: 'mountainous landscape',
          difficulty: 'intermediate',
        },
        {
          id: 'phrase2',
          text: 'cielo azul',
          category: 'sustantivos',
          translation: 'blue sky',
          difficulty: 'beginner',
        },
        {
          id: 'phrase3',
          text: 'brillante',
          category: 'adjetivos',
          translation: 'bright',
          difficulty: 'beginner',
        },
      ],
    };

    it('should extract phrases successfully without saving to database', async () => {
      const requestWithoutDescId = {
        text: validRequest.text,
        categories: validRequest.categories,
        maxPhrases: validRequest.maxPhrases,
      };

      mockOpenAIService.extractPhrases.mockResolvedValue(mockPhrases);

      const request = new NextRequest('http://localhost:3000/api/phrases/extract', {
        method: 'POST',
        body: JSON.stringify(requestWithoutDescId),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.phrases).toEqual(mockPhrases.phrases);
      expect(mockOpenAIService.extractPhrases).toHaveBeenCalledWith(requestWithoutDescId);
      expect(mockSupabaseService.savePhrase).not.toHaveBeenCalled();
    });

    it('should extract and save phrases with descriptionId', async () => {
      const savedPhrases = mockPhrases.phrases.map(phrase => ({ 
        ...phrase, 
        id: `saved-${phrase.id}`,
        descriptionId: validRequest.descriptionId,
      }));

      mockOpenAIService.extractPhrases.mockResolvedValue(mockPhrases);
      mockSupabaseService.savePhrase.mockImplementation((phrase) => 
        Promise.resolve({ ...phrase, id: `saved-${phrase.id}` })
      );

      const request = new NextRequest('http://localhost:3000/api/phrases/extract', {
        method: 'POST',
        body: JSON.stringify(validRequest),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.phrases).toHaveLength(3);
      expect(mockOpenAIService.extractPhrases).toHaveBeenCalledWith(validRequest);
      expect(mockSupabaseService.savePhrase).toHaveBeenCalledTimes(3);
      
      // Check that each phrase was saved with the descriptionId
      mockPhrases.phrases.forEach((phrase) => {
        expect(mockSupabaseService.savePhrase).toHaveBeenCalledWith({
          ...phrase,
          descriptionId: validRequest.descriptionId,
        });
      });
    });

    it('should return 400 for missing text parameter', async () => {
      const invalidRequest = {
        categories: ['sustantivos'],
        maxPhrases: 10,
      };

      const request = new NextRequest('http://localhost:3000/api/phrases/extract', {
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

    it('should return 400 for text that is too short', async () => {
      const invalidRequest = {
        text: 'Short',
        maxPhrases: 10,
      };

      const request = new NextRequest('http://localhost:3000/api/phrases/extract', {
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

    it('should return 400 for invalid categories', async () => {
      const invalidRequest = {
        text: validRequest.text,
        categories: ['invalid_category'],
      };

      const request = new NextRequest('http://localhost:3000/api/phrases/extract', {
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

    it('should return 400 for maxPhrases out of range', async () => {
      const invalidRequest = {
        text: validRequest.text,
        maxPhrases: 100, // Exceeds max of 50
      };

      const request = new NextRequest('http://localhost:3000/api/phrases/extract', {
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
        text: validRequest.text,
      };

      mockOpenAIService.extractPhrases.mockResolvedValue(mockPhrases);

      const request = new NextRequest('http://localhost:3000/api/phrases/extract', {
        method: 'POST',
        body: JSON.stringify(minimalRequest),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockOpenAIService.extractPhrases).toHaveBeenCalledWith({
        text: validRequest.text,
        maxPhrases: 20, // Default value
      });
    });

    it('should handle all valid categories', async () => {
      const validCategories = ['sustantivos', 'verbos', 'adjetivos', 'adverbios', 'frases_clave'];
      
      const requestWithAllCategories = {
        text: validRequest.text,
        categories: validCategories,
      };

      mockOpenAIService.extractPhrases.mockResolvedValue(mockPhrases);

      const request = new NextRequest('http://localhost:3000/api/phrases/extract', {
        method: 'POST',
        body: JSON.stringify(requestWithAllCategories),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockOpenAIService.extractPhrases).toHaveBeenCalledWith(requestWithAllCategories);
    });

    it('should handle OpenAI service errors', async () => {
      mockOpenAIService.extractPhrases.mockRejectedValue(new Error('OpenAI API error'));

      const request = new NextRequest('http://localhost:3000/api/phrases/extract', {
        method: 'POST',
        body: JSON.stringify(validRequest),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to extract phrases');
    });

    it('should handle database save errors', async () => {
      mockOpenAIService.extractPhrases.mockResolvedValue(mockPhrases);
      mockSupabaseService.savePhrase.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/phrases/extract', {
        method: 'POST',
        body: JSON.stringify(validRequest),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to extract phrases');
    });

    it('should handle partial database save failures', async () => {
      mockOpenAIService.extractPhrases.mockResolvedValue(mockPhrases);
      mockSupabaseService.savePhrase
        .mockResolvedValueOnce({ ...mockPhrases.phrases[0], id: 'saved-phrase1' })
        .mockRejectedValueOnce(new Error('Database error'))
        .mockResolvedValueOnce({ ...mockPhrases.phrases[2], id: 'saved-phrase3' });

      const request = new NextRequest('http://localhost:3000/api/phrases/extract', {
        method: 'POST',
        body: JSON.stringify(validRequest),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to extract phrases');
    });

    it('should handle empty phrase extraction results', async () => {
      const emptyResult = { phrases: [] };
      mockOpenAIService.extractPhrases.mockResolvedValue(emptyResult);

      const request = new NextRequest('http://localhost:3000/api/phrases/extract', {
        method: 'POST',
        body: JSON.stringify(validRequest),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.phrases).toEqual([]);
      expect(mockSupabaseService.savePhrase).not.toHaveBeenCalled();
    });

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/phrases/extract', {
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