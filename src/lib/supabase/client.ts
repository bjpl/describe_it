import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

// Environment variables validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Global singleton instance to prevent multiple clients
let globalClient: ReturnType<typeof createClient<Database>> | null = null;

// Ensure we only create one client instance globally
if (typeof window !== 'undefined' && !globalClient) {
  // Check if a client already exists on the window object
  const windowAny = window as any;
  if (!windowAny.__supabaseClient) {
    console.log('[Supabase] Creating singleton client instance');
    windowAny.__supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage,
        storageKey: 'describe-it-auth',
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  } else {
    console.log('[Supabase] Using existing singleton client instance');
  }
  globalClient = windowAny.__supabaseClient;
}

// For SSR, create a non-persistent client
if (typeof window === 'undefined' && !globalClient) {
  globalClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

// Export the singleton client
export const supabase = globalClient!;

// Alias for backwards compatibility
export const createBrowserSupabaseClient = () => supabase;

// Auth state management helpers
export const authHelpers = {
  /**
   * Get current user session
   */
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) throw error
      return user
    } catch (error) {
      console.error('Error getting current user:', error)
      return null
    }
  },

  /**
   * Get current session
   */
  async getCurrentSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) throw error
      return session
    } catch (error) {
      console.error('Error getting current session:', error)
      return null
    }
  },

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      return { user: data.user, session: data.session }
    } catch (error) {
      console.error('Error signing in:', error)
      throw error
    }
  },

  /**
   * Sign up with email and password
   */
  async signUp(email: string, password: string, metadata?: Record<string, any>) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      })
      if (error) throw error
      return { user: data.user, session: data.session }
    } catch (error) {
      console.error('Error signing up:', error)
      throw error
    }
  },

  /**
   * Sign out current user
   */
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error) {
      console.error('Error signing out:', error)
      throw error
    }
  },

  /**
   * Reset password
   */
  async resetPassword(email: string) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      if (error) throw error
    } catch (error) {
      console.error('Error resetting password:', error)
      throw error
    }
  },

  /**
   * Update password
   */
  async updatePassword(password: string) {
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
    } catch (error) {
      console.error('Error updating password:', error)
      throw error
    }
  },

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback)
  },
}

// Real-time subscription helpers
export const realtimeHelpers = {
  /**
   * Subscribe to table changes
   */
  subscribeToTable<T = any>(
    table: string,
    filter?: string,
    callback?: (payload: any) => void
  ) {
    let subscription = supabase
      .channel(`${table}-changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter,
        },
        (payload) => {
          console.log(`${table} change received:`, payload)
          callback?.(payload)
        }
      )
      .subscribe()

    return {
      unsubscribe: () => subscription.unsubscribe(),
    }
  },

  /**
   * Subscribe to user's descriptions
   */
  subscribeToUserDescriptions(userId: string, callback: (payload: any) => void) {
    return this.subscribeToTable(
      'descriptions',
      `user_id=eq.${userId}`,
      callback
    )
  },

  /**
   * Subscribe to user's progress
   */
  subscribeToUserProgress(userId: string, callback: (payload: any) => void) {
    return this.subscribeToTable(
      'user_progress',
      `user_id=eq.${userId}`,
      callback
    )
  },

  /**
   * Subscribe to user's export history
   */
  subscribeToUserExports(userId: string, callback: (payload: any) => void) {
    return this.subscribeToTable(
      'export_history',
      `user_id=eq.${userId}`,
      callback
    )
  },
}

// Database query helpers
export const dbHelpers = {
  /**
   * Get user profile with API keys
   */
  async getUserProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          user_api_keys (*)
        `)
        .eq('id', userId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error getting user profile:', error)
      throw error
    }
  },

  /**
   * Get user's descriptions with related data
   */
  async getUserDescriptions(userId: string, limit = 20, offset = 0) {
    try {
      const { data, error } = await supabase
        .from('descriptions')
        .select(`
          *,
          images (*),
          phrases (*),
          questions (*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error getting user descriptions:', error)
      throw error
    }
  },

  /**
   * Get user's progress stats
   */
  async getUserProgress(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error getting user progress:', error)
      throw error
    }
  },

  /**
   * Update user API keys
   */
  async updateUserApiKeys(userId: string, apiKeys: Record<string, string>) {
    try {
      const { data, error } = await supabase
        .from('user_api_keys')
        .upsert({
          user_id: userId,
          ...apiKeys,
          updated_at: new Date().toISOString(),
        })
        .select()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating user API keys:', error)
      throw error
    }
  },

  /**
   * Create new description
   */
  async createDescription(description: {
    user_id: string
    title: string
    content: string
    description_type: string
    tags?: string[]
    metadata?: Record<string, any>
  }) {
    try {
      const { data, error } = await supabase
        .from('descriptions')
        .insert(description)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating description:', error)
      throw error
    }
  },

  /**
   * Update description
   */
  async updateDescription(id: string, updates: Record<string, any>) {
    try {
      const { data, error } = await supabase
        .from('descriptions')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating description:', error)
      throw error
    }
  },

  /**
   * Delete description
   */
  async deleteDescription(id: string) {
    try {
      const { error } = await supabase
        .from('descriptions')
        .delete()
        .eq('id', id)

      if (error) throw error
    } catch (error) {
      console.error('Error deleting description:', error)
      throw error
    }
  },
}

// Error handling wrapper
export const withErrorHandling = <T extends any[], R>(
  fn: (...args: T) => Promise<R>
) => {
  return async (...args: T): Promise<R | null> => {
    try {
      return await fn(...args)
    } catch (error) {
      console.error('Supabase operation failed:', error)
      return null
    }
  }
}

// Export the default client
export default supabase

// Export types for convenience
export type { Database } from './types'
export type SupabaseClient = typeof supabase