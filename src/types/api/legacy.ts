/**
 * Legacy API types for backward compatibility
 * These types are used by older service implementations
 * New code should use the types from the application directory
 */

/**
 * Description styles supported by the OpenAI service
 */
export type DescriptionStyle =
  | 'narrativo'
  | 'poetico'
  | 'academico'
  | 'conversacional'
  | 'infantil';

/**
 * Description request parameters (legacy format)
 */
export interface DescriptionRequest {
  imageUrl: string;
  style: DescriptionStyle;
  language?: 'es' | 'en';
  maxLength?: number;
  customPrompt?: string;
}

/**
 * Generated description result (legacy format)
 */
export interface GeneratedDescription {
  style: DescriptionStyle;
  text: string;
  language: string;
  wordCount: number;
  generatedAt: string;
}

/**
 * Translation request parameters
 */
export interface TranslationRequest {
  text: string;
  fromLanguage: string;
  toLanguage: string;
}

/**
 * Q&A generation result
 */
export interface QAGeneration {
  question: string;
  answer: string;
  difficulty: 'facil' | 'medio' | 'dificil';
  category: string;
}

/**
 * Phrase categories for vocabulary extraction
 */
export interface PhraseCategories {
  objetos: string[];
  acciones: string[];
  lugares: string[];
  colores: string[];
  emociones: string[];
  conceptos: string[];
}

/**
 * Retry configuration for API calls
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryCondition?: (error: APIError) => boolean;
}

/**
 * Custom API Error class for standardized error handling
 */
export class APIError extends Error {
  code: string;
  status: number;
  details?: Record<string, unknown>;
  retryAfter?: number;

  constructor({
    code,
    message,
    status,
    details,
    retryAfter,
  }: {
    code: string;
    message: string;
    status: number;
    details?: Record<string, unknown>;
    retryAfter?: number;
  }) {
    super(message);
    this.name = 'APIError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.retryAfter = retryAfter;
  }
}
