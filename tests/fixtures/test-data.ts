/**
 * Test Fixtures and Sample Data
 * Provides consistent test data for various testing scenarios
 */

// Image URLs for testing
export const testImageUrls = {
  validJpeg: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
  validPng: 'https://example.com/test-image.png',
  validWebp: 'https://example.com/test-image.webp',
  invalidUrl: 'not-a-valid-url',
  notAnImage: 'https://example.com/document.pdf',
  nonExistent: 'https://example.com/non-existent-image.jpg',
  veryLargeImage: 'https://example.com/very-large-image.jpg', // Simulates >10MB file
  corsBlocked: 'https://cors-blocked-domain.com/image.jpg',
  base64Image: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8A0XYBhQTjvsFN4Goi/9k='
};

// Sample API responses
export const sampleResponses = {
  description: {
    success: {
      description: 'A stunning mountain landscape at sunset with vibrant orange and pink clouds reflecting off pristine lakes below. The scene captures the serene beauty of nature with snow-capped peaks rising majestically against the colorful sky.',
      confidence: 0.95,
      tags: ['mountain', 'sunset', 'landscape', 'nature', 'lake', 'clouds']
    },
    simple: {
      description: 'A mountain with a lake.',
      confidence: 0.72,
      tags: ['mountain', 'lake']
    },
    complex: {
      description: 'An intricate architectural marvel showcasing Gothic Revival elements with ornate stone carvings, flying buttresses, and elaborate rose windows that filter ethereal light through stained glass panels, creating a kaleidoscope of colors on the ancient stone floors below.',
      confidence: 0.88,
      tags: ['architecture', 'gothic', 'cathedral', 'stained glass', 'historical', 'ornate']
    }
  },

  vocabulary: {
    basic: [
      {
        word: 'mountain',
        definition: 'a large natural elevation of the earth\'s surface rising abruptly from the surrounding level',
        partOfSpeech: 'noun',
        difficulty: 'basic',
        examples: [
          'The mountain peak was covered in snow.',
          'We hiked up the mountain trail.'
        ],
        synonyms: ['peak', 'summit', 'hill'],
        etymology: 'From Old French "montaigne", from Latin "montanus" meaning "of a mountain"'
      },
      {
        word: 'sunset',
        definition: 'the daily disappearance of the sun below the horizon',
        partOfSpeech: 'noun',
        difficulty: 'basic',
        examples: [
          'We watched the beautiful sunset from the beach.',
          'The sunset painted the sky in brilliant colors.'
        ],
        synonyms: ['dusk', 'twilight', 'evening'],
        etymology: 'From Middle English, literally "sun" + "set"'
      }
    ],
    
    intermediate: [
      {
        word: 'serene',
        definition: 'calm, peaceful, and untroubled; tranquil',
        partOfSpeech: 'adjective',
        difficulty: 'intermediate',
        examples: [
          'The lake was serene in the morning mist.',
          'She maintained a serene expression despite the chaos.'
        ],
        synonyms: ['tranquil', 'peaceful', 'calm', 'placid'],
        antonyms: ['turbulent', 'chaotic', 'agitated'],
        etymology: 'From Latin "serenus" meaning "clear, unclouded"'
      },
      {
        word: 'majestic',
        definition: 'having or showing impressive beauty or dignity',
        partOfSpeech: 'adjective',
        difficulty: 'intermediate',
        examples: [
          'The majestic mountains dominated the horizon.',
          'The cathedral\'s majestic spires reached toward the sky.'
        ],
        synonyms: ['grand', 'magnificent', 'stately', 'noble'],
        etymology: 'From Latin "majestas" meaning "greatness, dignity"'
      }
    ],

    advanced: [
      {
        word: 'ethereal',
        definition: 'extremely delicate and light in a way that seems not of this world',
        partOfSpeech: 'adjective',
        difficulty: 'advanced',
        examples: [
          'The ethereal light filtered through the stained glass.',
          'Her ethereal beauty was almost otherworldly.'
        ],
        synonyms: ['celestial', 'otherworldly', 'sublime', 'transcendent'],
        antonyms: ['earthly', 'mundane', 'material'],
        etymology: 'From Latin "aethereus", from Greek "aitherios" meaning "of the upper air"'
      },
      {
        word: 'kaleidoscope',
        definition: 'a constantly changing pattern or sequence of elements',
        partOfSpeech: 'noun',
        difficulty: 'advanced',
        examples: [
          'The windows created a kaleidoscope of colors on the floor.',
          'The city offered a kaleidoscope of cultural experiences.'
        ],
        synonyms: ['spectrum', 'array', 'medley', 'mosaic'],
        etymology: 'From Greek "kalos" (beautiful) + "eidos" (form) + "scope" (to see)'
      }
    ]
  },

  questions: {
    easy: [
      {
        question: 'What time of day is shown in this image?',
        answer: 'Sunset',
        difficulty: 'easy',
        category: 'observation',
        explanation: 'The warm colors and low position of the sun indicate it is sunset time.'
      },
      {
        question: 'What color is the sky?',
        answer: 'Orange and pink',
        difficulty: 'easy',
        category: 'observation',
        explanation: 'The sky displays typical sunset colors of orange and pink hues.'
      }
    ],

    medium: [
      {
        question: 'What type of landscape feature dominates the background?',
        answer: 'Mountains',
        difficulty: 'medium',
        category: 'analysis',
        explanation: 'Snow-capped mountain peaks are the primary geological feature visible in the background.'
      },
      {
        question: 'How does the lighting affect the overall mood of the scene?',
        answer: 'Creates a serene and peaceful atmosphere',
        difficulty: 'medium',
        category: 'interpretation',
        explanation: 'The soft, warm lighting from the sunset creates a tranquil and calming mood.'
      }
    ],

    hard: [
      {
        question: 'What photographic techniques might have been used to capture this scene?',
        answer: 'Long exposure, wide-angle lens, and careful timing during golden hour',
        difficulty: 'hard',
        category: 'technical',
        explanation: 'The smooth water suggests long exposure, the expansive view indicates a wide-angle lens, and the lighting shows it was taken during the optimal golden hour.'
      },
      {
        question: 'How do the compositional elements work together to create visual balance?',
        answer: 'The mountains provide vertical elements balanced by the horizontal lake, with the sky serving as negative space',
        difficulty: 'hard',
        category: 'composition',
        explanation: 'The rule of thirds is applied with mountains in the upper third, lake in the lower third, and the colorful sky creating visual interest in the middle third.'
      }
    ]
  }
};

// User interaction scenarios
export const userScenarios = {
  beginner: {
    profile: {
      level: 'beginner',
      preferences: {
        vocabularyDifficulty: 'basic',
        questionDifficulty: 'easy',
        descriptionLength: 'short'
      },
      history: []
    },
    expectedBehavior: {
      vocabularyCount: 3,
      questionCount: 2,
      descriptionLength: 'under_100_words'
    }
  },

  intermediate: {
    profile: {
      level: 'intermediate',
      preferences: {
        vocabularyDifficulty: 'intermediate',
        questionDifficulty: 'medium',
        descriptionLength: 'medium'
      },
      history: [
        { type: 'vocabulary', word: 'mountain', mastered: true },
        { type: 'question', question: 'What time of day?', correct: true }
      ]
    },
    expectedBehavior: {
      vocabularyCount: 5,
      questionCount: 3,
      descriptionLength: 'under_200_words'
    }
  },

  advanced: {
    profile: {
      level: 'advanced',
      preferences: {
        vocabularyDifficulty: 'advanced',
        questionDifficulty: 'hard',
        descriptionLength: 'detailed'
      },
      history: [
        { type: 'vocabulary', word: 'ethereal', mastered: false },
        { type: 'question', question: 'What compositional techniques?', correct: false }
      ]
    },
    expectedBehavior: {
      vocabularyCount: 8,
      questionCount: 5,
      descriptionLength: 'over_200_words'
    }
  }
};

// Error scenarios
export const errorScenarios = {
  networkError: {
    type: 'network',
    message: 'Failed to connect to the server',
    code: 'NETWORK_ERROR',
    recoverable: true
  },
  rateLimitError: {
    type: 'rate_limit',
    message: 'API rate limit exceeded. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
    recoverable: true,
    retryAfter: 60000 // 1 minute
  },
  invalidApiKey: {
    type: 'authentication',
    message: 'Invalid API key provided',
    code: 'INVALID_API_KEY',
    recoverable: false
  },
  imageProcessingError: {
    type: 'processing',
    message: 'Unable to process the provided image',
    code: 'IMAGE_PROCESSING_ERROR',
    recoverable: false
  },
  serverError: {
    type: 'server',
    message: 'Internal server error occurred',
    code: 'INTERNAL_SERVER_ERROR',
    recoverable: true
  }
};

// Performance test data
export const performanceTestData = {
  smallImage: {
    url: testImageUrls.validJpeg,
    expectedProcessingTime: 2000, // 2 seconds
    size: '50KB'
  },
  mediumImage: {
    url: 'https://example.com/medium-image.jpg',
    expectedProcessingTime: 5000, // 5 seconds
    size: '500KB'
  },
  largeImage: {
    url: 'https://example.com/large-image.jpg',
    expectedProcessingTime: 10000, // 10 seconds
    size: '5MB'
  },
  batchProcessing: {
    imageCount: 10,
    expectedTotalTime: 15000, // 15 seconds for batch
    expectedAverageTime: 1500 // 1.5 seconds per image
  }
};

// Security test data
export const securityTestData = {
  maliciousInputs: [
    '<script>alert("xss")</script>',
    '"; DROP TABLE users; --',
    '../../etc/passwd',
    'javascript:alert("xss")',
    '<img src="x" onerror="alert(1)">',
    '${7*7}', // Template injection
    '#{7*7}', // Expression injection
    'file:///etc/passwd',
    'data:text/html,<script>alert(1)</script>'
  ],
  validationTestCases: [
    {
      input: 'normal text description',
      shouldPass: true
    },
    {
      input: 'text with émojis 🌅 and spëcial chars',
      shouldPass: true
    },
    {
      input: 'very long text '.repeat(1000),
      shouldPass: false,
      reason: 'exceeds_length_limit'
    },
    {
      input: '',
      shouldPass: false,
      reason: 'empty_input'
    }
  ],
  apiKeyTestCases: [
    {
      key: 'sk-valid1234567890abcdefghijklmnop',
      shouldPass: true
    },
    {
      key: 'invalid-api-key',
      shouldPass: false,
      reason: 'invalid_format'
    },
    {
      key: '',
      shouldPass: false,
      reason: 'empty_key'
    },
    {
      key: null,
      shouldPass: false,
      reason: 'null_key'
    }
  ]
};

// Component test props
export const componentTestProps = {
  imageSearch: {
    validProps: {
      onImageSelect: vi.fn(),
      onError: vi.fn(),
      placeholder: 'Search for images...',
      maxResults: 20
    },
    invalidProps: {
      onImageSelect: null,
      maxResults: -1
    }
  },
  
  vocabularyPanel: {
    validProps: {
      vocabulary: sampleResponses.vocabulary.basic,
      onWordSelect: vi.fn(),
      difficulty: 'basic'
    },
    emptyProps: {
      vocabulary: [],
      onWordSelect: vi.fn(),
      difficulty: 'basic'
    }
  },

  qaPanel: {
    validProps: {
      questions: sampleResponses.questions.easy,
      onAnswerSubmit: vi.fn(),
      showAnswers: false
    },
    emptyProps: {
      questions: [],
      onAnswerSubmit: vi.fn(),
      showAnswers: false
    }
  }
};

// Export default collection
export default {
  testImageUrls,
  sampleResponses,
  userScenarios,
  errorScenarios,
  performanceTestData,
  securityTestData,
  componentTestProps
};