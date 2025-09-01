import { z } from 'zod';

export const createPhraseSchema = z.object({
  description_id: z.string().uuid(),
  session_id: z.string().uuid(),
  category: z.enum(['vocabulary', 'expression', 'idiom', 'phrase', 'grammar_pattern', 'collocation', 'verb_conjugation', 'cultural_reference']),
  spanish_text: z.string().min(1, 'Spanish text is required'),
  english_translation: z.string().min(1, 'English translation is required'),
  phonetic_pronunciation: z.string().optional(),
  difficulty_level: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  word_type: z.enum(['noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'pronoun', 'article', 'interjection', 'phrase', 'expression']).optional(),
  gender: z.enum(['masculine', 'feminine', 'neutral']).optional(),
  is_plural: z.boolean().default(false),
  verb_tense: z.enum(['infinitive', 'present', 'preterite', 'imperfect', 'future', 'conditional', 'subjunctive', 'imperative']).optional(),
  context_sentence_spanish: z.string().optional(),
  context_sentence_english: z.string().optional(),
  usage_notes: z.string().optional(),
  regional_variants: z.array(z.string()).default([]),
  formality_level: z.enum(['formal', 'neutral', 'informal', 'slang']).default('neutral'),
  is_user_selected: z.boolean().default(false),
  user_notes: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

export const updatePhraseSchema = z.object({
  spanish_text: z.string().min(1).optional(),
  english_translation: z.string().min(1).optional(),
  phonetic_pronunciation: z.string().optional(),
  difficulty_level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  word_type: z.enum(['noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'pronoun', 'article', 'interjection', 'phrase', 'expression']).optional(),
  gender: z.enum(['masculine', 'feminine', 'neutral']).optional(),
  is_plural: z.boolean().optional(),
  verb_tense: z.enum(['infinitive', 'present', 'preterite', 'imperfect', 'future', 'conditional', 'subjunctive', 'imperative']).optional(),
  context_sentence_spanish: z.string().optional(),
  context_sentence_english: z.string().optional(),
  usage_notes: z.string().optional(),
  regional_variants: z.array(z.string()).optional(),
  formality_level: z.enum(['formal', 'neutral', 'informal', 'slang']).optional(),
  is_user_selected: z.boolean().optional(),
  is_mastered: z.boolean().optional(),
  user_notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const phraseFiltersSchema = z.object({
  category: z.enum(['vocabulary', 'expression', 'idiom', 'phrase', 'grammar_pattern', 'collocation', 'verb_conjugation', 'cultural_reference']).optional(),
  difficulty_level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  is_user_selected: z.boolean().optional(),
  is_mastered: z.boolean().optional(),
  word_type: z.enum(['noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'pronoun', 'article', 'interjection', 'phrase', 'expression']).optional(),
  formality_level: z.enum(['formal', 'neutral', 'informal', 'slang']).optional(),
  tags: z.array(z.string()).optional(),
  search: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  sort_by: z.enum(['created_at', 'updated_at', 'spanish_text', 'difficulty_level', 'study_count', 'last_studied_at']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

export const markStudiedSchema = z.object({
  phrase_id: z.string().uuid(),
  was_correct: z.boolean(),
  response_time_ms: z.number().min(0).optional(),
  session_id: z.string().uuid().optional(),
});

export const bulkUpdatePhrasesSchema = z.object({
  phrase_ids: z.array(z.string().uuid()).min(1),
  updates: updatePhraseSchema,
});

export const spacedRepetitionUpdateSchema = z.object({
  phrase_id: z.string().uuid(),
  quality: z.number().min(0).max(5), // SuperMemo quality rating
  response_time_ms: z.number().min(0).optional(),
});

export type CreatePhraseRequest = z.infer<typeof createPhraseSchema>;
export type UpdatePhraseRequest = z.infer<typeof updatePhraseSchema>;
export type PhraseFiltersRequest = z.infer<typeof phraseFiltersSchema>;
export type MarkStudiedRequest = z.infer<typeof markStudiedSchema>;
export type BulkUpdatePhrasesRequest = z.infer<typeof bulkUpdatePhrasesSchema>;
export type SpacedRepetitionUpdateRequest = z.infer<typeof spacedRepetitionUpdateSchema>;