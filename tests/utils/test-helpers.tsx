import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import userEvent from '@testing-library/user-event'
import { ReactElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { expect, vi } from 'vitest'
import type {
  VocabularyItem,
  DescriptionStyle,
  APIResponse
} from '../../src/types'
import type {
  UnsplashImage,
  GeneratedDescription,
  QAGeneration
} from '../../src/types/api'

// Test wrapper for React Query
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
    },
  })
}

export function TestQueryProvider({ children }: { children: React.ReactNode }) {
  const testQueryClient = createTestQueryClient()
  
  return (
    <QueryClientProvider client={testQueryClient}>
      {children}
    </QueryClientProvider>
  )
}

// Custom render with providers
export function renderWithProviders(ui: ReactElement, options = {}) {
  const testQueryClient = createTestQueryClient()
  
  const Wrapper = ({ children }: { children?: React.ReactNode }) => (
    <QueryClientProvider client={testQueryClient}>
      {children}
    </QueryClientProvider>
  )

  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: Wrapper, ...options }),
  }
}

// Helper to wait for loading states
export async function waitForLoadingToFinish() {
  await waitFor(() => {
    expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument()
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
  })
}

// Mock API responses helper with proper typing
export function createMockApiResponse<T = Record<string, unknown>>(
  data: T,
  status = 200
): Partial<Response> {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(JSON.stringify(data)),
  }
}

// Wait for async operations
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0))

// Mock image URL helper
export const createMockImageUrl = (id = 'test-image') => `https://example.com/images/${id}.jpg`

// Mock search response helper with proper typing
export function createMockSearchResponse(count = 3): {
  success: boolean;
  data: {
    images: Partial<UnsplashImage>[];
  };
} {
  return {
    success: true,
    data: {
      images: Array.from({ length: count }, (_, i) => ({
        id: `image-${i}`,
        urls: {
          regular: createMockImageUrl(`image-${i}`),
          small: createMockImageUrl(`image-${i}-small`),
          full: createMockImageUrl(`image-${i}-full`),
          raw: createMockImageUrl(`image-${i}-raw`),
          thumb: createMockImageUrl(`image-${i}-thumb`),
          small_s3: createMockImageUrl(`image-${i}-small-s3`)
        },
        alt_description: `Test image ${i}`,
        description: `Mock description for test image ${i}`,
        width: 800,
        height: 600,
        color: '#2563eb',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as Partial<UnsplashImage>)),
    },
  }
}

// Helper to create mock API responses with proper typing
export function createMockResponse<T = unknown>(
  data: T,
  status = 200,
  ok = true
): Promise<Response> {
  const mockResponse = {
    ok,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    bytes: () => Promise.resolve(new Uint8Array()),
    formData: () => Promise.resolve(new FormData()),
    headers: new Headers(),
    redirected: false,
    statusText: ok ? 'OK' : 'Error',
    type: 'cors' as ResponseType,
    url: 'http://test.com',
    clone: () => createMockResponse(data, status, ok),
    body: null,
    bodyUsed: false,
  } as unknown as Response
  
  return Promise.resolve(mockResponse)
}

// Helper to create mock error response
export function createMockErrorResponse(message: string, status = 500) {
  return createMockResponse({ error: message }, status, false)
}

// Helper to generate test data with proper typing
export function generateTestDescription(): GeneratedDescription {
  return {
    style: 'narrativo',
    text: 'Esta es una descripción de prueba que contiene palabras interesantes para el aprendizaje del español.',
    language: 'es',
    wordCount: 17,
    generatedAt: new Date().toISOString(),
  }
}

export function generateTestPhrases(): Record<string, Array<{
  phrase: string;
  definition: string;
  category: string;
  partOfSpeech: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  context: string;
  sortKey: string;
  imageUrl: string;
  gender?: string;
  article?: string;
}>> {
  return {
    sustantivos: [
      {
        phrase: 'casa',
        definition: 'house',
        category: 'sustantivos',
        partOfSpeech: 'sustantivo',
        difficulty: 'beginner',
        context: 'En la imagen se ve una casa.',
        sortKey: 'casa',
        imageUrl: 'test-image.jpg',
        gender: 'femenino',
        article: 'la',
      }
    ],
    verbos: [],
    adjetivos: [],
    adverbios: [],
    frasesClaves: [],
  }
}

export function generateTestVocabularyItems(): VocabularyItem[] {
  return [
    {
      id: 'test-1',
      spanish_text: 'hola',
      english_translation: 'hello',
      category: 'greetings',
      difficulty_level: 1,
      part_of_speech: 'interjection',
      frequency_score: 100,
      context_sentence_spanish: 'Hola, ¿cómo estás?',
      context_sentence_english: 'Hello, how are you?',
      phonetic_pronunciation: 'OH-lah',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      mastery_level: 75,
      review_count: 5,
      last_reviewed: new Date().toISOString()
    },
  ]
}

export function generateTestQAData(): QAGeneration[] {
  return [
    {
      question: '¿Qué se ve en la imagen?',
      answer: 'Se ve una casa bonita.',
      difficulty: 'facil',
      category: 'comprension',
    }
  ]
}

// Performance testing helpers with proper typing
export async function measurePerformance<T>(
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = performance.now()
  try {
    const result = await fn()
    const duration = performance.now() - start
    return { result, duration }
  } catch (error) {
    const duration = performance.now() - start
    throw new Error(`Performance test failed after ${duration}ms: ${error}`)
  }
}

// Async helper for testing
export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Helper to spy on console methods with proper typing
export function mockConsole(): {
  mockMethods: {
    log: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
    debug: ReturnType<typeof vi.fn>;
  };
  restore: () => void;
} {
  const originalConsole = { ...console }
  
  const mockMethods = {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }

  Object.assign(console, mockMethods)
  
  return {
    mockMethods,
    restore: () => Object.assign(console, originalConsole),
  }
}