/**
 * Authentication and User Management System
 * Handles user authentication, API key management, and data isolation
 */

import { supabase } from '../supabase/client';
import { hybridStorage } from '../storage/HybridStorageManager';
import { logger } from '../logger';
import { authLogger, securityLogger } from '@/lib/logging/logger';
import type { User, Session } from '@supabase/supabase-js';
import { safeParse, safeStringify } from "@/lib/utils/json-safe";

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  username?: string;
  avatar_url?: string;
  api_keys?: UserApiKeys;
  preferences?: UserPreferences;
  subscription_status: 'free' | 'premium' | 'premium_plus';
  created_at: string;
  last_active_at: string;
}

export interface UserApiKeys {
  unsplash?: string;
  openai?: string;
  anthropic?: string;
  google?: string;
  // Encrypted in database, decrypted for use
  encrypted?: boolean;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: 'en' | 'es';
  defaultDescriptionStyle: string;
  autoSaveDescriptions: boolean;
  enableNotifications: boolean;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

class AuthManager {
  private static instance: AuthManager;
  private currentUser: User | null = null;
  private currentSession: Session | null = null;
  private currentProfile: UserProfile | null = null;
  private listeners: Set<(state: AuthState) => void> = new Set();
  private isSigningOut: boolean = false;

  private constructor() {
    this.initializeAuth();
  }

  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  /**
   * Public initialize method for external initialization
   */
  public async initialize(): Promise<void> {
    return this.initializeAuth();
  }

  /**
   * Initialize authentication and listen for changes
   */
  private async initializeAuth(): Promise<void> {
    try {
      // Get initial session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) throw error;
      
      if (session) {
        this.currentSession = session;
        this.currentUser = session.user;
        await this.loadUserProfile(session.user.id);
      }

      // Listen for auth changes
      let isProcessingAuthChange = false;
      supabase.auth.onAuthStateChange(async (event, session) => {
        authLogger.debug('Auth state changed', { event, hasSession: !!session });
        
        // Prevent duplicate processing
        if (isProcessingAuthChange) {
          authLogger.debug('Skipping duplicate auth state change event');
          return;
        }
        
        // Ignore SIGNED_OUT if we have a valid session locally and not explicitly signing out
        if (event === 'SIGNED_OUT' && this.currentSession && this.currentUser && !this.isSigningOut) {
          authLogger.debug('Ignoring SIGNED_OUT event - we have a valid session and not signing out');
          return;
        }
        
        // Don't process events during sign-out unless it's the SIGNED_OUT event
        if (this.isSigningOut && event !== 'SIGNED_OUT') {
          authLogger.debug('Ignoring event during sign-out process', { event });
          return;
        }
        
        isProcessingAuthChange = true;
        
        try {
          // Update state first
          this.currentSession = session;
          this.currentUser = session?.user || null;
          
          if (session?.user) {
            await this.loadUserProfile(session.user.id);
          } else if (event === 'SIGNED_OUT') {
            // Only clear profile on explicit sign out
            this.currentProfile = null;
          }
          
          // Always notify listeners after state is updated
          this.notifyListeners();

          // Handle different auth events
          switch (event) {
            case 'SIGNED_IN':
              await this.handleSignIn(session!);
              break;
            case 'SIGNED_OUT':
              // Only handle if we don't have a session
              if (!session) {
                await this.handleSignOut();
              }
              break;
            case 'USER_UPDATED':
              await this.handleUserUpdate(session!);
              break;
            case 'TOKEN_REFRESHED':
              authLogger.debug('Token refreshed for user', { hasUser: !!session?.user });
              break;
          }
        } finally {
          isProcessingAuthChange = false;
        }
      });
    } catch (error) {
      logger.error('Failed to initialize auth', error as Error);
    }
  }

  /**
   * Sign up new user
   */
  async signUp(email: string, password: string, metadata?: {
    full_name?: string;
    username?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      authLogger.info('Starting user signup', { email });
      
      // Always use server-side proxy to avoid CORS issues
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, metadata })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        authLogger.error('Signup failed', result);
        
        // Handle specific error cases
        if (result.error?.includes('already registered')) {
          return {
            success: false,
            error: 'This email is already registered. Please sign in instead.'
          };
        }
        
        return {
          success: false,
          error: result.error || 'Failed to create account'
        };
      }
      
      authLogger.info('Signup successful', {
        hasUser: !!result.user,
        hasSession: !!result.session,
        needsConfirmation: result.needsEmailConfirmation
      });
      
      // If we got a session, set it up
      if (result.session) {
        this.currentUser = result.user as any;
        this.currentSession = result.session as any;
        
        // Also set in Supabase client for consistency
        const client = supabase;
        await client.auth.setSession({
          access_token: result.session.access_token,
          refresh_token: result.session.refresh_token
        });
        
        // Load or create user profile
        if (result.user?.id) {
          await this.createUserProfile(result.user.id, {
            email,
            full_name: metadata?.full_name,
            username: metadata?.username
          });
        }
        
        this.notifyListeners();
      }
      
      return { 
        success: true,
        error: result.needsEmailConfirmation 
          ? 'Please check your email to confirm your account'
          : undefined
      };
      
    } catch (error: any) {
      logger.error('Sign up failed', error);
      authLogger.error('Signup error', error);
      
      // If the server is completely unreachable, provide clear error
      if (error.message?.includes('Failed to fetch')) {
        return {
          success: false,
          error: 'Unable to connect to authentication service. Please check your connection and try again.'
        };
      }
      
      return { 
        success: false, 
        error: error.message || 'Failed to sign up' 
      };
    }
  }

  /**
   * Sign in existing user with CORS fallback
   */
  async signIn(email: string, password: string): Promise<{ 
    success: boolean; 
    error?: string;
    requiresVerification?: boolean;
  }> {
    try {
      authLogger.info('Starting user signin', { email });
      
      // Always use server-side proxy for consistency
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        authLogger.error('Signin failed', result);
        
        // Handle specific error cases
        if (result.error?.includes('Email not confirmed') || result.error?.includes('confirm your email')) {
          return { 
            success: false, 
            requiresVerification: true,
            error: 'Please verify your email before signing in' 
          };
        }
        
        if (result.error?.includes('Invalid')) {
          return {
            success: false,
            error: 'Invalid email or password'
          };
        }
        
        return {
          success: false,
          error: result.error || 'Failed to sign in'
        };
      }
      
      authLogger.info('Signin successful');
      
      // Set up the session
      if (result.session && result.user) {
        authLogger.info('Setting up session for user', { 
          email: result.user.email,
          hasAccessToken: !!result.session.access_token,
          hasRefreshToken: !!result.session.refresh_token,
          expiresAt: result.session.expires_at
        });
        
        try {
          // Set session in Supabase client first
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: result.session.access_token,
            refresh_token: result.session.refresh_token
          });
          
          if (sessionError) {
            authLogger.error('Failed to set session in Supabase client', sessionError);
            return {
              success: false,
              error: 'Failed to establish session. Please try again.'
            };
          }
          
          authLogger.debug('Session set successfully in Supabase client');
          
          // Verify session was set properly
          const { data: { session: verifySession } } = await supabase.auth.getSession();
          if (!verifySession) {
            authLogger.error('Session verification failed - session not persisted');
            return {
              success: false,
              error: 'Session could not be established. Please try again.'
            };
          }
          
          authLogger.debug('Session verified successfully');
          
          // Clear any pending sign-out state
          this.isSigningOut = false;
          
          // Now update our internal state
          this.currentUser = result.user as any;
          this.currentSession = result.session as any;
          
          // Manually ensure session is in localStorage as backup
          if (typeof window !== 'undefined') {
            const sessionToStore = {
              access_token: result.session.access_token,
              refresh_token: result.session.refresh_token,
              expires_at: result.session.expires_at || (Date.now() / 1000 + 3600),
              user: result.user
            };
            localStorage.setItem('describe-it-auth', safeStringify(sessionToStore));
            authLogger.debug('Session manually stored to localStorage');
          }
          
          // Load user profile
          await this.loadUserProfile(result.user.id);
          
          // Notify listeners AFTER everything is properly set up
          this.notifyListeners();
          
          // Trigger custom event for additional UI updates
          window.dispatchEvent(new CustomEvent('auth-state-change', { 
            detail: { isAuthenticated: true, user: result.user } 
          }));
          
        } catch (sessionSetupError) {
          authLogger.error('Session setup failed', sessionSetupError);
          return {
            success: false,
            error: 'Failed to establish authenticated session. Please try again.'
          };
        }
      } else {
        return {
          success: false,
          error: 'Invalid session data received from server.'
        };
      }

      return { success: true };
      
    } catch (error: any) {
      logger.error('Sign in failed', error);
      
      // Handle network errors
      if (error.message?.includes('Failed to fetch')) {
        return {
          success: false,
          error: 'Unable to connect to authentication service. Please check your connection and try again.'
        };
      }
      
      return { 
        success: false, 
        error: error.message || 'Failed to sign in' 
      };
    }
  }

  /**
   * Sign in with OAuth provider
   */
  async signInWithProvider(provider: 'google' | 'github' | 'discord'): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) throw error;
      
      return { success: true };
    } catch (error: any) {
      logger.error('OAuth sign in failed', error);
      return { 
        success: false, 
        error: error.message || 'Failed to sign in with provider' 
      };
    }
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    try {
      // Set flag to indicate intentional sign-out
      this.isSigningOut = true;
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear local storage for user-specific data
      await hybridStorage.clearCategory('user-data');
      
      // Clear the session from localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('describe-it-auth');
      }
      
      this.currentUser = null;
      this.currentSession = null;
      this.currentProfile = null;
      
      this.notifyListeners();
      
      // Reset the flag after a delay
      setTimeout(() => {
        this.isSigningOut = false;
      }, 1000);
    } catch (error) {
      logger.error('Sign out failed', error as Error);
      this.isSigningOut = false;
    }
  }

  /**
   * Create user profile in database
   */
  private async createUserProfile(userId: string, data: Partial<UserProfile>): Promise<void> {
    try {
      const { error } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: data.email!,
          full_name: data.full_name,
          username: data.username,
          preferences: {
            theme: 'auto',
            language: 'en',
            defaultDescriptionStyle: 'conversational',
            autoSaveDescriptions: true,
            enableNotifications: true
          }
        });

      if (error && !error.message.includes('duplicate')) {
        throw error;
      }

      // Create API keys table entry
      await this.initializeUserApiKeys(userId);
    } catch (error) {
      logger.error('Failed to create user profile', error as Error);
    }
  }

  /**
   * Initialize user API keys storage
   */
  private async initializeUserApiKeys(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_api_keys')
        .insert({
          user_id: userId,
          unsplash_api_key: null,
          openai_api_key: null,
          claude_api_key: null,
          google_api_key: null,
          other_api_keys: {},
          created_at: new Date().toISOString()
        } as any);

      if (error && !error.message.includes('duplicate')) {
        throw error;
      }

      authLogger.debug('API keys initialized for user');
    } catch (error) {
      logger.error('Failed to initialize API keys', error as Error);
    }
  }

  /**
   * Load user profile from database
   */
  private async loadUserProfile(userId: string): Promise<void> {
    try {
      authLogger.debug('Loading user profile', { userId });
      
      // Load user profile
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        authLogger.warn('Profile not found in database, creating basic profile');
        // Create a basic profile if it doesn't exist
        this.currentProfile = {
          id: userId,
          email: this.currentUser?.email || '',
          full_name: this.currentUser?.user_metadata?.full_name || '',
          subscription_status: 'free',
          created_at: new Date().toISOString(),
          last_active_at: new Date().toISOString()
        } as UserProfile;
        return; // Don't notify here, let the caller handle it
      }

      // Load API keys (encrypted) - but don't fail if they don't exist
      try {
        const { data: apiKeys, error: keysError } = await supabase
          .from('user_api_keys')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (!keysError && apiKeys) {
          (profile as any).api_keys = {
            unsplash: (apiKeys as any).unsplash_api_key,
            openai: (apiKeys as any).openai_api_key,
            anthropic: (apiKeys as any).claude_api_key,
            google: (apiKeys as any).google_api_key,
            encrypted: true
          };
        }
        authLogger.debug('API keys loaded for user');
      } catch (keysError) {
        authLogger.debug('No API keys found for user');
      }

      this.currentProfile = profile as unknown as UserProfile;
      authLogger.info('User profile loaded successfully');
    } catch (error) {
      authLogger.error('Failed to load user profile', error);
      logger.error('Failed to load user profile', error as Error);
      
      // Still set a basic profile so auth works
      if (this.currentUser) {
        this.currentProfile = {
          id: userId,
          email: this.currentUser.email || '',
          full_name: this.currentUser.user_metadata?.full_name || '',
          subscription_status: 'free',
          created_at: new Date().toISOString(),
          last_active_at: new Date().toISOString()
        } as UserProfile;
      }
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: Partial<UserProfile>): Promise<boolean> {
    if (!this.currentUser) return false;

    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: updates.full_name,
          username: updates.username,
          avatar_url: updates.avatar_url,
          preferences: updates.preferences,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.currentUser.id);

      if (error) throw error;

      // Reload profile
      await this.loadUserProfile(this.currentUser.id);
      
      return true;
    } catch (error) {
      logger.error('Failed to update profile', error as Error);
      return false;
    }
  }

  /**
   * Save user API keys (encrypted)
   */
  async saveApiKeys(keys: Partial<UserApiKeys>): Promise<boolean> {
    securityLogger.debug('saveApiKeys called');
    
    // Allow saving even if not authenticated for local storage
    const userId = this.currentUser?.id || 'local-user';
    
    try {
      // Save to localStorage immediately (unencrypted for local use)
      await hybridStorage.save('api-keys', userId, keys as Record<string, any>);
      securityLogger.info('Saved API keys to localStorage');
      
      // If user is authenticated, try to save to Supabase
      if (this.currentUser) {
        try {
          // In production, encrypt keys before storing
          const encryptedKeys = await this.encryptApiKeys(keys);
          
          // Create a timeout promise
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Supabase save timeout')), 3000)
          );
          
          // Try to save to Supabase with timeout
          const savePromise = supabase
            .from('user_api_keys')
            .upsert({
              user_id: this.currentUser.id,
              unsplash_api_key: encryptedKeys.unsplash || null,
              openai_api_key: encryptedKeys.openai || null,
              claude_api_key: encryptedKeys.anthropic || null,
              google_api_key: encryptedKeys.google || null,
              other_api_keys: {},
              updated_at: new Date().toISOString()
            } as any);

          const result = await Promise.race([savePromise, timeoutPromise]) as any;

          if (result?.error) {
            authLogger.warn('Supabase save failed, but localStorage succeeded', result.error);
          } else {
            securityLogger.info('Saved API keys to Supabase successfully');
          }

          authLogger.info('API keys saved to both localStorage and Supabase');
          securityLogger.info('API keys stored in cloud and locally');
        } catch (supabaseError) {
          // Supabase save failed, but localStorage succeeded
          authLogger.warn('Supabase operation failed, but localStorage succeeded', {
            error: supabaseError instanceof Error ? supabaseError.message : String(supabaseError)
          });
        }
      }
      
      // Update current profile
      if (this.currentProfile) {
        this.currentProfile.api_keys = { ...keys, encrypted: false };
        this.notifyListeners();
      }
      
      return true; // Return true since localStorage save succeeded
    } catch (error) {
      logger.error('Failed to save API keys', error as Error);
      return false;
    }
  }

  /**
   * Get decrypted API keys for current user
   */
  async getApiKeys(): Promise<UserApiKeys | null> {
    if (!this.currentUser || !this.currentProfile?.api_keys) return null;

    try {
      // If keys are encrypted, decrypt them
      if (this.currentProfile.api_keys.encrypted) {
        return await this.decryptApiKeys(this.currentProfile.api_keys);
      }
      
      return this.currentProfile.api_keys;
    } catch (error) {
      logger.error('Failed to get API keys', error as Error);
      return null;
    }
  }

  /**
   * Encrypt API keys before storage
   */
  private async encryptApiKeys(keys: Partial<UserApiKeys>): Promise<Partial<UserApiKeys>> {
    // In production, use proper encryption
    // For now, just base64 encode as a placeholder
    const encrypted: Partial<UserApiKeys> = {};

    for (const [key, value] of Object.entries(keys)) {
      if (value && typeof value === 'string' && key !== 'encrypted') {
        (encrypted as any)[key] = btoa(value);
      }
    }

    return encrypted;
  }

  /**
   * Decrypt API keys for use
   */
  private async decryptApiKeys(keys: UserApiKeys): Promise<UserApiKeys> {
    // In production, use proper decryption
    // For now, just base64 decode as a placeholder
    const decrypted: UserApiKeys = { encrypted: false };

    for (const [key, value] of Object.entries(keys)) {
      if (value && typeof value === 'string' && key !== 'encrypted') {
        try {
          (decrypted as any)[key] = atob(value);
        } catch {
          (decrypted as any)[key] = value;
        }
      }
    }

    return decrypted;
  }

  /**
   * Handle sign in event
   */
  private async handleSignIn(session: Session): Promise<void> {
    authLogger.info('User signed in', { email: session.user.email });
    
    // Load user-specific data from Supabase
    await hybridStorage.load('user-data', session.user.id);
    
    // Track sign in - update last_login timestamp
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', session.user.id);
  }

  /**
   * Handle sign out event
   */
  private async handleSignOut(): Promise<void> {
    authLogger.info('User signed out');
    
    // Clear user-specific data from localStorage
    await hybridStorage.clearCategory('user-data');
  }

  /**
   * Handle user update event
   */
  private async handleUserUpdate(session: Session): Promise<void> {
    authLogger.info('User updated', { email: session.user.email });
    
    // Reload user profile
    await this.loadUserProfile(session.user.id);
  }

  /**
   * Get current auth state
   */
  getAuthState(): AuthState {
    return {
      user: this.currentUser,
      session: this.currentSession,
      profile: this.currentProfile,
      isAuthenticated: !!this.currentUser,
      isLoading: false,
      error: null
    };
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.currentUser;
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Get current user profile
   */
  getCurrentProfile(): UserProfile | null {
    return this.currentProfile;
  }

  /**
   * Subscribe to auth state changes
   */
  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.add(listener);
    
    // Call immediately with current state
    listener(this.getAuthState());
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    const state = this.getAuthState();
    authLogger.debug('Notifying listeners', {
      isAuthenticated: state.isAuthenticated,
      hasUser: !!state.user,
      hasSession: !!state.session,
      hasProfile: !!state.profile,
      listenerCount: this.listeners.size
    });
    
    this.listeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        authLogger.error('Auth listener error', error);
      }
    });
  }

  /**
   * Reset password request
   */
  async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });

      if (error) throw error;
      
      return { success: true };
    } catch (error: any) {
      logger.error('Password reset failed', error);
      return { 
        success: false, 
        error: error.message || 'Failed to send reset email' 
      };
    }
  }

  /**
   * Update password
   */
  async updatePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      
      return { success: true };
    } catch (error: any) {
      logger.error('Password update failed', error);
      return { 
        success: false, 
        error: error.message || 'Failed to update password' 
      };
    }
  }

  /**
   * Delete user account
   */
  async deleteAccount(): Promise<{ success: boolean; error?: string }> {
    if (!this.currentUser) {
      return { success: false, error: 'No user logged in' };
    }

    try {
      // Mark user as inactive instead of soft delete (since deleted_at column doesn't exist)
      const { error: dbError } = await supabase
        .from('users')
        .update({
          is_authenticated: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.currentUser.id);

      if (dbError) throw dbError;

      // Then delete auth account
      // Note: This requires admin privileges in production
      const { error: authError } = await supabase.auth.admin.deleteUser(
        this.currentUser.id
      );

      if (authError) throw authError;

      // Sign out
      await this.signOut();
      
      return { success: true };
    } catch (error: any) {
      logger.error('Account deletion failed', error);
      return { 
        success: false, 
        error: error.message || 'Failed to delete account' 
      };
    }
  }
}

// Export singleton instance
export const authManager = AuthManager.getInstance();

// Export convenience functions
export const signUp = (email: string, password: string, metadata?: any) => 
  authManager.signUp(email, password, metadata);

export const signIn = (email: string, password: string) => 
  authManager.signIn(email, password);

export const signOut = () => authManager.signOut();

export const getCurrentUser = () => authManager.getCurrentUser();
export const getCurrentProfile = () => authManager.getCurrentProfile();
export const isAuthenticated = () => authManager.isAuthenticated();

export const updateProfile = (updates: Partial<UserProfile>) => 
  authManager.updateProfile(updates);

export const saveApiKeys = (keys: Partial<UserApiKeys>) => 
  authManager.saveApiKeys(keys);

export const getApiKeys = () => authManager.getApiKeys();