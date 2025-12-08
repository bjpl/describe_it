/**
 * User Test Data Builder
 * Provides fluent API for creating test user data
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface User {
  id?: string;
  email: string;
  username?: string;
  spanish_level?: 'beginner' | 'intermediate' | 'advanced';
  is_authenticated?: boolean;
  profile_completed?: boolean;
  created_at?: string;
  updated_at?: string;
}

export class UserBuilder {
  private data: Partial<User> = {
    email: `test-${Date.now()}@example.com`,
    username: `testuser-${Date.now()}`,
    spanish_level: 'beginner',
    is_authenticated: true,
    profile_completed: true,
  };

  /**
   * Set custom email
   */
  withEmail(email: string): this {
    this.data.email = email;
    return this;
  }

  /**
   * Set username
   */
  withUsername(username: string): this {
    this.data.username = username;
    return this;
  }

  /**
   * Set Spanish proficiency level
   */
  withSpanishLevel(level: 'beginner' | 'intermediate' | 'advanced'): this {
    this.data.spanish_level = level;
    return this;
  }

  /**
   * Quick setter for beginner level
   */
  beginner(): this {
    this.data.spanish_level = 'beginner';
    return this;
  }

  /**
   * Quick setter for intermediate level
   */
  intermediate(): this {
    this.data.spanish_level = 'intermediate';
    return this;
  }

  /**
   * Quick setter for advanced level
   */
  advanced(): this {
    this.data.spanish_level = 'advanced';
    return this;
  }

  /**
   * Mark user as unauthenticated
   */
  unauthenticated(): this {
    this.data.is_authenticated = false;
    return this;
  }

  /**
   * Mark user as authenticated
   */
  authenticated(): this {
    this.data.is_authenticated = true;
    return this;
  }

  /**
   * Mark profile as incomplete
   */
  withIncompleteProfile(): this {
    this.data.profile_completed = false;
    return this;
  }

  /**
   * Mark profile as complete
   */
  withCompleteProfile(): this {
    this.data.profile_completed = true;
    return this;
  }

  /**
   * Set custom ID
   */
  withId(id: string): this {
    this.data.id = id;
    return this;
  }

  /**
   * Create user in database
   */
  async create(db: SupabaseClient): Promise<User> {
    const { data, error } = await db
      .from('users')
      .insert(this.data)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }

    return data;
  }

  /**
   * Build user object without persisting
   */
  build(): Partial<User> {
    return { ...this.data };
  }

  /**
   * Reset to default values
   */
  reset(): this {
    this.data = {
      email: `test-${Date.now()}@example.com`,
      username: `testuser-${Date.now()}`,
      spanish_level: 'beginner',
      is_authenticated: true,
      profile_completed: true,
    };
    return this;
  }
}

/**
 * Factory function for creating user builder
 */
export function buildUser(): UserBuilder {
  return new UserBuilder();
}
