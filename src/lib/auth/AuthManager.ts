/**
 * Authentication and User Management System
 * Handles user authentication, API key management, and data isolation
 */

import { supabase } from '../supabase/client';
import { supabaseSimple } from '../supabase/client-simple';
import { hybridStorage } from '../storage/HybridStorageManager';
import { logger } from '../logger';
import type { User, Session } from '@supabase/supabase-js';

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
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event);
        
        this.currentSession = session;
        this.currentUser = session?.user || null;
        
        if (session?.user) {
          await this.loadUserProfile(session.user.id);
        } else {
          this.currentProfile = null;
        }
        
        this.notifyListeners();

        // Handle different auth events
        switch (event) {
          case 'SIGNED_IN':
            await this.handleSignIn(session!);
            break;
          case 'SIGNED_OUT':
            await this.handleSignOut();
            break;
          case 'USER_UPDATED':
            await this.handleUserUpdate(session!);
            break;
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
      // Use the simpler client if available in browser context
      const client = (typeof window !== 'undefined' && supabaseSimple) ? supabaseSimple : supabase;
      
      console.log('[AuthManager] Attempting signup with:', {
        email,
        hasClient: !!client,
        isSimpleClient: client === supabaseSimple,
        url: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
        hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      });

      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        console.error('[AuthManager] Signup error:', {
          message: error.message,
          status: error.status,
          name: error.name,
          cause: error.cause
        });
        throw error;
      }

      console.log('[AuthManager] Signup response:', {
        hasUser: !!data.user,
        hasSession: !!data.session,
        userId: data.user?.id,
        email: data.user?.email
      });

      if (data.user) {
        // Create user profile with default settings
        await this.createUserProfile(data.user.id, {
          email,
          full_name: metadata?.full_name,
          username: metadata?.username
        });
      }

      return { success: true };
    } catch (error: any) {
      logger.error('Sign up failed', error);
      console.error('[AuthManager] Full signup error:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to sign up' 
      };
    }
  }

  /**
   * Sign in existing user
   */
  async signIn(email: string, password: string): Promise<{ 
    success: boolean; 
    error?: string;
    requiresVerification?: boolean;
  }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        if (error.message.includes('Email not confirmed')) {
          return { 
            success: false, 
            requiresVerification: true,
            error: 'Please verify your email before signing in' 
          };
        }
        throw error;
      }

      return { success: true };
    } catch (error: any) {
      logger.error('Sign in failed', error);
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
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear local storage for user-specific data
      await hybridStorage.clearCategory('user-data');
      
      this.currentUser = null;
      this.currentSession = null;
      this.currentProfile = null;
      
      this.notifyListeners();
    } catch (error) {
      logger.error('Sign out failed', error as Error);
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
          unsplash_key: null,
          openai_key: null,
          anthropic_key: null,
          google_key: null,
          encrypted: true,
          created_at: new Date().toISOString()
        });

      if (error && !error.message.includes('duplicate')) {
        throw error;
      }
    } catch (error) {
      logger.error('Failed to initialize API keys', error as Error);
    }
  }

  /**
   * Load user profile from database
   */
  private async loadUserProfile(userId: string): Promise<void> {
    try {
      // Load user profile
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      // Load API keys (encrypted)
      const { data: apiKeys, error: keysError } = await supabase
        .from('user_api_keys')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!keysError && apiKeys) {
        profile.api_keys = {
          unsplash: apiKeys.unsplash_key,
          openai: apiKeys.openai_key,
          anthropic: apiKeys.anthropic_key,
          google: apiKeys.google_key,
          encrypted: apiKeys.encrypted
        };
      }

      this.currentProfile = profile as UserProfile;
      this.notifyListeners();
    } catch (error) {
      logger.error('Failed to load user profile', error as Error);
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
    if (!this.currentUser) return false;

    try {
      // In production, encrypt keys before storing
      const encryptedKeys = await this.encryptApiKeys(keys);

      const { error } = await supabase
        .from('user_api_keys')
        .upsert({
          user_id: this.currentUser.id,
          unsplash_key: encryptedKeys.unsplash,
          openai_key: encryptedKeys.openai,
          anthropic_key: encryptedKeys.anthropic,
          google_key: encryptedKeys.google,
          encrypted: true,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      // Also save to localStorage for quick access (encrypted)
      await hybridStorage.save('api-keys', this.currentUser.id, encryptedKeys);

      // Update current profile
      if (this.currentProfile) {
        this.currentProfile.api_keys = { ...keys, encrypted: true };
        this.notifyListeners();
      }

      return true;
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
      if (value && key !== 'encrypted') {
        encrypted[key as keyof UserApiKeys] = btoa(value);
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
      if (value && key !== 'encrypted') {
        try {
          decrypted[key as keyof UserApiKeys] = atob(value);
        } catch {
          decrypted[key as keyof UserApiKeys] = value;
        }
      }
    }
    
    return decrypted;
  }

  /**
   * Handle sign in event
   */
  private async handleSignIn(session: Session): Promise<void> {
    console.log('User signed in:', session.user.email);
    
    // Load user-specific data from Supabase
    await hybridStorage.load('user-data', session.user.id);
    
    // Track sign in
    await supabase
      .from('users')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', session.user.id);
  }

  /**
   * Handle sign out event
   */
  private async handleSignOut(): Promise<void> {
    console.log('User signed out');
    
    // Clear user-specific data from localStorage
    await hybridStorage.clearCategory('user-data');
  }

  /**
   * Handle user update event
   */
  private async handleUserUpdate(session: Session): Promise<void> {
    console.log('User updated:', session.user.email);
    
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
    this.listeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('Auth listener error:', error);
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
      // Soft delete in database first
      const { error: dbError } = await supabase
        .from('users')
        .update({ 
          deleted_at: new Date().toISOString() 
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