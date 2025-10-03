import { render, RenderOptions, waitFor, screen, fireEvent } from '@testing-library/react';
import { ReactElement } from 'react';
import { expect, vi } from 'vitest';

// Mock ResizeObserver for tests
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock IntersectionObserver for tests
global.IntersectionObserver = class IntersectionObserver {
  root = null;
  rootMargin = '0px';
  thresholds = [0];
  
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
  takeRecords() { return [] }
} as any;

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Custom render function with default providers if needed
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  return render(ui, {
    // Add any global providers here if needed
    // wrapper: ({ children }) => <Provider>{children}</Provider>,
    ...options,
  });
};

// Test data factories
export const createMockImage = (overrides = {}) => ({
  id: 'test-image-1',
  urls: {
    regular: 'https://example.com/image.jpg',
    small: 'https://example.com/image-small.jpg',
    thumb: 'https://example.com/image-thumb.jpg'
  },
  description: 'A test image',
  alt_description: 'Test alt description',
  width: 1200,
  height: 800,
  color: '#ffffff',
  likes: 100,
  ...overrides
});

export const createMockPhrase = (overrides = {}) => ({
  id: 'phrase-1',
  phrase: 'Test phrase',
  definition: 'A test definition',
  partOfSpeech: 'noun',
  difficulty: 'intermediate',
  context: 'This is a test context for the phrase.',
  createdAt: new Date('2023-01-01'),
  ...overrides
});

export const createMockQuestion = (overrides = {}) => ({
  id: 'question-1',
  question: 'What is this?',
  options: ['Option A', 'Option B', 'Option C', 'Option D'],
  correctAnswer: 0,
  explanation: 'This is the correct answer explanation.',
  ...overrides
});

export const createMockQAResponse = (overrides = {}) => ({
  id: 'qa-1',
  imageId: 'test-image-1',
  question: 'What can you see in this image?',
  answer: 'A beautiful test image',
  confidence: 0.95,
  createdAt: '2023-01-01T00:00:00Z',
  ...overrides
});

// API mock helpers
export const mockFetchSuccess = (data: any) => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
    status: 200,
    statusText: 'OK'
  });
};

export const mockFetchError = (message: string, status = 500) => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: false,
    json: () => Promise.resolve({ message }),
    status,
    statusText: 'Internal Server Error'
  });
};

export const mockFetchNetworkError = (message = 'Network Error') => {
  global.fetch = vi.fn().mockRejectedValue(new Error(message));
};

// Wait for async operations in tests
export const waitForLoadingToFinish = async () => {
  await waitFor(() => {
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });
};

// Common test assertions
export const expectElementToBeVisible = (element: HTMLElement) => {
  expect(element).toBeInTheDocument();
  expect(element).toBeVisible();
};

export const expectElementToHaveAccessibleName = (element: HTMLElement, name: string) => {
  expect(element).toHaveAccessibleName(name);
};

// Accessibility test helpers
export const checkBasicAccessibility = (container: HTMLElement) => {
  // Check for heading hierarchy
  const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
  headings.forEach(heading => {
    expect(heading).toHaveTextContent(/.+/); // Should have content
  });
  
  // Check for buttons with accessible names
  const buttons = container.querySelectorAll('button');
  buttons.forEach(button => {
    expect(button).toHaveAttribute('type');
  });
  
  // Check for form inputs with labels
  const inputs = container.querySelectorAll('input, select, textarea');
  inputs.forEach(input => {
    const id = input.getAttribute('id');
    if (id) {
      const label = container.querySelector(`label[for="${id}"]`);
      expect(label).toBeInTheDocument();
    }
  });
};

// Performance test helpers
export const measureRenderTime = (renderFn: () => any) => {
  const start = performance.now();
  const result = renderFn();
  const end = performance.now();
  return {
    result,
    time: end - start
  };
};

// Event simulation helpers
export const simulateTyping = async (input: HTMLElement, text: string) => {
  for (const char of text) {
    fireEvent.change(input, { target: { value: (input as HTMLInputElement).value + char } });
    await new Promise(resolve => setTimeout(resolve, 10));
  }
};

export const simulateKeyboardNavigation = (element: HTMLElement, direction: 'forward' | 'backward') => {
  const key = direction === 'forward' ? 'Tab' : 'Tab';
  const shiftKey = direction === 'backward';
  
  fireEvent.keyDown(element, { key, shiftKey });
};

// Re-export everything from testing-library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';

// Override the default render with our custom one
export { customRender as render };