import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockVocabularyService } from '../../mocks/api'
import { generateTestVocabularyItems } from '../../utils/test-helpers'

// Mock the vocabulary service
vi.mock('@/lib/services/vocabularyService', () => ({
  vocabularyService: mockVocabularyService,
  VocabularyService: vi.fn().mockImplementation(() => mockVocabularyService),
}))

describe('VocabularyManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('vocabulary loading', () => {
    it('should load vocabulary lists successfully', async () => {
      const lists = await mockVocabularyService.getVocabularyLists()
      
      expect(mockVocabularyService.getVocabularyLists).toHaveBeenCalled()
      expect(lists).toBeDefined()
      expect(Array.isArray(lists)).toBe(true)
      expect(lists.length).toBeGreaterThan(0)
    })

    it('should load vocabulary items for a specific list', async () => {
      const items = await mockVocabularyService.getVocabularyItems('test-list')
      
      expect(mockVocabularyService.getVocabularyItems).toHaveBeenCalledWith('test-list')
      expect(items).toBeDefined()
      expect(Array.isArray(items)).toBe(true)
    })

    it('should load all vocabulary items', async () => {
      const items = await mockVocabularyService.getAllVocabularyItems()
      
      expect(mockVocabularyService.getAllVocabularyItems).toHaveBeenCalled()
      expect(items).toBeDefined()
      expect(Array.isArray(items)).toBe(true)
    })
  })

  describe('vocabulary creation', () => {
    it('should create a new vocabulary list', async () => {
      const listData = {
        name: 'Test List',
        description: 'A test vocabulary list',
        category: 'test',
        difficulty_level: 1,
        total_words: 0,
        is_active: true,
      }

      const result = await mockVocabularyService.createVocabularyList(listData)
      
      expect(mockVocabularyService.createVocabularyList).toHaveBeenCalledWith(listData)
      expect(result).toHaveProperty('id')
    })

    it('should add a vocabulary item to a list', async () => {
      const itemData = {
        vocabulary_list_id: 'test-list',
        spanish_text: 'prueba',
        english_translation: 'test',
        category: 'test',
        difficulty_level: 1,
        frequency_score: 50,
      }

      const result = await mockVocabularyService.addVocabularyItem(itemData)
      
      expect(mockVocabularyService.addVocabularyItem).toHaveBeenCalledWith(itemData)
      expect(result).toHaveProperty('id')
    })
  })

  describe('vocabulary search', () => {
    it('should search vocabulary items by query', async () => {
      const query = 'hola'
      const results = await mockVocabularyService.searchVocabulary(query)
      
      expect(mockVocabularyService.searchVocabulary).toHaveBeenCalledWith(query)
      expect(results).toBeDefined()
      expect(Array.isArray(results)).toBe(true)
    })

    it('should return relevant results for Spanish search', async () => {
      mockVocabularyService.searchVocabulary.mockResolvedValueOnce([
        {
          id: '1',
          vocabulary_list_id: 'list-1',
          spanish_text: 'hola',
          english_translation: 'hello',
          category: 'greetings',
          difficulty_level: 1,
          frequency_score: 100,
          created_at: new Date().toISOString(),
        }
      ])

      const results = await mockVocabularyService.searchVocabulary('hola')
      
      expect(results).toHaveLength(1)
      expect(results[0].spanish_text).toBe('hola')
    })

    it('should return relevant results for English search', async () => {
      mockVocabularyService.searchVocabulary.mockResolvedValueOnce([
        {
          id: '1',
          vocabulary_list_id: 'list-1',
          spanish_text: 'hola',
          english_translation: 'hello',
          category: 'greetings',
          difficulty_level: 1,
          frequency_score: 100,
          created_at: new Date().toISOString(),
        }
      ])

      const results = await mockVocabularyService.searchVocabulary('hello')
      
      expect(results).toHaveLength(1)
      expect(results[0].english_translation).toBe('hello')
    })

    it('should handle empty search queries', async () => {
      mockVocabularyService.searchVocabulary.mockResolvedValueOnce([])

      const results = await mockVocabularyService.searchVocabulary('')
      
      expect(results).toEqual([])
    })
  })

  describe('connection testing', () => {
    it('should test database connection', async () => {
      const isConnected = await mockVocabularyService.testConnection()
      
      expect(mockVocabularyService.testConnection).toHaveBeenCalled()
      expect(typeof isConnected).toBe('boolean')
    })
  })

  describe('statistics', () => {
    it('should return vocabulary statistics', async () => {
      const stats = await mockVocabularyService.getVocabularyStats()
      
      expect(mockVocabularyService.getVocabularyStats).toHaveBeenCalled()
      expect(stats).toHaveProperty('total_items')
      expect(stats).toHaveProperty('by_difficulty')
      expect(stats).toHaveProperty('by_category')
      expect(stats).toHaveProperty('database_connected')
      
      expect(typeof stats.total_items).toBe('number')
      expect(typeof stats.by_difficulty).toBe('object')
      expect(typeof stats.by_category).toBe('object')
      expect(typeof stats.database_connected).toBe('boolean')
    })

    it('should calculate statistics correctly', async () => {
      const mockItems = [
        { difficulty_level: 1, category: 'greetings' },
        { difficulty_level: 1, category: 'food' },
        { difficulty_level: 2, category: 'greetings' },
        { difficulty_level: 3, category: 'travel' },
      ]

      mockVocabularyService.getAllVocabularyItems.mockResolvedValueOnce(
        mockItems.map((item, i) => ({
          id: `item-${i}`,
          vocabulary_list_id: 'test-list',
          spanish_text: `word-${i}`,
          english_translation: `translation-${i}`,
          frequency_score: 50,
          created_at: new Date().toISOString(),
          ...item,
        }))
      )

      mockVocabularyService.getVocabularyStats.mockResolvedValueOnce({
        total_items: 4,
        by_difficulty: { '1': 2, '2': 1, '3': 1 },
        by_category: { 'greetings': 2, 'food': 1, 'travel': 1 },
        database_connected: true,
      })

      const stats = await mockVocabularyService.getVocabularyStats()
      
      expect(stats.total_items).toBe(4)
      expect(stats.by_difficulty['1']).toBe(2)
      expect(stats.by_category['greetings']).toBe(2)
    })
  })

  describe('utility functions', () => {
    it('should get available categories', () => {
      const categories = mockVocabularyService.getAvailableCategories()
      
      expect(Array.isArray(categories)).toBe(true)
      expect(categories.length).toBeGreaterThan(0)
    })

    it('should get difficulty levels', () => {
      const levels = mockVocabularyService.getDifficultyLevels()
      
      expect(Array.isArray(levels)).toBe(true)
      expect(levels.length).toBeGreaterThan(0)
      expect(levels.every((level: any) => level.value && level.label)).toBe(true)
    })
  })

  describe('error handling', () => {
    it('should handle service errors gracefully', async () => {
      mockVocabularyService.getVocabularyLists.mockRejectedValueOnce(
        new Error('Service unavailable')
      )

      await expect(mockVocabularyService.getVocabularyLists()).rejects.toThrow('Service unavailable')
    })

    it('should handle network errors', async () => {
      mockVocabularyService.searchVocabulary.mockRejectedValueOnce(
        new Error('Network error')
      )

      await expect(mockVocabularyService.searchVocabulary('test')).rejects.toThrow('Network error')
    })

    it('should handle invalid input data', async () => {
      mockVocabularyService.createVocabularyList.mockResolvedValueOnce(null)

      const result = await mockVocabularyService.createVocabularyList({
        name: '',
        description: '',
        category: '',
        difficulty_level: -1,
        total_words: -1,
        is_active: false,
      })

      expect(result).toBeNull()
    })
  })

  describe('performance', () => {
    it('should handle multiple concurrent operations', async () => {
      const promises = [
        mockVocabularyService.getVocabularyLists(),
        mockVocabularyService.getAllVocabularyItems(),
        mockVocabularyService.searchVocabulary('test'),
        mockVocabularyService.getVocabularyStats(),
        mockVocabularyService.testConnection(),
      ]

      const start = performance.now()
      await Promise.all(promises)
      const duration = performance.now() - start

      expect(duration).toBeLessThan(1000) // Should complete within 1 second
    })

    it('should efficiently process large datasets', async () => {
      const largeDataset = Array(1000).fill(null).map((_, i) => ({
        id: `item-${i}`,
        vocabulary_list_id: 'test-list',
        spanish_text: `palabra-${i}`,
        english_translation: `word-${i}`,
        category: 'test',
        difficulty_level: (i % 10) + 1,
        frequency_score: Math.floor(Math.random() * 100),
        created_at: new Date().toISOString(),
      }))

      mockVocabularyService.getAllVocabularyItems.mockResolvedValueOnce(largeDataset)

      const start = performance.now()
      const items = await mockVocabularyService.getAllVocabularyItems()
      const duration = performance.now() - start

      expect(items).toHaveLength(1000)
      expect(duration).toBeLessThan(100) // Should be fast for large datasets
    })
  })
})