/**
 * Test utilities for API endpoint testing
 */

import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { expect } from 'vitest'

// Mock environment variables for testing
export const mockEnvironment = {
  NEXT_PUBLIC_UNSPLASH_ACCESS_KEY: 'test_key',
  NODE_ENV: 'test',
  CUSTOM_BUILD_ID: 'test-build'
}

// Test request helper
export function createMockRequest(
  url: string,
  options: {
    method?: string
    headers?: Record<string, string>
    body?: any
    searchParams?: Record<string, string>
  } = {}
): NextRequest {
  const fullUrl = new URL(url, 'http://localhost:3000')
  
  // Add search params
  if (options.searchParams) {
    Object.entries(options.searchParams).forEach(([key, value]) => {
      fullUrl.searchParams.set(key, value)
    })
  }

  const requestInit: RequestInit = {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Vitest/Test-Runner',
      ...options.headers
    }
  }

  if (options.body) {
    requestInit.body = typeof options.body === 'string' 
      ? options.body 
      : JSON.stringify(options.body)
  }

  return new NextRequest(fullUrl, {
    ...requestInit,
    signal: requestInit.signal || undefined
  })
}

// Response assertion helpers
export class ResponseAssertions {
  constructor(private response: NextResponse) {}

  expectStatus(expectedStatus: number): this {
    expect(this.response.status).toBe(expectedStatus)
    return this
  }

  expectHeader(name: string, expectedValue?: string): this {
    const headerValue = this.response.headers.get(name)
    expect(headerValue).toBeTruthy()
    if (expectedValue) {
      expect(headerValue).toBe(expectedValue)
    }
    return this
  }

  expectHeaderContains(name: string, expectedSubstring: string): this {
    const headerValue = this.response.headers.get(name)
    expect(headerValue).toBeTruthy()
    expect(headerValue).toContain(expectedSubstring)
    return this
  }

  expectCorsHeaders(): this {
    this.expectHeader('Access-Control-Allow-Origin', '*')
    this.expectHeader('Access-Control-Allow-Methods')
    this.expectHeader('Access-Control-Allow-Headers')
    return this
  }

  async expectJson(): Promise<any> {
    const contentType = this.response.headers.get('Content-Type')
    expect(contentType).toContain('application/json')
    return await this.response.json()
  }

  async expectValidImageSearchResponse(): Promise<any> {
    const json = await this.expectJson()
    
    // Validate structure
    expect(json).toHaveProperty('images')
    expect(json).toHaveProperty('total')
    expect(json).toHaveProperty('totalPages')
    expect(json).toHaveProperty('currentPage')
    expect(json).toHaveProperty('hasNextPage')
    
    // Validate types
    expect(Array.isArray(json.images)).toBe(true)
    expect(typeof json.total).toBe('number')
    expect(typeof json.totalPages).toBe('number')
    expect(typeof json.currentPage).toBe('number')
    expect(typeof json.hasNextPage).toBe('boolean')

    // Validate each image if present
    if (json.images.length > 0) {
      json.images.forEach((image: any, index: number) => {
        expect(image).toHaveProperty('id')
        expect(image).toHaveProperty('urls')
        expect(image).toHaveProperty('user')
        expect(image).toHaveProperty('width')
        expect(image).toHaveProperty('height')
        expect(image.urls).toHaveProperty('regular')
        expect(image.urls).toHaveProperty('small')
        expect(image.urls).toHaveProperty('thumb')
        expect(image.user).toHaveProperty('username')
        expect(image.user).toHaveProperty('name')
      })
    }
    
    return json
  }

  async expectValidHealthResponse(): Promise<any> {
    const json = await this.expectJson()
    
    // Validate structure
    expect(json).toHaveProperty('status')
    expect(json).toHaveProperty('timestamp')
    expect(json).toHaveProperty('uptime')
    expect(json).toHaveProperty('version')
    expect(json).toHaveProperty('services')
    expect(json).toHaveProperty('performance')
    expect(json).toHaveProperty('environment')
    
    // Validate services structure
    expect(json.services).toHaveProperty('cache')
    expect(json.services).toHaveProperty('unsplash')
    expect(json.services).toHaveProperty('logging')
    
    // Validate each service has status
    Object.values(json.services).forEach((service: any) => {
      expect(service).toHaveProperty('status')
      expect(['healthy', 'unhealthy', 'demo']).toContain(service.status)
    })
    
    // Validate performance structure
    expect(json.performance).toHaveProperty('memory')
    expect(json.performance).toHaveProperty('responseTime')
    expect(json.performance.memory).toHaveProperty('used')
    expect(json.performance.memory).toHaveProperty('total')
    expect(json.performance.memory).toHaveProperty('percentage')
    
    // Validate environment
    expect(json.environment).toHaveProperty('nodeVersion')
    expect(json.environment).toHaveProperty('platform')
    expect(json.environment).toHaveProperty('buildId')
    
    return json
  }

  async expectErrorResponse(): Promise<any> {
    const json = await this.expectJson()
    expect(json).toHaveProperty('error')
    expect(json).toHaveProperty('timestamp')
    return json
  }
}

// Create assertion helper
export function expectResponse(response: NextResponse): ResponseAssertions {
  return new ResponseAssertions(response)
}

// Mock service responses
export const mockServiceResponses = {
  unsplash: {
    success: {
      results: [
        {
          id: 'test-image-1',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
          width: 1920,
          height: 1080,
          color: '#4A90E2',
          blur_hash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
          description: 'Test image description',
          alt_description: 'Test alt description',
          likes: 100,
          liked_by_user: false,
          urls: {
            raw: 'https://images.unsplash.com/test-raw',
            full: 'https://images.unsplash.com/test-full',
            regular: 'https://images.unsplash.com/test-regular',
            small: 'https://images.unsplash.com/test-small',
            thumb: 'https://images.unsplash.com/test-thumb',
            small_s3: 'https://images.unsplash.com/test-small-s3'
          },
          links: {
            self: 'https://api.unsplash.com/photos/test-image-1',
            html: 'https://unsplash.com/photos/test-image-1',
            download: 'https://unsplash.com/photos/test-image-1/download',
            download_location: 'https://api.unsplash.com/photos/test-image-1/download'
          },
          user: {
            id: 'test-user-1',
            username: 'testuser',
            name: 'Test User',
            first_name: 'Test',
            last_name: 'User',
            instagram_username: 'testuser',
            twitter_username: 'testuser',
            portfolio_url: 'https://testuser.com',
            bio: 'Test photographer',
            location: 'Test City',
            total_likes: 1000,
            total_photos: 100,
            accepted_tos: true,
            profile_image: {
              small: 'https://images.unsplash.com/profile-small',
              medium: 'https://images.unsplash.com/profile-medium',
              large: 'https://images.unsplash.com/profile-large'
            },
            links: {
              self: 'https://api.unsplash.com/users/testuser',
              html: 'https://unsplash.com/@testuser',
              photos: 'https://api.unsplash.com/users/testuser/photos',
              likes: 'https://api.unsplash.com/users/testuser/likes',
              portfolio: 'https://unsplash.com/@testuser/portfolio'
            }
          }
        }
      ],
      total: 100,
      total_pages: 5
    },
    error: {
      message: 'API Error',
      errors: ['Invalid access token']
    }
  }
}

// Performance timing helper
export class PerformanceTimer {
  private startTime: number

  constructor() {
    this.startTime = performance.now()
  }

  elapsed(): number {
    return performance.now() - this.startTime
  }

  expectResponseTime(maxMs: number): void {
    const elapsed = this.elapsed()
    expect(elapsed).toBeLessThan(maxMs)
  }
}

// Memory usage helper
export function getMemoryUsage(): NodeJS.MemoryUsage {
  return process.memoryUsage()
}

// Test data generators
export const testDataGenerators = {
  validSearchParams: () => ({
    query: 'nature',
    page: '1',
    per_page: '20',
    orientation: 'landscape' as const,
    color: 'blue',
    orderBy: 'relevant' as const
  }),

  invalidSearchParams: () => [
    { query: '', error: 'Query cannot be empty' },
    { query: 'a'.repeat(101), error: 'Query too long' },
    { page: '0', error: 'Page must be >= 1' },
    { page: 'invalid', error: 'Page must be a number' },
    { per_page: '0', error: 'per_page must be >= 1' },
    { per_page: '31', error: 'per_page must be <= 30' },
    { orientation: 'invalid', error: 'Invalid orientation' },
    { orderBy: 'invalid', error: 'Invalid orderBy' }
  ],

  rateLimitHeaders: () => ({
    'x-ratelimit-limit': '1000',
    'x-ratelimit-remaining': '999',
    'x-ratelimit-reset': (Date.now() / 1000 + 3600).toString()
  })
}

// Mock external services
export const mockExternalServices = {
  unsplashApi: {
    mockSuccess: () => {
      // This would typically use vi.mock or similar
      return mockServiceResponses.unsplash.success
    },
    mockError: (status: number = 500) => {
      throw new Error(`HTTP ${status}: API Error`)
    },
    mockRateLimit: () => {
      const error = new Error('Rate limit exceeded') as any
      error.response = { status: 429 }
      throw error
    }
  },

  cache: {
    mockHealthy: () => true,
    mockUnhealthy: () => false,
    mockError: () => {
      throw new Error('Cache connection failed')
    }
  },

  logger: {
    mockHealthy: () => true,
    mockUnhealthy: () => false,
    mockError: () => {
      throw new Error('Logger error')
    }
  }
}

// Cleanup helper for tests
export function cleanupTestEnvironment(): void {
  // Reset any global state
  // Note: vi.clearAllMocks() should be called in individual test files
  
  // Reset environment variables
  Object.keys(mockEnvironment).forEach(key => {
    delete process.env[key]
  })
}

// Setup helper for tests
export function setupTestEnvironment(env: Partial<typeof mockEnvironment> = {}): void {
  Object.assign(process.env, { ...mockEnvironment, ...env })
}