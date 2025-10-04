import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PhraseExtractor } from '@/lib/services/phraseExtractor'
import type { PhraseExtractionRequest } from '@/lib/services/phraseExtractor'

describe('PhraseExtractor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('extractCategorizedPhrases', () => {
    it('should extract and categorize phrases successfully', async () => {
      const request: PhraseExtractionRequest = {
        description: 'Una casa grande y bonita con un jardín verde.',
        imageUrl: 'https://example.com/house.jpg',
        targetLevel: 'beginner',
        maxPhrases: 20,
      }

      const result = await PhraseExtractor.extractCategorizedPhrases(request)

      expect(result).toHaveProperty('sustantivos')
      expect(result).toHaveProperty('verbos')
      expect(result).toHaveProperty('adjetivos')
      expect(result).toHaveProperty('adverbios')
      expect(result).toHaveProperty('frasesClaves')

      expect(Array.isArray(result.sustantivos)).toBe(true)
      expect(Array.isArray(result.verbos)).toBe(true)
      expect(Array.isArray(result.adjetivos)).toBe(true)
      expect(Array.isArray(result.adverbios)).toBe(true)
      expect(Array.isArray(result.frasesClaves)).toBe(true)
    })

    it('should limit phrases per category based on maxItems', async () => {
      const request: PhraseExtractionRequest = {
        description: 'Test description with multiple words',
        imageUrl: 'https://example.com/test.jpg',
        targetLevel: 'intermediate',
        maxPhrases: 4,
      }

      const result = await PhraseExtractor.extractCategorizedPhrases(request)
      
      const totalPhrases = Object.values(result).flat().length
      expect(totalPhrases).toBeLessThanOrEqual(4)
    })

    it('should handle different target levels', async () => {
      const levels: Array<'beginner' | 'intermediate' | 'advanced'> = ['beginner', 'intermediate', 'advanced']
      
      for (const level of levels) {
        const request: PhraseExtractionRequest = {
          description: 'Test description',
          imageUrl: 'https://example.com/test.jpg',
          targetLevel: level,
          maxPhrases: 10,
        }

        const result = await PhraseExtractor.extractCategorizedPhrases(request)
        
        // Should return valid structure for all levels
        expect(result).toBeDefined()
        expect(typeof result).toBe('object')
      }
    })

    it('should filter categories when specified', async () => {
      const request: PhraseExtractionRequest = {
        description: 'Test description',
        imageUrl: 'https://example.com/test.jpg',
        targetLevel: 'beginner',
        maxPhrases: 10,
        categories: ['sustantivos', 'verbos'],
      }

      const result = await PhraseExtractor.extractCategorizedPhrases(request)
      
      // Should have content in specified categories
      const hasContent = result.sustantivos.length > 0 || result.verbos.length > 0
      expect(hasContent).toBe(true)
    })

    it('should handle empty description gracefully', async () => {
      const request: PhraseExtractionRequest = {
        description: '',
        imageUrl: 'https://example.com/test.jpg',
        targetLevel: 'beginner',
        maxPhrases: 10,
      }

      const result = await PhraseExtractor.extractCategorizedPhrases(request)
      
      expect(result).toBeDefined()
      expect(typeof result).toBe('object')
    })
  })

  describe('getCategoryConfig', () => {
    it('should return correct configuration for each category', () => {
      const categories = ['sustantivos', 'verbos', 'adjetivos', 'adverbios', 'frasesClaves'] as const
      
      categories.forEach(category => {
        const config = PhraseExtractor.getCategoryConfig(category)
        
        expect(config).toHaveProperty('name', category)
        expect(config).toHaveProperty('displayName')
        expect(config).toHaveProperty('color')
        expect(config).toHaveProperty('maxItems')
        expect(config).toHaveProperty('priority')
        
        expect(typeof config.displayName).toBe('string')
        expect(typeof config.color).toBe('string')
        expect(typeof config.maxItems).toBe('number')
        expect(typeof config.priority).toBe('number')
        
        expect(config.maxItems).toBeGreaterThan(0)
        expect(config.priority).toBeGreaterThan(0)
      })
    })
  })

  describe('getAllCategories', () => {
    it('should return all categories sorted by priority', () => {
      const categories = PhraseExtractor.getAllCategories()
      
      expect(categories).toHaveLength(5)
      expect(categories.every(cat => cat.name && cat.displayName && cat.priority)).toBe(true)
      
      // Should be sorted by priority
      for (let i = 1; i < categories.length; i++) {
        expect(categories[i].priority).toBeGreaterThanOrEqual(categories[i - 1].priority)
      }
    })
  })

  describe('extractWordsFromDescription', () => {
    it('should extract different types of words from Spanish text', () => {
      const description = 'La casa grande tiene jardines hermosos y las personas caminan rápidamente hacia la entrada.'
      
      const result = PhraseExtractor.extractWordsFromDescription(description)
      
      expect(result).toHaveProperty('nouns')
      expect(result).toHaveProperty('verbs')
      expect(result).toHaveProperty('adjectives')
      expect(result).toHaveProperty('adverbs')
      expect(result).toHaveProperty('keyPhrases')
      
      expect(Array.isArray(result.nouns)).toBe(true)
      expect(Array.isArray(result.verbs)).toBe(true)
      expect(Array.isArray(result.adjectives)).toBe(true)
      expect(Array.isArray(result.adverbs)).toBe(true)
      expect(Array.isArray(result.keyPhrases)).toBe(true)
    })

    it('should identify Spanish word patterns correctly', () => {
      const description = 'Caminando rápidamente hacia la construcción moderna'
      
      const result = PhraseExtractor.extractWordsFromDescription(description)
      
      // Should identify adverbs ending in -mente
      expect(result.adverbs).toContain('rápidamente')
      
      // Should identify nouns ending in -ción
      expect(result.nouns).toContain('construcción')
    })

    it('should handle empty or short descriptions', () => {
      const shortDescription = 'Hola'
      
      const result = PhraseExtractor.extractWordsFromDescription(shortDescription)
      
      expect(result.nouns).toHaveLength(0)
      expect(result.verbs).toHaveLength(0)
      expect(result.adjectives).toHaveLength(0)
      expect(result.adverbs).toHaveLength(0)
    })

    it('should limit results to reasonable numbers', () => {
      const longDescription = 'casa '.repeat(20) + 'caminar '.repeat(15) + 'rápidamente '.repeat(10)
      
      const result = PhraseExtractor.extractWordsFromDescription(longDescription)
      
      expect(result.nouns.length).toBeLessThanOrEqual(10)
      expect(result.verbs.length).toBeLessThanOrEqual(8)
      expect(result.adjectives.length).toBeLessThanOrEqual(8)
      expect(result.adverbs.length).toBeLessThanOrEqual(5)
      expect(result.keyPhrases.length).toBeLessThanOrEqual(6)
    })
  })

  describe('generateIntelligentMockPhrases', () => {
    it('should simulate AI processing with delay', async () => {
      const start = performance.now()
      
      const request: PhraseExtractionRequest = {
        description: 'Test description',
        imageUrl: 'https://example.com/test.jpg',
        targetLevel: 'beginner',
        maxPhrases: 5,
      }
      
      await PhraseExtractor.extractCategorizedPhrases(request)
      
      const duration = performance.now() - start
      expect(duration).toBeGreaterThan(100) // Should have some delay
    }, 3000)
  })

  describe('error handling', () => {
    it('should handle invalid image URLs gracefully', async () => {
      const request: PhraseExtractionRequest = {
        description: 'Test description',
        imageUrl: 'invalid-url',
        targetLevel: 'beginner',
        maxPhrases: 10,
      }

      const result = await PhraseExtractor.extractCategorizedPhrases(request)
      
      expect(result).toBeDefined()
      expect(typeof result).toBe('object')
    })

    it('should handle very large maxPhrases values', async () => {
      const request: PhraseExtractionRequest = {
        description: 'Test description',
        imageUrl: 'https://example.com/test.jpg',
        targetLevel: 'beginner',
        maxPhrases: 1000,
      }

      const result = await PhraseExtractor.extractCategorizedPhrases(request)
      
      expect(result).toBeDefined()
      const totalPhrases = Object.values(result).flat().length
      expect(totalPhrases).toBeLessThan(100) // Should be reasonable
    })
  })

  describe('performance', () => {
    it('should complete phrase extraction within reasonable time', async () => {
      const request: PhraseExtractionRequest = {
        description: 'Una descripción larga con muchas palabras interesantes para probar el rendimiento del extractor de frases.',
        imageUrl: 'https://example.com/test.jpg',
        targetLevel: 'intermediate',
        maxPhrases: 20,
      }

      const start = performance.now()
      await PhraseExtractor.extractCategorizedPhrases(request)
      const duration = performance.now() - start

      expect(duration).toBeLessThan(3000) // Should complete within 3 seconds
    }, 5000)
  })
})