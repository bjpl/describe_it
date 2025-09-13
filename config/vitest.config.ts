/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic',
      jsxImportSource: 'react',
      // React 19 compatibility
      babel: {
        plugins: [
          // Support React 19 features
        ]
      }
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
    // React 19 specific configuration
    isolate: false,
    threads: false,
    // Better error reporting
    reporter: process.env.CI ? ['basic'] : ['verbose'],
    bail: process.env.CI ? 1 : 0,
    // React 19 and Next.js 15 compatibility
    server: {
      deps: {
        external: ['next', '@supabase/supabase-js'],
        inline: [
          '@testing-library/react',
          '@testing-library/jest-dom',
          'vitest-canvas-mock'
        ]
      }
    },
    // Environment setup for React 19
    poolOptions: {
      threads: {
        singleThread: true
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(fileURLToPath(new URL('./src', import.meta.url)))
    }
  },
  // ESM compatibility for React 19
  define: {
    'import.meta.vitest': undefined,
    'process.env.NODE_ENV': '"test"',
    global: 'globalThis'
  },
  esbuild: {
    target: 'node20',
    jsx: 'automatic',
    jsxImportSource: 'react',
    // React 19 support
    jsxDev: false,
    define: {
      'process.env.NODE_ENV': '"test"'
    }
  }
})