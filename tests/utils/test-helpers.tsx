import { vi } from 'vitest';
import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Test utilities for consistent testing across the application

/**
 * Creates a mock API response with consistent structure
 */
export const createMockApiResponse = <T,>(data: T, success = true) => ({
  success,
  data,
  timestamp: new Date().toISOString(),
  ...(success ? {} : { error: 'Mock error', message: 'Mock error message' })
});

/**
 * Mock fetch function for API testing
 */
export const mockFetch = (response: any, ok = true, status = 200) => {
  const mockResponse = {
    ok,
    status,
    json: vi.fn().mockResolvedValue(response),
    text: vi.fn().mockResolvedValue(JSON.stringify(response)),
    headers: new Headers({
      'Content-Type': 'application/json'
    })
  };
  
  (global.fetch as any) = vi.fn().mockResolvedValue(mockResponse);
  return mockResponse;
};

/**
 * Mock fetch error for testing error scenarios
 */
export const mockFetchError = (error: Error | string) => {
  const errorObj = typeof error === 'string' ? new Error(error) : error;
  (global.fetch as any) = vi.fn().mockRejectedValue(errorObj);
  return errorObj;
};

/**
 * Mock network error specifically
 */
export const mockNetworkError = () => {
  const networkError = new Error('Failed to fetch');
  networkError.name = 'TypeError';
  return mockFetchError(networkError);
};

/**
 * Mock timeout error
 */
export const mockTimeoutError = () => {
  const timeoutError = new Error('Operation was aborted');
  timeoutError.name = 'AbortError';
  return mockFetchError(timeoutError);
};

/**
 * Creates a test QueryClient with disabled retries and cache
 */
export const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0,
      staleTime: 0,
    },
    mutations: {
      retry: false,
    },
  },
});

/**
 * Custom render function with providers
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
}

export const renderWithProviders = (
  ui: ReactElement,
  { queryClient = createTestQueryClient(), ...renderOptions }: CustomRenderOptions = {}
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

/**
 * Mock localStorage for testing
 */
export const createMockLocalStorage = () => {
  const store: Record<string, string> = {};
  
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  };
};

/**
 * Mock sessionStorage for testing
 */
export const createMockSessionStorage = () => createMockLocalStorage();

/**
 * Mock IntersectionObserver for testing
 */
export const createMockIntersectionObserver = () => {
  const mockObserver = {
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
    takeRecords: vi.fn(() => []),
    root: null,
    rootMargin: '',
    thresholds: []
  };
  
  global.IntersectionObserver = vi.fn(() => mockObserver) as any;
  return mockObserver;
};

/**
 * Mock ResizeObserver for testing
 */
export const createMockResizeObserver = () => {
  const mockObserver = {
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
  };
  
  global.ResizeObserver = vi.fn(() => mockObserver) as any;
  return mockObserver;
};

/**
 * Mock window.matchMedia for responsive testing
 */
export const mockMatchMedia = (matches = false) => {
  const mockMatchMedia = vi.fn().mockImplementation(query => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: mockMatchMedia,
  });
  
  return mockMatchMedia;
};

/**
 * Wait for next tick (useful for async operations)
 */
export const waitForNextTick = () => new Promise(resolve => setTimeout(resolve, 0));

/**
 * Create mock UnsplashImage for testing
 */
export const createMockUnsplashImage = (overrides: Partial<any> = {}) => ({
  id: 'mock-image-id',
  urls: {
    thumb: 'https://example.com/thumb.jpg',
    small: 'https://example.com/small.jpg',
    regular: 'https://example.com/regular.jpg',
    full: 'https://example.com/full.jpg',
    raw: 'https://example.com/raw.jpg'
  },
  user: {
    id: 'mock-user-id',
    name: 'Mock User',
    username: 'mockuser'
  },
  description: 'Mock image description',
  alt_description: 'Mock alt description',
  width: 1920,
  height: 1080,
  likes: 42,
  ...overrides
});

/**
 * Create mock Description for testing
 */
export const createMockDescription = (overrides: Partial<any> = {}) => ({
  id: 'mock-description-id',
  imageId: 'mock-image-url',
  style: 'narrativo',
  content: 'Mock description content',
  language: 'english',
  createdAt: new Date(),
  ...overrides
});

/**
 * Create mock QA data for testing
 */
export const createMockQAData = (overrides: Partial<any> = {}) => ({
  questions: [
    {
      id: 'q1',
      question: '¿Qué se ve en la imagen?',
      options: ['Montaña', 'Río', 'Ciudad', 'Bosque'],
      correctAnswer: 0,
      explanation: 'La imagen muestra una montaña.'
    }
  ],
  metadata: {
    difficulty: 'beginner',
    totalQuestions: 1
  },
  ...overrides
});

/**
 * Create mock vocabulary phrase for testing
 */
export const createMockVocabularyPhrase = (overrides: Partial<any> = {}) => ({
  spanish: 'la montaña',
  english: 'the mountain',
  difficulty: 'beginner',
  context: 'nature',
  ...overrides
});

/**
 * Mock console methods for testing
 */
export const mockConsole = () => {
  const originalConsole = { ...console };
  
  Object.keys(console).forEach(method => {
    (console as any)[method] = vi.fn();
  });
  
  return {
    restore: () => {
      Object.assign(console, originalConsole);
    },
    mocks: {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info
    }
  };
};

/**
 * Create performance timing mock
 */
export const mockPerformanceTiming = (overrides: Partial<PerformanceTiming> = {}) => {
  const baseTiming = Date.now();
  
  return {
    navigationStart: baseTiming,
    unloadEventStart: baseTiming + 10,
    unloadEventEnd: baseTiming + 20,
    redirectStart: 0,
    redirectEnd: 0,
    fetchStart: baseTiming + 30,
    domainLookupStart: baseTiming + 40,
    domainLookupEnd: baseTiming + 50,
    connectStart: baseTiming + 60,
    connectEnd: baseTiming + 70,
    secureConnectionStart: baseTiming + 65,
    requestStart: baseTiming + 80,
    responseStart: baseTiming + 200,
    responseEnd: baseTiming + 300,
    domLoading: baseTiming + 320,
    domInteractive: baseTiming + 500,
    domContentLoadedEventStart: baseTiming + 520,
    domContentLoadedEventEnd: baseTiming + 540,
    domComplete: baseTiming + 800,
    loadEventStart: baseTiming + 820,
    loadEventEnd: baseTiming + 850,
    ...overrides
  };
};

/**
 * Simulate user typing with delay
 */
export const simulateTyping = async (
  element: HTMLElement,
  text: string,
  delay = 50
) => {
  for (const char of text) {
    element.dispatchEvent(new KeyboardEvent('keydown', { key: char }));
    element.dispatchEvent(new KeyboardEvent('keypress', { key: char }));
    
    if (element instanceof HTMLInputElement) {
      element.value += char;
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    element.dispatchEvent(new KeyboardEvent('keyup', { key: char }));
    
    await new Promise(resolve => setTimeout(resolve, delay));
  }
};

/**
 * Create mock file for file upload testing
 */
export const createMockFile = (
  name = 'test.jpg',
  type = 'image/jpeg',
  size = 1024
) => {
  const file = new File([''], name, { type });
  Object.defineProperty(file, 'size', {
    value: size,
    writable: false
  });
  return file;
};

/**
 * Mock URL.createObjectURL for file testing
 */
export const mockCreateObjectURL = () => {
  const mockUrl = 'blob:https://example.com/mock-object-url';
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  
  URL.createObjectURL = vi.fn(() => mockUrl);
  URL.revokeObjectURL = vi.fn();
  
  return {
    mockUrl,
    restore: () => {
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
    }
  };
};

/**
 * Create mock clipboard API
 */
export const mockClipboardAPI = () => {
  const clipboard = {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
    write: vi.fn().mockResolvedValue(undefined),
    read: vi.fn().mockResolvedValue([]),
  };
  
  Object.defineProperty(navigator, 'clipboard', {
    value: clipboard,
    writable: true
  });
  
  return clipboard;
};

/**
 * Assert that element has expected CSS classes
 */
export const expectToHaveClasses = (element: Element, classes: string[]) => {
  classes.forEach(className => {
    expect(element).toHaveClass(className);
  });
};

/**
 * Assert that element has expected ARIA attributes
 */
export const expectToHaveAriaAttributes = (
  element: Element, 
  attributes: Record<string, string>
) => {
  Object.entries(attributes).forEach(([attr, value]) => {
    expect(element).toHaveAttribute(`aria-${attr}`, value);
  });
};

/**
 * Create a deferred promise for testing async operations
 */
export const createDeferred = <T = any,>() => {
  let resolve: (value: T) => void;
  let reject: (reason?: any) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return {
    promise,
    resolve: resolve!,
    reject: reject!
  };
};

/**
 * Generate test vocabulary items for testing
 */
export const generateTestVocabularyItems = (count = 5) => {
  return Array(count).fill(null).map((_, i) => ({
    id: `vocab-${i + 1}`,
    vocabulary_list_id: 'test-list',
    spanish_text: `palabra${i + 1}`,
    english_translation: `word${i + 1}`,
    category: i % 2 === 0 ? 'greetings' : 'food',
    difficulty_level: (i % 3) + 1,
    part_of_speech: 'noun' as const,
    frequency_score: 50 + (i * 10),
    created_at: new Date().toISOString(),
  }));
};

/**
 * Generate test description for testing
 */
export const generateTestDescription = () => ({
  description: 'Una hermosa imagen de prueba',
  context: 'Test context',
  style: 'narrativo',
  language: 'spanish',
  phrases: ['frase uno', 'frase dos'],
});

/**
 * Generate test phrases for testing
 */
export const generateTestPhrases = () => ({
  sustantivos: ['casa', 'gato', 'perro'],
  verbos: ['correr', 'saltar', 'comer'],
  adjetivos: ['grande', 'pequeño', 'bonito'],
  frases_clave: ['¿Cómo estás?', 'Buenos días'],
});

/**
 * Generate test QA data for testing
 */
export const generateTestQAData = (count = 3) => {
  return Array(count).fill(null).map((_, i) => ({
    question: `¿Pregunta de prueba ${i + 1}?`,
    answer: `Respuesta de prueba ${i + 1}`,
    difficulty: 'facil' as const,
    category: 'prueba',
  }));
};

/**
 * Measure performance of an async operation
 */
export const measurePerformance = async <T,>(fn: () => Promise<T>): Promise<{ duration: number; result: T }> => {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  return { duration: end - start, result };
};
