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
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000'
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
