/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['../tests/setup.ts'],
    include: ['../tests/**/*.{test,spec}.{js,ts,tsx}'],
    exclude: [
      'node_modules',
      'dist',
      '.next',
      '../tests/e2e/**',
      '../**/*.stories.*'
    ],
    coverage: {
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['../src/**/*'],
      exclude: [
        '../src/app/**', // Next.js app directory (tested via E2E)
        '../src/**/*.d.ts',
        '../src/**/*.stories.*',
        '../src/**/*.test.*',
        '../src/**/*.spec.*',
        '../src/**/types.ts',
        '../src/**/constants.ts'
      ],
      thresholds: {
        global: {
          statements: 80,
          branches: 75,
          functions: 80,
          lines: 80
        }
      },
      reportOnFailure: true,
      skipFull: false
    },
    testTimeout: 15000,
    hookTimeout: 15000,
    reporters: ['verbose', 'junit'],
    outputFile: {
      junit: './coverage/junit.xml'
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '../src')
    }
  }
})