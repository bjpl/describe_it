import { vi } from 'vitest';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactElement } from 'react';

/**
 * Test utilities for the Spanish Learning App
 */

// Mock data generators
export const createMockImage = (id: string = 'test-image', overrides = {}) => ({
  id,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  width: 800,
  height: 600,
  color: '#ffffff',
  blur_hash: 'LGF5?xYk^6#M@-5c,1J5@[or[Q6.',
  description: `Test image ${id}`,
  alt_description: `Test alt description ${id}`,
  urls: {
    raw: `https://example.com/${id}-raw.jpg`,
    full: `https://example.com/${id}-full.jpg`,
    regular: `https://example.com/${id}-regular.jpg`,
    small: `https://example.com/${id}-small.jpg`,
    thumb: `https://example.com/${id}-thumb.jpg`,
    small_s3: `https://example.com/${id}-small-s3.jpg`,
  },
  links: {
    self: `https://api.unsplash.com/photos/${id}`,
    html: `https://unsplash.com/photos/${id}`,
    download: `https://unsplash.com/photos/${id}/download`,
    download_location: `https://api.unsplash.com/photos/${id}/download`,
  },
  user: {
    id: `user-${id}`,
    username: `photographer${id}`,
    name: `Photographer ${id}`,
    first_name: 'Photographer',
    last_name: id,
    instagram_username: null,
    twitter_username: null,
    portfolio_url: null,
    bio: `Professional photographer`,
    location: 'Test Location',
    total_likes: Math.floor(Math.random() * 1000),
    total_photos: Math.floor(Math.random() * 500),
    accepted_tos: true,
    profile_image: {
      small: `https://example.com/profile-${id}-small.jpg`,
      medium: `https://example.com/profile-${id}-medium.jpg`,
      large: `https://example.com/profile-${id}-large.jpg`,
    },
    links: {
      self: `https://api.unsplash.com/users/${id}`,
      html: `https://unsplash.com/@photographer${id}`,
      photos: `https://api.unsplash.com/users/${id}/photos`,
      likes: `https://api.unsplash.com/users/${id}/likes`,
      portfolio: `https://api.unsplash.com/users/${id}/portfolio`,
    },
  },
  tags: [
    { type: 'landing_page', title: 'test' },
    { type: 'search', title: id },
  ],
  ...overrides,
});

export const createMockDescription = (id: string = 'test-desc', overrides = {}) => ({
  id,
  imageId: 'test-image',
  style: 'narrativo' as const,
  content: `This is a test description ${id} with comprehensive details about the image.`,
  createdAt: new Date('2023-01-01T12:00:00Z'),
  ...overrides,
});

export const createMockPhrase = (id: string = 'test-phrase', overrides = {}) => ({
  id,
  text: `Test phrase ${id}`,
  category: 'nouns' as const,
  translation: `Test translation ${id}`,
  difficulty: 'intermediate' as const,
  ...overrides,
});

export const createMockQuestion = (id: string = 'test-question', overrides = {}) => ({
  id,
  question: `¿Qué puedes observar en la imagen? (Test question ${id})`,
  answer: `En la imagen se puede observar... (Test answer ${id})`,
  difficulty: 'medio' as const,
  category: 'descripción',
  ...overrides,
});

// Test wrapper utilities
export const createQueryClient = (options = {}) => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0, // Disable cache for tests
        ...options,
      },
      mutations: {
        retry: false,
        ...options,
      },
    },
  });
};

export const renderWithQueryClient = (
  ui: ReactElement,
  { queryClient = createQueryClient(), ...options } = {}
) => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  return {
    ...render(ui, { wrapper, ...options }),
    queryClient,
  };
};

// Mock store creators
export const createMockAppStore = (overrides = {}) => ({
  currentImage: null,
  setCurrentImage: vi.fn(),
  setError: vi.fn(),
  clearError: vi.fn(),
  searchHistory: [],
  addToSearchHistory: vi.fn(),
  clearSearchHistory: vi.fn(),
  ...overrides,
});

export const createMockSessionStore = (overrides = {}) => ({
  trackSearch: vi.fn(),
  trackDescriptionGeneration: vi.fn(),
  trackPhraseExtraction: vi.fn(),
  trackQAGeneration: vi.fn(),
  ...overrides,
});

// API response mocks
export const mockSearchResponse = (query: string, count: number = 20) => ({
  total: count * 5, // Simulate pagination
  total_pages: 5,
  results: Array.from({ length: count }, (_, i) => 
    createMockImage(`${query}-${i}`, { 
      alt_description: `${query} image ${i}`,
      description: `A beautiful ${query} photograph ${i}`,
    })
  ),
});

export const mockDescriptionResponse = (style: string = 'narrativo') => ({
  style,
  text: `Esta es una descripción en estilo ${style}. La imagen muestra elementos fascinantes que capturan la atención del observador y despiertan su curiosidad por conocer más detalles.`,
  language: 'es',
  wordCount: 32,
  generatedAt: new Date().toISOString(),
});

export const mockPhrasesResponse = (count: number = 10) => ({
  phrases: Array.from({ length: count }, (_, i) => 
    createMockPhrase(`phrase-${i}`, {
      text: `frase ${i}`,
      translation: `phrase ${i}`,
      category: ['nouns', 'verbs', 'adjectives', 'phrases', 'idioms'][i % 5],
      difficulty: ['beginner', 'intermediate', 'advanced'][i % 3],
    })
  ),
});

export const mockQuestionsResponse = (count: number = 5) => ({
  questions: Array.from({ length: count }, (_, i) => 
    createMockQuestion(`q-${i}`, {
      question: `¿Pregunta de prueba número ${i + 1}?`,
      answer: `Respuesta de prueba número ${i + 1}.`,
      difficulty: ['facil', 'medio', 'dificil'][i % 3],
      category: ['descripción', 'análisis', 'interpretación'][i % 3],
    })
  ),
});

// Error simulation helpers
export const simulateNetworkError = () => {
  throw new Error('Network Error');
};

export const simulateRateLimit = () => {
  const error = new Error('Rate limit exceeded');
  (error as any).status = 429;
  throw error;
};

export const simulateValidationError = (field: string) => {
  const error = new Error('Validation Error');
  (error as any).status = 400;
  (error as any).details = [{ field, message: `${field} is required` }];
  throw error;
};

export const simulateServerError = () => {
  const error = new Error('Internal Server Error');
  (error as any).status = 500;
  throw error;
};

// Performance testing helpers
export const measureExecutionTime = async (fn: () => Promise<any>) => {
  const start = performance.now();
  await fn();
  const end = performance.now();
  return end - start;
};

export const createLargeDataset = (size: number) => {
  return Array.from({ length: size }, (_, i) => ({
    id: `item-${i}`,
    data: `Large dataset item ${i}`.repeat(100), // Make it larger
  }));
};

// Accessibility testing helpers
export const checkFocusOrder = async (page: any, expectedOrder: string[]) => {
  for (let i = 0; i < expectedOrder.length; i++) {
    await page.keyboard.press('Tab');
    const focusedElement = await page.locator(':focus');
    const ariaLabel = await focusedElement.getAttribute('aria-label');
    const text = await focusedElement.textContent();
    const identifier = ariaLabel || text || await focusedElement.getAttribute('placeholder');
    
    if (!identifier?.includes(expectedOrder[i])) {
      throw new Error(`Expected focus on element containing "${expectedOrder[i]}", but got "${identifier}"`);
    }
  }
};

export const checkAriaLabels = async (page: any, selectors: string[]) => {
  for (const selector of selectors) {
    const element = page.locator(selector);
    const ariaLabel = await element.getAttribute('aria-label');
    const ariaLabelledBy = await element.getAttribute('aria-labelledby');
    
    if (!ariaLabel && !ariaLabelledBy) {
      throw new Error(`Element ${selector} missing aria-label or aria-labelledby`);
    }
  }
};

// Mock service workers for specific test scenarios
export const setupMockServiceWorker = (handlers: any[]) => {
  // This would be used with MSW for more complex mocking scenarios
  return {
    start: vi.fn(),
    stop: vi.fn(),
    resetHandlers: vi.fn(),
  };
};

// Database testing helpers (for integration tests)
export const setupTestDatabase = async () => {
  // Mock database setup for integration tests
  return {
    connect: vi.fn(),
    disconnect: vi.fn(),
    clear: vi.fn(),
    seed: vi.fn(),
  };
};

export const seedTestData = async (db: any) => {
  // Seed database with test data
  const images = Array.from({ length: 10 }, (_, i) => createMockImage(`seed-${i}`));
  const descriptions = Array.from({ length: 5 }, (_, i) => createMockDescription(`seed-desc-${i}`));
  
  await db.seed({ images, descriptions });
};

// Visual regression testing helpers
export const takeScreenshot = async (page: any, name: string) => {
  await page.screenshot({ path: `tests/screenshots/${name}.png`, fullPage: true });
};

export const compareScreenshots = async (page: any, name: string) => {
  // This would integrate with visual regression testing tools
  await page.screenshot({ path: `tests/screenshots/${name}-actual.png` });
  // Compare with expected screenshot
};

// Loading state testing
export const waitForLoadingToComplete = async (page: any, timeout = 10000) => {
  await page.waitForSelector('[data-testid="loading"]', { state: 'hidden', timeout });
};

export const simulateSlowNetwork = async (page: any, delay = 2000) => {
  await page.route('**/*', async (route) => {
    await new Promise(resolve => setTimeout(resolve, delay));
    await route.continue();
  });
};

// Memory leak testing
export const measureMemoryUsage = () => {
  if (typeof performance !== 'undefined' && performance.memory) {
    return {
      used: performance.memory.usedJSHeapSize,
      total: performance.memory.totalJSHeapSize,
      limit: performance.memory.jsHeapSizeLimit,
    };
  }
  return null;
};

export const checkForMemoryLeaks = (beforeUsage: any, afterUsage: any, threshold = 1024 * 1024) => {
  if (!beforeUsage || !afterUsage) return false;
  
  const increase = afterUsage.used - beforeUsage.used;
  return increase > threshold;
};

// Test data cleanup
export const cleanupTestData = async () => {
  // Clean up any persistent test data
  localStorage.clear();
  sessionStorage.clear();
  
  // Clear any test databases
  // Clear any test files
};

// Random data generators for property-based testing
export const generateRandomString = (length: number = 10) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const generateRandomSearchQuery = () => {
  const subjects = ['mountain', 'ocean', 'forest', 'city', 'desert', 'lake', 'sunset', 'flower'];
  const adjectives = ['beautiful', 'dramatic', 'serene', 'vibrant', 'misty', 'golden', 'majestic'];
  
  const subject = subjects[Math.floor(Math.random() * subjects.length)];
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  
  return Math.random() > 0.5 ? `${adjective} ${subject}` : subject;
};

export const generateRandomImageData = () => ({
  width: Math.floor(Math.random() * 2000) + 400,
  height: Math.floor(Math.random() * 2000) + 300,
  likes: Math.floor(Math.random() * 10000),
  color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`,
});

// Test configuration helpers
export const getTestConfig = () => ({
  apiTimeout: 10000,
  retryAttempts: 3,
  defaultLanguage: 'es',
  maxImageResults: 30,
  maxDescriptionLength: 1000,
  maxPhrases: 50,
  maxQuestions: 10,
});

export const isCI = () => process.env.CI === 'true';
export const isDebugMode = () => process.env.DEBUG === 'true';

// Export commonly used combinations
export const renderWithProviders = renderWithQueryClient;