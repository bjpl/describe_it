/**
 * Vocabulary extraction types
 */

import type { LanguageCode, DifficultyLevel } from './';

export type ExtractionMethod = 'frequency' | 'difficulty' | 'context' | 'educational' | 'hybrid';

export type VocabularyCategory =
  | 'nouns'
  | 'verbs'
  | 'adjectives'
  | 'adverbs'
  | 'phrases'
  | 'idioms'
  | 'technical_terms';

export type PartOfSpeech =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'preposition'
  | 'conjunction'
  | 'interjection'
  | 'pronoun'
  | 'determiner';

export type TranslationMap = Record<LanguageCode, string>;

export type WordRelationship =
  | 'synonym'
  | 'antonym'
  | 'hypernym'
  | 'hyponym'
  | 'meronym'
  | 'holonym'
  | 'derived';

/**
 * Vocabulary extraction types
 */
export interface VocabularyExtraction {
  source_text: string;
  extraction_method: ExtractionMethod;
  target_level: DifficultyLevel;
  language: LanguageCode;
  categories: VocabularyCategory[];
  extracted_items: ExtractedVocabularyItem[];
  linguistic_analysis: LinguisticAnalysis;
}

export interface ExtractedVocabularyItem {
  id: string;
  word: string;
  definition: string;
  part_of_speech: PartOfSpeech;
  category: VocabularyCategory;
  difficulty: DifficultyLevel;
  frequency_score: number;
  context_sentences: string[];
  translations: TranslationMap;
  pronunciation: PronunciationInfo;
  etymology?: EtymologyInfo;
  usage_notes: string[];
  related_words: RelatedWord[];
  examples: UsageExample[];
}

export interface PronunciationInfo {
  ipa?: string;
  audio_url?: string;
  syllables: string[];
  stress_pattern: number[];
  phonetic_spelling?: string;
}

export interface EtymologyInfo {
  origin_language: string;
  root_words: string[];
  historical_development: string;
  first_recorded_use?: string;
}

export interface RelatedWord {
  word: string;
  relationship: WordRelationship;
  strength: number;
}

export interface UsageExample {
  sentence: string;
  context: string;
  difficulty: DifficultyLevel;
  source?: string;
  translations: TranslationMap;
}

export interface LinguisticAnalysis {
  lexical_diversity: number;
  average_word_length: number;
  syllable_distribution: Record<number, number>;
  pos_distribution: Record<PartOfSpeech, number>;
  readability_scores: ReadabilityScores;
  language_detection: LanguageDetection;
}

export interface ReadabilityScores {
  flesch_kincaid: number;
  flesch_reading_ease: number;
  coleman_liau: number;
  automated_readability: number;
  average_score: number;
}

export interface LanguageDetection {
  detected_language: LanguageCode;
  confidence: number;
  alternative_languages: Array<{
    language: LanguageCode;
    confidence: number;
  }>;
}
