/**
 * Comprehensive tests for /api/images/search endpoint
 */

import { NextRequest } from 'next/server'
import { GET, OPTIONS, HEAD } from '../../src/app/api/images/search/route'
import {
  createMockRequest,
  expectResponse,
  PerformanceTimer,
  setupTestEnvironment,
  cleanupTestEnvironment,
  testDataGenerators,
  mockServiceResponses
} from './test-utils'

import { vi } from 'vitest'

// Mock dependencies
vi.mock('../../src/lib/api/unsplash', () => ({
  unsplashService: {
    searchImages: vi.fn()
  }
}))

describe('/api/images/search', () => {
  beforeEach(() => {
    setupTestEnvironment()
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanupTestEnvironment()
  })

  describe('CORS Support', () => {
    it('should handle OPTIONS preflight requests', async () => {
      const request = createMockRequest('/api/images/search', { method: 'OPTIONS' })
      const response = await OPTIONS(request)

      expectResponse(response)
        .expectStatus(200)
        .expectCorsHeaders()

      // Should have empty body
      const text = await response.text()
      expect(text).toBe('')
    })

    it('should include CORS headers in GET responses', async () => {
      const { unsplashService } = require('../../src/lib/api/unsplash')
      unsplashService.searchImages.mockResolvedValue({
        images: [],
        total: 0,
        totalPages: 1,
        currentPage: 1,
        hasNextPage: false
      })

      const request = createMockRequest('/api/images/search', {
        searchParams: { query: 'test' }
      })
      const response = await GET(request)

      expectResponse(response)
        .expectStatus(200)
        .expectCorsHeaders()
    })

    it('should handle HEAD requests for prefetching', async () => {
      const request = createMockRequest('/api/images/search', { method: 'HEAD' })
      const response = await HEAD(request)

      expectResponse(response)
        .expectStatus(200)
        .expectCorsHeaders()
        .expectHeader('Cache-Control', 'public, max-age=300')

      // Should have empty body
      const text = await response.text()
      expect(text).toBe('')
    })
  })

  describe('Request Validation', () => {
    it('should validate required query parameter', async () => {
      const request = createMockRequest('/api/images/search')
      const response = await GET(request)

      const json = await expectResponse(response)
        .expectStatus(400)
        .expectCorsHeaders()
        .expectErrorResponse()

      expect(json.error).toBe('Invalid parameters')
      expect(json.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['query'],
            message: expect.stringContaining('Required')
          })
        ])
      )
    })

    it('should validate query parameter constraints', async () => {
      const testCases = [
        { query: '', expectedError: /String must contain at least 1 character/ },
        { query: 'a'.repeat(101), expectedError: /String must contain at most 100 character/ }
      ]

      for (const testCase of testCases) {
        const request = createMockRequest('/api/images/search', {
          searchParams: { query: testCase.query }
        })
        const response = await GET(request)

        const json = await expectResponse(response)
          .expectStatus(400)
          .expectErrorResponse()

        expect(json.details[0].message).toMatch(testCase.expectedError)
      }
    })

    it('should validate page parameter', async () => {
      const testCases = [
        { page: '0', expectedError: /Number must be greater than or equal to 1/ },
        { page: '-1', expectedError: /Number must be greater than or equal to 1/ },
        { page: 'invalid', expectedError: /Expected number/ }
      ]

      for (const testCase of testCases) {
        const request = createMockRequest('/api/images/search', {
          searchParams: { query: 'test', page: testCase.page }
        })
        const response = await GET(request)

        const json = await expectResponse(response)
          .expectStatus(400)
          .expectErrorResponse()

        expect(json.details.some((detail: any) => 
          testCase.expectedError.test(detail.message)
        )).toBe(true)
      }
    })

    it('should validate per_page parameter', async () => {
      const testCases = [
        { per_page: '0', expectedError: /Number must be greater than or equal to 1/ },
        { per_page: '31', expectedError: /Number must be less than or equal to 30/ },
        { per_page: 'invalid', expectedError: /Expected number/ }
      ]

      for (const testCase of testCases) {
        const request = createMockRequest('/api/images/search', {
          searchParams: { query: 'test', per_page: testCase.per_page }
        })
        const response = await GET(request)

        const json = await expectResponse(response)
          .expectStatus(400)
          .expectErrorResponse()

        expect(json.details.some((detail: any) => 
          testCase.expectedError.test(detail.message)
        )).toBe(true)
      }
    })

    it('should validate orientation parameter', async () => {
      const request = createMockRequest('/api/images/search', {
        searchParams: { query: 'test', orientation: 'invalid' }
      })
      const response = await GET(request)

      const json = await expectResponse(response)
        .expectStatus(400)
        .expectErrorResponse()

      expect(json.details[0].message).toContain('Invalid enum value')
    })

    it('should validate orderBy parameter', async () => {
      const request = createMockRequest('/api/images/search', {
        searchParams: { query: 'test', orderBy: 'invalid' }
      })
      const response = await GET(request)

      const json = await expectResponse(response)
        .expectStatus(400)
        .expectErrorResponse()

      expect(json.details[0].message).toContain('Invalid enum value')
    })

    it('should accept valid parameters with defaults', async () => {
      const { unsplashService } = require('../../src/lib/api/unsplash')
      unsplashService.searchImages.mockResolvedValue({
        images: [],
        total: 0,
        totalPages: 1,
        currentPage: 1,
        hasNextPage: false
      })

      const request = createMockRequest('/api/images/search', {
        searchParams: { query: 'nature' }
      })
      const response = await GET(request)

      await expectResponse(response)
        .expectStatus(200)
        .expectValidImageSearchResponse()

      expect(unsplashService.searchImages).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'nature',
          page: 1,
          per_page: 20
        })
      )
    })

    it('should accept all valid parameters', async () => {
      const { unsplashService } = require('../../src/lib/api/unsplash')
      unsplashService.searchImages.mockResolvedValue({
        images: [],
        total: 0,
        totalPages: 1,
        currentPage: 2,
        hasNextPage: false
      })

      const params = testDataGenerators.validSearchParams()
      const request = createMockRequest('/api/images/search', {
        searchParams: params
      })
      const response = await GET(request)

      await expectResponse(response)
        .expectStatus(200)
        .expectValidImageSearchResponse()

      expect(unsplashService.searchImages).toHaveBeenCalledWith(
        expect.objectContaining({
          query: params.query,
          page: parseInt(params.page),
          per_page: parseInt(params.per_page),
          orientation: params.orientation,
          color: params.color,
          orderBy: params.orderBy
        })
      )
    })
  })

  describe('Successful Responses', () => {
    it('should return search results with correct structure', async () => {
      const { unsplashService } = require('../../src/lib/api/unsplash')
      const mockImages = [
        {
          id: 'test-1',
          width: 1920,
          height: 1080,
          urls: {
            regular: 'https://example.com/image1.jpg',
            small: 'https://example.com/image1_small.jpg',
            thumb: 'https://example.com/image1_thumb.jpg'
          },
          user: {
            username: 'testuser1',
            name: 'Test User 1'
          }
        }
      ]

      unsplashService.searchImages.mockResolvedValue({
        images: mockImages,
        total: 100,
        totalPages: 5,
        currentPage: 1,
        hasNextPage: true
      })

      const request = createMockRequest('/api/images/search', {
        searchParams: { query: 'nature', page: '1', per_page: '20' }
      })
      const response = await GET(request)

      const json = await expectResponse(response)
        .expectStatus(200)
        .expectValidImageSearchResponse()

      expect(json.images).toHaveLength(1)
      expect(json.images[0]).toEqual(mockImages[0])
      expect(json.total).toBe(100)
      expect(json.totalPages).toBe(5)
      expect(json.currentPage).toBe(1)
      expect(json.hasNextPage).toBe(true)
    })

    it('should include proper caching headers', async () => {
      const { unsplashService } = require('../../src/lib/api/unsplash')
      unsplashService.searchImages.mockResolvedValue({
        images: [],
        total: 0,
        totalPages: 1,
        currentPage: 1,
        hasNextPage: false
      })

      const request = createMockRequest('/api/images/search', {
        searchParams: { query: 'test' }
      })
      const response = await GET(request)

      expectResponse(response)
        .expectStatus(200)
        .expectHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600')
        .expectHeader('X-Cache', 'MISS')
    })

    it('should include performance headers', async () => {
      const { unsplashService } = require('../../src/lib/api/unsplash')
      unsplashService.searchImages.mockResolvedValue({
        images: [],
        total: 0,
        totalPages: 1,
        currentPage: 1,
        hasNextPage: false
      })

      const request = createMockRequest('/api/images/search', {
        searchParams: { query: 'test' }
      })
      const timer = new PerformanceTimer()
      const response = await GET(request)

      const responseTimeHeader = response.headers.get('X-Response-Time')
      expect(responseTimeHeader).toBeTruthy()
      expect(responseTimeHeader).toMatch(/^\d+(\.\d+)?ms$/)
      
      expectResponse(response)
        .expectHeader('X-Rate-Limit-Remaining', '1000')

      timer.expectResponseTime(2000)
    })

    it('should indicate demo mode when appropriate', async () => {
      delete process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY

      const { unsplashService } = require('../../src/lib/api/unsplash')
      unsplashService.searchImages.mockResolvedValue({
        images: [],
        total: 0,
        totalPages: 1,
        currentPage: 1,
        hasNextPage: false
      })

      const request = createMockRequest('/api/images/search', {
        searchParams: { query: 'test' }
      })
      const response = await GET(request)

      expectResponse(response)
        .expectStatus(200)
        .expectHeader('X-Demo-Mode', 'true')
    })

    it('should indicate production mode with API key', async () => {
      const { unsplashService } = require('../../src/lib/api/unsplash')
      unsplashService.searchImages.mockResolvedValue({
        images: [],
        total: 0,
        totalPages: 1,
        currentPage: 1,
        hasNextPage: false
      })

      const request = createMockRequest('/api/images/search', {
        searchParams: { query: 'test' }
      })
      const response = await GET(request)

      expectResponse(response)
        .expectStatus(200)
        .expectHeader('X-Demo-Mode', 'false')
    })
  })

  describe('Error Handling', () => {
    it('should return 400 for validation errors with detailed information', async () => {
      const request = createMockRequest('/api/images/search', {
        searchParams: { query: '', page: '0' }
      })
      const response = await GET(request)

      const json = await expectResponse(response)
        .expectStatus(400)
        .expectCorsHeaders()
        .expectErrorResponse()

      expect(json.error).toBe('Invalid parameters')
      expect(json.details).toBeInstanceOf(Array)
      expect(json.details.length).toBeGreaterThan(0)
      expect(json.timestamp).toBeTruthy()
    })

    it('should return fallback data on service errors', async () => {
      const { unsplashService } = require('../../src/lib/api/unsplash')
      unsplashService.searchImages.mockRejectedValue(new Error('Service unavailable'))

      const request = createMockRequest('/api/images/search', {
        searchParams: { query: 'test' }
      })
      const response = await GET(request)

      const json = await expectResponse(response)
        .expectStatus(500)
        .expectCorsHeaders()
        .expectValidImageSearchResponse()

      // Should return fallback data
      expect(json.images).toHaveLength(1)
      expect(json.images[0].id).toBe('fallback-error')
      expect(json.images[0].description).toContain('Fallback image due to API error')
      expect(json.total).toBe(1)
      expect(json.totalPages).toBe(1)
      expect(json.hasNextPage).toBe(false)

      // Should include error indicators
      expectResponse(response)
        .expectHeader('X-Cache', 'ERROR-FALLBACK')
        .expectHeader('X-Error', 'true')
    })

    it('should log service errors', async () => {
      const { unsplashService } = require('../../src/lib/api/unsplash')
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      unsplashService.searchImages.mockRejectedValue(new Error('API Error'))

      const request = createMockRequest('/api/images/search', {
        searchParams: { query: 'test' }
      })
      await GET(request)

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Image search error:',
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })

    it('should handle network timeouts gracefully', async () => {
      const { unsplashService } = require('../../src/lib/api/unsplash')
      unsplashService.searchImages.mockImplementation(() =>
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('TIMEOUT')), 100)
        )
      )

      const request = createMockRequest('/api/images/search', {
        searchParams: { query: 'test' }
      })
      const response = await GET(request)

      // Should still return fallback
      const json = await expectResponse(response)
        .expectStatus(500)
        .expectValidImageSearchResponse()

      expect(json.images[0].id).toBe('fallback-error')
    })
  })

  describe('Performance', () => {
    it('should respond within acceptable time limits', async () => {
      const { unsplashService } = require('../../src/lib/api/unsplash')
      unsplashService.searchImages.mockResolvedValue({
        images: Array(20).fill(null).map((_, i) => ({
          id: `image-${i}`,
          width: 1920,
          height: 1080,
          urls: {
            regular: `https://example.com/image${i}.jpg`,
            small: `https://example.com/image${i}_small.jpg`,
            thumb: `https://example.com/image${i}_thumb.jpg`
          },
          user: {
            username: `user${i}`,
            name: `User ${i}`
          }
        })),
        total: 1000,
        totalPages: 50,
        currentPage: 1,
        hasNextPage: true
      })

      const timer = new PerformanceTimer()
      const request = createMockRequest('/api/images/search', {
        searchParams: { query: 'nature', per_page: '20' }
      })
      const response = await GET(request)

      await expectResponse(response)
        .expectStatus(200)
        .expectValidImageSearchResponse()

      timer.expectResponseTime(1000) // Should respond within 1 second
    })

    it('should handle large result sets efficiently', async () => {
      const { unsplashService } = require('../../src/lib/api/unsplash')
      const largeImageSet = Array(30).fill(null).map((_, i) => ({
        id: `large-image-${i}`,
        width: 4000,
        height: 3000,
        urls: {
          regular: `https://example.com/large-image${i}.jpg`,
          small: `https://example.com/large-image${i}_small.jpg`,
          thumb: `https://example.com/large-image${i}_thumb.jpg`
        },
        user: {
          username: `photographer${i}`,
          name: `Professional Photographer ${i}`
        },
        description: 'A' + 'very '.repeat(50) + 'long description'
      }))

      unsplashService.searchImages.mockResolvedValue({
        images: largeImageSet,
        total: 10000,
        totalPages: 334,
        currentPage: 1,
        hasNextPage: true
      })

      const timer = new PerformanceTimer()
      const request = createMockRequest('/api/images/search', {
        searchParams: { query: 'photography', per_page: '30' }
      })
      const response = await GET(request)

      const json = await expectResponse(response)
        .expectStatus(200)
        .expectValidImageSearchResponse()

      expect(json.images).toHaveLength(30)
      timer.expectResponseTime(2000) // Should handle large payloads efficiently
    })
  })

  describe('Configuration', () => {
    it('should force dynamic rendering', () => {
      const { dynamic, runtime } = require('../../src/app/api/images/search/route')
      expect(dynamic).toBe('force-dynamic')
      expect(runtime).toBe('nodejs')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty search results', async () => {
      const { unsplashService } = require('../../src/lib/api/unsplash')
      unsplashService.searchImages.mockResolvedValue({
        images: [],
        total: 0,
        totalPages: 1,
        currentPage: 1,
        hasNextPage: false
      })

      const request = createMockRequest('/api/images/search', {
        searchParams: { query: 'nonexistent' }
      })
      const response = await GET(request)

      const json = await expectResponse(response)
        .expectStatus(200)
        .expectValidImageSearchResponse()

      expect(json.images).toHaveLength(0)
      expect(json.total).toBe(0)
      expect(json.hasNextPage).toBe(false)
    })

    it('should handle pagination edge cases', async () => {
      const { unsplashService } = require('../../src/lib/api/unsplash')
      unsplashService.searchImages.mockResolvedValue({
        images: [],
        total: 25,
        totalPages: 2,
        currentPage: 3, // Beyond last page
        hasNextPage: false
      })

      const request = createMockRequest('/api/images/search', {
        searchParams: { query: 'test', page: '3', per_page: '15' }
      })
      const response = await GET(request)

      const json = await expectResponse(response)
        .expectStatus(200)
        .expectValidImageSearchResponse()

      expect(json.currentPage).toBe(3)
      expect(json.hasNextPage).toBe(false)
    })

    it('should handle special characters in queries', async () => {
      const { unsplashService } = require('../../src/lib/api/unsplash')
      unsplashService.searchImages.mockResolvedValue({
        images: [],
        total: 0,
        totalPages: 1,
        currentPage: 1,
        hasNextPage: false
      })

      const specialQueries = [
        'café',
        'naïve',
        'résumé',
        '山田',
        'Москва',
        'test+with+plus',
        'test with spaces',
        'test&with&ampersands'
      ]

      for (const query of specialQueries) {
        const request = createMockRequest('/api/images/search', {
          searchParams: { query }
        })
        const response = await GET(request)

        await expectResponse(response)
          .expectStatus(200)
          .expectValidImageSearchResponse()

        expect(unsplashService.searchImages).toHaveBeenCalledWith(
          expect.objectContaining({ query })
        )
      }
    })

    it('should maintain response time header precision', async () => {
      const { unsplashService } = require('../../src/lib/api/unsplash')
      unsplashService.searchImages.mockResolvedValue({
        images: [],
        total: 0,
        totalPages: 1,
        currentPage: 1,
        hasNextPage: false
      })

      const request = createMockRequest('/api/images/search', {
        searchParams: { query: 'test' }
      })
      const response = await GET(request)

      const responseTimeHeader = response.headers.get('X-Response-Time')
      expect(responseTimeHeader).toMatch(/^\d+\.\d{2}ms$/) // Should have 2 decimal places
    })
  })
})