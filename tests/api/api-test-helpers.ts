/**
 * Enhanced API test helpers and utilities
 * Extends base test utilities with API-specific functionality
 */

import { NextRequest, NextResponse } from 'next/server'
import { expect } from 'vitest'

export interface MockUser {
  id: string
  email: string
  subscription_status?: 'free' | 'pro' | 'enterprise'
  emailConfirmed?: boolean
}

export interface MockSession {
  access_token: string
  refresh_token: string
  expires_at: number
  user?: MockUser
}

/**
 * Create authenticated request with mock user
 */
export function createAuthenticatedRequest(
  url: string,
  options: {
    method?: string
    headers?: Record<string, string>
    body?: any
    user?: MockUser
    session?: MockSession
  } = {}
): NextRequest {
  const fullUrl = new URL(url, 'http://localhost:3000')

  const user = options.user || {
    id: 'test-user-123',
    email: 'test@example.com',
    subscription_status: 'free',
    emailConfirmed: true
  }

  const session = options.session || {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_at: Date.now() / 1000 + 3600,
    user
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
    ...options.headers
  }

  const requestInit: RequestInit = {
    method: options.method || 'GET',
    headers
  }

  if (options.body) {
    requestInit.body = typeof options.body === 'string'
      ? options.body
      : JSON.stringify(options.body)
  }

  const request = new NextRequest(fullUrl, requestInit)

  // Attach user to request (mimics auth middleware)
  ;(request as any).user = user
  ;(request as any).session = session

  return request
}

/**
 * API response assertion helpers
 */
export class APIResponseAssertions {
  constructor(private response: NextResponse) {}

  async expectSuccess(expectedStatus: number = 200): Promise<any> {
    expect(this.response.status).toBe(expectedStatus)
    const json = await this.response.json()
    expect(json.success).toBe(true)
    return json
  }

  async expectError(expectedStatus: number, errorMessage?: string): Promise<any> {
    expect(this.response.status).toBe(expectedStatus)
    const json = await this.response.json()
    expect(json.success).toBe(false)
    expect(json.error).toBeTruthy()

    if (errorMessage) {
      expect(json.error).toContain(errorMessage)
    }

    return json
  }

  async expectValidationError(field?: string): Promise<any> {
    const json = await this.expectError(400)
    expect(json.errors || json.details).toBeTruthy()

    if (field) {
      const errors = json.errors || json.details
      const hasFieldError = Array.isArray(errors)
        ? errors.some((e: any) => e.field === field)
        : errors[field] !== undefined
      expect(hasFieldError).toBe(true)
    }

    return json
  }

  expectSecurityHeaders(): this {
    expect(this.response.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(this.response.headers.get('X-Frame-Options')).toBeTruthy()
    return this
  }

  expectCacheHeaders(maxAge?: number): this {
    const cacheControl = this.response.headers.get('Cache-Control')
    expect(cacheControl).toBeTruthy()

    if (maxAge !== undefined) {
      expect(cacheControl).toContain(`max-age=${maxAge}`)
    }

    return this
  }

  expectPerformanceHeaders(): this {
    expect(this.response.headers.get('X-Response-Time')).toBeTruthy()
    return this
  }

  expectRateLimitHeaders(): this {
    const remaining = this.response.headers.get('X-Rate-Limit-Remaining')
    if (remaining) {
      expect(parseInt(remaining)).toBeGreaterThanOrEqual(0)
    }
    return this
  }
}

/**
 * Create API response assertions
 */
export function expectAPIResponse(response: NextResponse): APIResponseAssertions {
  return new APIResponseAssertions(response)
}

/**
 * Mock data generators for API testing
 */
export const apiMockData = {
  description: (overrides?: Partial<any>) => ({
    id: 'desc-123',
    imageId: 'img-123',
    style: 'narrativo',
    content: 'A beautiful landscape with mountains',
    language: 'english',
    createdAt: new Date().toISOString(),
    ...overrides
  }),

  image: (overrides?: Partial<any>) => ({
    id: 'test-img-1',
    urls: {
      regular: 'https://images.unsplash.com/test',
      small: 'https://images.unsplash.com/test-small',
      thumb: 'https://images.unsplash.com/test-thumb'
    },
    alt_description: 'Test image',
    user: { name: 'Test User', username: 'testuser' },
    width: 1920,
    height: 1080,
    ...overrides
  }),

  question: (overrides?: Partial<any>) => ({
    id: 'q-123',
    descriptionId: 'desc-123',
    question: 'What is shown in the image?',
    answer: 'A beautiful landscape',
    difficulty: 'medium',
    createdAt: new Date().toISOString(),
    ...overrides
  }),

  phrase: (overrides?: Partial<any>) => ({
    id: 'phrase-123',
    text: 'beautiful landscape',
    frequency: 2,
    language: 'english',
    category: 'descriptive',
    ...overrides
  }),

  user: (overrides?: Partial<MockUser>): MockUser => ({
    id: 'user-123',
    email: 'test@example.com',
    subscription_status: 'free',
    emailConfirmed: true,
    ...overrides
  }),

  session: (overrides?: Partial<MockSession>): MockSession => ({
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_at: Date.now() / 1000 + 3600,
    ...overrides
  })
}

/**
 * Performance testing helper
 */
export class APIPerformanceTimer {
  private startTime: number
  private checkpoints: Map<string, number>

  constructor() {
    this.startTime = performance.now()
    this.checkpoints = new Map()
  }

  checkpoint(name: string): void {
    this.checkpoints.set(name, performance.now() - this.startTime)
  }

  elapsed(): number {
    return performance.now() - this.startTime
  }

  getCheckpoint(name: string): number | undefined {
    return this.checkpoints.get(name)
  }

  expectResponseTime(maxMs: number, checkpointName?: string): void {
    const time = checkpointName
      ? this.checkpoints.get(checkpointName) || 0
      : this.elapsed()

    expect(time).toBeLessThan(maxMs)
  }

  expectCheckpointBefore(checkpoint: string, maxMs: number): void {
    const time = this.checkpoints.get(checkpoint)
    expect(time).toBeDefined()
    expect(time!).toBeLessThan(maxMs)
  }
}

/**
 * Rate limit testing helper
 */
export class RateLimitTester {
  private requests: number = 0
  private resetTime: number = Date.now() + 60000

  async makeRequest(
    requestFn: () => Promise<NextResponse>,
    limit: number
  ): Promise<{ exceeded: boolean; response?: NextResponse }> {
    this.requests++

    if (this.requests > limit) {
      return { exceeded: true }
    }

    if (Date.now() > this.resetTime) {
      this.requests = 1
      this.resetTime = Date.now() + 60000
    }

    const response = await requestFn()
    return { exceeded: false, response }
  }

  reset(): void {
    this.requests = 0
    this.resetTime = Date.now() + 60000
  }
}

/**
 * Batch request testing helper
 */
export async function sendBatchRequests(
  requests: NextRequest[],
  handler: (req: NextRequest) => Promise<NextResponse>
): Promise<NextResponse[]> {
  return Promise.all(requests.map(req => handler(req)))
}

/**
 * Mock external service responses
 */
export const mockAPIServices = {
  openai: {
    success: (text: string = 'Generated description') => ({
      text,
      wordCount: text.split(' ').length
    }),
    error: (message: string = 'API Error') => {
      throw new Error(message)
    }
  },

  unsplash: {
    success: (count: number = 1) => ({
      images: Array.from({ length: count }, (_, i) => apiMockData.image({ id: `img-${i}` })),
      total: count * 10,
      totalPages: 10
    }),
    error: (status: number = 500) => {
      const error = new Error('Unsplash API Error') as any
      error.response = { status }
      throw error
    }
  },

  supabase: {
    success: (user: MockUser) => ({
      data: { user, session: apiMockData.session({ user }) },
      error: null
    }),
    error: (message: string, status: number = 401) => ({
      data: null,
      error: { message, status }
    })
  }
}
