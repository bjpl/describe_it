// ==============================================
// DATABASE SERVICE - COMPREHENSIVE SUPABASE INTEGRATION
// ==============================================
// Complete database service layer with connection pooling,
// error handling, retry mechanisms, and full CRUD operations

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { 
  DatabaseUser,
  SessionType,
  DescriptionStyle,
  DifficultyLevel,
  QADifficulty,
  VocabularyCategory,
  ThemePreference,
  LanguagePreference,
  ExportFormat,
  QuestionType,
  LearningPhase 
} from '../../types/database';
import type { 
  VocabularyItem,
  PartOfSpeech,
  DifficultyNumber 
} from '../../types/unified';

// ==============================================
// CONFIGURATION AND TYPES
// ==============================================

interface DatabaseConfig {
  supabaseUrl: string;
  anonKey: string;
  serviceRoleKey?: string;
  enableLogging?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
  connectionTimeout?: number;
  maxConnections?: number;
}

interface DatabaseError {
  code: string;
  message: string;
  details?: any;
  hint?: string;
}

interface DatabaseResult<T> {
  data: T | null;
  error: DatabaseError | null;
  count?: number;
  success: boolean;
}

interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  ascending?: boolean;
  filter?: Record<string, any>;
}

interface ConnectionMetrics {
  activeConnections: number;
  totalQueries: number;
  averageResponseTime: number;
  errorCount: number;
  lastError?: DatabaseError;
  uptime: number;
  cacheHitRate?: number;
}

// ==============================================
// ENHANCED TABLE INTERFACES
// ==============================================

// Core tables matching the SQL schema
export interface User {
  id: string;
  email: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  spanish_level: 'beginner' | 'intermediate' | 'advanced';
  is_authenticated: boolean;
  profile_completed: boolean;
  theme: ThemePreference;
  language: LanguagePreference;
  default_description_style: DescriptionStyle;
  target_words_per_day: number;
  preferred_difficulty: DifficultyLevel;
  enable_notifications: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export interface Session {
  id: string;
  user_id?: string;
  session_type: SessionType;
  started_at: string;
  ended_at?: string;
  duration_minutes?: number;
  images_processed: number;
  descriptions_generated: number;
  qa_attempts: number;
  qa_correct: number;
  vocabulary_learned: number;
  phrases_saved: number;
  session_data: Record<string, any>;
  user_agent?: string;
  ip_address?: string;
  device_type?: string;
  engagement_score: number;
  completion_rate: number;
  created_at: string;
}

export interface VocabularyList {
  id: string;
  name: string;
  description?: string;
  category: VocabularyCategory;
  difficulty_level: number;
  total_words: number;
  is_active: boolean;
  is_public: boolean;
  created_by?: string;
  shared_with: string[];
  completion_rate: number;
  average_mastery: number;
  tags: string[];
  source_url?: string;
  language_pair: string;
  created_at: string;
  updated_at: string;
}

// Use unified VocabularyItem type for consistency
// Legacy interface kept for backward compatibility - will be removed in next version
// @deprecated Use VocabularyItem from unified types instead
export interface LegacyDatabaseVocabularyItem {
  id: string;
  vocabulary_list_id: string;
  spanish_text: string;
  english_translation: string;
  part_of_speech: string;
  difficulty_level: DifficultyLevel;
  gender?: string;
  article?: string;
  plural_form?: string;
  conjugation_info?: Record<string, any>;
  category?: string;
  subcategory?: string;
  context_sentence_spanish?: string;
  context_sentence_english?: string;
  pronunciation_ipa?: string;
  pronunciation_audio_url?: string;
  syllable_count?: number;
  stress_pattern?: string;
  usage_notes?: string;
  frequency_score: number;
  commonality_rank?: number;
  register: string;
  synonyms: string[];
  antonyms: string[];
  related_words: string[];
  word_family: string[];
  memory_hints: string[];
  cultural_notes?: string;
  false_friends: string[];
  associated_image_urls: string[];
  emoji_representation?: string;
  created_at: string;
}

// Use unified VocabularyItem type
export type { VocabularyItem };

export interface LearningProgress {
  id: string;
  user_id: string;
  vocabulary_item_id: string;
  session_id?: string;
  mastery_level: number;
  review_count: number;
  correct_count: number;
  incorrect_count: number;
  streak_count: number;
  last_reviewed?: string;
  next_review?: string;
  first_learned: string;
  difficulty_adjustment: number;
  learning_phase: LearningPhase;
  confidence_score: number;
  average_response_time?: number;
  error_patterns: Record<string, any>;
  learning_velocity: number;
  ease_factor: number;
  interval_days: number;
  created_at: string;
  updated_at: string;
}

export interface QAResponse {
  id: string;
  user_id?: string;
  session_id?: string;
  image_id: string;
  description_id?: string;
  question: string;
  correct_answer: string;
  user_answer?: string;
  is_correct?: boolean;
  similarity_score?: number;
  confidence_level?: number;
  difficulty: QADifficulty;
  question_type: QuestionType;
  language_focus?: string;
  response_time_seconds?: number;
  hint_used: boolean;
  attempts_count: number;
  vocabulary_items_tested: string[];
  grammar_concepts: string[];
  cultural_elements: string[];
  explanation?: string;
  feedback_positive?: string;
  feedback_improvement?: string;
  additional_resources: string[];
  question_generated_by: string;
  model_version?: string;
  generation_confidence?: number;
  created_at: string;
}

export interface SavedDescription {
  id: string;
  user_id?: string;
  session_id?: string;
  image_id: string;
  english_description: string;
  spanish_description: string;
  description_style: DescriptionStyle;
  word_count_english?: number;
  word_count_spanish?: number;
  complexity_score?: number;
  readability_score?: number;
  generated_vocabulary: any[];
  qa_pairs: any[];
  extracted_phrases: any[];
  is_favorite: boolean;
  tags: string[];
  personal_notes?: string;
  user_rating?: number;
  is_public: boolean;
  reported_issues: any[];
  model_version?: string;
  generation_params: Record<string, any>;
  generation_time_ms?: number;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  theme: ThemePreference;
  language: LanguagePreference;
  font_size: string;
  high_contrast: boolean;
  reduced_motion: boolean;
  default_description_style: DescriptionStyle;
  auto_save_descriptions: boolean;
  auto_save_vocabulary: boolean;
  auto_generate_qa: boolean;
  enable_notifications: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
  reminder_frequency: string;
  reminder_time: string;
  profile_public: boolean;
  share_progress: boolean;
  data_collection: boolean;
  default_export_format: ExportFormat;
  max_history_items: number;
  auto_backup: boolean;
  backup_frequency: string;
  daily_word_goal: number;
  weekly_session_goal: number;
  preferred_session_length: number;
  enable_experimental: boolean;
  enable_ai_suggestions: boolean;
  voice_enabled: boolean;
  offline_mode: boolean;
  settings_version: number;
  last_modified_by: string;
  created_at: string;
  updated_at: string;
}

// ==============================================
// MAIN DATABASE SERVICE CLASS
// ==============================================

export class DatabaseService {
  private supabase: SupabaseClient;
  private supabaseAdmin?: SupabaseClient;
  private config: DatabaseConfig;
  private connectionPool: Map<string, SupabaseClient> = new Map();
  private metrics: ConnectionMetrics;
  private retryQueue: Array<{ operation: Function; attempts: number }> = [];
  private queryCache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();

  constructor(config: DatabaseConfig) {
    this.config = {
      retryAttempts: 3,
      retryDelay: 1000,
      connectionTimeout: 10000,
      maxConnections: 10,
      enableLogging: true,
      ...config
    };

    // Initialize primary client
    this.supabase = createClient(config.supabaseUrl, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      },
      realtime: {
        timeout: this.config.connectionTimeout
      }
    });

    // Initialize admin client if service role key is provided
    if (config.serviceRoleKey) {
      this.supabaseAdmin = createClient(config.supabaseUrl, config.serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
    }

    this.metrics = {
      activeConnections: 0,
      totalQueries: 0,
      averageResponseTime: 0,
      errorCount: 0,
      uptime: Date.now(),
      cacheHitRate: 0
    };

    this.log('DatabaseService initialized successfully');
  }

  // ==============================================
  // UTILITY METHODS
  // ==============================================

  private log(message: string, level: 'info' | 'warn' | 'error' = 'info') {
    if (this.config.enableLogging) {
      console[level](`[DatabaseService] ${message}`);
    }
  }

  private createCacheKey(table: string, operation: string, params?: any): string {
    return `${table}:${operation}:${JSON.stringify(params || {})}`;
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.queryCache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    this.queryCache.delete(key);
    return null;
  }

  private setCache(key: string, data: any, ttl: number = 300000) { // 5 minutes default
    this.queryCache.set(key, { data, timestamp: Date.now(), ttl });
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string = 'unknown'
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= this.config.retryAttempts!; attempt++) {
      try {
        const startTime = Date.now();
        const result = await operation();
        
        // Update metrics
        this.metrics.totalQueries++;
        const responseTime = Date.now() - startTime;
        this.metrics.averageResponseTime = 
          (this.metrics.averageResponseTime + responseTime) / this.metrics.totalQueries;
        
        this.log(`Operation ${operationName} completed in ${responseTime}ms`);
        return result;
      } catch (error) {
        lastError = error;
        this.metrics.errorCount++;
        this.metrics.lastError = this.formatError(error);
        
        this.log(`Operation ${operationName} failed (attempt ${attempt}/${this.config.retryAttempts}): ${error}`, 'warn');
        
        if (attempt < this.config.retryAttempts!) {
          await this.delay(this.config.retryDelay! * attempt);
        }
      }
    }
    
    throw lastError;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private formatError(error: any): DatabaseError {
    return {
      code: error.code || 'UNKNOWN_ERROR',
      message: error.message || 'An unknown error occurred',
      details: error.details,
      hint: error.hint
    };
  }

  private formatResult<T>(data: T, error: any = null, count?: number): DatabaseResult<T> {
    return {
      data: error ? null : data,
      error: error ? this.formatError(error) : null,
      success: !error,
      count
    };
  }

  // ==============================================
  // CONNECTION MANAGEMENT
  // ==============================================

  public async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('id')
        .limit(1);
      
      return !error;
    } catch (error) {
      this.log(`Connection test failed: ${error}`, 'error');
      return false;
    }
  }

  public getMetrics(): ConnectionMetrics {
    return {
      ...this.metrics,
      uptime: Date.now() - this.metrics.uptime,
      cacheHitRate: this.queryCache.size > 0 ? 
        Math.round((this.metrics.totalQueries / this.queryCache.size) * 100) / 100 : 0
    };
  }

  public clearCache(): void {
    this.queryCache.clear();
    this.log('Query cache cleared');
  }

  // ==============================================
  // USER OPERATIONS
  // ==============================================

  async createUser(userData: Partial<User>): Promise<DatabaseResult<User>> {
    return this.executeWithRetry(async () => {
      const { data, error, count } = await this.supabase
        .from('users')
        .insert([{
          email: userData.email!,
          username: userData.username,
          full_name: userData.full_name,
          avatar_url: userData.avatar_url,
          spanish_level: userData.spanish_level || 'beginner',
          theme: userData.theme || 'light',
          language: userData.language || 'en',
          default_description_style: userData.default_description_style || 'conversacional',
          target_words_per_day: userData.target_words_per_day || 10,
          preferred_difficulty: userData.preferred_difficulty || 'beginner',
          enable_notifications: userData.enable_notifications !== false
        }])
        .select()
        .single();

      return this.formatResult(data, error, count);
    }, 'createUser');
  }

  async getUser(userId: string, useCache: boolean = true): Promise<DatabaseResult<User>> {
    const cacheKey = this.createCacheKey('users', 'get', { userId });
    
    if (useCache) {
      const cached = this.getFromCache<User>(cacheKey);
      if (cached) {
        return this.formatResult(cached);
      }
    }

    return this.executeWithRetry(async () => {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && useCache) {
        this.setCache(cacheKey, data);
      }

      return this.formatResult(data, error);
    }, 'getUser');
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<DatabaseResult<User>> {
    return this.executeWithRetry(async () => {
      const { data, error } = await this.supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      // Clear cache on update
      const cacheKey = this.createCacheKey('users', 'get', { userId });
      this.queryCache.delete(cacheKey);

      return this.formatResult(data, error);
    }, 'updateUser');
  }

  async deleteUser(userId: string): Promise<DatabaseResult<null>> {
    return this.executeWithRetry(async () => {
      const { error } = await this.supabase
        .from('users')
        .delete()
        .eq('id', userId);

      // Clear cache on delete
      const cacheKey = this.createCacheKey('users', 'get', { userId });
      this.queryCache.delete(cacheKey);

      return this.formatResult(null, error);
    }, 'deleteUser');
  }

  // ==============================================
  // SESSION OPERATIONS
  // ==============================================

  async createSession(sessionData: Partial<Session>): Promise<DatabaseResult<Session>> {
    return this.executeWithRetry(async () => {
      const { data, error } = await this.supabase
        .from('sessions')
        .insert([{
          user_id: sessionData.user_id,
          session_type: sessionData.session_type!,
          started_at: sessionData.started_at || new Date().toISOString(),
          images_processed: sessionData.images_processed || 0,
          descriptions_generated: sessionData.descriptions_generated || 0,
          qa_attempts: sessionData.qa_attempts || 0,
          qa_correct: sessionData.qa_correct || 0,
          vocabulary_learned: sessionData.vocabulary_learned || 0,
          phrases_saved: sessionData.phrases_saved || 0,
          session_data: sessionData.session_data || {},
          user_agent: sessionData.user_agent,
          ip_address: sessionData.ip_address,
          device_type: sessionData.device_type,
          engagement_score: sessionData.engagement_score || 0,
          completion_rate: sessionData.completion_rate || 0
        }])
        .select()
        .single();

      return this.formatResult(data, error);
    }, 'createSession');
  }

  async endSession(sessionId: string, endData: Partial<Session>): Promise<DatabaseResult<Session>> {
    return this.executeWithRetry(async () => {
      const { data, error } = await this.supabase
        .from('sessions')
        .update({
          ...endData,
          ended_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .select()
        .single();

      return this.formatResult(data, error);
    }, 'endSession');
  }

  async getUserSessions(
    userId: string, 
    options: QueryOptions = {}
  ): Promise<DatabaseResult<Session[]>> {
    const cacheKey = this.createCacheKey('sessions', 'getUserSessions', { userId, options });
    const cached = this.getFromCache<Session[]>(cacheKey);
    
    if (cached) {
      return this.formatResult(cached);
    }

    return this.executeWithRetry(async () => {
      let query = this.supabase
        .from('sessions')
        .select('*')
        .eq('user_id', userId);

      if (options.orderBy) {
        query = query.order(options.orderBy, { ascending: options.ascending !== false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error } = await query;

      if (!error) {
        this.setCache(cacheKey, data || []);
      }

      return this.formatResult(data || [], error);
    }, 'getUserSessions');
  }

  // ==============================================
  // VOCABULARY OPERATIONS
  // ==============================================

  async getVocabularyLists(options: QueryOptions = {}): Promise<DatabaseResult<VocabularyList[]>> {
    const cacheKey = this.createCacheKey('vocabulary_lists', 'getAll', options);
    const cached = this.getFromCache<VocabularyList[]>(cacheKey);
    
    if (cached) {
      return this.formatResult(cached);
    }

    return this.executeWithRetry(async () => {
      let query = this.supabase
        .from('vocabulary_lists')
        .select('*');

      if (options.filter) {
        Object.entries(options.filter).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      } else {
        query = query.eq('is_active', true);
      }

      query = query.order('created_at', { ascending: false });

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (!error) {
        this.setCache(cacheKey, data || []);
      }

      return this.formatResult(data || [], error);
    }, 'getVocabularyLists');
  }

  async createVocabularyList(listData: Partial<VocabularyList>): Promise<DatabaseResult<VocabularyList>> {
    return this.executeWithRetry(async () => {
      const { data, error } = await this.supabase
        .from('vocabulary_lists')
        .insert([{
          name: listData.name!,
          description: listData.description,
          category: listData.category || 'custom',
          difficulty_level: listData.difficulty_level || 1,
          is_active: listData.is_active !== false,
          is_public: listData.is_public || false,
          created_by: listData.created_by,
          shared_with: listData.shared_with || [],
          tags: listData.tags || [],
          language_pair: listData.language_pair || 'es-en'
        }])
        .select()
        .single();

      return this.formatResult(data, error);
    }, 'createVocabularyList');
  }

  async getVocabularyItems(
    listId: string, 
    options: QueryOptions = {}
  ): Promise<DatabaseResult<VocabularyItem[]>> {
    const cacheKey = this.createCacheKey('vocabulary_items', 'getByList', { listId, options });
    const cached = this.getFromCache<VocabularyItem[]>(cacheKey);
    
    if (cached) {
      return this.formatResult(cached);
    }

    return this.executeWithRetry(async () => {
      let query = this.supabase
        .from('vocabulary_items')
        .select('*')
        .eq('vocabulary_list_id', listId);

      if (options.filter) {
        Object.entries(options.filter).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      query = query.order('difficulty_level', { ascending: true });

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (!error) {
        this.setCache(cacheKey, data || []);
      }

      return this.formatResult(data || [], error);
    }, 'getVocabularyItems');
  }

  async addVocabularyItem(itemData: Partial<VocabularyItem>): Promise<DatabaseResult<VocabularyItem>> {
    return this.executeWithRetry(async () => {
      const { data, error } = await this.supabase
        .from('vocabulary_items')
        .insert([{
          vocabulary_list_id: itemData.vocabulary_list_id!,
          spanish_text: itemData.spanish_text!,
          english_translation: itemData.english_translation!,
          part_of_speech: itemData.part_of_speech || 'other',
          difficulty_level: itemData.difficulty_level || 'beginner',
          gender: itemData.gender,
          article: itemData.article,
          plural_form: itemData.plural_form,
          conjugation_info: itemData.conjugation_info,
          category: itemData.category,
          subcategory: itemData.subcategory,
          context_sentence_spanish: itemData.context_sentence_spanish,
          context_sentence_english: itemData.context_sentence_english,
          pronunciation_ipa: itemData.pronunciation_ipa,
          pronunciation_audio_url: itemData.pronunciation_audio_url,
          syllable_count: itemData.syllable_count,
          stress_pattern: itemData.stress_pattern,
          usage_notes: itemData.usage_notes,
          frequency_score: itemData.frequency_score || 1,
          commonality_rank: itemData.commonality_rank,
          register: itemData.register || 'neutral',
          synonyms: itemData.synonyms || [],
          antonyms: itemData.antonyms || [],
          related_words: itemData.related_words || [],
          word_family: itemData.word_family || [],
          memory_hints: itemData.memory_hints || [],
          cultural_notes: itemData.cultural_notes,
          false_friends: itemData.false_friends || [],
          associated_image_urls: itemData.associated_image_urls || [],
          emoji_representation: itemData.emoji_representation
        }])
        .select()
        .single();

      return this.formatResult(data, error);
    }, 'addVocabularyItem');
  }

  async updateVocabularyItem(
    itemId: string, 
    updates: Partial<VocabularyItem>
  ): Promise<DatabaseResult<VocabularyItem>> {
    return this.executeWithRetry(async () => {
      const { data, error } = await this.supabase
        .from('vocabulary_items')
        .update(updates)
        .eq('id', itemId)
        .select()
        .single();

      return this.formatResult(data, error);
    }, 'updateVocabularyItem');
  }

  async deleteVocabularyItem(itemId: string): Promise<DatabaseResult<null>> {
    return this.executeWithRetry(async () => {
      const { error } = await this.supabase
        .from('vocabulary_items')
        .delete()
        .eq('id', itemId);

      return this.formatResult(null, error);
    }, 'deleteVocabularyItem');
  }

  // ==============================================
  // LEARNING PROGRESS OPERATIONS
  // ==============================================

  async updateLearningProgress(
    userId: string,
    vocabularyItemId: string,
    progressData: Partial<LearningProgress>
  ): Promise<DatabaseResult<LearningProgress>> {
    return this.executeWithRetry(async () => {
      const { data, error } = await this.supabase
        .from('learning_progress')
        .upsert({
          user_id: userId,
          vocabulary_item_id: vocabularyItemId,
          mastery_level: progressData.mastery_level || 0,
          review_count: progressData.review_count || 0,
          correct_count: progressData.correct_count || 0,
          incorrect_count: progressData.incorrect_count || 0,
          streak_count: progressData.streak_count || 0,
          last_reviewed: progressData.last_reviewed,
          next_review: progressData.next_review,
          difficulty_adjustment: progressData.difficulty_adjustment || 0,
          learning_phase: progressData.learning_phase || 'new',
          confidence_score: progressData.confidence_score || 0,
          average_response_time: progressData.average_response_time,
          error_patterns: progressData.error_patterns || {},
          learning_velocity: progressData.learning_velocity || 1.0,
          ease_factor: progressData.ease_factor || 2.5,
          interval_days: progressData.interval_days || 1,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      return this.formatResult(data, error);
    }, 'updateLearningProgress');
  }

  async getLearningProgress(
    userId: string, 
    options: QueryOptions = {}
  ): Promise<DatabaseResult<LearningProgress[]>> {
    const cacheKey = this.createCacheKey('learning_progress', 'getByUser', { userId, options });
    const cached = this.getFromCache<LearningProgress[]>(cacheKey);
    
    if (cached) {
      return this.formatResult(cached);
    }

    return this.executeWithRetry(async () => {
      let query = this.supabase
        .from('learning_progress')
        .select(`
          *,
          vocabulary_items:vocabulary_item_id (
            spanish_text,
            english_translation,
            part_of_speech,
            category,
            difficulty_level
          )
        `)
        .eq('user_id', userId);

      if (options.filter) {
        Object.entries(options.filter).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      query = query.order('last_reviewed', { ascending: false });

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (!error) {
        this.setCache(cacheKey, data || []);
      }

      return this.formatResult(data || [], error);
    }, 'getLearningProgress');
  }

  // ==============================================
  // QA RESPONSE OPERATIONS
  // ==============================================

  async saveQAResponse(responseData: Partial<QAResponse>): Promise<DatabaseResult<QAResponse>> {
    return this.executeWithRetry(async () => {
      const { data, error } = await this.supabase
        .from('qa_responses')
        .insert([{
          user_id: responseData.user_id,
          session_id: responseData.session_id,
          image_id: responseData.image_id!,
          description_id: responseData.description_id,
          question: responseData.question!,
          correct_answer: responseData.correct_answer!,
          user_answer: responseData.user_answer,
          is_correct: responseData.is_correct,
          similarity_score: responseData.similarity_score,
          confidence_level: responseData.confidence_level,
          difficulty: responseData.difficulty || 'medio',
          question_type: responseData.question_type || 'factual',
          language_focus: responseData.language_focus,
          response_time_seconds: responseData.response_time_seconds,
          hint_used: responseData.hint_used || false,
          attempts_count: responseData.attempts_count || 1,
          vocabulary_items_tested: responseData.vocabulary_items_tested || [],
          grammar_concepts: responseData.grammar_concepts || [],
          cultural_elements: responseData.cultural_elements || [],
          explanation: responseData.explanation,
          feedback_positive: responseData.feedback_positive,
          feedback_improvement: responseData.feedback_improvement,
          additional_resources: responseData.additional_resources || [],
          question_generated_by: responseData.question_generated_by || 'ai',
          model_version: responseData.model_version,
          generation_confidence: responseData.generation_confidence
        }])
        .select()
        .single();

      return this.formatResult(data, error);
    }, 'saveQAResponse');
  }

  async getQAResponses(
    userId?: string, 
    options: QueryOptions = {}
  ): Promise<DatabaseResult<QAResponse[]>> {
    const cacheKey = this.createCacheKey('qa_responses', 'get', { userId, options });
    const cached = this.getFromCache<QAResponse[]>(cacheKey);
    
    if (cached) {
      return this.formatResult(cached);
    }

    return this.executeWithRetry(async () => {
      let query = this.supabase
        .from('qa_responses')
        .select('*');

      if (userId) {
        query = query.eq('user_id', userId);
      }

      if (options.filter) {
        Object.entries(options.filter).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      query = query.order('created_at', { ascending: false });

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (!error) {
        this.setCache(cacheKey, data || []);
      }

      return this.formatResult(data || [], error);
    }, 'getQAResponses');
  }

  // ==============================================
  // SAVED DESCRIPTIONS OPERATIONS
  // ==============================================

  async saveDescription(descriptionData: Partial<SavedDescription>): Promise<DatabaseResult<SavedDescription>> {
    return this.executeWithRetry(async () => {
      const { data, error } = await this.supabase
        .from('saved_descriptions')
        .insert([{
          user_id: descriptionData.user_id,
          session_id: descriptionData.session_id,
          image_id: descriptionData.image_id!,
          english_description: descriptionData.english_description!,
          spanish_description: descriptionData.spanish_description!,
          description_style: descriptionData.description_style!,
          word_count_english: descriptionData.word_count_english,
          word_count_spanish: descriptionData.word_count_spanish,
          complexity_score: descriptionData.complexity_score,
          readability_score: descriptionData.readability_score,
          generated_vocabulary: descriptionData.generated_vocabulary || [],
          qa_pairs: descriptionData.qa_pairs || [],
          extracted_phrases: descriptionData.extracted_phrases || [],
          is_favorite: descriptionData.is_favorite || false,
          tags: descriptionData.tags || [],
          personal_notes: descriptionData.personal_notes,
          user_rating: descriptionData.user_rating,
          is_public: descriptionData.is_public || false,
          reported_issues: descriptionData.reported_issues || [],
          model_version: descriptionData.model_version,
          generation_params: descriptionData.generation_params || {},
          generation_time_ms: descriptionData.generation_time_ms
        }])
        .select()
        .single();

      return this.formatResult(data, error);
    }, 'saveDescription');
  }

  async getSavedDescriptions(
    userId?: string, 
    options: QueryOptions = {}
  ): Promise<DatabaseResult<SavedDescription[]>> {
    const cacheKey = this.createCacheKey('saved_descriptions', 'get', { userId, options });
    const cached = this.getFromCache<SavedDescription[]>(cacheKey);
    
    if (cached) {
      return this.formatResult(cached);
    }

    return this.executeWithRetry(async () => {
      let query = this.supabase
        .from('saved_descriptions')
        .select('*');

      if (userId) {
        query = query.eq('user_id', userId);
      } else if (!options.filter?.is_public) {
        query = query.is('user_id', null);
      }

      if (options.filter) {
        Object.entries(options.filter).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      query = query.order('created_at', { ascending: false });

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (!error) {
        this.setCache(cacheKey, data || []);
      }

      return this.formatResult(data || [], error);
    }, 'getSavedDescriptions');
  }

  async toggleFavoriteDescription(
    descriptionId: string, 
    isFavorite: boolean
  ): Promise<DatabaseResult<SavedDescription>> {
    return this.executeWithRetry(async () => {
      const { data, error } = await this.supabase
        .from('saved_descriptions')
        .update({ 
          is_favorite: isFavorite,
          updated_at: new Date().toISOString()
        })
        .eq('id', descriptionId)
        .select()
        .single();

      return this.formatResult(data, error);
    }, 'toggleFavoriteDescription');
  }

  // ==============================================
  // USER SETTINGS OPERATIONS
  // ==============================================

  async getUserSettings(userId: string): Promise<DatabaseResult<UserSettings>> {
    const cacheKey = this.createCacheKey('user_settings', 'get', { userId });
    const cached = this.getFromCache<UserSettings>(cacheKey);
    
    if (cached) {
      return this.formatResult(cached);
    }

    return this.executeWithRetry(async () => {
      const { data, error } = await this.supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!error) {
        this.setCache(cacheKey, data);
      }

      return this.formatResult(data, error);
    }, 'getUserSettings');
  }

  async updateUserSettings(
    userId: string, 
    settings: Partial<UserSettings>
  ): Promise<DatabaseResult<UserSettings>> {
    return this.executeWithRetry(async () => {
      const { data, error } = await this.supabase
        .from('user_settings')
        .upsert({
          user_id: userId,
          ...settings,
          settings_version: (settings.settings_version || 0) + 1,
          last_modified_by: 'user',
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      // Clear cache on update
      const cacheKey = this.createCacheKey('user_settings', 'get', { userId });
      this.queryCache.delete(cacheKey);

      return this.formatResult(data, error);
    }, 'updateUserSettings');
  }

  // ==============================================
  // SEARCH AND ANALYTICS OPERATIONS
  // ==============================================

  async searchVocabulary(
    searchTerm: string, 
    filters: {
      difficulty?: DifficultyLevel;
      category?: string;
      partOfSpeech?: string;
      userId?: string;
    } = {},
    options: QueryOptions = {}
  ): Promise<DatabaseResult<VocabularyItem[]>> {
    return this.executeWithRetry(async () => {
      let query = this.supabase
        .from('vocabulary_items')
        .select('*')
        .or(`spanish_text.ilike.%${searchTerm}%,english_translation.ilike.%${searchTerm}%`);

      if (filters.difficulty) {
        query = query.eq('difficulty_level', filters.difficulty);
      }

      if (filters.category) {
        query = query.eq('category', filters.category);
      }

      if (filters.partOfSpeech) {
        query = query.eq('part_of_speech', filters.partOfSpeech);
      }

      query = query.order('frequency_score', { ascending: false });

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      return this.formatResult(data || [], error);
    }, 'searchVocabulary');
  }

  async getUserAnalytics(
    userId: string,
    dateRange: { start: string; end: string }
  ): Promise<DatabaseResult<any>> {
    return this.executeWithRetry(async () => {
      // Get session analytics
      const { data: sessions, error: sessionError } = await this.supabase
        .from('sessions')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end);

      if (sessionError) {
        return this.formatResult(null, sessionError);
      }

      // Get learning progress analytics
      const { data: progress, error: progressError } = await this.supabase
        .from('learning_progress')
        .select('*')
        .eq('user_id', userId)
        .gte('updated_at', dateRange.start)
        .lte('updated_at', dateRange.end);

      if (progressError) {
        return this.formatResult(null, progressError);
      }

      // Aggregate analytics
      const analytics = {
        sessions: {
          total: sessions?.length || 0,
          totalTime: sessions?.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) || 0,
          avgDuration: sessions?.length ? 
            sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / sessions.length : 0,
          avgAccuracy: sessions?.length ? 
            sessions.reduce((sum, s) => sum + ((s.qa_correct || 0) / Math.max(s.qa_attempts || 1, 1)), 0) / sessions.length * 100 : 0
        },
        vocabulary: {
          learned: progress?.filter(p => p.learning_phase !== 'new').length || 0,
          mastered: progress?.filter(p => p.learning_phase === 'mastered').length || 0,
          avgMastery: progress?.length ? 
            progress.reduce((sum, p) => sum + p.mastery_level, 0) / progress.length : 0
        },
        dateRange
      };

      return this.formatResult(analytics);
    }, 'getUserAnalytics');
  }

  // ==============================================
  // BULK OPERATIONS
  // ==============================================

  async bulkInsertVocabulary(
    vocabularyItems: Partial<VocabularyItem>[]
  ): Promise<DatabaseResult<VocabularyItem[]>> {
    return this.executeWithRetry(async () => {
      const { data, error } = await this.supabase
        .from('vocabulary_items')
        .insert(vocabularyItems.map(item => ({
          vocabulary_list_id: item.vocabulary_list_id!,
          spanish_text: item.spanish_text!,
          english_translation: item.english_translation!,
          part_of_speech: item.part_of_speech || 'other',
          difficulty_level: item.difficulty_level || 'beginner',
          frequency_score: item.frequency_score || 1,
          register: item.register || 'neutral',
          synonyms: item.synonyms || [],
          antonyms: item.antonyms || [],
          related_words: item.related_words || [],
          word_family: item.word_family || [],
          memory_hints: item.memory_hints || [],
          false_friends: item.false_friends || [],
          associated_image_urls: item.associated_image_urls || [],
          ...item
        })))
        .select();

      return this.formatResult(data || [], error);
    }, 'bulkInsertVocabulary');
  }

  // ==============================================
  // CLEANUP AND SHUTDOWN
  // ==============================================

  public async cleanup(): Promise<void> {
    try {
      // Clear caches
      this.clearCache();
      
      // Close connections
      this.connectionPool.clear();
      
      this.log('DatabaseService cleanup completed');
    } catch (error) {
      this.log(`Error during cleanup: ${error}`, 'error');
    }
  }
}

// ==============================================
// SINGLETON INSTANCE
// ==============================================

let databaseInstance: DatabaseService | null = null;

export const initializeDatabase = (config: DatabaseConfig): DatabaseService => {
  if (!databaseInstance) {
    databaseInstance = new DatabaseService(config);
  }
  return databaseInstance;
};

export const getDatabase = (): DatabaseService => {
  if (!databaseInstance) {
    throw new Error('Database not initialized. Call initializeDatabase first.');
  }
  return databaseInstance;
};

// ==============================================
// CONVENIENCE FUNCTIONS
// ==============================================

export const createDatabaseService = (
  supabaseUrl?: string,
  anonKey?: string,
  serviceRoleKey?: string
): DatabaseService => {
  const config: DatabaseConfig = {
    supabaseUrl: supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: anonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    serviceRoleKey: serviceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY,
    enableLogging: process.env.NODE_ENV === 'development',
    retryAttempts: 3,
    retryDelay: 1000,
    maxConnections: 10
  };

  return new DatabaseService(config);
};

// Export the service for easy imports
export default DatabaseService;