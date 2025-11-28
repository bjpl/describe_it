/**
 * Application-specific types barrel export
 */

export * from './image';
export * from './description';
export * from './questions';
export * from './vocabulary';
export * from './data-transfer';

// Re-export commonly used types for convenience
// LanguageCode is defined in description.ts, not questions.ts
export type { DifficultyLevel, QuestionType } from './questions';
export type { LanguageCode, DescriptionStyle, TargetAudience } from './description';
