import { vi } from 'vitest'
import type {
  VocabularyItem,
  APIResponse
} from '../../src/types'
import type {
  GeneratedDescription,
  QAGeneration,
  UnsplashImage
} from '../../src/types/api'
import {
  generateTestDescription,
  generateTestPhrases,
  generateTestQAData,
  generateTestVocabularyItems
} from '../utils/test-helpers'

// Mock OpenAI service with proper typing
export const mockOpenAIService = {
  generateDescription: vi.fn().mockImplementation(async (
    params: { imageUrl: string; style: string; language?: string }
  ): Promise<GeneratedDescription> => {
    await new Promise(resolve => setTimeout(resolve, 100))
    return generateTestDescription()
  }),

  generateQA: vi.fn().mockImplementation(async (
    description: string,
    language: string,
    count: number
  ): Promise<QAGeneration[]> => {
    await new Promise(resolve => setTimeout(resolve, 150))
    return Array(count).fill(null).map((_, index) => ({
      question: `¿Pregunta de prueba ${index + 1}?`,
      answer: `Respuesta de prueba ${index + 1}`,
      difficulty: 'facil' as const,
      category: 'prueba',
    }))
  }),

  extractPhrases: vi.fn().mockImplementation(async (
    params: { description: string; imageUrl: string }
  ) => {
    await new Promise(resolve => setTimeout(resolve, 200))
    return generateTestPhrases()
  }),
}

// Mock Supabase client with proper typing
export const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  single: vi.fn().mockImplementation(async (): Promise<{
    data: VocabularyItem | null;
    error: Error | null;
  }> => ({
    data: generateTestVocabularyItems()[0] || null,
    error: null,
  })),
  then: vi.fn().mockImplementation(async (): Promise<{
    data: VocabularyItem[] | null;
    error: Error | null;
  }> => ({
    data: generateTestVocabularyItems(),
    error: null,
  })),
}

// Mock vocabulary service with proper typing
interface VocabularyList {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty_level: number;
  total_words: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface VocabularyStats {
  total_items: number;
  by_difficulty: Record<string, number>;
  by_category: Record<string, number>;
  database_connected: boolean;
}

export const mockVocabularyService = {
  getVocabularyLists: vi.fn().mockResolvedValue([
    {
      id: 'test-list',
      name: 'Test Vocabulary',
      description: 'Test vocabulary list',
      category: 'basic',
      difficulty_level: 1,
      total_words: 100,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as VocabularyList
  ]),

  getVocabularyItems: vi.fn().mockResolvedValue(generateTestVocabularyItems()),
  getAllVocabularyItems: vi.fn().mockResolvedValue(generateTestVocabularyItems()),
  createVocabularyList: vi.fn().mockResolvedValue({ id: 'new-list' }),
  addVocabularyItem: vi.fn().mockResolvedValue({ id: 'new-item' }),
  searchVocabulary: vi.fn().mockResolvedValue(generateTestVocabularyItems()),
  testConnection: vi.fn().mockResolvedValue(true),
  getVocabularyStats: vi.fn().mockResolvedValue({
    total_items: 100,
    by_difficulty: { '1': 30, '2': 40, '3': 30 },
    by_category: { 'greetings': 50, 'food': 50 },
    database_connected: true,
  } as VocabularyStats),
  
  getAvailableCategories: vi.fn().mockReturnValue(['greetings', 'food', 'travel', 'basic', 'test']),
  
  getDifficultyLevels: vi.fn().mockReturnValue([
    { value: 1, label: 'Beginner' },
    { value: 2, label: 'Intermediate' },
    { value: 3, label: 'Advanced' }
  ])
}

// Mock phrase extractor with proper typing
interface CategoryConfig {
  name: string;
  displayName: string;
  color: string;
  maxItems: number;
  priority: number;
}

interface CategoryInfo {
  name: string;
  displayName: string;
  priority: number;
}

interface ExtractedWords {
  nouns: string[];
  verbs: string[];
  adjectives: string[];
  adverbs: string[];
  keyPhrases: string[];
}

export const mockPhraseExtractor = {
  extractCategorizedPhrases: vi.fn().mockImplementation(async (
    request: { description: string; imageUrl: string }
  ) => {
    await new Promise(resolve => setTimeout(resolve, 100))
    return generateTestPhrases()
  }),

  getCategoryConfig: vi.fn().mockReturnValue({
    name: 'sustantivos',
    displayName: 'Sustantivos (Nouns)',
    color: 'bg-blue-100',
    maxItems: 8,
    priority: 1,
  } as CategoryConfig),

  getAllCategories: vi.fn().mockReturnValue([
    { name: 'sustantivos', displayName: 'Sustantivos', priority: 1 },
    { name: 'verbos', displayName: 'Verbos', priority: 2 },
  ] as CategoryInfo[]),

  extractWordsFromDescription: vi.fn().mockReturnValue({
    nouns: ['casa', 'gato'],
    verbs: ['caminar', 'comer'],
    adjectives: ['grande', 'bonito'],
    adverbs: ['rápidamente'],
    keyPhrases: ['¿Cómo estás?'],
  } as ExtractedWords),
}

// Mock Image Search API with proper typing
interface ImageSearchResult {
  id: string;
  url: string;
  thumbnailUrl: string;
  title: string;
  description: string;
  width: number;
  height: number;
  source: string;
}

interface SearchResponse {
  images: ImageSearchResult[];
  totalResults: number;
  page: number;
  totalPages: number;
}

export const mockImageSearch = {
  searchImages: vi.fn().mockResolvedValue({
    images: [
      {
        id: 'test-image-1',
        url: 'https://example.com/test1.jpg',
        thumbnailUrl: 'https://example.com/test1-thumb.jpg',
        title: 'Test Image 1',
        description: 'A test image',
        width: 800,
        height: 600,
        source: 'unsplash',
      } as ImageSearchResult
    ],
    totalResults: 1,
    page: 1,
    totalPages: 1,
  } as SearchResponse),
}

// Network delay simulation with proper typing
export function simulateNetworkDelay(min = 100, max = 500): Promise<void> {
  const delay = Math.random() * (max - min) + min
  return new Promise(resolve => setTimeout(resolve, delay))
}

// Error simulation with proper typing
export function simulateError(
  message = 'Test error',
  probability = 1
): void | never {
  if (Math.random() < probability) {
    throw new Error(message)
  }
}

// Mock fetch with different scenarios and proper typing
type FetchScenario = 'success' | 'error' | 'timeout' | 'network-error';

export function createMockFetch(scenario: FetchScenario = 'success') {
  return vi.fn().mockImplementation(async (
    url: string | URL | Request,
    options?: RequestInit
  ): Promise<Response> => {
    await simulateNetworkDelay(50, 150)

    switch (scenario) {
      case 'success':
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: 'mock data' }),
          text: async () => 'mock response',
          headers: new Headers(),
          statusText: 'OK',
          redirected: false,
          type: 'basic',
          url: typeof url === 'string' ? url : url.toString(),
          clone: () => createMockFetch(scenario)(),
          body: null,
          bodyUsed: false,
          arrayBuffer: async () => new ArrayBuffer(0),
          blob: async () => new Blob(),
          formData: async () => new FormData(),
        } as Response

      case 'error':
        return {
          ok: false,
          status: 500,
          json: async () => ({ error: 'Server error' }),
          text: async () => 'Error response',
          headers: new Headers(),
          statusText: 'Internal Server Error',
          redirected: false,
          type: 'basic',
          url: typeof url === 'string' ? url : url.toString(),
          clone: () => createMockFetch(scenario)(),
          body: null,
          bodyUsed: false,
          arrayBuffer: async () => new ArrayBuffer(0),
          blob: async () => new Blob(),
          formData: async () => new FormData(),
        } as Response

      case 'timeout':
        await new Promise(resolve => setTimeout(resolve, 10000))
        throw new Error('Request timeout')

      case 'network-error':
        throw new Error('Network error')

      default:
        throw new Error(`Unknown scenario: ${scenario}`)
    }
  })
}

// Type-safe API response creator
export function createTypedApiResponse<T>(
  data: T,
  success = true,
  message?: string
): APIResponse<T> {
  return {
    success,
    data: success ? data : undefined,
    message,
    error: success ? undefined : {
      code: 'TEST_ERROR',
      message: message || 'Test error occurred',
      details: {}
    },
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: `test-${Date.now()}`,
      version: '1.0.0'
    }
  }
}