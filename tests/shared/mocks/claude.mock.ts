/**
 * Claude API Mock Factory
 * Provides configurable Claude/Anthropic API mocks for integration testing
 */

import { vi } from 'vitest';

export interface MockClaudeConfig {
  behavior?: 'success' | 'error' | 'timeout';
  responseType?: 'description' | 'qa' | 'phrases' | 'custom';
  customResponse?: any;
  delay?: number;
}

/**
 * Create a mock Claude API client
 */
export function createMockClaude(config: MockClaudeConfig = {}): any {
  const { behavior = 'success', responseType = 'description', delay = 0 } = config;

  return {
    messages: {
      create: vi.fn(async (params: any) => {
        // Simulate API delay
        if (delay > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        switch (behavior) {
          case 'success':
            return createSuccessResponse(responseType, params);

          case 'error':
            throw new Error('Claude API error: Request failed');

          case 'timeout':
            await new Promise((resolve) => setTimeout(resolve, 30000));
            throw new Error('Request timeout');

          default:
            return createSuccessResponse(responseType, params);
        }
      }),
    },
  };
}

/**
 * Create success response based on type
 */
function createSuccessResponse(type: string, params: any): any {
  const baseResponse = {
    id: `msg_mock_${Date.now()}`,
    type: 'message',
    role: 'assistant',
    model: 'claude-sonnet-4.5',
    stop_reason: 'end_turn',
    usage: {
      input_tokens: 100,
      output_tokens: 200,
    },
  };

  switch (type) {
    case 'description':
      return {
        ...baseResponse,
        content: [
          {
            type: 'text',
            text: generateMockDescription(params),
          },
        ],
      };

    case 'qa':
      return {
        ...baseResponse,
        content: [
          {
            type: 'text',
            text: JSON.stringify(generateMockQA(params)),
          },
        ],
      };

    case 'phrases':
      return {
        ...baseResponse,
        content: [
          {
            type: 'text',
            text: JSON.stringify(generateMockPhrases(params)),
          },
        ],
      };

    case 'custom':
      return {
        ...baseResponse,
        content: [
          {
            type: 'text',
            text: params.customText || 'Custom response',
          },
        ],
      };

    default:
      return {
        ...baseResponse,
        content: [
          {
            type: 'text',
            text: 'Mock response',
          },
        ],
      };
  }
}

/**
 * Generate mock description based on difficulty
 */
function generateMockDescription(params: any): string {
  const difficulty = params.difficulty || 'beginner';

  const descriptions = {
    beginner: 'A beautiful mountain landscape with a clear blue sky.',
    intermediate:
      'A majestic mountain range rises against a vibrant sunset sky, with snow-capped peaks reflecting golden light.',
    advanced:
      'A breathtaking panorama unfolds before the viewer: a formidable mountain range, its snow-clad summits piercing the heavens, stands in stark relief against a canvas of deepening twilight, where aureate hues of the dying sun dance across the firmament, casting an ethereal luminescence upon the pristine alpine landscape below.',
  };

  return descriptions[difficulty as keyof typeof descriptions] || descriptions.beginner;
}

/**
 * Generate mock Q&A pairs
 */
function generateMockQA(params: any): any {
  const numberOfQuestions = params.numberOfQuestions || 3;
  const difficulty = params.difficulty || 'beginner';

  const questions = [];

  for (let i = 0; i < numberOfQuestions; i++) {
    questions.push({
      id: `q${i + 1}`,
      question: `Mock question ${i + 1} (${difficulty})`,
      answer: `Mock answer ${i + 1}`,
      difficulty,
      type: 'open',
      explanation: `This is a ${difficulty} level question.`,
    });
  }

  return {
    questions,
    metadata: {
      totalQuestions: numberOfQuestions,
      generatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Generate mock phrases
 */
function generateMockPhrases(params: any): any {
  const maxPhrases = params.maxPhrases || 5;
  const language = params.language || 'es';
  const difficulty = params.difficulty || 'beginner';

  const spanishPhrases = [
    {
      phrase: 'hermoso paisaje',
      translation: 'beautiful landscape',
      category: 'adjective',
      difficulty,
      definition: 'Something pleasing to look at',
    },
    {
      phrase: 'cielo azul',
      translation: 'blue sky',
      category: 'noun',
      difficulty,
      definition: 'The atmosphere above',
    },
    {
      phrase: 'montaña nevada',
      translation: 'snowy mountain',
      category: 'noun',
      difficulty,
      definition: 'A peak covered in snow',
    },
  ];

  const englishPhrases = [
    {
      phrase: 'beautiful landscape',
      translation: 'hermoso paisaje',
      category: 'adjective',
      difficulty,
      definition: 'Something pleasing to look at',
    },
    {
      phrase: 'blue sky',
      translation: 'cielo azul',
      category: 'noun',
      difficulty,
      definition: 'The atmosphere above',
    },
  ];

  const phrases = language === 'es' ? spanishPhrases : englishPhrases;

  return {
    phrases: phrases.slice(0, maxPhrases),
    metadata: {
      totalPhrases: Math.min(maxPhrases, phrases.length),
      categories: ['adjective', 'noun'],
      extractedAt: new Date().toISOString(),
    },
  };
}

/**
 * Mock Anthropic module
 */
export function mockAnthropicModule(config: MockClaudeConfig = {}): void {
  vi.mock('@anthropic-ai/sdk', () => ({
    default: vi.fn(() => createMockClaude(config)),
    Anthropic: vi.fn(() => createMockClaude(config)),
  }));
}

/**
 * Reset all Claude/Anthropic mocks
 */
export function resetClaudeMocks(): void {
  vi.clearAllMocks();
}

/**
 * Create streaming response mock
 */
export function createMockStreamingResponse(chunks: string[]): any {
  return {
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) {
        yield {
          type: 'content_block_delta',
          delta: {
            type: 'text_delta',
            text: chunk,
          },
        };
      }

      yield {
        type: 'message_stop',
      };
    },
  };
}
