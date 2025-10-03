/**
 * ESLint Configuration (Flat Config Format)
 *
 * ESLint v9+ configuration enforcing logger usage over console statements.
 */

import { FlatCompat } from '@eslint/eslintrc';
import path from 'path';
import { fileURLToPath } from 'url';
import customRulesPlugin from './.eslintplugin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  // Extend Next.js configuration
  ...compat.extends('next/core-web-vitals'),

  // Global configuration for all files
  {
    rules: {
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },

  // Source code: strict no-console + require-logger
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    plugins: {
      'custom-rules': customRulesPlugin,
    },
    rules: {
      'no-console': 'error',
      'custom-rules/require-logger': 'error',
    },
  },

  // Scripts: allow console
  {
    files: [
      'scripts/**/*.js',
      'scripts/**/*.cjs',
      'scripts/**/*.mjs',
    ],
    rules: {
      'no-console': 'off',
    },
  },

  // Test files: allow console
  {
    files: [
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      'tests/**/*.ts',
      'tests/**/*.tsx',
    ],
    rules: {
      'no-console': 'off',
    },
  },

  // Config files: allow console
  {
    files: [
      '*.config.js',
      '*.config.ts',
      '*.config.mjs',
      '*.config.cjs',
    ],
    rules: {
      'no-console': 'off',
    },
  },

  // ESLint plugin files: allow console
  {
    files: [
      'eslint-rules/**/*.js',
      '.eslintplugin.js',
    ],
    rules: {
      'no-console': 'off',
    },
  },
];
