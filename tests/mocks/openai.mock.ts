/**
 * OpenAI API Mock for Testing
 * Provides comprehensive mocking for OpenAI API calls including vision, text generation, and error scenarios
 */

import { vi } from 'vitest';

// Mock response types
export interface MockOpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Mock fixtures for different scenarios
export const mockOpenAIResponses = {
  visionSuccess: {
    id: 'chatcmpl-mock-vision-123',
    object: 'chat.completion',
    created: Date.now(),
    model: 'gpt-4-vision-preview',
    choices: [{
      index: 0,
      message: {
        role: 'assistant',
        content: 'This image shows a beautiful sunset over mountains with vibrant orange and pink clouds in the sky.'
      },
      finish_reason: 'stop'
    }],
    usage: {
      prompt_tokens: 85,
      completion_tokens: 22,
      total_tokens: 107
    }
  },

  textSuccess: {
    id: 'chatcmpl-mock-text-456',
    object: 'chat.completion',
    created: Date.now(),
    model: 'gpt-4',
    choices: [{
      index: 0,
      message: {
        role: 'assistant',
        content: '{"vocabulary": [{"word": "beautiful", "definition": "pleasing to look at", "examples": ["The sunset is beautiful."]}, {"word": "vibrant", "definition": "bright and striking", "examples": ["Vibrant colors fill the sky."]}]}'
      },
      finish_reason: 'stop'
    }],
    usage: {
      prompt_tokens: 45,
      completion_tokens: 67,
      total_tokens: 112
    }
  },

  qaSuccess: {
    id: 'chatcmpl-mock-qa-789',
    object: 'chat.completion',
    created: Date.now(),
    model: 'gpt-4',
    choices: [{
      index: 0,
      message: {
        role: 'assistant',
        content: '{"questions": [{"question": "What time of day is shown in the image?", "answer": "Sunset", "difficulty": "easy"}, {"question": "What colors are prominent in the sky?", "answer": "Orange and pink", "difficulty": "medium"}]}'
      },
      finish_reason: 'stop'
    }],
    usage: {
      prompt_tokens: 67,
      completion_tokens: 89,
      total_tokens: 156
    }
  },

  rateLimitError: {
    error: {
      message: 'Rate limit reached for requests',
      type: 'rate_limit_error',
      param: null,
      code: 'rate_limit_exceeded'
    }
  },

  invalidApiKeyError: {
    error: {
      message: 'Invalid API key provided',
      type: 'invalid_request_error',
      param: null,
      code: 'invalid_api_key'
    }
  },

  contentPolicyError: {
    error: {
      message: 'Your request was rejected as a result of our safety system',
      type: 'content_policy_violation',
      param: null,
      code: 'content_policy_violation'
    }
  }
};

// Mock OpenAI client
export class MockOpenAIClient {
  chat = {
    completions: {
      create: vi.fn()
    }
  };

  constructor(private scenario: keyof typeof mockOpenAIResponses = 'visionSuccess') {
    this.setupMocks();
  }

  private setupMocks() {
    this.chat.completions.create.mockImplementation(async (params: any) => {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check for API key in different formats
      const hasValidKey = params.headers?.['Authorization'] || 
                         params.headers?.['authorization'] ||
                         process.env.OPENAI_API_KEY;

      if (!hasValidKey && this.scenario === 'invalidApiKeyError') {
        throw new Error('Invalid API key provided');
      }

      // Rate limiting simulation
      if (this.scenario === 'rateLimitError') {
        const error = new Error('Rate limit exceeded');
        (error as any).status = 429;
        (error as any).code = 'rate_limit_exceeded';
        throw error;
      }

      // Content policy violation
      if (this.scenario === 'contentPolicyError') {
        const error = new Error('Content policy violation');
        (error as any).status = 400;
        (error as any).code = 'content_policy_violation';
        throw error;
      }

      // Determine response type based on messages
      const isVisionRequest = params.messages?.some((msg: any) => 
        msg.content?.some?.((content: any) => content.type === 'image_url')
      );

      const isVocabularyRequest = params.messages?.some((msg: any) => 
        typeof msg.content === 'string' && msg.content.includes('vocabulary')
      );

      const isQARequest = params.messages?.some((msg: any) => 
        typeof msg.content === 'string' && msg.content.includes('questions')
      );

      if (isVisionRequest) {
        return mockOpenAIResponses.visionSuccess;
      } else if (isVocabularyRequest) {
        return mockOpenAIResponses.textSuccess;
      } else if (isQARequest) {
        return mockOpenAIResponses.qaSuccess;
      }

      return mockOpenAIResponses.visionSuccess;
    });
  }

  setScenario(scenario: keyof typeof mockOpenAIResponses) {
    this.scenario = scenario;
    this.setupMocks();
  }

  resetMocks() {
    this.chat.completions.create.mockReset();
    this.setupMocks();
  }
}

// Factory for creating mock instances
export const createMockOpenAI = (scenario: keyof typeof mockOpenAIResponses = 'visionSuccess') => {
  return new MockOpenAIClient(scenario);
};

// Mock for OpenAI module
export const mockOpenAI = vi.fn(() => createMockOpenAI());

// Test utilities
export const setupOpenAIMocks = () => {
  vi.mock('openai', () => ({
    default: mockOpenAI,
    OpenAI: mockOpenAI
  }));
};

export const expectOpenAICall = (mockClient: MockOpenAIClient, expectedParams?: any) => {
  expect(mockClient.chat.completions.create).toHaveBeenCalled();
  
  if (expectedParams) {
    expect(mockClient.chat.completions.create).toHaveBeenCalledWith(
      expect.objectContaining(expectedParams)
    );
  }
};

export const getLastOpenAICall = (mockClient: MockOpenAIClient) => {
  const calls = mockClient.chat.completions.create.mock.calls;
  return calls[calls.length - 1]?.[0];
};

// Performance testing utilities
export const createPerformanceMock = (delay: number = 1000) => {
  const mock = createMockOpenAI();
  mock.chat.completions.create.mockImplementation(async (params: any) => {
    await new Promise(resolve => setTimeout(resolve, delay));
    return mockOpenAIResponses.visionSuccess;
  });
  return mock;
};

// Stress testing utilities
export const createStressMock = (failureRate: number = 0.1) => {
  const mock = createMockOpenAI();
  mock.chat.completions.create.mockImplementation(async (params: any) => {
    if (Math.random() < failureRate) {
      throw new Error('Random failure for stress testing');
    }
    return mockOpenAIResponses.visionSuccess;
  });
  return mock;
};