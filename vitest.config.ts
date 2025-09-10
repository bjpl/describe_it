/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic',
      jsxImportSource: 'react'
    })
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.tsx', './tests/test-config.ts'],
    include: ['tests/**/*.{test,spec}.{js,ts,tsx}'],
    exclude: ['node_modules', 'dist', '.next', 'tests/e2e/**'],
    coverage: {
      provider: 'v8',
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
    hookTimeout: 30000,
    // React 19 and Next.js 15 compatibility
    server: {
      deps: {
        external: ['next'],
        inline: ['@testing-library/react']
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(fileURLToPath(new URL('./src', import.meta.url)))
    }
  },
  // ESM compatibility
  define: {
    'import.meta.vitest': undefined
  },
  esbuild: {
    target: 'node20',
    jsx: 'automatic',
    jsxImportSource: 'react'
  }
})