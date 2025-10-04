/**
 * Test Data Generator
 * Utilities for generating realistic test data
 */

import type {
  VocabularyItem,
  QAPair,
  LearningSession,
  UserProfile,
  ImageSearchResult
} from '@/types/unified';

/**
 * Generate mock user data
 */
export function generateMockUser(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: `user-${Math.random().toString(36).substr(2, 9)}`,
    email: `test${Date.now()}@example.com`,
    name: 'Test User',
    created_at: new Date().toISOString(),
    preferences: {
      language: 'es',
      theme: 'light',
      notifications: true
    },
    ...overrides
  };
}

/**
 * Generate mock vocabulary items
 */
export function generateMockVocabulary(count: number = 10): VocabularyItem[] {
  const words = [
    { word: 'manzana', translation: 'apple', partOfSpeech: 'noun' as const },
    { word: 'correr', translation: 'to run', partOfSpeech: 'verb' as const },
    { word: 'rojo', translation: 'red', partOfSpeech: 'adjective' as const },
    { word: 'rápidamente', translation: 'quickly', partOfSpeech: 'adverb' as const },
    { word: 'casa', translation: 'house', partOfSpeech: 'noun' as const },
    { word: 'grande', translation: 'big', partOfSpeech: 'adjective' as const },
    { word: 'perro', translation: 'dog', partOfSpeech: 'noun' as const },
    { word: 'bonito', translation: 'beautiful', partOfSpeech: 'adjective' as const },
    { word: 'caminar', translation: 'to walk', partOfSpeech: 'verb' as const },
    { word: 'libro', translation: 'book', partOfSpeech: 'noun' as const }
  ];

  return Array.from({ length: count }, (_, i) => ({
    id: `vocab-${i}`,
    ...words[i % words.length],
    language: 'es' as const,
    difficulty: (['beginner', 'intermediate', 'advanced'][i % 3]) as any,
    category: 'general',
    examples: [`Ejemplo ${i + 1}`],
    created_at: new Date().toISOString(),
    learned: i % 3 === 0,
    review_count: Math.floor(Math.random() * 10)
  }));
}

/**
 * Generate mock Q&A pairs
 */
export function generateMockQA(count: number = 5): QAPair[] {
  const templates = [
    { q: '¿Qué es esto?', a: 'Es una manzana' },
    { q: '¿De qué color es?', a: 'Es rojo' },
    { q: '¿Dónde está?', a: 'Está en la mesa' },
    { q: '¿Cuántos hay?', a: 'Hay tres' },
    { q: '¿Quién es?', a: 'Es mi amigo' }
  ];

  return Array.from({ length: count }, (_, i) => ({
    id: `qa-${i}`,
    question: templates[i % templates.length].q,
    answer: templates[i % templates.length].a,
    difficulty: (['beginner', 'intermediate', 'advanced'][i % 3]) as any,
    type: 'multiple_choice' as const,
    options: ['Opción A', 'Opción B', 'Opción C', 'Opción D'],
    correctAnswer: 'Opción A',
    created_at: new Date().toISOString()
  }));
}

/**
 * Generate mock learning session
 */
export function generateMockSession(
  userId: string,
  overrides: Partial<LearningSession> = {}
): LearningSession {
  return {
    id: `session-${Math.random().toString(36).substr(2, 9)}`,
    user_id: userId,
    session_type: 'flashcard',
    started_at: new Date().toISOString(),
    ended_at: null,
    items_total: 20,
    items_completed: 10,
    correct_answers: 7,
    incorrect_answers: 3,
    progress: 0.5,
    duration_minutes: 15,
    ...overrides
  };
}

/**
 * Generate mock image search results
 */
export function generateMockImages(count: number = 10): ImageSearchResult[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `image-${i}`,
    url: `https://images.unsplash.com/photo-${i}?w=400&h=300`,
    thumbnailUrl: `https://images.unsplash.com/photo-${i}?w=200&h=150`,
    description: `Sample image ${i + 1}`,
    photographer: `Photographer ${i + 1}`,
    source: 'unsplash',
    width: 400,
    height: 300,
    created_at: new Date().toISOString()
  }));
}

/**
 * Generate mock description
 */
export function generateMockDescription(language: 'en' | 'es' = 'es') {
  const descriptions = {
    es: 'Una hermosa manzana roja sobre una mesa de madera. La fruta brilla bajo la luz natural.',
    en: 'A beautiful red apple on a wooden table. The fruit shines under natural light.'
  };

  return {
    id: `desc-${Math.random().toString(36).substr(2, 9)}`,
    text: descriptions[language],
    language,
    style: 'descriptive' as const,
    created_at: new Date().toISOString()
  };
}

/**
 * Generate realistic API error responses
 */
export function generateMockError(type: 'validation' | 'auth' | 'server' | 'network') {
  const errors = {
    validation: {
      status: 400,
      error: 'Validation Error',
      message: 'Invalid input parameters',
      details: { field: 'email', message: 'Email is required' }
    },
    auth: {
      status: 401,
      error: 'Unauthorized',
      message: 'Authentication required',
      details: null
    },
    server: {
      status: 500,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
      details: null
    },
    network: {
      status: 503,
      error: 'Service Unavailable',
      message: 'External service temporarily unavailable',
      details: { service: 'OpenAI API' }
    }
  };

  return errors[type];
}

/**
 * Generate realistic success responses
 */
export function generateMockSuccess<T>(data: T) {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    requestId: `req-${Math.random().toString(36).substr(2, 9)}`
  };
}

/**
 * Delay utility for testing async operations
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate random string for testing
 */
export function randomString(length: number = 10): string {
  return Math.random().toString(36).substring(2, 2 + length);
}

/**
 * Generate random number in range
 */
export function randomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Create mock Supabase response
 */
export function mockSupabaseResponse<T>(data: T, error: any = null) {
  return {
    data: error ? null : data,
    error: error ? { message: error, code: 'MOCK_ERROR' } : null
  };
}

/**
 * Create mock OpenAI response
 */
export function mockOpenAIResponse(content: string) {
  return {
    id: `chatcmpl-${randomString()}`,
    object: 'chat.completion',
    created: Date.now(),
    model: 'gpt-4',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content
        },
        finish_reason: 'stop'
      }
    ],
    usage: {
      prompt_tokens: 50,
      completion_tokens: 100,
      total_tokens: 150
    }
  };
}

/**
 * Batch test data generator
 */
export function generateTestBatch(config: {
  users?: number;
  vocabulary?: number;
  sessions?: number;
  qa?: number;
  images?: number;
}) {
  const users = config.users ? Array.from({ length: config.users }, () => generateMockUser()) : [];
  const vocabulary = config.vocabulary ? generateMockVocabulary(config.vocabulary) : [];
  const sessions = config.sessions && users[0]
    ? Array.from({ length: config.sessions }, () => generateMockSession(users[0].id))
    : [];
  const qa = config.qa ? generateMockQA(config.qa) : [];
  const images = config.images ? generateMockImages(config.images) : [];

  return {
    users,
    vocabulary,
    sessions,
    qa,
    images
  };
}
