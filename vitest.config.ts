/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.{test,spec}.{js,ts,tsx}'],
    exclude: ['node_modules', 'dist', '.next', 'tests/e2e/**'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*'],
      exclude: [
        'src/app/**', // Next.js app directory (tested via E2E)
        'src/**/*.d.ts',
        'src/**/*.stories.*',
        'src/**/*.test.*',
        'src/**/*.spec.*'
      ],
      thresholds: {
        global: {
          statements: 80,
          branches: 75,
          functions: 80,
          lines: 80
        }
      }
    },
    testTimeout: 30000,
    hookTimeout: 30000
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  }
})