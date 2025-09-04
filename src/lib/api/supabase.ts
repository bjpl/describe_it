import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  UserProgress,
  UserProgressInsert,
  Phrase,
  PhraseInsert,
  Session,
  SessionInsert,
  ImageRecord,
  ImageInsert,
  DescriptionRecord,
  DescriptionInsert,
} from "../../types/database";
import { featureFlags, getServiceConfig } from "../../config/environment";

// Demo/Local storage implementation for when Supabase is not available
class LocalStorageAdapter {
  private prefix = "describe_it_";

  private getKey(table: string, id?: string): string {
    return `${this.prefix}${table}${id ? `_${id}` : ""}`;
  }

  private mockResponse<T>(data: T, error: unknown = null) {
    return Promise.resolve({ data, error });
  }

  async saveItem(table: string, item: Record<string, unknown>): Promise<{ data: unknown; error: unknown }> {
    try {
      const id =
        item.id ||
        `${table}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const itemWithId = {
        ...item,
        id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      localStorage.setItem(this.getKey(table, id.toString()), JSON.stringify(itemWithId));

      // Update table index
      const indexKey = this.getKey(`${table}_index`);
      const existingIndex = JSON.parse(localStorage.getItem(indexKey) || "[]");
      if (!existingIndex.includes(id)) {
        existingIndex.push(id);
        localStorage.setItem(indexKey, JSON.stringify(existingIndex));
      }

      return this.mockResponse(itemWithId);
    } catch (error) {
      return this.mockResponse(null, {
        message: `Failed to save ${table}`,
        error,
      });
    }
  }

  async getItem(table: string, id: string): Promise<{ data: unknown; error: unknown }> {
    try {
      const item = localStorage.getItem(this.getKey(table, id));
      if (!item) {
        return this.mockResponse(null, {
          message: "Item not found",
          code: "PGRST116",
        });
      }
      return this.mockResponse(JSON.parse(item));
    } catch (error) {
      return this.mockResponse(null, {
        message: `Failed to get ${table}`,
        error,
      });
    }
  }

  async getItems(
    table: string,
    filters: Record<string, unknown> = {},
  ): Promise<{ data: unknown[]; error: unknown }> {
    try {
      const indexKey = this.getKey(`${table}_index`);
      const index = JSON.parse(localStorage.getItem(indexKey) || "[]");

      const items = index
        .map((id: string) => {
          const item = localStorage.getItem(this.getKey(table, id));
          return item ? JSON.parse(item) : null;
        })
        .filter((item: unknown): item is Record<string, unknown> => Boolean(item));

      // Apply basic filtering (simplified)
      let filteredItems = items;
      Object.keys(filters).forEach((key) => {
        if (filters[key] !== undefined) {
          filteredItems = filteredItems.filter(
            (item: Record<string, unknown>) => item[key] === filters[key],
          );
        }
      });

      return this.mockResponse(filteredItems);
    } catch (error) {
      return this.mockResponse([], {
        message: `Failed to get ${table}s`,
        error,
      });
    }
  }

  async updateItem(
    table: string,
    id: string,
    updates: Record<string, unknown>,
  ): Promise<{ data: unknown; error: unknown }> {
    try {
      const existingItem = localStorage.getItem(this.getKey(table, id));
      if (!existingItem) {
        return this.mockResponse(null, { message: "Item not found" });
      }

      const item = JSON.parse(existingItem);
      const updatedItem = {
        ...item,
        ...updates,
        updated_at: new Date().toISOString(),
      };
      localStorage.setItem(this.getKey(table, id), JSON.stringify(updatedItem));

      return this.mockResponse(updatedItem);
    } catch (error) {
      return this.mockResponse(null, {
        message: `Failed to update ${table}`,
        error,
      });
    }
  }

  async deleteItem(table: string, id: string): Promise<{ error: unknown }> {
    try {
      localStorage.removeItem(this.getKey(table, id));

      // Update table index
      const indexKey = this.getKey(`${table}_index`);
      const existingIndex = JSON.parse(localStorage.getItem(indexKey) || "[]");
      const updatedIndex = existingIndex.filter(
        (itemId: string) => itemId !== id,
      );
      localStorage.setItem(indexKey, JSON.stringify(updatedIndex));

      return { error: null };
    } catch (error) {
      return { error: { message: `Failed to delete ${table}`, error } };
    }
  }

  async getStats(): Promise<{
    data: { totalImages: number; totalDescriptions: number };
    error: unknown;
  }> {
    try {
      const imagesIndex = JSON.parse(
        localStorage.getItem(this.getKey("images_index")) || "[]",
      );
      const descriptionsIndex = JSON.parse(
        localStorage.getItem(this.getKey("descriptions_index")) || "[]",
      );

      return this.mockResponse({
        totalImages: imagesIndex.length,
        totalDescriptions: descriptionsIndex.length,
      });
    } catch (error) {
      return this.mockResponse({ totalImages: 0, totalDescriptions: 0 }, error);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Test localStorage availability
      const testKey = `${this.prefix}health_check`;
      localStorage.setItem(testKey, "test");
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }
}

class SupabaseService {
  private client: SupabaseClient | null = null;
  private localStorage: LocalStorageAdapter;
  private isDemo: boolean;
  private url: string;
  private anonKey: string;

  constructor() {
    const config = getServiceConfig("supabaseService");
    this.isDemo = config.demoMode;
    this.localStorage = new LocalStorageAdapter();

    this.url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    this.anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

    if (
      !this.isDemo &&
      (!this.url ||
        !this.anonKey ||
        this.url === "https://placeholder.supabase.co" ||
        this.anonKey === "placeholder_anon_key")
    ) {
      console.warn(
        "Supabase credentials not configured. Running in demo mode with localStorage.",
      );
      this.isDemo = true;
    }

    if (!this.isDemo) {
      try {
        this.client = createClient(this.url, this.anonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
          },
          realtime: {
            params: {
              eventsPerSecond: 10,
            },
          },
        });
      } catch (error) {
        console.warn(
          "Failed to initialize Supabase client. Falling back to demo mode.",
          error,
        );
        this.isDemo = true;
        this.client = null;
      }
    }
  }

  /**
   * Check if running in demo mode
   */
  isDemoMode(): boolean {
    return this.isDemo;
  }

  /**
   * Get the Supabase client instance
   */
  getClient(): SupabaseClient | null {
    return this.client;
  }

  /**
   * Save an image to the database
   */
  async saveImage(imageData: ImageInsert): Promise<ImageRecord> {
    try {
      if (this.isDemo) {
        const { data, error } = await this.localStorage.saveItem(
          "images",
          imageData,
        );
        if (error) {
          const errorMsg = typeof error === 'object' && error !== null && 'message' in error 
            ? (error as { message: string }).message 
            : 'Unknown error';
          throw new Error(`Failed to save image: ${errorMsg}`);
        }
        return data as ImageRecord;
      }

      if (!this.client) {
        throw new Error("Supabase client not available");
      }

      const { data, error } = await this.client
        .from("images")
        .insert(imageData as never)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to save image: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error("Error saving image:", error);
      throw error;
    }
  }

  /**
   * Get image by Unsplash ID
   */
  async getImageByUnsplashId(unsplashId: string): Promise<ImageRecord | null> {
    try {
      if (!this.client) {
        throw new Error("Supabase client not available");
      }

      const { data, error } = await this.client
        .from("images")
        .select("*")
        .eq("unsplash_id", unsplashId)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows returned
        throw new Error(`Failed to get image: ${error.message}`);
      }

      return data as ImageRecord | null;
    } catch (error) {
      console.error("Error getting image:", error);
      throw error;
    }
  }

  /**
   * Save a description to the database
   */
  async saveDescription(descriptionData: DescriptionInsert): Promise<DescriptionRecord> {
    try {
      if (!this.client) {
        throw new Error("Supabase client not available");
      }

      const { data, error } = await this.client
        .from("descriptions")
        .insert(descriptionData as never)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to save description: ${error.message}`);
      }

      return data as DescriptionRecord;
    } catch (error) {
      console.error("Error saving description:", error);
      throw error;
    }
  }

  /**
   * Get descriptions for an image
   */
  async getDescriptions(imageId: string) {
    try {
      if (!this.client) {
        throw new Error("Supabase client not available");
      }

      const { data, error } = await this.client
        .from("descriptions")
        .select("*")
        .eq("image_id", imageId)
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(`Failed to get descriptions: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error("Error getting descriptions:", error);
      throw error;
    }
  }

  /**
   * Get description by style for an image
   */
  async getDescriptionByStyle(
    imageId: string,
    style: 'narrativo' | 'poetico' | 'academico' | 'conversacional' | 'infantil',
  ) {
    try {
      if (!this.client) {
        throw new Error("Supabase client not available");
      }

      const { data, error } = await this.client
        .from("descriptions")
        .select("*")
        .eq("image_id", imageId)
        .eq("style", style)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows returned
        throw new Error(`Failed to get description: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error("Error getting description:", error);
      throw error;
    }
  }

  /**
   * Update image data
   */
  async updateImage(
    id: string,
    updates: Partial<ImageRecord>,
  ) {
    try {
      if (!this.client) {
        throw new Error("Supabase client not available");
      }

      const { data, error } = await this.client
        .from("images")
        .update(updates as never)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update image: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error("Error updating image:", error);
      throw error;
    }
  }

  /**
   * Delete an image and its descriptions
   */
  async deleteImage(id: string) {
    try {
      if (!this.client) {
        throw new Error("Supabase client not available");
      }

      // First delete related descriptions
      const { error: descriptionsError } = await this.client
        .from("descriptions")
        .delete()
        .eq("image_id", id);

      if (descriptionsError) {
        throw new Error(
          `Failed to delete descriptions: ${descriptionsError.message}`,
        );
      }

      // Then delete the image
      const { error: imageError } = await this.client
        .from("images")
        .delete()
        .eq("id", id);

      if (imageError) {
        throw new Error(`Failed to delete image: ${imageError.message}`);
      }

      return true;
    } catch (error) {
      console.error("Error deleting image:", error);
      throw error;
    }
  }

  /**
   * Search images by query
   */
  async searchImages(query: string, limit = 20, offset = 0) {
    try {
      if (!this.client) {
        throw new Error("Supabase client not available");
      }

      const { data, error } = await this.client
        .from("images")
        .select("*")
        .or(`description.ilike.%${query}%,alt_description.ilike.%${query}%`)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Failed to search images: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error("Error searching images:", error);
      throw error;
    }
  }

  /**
   * Get recent images
   */
  async getRecentImages(limit = 20) {
    try {
      if (!this.client) {
        throw new Error("Supabase client not available");
      }

      const { data, error } = await this.client
        .from("images")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to get recent images: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error("Error getting recent images:", error);
      throw error;
    }
  }

  /**
   * Get image with descriptions
   */
  async getImageWithDescriptions(id: string) {
    try {
      if (!this.client) {
        throw new Error("Supabase client not available");
      }

      const { data, error } = await this.client
        .from("images")
        .select(
          `
          *,
          descriptions (*)
        `,
        )
        .eq("id", id)
        .single();

      if (error) {
        throw new Error(
          `Failed to get image with descriptions: ${error.message}`,
        );
      }

      return data;
    } catch (error) {
      console.error("Error getting image with descriptions:", error);
      throw error;
    }
  }

  /**
   * Bulk insert images
   */
  async bulkInsertImages(images: ImageInsert[]) {
    try {
      if (!this.client) {
        throw new Error("Supabase client not available");
      }

      const { data, error } = await this.client
        .from("images")
        .insert(images as never)
        .select();

      if (error) {
        throw new Error(`Failed to bulk insert images: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error("Error bulk inserting images:", error);
      throw error;
    }
  }

  /**
   * Get statistics about stored data
   */
  async getStats() {
    try {
      if (!this.client) {
        throw new Error("Supabase client not available");
      }

      const [imagesResponse, descriptionsResponse] = await Promise.all([
        this.client.from("images").select("id", { count: "exact", head: true }),
        this.client
          .from("descriptions")
          .select("id", { count: "exact", head: true }),
      ]);

      if (imagesResponse.error) {
        throw new Error(
          `Failed to get images count: ${imagesResponse.error.message}`,
        );
      }

      if (descriptionsResponse.error) {
        throw new Error(
          `Failed to get descriptions count: ${descriptionsResponse.error.message}`,
        );
      }

      return {
        totalImages: imagesResponse.count || 0,
        totalDescriptions: descriptionsResponse.count || 0,
      };
    } catch (error) {
      console.error("Error getting stats:", error);
      throw error;
    }
  }

  /**
   * Check database health
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (this.isDemo) {
        return await this.localStorage.healthCheck();
      }

      if (!this.client) {
        return false;
      }

      const { error } = await this.client.from("images").select("id").limit(1);
      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Set up real-time subscription for images
   */
  subscribeToImages(callback: (payload: any) => void) {
    if (!this.client) {
      throw new Error("Supabase client not available");
    }

    return this.client
      .channel("images_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "images",
        },
        callback,
      )
      .subscribe();
  }

  /**
   * Set up real-time subscription for descriptions
   */
  subscribeToDescriptions(imageId: string, callback: (payload: any) => void) {
    if (!this.client) {
      throw new Error("Supabase client not available");
    }

    return this.client
      .channel(`descriptions_${imageId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "descriptions",
          filter: `image_id=eq.${imageId}`,
        },
        callback,
      )
      .subscribe();
  }

  /**
   * Clean up old cache entries or temporary data
   */
  async cleanup(olderThanDays = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      // This would depend on your specific cleanup needs
      // For example, you might want to clean up old temporary images
      // console.log(`Cleanup would remove data older than ${cutoffDate.toISOString()}`);

      // Implementation would depend on your specific requirements
      return true;
    } catch (error) {
      console.error("Error during cleanup:", error);
      throw error;
    }
  }

  // =============================================================================
  // USER PROGRESS METHODS
  // =============================================================================

  /**
   * Create or update user progress
   */
  async upsertUserProgress(progressData: UserProgressInsert) {
    try {
      if (!this.client) {
        throw new Error("Supabase client not available");
      }

      const { data, error } = await this.client
        .from("user_progress")
        .upsert(progressData as never, {
          onConflict: "user_id,vocabulary_item_id",
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to upsert user progress: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error("Error upserting user progress:", error);
      throw error;
    }
  }

  /**
   * Get user progress by type and date range
   */
  async getUserProgress(
    userId: string,
    startDate?: string,
    endDate?: string,
  ) {
    try {
      if (!this.client) {
        throw new Error("Supabase client not available");
      }

      let query = this.client
        .from("user_progress")
        .select("*")
        .eq("user_id", userId)
        .order("last_reviewed", { ascending: false });

      if (startDate) {
        query = query.gte("last_reviewed", startDate);
      }

      if (endDate) {
        query = query.lte("last_reviewed", endDate);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to get user progress: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error("Error getting user progress:", error);
      throw error;
    }
  }

  /**
   * Get user progress summary
   */
  async getUserProgressSummary(userId: string, daysBack = 30) {
    try {
      if (!this.client) {
        throw new Error("Supabase client not available");
      }

      const { data, error } = await this.client.rpc(
        "get_user_progress_summary",
        {
          user_uuid: userId,
          days_back: daysBack,
        } as never,
      );

      if (error) {
        throw new Error(`Failed to get progress summary: ${error.message}`);
      }

      return data?.[0] || null;
    } catch (error) {
      console.error("Error getting progress summary:", error);
      throw error;
    }
  }

  /**
   * Calculate daily progress for user
   */
  async calculateDailyProgress(userId: string, targetDate?: string) {
    try {
      if (!this.client) {
        throw new Error("Supabase client not available");
      }

      const { data, error } = await this.client.rpc(
        "calculate_daily_progress",
        {
          user_uuid: userId,
          target_date: targetDate,
        } as never,
      );

      if (error) {
        throw new Error(`Failed to calculate daily progress: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error("Error calculating daily progress:", error);
      throw error;
    }
  }

  // =============================================================================
  // VOCABULARY/PHRASES METHODS
  // =============================================================================

  /**
   * Create a phrase
   */
  async createPhrase(phraseData: PhraseInsert) {
    try {
      if (!this.client) {
        throw new Error("Supabase client not available");
      }

      const { data, error } = await this.client
        .from("phrases")
        .insert(phraseData as never)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create phrase: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error("Error creating phrase:", error);
      throw error;
    }
  }

  /**
   * Update a phrase
   */
  async updatePhrase(id: string, updates: Partial<Phrase>) {
    try {
      if (!this.client) {
        throw new Error("Supabase client not available");
      }

      const { data, error } = await this.client
        .from("phrases")
        .update(updates as never)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update phrase: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error("Error updating phrase:", error);
      throw error;
    }
  }

  /**
   * Delete a phrase
   */
  async deletePhrase(id: string) {
    try {
      if (!this.client) {
        throw new Error("Supabase client not available");
      }

      const { error } = await this.client.from("phrases").delete().eq("id", id);

      if (error) {
        throw new Error(`Failed to delete phrase: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error("Error deleting phrase:", error);
      throw error;
    }
  }

  /**
   * Get user's phrases with filtering
   */
  async getUserPhrases(
    userId: string,
    options: {
      category?: string;
      difficulty?: string;
      isUserSelected?: boolean;
      isMastered?: boolean;
      limit?: number;
      offset?: number;
    } = {},
  ) {
    try {
      if (!this.client) {
        throw new Error("Supabase client not available");
      }

      let query = this.client
        .from("phrases")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (options.category) {
        query = query.eq("category", options.category);
      }

      if (options.difficulty) {
        query = query.eq("difficulty_level", options.difficulty);
      }

      if (typeof options.isUserSelected === "boolean") {
        query = query.eq("is_user_selected", options.isUserSelected);
      }

      if (typeof options.isMastered === "boolean") {
        query = query.eq("is_mastered", options.isMastered);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(
          options.offset,
          options.offset + (options.limit || 50) - 1,
        );
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to get user phrases: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error("Error getting user phrases:", error);
      throw error;
    }
  }

  /**
   * Get phrases for spaced repetition
   */
  async getPhrasesForReview(userId: string, limit = 20) {
    try {
      if (!this.client) {
        throw new Error("Supabase client not available");
      }

      const { data, error } = await this.client
        .from("phrases")
        .select("*")
        .eq("user_id", userId)
        .eq("is_user_selected", true)
        .eq("is_mastered", false)
        .not("last_studied_at", "is", null)
        .order("last_studied_at", { ascending: true })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to get phrases for review: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error("Error getting phrases for review:", error);
      throw error;
    }
  }

  /**
   * Mark phrase as studied
   */
  async markPhraseAsStudied(phraseId: string, wasCorrect: boolean) {
    try {
      const currentPhrase = await this.getPhrase(phraseId);
      if (!currentPhrase) {
        throw new Error("Phrase not found");
      }

      const updates: Partial<Phrase> = {
        study_count: currentPhrase.study_count + 1,
        last_studied_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (wasCorrect) {
        updates.correct_count = (currentPhrase.correct_count || 0) + 1;

        // Check if phrase should be marked as mastered
        const accuracy = (updates.correct_count || 0) / (updates.study_count || 1);
        if ((updates.study_count || 0) >= 5 && accuracy >= 0.8) {
          updates.is_mastered = true;
          updates.mastered_at = new Date().toISOString();
        }
      }

      return await this.updatePhrase(phraseId, updates);
    } catch (error) {
      console.error("Error marking phrase as studied:", error);
      throw error;
    }
  }

  /**
   * Get a single phrase by ID
   */
  async getPhrase(id: string) {
    try {
      if (!this.client) {
        throw new Error("Supabase client not available");
      }

      const { data, error } = await this.client
        .from("phrases")
        .select("*")
        .eq("id", id)
        .single();

      if (error && error.code !== "PGRST116") {
        throw new Error(`Failed to get phrase: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error("Error getting phrase:", error);
      throw error;
    }
  }

  // =============================================================================
  // SESSION METHODS
  // =============================================================================

  /**
   * Create a new session
   */
  async createSession(sessionData: SessionInsert) {
    try {
      if (!this.client) {
        throw new Error("Supabase client not available");
      }

      const { data, error } = await this.client
        .from("sessions")
        .insert(sessionData as never)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create session: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error("Error creating session:", error);
      throw error;
    }
  }

  /**
   * Update a session
   */
  async updateSession(id: string, updates: Partial<Session>) {
    try {
      if (!this.client) {
        throw new Error("Supabase client not available");
      }

      const { data, error } = await this.client
        .from("sessions")
        .update(updates as never)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update session: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error("Error updating session:", error);
      throw error;
    }
  }

  /**
   * Get user sessions
   */
  async getUserSessions(userId: string, limit = 20, offset = 0) {
    try {
      if (!this.client) {
        throw new Error("Supabase client not available");
      }

      const { data, error } = await this.client
        .from("sessions")
        .select("*")
        .eq("user_id", userId)
        .order("started_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Failed to get user sessions: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error("Error getting user sessions:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const supabaseService = new SupabaseService();

// Also export the client for direct access if needed
export { supabaseService as default };
