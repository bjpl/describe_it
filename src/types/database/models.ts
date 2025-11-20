/**
 * Database model definitions
 */

import type { JsonValue, UnknownObject } from '../core/json-types';
import type { FeatureFlags } from '../core/utility-types';

/**
 * Generic database record with common fields
 */
export interface DatabaseRecord {
  id: string;
  created_at: string;
  updated_at: string;
  [key: string]: JsonValue;
}

/**
 * User data types
 */
export interface UserData {
  id: string;
  created_at: string;
  updated_at: string;
  email?: string;
  full_name?: string;
  username?: string;
  avatar_url?: string;
  learning_level: 'beginner' | 'intermediate' | 'advanced';
  subscription_status: 'free' | 'premium' | 'trial';
  total_points: number;
  current_streak: number;
  longest_streak: number;
  last_active_at?: string;
  preferences: UserPreferences;
  metadata: UserMetadata;
}

export interface UserPreferences {
  language: string;
  theme: 'light' | 'dark' | 'auto';
  notifications_enabled: boolean;
  sound_enabled: boolean;
  auto_save: boolean;
  difficulty_preference: 'beginner' | 'intermediate' | 'advanced';
  [key: string]: JsonValue;
}

export interface UserMetadata {
  registration_source?: string;
  last_login?: string;
  login_count: number;
  feature_flags: FeatureFlags;
  experiment_groups: string[];
  custom_fields: UnknownObject;
}

/**
 * Session data types
 */
export interface SessionData {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  session_token: string;
  expires_at: string;
  device_info: DeviceInfo;
  location_info?: LocationInfo;
  activity_data: SessionActivity;
}

export interface DeviceInfo {
  user_agent?: string;
  device_type: 'desktop' | 'mobile' | 'tablet';
  os?: string;
  browser?: string;
  screen_resolution?: string;
  timezone?: string;
}

export interface LocationInfo {
  country?: string;
  region?: string;
  city?: string;
  timezone?: string;
  ip_address?: string; // Stored securely/hashed
}

export interface SessionActivity {
  pages_visited: string[];
  actions_performed: UserAction[];
  time_spent: number;
  last_activity: string;
}

export interface UserAction {
  action: string;
  timestamp: string;
  details: UnknownObject;
  duration?: number;
}

/**
 * Authentication data
 */
export interface AuthData {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;
  scope: string[];
  user: UserData;
  issued_at: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: UserData | null;
  loading: boolean;
  error: string | null;
  session: SessionData | null;
}
