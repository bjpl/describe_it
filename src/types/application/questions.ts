/**
 * Question and Answer types
 */

import type { LanguageCode } from './description';

export type QuestionType =
  | 'multiple_choice'
  | 'true_false'
  | 'short_answer'
  | 'essay'
  | 'fill_blank'
  | 'matching';

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

/**
 * Question and Answer types
 */
export interface QAGeneration {
  description_id: string;
  question_count: number;
  difficulty_distribution: DifficultyDistribution;
  language: LanguageCode;
  question_types: QuestionType[];
  generated_questions: GeneratedQuestion[];
  quality_assessment: QAQualityAssessment;
}

export interface DifficultyDistribution {
  beginner: number;
  intermediate: number;
  advanced: number;
}

export interface GeneratedQuestion {
  id: string;
  question_text: string;
  question_type: QuestionType;
  difficulty: DifficultyLevel;
  correct_answer: string;
  options?: string[];
  explanation?: string;
  hints?: string[];
  tags: string[];
  learning_objectives: string[];
  time_limit?: number;
  points: number;
}

export interface QAQualityAssessment {
  clarity_score: number;
  difficulty_accuracy: number;
  answer_precision: number;
  educational_value: number;
  cultural_appropriateness: number;
  bias_score: number;
}
