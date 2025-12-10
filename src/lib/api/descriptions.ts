/**
 * Descriptions API Client
 *
 * Type-safe API methods for image description management with Result-based error handling.
 */

import { BaseApiClient } from './client-base';
import { Result } from './result';
import { API_ENDPOINTS, buildQueryString } from './endpoints';
import type {
  Description,
  DifficultyLevel,
  DescriptionStyle,
  LanguageCode,
} from '@/core/types/entities';
import type { PaginatedResponse, PaginationRequest } from '@/core/types/api';

/**
 * Description list query parameters
 */
export interface DescriptionListParams extends PaginationRequest {
  user_id?: string;
  image_id?: string;
  style?: DescriptionStyle;
  difficulty_level?: DifficultyLevel;
  is_completed?: boolean;
  sort_by?: 'created_at' | 'completed_at' | 'user_rating';
  sort_order?: 'asc' | 'desc';
}

/**
 * Generate description request DTO
 */
export interface GenerateDescriptionDTO {
  image_url: string;
  image_id?: string;
  style: DescriptionStyle;
  difficulty_level?: DifficultyLevel;
  custom_prompt?: string;
  language?: LanguageCode;
  user_id?: string;
}

/**
 * Create description DTO
 */
export interface CreateDescriptionDTO {
  image_id: string;
  image_url?: string;
  user_id?: string;
  style: DescriptionStyle;
  content_spanish: string;
  content_english: string;
  difficulty_level: DifficultyLevel;
}

/**
 * Update description DTO
 */
export interface UpdateDescriptionDTO {
  style?: DescriptionStyle;
  content_spanish?: string;
  content_english?: string;
  difficulty_level?: DifficultyLevel;
  is_completed?: boolean;
  user_rating?: number;
}

/**
 * Generated description response
 */
export interface GeneratedDescription {
  spanish: string;
  english: string;
  style: DescriptionStyle;
  difficulty_level: DifficultyLevel;
  image_id?: string;
  image_url: string;
  metadata?: {
    model: string;
    tokens_used?: number;
    generation_time_ms?: number;
  };
}

/**
 * Descriptions API Client
 */
export class DescriptionsApi extends BaseApiClient {
  /**
   * List descriptions with filtering and pagination
   */
  async list(params?: DescriptionListParams): Promise<Result<PaginatedResponse<Description>>> {
    const queryString = params ? buildQueryString(params as Record<string, unknown>) : '';
    return this.request<PaginatedResponse<Description>>(
      `${API_ENDPOINTS.descriptions.list}${queryString}`
    );
  }

  /**
   * Get single description by ID
   */
  async get(id: string): Promise<Result<Description>> {
    return this.request<Description>(API_ENDPOINTS.descriptions.get(id));
  }

  /**
   * Generate AI-powered description for an image
   */
  async generate(data: GenerateDescriptionDTO): Promise<Result<GeneratedDescription>> {
    return this.request<GeneratedDescription>(API_ENDPOINTS.descriptions.generate, {
      method: 'POST',
      body: data,
    });
  }

  /**
   * Create new description
   */
  async create(data: CreateDescriptionDTO): Promise<Result<Description>> {
    return this.request<Description>(API_ENDPOINTS.descriptions.create, {
      method: 'POST',
      body: data,
    });
  }

  /**
   * Update existing description
   */
  async update(id: string, data: UpdateDescriptionDTO): Promise<Result<Description>> {
    return this.request<Description>(API_ENDPOINTS.descriptions.update(id), {
      method: 'PUT',
      body: data,
    });
  }

  /**
   * Delete description
   */
  async delete(id: string): Promise<Result<void>> {
    return this.request<void>(API_ENDPOINTS.descriptions.delete(id), {
      method: 'DELETE',
    });
  }
}
