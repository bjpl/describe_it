/**
 * Vocabulary API Schemas
 *
 * Zod schemas for vocabulary CRUD operations with runtime validation
 * and TypeScript type inference
 */

import { z } from 'zod';

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export const difficultyLevelSchema = z.enum(['beginner', 'intermediate', 'advanced']);
export const partOfSpeechSchema = z.enum([
  'noun', 'verb', 'adjective', 'adverb', 'pronoun',
  'preposition', 'conjunction', 'interjection', 'article'
]);

export type DifficultyLevel = z.infer<typeof difficultyLevelSchema>;
export type PartOfSpeech = z.infer<typeof partOfSpeechSchema>;

// ============================================================================
// CREATE VOCABULARY ITEM
// ============================================================================

export const createVocabularyRequestSchema = z.object({
  word: z.string().min(1, 'Word is required').max(255),
  translation: z.string().min(1, 'Translation is required').max(500),
  language: z.string().min(2, 'Language code must be at least 2 characters').max(10),
  difficulty: difficultyLevelSchema.optional().default('beginner'),
  partOfSpeech: partOfSpeechSchema.optional(),
  exampleSentence: z.string().max(1000).optional(),
  imageUrl: z.string().url('Invalid image URL').optional(),
  audioUrl: z.string().url('Invalid audio URL').optional(),
  tags: z.array(z.string().max(50)).max(20).optional().default([]),
  category: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateVocabularyRequest = z.infer<typeof createVocabularyRequestSchema>;

export const vocabularyItemSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  word: z.string(),
  translation: z.string(),
  language: z.string(),
  difficulty: difficultyLevelSchema,
  partOfSpeech: partOfSpeechSchema.nullable(),
  exampleSentence: z.string().nullable(),
  imageUrl: z.string().url().nullable(),
  audioUrl: z.string().url().nullable(),
  tags: z.array(z.string()),
  category: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  metadata: z.record(z.unknown()).nullable(),
});

export type VocabularyItem = z.infer<typeof vocabularyItemSchema>;

export const createVocabularyResponseSchema = z.object({
  success: z.boolean(),
  data: vocabularyItemSchema.nullable(),
  error: z.string().optional(),
});

export type CreateVocabularyResponse = z.infer<typeof createVocabularyResponseSchema>;

// ============================================================================
// UPDATE VOCABULARY ITEM
// ============================================================================

export const updateVocabularyRequestSchema = z.object({
  word: z.string().min(1).max(255).optional(),
  translation: z.string().min(1).max(500).optional(),
  language: z.string().min(2).max(10).optional(),
  difficulty: difficultyLevelSchema.optional(),
  partOfSpeech: partOfSpeechSchema.optional(),
  exampleSentence: z.string().max(1000).optional(),
  imageUrl: z.string().url().optional(),
  audioUrl: z.string().url().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  category: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type UpdateVocabularyRequest = z.infer<typeof updateVocabularyRequestSchema>;

export const updateVocabularyResponseSchema = z.object({
  success: z.boolean(),
  data: vocabularyItemSchema.nullable(),
  error: z.string().optional(),
});

export type UpdateVocabularyResponse = z.infer<typeof updateVocabularyResponseSchema>;

// ============================================================================
// GET VOCABULARY ITEMS (LIST)
// ============================================================================

export const getVocabularyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
  difficulty: difficultyLevelSchema.optional(),
  category: z.string().max(100).optional(),
  language: z.string().min(2).max(10).optional(),
  search: z.string().max(255).optional(),
  tags: z.string().transform(val => val.split(',')).pipe(z.array(z.string())).optional(),
  sortBy: z.enum(['created', 'updated', 'word', 'difficulty']).optional().default('created'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type GetVocabularyQuery = z.infer<typeof getVocabularyQuerySchema>;

export const getVocabularyResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(vocabularyItemSchema),
  pagination: z.object({
    total: z.number().int(),
    offset: z.number().int(),
    limit: z.number().int(),
    hasMore: z.boolean(),
  }),
  error: z.string().optional(),
});

export type GetVocabularyResponse = z.infer<typeof getVocabularyResponseSchema>;

// ============================================================================
// GET SINGLE VOCABULARY ITEM
// ============================================================================

export const getVocabularyItemResponseSchema = z.object({
  success: z.boolean(),
  data: vocabularyItemSchema.nullable(),
  error: z.string().optional(),
});

export type GetVocabularyItemResponse = z.infer<typeof getVocabularyItemResponseSchema>;

// ============================================================================
// DELETE VOCABULARY ITEM
// ============================================================================

export const deleteVocabularyResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  error: z.string().optional(),
});

export type DeleteVocabularyResponse = z.infer<typeof deleteVocabularyResponseSchema>;

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

export const batchCreateVocabularyRequestSchema = z.object({
  items: z.array(createVocabularyRequestSchema).min(1).max(100),
});

export type BatchCreateVocabularyRequest = z.infer<typeof batchCreateVocabularyRequestSchema>;

export const batchCreateVocabularyResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    created: z.array(vocabularyItemSchema),
    failed: z.array(z.object({
      index: z.number().int(),
      error: z.string(),
      item: createVocabularyRequestSchema,
    })),
  }),
  summary: z.object({
    total: z.number().int(),
    successful: z.number().int(),
    failed: z.number().int(),
  }),
});

export type BatchCreateVocabularyResponse = z.infer<typeof batchCreateVocabularyResponseSchema>;

export const batchDeleteVocabularyRequestSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});

export type BatchDeleteVocabularyRequest = z.infer<typeof batchDeleteVocabularyRequestSchema>;

export const batchDeleteVocabularyResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    deleted: z.array(z.string().uuid()),
    failed: z.array(z.object({
      id: z.string().uuid(),
      error: z.string(),
    })),
  }),
  summary: z.object({
    total: z.number().int(),
    successful: z.number().int(),
    failed: z.number().int(),
  }),
});

export type BatchDeleteVocabularyResponse = z.infer<typeof batchDeleteVocabularyResponseSchema>;
