import React from 'react';
import { render, RenderOptions, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

// Custom render function that includes providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialState?: any;
}

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <div data-testid="test-provider">
      {children}
    </div>
  );
};

const customRender = (
  ui: React.ReactElement,
  options?: CustomRenderOptions
) => {
  const user = userEvent.setup();
  return {
    user,
    ...render(ui, { wrapper: AllTheProviders, ...options })
  };
};

// Mock data factories
export const mockImage = (overrides: Partial<any> = {}) => ({
  id: 'test-image-id',
  urls: {
    raw: 'https://example.com/image-raw.jpg',
    full: 'https://example.com/image-full.jpg',
    regular: 'https://example.com/image-regular.jpg',
    small: 'https://example.com/image-small.jpg',
    thumb: 'https://example.com/image-thumb.jpg'
  },
  alt_description: 'Test image description',
  description: 'A beautiful test image',
  user: {
    name: 'Test Photographer',
    username: 'testphotographer'
  },
  width: 1920,
  height: 1080,
  likes: 42,
  ...overrides
});

export const mockDescriptions = {
  english: {
    narrativo: 'This is a narrative English description.',
    tecnico: 'This is a technical English description.',
    poetico: 'This is a poetic English description.'
  },
  spanish: {
    narrativo: 'Esta es una descripción narrativa en español.',
    tecnico: 'Esta es una descripción técnica en español.',
    poetico: 'Esta es una descripción poética en español.'
  }
};

export const mockVocabulary = [
  {
    word: 'hermoso',
    translation: 'beautiful',
    context: 'Esta imagen es muy hermosa.',
    difficulty: 'beginner' as const
  },
  {
    word: 'paisaje',
    translation: 'landscape',
    context: 'Un paisaje increíble.',
    difficulty: 'intermediate' as const
  }
];

export const mockQAItems = [
  {
    id: '1',
    question: '¿Qué se puede ver en la imagen?',
    answer: 'Se puede ver un hermoso paisaje.',
    difficulty: 'beginner' as const,
    type: 'comprehension' as const
  },
  {
    id: '2',
    question: 'Describe los colores principales.',
    answer: 'Los colores principales son verde y azul.',
    difficulty: 'intermediate' as const,
    type: 'description' as const
  }
];

// Mock API responses
export const createMockApiResponse = (data: any, status = 200) => {
  const mockHeaders = new Map<string, string>();
  
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
    headers: {
      get: (name: string) => mockHeaders.get(name.toLowerCase()) || null,
      set: (name: string, value: string) => mockHeaders.set(name.toLowerCase(), value),
      has: (name: string) => mockHeaders.has(name.toLowerCase()),
      delete: (name: string) => mockHeaders.delete(name.toLowerCase()),
      forEach: (callback: (value: string, key: string) => void) => {
        mockHeaders.forEach(callback);
      }
    }
  };
};

// Mock fetch responses
export const mockFetch = (response: any, status = 200) => {
  (global.fetch as any).mockResolvedValueOnce(
    createMockApiResponse(response, status)
  );
};

export const mockFetchError = (error: string) => {
  (global.fetch as any).mockRejectedValueOnce(new Error(error));
};

// Wait for async operations
export const waitForLoadingToFinish = async () => {
  await screen.findByText(/loading/i).then(() => {}).catch(() => {});
  // Additional wait to ensure all async operations complete
  await new Promise(resolve => setTimeout(resolve, 100));
};

// Screen utilities
export const getByTextContent = (text: string) => {
  return screen.getByText((content, element) => {
    return element?.textContent === text;
  });
};

export const queryByTextContent = (text: string) => {
  return screen.queryByText((content, element) => {
    return element?.textContent === text;
  });
};

// Assertion helpers
export const expectElementToBeVisible = (element: HTMLElement) => {
  expect(element).toBeInTheDocument();
  expect(element).toBeVisible();
};

export const expectElementToHaveLoadingState = (container: HTMLElement) => {
  expect(container.querySelector('[data-testid="loader-icon"]')).toBeInTheDocument();
};

export const expectElementToHaveErrorState = (container: HTMLElement) => {
  expect(container.querySelector('[data-testid="alert-circle-icon"]')).toBeInTheDocument();
};

// Performance testing utilities
export const measureRenderTime = async (renderFn: () => void) => {
  const start = performance.now();
  renderFn();
  await new Promise(resolve => setTimeout(resolve, 0)); // Wait for render
  const end = performance.now();
  return end - start;
};

// Accessibility testing utilities
export const checkAccessibility = (container: HTMLElement) => {
  // Check for proper ARIA labels
  const interactiveElements = container.querySelectorAll('button, input, select, textarea, a');
  interactiveElements.forEach(element => {
    const hasAccessibleName = 
      element.getAttribute('aria-label') ||
      element.getAttribute('aria-labelledby') ||
      element.textContent?.trim() ||
      element.getAttribute('title');
    
    if (!hasAccessibleName) {
      console.warn('Interactive element missing accessible name:', element);
    }
  });

  // Check for proper heading hierarchy
  const headings = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6'));
  headings.forEach((heading, index) => {
    const level = parseInt(heading.tagName.charAt(1));
    if (index > 0) {
      const prevLevel = parseInt(headings[index - 1].tagName.charAt(1));
      if (level > prevLevel + 1) {
        console.warn('Heading hierarchy skip detected:', heading);
      }
    }
  });
};

// Form testing utilities
export const fillForm = async (user: any, formData: Record<string, string>) => {
  for (const [fieldName, value] of Object.entries(formData)) {
    const field = screen.getByLabelText(new RegExp(fieldName, 'i')) || 
                   screen.getByPlaceholderText(new RegExp(fieldName, 'i')) ||
                   screen.getByRole('textbox', { name: new RegExp(fieldName, 'i') });
    await user.clear(field);
    await user.type(field, value);
  }
};

// Export everything
export * from '@testing-library/react';
export { customRender as render };
export { userEvent };
export { vi };