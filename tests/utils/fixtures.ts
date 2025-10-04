/**
 * Test fixture data for consistent testing across all test types
 * Updated to match current type definitions and ensure type safety
 */

import type {
  DescriptionStyle,
  VocabularyItem,
  VocabularyItemUI,
  DifficultyLevel,
  APIResponse
} from '../../src/types'
import type {
  UnsplashImage,
  GeneratedDescription,
  QAGeneration,
  CategorizedPhrase,
  SavedPhrase
} from '../../src/types/api'
import type {
  UserProgress
} from '../../src/types/database'

// Base UnsplashImage mock data
export const MOCK_UNSPLASH_IMAGES: Record<string, UnsplashImage> = {
  SMALL: {
    id: 'mock-small-1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    width: 200,
    height: 150,
    color: '#2563eb',
    blur_hash: 'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.',
    description: 'A small test image for unit testing',
    alt_description: 'Small mock image with blue tones',
    urls: {
      raw: 'https://images.unsplash.com/photo-1234567890/raw?ixid=mock',
      full: 'https://images.unsplash.com/photo-1234567890/full?ixid=mock',
      regular: 'https://images.unsplash.com/photo-1234567890/regular?ixid=mock',
      small: 'https://images.unsplash.com/photo-1234567890/small?ixid=mock',
      thumb: 'https://images.unsplash.com/photo-1234567890/thumb?ixid=mock',
      small_s3: 'https://s3.us-west-2.amazonaws.com/images.unsplash.com/photo-1234567890/small'
    },
    links: {
      self: 'https://api.unsplash.com/photos/mock-small-1',
      html: 'https://unsplash.com/photos/mock-small-1',
      download: 'https://unsplash.com/photos/mock-small-1/download',
      download_location: 'https://api.unsplash.com/photos/mock-small-1/download'
    },
    user: {
      id: 'mock-user-1',
      username: 'mockuser',
      name: 'Mock User',
      first_name: 'Mock',
      last_name: 'User',
      instagram_username: 'mockuser',
      twitter_username: 'mockuser',
      portfolio_url: 'https://mockuser.example.com',
      bio: 'Mock photographer for testing',
      location: 'Test City, Testing',
      total_likes: 100,
      total_photos: 50,
      accepted_tos: true,
      profile_image: {
        small: 'https://images.unsplash.com/profile-1234567890-small.jpg',
        medium: 'https://images.unsplash.com/profile-1234567890-medium.jpg',
        large: 'https://images.unsplash.com/profile-1234567890-large.jpg'
      },
      links: {
        self: 'https://api.unsplash.com/users/mockuser',
        html: 'https://unsplash.com/@mockuser',
        photos: 'https://api.unsplash.com/users/mockuser/photos',
        likes: 'https://api.unsplash.com/users/mockuser/likes',
        portfolio: 'https://api.unsplash.com/users/mockuser/portfolio'
      }
    },
    tags: [
      { type: 'landing_page', title: 'test' },
      { type: 'search', title: 'mock' }
    ]
  },
  MEDIUM: {
    id: 'mock-medium-1',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    width: 800,
    height: 600,
    color: '#16a34a',
    blur_hash: 'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.',
    description: 'A medium-sized test image for integration testing',
    alt_description: 'Medium mock image with green tones',
    urls: {
      raw: 'https://images.unsplash.com/photo-0987654321/raw?ixid=mock',
      full: 'https://images.unsplash.com/photo-0987654321/full?ixid=mock',
      regular: 'https://images.unsplash.com/photo-0987654321/regular?ixid=mock',
      small: 'https://images.unsplash.com/photo-0987654321/small?ixid=mock',
      thumb: 'https://images.unsplash.com/photo-0987654321/thumb?ixid=mock',
      small_s3: 'https://s3.us-west-2.amazonaws.com/images.unsplash.com/photo-0987654321/small'
    },
    links: {
      self: 'https://api.unsplash.com/photos/mock-medium-1',
      html: 'https://unsplash.com/photos/mock-medium-1',
      download: 'https://unsplash.com/photos/mock-medium-1/download',
      download_location: 'https://api.unsplash.com/photos/mock-medium-1/download'
    },
    user: {
      id: 'mock-user-2',
      username: 'testphotographer',
      name: 'Test Photographer',
      first_name: 'Test',
      last_name: 'Photographer',
      instagram_username: null,
      twitter_username: 'testphoto',
      portfolio_url: null,
      bio: null,
      location: 'Test Valley, CA',
      total_likes: 250,
      total_photos: 120,
      accepted_tos: true,
      profile_image: {
        small: 'https://images.unsplash.com/profile-0987654321-small.jpg',
        medium: 'https://images.unsplash.com/profile-0987654321-medium.jpg',
        large: 'https://images.unsplash.com/profile-0987654321-large.jpg'
      },
      links: {
        self: 'https://api.unsplash.com/users/testphotographer',
        html: 'https://unsplash.com/@testphotographer',
        photos: 'https://api.unsplash.com/users/testphotographer/photos',
        likes: 'https://api.unsplash.com/users/testphotographer/likes',
        portfolio: 'https://api.unsplash.com/users/testphotographer/portfolio'
      }
    }
  },
  LARGE: {
    id: 'mock-large-1',
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-03T00:00:00Z',
    width: 1920,
    height: 1080,
    color: '#dc2626',
    blur_hash: 'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.',
    description: null,
    alt_description: 'Large mock image for performance testing',
    urls: {
      raw: 'https://images.unsplash.com/photo-1357902468/raw?ixid=mock',
      full: 'https://images.unsplash.com/photo-1357902468/full?ixid=mock',
      regular: 'https://images.unsplash.com/photo-1357902468/regular?ixid=mock',
      small: 'https://images.unsplash.com/photo-1357902468/small?ixid=mock',
      thumb: 'https://images.unsplash.com/photo-1357902468/thumb?ixid=mock',
      small_s3: 'https://s3.us-west-2.amazonaws.com/images.unsplash.com/photo-1357902468/small'
    },
    links: {
      self: 'https://api.unsplash.com/photos/mock-large-1',
      html: 'https://unsplash.com/photos/mock-large-1',
      download: 'https://unsplash.com/photos/mock-large-1/download',
      download_location: 'https://api.unsplash.com/photos/mock-large-1/download'
    },
    user: {
      id: 'mock-user-3',
      username: 'perfphotographer',
      name: 'Performance Tester',
      first_name: 'Performance',
      last_name: 'Tester',
      instagram_username: null,
      twitter_username: null,
      portfolio_url: 'https://perftest.photography',
      bio: 'Large format photography for performance testing',
      location: null,
      total_likes: 1000,
      total_photos: 25,
      accepted_tos: true,
      profile_image: {
        small: 'https://images.unsplash.com/profile-1357902468-small.jpg',
        medium: 'https://images.unsplash.com/profile-1357902468-medium.jpg',
        large: 'https://images.unsplash.com/profile-1357902468-large.jpg'
      },
      links: {
        self: 'https://api.unsplash.com/users/perfphotographer',
        html: 'https://unsplash.com/@perfphotographer',
        photos: 'https://api.unsplash.com/users/perfphotographer/photos',
        likes: 'https://api.unsplash.com/users/perfphotographer/likes',
        portfolio: 'https://api.unsplash.com/users/perfphotographer/portfolio'
      }
    },
    tags: [
      { type: 'landing_page', title: 'performance' },
      { type: 'search', title: 'large' },
      { type: 'search', title: 'testing' }
    ]
  }
}

// GeneratedDescription mock data
export const MOCK_GENERATED_DESCRIPTIONS: Record<DescriptionStyle, GeneratedDescription[]> = {
  narrativo: [
    {
      style: 'narrativo',
      text: 'Una casa pequeña con ventanas azules descansa tranquila bajo el sol de la mañana.',
      language: 'es',
      wordCount: 15,
      generatedAt: '2024-01-01T12:00:00Z'
    },
    {
      style: 'narrativo',
      text: 'A small house with blue windows rests peacefully under the morning sun.',
      language: 'en',
      wordCount: 13,
      generatedAt: '2024-01-01T12:00:00Z'
    }
  ],
  poetico: [
    {
      style: 'poetico',
      text: 'Azul celeste en cristales que danzan, hogar que en silencio descansa.',
      language: 'es',
      wordCount: 12,
      generatedAt: '2024-01-01T12:00:00Z'
    },
    {
      style: 'poetico',
      text: 'Blue sky in dancing crystals, home that rests in silence.',
      language: 'en',
      wordCount: 10,
      generatedAt: '2024-01-01T12:00:00Z'
    }
  ],
  academico: [
    {
      style: 'academico',
      text: 'La estructura arquitectónica presenta características vernáculas típicas de la región, con elementos decorativos que reflejan la influencia cultural local.',
      language: 'es',
      wordCount: 22,
      generatedAt: '2024-01-01T12:00:00Z'
    },
    {
      style: 'academico',
      text: 'The architectural structure presents typical vernacular characteristics of the region, with decorative elements that reflect local cultural influence.',
      language: 'en',
      wordCount: 20,
      generatedAt: '2024-01-01T12:00:00Z'
    }
  ],
  conversacional: [
    {
      style: 'conversacional',
      text: '¿Ves esa casa? Mira qué ventanas tan bonitas tiene, son de un azul precioso.',
      language: 'es',
      wordCount: 16,
      generatedAt: '2024-01-01T12:00:00Z'
    },
    {
      style: 'conversacional',
      text: 'Do you see that house? Look at those beautiful windows, they are such a lovely blue.',
      language: 'en',
      wordCount: 16,
      generatedAt: '2024-01-01T12:00:00Z'
    }
  ],
  infantil: [
    {
      style: 'infantil',
      text: '¡Mira la casita! Tiene ventanitas azules como el cielo. ¡Qué bonita!',
      language: 'es',
      wordCount: 12,
      generatedAt: '2024-01-01T12:00:00Z'
    },
    {
      style: 'infantil',
      text: 'Look at the little house! It has little blue windows like the sky. So pretty!',
      language: 'en',
      wordCount: 15,
      generatedAt: '2024-01-01T12:00:00Z'
    }
  ]
}

// VocabularyItem mock data (database format)
export const MOCK_VOCABULARY_ITEMS: Record<string, VocabularyItem[]> = {
  BEGINNER: [
    {
      id: 'vocab-1',
      spanish_text: 'casa',
      english_translation: 'house',
      category: 'home',
      difficulty_level: 1,
      part_of_speech: 'noun',
      frequency_score: 100,
      context_sentence_spanish: 'Mi casa es grande.',
      context_sentence_english: 'My house is big.',
      phonetic_pronunciation: 'KAH-sah',
      audio_url: 'https://example.com/audio/casa.mp3',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      user_notes: 'Basic vocabulary word for home',
      mastery_level: 75,
      last_reviewed: '2024-01-01T00:00:00Z',
      review_count: 5
    },
    {
      id: 'vocab-2',
      spanish_text: 'gato',
      english_translation: 'cat',
      category: 'animals',
      difficulty_level: 1,
      part_of_speech: 'noun',
      frequency_score: 85,
      context_sentence_spanish: 'El gato es negro.',
      context_sentence_english: 'The cat is black.',
      phonetic_pronunciation: 'GAH-toh',
      audio_url: 'https://example.com/audio/gato.mp3',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      user_notes: 'Common pet animal',
      mastery_level: 50,
      last_reviewed: '2024-01-01T00:00:00Z',
      review_count: 3
    },
    {
      id: 'vocab-3',
      spanish_text: 'azul',
      english_translation: 'blue',
      category: 'colors',
      difficulty_level: 2,
      part_of_speech: 'adjective',
      frequency_score: 90,
      context_sentence_spanish: 'El cielo es azul.',
      context_sentence_english: 'The sky is blue.',
      phonetic_pronunciation: 'ah-SOOL',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      mastery_level: 90,
      last_reviewed: '2024-01-01T00:00:00Z',
      review_count: 8
    }
  ],
  INTERMEDIATE: [
    {
      id: 'vocab-4',
      spanish_text: 'biblioteca',
      english_translation: 'library',
      category: 'places',
      difficulty_level: 5,
      part_of_speech: 'noun',
      frequency_score: 70,
      context_sentence_spanish: 'Estudio en la biblioteca.',
      context_sentence_english: 'I study in the library.',
      phonetic_pronunciation: 'bee-blee-oh-TEH-kah',
      audio_url: 'https://example.com/audio/biblioteca.mp3',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      user_notes: 'Public place for studying',
      mastery_level: 60,
      last_reviewed: '2024-01-01T00:00:00Z',
      review_count: 4
    },
    {
      id: 'vocab-5',
      spanish_text: 'desarrollar',
      english_translation: 'to develop',
      category: 'verbs',
      difficulty_level: 4,
      part_of_speech: 'verb',
      frequency_score: 65,
      context_sentence_spanish: 'Necesito desarrollar mis habilidades.',
      context_sentence_english: 'I need to develop my skills.',
      phonetic_pronunciation: 'des-ah-roh-YAHR',
      audio_url: 'https://example.com/audio/desarrollar.mp3',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      user_notes: 'Important action verb',
      mastery_level: 40,
      last_reviewed: '2024-01-01T00:00:00Z',
      review_count: 2
    }
  ],
  ADVANCED: [
    {
      id: 'vocab-6',
      spanish_text: 'paradigma',
      english_translation: 'paradigm',
      category: 'abstract',
      difficulty_level: 8,
      part_of_speech: 'noun',
      frequency_score: 40,
      context_sentence_spanish: 'Este enfoque representa un nuevo paradigma.',
      context_sentence_english: 'This approach represents a new paradigm.',
      phonetic_pronunciation: 'pah-rah-DEEG-mah',
      audio_url: 'https://example.com/audio/paradigma.mp3',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      user_notes: 'Complex abstract concept',
      mastery_level: 20,
      last_reviewed: '2024-01-01T00:00:00Z',
      review_count: 1
    }
  ]
}

// QAGeneration mock data
export const MOCK_QA_GENERATIONS: Record<string, QAGeneration[]> = {
  BASIC: [
    {
      question: '¿De qué color es la casa?',
      answer: 'La casa es blanca.',
      difficulty: 'facil',
      category: 'descripcion'
    },
    {
      question: '¿Cuántas ventanas tiene?',
      answer: 'Tiene tres ventanas.',
      difficulty: 'facil',
      category: 'conteo'
    },
    {
      question: '¿Dónde está ubicada la puerta?',
      answer: 'La puerta está en el centro de la casa.',
      difficulty: 'facil',
      category: 'ubicacion'
    }
  ],
  INTERMEDIATE: [
    {
      question: '¿Qué estilo arquitectónico representa la construcción?',
      answer: 'La construcción presenta un estilo contemporáneo con elementos tradicionales.',
      difficulty: 'medio',
      category: 'arquitectura'
    },
    {
      question: '¿Cuáles son las características principales del jardín?',
      answer: 'El jardín tiene flores coloridas, senderos de piedra y áreas verdes bien cuidadas.',
      difficulty: 'medio',
      category: 'paisajismo'
    }
  ],
  ADVANCED: [
    {
      question: '¿Qué elementos arquitectónicos revelan la influencia cultural de la región?',
      answer: 'Se observan elementos neoclásicos con influencias modernistas que reflejan la evolución cultural local.',
      difficulty: 'dificil',
      category: 'analisis_cultural'
    },
    {
      question: '¿Cómo se integra la estructura con el entorno natural circundante?',
      answer: 'La estructura se integra armoniosamente mediante la utilización de materiales locales y el respeto por la topografía natural.',
      difficulty: 'dificil',
      category: 'integracion_ambiental'
    }
  ]
}

// CategorizedPhrase mock data
export const MOCK_CATEGORIZED_PHRASES: Record<string, CategorizedPhrase[]> = {
  SUSTANTIVOS: [
    {
      id: 'phrase-1',
      phrase: 'casa',
      definition: 'house, home',
      category: 'sustantivos',
      partOfSpeech: 'sustantivo',
      difficulty: 'beginner',
      context: 'En la imagen se ve una casa.',
      sortKey: 'casa',
      saved: false,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      gender: 'femenino',
      article: 'la'
    },
    {
      id: 'phrase-2',
      phrase: 'jardín',
      definition: 'garden',
      category: 'sustantivos',
      partOfSpeech: 'sustantivo',
      difficulty: 'beginner',
      context: 'El jardín tiene flores coloridas.',
      sortKey: 'jardin',
      saved: false,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      gender: 'masculino',
      article: 'el'
    },
    {
      id: 'phrase-3',
      phrase: 'ventana',
      definition: 'window',
      category: 'sustantivos',
      partOfSpeech: 'sustantivo',
      difficulty: 'beginner',
      context: 'La ventana es grande y luminosa.',
      sortKey: 'ventana',
      saved: true,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      gender: 'femenino',
      article: 'la'
    }
  ],
  VERBOS: [
    {
      id: 'phrase-4',
      phrase: 'caminar',
      definition: 'to walk',
      category: 'verbos',
      partOfSpeech: 'verbo',
      difficulty: 'beginner',
      context: 'Me gusta caminar por el parque.',
      sortKey: 'caminar',
      saved: false,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      conjugation: 'caminar'
    },
    {
      id: 'phrase-5',
      phrase: 'observar',
      definition: 'to observe, to watch',
      category: 'verbos',
      partOfSpeech: 'verbo',
      difficulty: 'intermediate',
      context: 'Podemos observar los detalles de la arquitectura.',
      sortKey: 'observar',
      saved: true,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      conjugation: 'observar'
    }
  ],
  ADJETIVOS: [
    {
      id: 'phrase-6',
      phrase: 'hermoso',
      definition: 'beautiful',
      category: 'adjetivos',
      partOfSpeech: 'adjetivo',
      difficulty: 'beginner',
      context: 'Es un lugar hermoso para vivir.',
      sortKey: 'hermoso',
      saved: false,
      createdAt: new Date('2024-01-01T00:00:00Z')
    },
    {
      id: 'phrase-7',
      phrase: 'moderno',
      definition: 'modern',
      category: 'adjetivos',
      partOfSpeech: 'adjetivo',
      difficulty: 'intermediate',
      context: 'El diseño moderno se combina con elementos tradicionales.',
      sortKey: 'moderno',
      saved: true,
      createdAt: new Date('2024-01-01T00:00:00Z')
    }
  ]
}

// SavedPhrase mock data
export const MOCK_SAVED_PHRASES: SavedPhrase[] = [
  {
    id: 'saved-phrase-1',
    phrase: 'ventana',
    definition: 'window',
    category: 'sustantivos',
    partOfSpeech: 'sustantivo',
    difficulty: 'beginner',
    context: 'La ventana es grande y luminosa.',
    sortKey: 'ventana',
    saved: true,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    savedAt: new Date('2024-01-01T00:00:00Z'),
    translation: 'window',
    gender: 'femenino',
    article: 'la',
    studyProgress: {
      correctAnswers: 8,
      totalAttempts: 10,
      lastReviewed: new Date('2024-01-05T00:00:00Z'),
      nextReview: new Date('2024-01-08T00:00:00Z')
    }
  },
  {
    id: 'saved-phrase-2',
    phrase: 'observar',
    definition: 'to observe, to watch',
    category: 'verbos',
    partOfSpeech: 'verbo',
    difficulty: 'intermediate',
    context: 'Podemos observar los detalles de la arquitectura.',
    sortKey: 'observar',
    saved: true,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    savedAt: new Date('2024-01-02T00:00:00Z'),
    translation: 'to observe, to watch',
    conjugation: 'observar',
    studyProgress: {
      correctAnswers: 5,
      totalAttempts: 8,
      lastReviewed: new Date('2024-01-04T00:00:00Z'),
      nextReview: new Date('2024-01-07T00:00:00Z')
    }
  }
]

// API Response mock data with proper typing
export const MOCK_API_RESPONSES = {
  SUCCESS: {
    success: true,
    data: {},
    message: 'Operation completed successfully',
    metadata: {
      timestamp: '2024-01-01T12:00:00Z',
      requestId: 'req-mock-12345',
      version: '1.0.0'
    }
  } as APIResponse<Record<string, unknown>>,
  ERROR: {
    success: false,
    message: 'Operation failed',
    error: {
      code: 'TEST_ERROR',
      message: 'Test error message',
      details: {
        field: 'testField',
        reason: 'validation_failed'
      }
    },
    metadata: {
      timestamp: '2024-01-01T12:00:00Z',
      requestId: 'req-mock-error-123',
      version: '1.0.0'
    }
  } as APIResponse<never>,
  RATE_LIMITED: {
    success: false,
    message: 'Rate limit exceeded',
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
      details: {
        limit: 100,
        remaining: 0,
        resetTime: '2024-01-01T13:00:00Z'
      }
    },
    metadata: {
      timestamp: '2024-01-01T12:00:00Z',
      requestId: 'req-mock-rate-limit-456',
      version: '1.0.0'
    }
  } as APIResponse<never>
}

// UserProgress mock data
export const MOCK_USER_PROGRESS: UserProgress[] = [
  {
    id: 'progress-1',
    user_id: 'user-123',
    vocabulary_item_id: 'vocab-1',
    mastery_level: 75,
    times_reviewed: 5,
    times_correct: 4,
    last_reviewed: '2024-01-05T10:00:00Z',
    next_review_date: '2024-01-08T10:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-05T10:00:00Z'
  },
  {
    id: 'progress-2',
    user_id: 'user-123',
    vocabulary_item_id: 'vocab-2',
    mastery_level: 50,
    times_reviewed: 3,
    times_correct: 2,
    last_reviewed: '2024-01-04T14:30:00Z',
    next_review_date: '2024-01-06T14:30:00Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-04T14:30:00Z'
  },
  {
    id: 'progress-3',
    user_id: 'user-123',
    vocabulary_item_id: 'vocab-3',
    mastery_level: 90,
    times_reviewed: 8,
    times_correct: 7,
    last_reviewed: '2024-01-06T09:15:00Z',
    next_review_date: '2024-01-10T09:15:00Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-06T09:15:00Z'
  }
]

// User interaction mock data with proper typing
export const MOCK_USER_INTERACTIONS = {
  FILE_UPLOAD: {
    valid: {
      name: 'test-image.jpg',
      type: 'image/jpeg' as const,
      size: 150000,
      lastModified: Date.now(),
    },
    invalid: {
      name: 'test-file.txt',
      type: 'text/plain' as const,
      size: 1000,
      lastModified: Date.now(),
    },
    tooLarge: {
      name: 'large-image.jpg',
      type: 'image/jpeg' as const,
      size: 10000000, // 10MB
      lastModified: Date.now(),
    },
  },
  FORM_DATA: {
    valid: {
      style: 'narrativo' as DescriptionStyle,
      language: 'es' as const,
      maxLength: 300,
    },
    invalid: {
      style: 'invalid-style' as any,
      language: 'fr' as any,
      maxLength: -1,
    },
  },
} as const

export const PERFORMANCE_BENCHMARKS = {
  API_RESPONSE_TIMES: {
    FAST: 500,      // < 500ms is fast
    ACCEPTABLE: 2000, // < 2000ms is acceptable
    SLOW: 5000,     // > 5000ms is slow
  },
  FILE_PROCESSING: {
    SMALL_IMAGE: 1000,  // < 1s for small images
    LARGE_IMAGE: 5000,  // < 5s for large images
  },
  UI_INTERACTIONS: {
    CLICK_RESPONSE: 100,    // < 100ms for clicks
    FORM_VALIDATION: 200,   // < 200ms for validation
    MODAL_ANIMATION: 300,   // < 300ms for animations
  },
}

// Error scenarios for testing
export const ERROR_SCENARIOS = {
  NETWORK_ERROR: new Error('Network request failed'),
  TIMEOUT_ERROR: new Error('Request timeout'),
  SERVER_ERROR: new Error('Internal server error'),
  VALIDATION_ERROR: new Error('Validation failed'),
  RATE_LIMIT_ERROR: new Error('Rate limit exceeded'),
  AUTHENTICATION_ERROR: new Error('Authentication failed'),
  PERMISSION_ERROR: new Error('Insufficient permissions'),
  NOT_FOUND_ERROR: new Error('Resource not found'),
  INVALID_DATA_ERROR: new Error('Invalid data format'),
  QUOTA_EXCEEDED_ERROR: new Error('API quota exceeded')
} as const

// Type-safe error factory
export function createMockError(
  type: keyof typeof ERROR_SCENARIOS,
  customMessage?: string
): Error {
  const baseError = ERROR_SCENARIOS[type]
  return new Error(customMessage || baseError.message)
}

// ==============================================
// TYPED MOCK FACTORY FUNCTIONS
// ==============================================

// Helper functions for creating test data with proper typing
export function createMockFile(options: Partial<File> = {}): File {
  const defaults = MOCK_USER_INTERACTIONS.FILE_UPLOAD.valid
  return new File(['test content'], options.name || defaults.name, {
    type: options.type || defaults.type,
    lastModified: options.lastModified || defaults.lastModified,
  })
}

export function createMockUnsplashImage(size: keyof typeof MOCK_UNSPLASH_IMAGES = 'MEDIUM'): UnsplashImage {
  return { ...MOCK_UNSPLASH_IMAGES[size] }
}

export function createMockGeneratedDescription(style: DescriptionStyle = 'narrativo', language = 'es'): GeneratedDescription {
  const descriptions = MOCK_GENERATED_DESCRIPTIONS[style]
  const description = descriptions.find(d => d.language === language) || descriptions[0]
  return { ...description }
}

export function createMockVocabularyItem(
  level: keyof typeof MOCK_VOCABULARY_ITEMS = 'BEGINNER',
  index = 0
): VocabularyItem {
  const items = MOCK_VOCABULARY_ITEMS[level]
  const baseItem = items[index % items.length]
  return {
    ...baseItem,
    id: `${baseItem.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}

export function createMockVocabularyItemUI(
  level: keyof typeof MOCK_VOCABULARY_ITEMS = 'BEGINNER',
  index = 0
): VocabularyItemUI {
  const item = createMockVocabularyItem(level, index)
  const difficultyMap: Record<number, DifficultyLevel> = {
    1: 'beginner', 2: 'beginner', 3: 'beginner',
    4: 'intermediate', 5: 'intermediate', 6: 'intermediate', 7: 'intermediate',
    8: 'advanced', 9: 'advanced', 10: 'advanced'
  }
  
  return {
    ...item,
    difficulty_level: difficultyMap[item.difficulty_level] || 'beginner'
  }
}

export function createMockQAGeneration(
  level: keyof typeof MOCK_QA_GENERATIONS = 'BASIC',
  index = 0
): QAGeneration {
  const generations = MOCK_QA_GENERATIONS[level]
  const baseGeneration = generations[index % generations.length]
  return { ...baseGeneration }
}

export function createMockCategorizedPhrase(
  category: keyof typeof MOCK_CATEGORIZED_PHRASES = 'SUSTANTIVOS',
  index = 0
): CategorizedPhrase {
  const phrases = MOCK_CATEGORIZED_PHRASES[category]
  const basePhrase = phrases[index % phrases.length]
  return {
    ...basePhrase,
    id: `${basePhrase.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date()
  }
}

export function createMockSavedPhrase(index = 0): SavedPhrase {
  const basePhrases = MOCK_SAVED_PHRASES
  const basePhrase = basePhrases[index % basePhrases.length]
  return {
    ...basePhrase,
    id: `${basePhrase.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date(),
    savedAt: new Date(),
    studyProgress: {
      ...basePhrase.studyProgress,
      lastReviewed: new Date(),
      nextReview: new Date(Date.now() + 24 * 60 * 60 * 1000) // tomorrow
    }
  }
}

export function createMockUserProgress(
  vocabularyItemId: string = 'vocab-1',
  userId: string = 'user-123'
): UserProgress {
  const baseProgress = MOCK_USER_PROGRESS[0]
  return {
    ...baseProgress,
    id: `progress-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    user_id: userId,
    vocabulary_item_id: vocabularyItemId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_reviewed: new Date().toISOString(),
    next_review_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  }
}

export function createMockApiResponse<T = Record<string, unknown>>(
  type: keyof typeof MOCK_API_RESPONSES = 'SUCCESS',
  data?: T
): APIResponse<T> {
  const response = { ...MOCK_API_RESPONSES[type] } as APIResponse<T>
  if (data && response.success) {
    response.data = data
  }
  return response
}

// ==============================================
// BULK DATA GENERATORS FOR LOAD TESTING
// ==============================================

export function generateBulkVocabulary(
  count: number,
  level: keyof typeof MOCK_VOCABULARY_ITEMS = 'BEGINNER'
): VocabularyItem[] {
  return Array.from({ length: count }, (_, index) => createMockVocabularyItem(level, index))
}

export function generateBulkVocabularyUI(
  count: number,
  level: keyof typeof MOCK_VOCABULARY_ITEMS = 'BEGINNER'
): VocabularyItemUI[] {
  return Array.from({ length: count }, (_, index) => createMockVocabularyItemUI(level, index))
}

export function generateBulkQAGenerations(
  count: number,
  level: keyof typeof MOCK_QA_GENERATIONS = 'BASIC'
): QAGeneration[] {
  return Array.from({ length: count }, (_, index) => createMockQAGeneration(level, index))
}

export function generateBulkCategorizedPhrases(
  count: number,
  category: keyof typeof MOCK_CATEGORIZED_PHRASES = 'SUSTANTIVOS'
): CategorizedPhrase[] {
  return Array.from({ length: count }, (_, index) => createMockCategorizedPhrase(category, index))
}

export function generateBulkSavedPhrases(count: number): SavedPhrase[] {
  return Array.from({ length: count }, (_, index) => createMockSavedPhrase(index))
}

export function generateBulkUserProgress(
  count: number,
  userId: string = 'user-123'
): UserProgress[] {
  return Array.from({ length: count }, (_, index) => 
    createMockUserProgress(`vocab-${index}`, userId)
  )
}

export function generateBulkUnsplashImages(count: number): UnsplashImage[] {
  const sizes = ['SMALL', 'MEDIUM', 'LARGE'] as const
  return Array.from({ length: count }, (_, index) => {
    const size = sizes[index % sizes.length]
    const baseImage = createMockUnsplashImage(size)
    return {
      ...baseImage,
      id: `bulk-image-${index}-${Date.now()}`,
      created_at: new Date(Date.now() - index * 1000).toISOString()
    }
  })
}

// Utility functions
export function simulateApiDelay(minMs: number = 100, maxMs: number = 500): Promise<void> {
  const delay = Math.random() * (maxMs - minMs) + minMs
  return new Promise(resolve => setTimeout(resolve, delay))
}

export function simulateNetworkError(probability: number = 0.1): void {
  if (Math.random() < probability) {
    throw new Error('Simulated network error')
  }
}

export function createMockFormData(fields: Record<string, string | File>): FormData {
  const formData = new FormData()
  Object.entries(fields).forEach(([key, value]) => {
    formData.append(key, value)
  })
  return formData
}