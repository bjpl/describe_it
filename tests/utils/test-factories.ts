import { vi } from 'vitest';
import type { Image, Description, Phrase, Question, User, Session } from '@/types';

/**
 * Test data factories for creating mock objects
 * Following the Factory pattern for consistent test data generation
 */

// Base factory class for extensibility
class BaseFactory<T> {
  private defaultAttributes: Partial<T>;
  private sequence: number = 0;

  constructor(defaults: Partial<T>) {
    this.defaultAttributes = defaults;
  }

  create(overrides: Partial<T> = {}): T {
    this.sequence++;
    return {
      ...this.defaultAttributes,
      ...overrides,
    } as T;
  }

  createList(count: number, overrides: Partial<T> = {}): T[] {
    return Array.from({ length: count }, (_, i) => 
      this.create({ ...overrides, id: `${overrides.id || 'item'}-${i}` } as Partial<T>)
    );
  }

  buildTraits(traits: Record<string, Partial<T>>) {
    return {
      create: (traitName: string, overrides: Partial<T> = {}) => {
        const trait = traits[traitName] || {};
        return this.create({ ...trait, ...overrides });
      },
      createList: (count: number, traitName: string, overrides: Partial<T> = {}) => {
        const trait = traits[traitName] || {};
        return this.createList(count, { ...trait, ...overrides });
      },
    };
  }
}

// Image factory
export const imageFactory = new BaseFactory<Image>({
  id: 'test-image',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  width: 1920,
  height: 1080,
  color: '#c0392b',
  blur_hash: 'LGF5?xYk^6#M@-5c,1J5@[or[Q6.',
  description: 'A test image for Spanish learning',
  alt_description: 'Test image alt description',
  urls: {
    raw: 'https://images.unsplash.com/photo-test?raw',
    full: 'https://images.unsplash.com/photo-test?full',
    regular: 'https://images.unsplash.com/photo-test?regular',
    small: 'https://images.unsplash.com/photo-test?small',
    thumb: 'https://images.unsplash.com/photo-test?thumb',
    small_s3: 'https://images.unsplash.com/photo-test?small_s3',
  },
  links: {
    self: 'https://api.unsplash.com/photos/test-image',
    html: 'https://unsplash.com/photos/test-image',
    download: 'https://unsplash.com/photos/test-image/download',
    download_location: 'https://api.unsplash.com/photos/test-image/download',
  },
  user: {
    id: 'photographer-1',
    username: 'testphotographer',
    name: 'Test Photographer',
    first_name: 'Test',
    last_name: 'Photographer',
    instagram_username: 'testphoto',
    twitter_username: 'testphoto',
    portfolio_url: 'https://testphotographer.com',
    bio: 'Professional photographer specializing in Spanish culture',
    location: 'Madrid, Spain',
    total_likes: 1500,
    total_photos: 250,
    accepted_tos: true,
    profile_image: {
      small: 'https://images.unsplash.com/profile-small',
      medium: 'https://images.unsplash.com/profile-medium',
      large: 'https://images.unsplash.com/profile-large',
    },
    links: {
      self: 'https://api.unsplash.com/users/photographer-1',
      html: 'https://unsplash.com/@testphotographer',
      photos: 'https://api.unsplash.com/users/photographer-1/photos',
      likes: 'https://api.unsplash.com/users/photographer-1/likes',
      portfolio: 'https://api.unsplash.com/users/photographer-1/portfolio',
    },
  },
  tags: [
    { type: 'landing_page', title: 'spanish' },
    { type: 'search', title: 'cultura' },
  ],
  likes: 42,
  downloads: 128,
});

// Image traits for different scenarios
export const imageTraits = imageFactory.buildTraits({
  landscape: {
    width: 1920,
    height: 1080,
    description: 'Beautiful Spanish landscape',
    alt_description: 'Scenic view of Spanish countryside',
  },
  portrait: {
    width: 1080,
    height: 1920,
    description: 'Portrait of Spanish person',
    alt_description: 'Portrait photography in Spain',
  },
  food: {
    description: 'Traditional Spanish cuisine',
    alt_description: 'Delicious Spanish food',
    tags: [
      { type: 'search', title: 'comida' },
      { type: 'search', title: 'gastronomía' },
    ],
  },
  architecture: {
    description: 'Spanish architectural masterpiece',
    alt_description: 'Historic Spanish building',
    tags: [
      { type: 'search', title: 'arquitectura' },
      { type: 'search', title: 'historia' },
    ],
  },
  lowQuality: {
    width: 400,
    height: 300,
    description: null,
    alt_description: null,
  },
});

// Description factory
export const descriptionFactory = new BaseFactory<Description>({
  id: 'test-description',
  imageId: 'test-image',
  style: 'narrativo',
  content: 'Esta es una descripción narrativa que cuenta la historia detrás de la imagen con gran detalle y emoción.',
  createdAt: new Date('2024-01-01T12:00:00Z'),
  updatedAt: new Date('2024-01-01T12:00:00Z'),
  wordCount: 25,
  language: 'es',
  metadata: {
    generationTime: 1500,
    modelUsed: 'gpt-4',
    confidence: 0.95,
  },
});

export const descriptionTraits = descriptionFactory.buildTraits({
  technical: {
    style: 'técnico',
    content: 'Análisis técnico detallado de los elementos compositivos, iluminación, y aspectos fotográficos de la imagen.',
  },
  creative: {
    style: 'creativo',
    content: 'Interpretación artística y creativa que explora los elementos simbólicos y emocionales presentes en la imagen.',
  },
  educational: {
    style: 'educativo',
    content: 'Descripción educativa que explica conceptos culturales, históricos o científicos relacionados con la imagen.',
  },
  simple: {
    style: 'simple',
    content: 'Descripción básica y clara de lo que se observa en la imagen.',
    wordCount: 10,
  },
  complex: {
    content: 'Descripción extremadamente detallada que abarca múltiples aspectos técnicos, culturales, históricos y artísticos de la imagen, proporcionando un análisis exhaustivo que sirve como material educativo avanzado para el aprendizaje del español.',
    wordCount: 45,
  },
});

// Phrase factory
export const phraseFactory = new BaseFactory<Phrase>({
  id: 'test-phrase',
  text: 'una hermosa montaña',
  translation: 'a beautiful mountain',
  category: 'nouns',
  difficulty: 'intermediate',
  contextSentence: 'Podemos ver una hermosa montaña en el horizonte.',
  usage: 'Descripción de paisajes naturales',
  frequency: 'common',
  source: 'image-description',
  createdAt: new Date('2024-01-01T12:00:00Z'),
});

export const phraseTraits = phraseFactory.buildTraits({
  beginner: {
    difficulty: 'beginner',
    text: 'casa',
    translation: 'house',
    category: 'nouns',
    frequency: 'very-common',
  },
  advanced: {
    difficulty: 'advanced',
    text: 'perspectiva arquitectónica',
    translation: 'architectural perspective',
    category: 'phrases',
    frequency: 'rare',
  },
  verb: {
    category: 'verbs',
    text: 'contemplar',
    translation: 'to contemplate',
  },
  idiom: {
    category: 'idioms',
    text: 'estar en las nubes',
    translation: 'to have one\'s head in the clouds',
    usage: 'Expresión figurativa',
  },
});

// Question factory
export const questionFactory = new BaseFactory<Question>({
  id: 'test-question',
  question: '¿Qué elementos puedes observar en esta imagen?',
  answer: 'En esta imagen puedo observar varios elementos interesantes que incluyen...',
  difficulty: 'medio',
  category: 'descripción',
  imageId: 'test-image',
  points: 10,
  hints: [
    'Observa los colores predominantes',
    'Fíjate en la composición de la imagen',
  ],
  createdAt: new Date('2024-01-01T12:00:00Z'),
});

export const questionTraits = questionFactory.buildTraits({
  easy: {
    difficulty: 'fácil',
    question: '¿De qué color es el cielo?',
    answer: 'El cielo es azul.',
    points: 5,
    category: 'observación',
  },
  hard: {
    difficulty: 'difícil',
    question: '¿Qué elementos compositivos utiliza el fotógrafo para crear profundidad en esta imagen?',
    answer: 'El fotógrafo utiliza la perspectiva lineal, el contraste tonal y la superposición de planos para crear una sensación de profundidad tridimensional.',
    points: 20,
    category: 'análisis',
  },
  cultural: {
    category: 'cultura',
    question: '¿Qué aspectos culturales españoles puedes identificar en esta imagen?',
    answer: 'En esta imagen se pueden identificar elementos típicos de la cultura española como...',
    points: 15,
  },
  grammar: {
    category: 'gramática',
    question: 'Describe la imagen usando el pretérito perfecto.',
    answer: 'He visto una imagen que ha capturado...',
    points: 15,
  },
});

// User factory
export const userFactory = new BaseFactory<User>({
  id: 'test-user',
  email: 'test@example.com',
  name: 'Test User',
  avatar: 'https://example.com/avatar.jpg',
  level: 'intermediate',
  xp: 1500,
  streakDays: 7,
  preferences: {
    language: 'es',
    difficulty: 'intermediate',
    categories: ['descripción', 'cultura'],
    notifications: true,
  },
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T12:00:00Z'),
  lastActiveAt: new Date('2024-01-01T11:30:00Z'),
});

export const userTraits = userFactory.buildTraits({
  beginner: {
    level: 'beginner',
    xp: 100,
    streakDays: 1,
    preferences: {
      language: 'es',
      difficulty: 'beginner',
      categories: ['básico'],
      notifications: true,
    },
  },
  advanced: {
    level: 'advanced',
    xp: 5000,
    streakDays: 30,
    preferences: {
      language: 'es',
      difficulty: 'advanced',
      categories: ['análisis', 'cultura', 'gramática'],
      notifications: true,
    },
  },
  inactive: {
    streakDays: 0,
    lastActiveAt: new Date('2023-12-01T00:00:00Z'),
  },
});

// Session factory
export const sessionFactory = new BaseFactory<Session>({
  id: 'test-session',
  userId: 'test-user',
  type: 'description',
  startedAt: new Date('2024-01-01T12:00:00Z'),
  completedAt: new Date('2024-01-01T12:15:00Z'),
  duration: 900, // 15 minutes
  score: 85,
  correctAnswers: 8,
  totalQuestions: 10,
  xpEarned: 100,
  data: {
    imageId: 'test-image',
    questionsAnswered: ['q1', 'q2', 'q3'],
    phrasesLearned: ['phrase1', 'phrase2'],
  },
});

export const sessionTraits = sessionFactory.buildTraits({
  perfect: {
    score: 100,
    correctAnswers: 10,
    totalQuestions: 10,
    xpEarned: 150,
  },
  failed: {
    score: 30,
    correctAnswers: 3,
    totalQuestions: 10,
    xpEarned: 25,
  },
  long: {
    duration: 3600, // 1 hour
    completedAt: new Date('2024-01-01T13:00:00Z'),
  },
  incomplete: {
    completedAt: null,
    score: null,
    xpEarned: 0,
  },
});

// API Response factories
export const createSearchResponse = (query: string, total: number = 100, perPage: number = 20) => ({
  total,
  total_pages: Math.ceil(total / perPage),
  results: imageFactory.createList(Math.min(perPage, total), { 
    alt_description: `${query} related image`,
    description: `Beautiful ${query} photograph`,
  }),
});

export const createDescriptionResponse = (style: string = 'narrativo') => ({
  ...descriptionFactory.create({ style }),
  generatedAt: new Date().toISOString(),
  processingTime: Math.floor(Math.random() * 2000) + 500,
});

export const createPhrasesResponse = (count: number = 10) => ({
  phrases: phraseFactory.createList(count),
  totalExtracted: count,
  processingTime: Math.floor(Math.random() * 1000) + 200,
});

export const createQuestionsResponse = (count: number = 5) => ({
  questions: questionFactory.createList(count),
  totalGenerated: count,
  processingTime: Math.floor(Math.random() * 1500) + 300,
});

// Error factories
export const createApiError = (status: number, message: string, details?: any) => {
  const error = new Error(message) as any;
  error.status = status;
  error.details = details;
  return error;
};

export const createNetworkError = () => {
  const error = new Error('Network Error') as any;
  error.code = 'NETWORK_ERROR';
  return error;
};

export const createValidationError = (field: string, message: string) => {
  const error = new Error('Validation Error') as any;
  error.status = 400;
  error.details = [{ field, message }];
  return error;
};

// Mock function factories
export const createMockApiClient = (overrides: any = {}) => ({
  searchImages: vi.fn().mockResolvedValue(createSearchResponse('test')),
  generateDescription: vi.fn().mockResolvedValue(createDescriptionResponse()),
  extractPhrases: vi.fn().mockResolvedValue(createPhrasesResponse()),
  generateQuestions: vi.fn().mockResolvedValue(createQuestionsResponse()),
  ...overrides,
});

export const createMockStore = (initialState: any = {}) => {
  const store = {
    state: {
      currentImage: null,
      searchResults: [],
      descriptions: {},
      phrases: [],
      questions: [],
      user: null,
      session: null,
      ...initialState,
    },
    getState: vi.fn(() => store.state),
    setState: vi.fn((newState) => {
      store.state = { ...store.state, ...newState };
    }),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  };
  return store;
};

// Performance testing helpers
export const createLargeDataset = (size: number) => {
  return Array.from({ length: size }, (_, i) => ({
    id: `item-${i}`,
    data: `Item ${i} `.repeat(100), // Create larger payload
    nested: {
      level1: {
        level2: {
          level3: `Nested data ${i}`.repeat(50),
        },
      },
    },
  }));
};

export const createMemoryIntensiveObject = (size: number = 1000000) => {
  const obj: any = {};
  for (let i = 0; i < size; i++) {
    obj[`key${i}`] = `value${i}`.repeat(100);
  }
  return obj;
};

// Random generators for property-based testing
export const randomString = (length: number = 10) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const randomEmail = () => {
  return `${randomString(8)}@${randomString(5)}.com`;
};

export const randomSpanishPhrase = () => {
  const phrases = [
    'una casa blanca',
    'el gato negro',
    'la montaña alta',
    'un día soleado',
    'la comida deliciosa',
    'el mar azul',
    'una flor hermosa',
    'el cielo estrellado',
  ];
  return phrases[Math.floor(Math.random() * phrases.length)];
};

export const randomSearchTerm = () => {
  const terms = [
    'mountain', 'ocean', 'city', 'forest', 'desert', 'sunset', 'architecture',
    'food', 'people', 'culture', 'nature', 'art', 'travel', 'landscape',
  ];
  return terms[Math.floor(Math.random() * terms.length)];
};

// Export all factories for easy import
export const factories = {
  image: imageFactory,
  description: descriptionFactory,
  phrase: phraseFactory,
  question: questionFactory,
  user: userFactory,
  session: sessionFactory,
};

export const traits = {
  image: imageTraits,
  description: descriptionTraits,
  phrase: phraseTraits,
  question: questionTraits,
  user: userTraits,
  session: sessionTraits,
};
