import { describe, it, expect, vi, beforeEach } from 'vitest'

// Create proper mock query builder
const createMockQueryBuilder = () => {
  const mockBuilder: any = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    or: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    single: vi.fn(),
    then: vi.fn(),
  }

  // Make all methods chainable
  Object.keys(mockBuilder).forEach(key => {
    if (key !== 'then' && key !== 'single') {
      mockBuilder[key].mockReturnValue(mockBuilder)
    }
  })

  return mockBuilder
}

let mockQueryBuilder: any
const mockSupabase: any = {
  from: vi.fn()
}

// Mock Supabase service
vi.mock('@/lib/api/supabase', () => ({
  supabaseService: {
    getClient: vi.fn().mockReturnValue(mockSupabase),
    isDemoMode: vi.fn().mockReturnValue(false)
  },
}))

import { VocabularyService } from '@/lib/services/vocabularyService'

describe('VocabularyService', () => {
  let service: VocabularyService

  beforeEach(() => {
    vi.clearAllMocks()
    mockQueryBuilder = createMockQueryBuilder()
    mockSupabase.from.mockReturnValue(mockQueryBuilder)
    service = new VocabularyService()
  })

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const defaultService = new VocabularyService()
      expect(defaultService).toBeDefined()
    })
  })

  describe('getVocabularyLists', () => {
    it('should return vocabulary lists from sample data', async () => {
      mockQueryBuilder.then.mockResolvedValueOnce({
        data: [{
          id: '1',
          name: 'Test List',
          description: 'Test description',
          is_public: true,
          created_by: 'user-1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }],
        error: null,
      })

      const lists = await service.getVocabularyLists()

      expect(lists.length).toBeGreaterThan(0)
      expect(lists[0]).toHaveProperty('id')
      expect(lists[0]).toHaveProperty('name')
      expect(lists[0]).toHaveProperty('description')
    })
  })

  describe('getAllVocabulary', () => {
    it('should return vocabulary items', async () => {
      mockQueryBuilder.then.mockResolvedValueOnce({
        data: [{
          id: '1',
          spanish_text: 'hola',
          english_translation: 'hello',
          category: 'greetings',
          difficulty_level: 1,
          part_of_speech: 'interjection',
          frequency_score: 100,
          created_at: new Date().toISOString(),
        }],
        error: null,
      })

      const items = await service.getAllVocabulary()

      expect(Array.isArray(items)).toBe(true)
      if (items.length > 0) {
        expect(items[0]).toHaveProperty('spanish_text')
        expect(items[0]).toHaveProperty('english_translation')
      }
    })
  })

  describe('createVocabularyList', () => {
    it('should create a vocabulary list', async () => {
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: {
          id: 'list-1',
          name: 'Advanced Spanish',
          description: 'Advanced vocabulary',
          is_public: false,
          created_by: 'user-1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      })

      const newList = {
        name: 'Advanced Spanish',
        description: 'Advanced vocabulary',
        is_public: false,
        created_by: 'user-1',
      }

      const result = await service.createVocabularyList(newList)

      expect(result).toHaveProperty('id')
      expect(result).toHaveProperty('name', 'Advanced Spanish')
    })
  })

  describe('addVocabulary', () => {
    it('should add a vocabulary item', async () => {
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: {
          id: 'vocab-1',
          spanish_text: 'gracias',
          english_translation: 'thank you',
          category: 'greetings',
          difficulty_level: 1,
          part_of_speech: 'interjection' as const,
          frequency_score: 90,
          created_at: new Date().toISOString(),
        },
        error: null,
      })

      const newItem = {
        spanish_text: 'gracias',
        english_translation: 'thank you',
        category: 'greetings',
        difficulty_level: 1,
        part_of_speech: 'interjection' as const,
        frequency_score: 90,
      }

      const result = await service.addVocabulary(newItem)

      expect(result).toHaveProperty('id')
      expect(result).toHaveProperty('spanish_text', 'gracias')
    })
  })

  describe('searchVocabulary', () => {
    it('should search vocabulary items by Spanish text', async () => {
      mockQueryBuilder.then.mockResolvedValueOnce({
        data: [{
          id: '1',
          spanish_text: 'casa',
          english_translation: 'house',
          category: 'home',
          difficulty_level: 1,
          part_of_speech: 'noun',
          frequency_score: 95,
          created_at: new Date().toISOString(),
        }],
        error: null,
      })

      const results = await service.searchVocabulary('casa')

      expect(Array.isArray(results)).toBe(true)
      expect(results.length).toBeGreaterThan(0)
    })

    it('should search vocabulary items by English translation', async () => {
      mockQueryBuilder.then.mockResolvedValueOnce({
        data: [{
          id: '1',
          spanish_text: 'casa',
          english_translation: 'house',
          category: 'home',
          difficulty_level: 1,
          part_of_speech: 'noun',
          frequency_score: 95,
          created_at: new Date().toISOString(),
        }],
        error: null,
      })

      const results = await service.searchVocabulary('house')

      expect(Array.isArray(results)).toBe(true)
      expect(results.length).toBeGreaterThan(0)
    })
  })

  describe('testConnection', () => {
    it('should test database connection', async () => {
      mockQueryBuilder.then.mockResolvedValueOnce({
        data: [{ id: '1' }],
        error: null,
      })

      const isConnected = await service.testConnection()

      expect(typeof isConnected).toBe('boolean')
    })
  })

  describe('getVocabularyStats', () => {
    it('should return vocabulary statistics', async () => {
      mockQueryBuilder.then.mockResolvedValueOnce({
        data: [
          {
            id: '1',
            category: 'greetings',
            difficulty_level: 1,
            part_of_speech: 'noun',
          },
          {
            id: '2',
            category: 'food',
            difficulty_level: 2,
            part_of_speech: 'verb',
          },
        ],
        error: null,
      })

      const stats = await service.getVocabularyStats()

      expect(stats).toHaveProperty('total_words')
      expect(stats).toHaveProperty('by_category')
      expect(stats).toHaveProperty('by_difficulty')
    })
  })

  describe('utility methods', () => {
    it('should work with basic service methods', () => {
      expect(service).toBeDefined()
      expect(typeof service.getAllVocabulary).toBe('function')
      expect(typeof service.searchVocabulary).toBe('function')
    })
  })

  describe('performance', () => {
    it('should handle concurrent requests efficiently', async () => {
      mockQueryBuilder.then.mockResolvedValue({
        data: [{
          id: '1',
          name: 'Test List',
          description: 'Test',
          is_public: true,
          created_by: 'user-1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }],
        error: null,
      })

      const promises = Array(10).fill(null).map(() =>
        service.getVocabularyLists()
      )

      const start = performance.now()
      const results = await Promise.all(promises)
      const duration = performance.now() - start

      expect(results).toHaveLength(10)
      expect(duration).toBeLessThan(1000)
    })

    it('should handle sample data efficiently', async () => {
      mockQueryBuilder.then.mockResolvedValueOnce({
        data: [{
          id: '1',
          spanish_text: 'hola',
          english_translation: 'hello',
          category: 'greetings',
          difficulty_level: 1,
          part_of_speech: 'interjection',
          frequency_score: 100,
          created_at: new Date().toISOString(),
        }],
        error: null,
      })

      const start = performance.now()
      const items = await service.getAllVocabulary()
      const duration = performance.now() - start

      expect(Array.isArray(items)).toBe(true)
      expect(duration).toBeLessThan(100)
    })
  })
})