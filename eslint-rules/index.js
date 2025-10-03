/**
 * Custom ESLint Rules Index
 *
 * Exports all custom ESLint rules for the application.
 */

import requireLogger from './require-logger.js';

export default {
  rules: {
    'require-logger': requireLogger,
  },
};
