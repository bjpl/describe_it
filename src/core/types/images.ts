/**
 * Image Search Types
 *
 * Type definitions for image search, Unsplash integration, and image metadata
 */

// ============================================================================
// IMAGE SEARCH REQUEST & RESPONSE
// ============================================================================

export interface ImageSearchRequest {
  query: string;
  page?: number;
  per_page?: number;
  api_key?: string;
  orientation?: 'landscape' | 'portrait' | 'squarish';
  color?: string;
}

export interface ImageUrls {
  small: string;
  regular: string;
  full: string;
  raw?: string;
  thumb?: string;
}

export interface ImageUser {
  name: string;
  username: string;
  profile_image?: {
    small: string;
    medium: string;
    large: string;
  };
  links?: {
    self: string;
    html: string;
    photos: string;
  };
}

export interface ImageResult {
  id: string;
  urls: ImageUrls;
  alt_description: string | null;
  user: ImageUser;
  width: number;
  height: number;
  color: string;
  likes?: number;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
  blur_hash?: string;
}

export interface ImageSearchResponse {
  images: ImageResult[];
  totalPages: number;
  currentPage: number;
  total: number;
  hasNextPage: boolean;
}

// ============================================================================
// UNSPLASH API TYPES
// ============================================================================

export interface UnsplashPhoto {
  id: string;
  created_at: string;
  updated_at: string;
  width: number;
  height: number;
  color: string;
  blur_hash: string;
  likes: number;
  liked_by_user: boolean;
  description: string | null;
  alt_description: string | null;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  links: {
    self: string;
    html: string;
    download: string;
    download_location: string;
  };
  user: {
    id: string;
    username: string;
    name: string;
    portfolio_url: string | null;
    bio: string | null;
    location: string | null;
    total_likes: number;
    total_photos: number;
    total_collections: number;
    profile_image: {
      small: string;
      medium: string;
      large: string;
    };
    links: {
      self: string;
      html: string;
      photos: string;
      likes: string;
      portfolio: string;
    };
  };
}

export interface UnsplashSearchResponse {
  total: number;
  total_pages: number;
  results: UnsplashPhoto[];
}

// ============================================================================
// CACHE TYPES
// ============================================================================

export interface ImageCacheEntry {
  data: ImageSearchResponse;
  timestamp: number;
  expiresAt: number;
}

export interface ImageCacheKey {
  query: string;
  page: number;
  filters?: Record<string, string>;
}

// ============================================================================
// DEMO/PLACEHOLDER IMAGES
// ============================================================================

export interface DemoImageDefinition {
  id: string;
  description: string;
  category?: string;
}

export interface StableImageReference {
  unsplashId: string;
  category: string;
  keywords: string[];
}

// ============================================================================
// IMAGE METADATA & TRACKING
// ============================================================================

export interface ImageMetadata {
  id: string;
  source: 'unsplash' | 'demo' | 'upload' | 'url';
  query?: string;
  selectedAt: string;
  usedInSession?: string;
  attribution: {
    photographer: string;
    photographerUrl?: string;
    platform: string;
    platformUrl: string;
  };
}

export interface ImageUsageStats {
  imageId: string;
  timesSelected: number;
  lastUsed: string;
  avgDescriptionQuality?: number;
  categories: string[];
}

// ============================================================================
// IMAGE PROCESSING
// ============================================================================

export interface ImageProcessingOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpg' | 'png' | 'webp' | 'avif';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  compression?: number;
}

export interface ProcessedImageResult {
  url: string;
  format: string;
  width: number;
  height: number;
  size: number;
  processedAt: string;
}
