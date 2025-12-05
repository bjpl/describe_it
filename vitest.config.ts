import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/cypress/**',
      '**/e2e/**',
      '**/staging/**',
      '**/.{idea,git,cache,output,temp}/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        '**/.{idea,git,cache,output,temp}/**'
      ]
    },
    // Environment variables for tests
    env: {
      NODE_ENV: 'test',
      NEXT_PUBLIC_UNSPLASH_ACCESS_KEY: 'demo-test-key',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key-mock-value',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
      OPENAI_API_KEY: 'test-openai-key',
      ANTHROPIC_API_KEY: 'test-anthropic-key',
      RUVECTOR_API_KEY: 'test-ruvector-key',
      RUVECTOR_ENDPOINT: 'http://localhost:6333',
      REDIS_URL: 'redis://localhost:6379',
      SENTRY_DSN: '',
      NEXT_PUBLIC_SENTRY_DSN: '',
    },
    // Increase timeout for integration tests
    testTimeout: 10000,
    hookTimeout: 10000,
    // Retry flaky tests
    retry: 1
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
