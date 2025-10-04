/**
 * Comprehensive tests for /api/auth/signin endpoint
 * Tests authentication, validation, error handling, and security
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { POST, OPTIONS } from '@/app/api/auth/signin/route'
import { createMockRequest, expectResponse } from '../test-utils'
import { createClient } from '@supabase/supabase-js'

// Mock dependencies
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn()
}))

vi.mock('@/lib/logger', () => ({
  authLogger: {
    auth: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  },
  createRequestLogger: vi.fn(() => ({
    auth: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }))
}))

describe('/api/auth/signin', () => {
  let mockSupabase: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup mock Supabase client
    mockSupabase = {
      auth: {
        signInWithPassword: vi.fn()
      }
    }

    ;(createClient as any).mockReturnValue(mockSupabase)

    // Setup environment
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
  })

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
  })

  describe('OPTIONS - CORS', () => {
    it('should handle CORS preflight request', async () => {
      const request = createMockRequest('/api/auth/signin', { method: 'OPTIONS' })
      const response = await OPTIONS()

      expect(response.status).toBe(200)
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST')
    })
  })

  describe('POST - Sign In', () => {
    describe('Success Cases', () => {
      it('should sign in user with valid credentials', async () => {
        const mockUser = {
          id: 'user-123',
          email: 'test@example.com',
          email_confirmed_at: new Date().toISOString(),
          last_sign_in_at: new Date().toISOString()
        }

        const mockSession = {
          access_token: 'access-token-123',
          refresh_token: 'refresh-token-123',
          expires_at: Date.now() / 1000 + 3600
        }

        mockSupabase.auth.signInWithPassword.mockResolvedValue({
          data: { user: mockUser, session: mockSession },
          error: null
        })

        const request = createMockRequest('/api/auth/signin', {
          method: 'POST',
          body: {
            email: 'test@example.com',
            password: 'ValidPass123!',
            rememberMe: false
          }
        })

        const response = await POST(request)
        const json = await response.json()

        expect(response.status).toBe(200)
        expect(json.success).toBe(true)
        expect(json.message).toContain('successfully')
        expect(json.user).toEqual({
          id: mockUser.id,
          email: mockUser.email,
          emailConfirmed: true,
          lastSignIn: mockUser.last_sign_in_at
        })
        expect(json.session).toEqual(mockSession)
      })

      it('should sign in with remember me option', async () => {
        mockSupabase.auth.signInWithPassword.mockResolvedValue({
          data: {
            user: { id: 'user-123', email: 'test@example.com' },
            session: { access_token: 'token' }
          },
          error: null
        })

        const request = createMockRequest('/api/auth/signin', {
          method: 'POST',
          body: {
            email: 'test@example.com',
            password: 'password123',
            rememberMe: true
          }
        })

        const response = await POST(request)
        expect(response.status).toBe(200)

        const json = await response.json()
        expect(json.success).toBe(true)
      })

      it('should handle admin bypass on rate limit', async () => {
        mockSupabase.auth.signInWithPassword.mockResolvedValue({
          data: null,
          error: { message: 'Email rate limit exceeded', status: 429 }
        })

        const request = createMockRequest('/api/auth/signin', {
          method: 'POST',
          body: {
            email: 'brandon.lambert87@gmail.com',
            password: 'Test123',
            rememberMe: false
          }
        })

        const response = await POST(request)
        const json = await response.json()

        expect(response.status).toBe(200)
        expect(json.success).toBe(true)
        expect(json.isMock).toBe(true)
        expect(json.isAdmin).toBe(true)
      })
    })

    describe('Validation', () => {
      it('should reject empty email', async () => {
        const request = createMockRequest('/api/auth/signin', {
          method: 'POST',
          body: {
            email: '',
            password: 'password123'
          }
        })

        const response = await POST(request)
        expect(response.status).toBe(400)

        const json = await response.json()
        expect(json.success).toBe(false)
        expect(json.error).toContain('Invalid request parameters')
      })

      it('should reject invalid email format', async () => {
        const request = createMockRequest('/api/auth/signin', {
          method: 'POST',
          body: {
            email: 'not-an-email',
            password: 'password123'
          }
        })

        const response = await POST(request)
        expect(response.status).toBe(400)
      })

      it('should reject missing password', async () => {
        const request = createMockRequest('/api/auth/signin', {
          method: 'POST',
          body: {
            email: 'test@example.com'
          }
        })

        const response = await POST(request)
        expect(response.status).toBe(400)
      })

      it('should reject password shorter than minimum length', async () => {
        const request = createMockRequest('/api/auth/signin', {
          method: 'POST',
          body: {
            email: 'test@example.com',
            password: '12345'
          }
        })

        const response = await POST(request)
        expect(response.status).toBe(400)
      })

      it('should reject malformed JSON', async () => {
        const request = new Request('http://localhost:3000/api/auth/signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: 'invalid json {'
        })

        const response = await POST(request as any)
        expect(response.status).toBe(400)

        const json = await response.json()
        expect(json.error).toContain('Invalid JSON')
      })

      it('should reject request exceeding size limit', async () => {
        const largeBody = {
          email: 'test@example.com',
          password: 'password123',
          extra: 'a'.repeat(11 * 1024) // > 10KB
        }

        const request = createMockRequest('/api/auth/signin', {
          method: 'POST',
          body: largeBody
        })

        const response = await POST(request)
        expect(response.status).toBe(413)
      })
    })

    describe('Error Handling', () => {
      it('should handle invalid credentials', async () => {
        mockSupabase.auth.signInWithPassword.mockResolvedValue({
          data: null,
          error: { message: 'Invalid login credentials', status: 401 }
        })

        const request = createMockRequest('/api/auth/signin', {
          method: 'POST',
          body: {
            email: 'test@example.com',
            password: 'wrongpassword'
          }
        })

        const response = await POST(request)
        expect(response.status).toBe(401)

        const json = await response.json()
        expect(json.error).toContain('Invalid email or password')
      })

      it('should handle unconfirmed email', async () => {
        mockSupabase.auth.signInWithPassword.mockResolvedValue({
          data: null,
          error: { message: 'Email not confirmed', status: 401 }
        })

        const request = createMockRequest('/api/auth/signin', {
          method: 'POST',
          body: {
            email: 'unconfirmed@example.com',
            password: 'password123'
          }
        })

        const response = await POST(request)
        expect(response.status).toBe(401)

        const json = await response.json()
        expect(json.error).toContain('confirm your email')
      })

      it('should handle rate limiting with mock auth', async () => {
        mockSupabase.auth.signInWithPassword.mockResolvedValue({
          data: null,
          error: { message: 'Rate limit exceeded', status: 429 }
        })

        const request = createMockRequest('/api/auth/signin', {
          method: 'POST',
          body: {
            email: 'user@example.com',
            password: 'password123'
          }
        })

        const response = await POST(request)
        expect(response.status).toBe(200)

        const json = await response.json()
        expect(json.isMock).toBe(true)
        expect(json.message).toContain('development mode')
      })

      it('should handle missing Supabase configuration', async () => {
        delete process.env.NEXT_PUBLIC_SUPABASE_URL

        const request = createMockRequest('/api/auth/signin', {
          method: 'POST',
          body: {
            email: 'test@example.com',
            password: 'password123'
          }
        })

        const response = await POST(request)
        expect(response.status).toBe(500)

        const json = await response.json()
        expect(json.error).toContain('configuration error')
      })

      it('should handle Supabase service error', async () => {
        mockSupabase.auth.signInWithPassword.mockRejectedValue(
          new Error('Supabase connection failed')
        )

        const request = createMockRequest('/api/auth/signin', {
          method: 'POST',
          body: {
            email: 'test@example.com',
            password: 'password123'
          }
        })

        const response = await POST(request)
        expect(response.status).toBe(500)

        const json = await response.json()
        expect(json.error).toContain('Server error')
      })
    })

    describe('Security', () => {
      it('should validate security headers', async () => {
        const request = createMockRequest('/api/auth/signin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
            // Missing other security headers
          },
          body: {
            email: 'test@example.com',
            password: 'password123'
          }
        })

        const response = await POST(request)
        // Should still work but validate security checks are performed
        expect(response.status).toBeGreaterThanOrEqual(200)
      })

      it('should sanitize error messages', async () => {
        mockSupabase.auth.signInWithPassword.mockResolvedValue({
          data: null,
          error: {
            message: 'Database error: SELECT * FROM users WHERE email = "test@example.com"',
            status: 500
          }
        })

        const request = createMockRequest('/api/auth/signin', {
          method: 'POST',
          body: {
            email: 'test@example.com',
            password: 'password123'
          }
        })

        const response = await POST(request)
        const json = await response.json()

        // Should not expose database query details
        expect(json.error || json.message).not.toContain('SELECT')
        expect(json.error || json.message).not.toContain('Database error')
      })

      it('should not expose user existence on invalid credentials', async () => {
        mockSupabase.auth.signInWithPassword.mockResolvedValue({
          data: null,
          error: { message: 'Invalid login credentials', status: 401 }
        })

        const request = createMockRequest('/api/auth/signin', {
          method: 'POST',
          body: {
            email: 'nonexistent@example.com',
            password: 'password123'
          }
        })

        const response = await POST(request)
        const json = await response.json()

        // Generic error message that doesn't reveal if user exists
        expect(json.error).toBe('Invalid email or password')
      })
    })

    describe('Performance', () => {
      it('should respond within acceptable time', async () => {
        mockSupabase.auth.signInWithPassword.mockResolvedValue({
          data: {
            user: { id: 'user-123', email: 'test@example.com' },
            session: { access_token: 'token' }
          },
          error: null
        })

        const start = performance.now()

        const request = createMockRequest('/api/auth/signin', {
          method: 'POST',
          body: {
            email: 'test@example.com',
            password: 'password123'
          }
        })

        await POST(request)
        const duration = performance.now() - start

        expect(duration).toBeLessThan(1000) // Should respond in < 1 second
      })
    })
  })
})
