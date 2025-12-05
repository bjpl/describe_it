/**
 * Main API Client
 *
 * Aggregates all API modules into a single, type-safe client interface.
 */

import { BaseApiClient, type BaseClientConfig } from './client-base';
import { VocabularyApi } from './vocabulary';
import { DescriptionsApi } from './descriptions';
import { SessionsApi } from './sessions';

/**
 * Complete API Client Configuration
 */
export interface ApiClientConfig extends BaseClientConfig {
  // Additional client-wide configuration options
}

/**
 * Main API Client Class
 *
 * Provides unified access to all API endpoints with type safety and Result-based error handling.
 *
 * @example
 * ```typescript
 * const api = new ApiClient({ base_url: '/api' });
 *
 * // Vocabulary operations
 * const result = await api.vocabulary.list({ page: 1, limit: 20 });
 * if (result.success) {
 *   console.log(result.data.data); // Type-safe vocabulary items
 * }
 *
 * // Description generation
 * const desc = await api.descriptions.generate({
 *   image_url: 'https://example.com/image.jpg',
 *   style: 'narrativo',
 *   difficulty_level: 'intermediate'
 * });
 *
 * // Session management
 * const session = await api.sessions.create({
 *   user_id: 'user-123',
 *   session_type: 'flashcards'
 * });
 * ```
 */
export class ApiClient extends BaseApiClient {
  public readonly vocabulary: VocabularyApi;
  public readonly descriptions: DescriptionsApi;
  public readonly sessions: SessionsApi;

  constructor(config: Partial<ApiClientConfig> = {}) {
    super(config);

    // Initialize API modules with shared config
    this.vocabulary = new VocabularyApi(config);
    this.descriptions = new DescriptionsApi(config);
    this.sessions = new SessionsApi(config);
  }

  /**
   * Update configuration for all API modules
   */
  updateConfig(config: Partial<ApiClientConfig>): void {
    super.updateConfig(config);
    this.vocabulary.updateConfig(config);
    this.descriptions.updateConfig(config);
    this.sessions.updateConfig(config);
  }

  /**
   * Set API key for all API modules
   */
  setApiKey(apiKey: string): void {
    super.setApiKey(apiKey);
    this.vocabulary.setApiKey(apiKey);
    this.descriptions.setApiKey(apiKey);
    this.sessions.setApiKey(apiKey);
  }
}

/**
 * Create a new API client instance
 */
export function createApiClient(config?: Partial<ApiClientConfig>): ApiClient {
  return new ApiClient(config);
}

/**
 * Default API client instance for convenience
 */
export const apiClient = createApiClient();
