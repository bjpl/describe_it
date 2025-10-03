import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST, GET } from '@/app/api/descriptions/generate/route'
import { mockOpenAIService } from '../../mocks/api'

// Mock OpenAI service
vi.mock('@/lib/api/openai', () => ({
  openAIService: mockOpenAIService,
}))

describe('/api/descriptions/generate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('OPENAI_API_KEY', 'test-key')
  })

  describe('POST /api/descriptions/generate', () => {
    it('should generate a description successfully', async () => {
      const requestBody = {
        imageUrl: 'https://example.com/test.jpg',
        style: 'narrativo',
        language: 'es',
        maxLength: 200,
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest

      mockOpenAIService.generateDescription.mockResolvedValueOnce({
        style: 'narrativo',
        text: 'Una descripción generada por IA.',
        language: 'es',
        wordCount: 5,
        generatedAt: new Date().toISOString(),
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('text')
      expect(data.data).toHaveProperty('style', 'narrativo')
      expect(data.data).toHaveProperty('language', 'es')
      expect(data.metadata).toHaveProperty('responseTime')
      expect(data.metadata).toHaveProperty('timestamp')
    })

    it('should validate required parameters', async () => {
      const invalidRequestBody = {
        // Missing imageUrl
        style: 'narrativo',
        language: 'es',
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(invalidRequestBody),
      } as unknown as NextRequest

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid request parameters')
      expect(data.details).toBeDefined()
    })

    it('should validate image URL format', async () => {
      const requestBody = {
        imageUrl: 'invalid-url',
        style: 'narrativo',
        language: 'es',
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'imageUrl',
            message: 'Invalid image URL',
          })
        ])
      )
    })

    it('should validate style parameter', async () => {
      const requestBody = {
        imageUrl: 'https://example.com/test.jpg',
        style: 'invalid-style',
        language: 'es',
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('should validate language parameter', async () => {
      const requestBody = {
        imageUrl: 'https://example.com/test.jpg',
        style: 'narrativo',
        language: 'fr', // Invalid language
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('should validate maxLength parameter', async () => {
      const requestBody = {
        imageUrl: 'https://example.com/test.jpg',
        style: 'narrativo',
        language: 'es',
        maxLength: 2000, // Too long
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('should use default values for optional parameters', async () => {
      const requestBody = {
        imageUrl: 'https://example.com/test.jpg',
        style: 'narrativo',
        // language and maxLength not provided
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockOpenAIService.generateDescription).toHaveBeenCalledWith(
        expect.objectContaining({
          language: 'es', // default value
          maxLength: 300, // default value
        })
      )
    })

    it('should handle OpenAI service errors gracefully', async () => {
      const requestBody = {
        imageUrl: 'https://example.com/test.jpg',
        style: 'narrativo',
        language: 'es',
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest

      mockOpenAIService.generateDescription.mockRejectedValueOnce(
        new Error('OpenAI API error')
      )

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200) // Should return fallback
      expect(data.success).toBe(true)
      expect(data.metadata.fallback).toBe(true)
      expect(data.metadata.error).toContain('API temporarily unavailable')
    })

    it('should provide fallback response when OpenAI key is missing', async () => {
      vi.stubEnv('OPENAI_API_KEY', '')

      const requestBody = {
        imageUrl: 'https://example.com/test.jpg',
        style: 'narrativo',
        language: 'es',
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.metadata.demoMode).toBe(true)
    })

    it('should set appropriate response headers', async () => {
      const requestBody = {
        imageUrl: 'https://example.com/test.jpg',
        style: 'narrativo',
        language: 'es',
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest

      const response = await POST(mockRequest)

      expect(response.headers.get('Content-Type')).toBe('application/json')
      expect(response.headers.get('Cache-Control')).toContain('public')
      expect(response.headers.get('X-Response-Time')).toBeTruthy()
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
    })

    it('should handle JSON parsing errors', async () => {
      const mockRequest = {
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
      } as unknown as NextRequest

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200) // Falls back gracefully
      expect(data.metadata.fallback).toBe(true)
    })

    it('should include performance metrics', async () => {
      const requestBody = {
        imageUrl: 'https://example.com/test.jpg',
        style: 'narrativo',
        language: 'es',
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(data.metadata.responseTime).toMatch(/\d+\.\d+ms/)
      expect(response.headers.get('X-Response-Time')).toMatch(/\d+\.\d+ms/)
    })
  })

  describe('GET /api/descriptions/generate', () => {
    it('should return API information', async () => {
      const mockRequest = {} as NextRequest

      const response = await GET(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('service', 'Description Generation API')
      expect(data).toHaveProperty('status', 'healthy')
      expect(data).toHaveProperty('version')
      expect(data).toHaveProperty('capabilities')
      expect(data.capabilities).toHaveProperty('styles')
      expect(data.capabilities).toHaveProperty('languages')
      expect(data.capabilities.styles).toContain('narrativo')
      expect(data.capabilities.languages).toContain('es')
    })

    it('should indicate demo mode when OpenAI key is missing', async () => {
      vi.stubEnv('OPENAI_API_KEY', '')

      const mockRequest = {} as NextRequest

      const response = await GET(mockRequest)
      const data = await response.json()

      expect(data.capabilities.demoMode).toBe(true)
    })

    it('should set CORS headers', async () => {
      const mockRequest = {} as NextRequest

      const response = await GET(mockRequest)

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
    })
  })

  describe('performance tests', () => {
    it('should respond within acceptable time limits', async () => {
      const requestBody = {
        imageUrl: 'https://example.com/test.jpg',
        style: 'narrativo',
        language: 'es',
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest

      const start = performance.now()
      const response = await POST(mockRequest)
      const duration = performance.now() - start

      expect(response.status).toBe(200)
      expect(duration).toBeLessThan(5000) // Should respond within 5 seconds
    })

    it('should handle concurrent requests efficiently', async () => {
      const requestBody = {
        imageUrl: 'https://example.com/test.jpg',
        style: 'narrativo',
        language: 'es',
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

      expect(duration).toBeLessThan(10000) // All requests within 10 seconds
    })
  })

  describe('edge cases', () => {
    it('should handle very long image URLs', async () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(1000) + '.jpg'
      const requestBody = {
        imageUrl: longUrl,
        style: 'narrativo',
        language: 'es',
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest

      const response = await POST(mockRequest)

      expect(response.status).toBe(200) // Should handle gracefully
    })

    it('should handle special characters in description', async () => {
      mockOpenAIService.generateDescription.mockResolvedValueOnce({
        style: 'narrativo',
        text: 'Descripción con caracteres especiales: ñáéíóú¿¡',
        language: 'es',
        wordCount: 6,
        generatedAt: new Date().toISOString(),
      })

      const requestBody = {
        imageUrl: 'https://example.com/test.jpg',
        style: 'narrativo',
        language: 'es',
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.text).toContain('ñáéíóú¿¡')
    })
  })
})