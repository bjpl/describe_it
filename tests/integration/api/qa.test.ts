import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST, GET } from '@/app/api/qa/generate/route'
import { mockOpenAIService } from '../../mocks/api'

// Mock OpenAI service
vi.mock('@/lib/api/openai', () => ({
  openAIService: mockOpenAIService,
}))

describe('/api/qa/generate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/qa/generate', () => {
    it('should generate Q&A pairs successfully', async () => {
      const requestBody = {
        description: 'Una casa grande con jardín verde y flores coloridas.',
        language: 'es',
        count: 3,
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest

      const mockQAData = [
        {
          id: '1',
          question: '¿Cómo es la casa?',
          answer: 'La casa es grande.',
          difficulty: 'beginner' as const,
          category: 'description',
          language: 'es' as const,
          generatedAt: new Date().toISOString(),
        },
        {
          id: '2',
          question: '¿Qué hay en el jardín?',
          answer: 'Hay flores coloridas.',
          difficulty: 'beginner' as const,
          category: 'description',
          language: 'es' as const,
          generatedAt: new Date().toISOString(),
        },
        {
          id: '3',
          question: '¿De qué color son las flores?',
          answer: 'Las flores son coloridas.',
          difficulty: 'beginner' as const,
          category: 'description',
          language: 'es' as const,
          generatedAt: new Date().toISOString(),
        },
      ]

      mockOpenAIService.generateQA.mockResolvedValueOnce(mockQAData)

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.questions).toHaveLength(3)
      expect(data.questions[0]).toHaveProperty('question')
      expect(data.questions[0]).toHaveProperty('answer')
      expect(data.questions[0]).toHaveProperty('difficulty')
      expect(data.questions[0]).toHaveProperty('category')
      expect(data.metadata).toHaveProperty('count', 3)
      expect(data.metadata).toHaveProperty('language', 'es')
      expect(data.metadata).toHaveProperty('generatedAt')
      expect(data.metadata).toHaveProperty('source')
    })

    it('should validate required description parameter', async () => {
      const requestBody = {
        // Missing description
        language: 'es',
        count: 5,
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Description is required and must be a string')
    })

    it('should validate description is a string', async () => {
      const requestBody = {
        description: 123, // Invalid type
        language: 'es',
        count: 5,
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Description is required and must be a string')
    })

    it('should validate count parameter range', async () => {
      const requestBody = {
        description: 'Test description',
        language: 'es',
        count: 15, // Too high
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Count must be a number between 1 and 10')
    })

    it('should validate count parameter is positive', async () => {
      const requestBody = {
        description: 'Test description',
        language: 'es',
        count: 0, // Too low
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Count must be a number between 1 and 10')
    })

    it('should validate language parameter', async () => {
      const requestBody = {
        description: 'Test description',
        language: 'fr', // Unsupported language
        count: 5,
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Language must be "es" or "en"')
    })

    it('should use default values for optional parameters', async () => {
      const requestBody = {
        description: 'Test description',
        // language and count not provided
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockOpenAIService.generateQA).toHaveBeenCalledWith(
        'Test description',
        'es', // default language
        5    // default count
      )
    })

    it('should handle OpenAI service errors', async () => {
      const requestBody = {
        description: 'Test description',
        language: 'es',
        count: 3,
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest

      mockOpenAIService.generateQA.mockRejectedValueOnce(
        new Error('OpenAI API error')
      )

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('OpenAI API error')
      expect(data.code).toBe('QA_GENERATION_ERROR')
    })

    it('should handle service errors with custom status codes', async () => {
      const requestBody = {
        description: 'Test description',
        language: 'es',
        count: 3,
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest

      const customError = new Error('Rate limit exceeded') as any
      customError.status = 429
      customError.code = 'RATE_LIMIT_ERROR'

      mockOpenAIService.generateQA.mockRejectedValueOnce(customError)

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error).toBe('Rate limit exceeded')
      expect(data.code).toBe('RATE_LIMIT_ERROR')
    })

    it('should set appropriate response headers', async () => {
      const requestBody = {
        description: 'Test description',
        language: 'es',
        count: 3,
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest

      const response = await POST(mockRequest)

      expect(response.headers.get('Content-Type')).toBe('application/json')
      expect(response.headers.get('Cache-Control')).toContain('public')
    })

    it('should handle JSON parsing errors', async () => {
      const mockRequest = {
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
      } as unknown as NextRequest

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Invalid JSON')
    })

    it('should generate different count of Q&A pairs', async () => {
      for (const count of [1, 3, 5, 10]) {
        const requestBody = {
          description: 'Test description',
          language: 'es',
          count,
        }

        const mockRequest = {
          json: vi.fn().mockResolvedValue(requestBody),
        } as unknown as NextRequest

        const mockQAData = Array(count).fill(null).map((_, i) => ({
          id: `${i + 1}`,
          question: `Pregunta ${i + 1}`,
          answer: `Respuesta ${i + 1}`,
          difficulty: 'beginner' as const,
          category: 'description',
          language: 'es' as const,
          generatedAt: new Date().toISOString(),
        }))

        mockOpenAIService.generateQA.mockResolvedValueOnce(mockQAData)

        const response = await POST(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.questions).toHaveLength(count)
        expect(data.metadata.count).toBe(count)

        vi.clearAllMocks()
      }
    })

    it('should handle both Spanish and English languages', async () => {
      const languages = ['es', 'en'] as const

      for (const language of languages) {
        const requestBody = {
          description: 'Test description',
          language,
          count: 2,
        }

        const mockRequest = {
          json: vi.fn().mockResolvedValue(requestBody),
        } as unknown as NextRequest

        const response = await POST(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.metadata.language).toBe(language)

        vi.clearAllMocks()
      }
    })
  })

  describe('GET /api/qa/generate', () => {
    it('should return API information', async () => {
      const mockRequest = {} as NextRequest

      const response = await GET(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('endpoint', '/api/qa/generate')
      expect(data).toHaveProperty('method', 'POST')
      expect(data).toHaveProperty('description')
      expect(data).toHaveProperty('parameters')
      expect(data).toHaveProperty('response')
      expect(data.parameters).toHaveProperty('description')
      expect(data.parameters).toHaveProperty('language')
      expect(data.parameters).toHaveProperty('count')
    })

    it('should set correct content type', async () => {
      const mockRequest = {} as NextRequest

      const response = await GET(mockRequest)

      expect(response.headers.get('Content-Type')).toBe('application/json')
    })
  })

  describe('performance tests', () => {
    it('should generate Q&A pairs within acceptable time', async () => {
      const requestBody = {
        description: 'Una descripción larga con muchos detalles para probar el rendimiento del generador de preguntas y respuestas.',
        language: 'es',
        count: 5,
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest

      const start = performance.now()
      const response = await POST(mockRequest)
      const duration = performance.now() - start

      expect(response.status).toBe(200)
      expect(duration).toBeLessThan(10000) // Should complete within 10 seconds
    })

    it('should handle multiple concurrent requests', async () => {
      const requestBody = {
        description: 'Test description for concurrent testing',
        language: 'es',
        count: 3,
      }

      const createRequest = () => ({
        json: vi.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest)

      const promises = Array(5).fill(null).map(() => POST(createRequest()))

      const start = performance.now()
      const responses = await Promise.all(promises)
      const duration = performance.now() - start

      responses.forEach(response => {
        expect(response.status).toBe(200)
      })

      expect(duration).toBeLessThan(15000) // All requests within 15 seconds
    })
  })

  describe('edge cases', () => {
    it('should handle very long descriptions', async () => {
      const longDescription = 'Esta es una descripción muy larga. '.repeat(100)
      const requestBody = {
        description: longDescription,
        language: 'es',
        count: 3,
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest

      const response = await POST(mockRequest)

      expect(response.status).toBe(200) // Should handle gracefully
    })

    it('should handle empty description gracefully', async () => {
      const requestBody = {
        description: '',
        language: 'es',
        count: 3,
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Description is required and must be a string')
    })

    it('should handle special characters in descriptions', async () => {
      const requestBody = {
        description: 'Descripción con caracteres especiales: ñáéíóú¿¡',
        language: 'es',
        count: 2,
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest

      const response = await POST(mockRequest)

      expect(response.status).toBe(200)
    })

    it('should handle non-integer count values', async () => {
      const requestBody = {
        description: 'Test description',
        language: 'es',
        count: 'three', // String instead of number
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Count must be a number between 1 and 10')
    })
  })

  describe('logging and monitoring', () => {
    it('should log request details', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const requestBody = {
        description: 'Test description for logging',
        language: 'es',
        count: 3,
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest

      await POST(mockRequest)

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[QA API] Generating 3 Q&A pairs in es')
      )

      consoleSpy.mockRestore()
    })

    it('should log errors appropriately', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const requestBody = {
        description: 'Test description',
        language: 'es',
        count: 3,
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest

      mockOpenAIService.generateQA.mockRejectedValueOnce(
        new Error('Test error')
      )

      await POST(mockRequest)

      expect(consoleSpy).toHaveBeenCalledWith(
        '[QA API] Error generating Q&A:',
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })
  })
})