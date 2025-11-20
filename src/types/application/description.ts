/**
 * Description generation types
 */

import type { JsonValue } from '../core/json-types';

export type DescriptionStyle =
  | 'narrativo'
  | 'poetico'
  | 'academico'
  | 'conversacional'
  | 'infantil';

export type LanguageCode = 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt';

export type TargetAudience =
  | 'children'
  | 'teenagers'
  | 'adults'
  | 'seniors'
  | 'professionals'
  | 'students';

/**
 * Description generation types
 */
export interface DescriptionRequest {
  image_url: string;
  style: DescriptionStyle;
  max_length: number;
  language: LanguageCode;
  custom_prompt?: string;
  target_audience?: TargetAudience;
  context?: DescriptionContext;
}

export interface DescriptionContext {
  educational_level?: 'elementary' | 'middle' | 'high' | 'college' | 'professional';
  subject_area?: string;
  cultural_context?: string;
  accessibility_requirements?: AccessibilityRequirements;
}

export interface AccessibilityRequirements {
  screen_reader_optimized: boolean;
  simplified_language: boolean;
  high_contrast_descriptions: boolean;
  audio_friendly: boolean;
}

export interface GeneratedDescription {
  id: string;
  content: string;
  style: DescriptionStyle;
  language: LanguageCode;
  word_count: number;
  reading_level: ReadingLevel;
  quality_metrics: QualityMetrics;
  generated_at: string;
  model_info: ModelInfo;
}

export interface ReadingLevel {
  grade_level: number;
  complexity_score: number;
  vocabulary_difficulty: 'easy' | 'medium' | 'hard';
  sentence_complexity: 'simple' | 'compound' | 'complex';
}

export interface QualityMetrics {
  coherence_score: number;
  relevance_score: number;
  creativity_score: number;
  accuracy_score: number;
  engagement_score: number;
  overall_score: number;
}

export interface ModelInfo {
  model_name: string;
  model_version: string;
  provider: 'openai' | 'anthropic' | 'cohere' | 'custom';
  parameters: ModelParameters;
  processing_time: number;
  token_usage: TokenUsage;
}

export interface ModelParameters {
  temperature: number;
  max_tokens: number;
  top_p: number;
  frequency_penalty: number;
  presence_penalty: number;
  [key: string]: JsonValue;
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost?: number;
}
