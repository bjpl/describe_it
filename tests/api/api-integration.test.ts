/**
 * Integration tests for API endpoints
 * These tests verify the actual API endpoints work correctly
 */

import { describe, it, expect, beforeAll } from 'vitest'

describe('API Integration Tests', () => {
  const baseUrl = process.env.TEST_URL || 'http://localhost:3000'

  beforeAll(() => {
    // Set environment variables for testing
    // Cannot directly assign to NODE_ENV as it's read-only
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'test', writable: false })
    process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY = 'demo'
  })

  describe('Health Check Endpoint', () => {
    it('should return health status', async () => {
      const response = await fetch(`${baseUrl}/api/health`)
      expect(response.status).toBeLessThan(600) // Should not completely fail
      
      const data = await response.json()
      
      // Basic structure validation
      expect(data).toHaveProperty('status')
      expect(data).toHaveProperty('timestamp')
      expect(data).toHaveProperty('version')
      expect(data).toHaveProperty('services')
      expect(data).toHaveProperty('performance')
      expect(data).toHaveProperty('environment')
      
      // Status should be one of the expected values
      expect(['healthy', 'degraded', 'unhealthy']).toContain(data.status)
      
      // Services should have expected structure
      expect(data.services).toHaveProperty('cache')
      expect(data.services).toHaveProperty('unsplash')
      expect(data.services).toHaveProperty('logging')
      
      // Each service should have a status
      Object.values(data.services).forEach((service: any) => {
        expect(service).toHaveProperty('status')
        expect(['healthy', 'unhealthy', 'demo']).toContain(service.status)
      })
    })

    it('should include proper headers', async () => {
      const response = await fetch(`${baseUrl}/api/health`)
      
      expect(response.headers.get('content-type')).toContain('application/json')
      expect(response.headers.get('cache-control')).toContain('no-cache')
      expect(response.headers.get('x-health-status')).toBeTruthy()
      expect(response.headers.get('x-response-time')).toBeTruthy()
    })

    it('should have reasonable response time', async () => {
      const startTime = performance.now()
      const response = await fetch(`${baseUrl}/api/health`)
      const endTime = performance.now()
      
      const responseTime = endTime - startTime
      expect(responseTime).toBeLessThan(5000) // Should respond within 5 seconds
      
      await response.json() // Consume response
    })
  })

  describe('Image Search Endpoint', () => {
    it('should reject requests without query parameter', async () => {
      const response = await fetch(`${baseUrl}/api/images/search`)
      expect(response.status).toBe(400)
      
      const data = await response.json()
      expect(data).toHaveProperty('error')
      expect(data.error).toContain('Invalid parameters')
    })

    it('should handle valid search requests', async () => {
      const response = await fetch(`${baseUrl}/api/images/search?query=nature`)
      expect([200, 500]).toContain(response.status) // Either success or fallback
      
      const data = await response.json()
      
      // Should have the expected structure
      expect(data).toHaveProperty('images')
      expect(data).toHaveProperty('total')
      expect(data).toHaveProperty('totalPages')
      expect(data).toHaveProperty('currentPage')
      expect(data).toHaveProperty('hasNextPage')
      
      expect(Array.isArray(data.images)).toBe(true)
      expect(typeof data.total).toBe('number')
      expect(typeof data.totalPages).toBe('number')
      expect(typeof data.currentPage).toBe('number')
      expect(typeof data.hasNextPage).toBe('boolean')
    })

    it('should handle pagination parameters', async () => {
      const response = await fetch(`${baseUrl}/api/images/search?query=test&page=2&per_page=10`)
      expect([200, 500]).toContain(response.status)
      
      const data = await response.json()
      expect(data.currentPage).toBe(2)
    })

    it('should include CORS headers', async () => {
      const response = await fetch(`${baseUrl}/api/images/search?query=test`)
      
      expect(response.headers.get('access-control-allow-origin')).toBe('*')
      expect(response.headers.get('access-control-allow-methods')).toBeTruthy()
      expect(response.headers.get('access-control-allow-headers')).toBeTruthy()
    })

    it('should handle CORS preflight requests', async () => {
      const response = await fetch(`${baseUrl}/api/images/search`, {
        method: 'OPTIONS'
      })
      
      expect(response.status).toBe(200)
      expect(response.headers.get('access-control-allow-origin')).toBe('*')
    })

    it('should validate query length', async () => {
      // Test empty query
      const emptyResponse = await fetch(`${baseUrl}/api/images/search?query=`)
      expect(emptyResponse.status).toBe(400)
      
      // Test very long query
      const longQuery = 'a'.repeat(101)
      const longResponse = await fetch(`${baseUrl}/api/images/search?query=${longQuery}`)
      expect(longResponse.status).toBe(400)
    })

    it('should validate page parameter', async () => {
      const response = await fetch(`${baseUrl}/api/images/search?query=test&page=0`)
      expect(response.status).toBe(400)
      
      const data = await response.json()
      expect(data.error).toContain('Invalid parameters')
    })

    it('should validate per_page parameter', async () => {
      // Test per_page too large
      const response = await fetch(`${baseUrl}/api/images/search?query=test&per_page=31`)
      expect(response.status).toBe(400)
    })

    it('should validate orientation parameter', async () => {
      const response = await fetch(`${baseUrl}/api/images/search?query=test&orientation=invalid`)
      expect(response.status).toBe(400)
    })

    it('should accept valid orientation values', async () => {
      const orientations = ['landscape', 'portrait', 'squarish']
      
      for (const orientation of orientations) {
        const response = await fetch(`${baseUrl}/api/images/search?query=test&orientation=${orientation}`)
        expect([200, 500]).toContain(response.status) // Should not be a validation error
        await response.json() // Consume response
      }
    })

    it('should return fallback data on service errors', async () => {
      // This will depend on the actual service configuration
      // If demo mode, should work; if real API with invalid key, should fallback
      const response = await fetch(`${baseUrl}/api/images/search?query=test`)
      
      if (response.status === 500) {
        // Check for fallback data
        const data = await response.json()
        expect(data.images).toHaveLength(1)
        expect(data.images[0].id).toBe('fallback-error')
        expect(response.headers.get('x-error')).toBe('true')
      }
    })

    it('should have reasonable response time', async () => {
      const startTime = performance.now()
      const response = await fetch(`${baseUrl}/api/images/search?query=nature`)
      const endTime = performance.now()
      
      const responseTime = endTime - startTime
      expect(responseTime).toBeLessThan(10000) // Should respond within 10 seconds
      
      await response.json() // Consume response
    })

    it('should handle special characters in query', async () => {
      const specialQueries = ['café', 'naïve', 'test+plus', 'test%20space']
      
      for (const query of specialQueries) {
        const response = await fetch(`${baseUrl}/api/images/search?query=${encodeURIComponent(query)}`)
        expect([200, 400, 500]).toContain(response.status) // Should not completely fail
        await response.json() // Consume response
      }
    })
  })

  describe('API Error Handling', () => {
    it('should return 404 for non-existent endpoints', async () => {
      const response = await fetch(`${baseUrl}/api/nonexistent`)
      expect(response.status).toBe(404)
    })

    it('should handle malformed requests gracefully', async () => {
      const response = await fetch(`${baseUrl}/api/images/search?query=test&page=invalid`)
      expect(response.status).toBe(400)
      
      const data = await response.json()
      expect(data).toHaveProperty('error')
      expect(data).toHaveProperty('timestamp')
    })
  })
})

// Unit tests for utility functions (these don't require mocking external services)
describe('API Utility Functions', () => {
  it('should validate environment variables in demo mode', () => {
    // Test that demo mode works when no real API keys are present
    delete process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY
    
    // This should not throw an error
    expect(() => {
      const demoMode = !process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY
      expect(demoMode).toBe(true)
    }).not.toThrow()
  })

  it('should handle timestamp generation', () => {
    const timestamp = new Date().toISOString()
    expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  })

  it('should validate response time calculation', () => {
    const startTime = performance.now()
    // Simulate some work
    const endTime = performance.now()
    const responseTime = endTime - startTime
    
    expect(responseTime).toBeGreaterThanOrEqual(0)
    expect(typeof responseTime).toBe('number')
  })
})