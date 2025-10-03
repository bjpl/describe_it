/**
 * ESLint Custom Plugin Configuration
 *
 * Loads and registers custom ESLint rules.
 */

import customRules from './eslint-rules/index.js';

export default {
  rules: customRules.rules,
};
