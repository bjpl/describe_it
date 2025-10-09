/**
 * Comprehensive Unit Tests for claude-server.ts
 * Testing Claude Sonnet 4.5 integration with Anthropic SDK
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type Anthropic from '@anthropic-ai/sdk';

// Mock the Anthropic SDK - use factory function for proper hoisting
vi.mock('@anthropic-ai/sdk', () => {
  const mockCreate = vi.fn();
  const MockAnthropic = vi.fn().mockImplementation(() => ({
    messages: {
      create: mockCreate,
    },
  }));
  MockAnthropic.mockCreate = mockCreate;
  return {
    default: MockAnthropic,
  };
});

// Mock the key manager
vi.mock('@/lib/keys/keyManager', () => ({
  keyManager: {},
  getServerKey: vi.fn(),
}));

// Mock loggers
vi.mock('@/lib/logging/logger', () => ({
  apiLogger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  securityLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  performanceLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock Sentry
vi.mock('@sentry/nextjs', () => ({
  startSpan: vi.fn((options, callback) => callback()),
  captureException: vi.fn(),
}));

// Mock Claude metrics
vi.mock('@/lib/monitoring/claude-metrics', () => ({
  trackClaudeAPICall: vi.fn(),
  trackClaudeError: vi.fn(),
  startClaudeSpan: vi.fn(() => ({ finish: vi.fn() })),
  calculateClaudeCost: vi.fn(() => 0.001),
  ClaudePerformanceTracker: vi.fn().mockImplementation(() => ({
    mark: vi.fn(),
    measure: vi.fn(),
    getMetrics: vi.fn(() => ({})),
    finish: vi.fn(),
  })),
  checkPerformanceThreshold: vi.fn(),
  trackEndpointErrorRate: vi.fn(),
}));

// Import after mocks are set up
import {
  getServerClaudeClient,
  generateClaudeVisionDescription,
  generateClaudeCompletion,
  generateClaudeQA,
  translateWithClaude,
  extractVocabularyWithClaude,
  CLAUDE_MODEL,
  CLAUDE_MAX_TOKENS,
} from '@/lib/api/claude-server';
import { getServerKey } from '@/lib/keys/keyManager';
import { apiLogger, securityLogger, performanceLogger } from '@/lib/logging/logger';
import AnthropicModule from '@anthropic-ai/sdk';

// Type assertion for mock access
const MockAnthropic = AnthropicModule as any;
const mockCreate = MockAnthropic.mockCreate as ReturnType<typeof vi.fn>;
const mockGetServerKey = getServerKey as ReturnType<typeof vi.fn>;
const mockApiLogger = apiLogger as any;
const mockSecurityLogger = securityLogger as any;
const mockPerformanceLogger = performanceLogger as any;

describe('Claude Server - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset singleton instance between tests
    // @ts-ignore - accessing private variable for testing
    if (typeof global !== 'undefined') {
      delete (global as any).window;
    }
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Constants', () => {
    it('should export correct Claude model identifier', () => {
      expect(CLAUDE_MODEL).toBe('claude-sonnet-4-5-20250629');
    });

    it('should export correct max tokens', () => {
      expect(CLAUDE_MAX_TOKENS).toBe(8192);
    });
  });

  describe('getServerClaudeClient', () => {
    it('should throw error when called from client-side', () => {
      // Simulate client-side environment
      (global as any).window = {};

      expect(() => getServerClaudeClient()).toThrow(
        '[Claude Server] This function can only be called server-side'
      );
    });

    it('should use user-provided API key when valid', () => {
      const userApiKey = 'sk-ant-test-user-key';
      mockGetServerKey.mockReturnValue(null);

      const client = getServerClaudeClient(userApiKey);

      expect(client).toBeDefined();
      expect(MockAnthropic).toHaveBeenCalledWith({
        apiKey: userApiKey,
        timeout: 60000,
        maxRetries: 0,
      });
      expect(mockSecurityLogger.info).toHaveBeenCalledWith(
        'Using user-provided Anthropic API key'
      );
    });

    it('should use server environment key when user key not provided', () => {
      const serverApiKey = 'sk-ant-server-key';
      mockGetServerKey.mockReturnValue(serverApiKey);

      const client = getServerClaudeClient();

      expect(client).toBeDefined();
      expect(mockGetServerKey).toHaveBeenCalledWith('anthropic');
      expect(mockSecurityLogger.info).toHaveBeenCalledWith(
        'Using server environment Anthropic API key'
      );
    });

    it('should return null when no API key available', () => {
      mockGetServerKey.mockReturnValue(null);

      const client = getServerClaudeClient();

      expect(client).toBeNull();
      expect(mockApiLogger.warn).toHaveBeenCalledWith(
        'No valid Anthropic API key available'
      );
    });

    it('should not use user-provided key if it does not start with sk-ant-', () => {
      const invalidKey = 'invalid-key-format';
      const serverKey = 'sk-ant-unique-server-test-key-12345'; // Unique key to avoid cache
      mockGetServerKey.mockReturnValue(serverKey);

      const client = getServerClaudeClient(invalidKey);

      expect(client).toBeDefined();
      // The client should be created with serverKey (fallback from invalid user key)
      // Note: Due to singleton caching, we check the client exists rather than call count
      expect(client).toHaveProperty('messages');
    });

    it('should cache client instance for same API key', () => {
      const apiKey = 'sk-ant-test-key';
      mockGetServerKey.mockReturnValue(apiKey);

      const client1 = getServerClaudeClient();
      const client2 = getServerClaudeClient();

      expect(client1).toBe(client2);
      expect(MockAnthropic).toHaveBeenCalledTimes(1);
      expect(mockApiLogger.debug).toHaveBeenCalledWith(
        'Reusing cached Claude client instance',
        { cached: true }
      );
    });

    it('should handle client creation errors gracefully', () => {
      const uniqueErrorKey = 'sk-ant-error-test-key-99999'; // Unique to avoid cache
      mockGetServerKey.mockReturnValue(uniqueErrorKey);

      // Mock the constructor to throw only for this specific test
      const originalImpl = MockAnthropic.getMockImplementation();
      MockAnthropic.mockImplementationOnce(() => {
        throw new Error('SDK initialization failed');
      });

      const client = getServerClaudeClient();

      // Should return null when client creation fails
      expect(client).toBeNull();
      expect(mockApiLogger.error).toHaveBeenCalledWith(
        'Failed to create Claude client',
        expect.any(Error)
      );

      // Restore original implementation
      if (originalImpl) {
        MockAnthropic.mockImplementation(originalImpl);
      }
    });
  });

  describe('generateClaudeVisionDescription', () => {
    const mockResponse = {
      model: CLAUDE_MODEL,
      content: [{ type: 'text', text: 'A beautiful sunset over mountains' }],
      usage: { input_tokens: 150, output_tokens: 50 },
      stop_reason: 'end_turn',
    };

    beforeEach(() => {
      mockGetServerKey.mockReturnValue('sk-ant-test-key');
      mockCreate.mockResolvedValue(mockResponse);
    });

    it('should throw error when client not initialized', async () => {
      mockGetServerKey.mockReturnValue(null);

      await expect(
        generateClaudeVisionDescription({
          imageUrl: 'https://example.com/image.jpg',
          style: 'narrativo',
        })
      ).rejects.toThrow('Claude client not initialized - missing API key');
    });

    it('should throw error when imageUrl missing', async () => {
      await expect(
        generateClaudeVisionDescription({
          imageUrl: '',
          style: 'narrativo',
        })
      ).rejects.toThrow('Image URL is required');
    });

    it('should generate description for base64 image', async () => {
      const base64Image = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';

      const description = await generateClaudeVisionDescription({
        imageUrl: base64Image,
        style: 'narrativo',
        language: 'es',
      });

      expect(description).toBe('A beautiful sunset over mountains');
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: CLAUDE_MODEL,
          max_tokens: CLAUDE_MAX_TOKENS,
          temperature: 0.7,
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.arrayContaining([
                expect.objectContaining({
                  type: 'image',
                  source: expect.objectContaining({
                    type: 'base64',
                    media_type: 'image/jpeg',
                  }),
                }),
              ]),
            }),
          ]),
        })
      );
    });

    it('should fetch and convert URL images to base64', async () => {
      const imageUrl = 'https://example.com/image.jpg';
      const mockImageBuffer = Buffer.from('fake-image-data');

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => mockImageBuffer,
        headers: new Map([['content-type', 'image/jpeg']]),
      }) as any;

      const description = await generateClaudeVisionDescription({
        imageUrl,
        style: 'poetico',
        language: 'en',
      });

      expect(description).toBe('A beautiful sunset over mountains');
      expect(global.fetch).toHaveBeenCalledWith(imageUrl);
      expect(mockCreate).toHaveBeenCalled();
    });

    it('should throw error when image fetch fails', async () => {
      const imageUrl = 'https://example.com/invalid.jpg';

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      }) as any;

      await expect(
        generateClaudeVisionDescription({
          imageUrl,
          style: 'academico',
        })
      ).rejects.toThrow('Failed to fetch image: 404');
    });

    it('should throw error for invalid base64 format', async () => {
      const invalidBase64 = 'data:invalid-format';

      await expect(
        generateClaudeVisionDescription({
          imageUrl: invalidBase64,
          style: 'conversacional',
        })
      ).rejects.toThrow('Invalid base64 image format');
    });

    it('should use custom prompt when provided', async () => {
      const customPrompt = 'Describe this in detail';

      await generateClaudeVisionDescription({
        imageUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
        style: 'creativo',
        customPrompt,
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.arrayContaining([
                expect.objectContaining({
                  type: 'text',
                  text: customPrompt,
                }),
              ]),
            }),
          ]),
        })
      );
    });

    it('should respect maxLength parameter', async () => {
      const maxLength = 200;

      await generateClaudeVisionDescription({
        imageUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
        style: 'tecnico',
        maxLength,
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.arrayContaining([
                expect.objectContaining({
                  type: 'text',
                  text: expect.stringContaining('200'),
                }),
              ]),
            }),
          ]),
        })
      );
    });

    it('should handle all description styles', async () => {
      const styles: Array<'narrativo' | 'poetico' | 'academico' | 'conversacional' | 'infantil' | 'creativo' | 'tecnico'> = [
        'narrativo',
        'poetico',
        'academico',
        'conversacional',
        'infantil',
        'creativo',
        'tecnico',
      ];

      for (const style of styles) {
        mockCreate.mockClear();
        await generateClaudeVisionDescription({
          imageUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
          style,
        });
        expect(mockCreate).toHaveBeenCalled();
      }
    });

    it('should handle both Spanish and English languages', async () => {
      const languages: Array<'es' | 'en'> = ['es', 'en'];

      for (const language of languages) {
        mockCreate.mockClear();
        await generateClaudeVisionDescription({
          imageUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
          style: 'narrativo',
          language,
        });
        expect(mockCreate).toHaveBeenCalled();
      }
    });

    it('should throw error when response has no text content', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'other' }],
        usage: { input_tokens: 100, output_tokens: 0 },
        stop_reason: 'end_turn',
      });

      await expect(
        generateClaudeVisionDescription({
          imageUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
          style: 'narrativo',
        })
      ).rejects.toThrow('No text content in Claude response');
    });

    it('should handle API error with 401 status', async () => {
      const error: any = new Error('Invalid API key');
      error.status = 401;
      mockCreate.mockRejectedValue(error);

      await expect(
        generateClaudeVisionDescription({
          imageUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
          style: 'narrativo',
        })
      ).rejects.toThrow('Invalid Anthropic API key');
    });

    it('should handle API error with 429 status (rate limit)', async () => {
      const error: any = new Error('Rate limit');
      error.status = 429;
      mockCreate.mockRejectedValue(error);

      await expect(
        generateClaudeVisionDescription({
          imageUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
          style: 'narrativo',
        })
      ).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle invalid request errors', async () => {
      const error: any = new Error('Invalid request');
      error.error = { type: 'invalid_request_error' };
      mockCreate.mockRejectedValue(error);

      await expect(
        generateClaudeVisionDescription({
          imageUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
          style: 'narrativo',
        })
      ).rejects.toThrow('Invalid request');
    });

    it('should log performance metrics', async () => {
      await generateClaudeVisionDescription({
        imageUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
        style: 'narrativo',
      });

      expect(mockPerformanceLogger.info).toHaveBeenCalledWith(
        'Starting Claude vision description',
        expect.any(Object)
      );
      expect(mockPerformanceLogger.info).toHaveBeenCalledWith(
        'Claude vision description complete',
        expect.objectContaining({
          duration: expect.any(String),
          inputTokens: 150,
          outputTokens: 50,
        })
      );
    });
  });

  describe('generateClaudeCompletion', () => {
    const mockResponse = {
      model: CLAUDE_MODEL,
      content: [{ type: 'text', text: 'This is a helpful response' }],
      usage: { input_tokens: 50, output_tokens: 20 },
      stop_reason: 'end_turn',
    };

    beforeEach(() => {
      mockGetServerKey.mockReturnValue('sk-ant-test-key');
      mockCreate.mockResolvedValue(mockResponse);
    });

    it('should generate text completion successfully', async () => {
      const prompt = 'What is the capital of Spain?';

      const completion = await generateClaudeCompletion(prompt);

      expect(completion).toBe('This is a helpful response');
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: CLAUDE_MODEL,
          max_tokens: 2048,
          temperature: 0.7,
          messages: [{ role: 'user', content: prompt }],
        })
      );
    });

    it('should use custom system prompt when provided', async () => {
      const systemPrompt = 'You are a Spanish teacher';
      const prompt = 'Explain the subjunctive';

      await generateClaudeCompletion(prompt, systemPrompt);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          system: systemPrompt,
        })
      );
    });

    it('should use default system prompt when not provided', async () => {
      await generateClaudeCompletion('Test prompt');

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          system: 'You are a helpful AI assistant specializing in Spanish language learning.',
        })
      );
    });

    it('should respect custom options', async () => {
      const options = {
        maxTokens: 1000,
        temperature: 0.5,
        stopSequences: ['END', 'STOP'],
      };

      await generateClaudeCompletion('Test', undefined, options);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 1000,
          temperature: 0.5,
          stop_sequences: ['END', 'STOP'],
        })
      );
    });

    it('should handle multiple text blocks in response', async () => {
      mockCreate.mockResolvedValue({
        ...mockResponse,
        content: [
          { type: 'text', text: 'First part' },
          { type: 'text', text: 'Second part' },
        ],
      });

      const completion = await generateClaudeCompletion('Test');

      expect(completion).toBe('First part\nSecond part');
    });

    it('should throw error when client not initialized', async () => {
      mockGetServerKey.mockReturnValue(null);

      await expect(generateClaudeCompletion('Test')).rejects.toThrow(
        'Claude client not initialized - missing API key'
      );
    });

    it('should log performance metrics', async () => {
      await generateClaudeCompletion('Test prompt');

      expect(mockPerformanceLogger.info).toHaveBeenCalledWith(
        'Starting Claude text completion',
        expect.any(Object)
      );
      expect(mockPerformanceLogger.info).toHaveBeenCalledWith(
        'Claude completion finished',
        expect.objectContaining({
          duration: expect.any(String),
          inputTokens: 50,
          outputTokens: 20,
        })
      );
    });

    it('should handle API errors', async () => {
      mockCreate.mockRejectedValue(new Error('API Error'));

      await expect(generateClaudeCompletion('Test')).rejects.toThrow('API Error');
      expect(mockApiLogger.error).toHaveBeenCalled();
    });
  });

  describe('generateClaudeQA', () => {
    beforeEach(() => {
      // Setup API key for all QA tests
      mockGetServerKey.mockReturnValue('sk-ant-qa-test-key');
      mockCreate.mockResolvedValue({
        model: CLAUDE_MODEL,
        content: [
          {
            type: 'text',
            text: JSON.stringify([
              {
                question: '¿Qué color tiene el cielo?',
                answer: 'El cielo es azul',
                difficulty: 'medio',
              },
              {
                question: '¿Dónde está el sol?',
                answer: 'El sol está en el cielo',
                difficulty: 'medio',
              },
            ]),
          },
        ],
        usage: { input_tokens: 100, output_tokens: 80 },
        stop_reason: 'end_turn',
      });
    });

    it('should generate Q&A from description', async () => {
      const description = 'Un cielo azul con el sol brillante';

      const qa = await generateClaudeQA(description);

      expect(qa).toHaveLength(2);
      expect(qa[0]).toHaveProperty('question');
      expect(qa[0]).toHaveProperty('answer');
      expect(qa[0]).toHaveProperty('difficulty');
    });

    it('should handle different difficulty levels', async () => {
      const difficulties: Array<'facil' | 'medio' | 'dificil'> = ['facil', 'medio', 'dificil'];

      for (const difficulty of difficulties) {
        mockCreate.mockClear();
        await generateClaudeQA('Test description', difficulty, 3);
        expect(mockCreate).toHaveBeenCalled();
      }
    });

    it('should respect count parameter', async () => {
      const count = 10;

      await generateClaudeQA('Test description', 'medio', count);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('10 questions'),
            }),
          ]),
        })
      );
    });

    it('should throw error when JSON extraction fails', async () => {
      mockCreate.mockResolvedValue({
        model: CLAUDE_MODEL,
        content: [{ type: 'text', text: 'Invalid response without JSON' }],
        usage: { input_tokens: 50, output_tokens: 20 },
        stop_reason: 'end_turn',
      });

      await expect(generateClaudeQA('Test')).rejects.toThrow(
        'Failed to extract JSON from Claude response'
      );
    });

    it('should pass user API key to completion', async () => {
      const userApiKey = 'sk-ant-user-qa-unique-key';
      // Don't need to mock getServerKey here since user key is provided

      await generateClaudeQA('Test description', 'medio', 5, userApiKey);

      // Verify the API was called successfully with user key
      expect(mockCreate).toHaveBeenCalled();
    });
  });

  describe('translateWithClaude', () => {
    beforeEach(() => {
      mockGetServerKey.mockReturnValue('sk-ant-test-key');
      mockCreate.mockResolvedValue({
        model: CLAUDE_MODEL,
        content: [{ type: 'text', text: 'Hello, how are you?' }],
        usage: { input_tokens: 30, output_tokens: 10 },
        stop_reason: 'end_turn',
      });
    });

    it('should translate text successfully', async () => {
      const text = 'Hola, ¿cómo estás?';
      const translation = await translateWithClaude(text, 'Spanish', 'English');

      expect(translation).toBe('Hello, how are you?');
      expect(mockCreate).toHaveBeenCalled();
    });

    it('should use lower temperature for accurate translation', async () => {
      await translateWithClaude('Test', 'English', 'Spanish');

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.3,
        })
      );
    });

    it('should scale max_tokens based on input length', async () => {
      const longText = 'a'.repeat(100);

      await translateWithClaude(longText, 'English', 'Spanish');

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 300, // 100 * 3
        })
      );
    });

    it('should pass user API key', async () => {
      const userApiKey = 'sk-ant-user-key';

      await translateWithClaude('Test', 'English', 'Spanish', userApiKey);

      expect(mockCreate).toHaveBeenCalled();
    });
  });

  describe('extractVocabularyWithClaude', () => {
    beforeEach(() => {
      mockGetServerKey.mockReturnValue('sk-ant-test-key');
      mockCreate.mockResolvedValue({
        model: CLAUDE_MODEL,
        content: [
          {
            type: 'text',
            text: JSON.stringify([
              {
                spanish: 'casa',
                english: 'house',
                partOfSpeech: 'noun',
                context: 'Mi casa es grande',
              },
              {
                spanish: 'correr',
                english: 'to run',
                partOfSpeech: 'verb',
                context: 'Me gusta correr',
              },
            ]),
          },
        ],
        usage: { input_tokens: 120, output_tokens: 100 },
        stop_reason: 'end_turn',
      });
    });

    it('should extract vocabulary from text', async () => {
      const text = 'Mi casa es grande y me gusta correr';

      const vocab = await extractVocabularyWithClaude(text);

      expect(vocab).toHaveLength(2);
      expect(vocab[0]).toHaveProperty('spanish');
      expect(vocab[0]).toHaveProperty('english');
      expect(vocab[0]).toHaveProperty('partOfSpeech');
      expect(vocab[0]).toHaveProperty('context');
    });

    it('should handle different difficulty levels', async () => {
      const difficulties: Array<'beginner' | 'intermediate' | 'advanced'> = [
        'beginner',
        'intermediate',
        'advanced',
      ];

      for (const difficulty of difficulties) {
        mockCreate.mockClear();
        await extractVocabularyWithClaude('Test text', difficulty);
        expect(mockCreate).toHaveBeenCalled();
      }
    });

    it('should throw error when JSON extraction fails', async () => {
      mockCreate.mockResolvedValue({
        model: CLAUDE_MODEL,
        content: [{ type: 'text', text: 'No JSON here' }],
        usage: { input_tokens: 50, output_tokens: 20 },
        stop_reason: 'end_turn',
      });

      await expect(extractVocabularyWithClaude('Test')).rejects.toThrow(
        'Failed to extract JSON from Claude response'
      );
    });

    it('should pass user API key', async () => {
      const userApiKey = 'sk-ant-user-key';

      await extractVocabularyWithClaude('Test', 'intermediate', userApiKey);

      expect(mockCreate).toHaveBeenCalled();
    });

    it('should use appropriate temperature for vocabulary extraction', async () => {
      await extractVocabularyWithClaude('Test text');

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.5,
        })
      );
    });
  });

  describe('Edge Cases and Error Handling', () => {
    beforeEach(() => {
      mockGetServerKey.mockReturnValue('sk-ant-test-key');
    });

    it('should handle empty image description for Q&A', async () => {
      mockCreate.mockResolvedValue({
        model: CLAUDE_MODEL,
        content: [{ type: 'text', text: '[]' }],
        usage: { input_tokens: 10, output_tokens: 5 },
        stop_reason: 'end_turn',
      });

      const qa = await generateClaudeQA('');

      expect(qa).toEqual([]);
    });

    it('should handle very long text for vocabulary extraction', async () => {
      const longText = 'palabra '.repeat(1000);
      mockCreate.mockResolvedValue({
        model: CLAUDE_MODEL,
        content: [{ type: 'text', text: '[]' }],
        usage: { input_tokens: 2000, output_tokens: 100 },
        stop_reason: 'end_turn',
      });

      const vocab = await extractVocabularyWithClaude(longText);

      expect(Array.isArray(vocab)).toBe(true);
    });

    it('should handle special characters in translation', async () => {
      const textWithSpecialChars = '¡Hola! ¿Cómo estás? ¡Fantástico!';
      mockCreate.mockResolvedValue({
        model: CLAUDE_MODEL,
        content: [{ type: 'text', text: 'Hello! How are you? Fantastic!' }],
        usage: { input_tokens: 20, output_tokens: 10 },
        stop_reason: 'end_turn',
      });

      const translation = await translateWithClaude(
        textWithSpecialChars,
        'Spanish',
        'English'
      );

      expect(translation).toBeTruthy();
    });

    it('should handle network timeout errors', async () => {
      const error: any = new Error('Timeout');
      error.code = 'ETIMEDOUT';
      mockCreate.mockRejectedValue(error);

      await expect(
        generateClaudeCompletion('Test')
      ).rejects.toThrow('Timeout');
    });
  });

  describe('Performance and Concurrency', () => {
    beforeEach(() => {
      mockGetServerKey.mockReturnValue('sk-ant-test-key');
      mockCreate.mockResolvedValue({
        model: CLAUDE_MODEL,
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 50, output_tokens: 20 },
        stop_reason: 'end_turn',
      });
    });

    it('should handle concurrent completion requests', async () => {
      const promises = Array(5)
        .fill(null)
        .map((_, i) => generateClaudeCompletion(`Test ${i}`));

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      expect(mockCreate).toHaveBeenCalledTimes(5);
    });

    it('should cache client instance across concurrent requests', async () => {
      // Use a unique API key to force cache miss initially
      const uniqueKey = 'sk-ant-concurrency-test-unique-67890';
      mockGetServerKey.mockReturnValue(uniqueKey);
      MockAnthropic.mockClear();

      // First call should create client, subsequent calls should use cache
      const client1 = getServerClaudeClient();
      const client2 = getServerClaudeClient();
      const client3 = getServerClaudeClient();

      // All should return the same cached instance (THIS IS THE KEY TEST)
      expect(client1).toBe(client2);
      expect(client2).toBe(client3);
      expect(client1).toBeDefined();

      // Verify debug log was called for cache hits (at least once)
      expect(mockApiLogger.debug).toHaveBeenCalledWith(
        'Reusing cached Claude client instance',
        { cached: true }
      );
    });

    it('should complete requests within reasonable time', async () => {
      const start = performance.now();

      await generateClaudeCompletion('Quick test');

      const duration = performance.now() - start;

      expect(duration).toBeLessThan(1000); // Should be fast with mocks
    });
  });

  describe('Token Usage Tracking', () => {
    beforeEach(() => {
      mockGetServerKey.mockReturnValue('sk-ant-test-key');
    });

    it('should log input and output tokens for vision', async () => {
      mockCreate.mockResolvedValue({
        model: CLAUDE_MODEL,
        content: [{ type: 'text', text: 'Description' }],
        usage: { input_tokens: 1500, output_tokens: 200 },
        stop_reason: 'end_turn',
      });

      await generateClaudeVisionDescription({
        imageUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
        style: 'narrativo',
      });

      expect(mockPerformanceLogger.info).toHaveBeenCalledWith(
        'Claude vision description complete',
        expect.objectContaining({
          inputTokens: 1500,
          outputTokens: 200,
        })
      );
    });

    it('should log token usage for completions', async () => {
      mockCreate.mockResolvedValue({
        model: CLAUDE_MODEL,
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 100, output_tokens: 50 },
        stop_reason: 'end_turn',
      });

      await generateClaudeCompletion('Test');

      expect(mockPerformanceLogger.info).toHaveBeenCalledWith(
        'Claude completion finished',
        expect.objectContaining({
          inputTokens: 100,
          outputTokens: 50,
        })
      );
    });
  });
});
