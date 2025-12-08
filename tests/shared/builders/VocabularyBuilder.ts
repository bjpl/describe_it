/**
 * Vocabulary Test Data Builder
 * Provides fluent API for creating test vocabulary data
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface VocabularyItem {
  id?: string;
  user_id?: string;
  word: string;
  translation?: string;
  language?: 'es' | 'en';
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  part_of_speech?: string;
  example_sentence?: string;
  definition?: string;
  synonyms?: string[];
  created_at?: string;
  updated_at?: string;
}

export class VocabularyBuilder {
  private data: Partial<VocabularyItem> = {
    word: 'ejemplo',
    translation: 'example',
    language: 'es',
    difficulty: 'beginner',
    part_of_speech: 'noun',
  };

  /**
   * Set word
   */
  withWord(word: string): this {
    this.data.word = word;
    return this;
  }

  /**
   * Set translation
   */
  withTranslation(translation: string): this {
    this.data.translation = translation;
    return this;
  }

  /**
   * Set language
   */
  withLanguage(language: 'es' | 'en'): this {
    this.data.language = language;
    return this;
  }

  /**
   * Set difficulty level
   */
  withDifficulty(difficulty: 'beginner' | 'intermediate' | 'advanced'): this {
    this.data.difficulty = difficulty;
    return this;
  }

  /**
   * Quick setter for beginner difficulty
   */
  beginner(): this {
    this.data.difficulty = 'beginner';
    return this;
  }

  /**
   * Quick setter for intermediate difficulty
   */
  intermediate(): this {
    this.data.difficulty = 'intermediate';
    return this;
  }

  /**
   * Quick setter for advanced difficulty
   */
  advanced(): this {
    this.data.difficulty = 'advanced';
    return this;
  }

  /**
   * Set part of speech
   */
  withPartOfSpeech(partOfSpeech: string): this {
    this.data.part_of_speech = partOfSpeech;
    return this;
  }

  /**
   * Quick setter for noun
   */
  asNoun(): this {
    this.data.part_of_speech = 'noun';
    return this;
  }

  /**
   * Quick setter for verb
   */
  asVerb(): this {
    this.data.part_of_speech = 'verb';
    return this;
  }

  /**
   * Quick setter for adjective
   */
  asAdjective(): this {
    this.data.part_of_speech = 'adjective';
    return this;
  }

  /**
   * Set example sentence
   */
  withExample(example: string): this {
    this.data.example_sentence = example;
    return this;
  }

  /**
   * Set definition
   */
  withDefinition(definition: string): this {
    this.data.definition = definition;
    return this;
  }

  /**
   * Set synonyms
   */
  withSynonyms(synonyms: string[]): this {
    this.data.synonyms = synonyms;
    return this;
  }

  /**
   * Set user ID
   */
  forUser(userId: string): this {
    this.data.user_id = userId;
    return this;
  }

  /**
   * Set custom ID
   */
  withId(id: string): this {
    this.data.id = id;
    return this;
  }

  /**
   * Create Spanish vocabulary
   */
  spanish(): this {
    this.data.language = 'es';
    return this;
  }

  /**
   * Create English vocabulary
   */
  english(): this {
    this.data.language = 'en';
    return this;
  }

  /**
   * Create vocabulary item in database
   */
  async create(db: SupabaseClient): Promise<VocabularyItem> {
    const { data, error } = await db
      .from('vocabulary')
      .insert(this.data)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create vocabulary: ${error.message}`);
    }

    return data;
  }

  /**
   * Build vocabulary object without persisting
   */
  build(): Partial<VocabularyItem> {
    return { ...this.data };
  }

  /**
   * Reset to default values
   */
  reset(): this {
    this.data = {
      word: 'ejemplo',
      translation: 'example',
      language: 'es',
      difficulty: 'beginner',
      part_of_speech: 'noun',
    };
    return this;
  }
}

/**
 * Factory function for creating vocabulary builder
 */
export function buildVocabulary(): VocabularyBuilder {
  return new VocabularyBuilder();
}

/**
 * Predefined common vocabulary items
 */
export const commonVocabulary = {
  spanishNouns: [
    { word: 'casa', translation: 'house', difficulty: 'beginner' as const },
    { word: 'perro', translation: 'dog', difficulty: 'beginner' as const },
    { word: 'gato', translation: 'cat', difficulty: 'beginner' as const },
    { word: 'libro', translation: 'book', difficulty: 'beginner' as const },
    { word: 'ciudad', translation: 'city', difficulty: 'intermediate' as const },
  ],
  spanishVerbs: [
    { word: 'hablar', translation: 'to speak', difficulty: 'beginner' as const },
    { word: 'comer', translation: 'to eat', difficulty: 'beginner' as const },
    { word: 'vivir', translation: 'to live', difficulty: 'beginner' as const },
    { word: 'comprender', translation: 'to understand', difficulty: 'intermediate' as const },
  ],
  spanishAdjectives: [
    { word: 'grande', translation: 'big', difficulty: 'beginner' as const },
    { word: 'pequeño', translation: 'small', difficulty: 'beginner' as const },
    { word: 'hermoso', translation: 'beautiful', difficulty: 'intermediate' as const },
  ],
};
