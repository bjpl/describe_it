/**
 * Database utility functions and helpers
 * Provides common database operations and query builders
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  DatabaseSchema,
  TableTypeMap,
  Tables,
  TablesInsert,
  TablesUpdate,
  ApiResponse,
  PaginatedResponse,
  LearningAnalytics,
  UserWithProgress,
  SessionWithDetails,
  DescriptionWithRelations,
  UserProgress,
  Session,
  ImageRecord,
  DescriptionRecord,
  Phrase,
} from "../../../types/database";

// Supabase client instance
let supabase: SupabaseClient<Database>;

/**
 * Initialize Supabase client
 */
export function initializeDatabase(
  url: string,
  apiKey: string,
): SupabaseClient<Database> {
  if (!supabase) {
    supabase = createClient<Database>(url, apiKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
      },
      db: {
        schema: "public",
      },
      global: {
        headers: {
          "x-application": "spanish-learning-app",
        },
      },
    });
  }
  return supabase;
}

/**
 * Get Supabase client instance
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  if (!supabase) {
    throw new Error(
      "Database not initialized. Call initializeDatabase() first.",
    );
  }
  return supabase;
}

// Simplified database operations without complex generics
export class DatabaseOperations {
  constructor(private client: SupabaseClient<Database> = getSupabaseClient()) {}

  /**
   * Get single record by ID from any table
   */
  async findById<T = any>(table: string, id: string): Promise<ApiResponse<T>> {
    try {
      const { data, error } = await this.client
        .from(table)
        .select("*")
        .eq("id", id)
        .single();

      return {
        data: data as T | null,
        error: error?.message || null,
      };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }

  /**
   * Get multiple records with pagination from any table
   */
  async findMany<T = any>(
    table: string,
    options: {
      page?: number;
      limit?: number;
      orderBy?: string;
      order?: "asc" | "desc";
      filters?: Record<string, any>;
    } = {},
  ): Promise<PaginatedResponse<T>> {
    try {
      const {
        page = 1,
        limit = 20,
        orderBy = "created_at",
        order = "desc",
        filters = {},
      } = options;
      const offset = (page - 1) * limit;

      let query = this.client
        .from(table)
        .select("*", { count: "exact" });

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });

      const { data, error, count } = await query
        .order(orderBy, { ascending: order === "asc" })
        .range(offset, offset + limit - 1);

      const total = count || 0;
      const pages = Math.ceil(total / limit);

      return {
        data: (data || []) as T[],
        error: error?.message || null,
        meta: {
          total,
          page,
          limit,
          pages,
          has_more: page < pages,
        },
      };
    } catch (err) {
      return {
        data: [],
        error: err instanceof Error ? err.message : "Unknown error",
        meta: {
          total: 0,
          page: 1,
          limit: 20,
          pages: 0,
          has_more: false,
        },
      };
    }
  }

  /**
   * Create new record in any table
   */
  async create<T = any>(table: string, data: Record<string, any>): Promise<ApiResponse<T>> {
    try {
      const { data: newRecord, error } = await (this.client as any)
        .from(table)
        .insert(data)
        .select()
        .single();

      return {
        data: newRecord as T | null,
        error: error?.message || null,
        message: "Record created successfully",
      };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }

  /**
   * Update record by ID in any table
   */
  async update<T = any>(
    table: string,
    id: string,
    data: Record<string, any>,
  ): Promise<ApiResponse<T>> {
    try {
      const { data: updatedRecord, error } = await (this.client as any)
        .from(table)
        .update(data)
        .eq("id", id)
        .select()
        .single();

      return {
        data: updatedRecord as T | null,
        error: error?.message || null,
        message: "Record updated successfully",
      };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }

  /**
   * Delete record by ID from any table
   */
  async delete(table: string, id: string): Promise<ApiResponse<null>> {
    try {
      const { error } = await this.client
        .from(table)
        .delete()
        .eq("id", id);

      return {
        data: null,
        error: error?.message || null,
        message: "Record deleted successfully",
      };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }
}

// Specialized service classes with proper typing
export class UserService {
  constructor(private client: SupabaseClient<Database> = getSupabaseClient()) {}

  /**
   * Get user with progress data
   */
  async getUserWithProgress(
    userId: string,
  ): Promise<ApiResponse<UserWithProgress>> {
    try {
      const { data: user, error: userError } = await this.client
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (userError) {
        return { data: null, error: userError.message };
      }

      // Get achievements from progress records
      const { data: achievements } = await this.client
        .from("user_progress")
        .select("*")
        .eq("user_id", userId);

      // Note: achievements_unlocked field may not exist in learning_progress table
      const allAchievements: any[] = [];
      // achievements?.flatMap((a: any) => a.achievements_unlocked) || [];

      return {
        data: {
          ...(user && typeof user === 'object' ? user : {}),
          achievements: Array.from(new Set(allAchievements)),
        } as UserWithProgress,
        error: null,
      };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }

  /**
   * Update user streak and points
   */
  async updateUserStats(
    userId: string,
    pointsEarned: number,
  ): Promise<ApiResponse<Tables<"users">>> {
    try {
      // First get current points, then update
      const { data: currentUser } = await this.client
        .from("users")
        .select("total_points")
        .eq("id", userId)
        .single();
      
      const newPoints = ((currentUser as any)?.total_points || 0) + pointsEarned;
      
      const { data: user, error } = await (this.client as any)
        .from("users")
        .update({
          total_points: newPoints,
          last_active_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)
        .select()
        .single();

      return {
        data: user as Tables<"users"> | null,
        error: error?.message || null,
      };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }
}

export class SessionService {
  constructor(private client: SupabaseClient<Database> = getSupabaseClient()) {}

  /**
   * Get session with all related data
   */
  async getSessionWithDetails(
    sessionId: string,
  ): Promise<ApiResponse<SessionWithDetails>> {
    try {
      const { data, error } = await this.client
        .from("sessions")
        .select(`
          *,
          user:users(*),
          descriptions(*),
          questions(*),
          phrases(*)
        `)
        .eq("id", sessionId)
        .single();

      return {
        data: data as SessionWithDetails | null,
        error: error?.message || null,
      };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }

  /**
   * Start new learning session
   */
  async startSession(
    userId: string,
    sessionType: Tables<"sessions">["session_type"] = "practice",
  ): Promise<ApiResponse<Tables<"sessions">>> {
    try {
      const sessionData = {
        user_id: userId,
        session_type: sessionType,
        status: "active" as const,
        started_at: new Date().toISOString(),
        device_info: {}, // Would be populated from client
      };

      const { data: newSession, error } = await (this.client as any)
        .from("sessions")
        .insert(sessionData)
        .select()
        .single();

      return {
        data: newSession as Tables<"sessions"> | null,
        error: error?.message || null,
        message: "Session created successfully",
      };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }

  /**
   * Complete session and calculate final stats
   */
  async completeSession(
    sessionId: string,
  ): Promise<ApiResponse<Tables<"sessions">>> {
    try {
      const updateData = {
        status: "completed" as const,
        completed_at: new Date().toISOString(),
      };

      const { data: completedSession, error } = await (this.client as any)
        .from("sessions")
        .update(updateData)
        .eq("id", sessionId)
        .select()
        .single();

      return {
        data: completedSession as Tables<"sessions"> | null,
        error: error?.message || null,
        message: "Session completed successfully",
      };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }
}

export class DescriptionService {
  constructor(private client: SupabaseClient<Database> = getSupabaseClient()) {}

  /**
   * Get description with related data
   */
  async getDescriptionWithRelations(
    descriptionId: string,
  ): Promise<ApiResponse<DescriptionWithRelations>> {
    try {
      const { data, error } = await this.client
        .from("descriptions")
        .select(`
          *,
          session:sessions(*),
          image:images(*),
          user:users(*),
          questions(*),
          phrases(*)
        `)
        .eq("id", descriptionId)
        .single();

      return {
        data: data as DescriptionWithRelations | null,
        error: error?.message || null,
      };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }

  /**
   * Mark description as completed
   */
  async markCompleted(
    descriptionId: string,
    completionTimeSeconds: number,
    userRating?: number,
  ): Promise<ApiResponse<Tables<"descriptions">>> {
    try {
      const updateData: Record<string, any> = {
        is_completed: true,
        completed_at: new Date().toISOString(),
        completion_time_seconds: completionTimeSeconds,
      };

      if (userRating) {
        updateData.user_rating = userRating;
      }

      const { data: updatedDescription, error } = await (this.client as any)
        .from("descriptions")
        .update(updateData)
        .eq("id", descriptionId)
        .select()
        .single();

      return {
        data: updatedDescription as Tables<"descriptions"> | null,
        error: error?.message || null,
        message: "Description marked as completed",
      };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }
}

// Analytics and reporting functions
export class AnalyticsService {
  constructor(private client: SupabaseClient<Database> = getSupabaseClient()) {}

  /**
   * Get comprehensive learning analytics for a user
   */
  async getUserAnalytics(
    userId: string,
    daysBack: number = 30,
  ): Promise<ApiResponse<LearningAnalytics>> {
    try {
      // Get basic user data for analytics
      const { data: userData, error: userError } = await this.client
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (userError) {
        return { data: null, error: userError.message };
      }

      // Get progress data
      const { data: progressData, error: progressError } = await this.client
        .from("user_progress")
        .select("*")
        .eq("user_id", userId);

      if (progressError) {
        return { data: null, error: progressError.message };
      }

      // Create analytics summary
      const analytics: LearningAnalytics = {
        user_id: userId,
        overall_performance: {
          total_points: (userData as any)?.total_points || 0,
          accuracy_rate: 0, // Would calculate from QA responses
          consistency_score: 0, // Would calculate from session frequency
          improvement_trend: "stable",
        },
        skill_breakdown: {}, // Would analyze from progress data
        recent_activity: {
          sessions_last_week: 0, // Would calculate from sessions
          descriptions_completed: 0,
          new_phrases_learned: progressData?.length || 0,
        },
        recommendations: {
          focus_areas: [],
          suggested_difficulty: (userData as any)?.learning_level || "beginner",
          next_milestones: [],
        },
      };

      return {
        data: analytics,
        error: null,
      };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }

  /**
   * Get system-wide analytics (admin only)
   */
  async getSystemAnalytics(): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await this.client
        .from("users")
        .select("learning_level, subscription_status, created_at");

      if (error) {
        return { data: null, error: error.message };
      }

      // Calculate system metrics
      const now = new Date();
      const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const metrics = {
        total_users: data?.length || 0,
        new_users_last_month: data?.filter(
          (u: any) => new Date(u.created_at) > lastMonth,
        ).length || 0,
        users_by_level: data?.reduce(
          (acc: Record<string, number>, u: any) => {
            acc[u.learning_level] = (acc[u.learning_level] || 0) + 1;
            return acc;
          },
          {},
        ) || {},
        premium_users: data?.filter((u: any) => u.subscription_status !== "free")
          .length || 0,
      };

      return {
        data: metrics,
        error: null,
      };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }
}

// Export service instances
export const databaseOperations = new DatabaseOperations();
export const userService = new UserService();
export const sessionService = new SessionService();
export const descriptionService = new DescriptionService();
export const analyticsService = new AnalyticsService();

// Export database operations for other tables
export const imageOperations = {
  findById: (id: string) => databaseOperations.findById<ImageRecord>("images", id),
  findMany: (options?: any) => databaseOperations.findMany<ImageRecord>("images", options),
  create: (data: Record<string, any>) => databaseOperations.create<ImageRecord>("images", data),
  update: (id: string, data: Record<string, any>) => databaseOperations.update<ImageRecord>("images", id, data),
  delete: (id: string) => databaseOperations.delete("images", id),
};

export const questionOperations = {
  findById: (id: string) => databaseOperations.findById("questions", id),
  findMany: (options?: any) => databaseOperations.findMany("questions", options),
  create: (data: Record<string, any>) => databaseOperations.create("questions", data),
  update: (id: string, data: Record<string, any>) => databaseOperations.update("questions", id, data),
  delete: (id: string) => databaseOperations.delete("questions", id),
};

export const phraseOperations = {
  findById: (id: string) => databaseOperations.findById<Phrase>("phrases", id),
  findMany: (options?: any) => databaseOperations.findMany<Phrase>("phrases", options),
  create: (data: Record<string, any>) => databaseOperations.create<Phrase>("phrases", data),
  update: (id: string, data: Record<string, any>) => databaseOperations.update<Phrase>("phrases", id, data),
  delete: (id: string) => databaseOperations.delete("phrases", id),
};

export const progressOperations = {
  findById: (id: string) => databaseOperations.findById<UserProgress>("user_progress", id),
  findMany: (options?: any) => databaseOperations.findMany<UserProgress>("user_progress", options),
  create: (data: Record<string, any>) => databaseOperations.create<UserProgress>("user_progress", data),
  update: (id: string, data: Record<string, any>) => databaseOperations.update<UserProgress>("user_progress", id, data),
  delete: (id: string) => databaseOperations.delete("user_progress", id),
};

export const exportOperations = {
  findById: (id: string) => databaseOperations.findById("export_history", id),
  findMany: (options?: any) => databaseOperations.findMany("export_history", options),
  create: (data: Record<string, any>) => databaseOperations.create("export_history", data),
  update: (id: string, data: Record<string, any>) => databaseOperations.update("export_history", id, data),
  delete: (id: string) => databaseOperations.delete("export_history", id),
};

// Utility functions
export function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export function sanitizeInput(input: string): string {
  return input.replace(/<[^>]*>/g, "").trim();
}

export function calculateReadingTime(
  text: string,
  wordsPerMinute: number = 200,
): number {
  const wordCount = text.split(/\s+/).length;
  return Math.max(10, Math.ceil((wordCount / wordsPerMinute) * 60));
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Error handling utilities
export class DatabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any,
  ) {
    super(message);
    this.name = "DatabaseError";
  }
}

export function handleDatabaseError(error: any): DatabaseError {
  if (error?.code) {
    switch (error.code) {
      case "23505":
        return new DatabaseError("Duplicate entry", "DUPLICATE_ENTRY", error);
      case "23503":
        return new DatabaseError(
          "Foreign key violation",
          "FOREIGN_KEY_VIOLATION",
          error,
        );
      case "42501":
        return new DatabaseError(
          "Insufficient permissions",
          "PERMISSION_DENIED",
          error,
        );
      default:
        return new DatabaseError(
          error.message || "Database error",
          error.code,
          error,
        );
    }
  }

  return new DatabaseError(
    error.message || "Unknown database error",
    "UNKNOWN_ERROR",
    error,
  );
}

const databaseUtils = {
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
  AnalyticsService,
};

export default databaseUtils;