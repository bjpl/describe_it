/**
 * Data Transfer Objects (DTOs)
 *
 * These types define the structure of data sent between client and server,
 * or between different layers of the application.
 */

import type {
  DifficultyLevel,
  DescriptionStyle,
  LanguageCode,
  SessionType,
  QADifficulty,
  QuestionType,
  PartOfSpeech,
  ThemePreference,
} from './entities';

// Request and Response DTOs...
export interface DescriptionRequest {
  image_url: string;
  image_id?: string;
  style: DescriptionStyle;
  difficulty_level?: DifficultyLevel;
  custom_prompt?: string;
  language?: LanguageCode;
}
