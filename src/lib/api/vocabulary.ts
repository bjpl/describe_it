/**
 * Vocabulary API Client
 *
 * Type-safe API methods for vocabulary management with Result-based error handling.
 */

import { BaseApiClient } from './client-base';
import { Result } from './result';
import { API_ENDPOINTS, buildQueryString } from './endpoints';
import type {
  VocabularyItem,
  DifficultyNumber,
  PartOfSpeech,
} from '@/core/types/entities';
import type { PaginatedResponse, PaginationRequest } from '@/core/types/api';

/**
 * Vocabulary list query parameters
 */
export interface VocabularyListParams extends PaginationRequest {
  user_id?: string;
  list_id?: string;
  difficulty_level?: DifficultyNumber;
  category?: string;
  part_of_speech?: PartOfSpeech;
  search?: string;
  mastery_level_min?: number;
  mastery_level_max?: number;
  sort_by?: 'created_at' | 'spanish_text' | 'difficulty_level' | 'mastery_level';
  sort_order?: 'asc' | 'desc';
}

/**
 * Create vocabulary DTO
 */
export interface CreateVocabularyDTO {
  user_id?: string;
  vocabulary_list_id?: string;
  spanish_text: string;
  english_translation: string;
  category: string;
  difficulty_level: DifficultyNumber;
  part_of_speech: PartOfSpeech;
  context_sentence_spanish?: string;
  context_sentence_english?: string;
  phonetic_pronunciation?: string;
  user_notes?: string;
}

/**
 * Update vocabulary DTO
 */
export interface UpdateVocabularyDTO {
  spanish_text?: string;
  english_translation?: string;
  category?: string;
  difficulty_level?: DifficultyNumber;
  part_of_speech?: PartOfSpeech;
  context_sentence_spanish?: string;
  context_sentence_english?: string;
  phonetic_pronunciation?: string;
  user_notes?: string;
  mastery_level?: number;
}

/**
 * Bulk create vocabulary DTO
 */
export interface BulkCreateVocabularyDTO {
  items: CreateVocabularyDTO[];
}

/**
 * Vocabulary search parameters
 */
export interface VocabularySearchParams {
  query: string;
  user_id?: string;
  limit?: number;
  include_translations?: boolean;
}

/**
 * Vocabulary API Client
 */
export class VocabularyApi extends BaseApiClient {
  /**
   * List vocabulary items with filtering and pagination
   */
  async list(params?: VocabularyListParams): Promise<Result<PaginatedResponse<VocabularyItem>>> {
    const queryString = params ? buildQueryString(params) : '';
    return this.request<PaginatedResponse<VocabularyItem>>(
      `${API_ENDPOINTS.vocabulary.list}${queryString}`
    );
  }

  /**
   * Get single vocabulary item by ID
   */
  async get(id: string): Promise<Result<VocabularyItem>> {
    return this.request<VocabularyItem>(API_ENDPOINTS.vocabulary.get(id));
  }

  /**
   * Create new vocabulary item
   */
  async create(data: CreateVocabularyDTO): Promise<Result<VocabularyItem>> {
    return this.request<VocabularyItem>(API_ENDPOINTS.vocabulary.create, {
      method: 'POST',
      body: data,
    });
  }

  /**
   * Update existing vocabulary item
   */
  async update(id: string, data: UpdateVocabularyDTO): Promise<Result<VocabularyItem>> {
    return this.request<VocabularyItem>(API_ENDPOINTS.vocabulary.update(id), {
      method: 'PUT',
      body: data,
    });
  }

  /**
   * Delete vocabulary item
   */
  async delete(id: string): Promise<Result<void>> {
    return this.request<void>(API_ENDPOINTS.vocabulary.delete(id), {
      method: 'DELETE',
    });
  }

  /**
   * Search vocabulary items
   */
  async search(params: VocabularySearchParams): Promise<Result<VocabularyItem[]>> {
    const queryString = buildQueryString(params);
    return this.request<VocabularyItem[]>(
      `${API_ENDPOINTS.vocabulary.search}${queryString}`
    );
  }

  /**
   * Bulk create vocabulary items
   */
  async bulkCreate(data: BulkCreateVocabularyDTO): Promise<Result<VocabularyItem[]>> {
    return this.request<VocabularyItem[]>(API_ENDPOINTS.vocabulary.bulk, {
      method: 'POST',
      body: data,
    });
  }
}
