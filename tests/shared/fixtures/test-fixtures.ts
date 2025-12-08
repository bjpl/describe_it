/**
 * Centralized Test Fixture Management
 * Provides reusable test data fixtures
 */

import type { User } from '../builders/UserBuilder';
import type { VocabularyItem } from '../builders/VocabularyBuilder';

/**
 * User Fixtures
 */
export const userFixtures = {
  beginner: {
    email: 'beginner@test.com',
    username: 'beginner-user',
    spanish_level: 'beginner' as const,
    is_authenticated: true,
    profile_completed: true,
  },
  intermediate: {
    email: 'intermediate@test.com',
    username: 'intermediate-user',
    spanish_level: 'intermediate' as const,
    is_authenticated: true,
    profile_completed: true,
  },
  advanced: {
    email: 'advanced@test.com',
    username: 'advanced-user',
    spanish_level: 'advanced' as const,
    is_authenticated: true,
    profile_completed: true,
  },
  unauthenticated: {
    email: 'unauth@test.com',
    username: 'unauth-user',
    spanish_level: 'beginner' as const,
    is_authenticated: false,
    profile_completed: false,
  },
};

/**
 * Vocabulary Fixtures
 */
export const vocabularyFixtures = {
  spanishBeginner: [
    {
      word: 'casa',
      translation: 'house',
      language: 'es' as const,
      difficulty: 'beginner' as const,
      part_of_speech: 'noun',
      example_sentence: 'Mi casa es grande.',
      definition: 'A building for human habitation',
    },
    {
      word: 'perro',
      translation: 'dog',
      language: 'es' as const,
      difficulty: 'beginner' as const,
      part_of_speech: 'noun',
      example_sentence: 'El perro es mi amigo.',
      definition: 'A domesticated carnivorous mammal',
    },
    {
      word: 'gato',
      translation: 'cat',
      language: 'es' as const,
      difficulty: 'beginner' as const,
      part_of_speech: 'noun',
      example_sentence: 'El gato duerme.',
      definition: 'A small domesticated carnivorous mammal',
    },
  ],
  spanishIntermediate: [
    {
      word: 'desarrollo',
      translation: 'development',
      language: 'es' as const,
      difficulty: 'intermediate' as const,
      part_of_speech: 'noun',
      example_sentence: 'El desarrollo de software es importante.',
      definition: 'The process of developing or being developed',
    },
    {
      word: 'comunicación',
      translation: 'communication',
      language: 'es' as const,
      difficulty: 'intermediate' as const,
      part_of_speech: 'noun',
      example_sentence: 'La comunicación es esencial.',
      definition: 'The imparting or exchanging of information',
    },
  ],
  spanishAdvanced: [
    {
      word: 'perspicaz',
      translation: 'perceptive',
      language: 'es' as const,
      difficulty: 'advanced' as const,
      part_of_speech: 'adjective',
      example_sentence: 'Es una persona muy perspicaz.',
      definition: 'Having or showing sensitive insight',
    },
    {
      word: 'inmiscuirse',
      translation: 'to interfere',
      language: 'es' as const,
      difficulty: 'advanced' as const,
      part_of_speech: 'verb',
      example_sentence: 'No debes inmiscuirte en sus asuntos.',
      definition: 'To intervene in a situation without invitation',
    },
  ],
};

/**
 * API Response Fixtures
 */
export const apiResponseFixtures = {
  success: {
    success: true,
    data: {},
    timestamp: new Date().toISOString(),
  },
  error: {
    success: false,
    error: 'An error occurred',
    message: 'Detailed error message',
    timestamp: new Date().toISOString(),
  },
  validationError: {
    success: false,
    error: 'Validation failed',
    errors: [
      {
        field: 'email',
        message: 'Invalid email format',
        code: 'INVALID_EMAIL',
      },
    ],
    timestamp: new Date().toISOString(),
  },
};

/**
 * Auth Fixtures
 */
export const authFixtures = {
  validCredentials: {
    email: 'valid@test.com',
    password: 'ValidPassword123!',
  },
  invalidCredentials: {
    email: 'invalid@test.com',
    password: 'WrongPassword',
  },
  validToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  expiredToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiZXhwIjoxNTE2MjM5MDIyfQ.4Adcj0vW9fEQhVYlIQKLXzCVLUIEBHLrQbBjXDfSGQg',
};

/**
 * Image Search Fixtures
 */
export const imageFixtures = {
  validImageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
  searchResults: {
    results: [
      {
        id: 'test-image-1',
        urls: {
          regular: 'https://images.unsplash.com/photo-1',
          small: 'https://images.unsplash.com/photo-1?w=400',
          thumb: 'https://images.unsplash.com/photo-1?w=200',
        },
        alt_description: 'Mountain landscape',
        user: {
          name: 'Test Photographer',
          username: 'testphoto',
        },
      },
    ],
    total: 100,
    total_pages: 10,
  },
};

/**
 * Description Generation Fixtures
 */
export const descriptionFixtures = {
  simple: {
    description: 'A beautiful mountain landscape with a clear blue sky.',
    style: 'simple',
    language: 'en',
    difficulty: 'beginner',
  },
  detailed: {
    description:
      'A majestic mountain range rises against a vibrant sunset sky, with snow-capped peaks reflecting golden light. In the foreground, a serene alpine lake mirrors the spectacular scene, creating a perfect symmetry that enhances the natural beauty.',
    style: 'detailed',
    language: 'en',
    difficulty: 'advanced',
  },
  spanish: {
    description: 'Un hermoso paisaje montañoso con un cielo azul claro.',
    style: 'simple',
    language: 'es',
    difficulty: 'beginner',
  },
};

/**
 * Q&A Fixtures
 */
export const qaFixtures = {
  beginner: [
    {
      id: 'q1',
      question: 'What is in the image?',
      answer: 'Mountains and a lake',
      difficulty: 'beginner' as const,
      type: 'open' as const,
    },
    {
      id: 'q2',
      question: 'What color is the sky?',
      answer: 'Blue',
      difficulty: 'beginner' as const,
      type: 'open' as const,
    },
  ],
  intermediate: [
    {
      id: 'q3',
      question: 'What time of day does this appear to be?',
      answer: 'Sunset or sunrise',
      difficulty: 'intermediate' as const,
      type: 'open' as const,
      explanation: 'The warm golden light suggests either sunrise or sunset.',
    },
  ],
  advanced: [
    {
      id: 'q4',
      question: 'What photographic technique creates the symmetry in this image?',
      answer: 'Reflection in the lake',
      difficulty: 'advanced' as const,
      type: 'open' as const,
      explanation:
        'The lake acts as a natural mirror, creating a reflection of the mountains.',
    },
  ],
};

/**
 * Health Check Fixtures
 */
export const healthFixtures = {
  healthy: {
    success: true,
    data: {
      status: 'healthy' as const,
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: 3600,
      checks: {
        database: { status: 'ok' as const, latency: 5 },
        cache: { status: 'ok' as const, latency: 2 },
        ai: { status: 'ok' as const, latency: 100 },
      },
    },
    timestamp: new Date().toISOString(),
  },
  degraded: {
    success: true,
    data: {
      status: 'degraded' as const,
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: 3600,
      checks: {
        database: { status: 'ok' as const, latency: 5 },
        cache: { status: 'error' as const },
        ai: { status: 'ok' as const, latency: 100 },
      },
    },
    timestamp: new Date().toISOString(),
  },
};

/**
 * Export all fixtures
 */
export const fixtures = {
  users: userFixtures,
  vocabulary: vocabularyFixtures,
  apiResponses: apiResponseFixtures,
  auth: authFixtures,
  images: imageFixtures,
  descriptions: descriptionFixtures,
  qa: qaFixtures,
  health: healthFixtures,
};

export default fixtures;
