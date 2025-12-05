/**
 * Vitest Global Setup File
 * Sets up the testing environment with necessary polyfills and mocks
 */

import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// Mock Supabase client BEFORE any imports that might use it
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
      signUp: vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: null, error: null }),
        download: vi.fn().mockResolvedValue({ data: null, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://test.supabase.co/storage/v1/object/public/test' } }),
      })),
    },
  })),
}))

// Mock RuVector native module
vi.mock('ruvector', () => ({
  RuVector: class MockRuVector {
    constructor() {}
    async connect() { return true }
    async disconnect() { return true }
    async createCollection() { return { success: true } }
    async insertVectors() { return { success: true, ids: ['mock-id'] } }
    async search() { return { results: [] } }
    async deleteCollection() { return { success: true } }
  },
  default: {
    RuVector: class MockRuVector {
      constructor() {}
      async connect() { return true }
      async disconnect() { return true }
      async createCollection() { return { success: true } }
      async insertVectors() { return { success: true, ids: ['mock-id'] } }
      async search() { return { results: [] } }
      async deleteCollection() { return { success: true } }
    },
  },
}))

// Cleanup after each test case
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return []
  }
  unobserve() {}
} as any

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
    key: (index: number) => {
      const keys = Object.keys(store)
      return keys[index] || null
    },
    get length() {
      return Object.keys(store).length
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock,
  writable: true,
})

// Mock fetch if not available
if (!global.fetch) {
  global.fetch = vi.fn()
}

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn(),
  log: vi.fn(),
  debug: vi.fn(),
}

// Setup environment variables
process.env.NODE_ENV = 'test'
process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY = 'demo-test-key'
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key-mock-value'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.OPENAI_API_KEY = 'test-openai-key'
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key'
process.env.RUVECTOR_API_KEY = 'test-ruvector-key'
process.env.RUVECTOR_ENDPOINT = 'http://localhost:6333'
process.env.REDIS_URL = 'redis://localhost:6379'
process.env.SENTRY_DSN = ''
process.env.NEXT_PUBLIC_SENTRY_DSN = ''
