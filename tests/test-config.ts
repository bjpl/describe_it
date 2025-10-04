/**
 * Comprehensive test configuration and utilities
 * This file provides configuration and utilities used across all test files
 */

import { vi } from 'vitest';

// Test environment configuration
export const TEST_CONFIG = {
  // Timeouts
  DEFAULT_TIMEOUT: 5000,
  API_TIMEOUT: 10000,
  ANIMATION_TIMEOUT: 1000,
  
  // Performance thresholds
  PERFORMANCE_THRESHOLDS: {
    RENDER_TIME: 100, // milliseconds
    API_RESPONSE: 2000, // milliseconds
    MEMORY_USAGE: 50 * 1024 * 1024, // 50MB
    FPS_MINIMUM: 30,
    BUNDLE_SIZE: 10 * 1024, // 10KB per component
  },
  
  // Coverage thresholds
  COVERAGE_THRESHOLDS: {
    STATEMENTS: 80,
    BRANCHES: 75,
    FUNCTIONS: 80,
    LINES: 80,
  },
  
  // Test data
  MOCK_DATA: {
    USERS: {
      VALID: {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com'
      },
      INVALID: {
        id: '',
        name: '',
        email: 'invalid-email'
      }
    },
    IMAGES: {
      VALID: {
        id: 'image-1',
        urls: {
          thumb: 'https://example.com/thumb.jpg',
          small: 'https://example.com/small.jpg',
          regular: 'https://example.com/regular.jpg',
          full: 'https://example.com/full.jpg',
          raw: 'https://example.com/raw.jpg'
        },
        user: {
          id: 'user-1',
          name: 'Photographer',
          username: 'photographer'
        },
        description: 'A beautiful landscape',
        alt_description: 'Mountain landscape at sunset'
      }
    },
    API_KEYS: {
      OPENAI: {
        VALID: 'sk-1234567890abcdef1234567890abcdef1234567890abcdef',
        INVALID: 'invalid-key'
      },
      UNSPLASH: {
        VALID: 'abcdef1234567890',
        INVALID: 'invalid'
      }
    }
  }
};

// Global test setup
export const setupGlobalMocks = () => {
  // Mock environment variables
  process.env.NODE_ENV = 'test';
  process.env.OPENAI_API_KEY = TEST_CONFIG.MOCK_DATA.API_KEYS.OPENAI.VALID;
  process.env.UNSPLASH_ACCESS_KEY = TEST_CONFIG.MOCK_DATA.API_KEYS.UNSPLASH.VALID;
  
  // Mock global APIs
  global.fetch = vi.fn();
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
  
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
  
  // Mock window APIs
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
  
  // Mock localStorage
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
  });
  
  // Mock sessionStorage
  Object.defineProperty(window, 'sessionStorage', {
    value: localStorageMock
  });
  
  // Mock performance API
  Object.defineProperty(global, 'performance', {
    value: {
      now: vi.fn(() => Date.now()),
      mark: vi.fn(),
      measure: vi.fn(),
      getEntriesByType: vi.fn(() => []),
      getEntriesByName: vi.fn(() => []),
    },
    writable: true,
  });
  
  // Mock URL APIs
  global.URL.createObjectURL = vi.fn(() => 'blob:mocked-url');
  global.URL.revokeObjectURL = vi.fn();
};

// Test assertion helpers
export const assertions = {
  /**
   * Assert that an element has expected accessibility attributes
   */
  toBeAccessible: (element: Element) => {
    const checks = [
      () => element.hasAttribute('role') || element.tagName.toLowerCase() in ['button', 'input', 'select', 'textarea'],
      () => !element.hasAttribute('aria-hidden') || element.getAttribute('aria-hidden') === 'false',
      () => {
        if (element.hasAttribute('aria-labelledby') || element.hasAttribute('aria-label')) {
          return true;
        }
        if (element.tagName.toLowerCase() === 'input') {
          const labels = document.querySelectorAll(`label[for="${element.id}"]`);
          return labels.length > 0;
        }
        return true;
      }
    ];
    
    const passed = checks.every(check => check());
    return {
      pass: passed,
      message: () => `Element is ${passed ? '' : 'not '}accessible`
    };
  },
  
  /**
   * Assert that component renders within performance budget
   */
  toRenderWithinBudget: (renderTime: number) => {
    const budget = TEST_CONFIG.PERFORMANCE_THRESHOLDS.RENDER_TIME;
    const passed = renderTime <= budget;
    
    return {
      pass: passed,
      message: () => `Render time ${renderTime}ms is ${passed ? 'within' : 'over'} budget of ${budget}ms`
    };
  },
  
  /**
   * Assert that API response is within timeout
   */
  toRespondWithinTimeout: (responseTime: number, isAPICall = false) => {
    const budget = isAPICall ? TEST_CONFIG.PERFORMANCE_THRESHOLDS.API_RESPONSE : TEST_CONFIG.DEFAULT_TIMEOUT;
    const passed = responseTime <= budget;
    
    return {
      pass: passed,
      message: () => `Response time ${responseTime}ms is ${passed ? 'within' : 'over'} timeout of ${budget}ms`
    };
  },
  
  /**
   * Assert that memory usage is within limits
   */
  toUseMemoryEfficiently: (memoryUsage: number) => {
    const budget = TEST_CONFIG.PERFORMANCE_THRESHOLDS.MEMORY_USAGE;
    const passed = memoryUsage <= budget;
    
    return {
      pass: passed,
      message: () => `Memory usage ${Math.round(memoryUsage / 1024 / 1024)}MB is ${passed ? 'within' : 'over'} budget of ${Math.round(budget / 1024 / 1024)}MB`
    };
  }
};

// Test data factories
export const createTestData = {
  user: (overrides: any = {}) => ({
    ...TEST_CONFIG.MOCK_DATA.USERS.VALID,
    ...overrides
  }),
  
  image: (overrides: any = {}) => ({
    ...TEST_CONFIG.MOCK_DATA.IMAGES.VALID,
    ...overrides
  }),
  
  description: (overrides: any = {}) => ({
    id: 'desc-1',
    imageId: 'image-1',
    style: 'narrativo',
    content: 'Test description',
    language: 'english',
    createdAt: new Date().toISOString(),
    ...overrides
  }),
  
  qaQuestion: (overrides: any = {}) => ({
    id: 'q1',
    question: '¿Qué se ve en la imagen?',
    options: ['Montaña', 'Río', 'Ciudad', 'Bosque'],
    correctAnswer: 0,
    explanation: 'La imagen muestra una montaña.',
    difficulty: 'beginner',
    ...overrides
  }),
  
  vocabularyPhrase: (overrides: any = {}) => ({
    spanish: 'la montaña',
    english: 'the mountain',
    difficulty: 'beginner',
    context: 'nature',
    ...overrides
  }),
  
  apiResponse: (data: any, success = true) => ({
    success,
    data,
    timestamp: new Date().toISOString(),
    ...(success ? {} : { error: 'Test error', message: 'Test error message' })
  })
};

// Mock API responses
export const mockApiResponses = {
  images: {
    search: {
      success: {
        results: [createTestData.image()],
        total: 1,
        total_pages: 1
      },
      empty: {
        results: [],
        total: 0,
        total_pages: 0
      },
      error: {
        errors: ['Rate limit exceeded']
      }
    }
  },
  
  descriptions: {
    generate: {
      success: createTestData.apiResponse([
        createTestData.description({ language: 'english' }),
        createTestData.description({ language: 'spanish', content: 'Descripción de prueba' })
      ]),
      error: createTestData.apiResponse(null, false)
    }
  },
  
  qa: {
    generate: {
      success: createTestData.apiResponse({
        questions: [createTestData.qaQuestion()],
        metadata: {
          difficulty: 'beginner',
          totalQuestions: 1
        }
      }),
      error: createTestData.apiResponse(null, false)
    }
  },
  
  vocabulary: {
    save: {
      success: createTestData.apiResponse({
        phrases: [createTestData.vocabularyPhrase()],
        savedCount: 1
      }),
      error: createTestData.apiResponse(null, false)
    }
  }
};

// Test utilities for common operations
export const testUtils = {
  /**
   * Wait for element to appear
   */
  waitForElement: async (selector: string, timeout = TEST_CONFIG.DEFAULT_TIMEOUT) => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Element ${selector} not found within ${timeout}ms`));
      }, timeout);
      
      const checkElement = () => {
        const element = document.querySelector(selector);
        if (element) {
          clearTimeout(timer);
          resolve(element);
        } else {
          setTimeout(checkElement, 50);
        }
      };
      
      checkElement();
    });
  },
  
  /**
   * Mock API call with delay
   */
  mockApiCall: (response: any, delay = 100) => {
    return vi.fn().mockImplementation(() => 
      new Promise(resolve => {
        setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve(response)
        }), delay);
      })
    );
  },
  
  /**
   * Mock API error with delay
   */
  mockApiError: (error: any, delay = 100) => {
    return vi.fn().mockImplementation(() => 
      new Promise((_, reject) => {
        setTimeout(() => reject(error), delay);
      })
    );
  },
  
  /**
   * Simulate user typing with realistic delays
   */
  typeWithDelay: async (element: HTMLElement, text: string, delay = 50) => {
    for (const char of text) {
      element.dispatchEvent(new KeyboardEvent('keydown', { key: char }));
      
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        element.value += char;
        element.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      element.dispatchEvent(new KeyboardEvent('keyup', { key: char }));
      
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  },
  
  /**
   * Get memory usage if available
   */
  getMemoryUsage: () => {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    return 0;
  },
  
  /**
   * Measure performance of a function
   */
  measurePerformance: async <T>(fn: () => Promise<T>): Promise<{ result: T; duration: number; memory: number }> => {
    const startTime = performance.now();
    const startMemory = testUtils.getMemoryUsage();
    
    const result = await fn();
    
    const endTime = performance.now();
    const endMemory = testUtils.getMemoryUsage();
    
    return {
      result,
      duration: endTime - startTime,
      memory: endMemory - startMemory
    };
  }
};

// Export everything as default config
export default {
  TEST_CONFIG,
  setupGlobalMocks,
  assertions,
  createTestData,
  mockApiResponses,
  testUtils
};
