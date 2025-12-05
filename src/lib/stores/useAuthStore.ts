import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setError: (error: string | null) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,

      setUser: (user) => set({
        user,
        isAuthenticated: !!user,
        isLoading: false
      }),

      setSession: (session) => set({
        session,
        user: session?.user ?? null,
        isAuthenticated: !!session?.user,
        isLoading: false
      }),

      setError: (error) => set({ error }),

      signIn: async (email, password) => {
        try {
          set({ isLoading: true, error: null });

          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) throw error;

          set({
            user: data.user,
            session: data.session,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          set({
            error: error.message || 'Failed to sign in',
            isLoading: false,
          });
          throw error;
        }
      },

      signUp: async (email, password) => {
        try {
          set({ isLoading: true, error: null });

          const { data, error } = await supabase.auth.signUp({
            email,
            password,
          });

          if (error) throw error;

          set({
            user: data.user,
            session: data.session,
            isAuthenticated: !!data.user,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          set({
            error: error.message || 'Failed to sign up',
            isLoading: false,
          });
          throw error;
        }
      },

      signOut: async () => {
        try {
          set({ isLoading: true });

          const { error } = await supabase.auth.signOut();
          if (error) throw error;

          set({
            user: null,
            session: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          set({
            error: error.message || 'Failed to sign out',
            isLoading: false,
          });
          throw error;
        }
      },

      refreshSession: async () => {
        try {
          const { data, error } = await supabase.auth.refreshSession();
          if (error) throw error;

          set({
            session: data.session,
            user: data.session?.user ?? null,
            isAuthenticated: !!data.session?.user,
          });
        } catch (error: any) {
          set({
            error: error.message || 'Failed to refresh session',
            user: null,
            session: null,
            isAuthenticated: false,
          });
        }
      },

      initialize: () => {
        // Set up auth state change listener (event-driven, not polling)
        const { data: authListener } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            logger.info('Auth state changed:', { event });

            set({
              session,
              user: session?.user ?? null,
              isAuthenticated: !!session?.user,
              isLoading: false,
            });

            // Handle specific auth events
            if (event === 'SIGNED_OUT') {
              set({
                user: null,
                session: null,
                isAuthenticated: false,
              });
            } else if (event === 'TOKEN_REFRESHED') {
              logger.info('Token refreshed');
            } else if (event === 'USER_UPDATED') {
              logger.info('User updated');
            }
          }
        );

        // Initial session check
        supabase.auth.getSession().then(({ data: { session } }) => {
          set({
            session,
            user: session?.user ?? null,
            isAuthenticated: !!session?.user,
            isLoading: false,
          });
        });

        // Clean up listener on unmount
        return () => {
          authListener?.subscription.unsubscribe();
        };
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        session: state.session,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
