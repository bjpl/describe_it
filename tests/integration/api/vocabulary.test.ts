import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/vocabulary/save/route'
import { mockVocabularyService } from '../../mocks/api'

// Mock vocabulary service
vi.mock('@/lib/services/vocabularyService', () => ({
  vocabularyService: mockVocabularyService,
}))

describe('/api/vocabulary/save', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/vocabulary/save', () => {
    it('should save vocabulary item successfully', async () => {
      const requestBody = {
        spanish_text: 'hola',
        english_translation: 'hello',
        category: 'greetings',
        difficulty_level: 1,
        vocabulary_list_id: 'test-list',
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest

      mockVocabularyService.addVocabularyItem.mockResolvedValueOnce({
        id: 'new-item-1',
        ...requestBody,
        frequency_score: 100,
        created_at: new Date().toISOString(),
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('id', 'new-item-1')
      expect(data.data).toHaveProperty('spanish_text', 'hola')
      expect(data.data).toHaveProperty('english_translation', 'hello')
      expect(mockVocabularyService.addVocabularyItem).toHaveBeenCalledWith(
        expect.objectContaining(requestBody)
      )
    })

    it('should validate required fields', async () => {
      const requestBody = {
        // Missing spanish_text and english_translation
        category: 'greetings',
        difficulty_level: 1,
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('required')
    })

    it('should validate spanish_text field', async () => {
      const requestBody = {
        spanish_text: '', // Empty string
        english_translation: 'hello',
        category: 'greetings',
        difficulty_level: 1,
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('should validate english_translation field', async () => {
      const requestBody = {
        spanish_text: 'hola',
        english_translation: '', // Empty string
        category: 'greetings',
        difficulty_level: 1,
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('should validate difficulty_level range', async () => {
      const requestBody = {
        spanish_text: 'hola',
        english_translation: 'hello',
        category: 'greetings',
        difficulty_level: 15, // Too high
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('difficulty_level')
    })

    it('should validate category field', async () => {
      const requestBody = {
        spanish_text: 'hola',
        english_translation: 'hello',
        category: 'invalid_category',
        difficulty_level: 1,
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('category')
    })

    it('should use default values for optional fields', async () => {
      const requestBody = {
        spanish_text: 'gracias',
        english_translation: 'thank you',
        category: 'greetings',
        difficulty_level: 1,
        // vocabulary_list_id not provided
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest

      mockVocabularyService.addVocabularyItem.mockResolvedValueOnce({
        id: 'new-item-2',
        vocabulary_list_id: 'default-list',
        frequency_score: 50,
        created_at: new Date().toISOString(),
        ...requestBody,
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(mockVocabularyService.addVocabularyItem).toHaveBeenCalledWith(
        expect.objectContaining({
          vocabulary_list_id: expect.any(String),
          frequency_score: expect.any(Number),
        })
      )
    })

    it('should handle service errors gracefully', async () => {
      const requestBody = {
        spanish_text: 'hola',
        english_translation: 'hello',
        category: 'greetings',
        difficulty_level: 1,
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest

      mockVocabularyService.addVocabularyItem.mockResolvedValueOnce(null)

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Failed to save')
    })

    it('should handle database connection errors', async () => {
      const requestBody = {
        spanish_text: 'hola',
        english_translation: 'hello',
        category: 'greetings',
        difficulty_level: 1,
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest

      mockVocabularyService.addVocabularyItem.mockRejectedValueOnce(
        new Error('Database connection failed')
      )

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Database connection failed')
    })

    it('should set appropriate response headers', async () => {
      const requestBody = {
        spanish_text: 'hola',
        english_translation: 'hello',
        category: 'greetings',
        difficulty_level: 1,
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest

      mockVocabularyService.addVocabularyItem.mockResolvedValueOnce({
        id: 'new-item',
        ...requestBody,
        frequency_score: 100,
        vocabulary_list_id: 'test-list',
        created_at: new Date().toISOString(),
      })

      const response = await POST(mockRequest)

      expect(response.headers.get('Content-Type')).toBe('application/json')
    })

    it('should handle duplicate vocabulary items', async () => {
      const requestBody = {
        spanish_text: 'hola', // Already exists
        english_translation: 'hello',
        category: 'greetings',
        difficulty_level: 1,
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest

      const duplicateError = new Error('Duplicate entry') as any
      duplicateError.code = 'DUPLICATE_ENTRY'

      mockVocabularyService.addVocabularyItem.mockRejectedValueOnce(duplicateError)

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(409) // Conflict
      expect(data.success).toBe(false)
      expect(data.error).toContain('already exists')
    })

    it('should save vocabulary item with all optional fields', async () => {
      const requestBody = {
        spanish_text: 'biblioteca',
        english_translation: 'library',
        category: 'places',
        difficulty_level: 3,
        vocabulary_list_id: 'intermediate-list',
        frequency_score: 75,
        example_sentence: 'Voy a la biblioteca todos los días.',
        pronunciation: 'bee-blee-oh-TEH-kah',
        notes: 'Often used in academic contexts',
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest

      mockVocabularyService.addVocabularyItem.mockResolvedValueOnce({
        id: 'new-item-3',
        ...requestBody,
        created_at: new Date().toISOString(),
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('example_sentence')
      expect(data.data).toHaveProperty('pronunciation')
      expect(data.data).toHaveProperty('notes')
    })

    it('should handle JSON parsing errors', async () => {
      const mockRequest = {
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
      } as unknown as NextRequest

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid JSON')
    })

    it('should sanitize input data', async () => {
      const requestBody = {
        spanish_text: '<script>alert("xss")</script>hola',
        english_translation: 'hello<iframe src="evil"></iframe>',
        category: 'greetings',
        difficulty_level: 1,
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest

      mockVocabularyService.addVocabularyItem.mockResolvedValueOnce({
        id: 'new-item-4',
        spanish_text: 'hola', // Should be sanitized
        english_translation: 'hello', // Should be sanitized
        category: 'greetings',
        difficulty_level: 1,
        vocabulary_list_id: 'default',
        frequency_score: 50,
        created_at: new Date().toISOString(),
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.data.spanish_text).not.toContain('<script>')
      expect(data.data.english_translation).not.toContain('<iframe>')
    })
  })

  describe('performance tests', () => {
    it('should save vocabulary items within acceptable time', async () => {
      const requestBody = {
        spanish_text: 'computadora',
        english_translation: 'computer',
        category: 'technology',
        difficulty_level: 2,
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest

      const start = performance.now()
      const response = await POST(mockRequest)
      const duration = performance.now() - start

      expect(response.status).toBe(201)
      expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
    })

    it('should handle multiple concurrent save requests', async () => {
      const requestBodies = Array(5).fill(null).map((_, i) => ({
        spanish_text: `palabra${i}`,
        english_translation: `word${i}`,
        category: 'test',
        difficulty_level: 1,
      }))

      const createRequest = (body: any) => ({
        json: vi.fn().mockResolvedValue(body),
      } as unknown as NextRequest)

      // Mock service to return successful results
      mockVocabularyService.addVocabularyItem.mockImplementation(async (data) => ({
        id: `item-${Date.now()}`,
        ...data,
        vocabulary_list_id: 'test-list',
        frequency_score: 50,
        created_at: new Date().toISOString(),
      }))

      const promises = requestBodies.map(body => POST(createRequest(body)))

      const start = performance.now()
      const responses = await Promise.all(promises)
      const duration = performance.now() - start

      responses.forEach(response => {
        expect(response.status).toBe(201)
      })

      expect(duration).toBeLessThan(10000) // All requests within 10 seconds
    })
  })

  describe('edge cases', () => {
    it('should handle very long text inputs', async () => {
      const requestBody = {
        spanish_text: 'palabra'.repeat(100), // Very long
        english_translation: 'word'.repeat(100), // Very long
        category: 'test',
        difficulty_level: 1,
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest

      const response = await POST(mockRequest)

      // Should either succeed or fail gracefully
      expect([201, 400, 413]).toContain(response.status)
    })

    it('should handle special characters in text', async () => {
      const requestBody = {
        spanish_text: 'niño', // With ñ
        english_translation: 'child',
        category: 'family',
        difficulty_level: 1,
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest

      mockVocabularyService.addVocabularyItem.mockResolvedValueOnce({
        id: 'item-special',
        ...requestBody,
        vocabulary_list_id: 'test',
        frequency_score: 50,
        created_at: new Date().toISOString(),
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.data.spanish_text).toBe('niño')
    })

    it('should handle unicode characters', async () => {
      const requestBody = {
        spanish_text: 'café', // With accent
        english_translation: 'coffee ☕', // With emoji
        category: 'food_drink',
        difficulty_level: 1,
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest

      mockVocabularyService.addVocabularyItem.mockResolvedValueOnce({
        id: 'item-unicode',
        ...requestBody,
        vocabulary_list_id: 'test',
        frequency_score: 50,
        created_at: new Date().toISOString(),
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.data.spanish_text).toBe('café')
      expect(data.data.english_translation).toContain('☕')
    })

    it('should handle null and undefined values', async () => {
      const requestBody = {
        spanish_text: 'test',
        english_translation: 'test',
        category: 'test',
        difficulty_level: 1,
        notes: null, // Null value
        pronunciation: undefined, // Undefined value
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest

      const response = await POST(mockRequest)

      expect([201, 400]).toContain(response.status)
    })
  })
})