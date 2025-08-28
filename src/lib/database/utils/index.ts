/**
 * Database utility functions and helpers
 * Provides common database operations and query builders
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { 
  Database, 
  DatabaseSchema,
  Tables,
  TablesInsert,
  TablesUpdate,
  ApiResponse,
  PaginatedResponse,
  LearningAnalytics,
  UserWithProgress,
  SessionWithDetails,
  DescriptionWithRelations
} from '../../../types/database'

// Supabase client instance
let supabase: SupabaseClient<Database>

/**
 * Initialize Supabase client
 */
export function initializeDatabase(url: string, apiKey: string): SupabaseClient<Database> {
  if (!supabase) {
    supabase = createClient<Database>(url, apiKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'x-application': 'spanish-learning-app'
        }
      }
    })
  }
  return supabase
}

/**
 * Get Supabase client instance
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  if (!supabase) {
    throw new Error('Database not initialized. Call initializeDatabase() first.')
  }
  return supabase
}

// Generic database operations
export class DatabaseOperations<T extends keyof Database['public']['Tables']> {
  constructor(
    private tableName: T,
    private client: SupabaseClient<Database> = getSupabaseClient()
  ) {}

  /**
   * Get single record by ID
   */
  async findById(id: string): Promise<ApiResponse<Tables<T>>> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single()

      return {
        data,
        error: error?.message || null
      }
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Unknown error'
      }
    }
  }

  /**
   * Get multiple records with pagination
   */
  async findMany(
    options: {
      page?: number
      limit?: number
      orderBy?: string
      order?: 'asc' | 'desc'
      filters?: Record<string, any>
    } = {}
  ): Promise<PaginatedResponse<Tables<T>>> {
    try {
      const { page = 1, limit = 20, orderBy = 'created_at', order = 'desc', filters = {} } = options
      const offset = (page - 1) * limit

      let query = this.client.from(this.tableName).select('*', { count: 'exact' })

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value)
        }
      })

      const { data, error, count } = await query
        .order(orderBy, { ascending: order === 'asc' })
        .range(offset, offset + limit - 1)

      const total = count || 0
      const pages = Math.ceil(total / limit)

      return {
        data: data || [],
        error: error?.message || null,
        meta: {
          total,
          page,
          limit,
          pages,
          has_more: page < pages
        }
      }
    } catch (err) {
      return {
        data: [],
        error: err instanceof Error ? err.message : 'Unknown error',
        meta: {
          total: 0,
          page: 1,
          limit: 20,
          pages: 0,
          has_more: false
        }
      }
    }
  }

  /**
   * Create new record
   */
  async create(data: TablesInsert<T>): Promise<ApiResponse<Tables<T>>> {
    try {
      const { data: newRecord, error } = await this.client
        .from(this.tableName)
        .insert(data)
        .select()
        .single()

      return {
        data: newRecord,
        error: error?.message || null,
        message: 'Record created successfully'
      }
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Unknown error'
      }
    }
  }

  /**
   * Update record by ID
   */
  async update(id: string, data: TablesUpdate<T>): Promise<ApiResponse<Tables<T>>> {
    try {
      const { data: updatedRecord, error } = await this.client
        .from(this.tableName)
        .update(data)
        .eq('id', id)
        .select()
        .single()

      return {
        data: updatedRecord,
        error: error?.message || null,
        message: 'Record updated successfully'
      }
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Unknown error'
      }
    }
  }

  /**
   * Delete record by ID
   */
  async delete(id: string): Promise<ApiResponse<null>> {
    try {
      const { error } = await this.client
        .from(this.tableName)
        .delete()
        .eq('id', id)

      return {
        data: null,
        error: error?.message || null,
        message: 'Record deleted successfully'
      }
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Unknown error'
      }
    }
  }
}

// Specialized service classes
export class UserService extends DatabaseOperations<'users'> {
  constructor() {
    super('users')
  }

  /**
   * Get user with progress data
   */
  async getUserWithProgress(userId: string): Promise<ApiResponse<UserWithProgress>> {
    try {
      const { data: user, error: userError } = await this.client
        .from('users')
        .select(`
          *,
          recent_progress:user_progress(*)
        `)
        .eq('id', userId)
        .single()

      if (userError) {
        return { data: null, error: userError.message }
      }

      // Get achievements from progress records
      const { data: achievements } = await this.client
        .from('user_progress')
        .select('achievements_unlocked')
        .eq('user_id', userId)
        .not('achievements_unlocked', 'eq', '{}')

      const allAchievements = achievements?.flatMap(a => a.achievements_unlocked) || []

      return {
        data: {
          ...user,
          achievements: [...new Set(allAchievements)]
        } as UserWithProgress,
        error: null
      }
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Unknown error'
      }
    }
  }

  /**
   * Update user streak and points
   */
  async updateUserStats(userId: string, pointsEarned: number): Promise<ApiResponse<Tables<'users'>>> {
    try {
      const { data: user, error } = await this.client
        .from('users')
        .update({
          total_points: this.client.sql`total_points + ${pointsEarned}`,
          last_active_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as TablesUpdate<'users'>)
        .eq('id', userId)
        .select()
        .single()

      return {
        data: user,
        error: error?.message || null
      }
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Unknown error'
      }
    }
  }
}

export class SessionService extends DatabaseOperations<'sessions'> {
  constructor() {
    super('sessions')
  }

  /**
   * Get session with all related data
   */
  async getSessionWithDetails(sessionId: string): Promise<ApiResponse<SessionWithDetails>> {
    try {
      const { data, error } = await this.client
        .from('sessions')
        .select(`
          *,
          user:users(*),
          descriptions(*),
          questions(*),
          phrases(*)
        `)
        .eq('id', sessionId)
        .single()

      return {
        data: data as SessionWithDetails,
        error: error?.message || null
      }
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Unknown error'
      }
    }
  }

  /**
   * Start new learning session
   */
  async startSession(
    userId: string, 
    sessionType: Tables<'sessions'>['session_type'] = 'practice'
  ): Promise<ApiResponse<Tables<'sessions'>>> {
    try {
      const sessionData: TablesInsert<'sessions'> = {
        user_id: userId,
        session_type: sessionType,
        status: 'active',
        started_at: new Date().toISOString(),
        device_info: {} // Would be populated from client
      }

      return await this.create(sessionData)
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Unknown error'
      }
    }
  }

  /**
   * Complete session and calculate final stats
   */
  async completeSession(sessionId: string): Promise<ApiResponse<Tables<'sessions'>>> {
    try {
      const updateData: TablesUpdate<'sessions'> = {
        status: 'completed',
        completed_at: new Date().toISOString()
      }

      return await this.update(sessionId, updateData)
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Unknown error'
      }
    }
  }
}

export class DescriptionService extends DatabaseOperations<'descriptions'> {
  constructor() {
    super('descriptions')
  }

  /**
   * Get description with related data
   */
  async getDescriptionWithRelations(descriptionId: string): Promise<ApiResponse<DescriptionWithRelations>> {
    try {
      const { data, error } = await this.client
        .from('descriptions')
        .select(`
          *,
          session:sessions(*),
          image:images(*),
          user:users(*),
          questions(*),
          phrases(*)
        `)
        .eq('id', descriptionId)
        .single()

      return {
        data: data as DescriptionWithRelations,
        error: error?.message || null
      }
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Unknown error'
      }
    }
  }

  /**
   * Mark description as completed
   */
  async markCompleted(
    descriptionId: string, 
    completionTimeSeconds: number,
    userRating?: number
  ): Promise<ApiResponse<Tables<'descriptions'>>> {
    try {
      const updateData: TablesUpdate<'descriptions'> = {
        is_completed: true,
        completed_at: new Date().toISOString(),
        completion_time_seconds: completionTimeSeconds,
        ...(userRating && { user_rating: userRating })
      }

      return await this.update(descriptionId, updateData)
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Unknown error'
      }
    }
  }
}

// Analytics and reporting functions
export class AnalyticsService {
  constructor(private client: SupabaseClient<Database> = getSupabaseClient()) {}

  /**
   * Get comprehensive learning analytics for a user
   */
  async getUserAnalytics(userId: string, daysBack: number = 30): Promise<ApiResponse<LearningAnalytics>> {
    try {
      // Get user progress summary
      const { data: progressSummary, error: progressError } = await this.client
        .rpc('get_user_progress_summary', { 
          user_uuid: userId, 
          days_back: daysBack 
        })

      if (progressError) {
        return { data: null, error: progressError.message }
      }

      // Get question statistics
      const { data: questionStats, error: questionError } = await this.client
        .rpc('get_user_question_stats', { 
          user_uuid: userId, 
          days_back: daysBack 
        })

      if (questionError) {
        return { data: null, error: questionError.message }
      }

      // Get vocabulary statistics
      const { data: vocabStats, error: vocabError } = await this.client
        .rpc('get_user_vocabulary_stats', { user_uuid: userId })

      if (vocabError) {
        return { data: null, error: vocabError.message }
      }

      const summary = progressSummary[0]
      const questions = questionStats[0]
      const vocab = vocabStats[0]

      const analytics: LearningAnalytics = {
        user_id: userId,
        overall_performance: {
          total_points: summary.total_points,
          accuracy_rate: questions?.accuracy_percentage || 0,
          consistency_score: 0, // Would calculate from session frequency
          improvement_trend: summary.improvement_trend as 'improving' | 'stable' | 'declining'
        },
        skill_breakdown: summary.top_skills || {},
        recent_activity: {
          sessions_last_week: 0, // Would calculate from sessions
          descriptions_completed: 0,
          new_phrases_learned: vocab?.phrases_learned || 0
        },
        recommendations: {
          focus_areas: [],
          suggested_difficulty: summary.overall_level,
          next_milestones: Object.keys(summary.next_milestones || {})
        }
      }

      return {
        data: analytics,
        error: null
      }
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Unknown error'
      }
    }
  }

  /**
   * Get system-wide analytics (admin only)
   */
  async getSystemAnalytics(): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await this.client
        .from('users')
        .select('learning_level, subscription_status, created_at')

      if (error) {
        return { data: null, error: error.message }
      }

      // Calculate system metrics
      const now = new Date()
      const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      const metrics = {
        total_users: data.length,
        new_users_last_month: data.filter(u => new Date(u.created_at) > lastMonth).length,
        users_by_level: data.reduce((acc, u) => {
          acc[u.learning_level] = (acc[u.learning_level] || 0) + 1
          return acc
        }, {} as Record<string, number>),
        premium_users: data.filter(u => u.subscription_status !== 'free').length
      }

      return {
        data: metrics,
        error: null
      }
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Unknown error'
      }
    }
  }
}

// Export service instances
export const userService = new UserService()
export const sessionService = new SessionService()
export const descriptionService = new DescriptionService()
export const analyticsService = new AnalyticsService()

// Export database operations for other tables
export const imageOperations = new DatabaseOperations('images')
export const questionOperations = new DatabaseOperations('questions')
export const phraseOperations = new DatabaseOperations('phrases')
export const progressOperations = new DatabaseOperations('user_progress')
export const exportOperations = new DatabaseOperations('export_history')

// Utility functions
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

export function sanitizeInput(input: string): string {
  return input.replace(/<[^>]*>/g, '').trim()
}

export function calculateReadingTime(text: string, wordsPerMinute: number = 200): number {
  const wordCount = text.split(/\s+/).length
  return Math.max(10, Math.ceil((wordCount / wordsPerMinute) * 60))
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Error handling utilities
export class DatabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message)
    this.name = 'DatabaseError'
  }
}

export function handleDatabaseError(error: any): DatabaseError {
  if (error?.code) {
    switch (error.code) {
      case '23505':
        return new DatabaseError('Duplicate entry', 'DUPLICATE_ENTRY', error)
      case '23503':
        return new DatabaseError('Foreign key violation', 'FOREIGN_KEY_VIOLATION', error)
      case '42501':
        return new DatabaseError('Insufficient permissions', 'PERMISSION_DENIED', error)
      default:
        return new DatabaseError(error.message || 'Database error', error.code, error)
    }
  }
  
  return new DatabaseError(
    error.message || 'Unknown database error',
    'UNKNOWN_ERROR',
    error
  )
}

export default {
  initializeDatabase,
  getSupabaseClient,
  userService,
  sessionService,
  descriptionService,
  analyticsService,
  DatabaseOperations,
  UserService,
  SessionService,
  DescriptionService,
  AnalyticsService
}