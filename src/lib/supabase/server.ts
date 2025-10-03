import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './types'
import { dbLogger } from '@/lib/logger';

// Environment variables validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

/**
 * Create a Supabase client for server-side operations
 * This client uses cookies for session management in SSR contexts
 */
export const createServerSupabaseClient = async () => {
  const cookieStore = await cookies()

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        try {
          cookieStore.set({ name, value, ...options })
        } catch (error) {
          // The `set` method was called from a Server Component
          // This can be ignored if you have middleware refreshing user sessions
        }
      },
      remove(name: string, options: any) {
        try {
          cookieStore.set({ name, value: '', ...options })
        } catch (error) {
          // The `delete` method was called from a Server Component
          // This can be ignored if you have middleware refreshing user sessions
        }
      },
    },
  })
}

/**
 * Server-side auth helpers
 */
export const serverAuthHelpers = {
  /**
   * Get current user on server-side
   */
  async getCurrentUser() {
    const supabase = await createServerSupabaseClient()
    
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) throw error
      return user
    } catch (error) {
      dbLogger.error('Error getting current user on server:', error)
      return null
    }
  },

  /**
   * Get current session on server-side
   */
  async getCurrentSession() {
    const supabase = await createServerSupabaseClient()
    
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) throw error
      return session
    } catch (error) {
      dbLogger.error('Error getting current session on server:', error)
      return null
    }
  },

  /**
   * Check if user is authenticated
   */
  async isAuthenticated() {
    const user = await this.getCurrentUser()
    return !!user
  },

  /**
   * Get user with profile data
   */
  async getUserWithProfile() {
    const supabase = await createServerSupabaseClient()
    const user = await this.getCurrentUser()
    
    if (!user) return null

    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          user_api_keys (*),
          user_progress (*)
        `)
        .eq('id', user.id)
        .single()

      if (error) throw error
      return { ...user, profile: data }
    } catch (error) {
      dbLogger.error('Error getting user profile on server:', error)
      return user
    }
  },
}

/**
 * Server-side database helpers
 */
export const serverDbHelpers = {
  /**
   * Get user's descriptions with server-side client
   */
  async getUserDescriptions(userId: string, limit = 20, offset = 0) {
    const supabase = await createServerSupabaseClient()
    
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
      dbLogger.error('Error getting user descriptions on server:', error)
      return []
    }
  },

  /**
   * Get description by ID with authorization check
   */
  async getDescriptionById(id: string, userId?: string) {
    const supabase = await createServerSupabaseClient()
    
    try {
      let query = supabase
        .from('descriptions')
        .select(`
          *,
          images (*),
          phrases (*),
          questions (*)
        `)
        .eq('id', id)

      // Add user authorization check if userId provided
      if (userId) {
        query = query.eq('user_id', userId)
      }

      const { data, error } = await query.single()

      if (error) throw error
      return data
    } catch (error) {
      dbLogger.error('Error getting description by ID on server:', error)
      return null
    }
  },

  /**
   * Get user's export history
   */
  async getUserExportHistory(userId: string, limit = 10) {
    const supabase = await createServerSupabaseClient()
    
    try {
      const { data, error } = await supabase
        .from('export_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data
    } catch (error) {
      dbLogger.error('Error getting user export history on server:', error)
      return []
    }
  },

  /**
   * Get user's API keys (server-side only for security)
   */
  async getUserApiKeys(userId: string) {
    const supabase = await createServerSupabaseClient()
    
    try {
      const { data, error } = await supabase
        .from('user_api_keys')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      dbLogger.error('Error getting user API keys on server:', error)
      return null
    }
  },
}

// Export for convenience
export { createServerClient }
export type { Database }