/**
 * User Settings Types
 *
 * Type definitions for user preferences and settings.
 */

export interface LanguageSettings {
  primary: string;
  secondary: string;
  learningDirection: 'primary_to_secondary' | 'secondary_to_primary' | 'bidirectional';
}

export interface DifficultySettings {
  preferred: 'beginner' | 'intermediate' | 'advanced';
  adaptive: boolean;
  autoAdjust: boolean;
}

export interface ContentSettings {
  style: 'narrativo' | 'poetico' | 'academico' | 'conversacional' | 'infantil';
  maxPhrases: number;
  maxQuestions: number;
  includeTranslations: boolean;
  includeExamples: boolean;
  includeContext: boolean;
  questionTypes: Array<
    'multiple_choice' | 'open_ended' | 'true_false' | 'fill_blank' | 'comprehension'
  >;
}

export interface InterfaceSettings {
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large';
  animations: boolean;
  soundEffects: boolean;
  compactMode: boolean;
  showProgress: boolean;
}

export interface SessionSettings {
  autoSave: boolean;
  sessionTimeout: number;
  reminderIntervals: number[];
  goalTracking: boolean;
  streakTracking: boolean;
  achievementNotifications: boolean;
}

export interface PrivacySettings {
  saveProgress: boolean;
  saveVocabulary: boolean;
  analytics: boolean;
  shareProgress: boolean;
  dataRetention: number;
}

export interface ExportSettings {
  defaultFormat: 'json' | 'csv' | 'txt' | 'pdf' | 'anki' | 'quizlet';
  includeMetadata: boolean;
  includeProgress: boolean;
  autoExportInterval: 'never' | 'daily' | 'weekly' | 'monthly';
}

export interface AdvancedSettings {
  cacheEnabled: boolean;
  preloadContent: boolean;
  debugMode: boolean;
  experimentalFeatures: boolean;
  apiTimeout: number;
  maxRetries: number;
}

export interface UserSettings {
  language?: LanguageSettings;
  difficulty?: DifficultySettings;
  content?: ContentSettings;
  interface?: InterfaceSettings;
  session?: SessionSettings;
  privacy?: PrivacySettings;
  export?: ExportSettings;
  advanced?: AdvancedSettings;
  [key: string]: any;
}

export interface SettingsMetadata {
  version: string;
  timestamp?: string;
  source: string;
  migrated?: boolean;
}
