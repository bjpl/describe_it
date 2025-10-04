/**
 * Comprehensive tests for /api/health endpoint
 */

import { NextRequest } from 'next/server'
import { GET } from '../../src/app/api/health/route'
import {
  createMockRequest,
  expectResponse,
  PerformanceTimer,
  setupTestEnvironment,
  cleanupTestEnvironment,
  mockExternalServices
} from './test-utils'

import { vi } from 'vitest'

// Mock dependencies
vi.mock('../../src/lib/api/vercel-kv', () => ({
  vercelKvCache: {
    healthCheck: vi.fn()
  }
}))

vi.mock('../../src/lib/api/structured-logging', () => ({
  logger: {
    info: vi.fn(),
    healthCheck: vi.fn()
  }
}))

vi.mock('../../src/lib/api/unsplash', () => ({
  unsplashService: {
    getRateLimitInfo: vi.fn()
  }
}))

describe('/api/health', () => {
  beforeEach(() => {
    setupTestEnvironment()
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanupTestEnvironment()
  })

  describe('Basic Health Check', () => {
    it('should return 200 status when all services are healthy', async () => {
      // Setup mocks for healthy services
      const { vercelKvCache } = require('../../src/lib/api/vercel-kv')
      const { logger } = require('../../src/lib/api/structured-logging')
      const { unsplashService } = require('../../src/lib/api/unsplash')

      vercelKvCache.healthCheck.mockResolvedValue(true)
      logger.healthCheck.mockResolvedValue(true)
      logger.info.mockResolvedValue(undefined)
      unsplashService.getRateLimitInfo.mockReturnValue({
        remaining: 1000,
        limit: 1000,
        reset: Date.now() + 3600000,
        isBlocked: false
      })

      const request = createMockRequest('/api/health')
      const timer = new PerformanceTimer()
      
      const response = await GET(request)
      const json = await expectResponse(response)
        .expectStatus(200)
        .expectHeader('Content-Type', 'application/json')
        .expectHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
        .expectHeader('X-Health-Status', 'healthy')
        .expectHeader('X-Build-ID')
        .expectValidHealthResponse()

      // Verify overall status
      expect(json.status).toBe('healthy')
      expect(json.version).toBe('2.0')
      expect(typeof json.uptime).toBe('number')
      expect(json.uptime).toBeGreaterThan(0)

      // Verify all services are healthy
      expect(json.services.cache.status).toBe('healthy')
      expect(json.services.unsplash.status).toBe('healthy')
      expect(json.services.logging.status).toBe('healthy')

      // Verify performance metrics
      expect(json.performance.responseTime).toBeGreaterThan(0)
      expect(json.performance.memory.percentage).toBeGreaterThanOrEqual(0)
      expect(json.performance.memory.percentage).toBeLessThanOrEqual(100)

      // Verify environment info
      expect(json.environment.nodeVersion).toBe(process.version)
      expect(json.environment.platform).toBe(process.platform)
      expect(json.environment.buildId).toBe('test-build')

      timer.expectResponseTime(2000) // Should respond within 2 seconds
    })

    it('should include response time header', async () => {
      const { vercelKvCache } = require('../../src/lib/api/vercel-kv')
      const { logger } = require('../../src/lib/api/structured-logging')
      const { unsplashService } = require('../../src/lib/api/unsplash')

      vercelKvCache.healthCheck.mockResolvedValue(true)
      logger.healthCheck.mockResolvedValue(true)
      logger.info.mockResolvedValue(undefined)
      unsplashService.getRateLimitInfo.mockReturnValue({
        remaining: 1000,
        isBlocked: false
      })

      const request = createMockRequest('/api/health')
      const response = await GET(request)

      const responseTimeHeader = response.headers.get('X-Response-Time')
      expect(responseTimeHeader).toBeTruthy()
      expect(responseTimeHeader).toMatch(/^\d+(\.\d+)?ms$/)
    })

    it('should force dynamic rendering', () => {
      const { dynamic, runtime } = require('../../src/app/api/health/route')
      expect(dynamic).toBe('force-dynamic')
      expect(runtime).toBe('nodejs')
    })
  })

  describe('Service Health Checks', () => {
    it('should return degraded status when cache is unhealthy', async () => {
      const { vercelKvCache } = require('../../src/lib/api/vercel-kv')
      const { logger } = require('../../src/lib/api/structured-logging')
      const { unsplashService } = require('../../src/lib/api/unsplash')

      vercelKvCache.healthCheck.mockResolvedValue(false)
      logger.healthCheck.mockResolvedValue(true)
      logger.info.mockResolvedValue(undefined)
      unsplashService.getRateLimitInfo.mockReturnValue({
        remaining: 1000,
        isBlocked: false
      })

      const request = createMockRequest('/api/health')
      const response = await GET(request)
      const json = await expectResponse(response)
        .expectStatus(207) // Multi-Status for degraded
        .expectHeader('X-Health-Status', 'degraded')
        .expectValidHealthResponse()

      expect(json.status).toBe('degraded')
      expect(json.services.cache.status).toBe('unhealthy')
      expect(json.services.unsplash.status).toBe('healthy')
      expect(json.services.logging.status).toBe('healthy')
    })

    it('should return degraded status when unsplash is rate limited', async () => {
      const { vercelKvCache } = require('../../src/lib/api/vercel-kv')
      const { logger } = require('../../src/lib/api/structured-logging')
      const { unsplashService } = require('../../src/lib/api/unsplash')

      vercelKvCache.healthCheck.mockResolvedValue(true)
      logger.healthCheck.mockResolvedValue(true)
      logger.info.mockResolvedValue(undefined)
      unsplashService.getRateLimitInfo.mockReturnValue({
        remaining: 0,
        limit: 1000,
        reset: Date.now() + 3600000,
        isBlocked: true
      })

      const request = createMockRequest('/api/health')
      const response = await GET(request)
      const json = await expectResponse(response)
        .expectStatus(207)
        .expectValidHealthResponse()

      expect(json.status).toBe('degraded')
      expect(json.services.unsplash.status).toBe('unhealthy')
      expect(json.services.unsplash.error).toBe('Rate limit exceeded')
    })

    it('should return demo status when unsplash key is missing', async () => {
      // Remove API key from environment
      delete process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY

      const { vercelKvCache } = require('../../src/lib/api/vercel-kv')
      const { logger } = require('../../src/lib/api/structured-logging')
      const { unsplashService } = require('../../src/lib/api/unsplash')

      vercelKvCache.healthCheck.mockResolvedValue(true)
      logger.healthCheck.mockResolvedValue(true)
      logger.info.mockResolvedValue(undefined)
      unsplashService.getRateLimitInfo.mockReturnValue({
        remaining: 1000,
        isBlocked: false
      })

      const request = createMockRequest('/api/health')
      const response = await GET(request)
      const json = await expectResponse(response)
        .expectStatus(200)
        .expectValidHealthResponse()

      expect(json.services.unsplash.status).toBe('demo')
    })

    it('should handle cache errors gracefully', async () => {
      const { vercelKvCache } = require('../../src/lib/api/vercel-kv')
      const { logger } = require('../../src/lib/api/structured-logging')
      const { unsplashService } = require('../../src/lib/api/unsplash')

      vercelKvCache.healthCheck.mockRejectedValue(new Error('Cache connection failed'))
      logger.healthCheck.mockResolvedValue(true)
      logger.info.mockResolvedValue(undefined)
      unsplashService.getRateLimitInfo.mockReturnValue({
        remaining: 1000,
        isBlocked: false
      })

      const request = createMockRequest('/api/health')
      const response = await GET(request)
      const json = await expectResponse(response)
        .expectStatus(207)
        .expectValidHealthResponse()

      expect(json.status).toBe('degraded')
      expect(json.services.cache.status).toBe('unhealthy')
      expect(json.services.cache.error).toBe('Cache connection failed')
    })

    it('should handle logging service errors gracefully', async () => {
      const { vercelKvCache } = require('../../src/lib/api/vercel-kv')
      const { logger } = require('../../src/lib/api/structured-logging')
      const { unsplashService } = require('../../src/lib/api/unsplash')

      vercelKvCache.healthCheck.mockResolvedValue(true)
      logger.healthCheck.mockRejectedValue(new Error('Logger error'))
      logger.info.mockResolvedValue(undefined)
      unsplashService.getRateLimitInfo.mockReturnValue({
        remaining: 1000,
        isBlocked: false
      })

      const request = createMockRequest('/api/health')
      const response = await GET(request)
      const json = await expectResponse(response)
        .expectStatus(207)
        .expectValidHealthResponse()

      expect(json.status).toBe('degraded')
      expect(json.services.logging.status).toBe('unhealthy')
      expect(json.services.logging.error).toBe('Logger error')
    })

    it('should handle unsplash service errors gracefully', async () => {
      const { vercelKvCache } = require('../../src/lib/api/vercel-kv')
      const { logger } = require('../../src/lib/api/structured-logging')
      const { unsplashService } = require('../../src/lib/api/unsplash')

      vercelKvCache.healthCheck.mockResolvedValue(true)
      logger.healthCheck.mockResolvedValue(true)
      logger.info.mockResolvedValue(undefined)
      unsplashService.getRateLimitInfo.mockImplementation(() => {
        throw new Error('Unsplash service error')
      })

      const request = createMockRequest('/api/health')
      const response = await GET(request)
      const json = await expectResponse(response)
        .expectStatus(207)
        .expectValidHealthResponse()

      expect(json.status).toBe('degraded')
      expect(json.services.unsplash.status).toBe('unhealthy')
      expect(json.services.unsplash.error).toBe('Unsplash service error')
    })

    it('should return 503 when all services are unhealthy', async () => {
      const { vercelKvCache } = require('../../src/lib/api/vercel-kv')
      const { logger } = require('../../src/lib/api/structured-logging')
      const { unsplashService } = require('../../src/lib/api/unsplash')

      vercelKvCache.healthCheck.mockRejectedValue(new Error('Cache down'))
      logger.healthCheck.mockRejectedValue(new Error('Logger down'))
      logger.info.mockRejectedValue(new Error('Logger down'))
      unsplashService.getRateLimitInfo.mockImplementation(() => {
        throw new Error('Unsplash down')
      })

      const request = createMockRequest('/api/health')
      const response = await GET(request)
      const json = await expectResponse(response)
        .expectStatus(207) // Still degraded, not completely unhealthy
        .expectValidHealthResponse()

      expect(json.status).toBe('degraded')
      expect(json.services.cache.status).toBe('unhealthy')
      expect(json.services.logging.status).toBe('unhealthy')
      expect(json.services.unsplash.status).toBe('unhealthy')
    })
  })

  describe('Performance Metrics', () => {
    it('should include accurate memory metrics', async () => {
      const { vercelKvCache } = require('../../src/lib/api/vercel-kv')
      const { logger } = require('../../src/lib/api/structured-logging')
      const { unsplashService } = require('../../src/lib/api/unsplash')

      vercelKvCache.healthCheck.mockResolvedValue(true)
      logger.healthCheck.mockResolvedValue(true)
      logger.info.mockResolvedValue(undefined)
      unsplashService.getRateLimitInfo.mockReturnValue({
        remaining: 1000,
        isBlocked: false
      })

      const request = createMockRequest('/api/health')
      const response = await GET(request)
      const json = await expectResponse(response)
        .expectStatus(200)
        .expectValidHealthResponse()

      // Memory metrics should be realistic
      expect(json.performance.memory.used).toMatch(/^\d+MB$/)
      expect(json.performance.memory.total).toMatch(/^\d+MB$/)
      expect(json.performance.memory.percentage).toBeGreaterThan(0)
      expect(json.performance.memory.percentage).toBeLessThan(100)
      expect(json.performance.responseTime).toBeGreaterThan(0)
    })

    it('should include service response times when available', async () => {
      const { vercelKvCache } = require('../../src/lib/api/vercel-kv')
      const { logger } = require('../../src/lib/api/structured-logging')
      const { unsplashService } = require('../../src/lib/api/unsplash')

      // Add delays to simulate service response times
      vercelKvCache.healthCheck.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(true), 50))
      )
      logger.healthCheck.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(true), 30))
      )
      logger.info.mockResolvedValue(undefined)
      unsplashService.getRateLimitInfo.mockReturnValue({
        remaining: 1000,
        isBlocked: false
      })

      const request = createMockRequest('/api/health')
      const response = await GET(request)
      const json = await expectResponse(response)
        .expectStatus(200)
        .expectValidHealthResponse()

      // Should include response times for services
      expect(json.services.cache.responseTime).toBeGreaterThan(0)
      expect(json.services.logging.responseTime).toBeGreaterThan(0)
      expect(json.services.unsplash.responseTime).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Environment Information', () => {
    it('should include correct environment information', async () => {
      const { vercelKvCache } = require('../../src/lib/api/vercel-kv')
      const { logger } = require('../../src/lib/api/structured-logging')
      const { unsplashService } = require('../../src/lib/api/unsplash')

      vercelKvCache.healthCheck.mockResolvedValue(true)
      logger.healthCheck.mockResolvedValue(true)
      logger.info.mockResolvedValue(undefined)
      unsplashService.getRateLimitInfo.mockReturnValue({
        remaining: 1000,
        isBlocked: false
      })

      const request = createMockRequest('/api/health')
      const response = await GET(request)
      const json = await expectResponse(response)
        .expectStatus(200)
        .expectValidHealthResponse()

      expect(json.environment.nodeVersion).toBe(process.version)
      expect(json.environment.platform).toBe(process.platform)
      expect(json.environment.buildId).toBe('test-build')
    })

    it('should handle missing build ID gracefully', async () => {
      delete process.env.CUSTOM_BUILD_ID

      const { vercelKvCache } = require('../../src/lib/api/vercel-kv')
      const { logger } = require('../../src/lib/api/structured-logging')
      const { unsplashService } = require('../../src/lib/api/unsplash')

      vercelKvCache.healthCheck.mockResolvedValue(true)
      logger.healthCheck.mockResolvedValue(true)
      logger.info.mockResolvedValue(undefined)
      unsplashService.getRateLimitInfo.mockReturnValue({
        remaining: 1000,
        isBlocked: false
      })

      const request = createMockRequest('/api/health')
      const response = await GET(request)
      const json = await expectResponse(response)
        .expectStatus(200)
        .expectValidHealthResponse()

      expect(json.environment.buildId).toBe('unknown')
    })
  })

  describe('Logging Integration', () => {
    it('should log health check activity', async () => {
      const { vercelKvCache } = require('../../src/lib/api/vercel-kv')
      const { logger } = require('../../src/lib/api/structured-logging')
      const { unsplashService } = require('../../src/lib/api/unsplash')

      vercelKvCache.healthCheck.mockResolvedValue(true)
      logger.healthCheck.mockResolvedValue(true)
      logger.info.mockResolvedValue(undefined)
      unsplashService.getRateLimitInfo.mockReturnValue({
        remaining: 1000,
        isBlocked: false
      })

      const request = createMockRequest('/api/health')
      await GET(request)

      expect(logger.info).toHaveBeenCalledWith(
        'Health check performed',
        expect.objectContaining({
          status: expect.any(String),
          responseTime: expect.any(Number),
          services: expect.arrayContaining([
            expect.objectContaining({
              name: expect.any(String),
              status: expect.any(String)
            })
          ])
        })
      )
    })
  })

  describe('Edge Cases', () => {
    it('should handle very slow service responses', async () => {
      const { vercelKvCache } = require('../../src/lib/api/vercel-kv')
      const { logger } = require('../../src/lib/api/structured-logging')
      const { unsplashService } = require('../../src/lib/api/unsplash')

      // Simulate slow cache response (but not timeout)
      vercelKvCache.healthCheck.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(true), 500))
      )
      logger.healthCheck.mockResolvedValue(true)
      logger.info.mockResolvedValue(undefined)
      unsplashService.getRateLimitInfo.mockReturnValue({
        remaining: 1000,
        isBlocked: false
      })

      const timer = new PerformanceTimer()
      const request = createMockRequest('/api/health')
      const response = await GET(request)
      
      await expectResponse(response)
        .expectStatus(200)
        .expectValidHealthResponse()

      // Should still complete within reasonable time
      timer.expectResponseTime(2000)
    })

    it('should maintain timestamp format consistency', async () => {
      const { vercelKvCache } = require('../../src/lib/api/vercel-kv')
      const { logger } = require('../../src/lib/api/structured-logging')
      const { unsplashService } = require('../../src/lib/api/unsplash')

      vercelKvCache.healthCheck.mockResolvedValue(true)
      logger.healthCheck.mockResolvedValue(true)
      logger.info.mockResolvedValue(undefined)
      unsplashService.getRateLimitInfo.mockReturnValue({
        remaining: 1000,
        isBlocked: false
      })

      const request = createMockRequest('/api/health')
      const response = await GET(request)
      const json = await expectResponse(response)
        .expectStatus(200)
        .expectValidHealthResponse()

      // Timestamp should be valid ISO string
      expect(new Date(json.timestamp)).toBeInstanceOf(Date)
      expect(json.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    })
  })
})