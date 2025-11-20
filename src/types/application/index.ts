/**
 * Application-specific types barrel export
 */

export * from './image';
export * from './description';
export * from './questions';
export * from './vocabulary';
export * from './data-transfer';

// Re-export commonly used types
export type { DifficultyLevel, LanguageCode } from './questions';
