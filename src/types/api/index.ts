/**
 * API types barrel export
 */

export * from './request-types';
export * from './response-types';
export * from './middleware';

// Legacy re-exports for backward compatibility
// These will be deprecated in future versions
export {
  APIError,
  type DescriptionStyle,
  type DescriptionRequest,
  type GeneratedDescription,
  type TranslationRequest,
  type QAGeneration,
  type PhraseCategories,
  type RetryConfig,
} from './legacy';
