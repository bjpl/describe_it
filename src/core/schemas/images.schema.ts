/**
 * Images API Schemas
 *
 * Zod schemas for image search and processing with runtime validation
 * and TypeScript type inference
 */

import { z } from 'zod';

// ============================================================================
// IMAGE SEARCH
// ============================================================================

export const unsplashColorsSchema = z.enum([
  'black_and_white',
  'black',
  'white',
  'yellow',
  'orange',
  'red',
  'purple',
  'magenta',
  'green',
  'teal',
  'blue',
]);

export type UnsplashColor = z.infer<typeof unsplashColorsSchema>;

export const imageSearchRequestSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(100),
  page: z.coerce.number().int().min(1).optional().default(1),
  per_page: z.coerce.number().int().min(1).max(30).optional().default(20),
  orientation: z.enum(['landscape', 'portrait', 'squarish']).optional(),
  color: unsplashColorsSchema.optional(),
  orderBy: z.enum(['relevant', 'latest', 'oldest', 'popular']).optional(),
  api_key: z.string().optional(),
});

export type ImageSearchRequest = z.infer<typeof imageSearchRequestSchema>;

// ============================================================================
// IMAGE RESULT TYPES
// ============================================================================

export const imageUrlsSchema = z.object({
  small: z.string().url(),
  regular: z.string().url(),
  full: z.string().url(),
  raw: z.string().url().optional(),
  thumb: z.string().url().optional(),
});

export type ImageUrls = z.infer<typeof imageUrlsSchema>;

export const imageUserSchema = z.object({
  name: z.string(),
  username: z.string(),
  profile_image: z.object({
    small: z.string().url(),
    medium: z.string().url(),
    large: z.string().url(),
  }).optional(),
  links: z.object({
    self: z.string().url(),
    html: z.string().url(),
    photos: z.string().url(),
  }).optional(),
});

export type ImageUser = z.infer<typeof imageUserSchema>;

export const imageResultSchema = z.object({
  id: z.string(),
  urls: imageUrlsSchema,
  alt_description: z.string().nullable(),
  user: imageUserSchema,
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  color: z.string(),
  likes: z.number().int().nonnegative().optional(),
  description: z.string().nullable().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  blur_hash: z.string().optional(),
});

export type ImageResult = z.infer<typeof imageResultSchema>;

export const imageSearchResponseSchema = z.object({
  images: z.array(imageResultSchema),
  totalPages: z.number().int().nonnegative(),
  currentPage: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  hasNextPage: z.boolean(),
});

export type ImageSearchResponse = z.infer<typeof imageSearchResponseSchema>;

// ============================================================================
// IMAGE PROXY
// ============================================================================

export const imageProxyRequestSchema = z.object({
  url: z.string().url('Invalid image URL'),
  width: z.coerce.number().int().positive().max(4000).optional(),
  height: z.coerce.number().int().positive().max(4000).optional(),
  quality: z.coerce.number().int().min(1).max(100).optional().default(80),
  format: z.enum(['jpg', 'png', 'webp', 'avif']).optional().default('webp'),
  fit: z.enum(['cover', 'contain', 'fill', 'inside', 'outside']).optional().default('cover'),
});

export type ImageProxyRequest = z.infer<typeof imageProxyRequestSchema>;

// ============================================================================
// IMAGE METADATA
// ============================================================================

export const imageMetadataSchema = z.object({
  id: z.string(),
  source: z.enum(['unsplash', 'demo', 'upload', 'url']),
  query: z.string().optional(),
  selectedAt: z.string().datetime(),
  usedInSession: z.string().uuid().optional(),
  attribution: z.object({
    photographer: z.string(),
    photographerUrl: z.string().url().optional(),
    platform: z.string(),
    platformUrl: z.string().url(),
  }),
});

export type ImageMetadata = z.infer<typeof imageMetadataSchema>;

export const saveImageMetadataRequestSchema = z.object({
  imageId: z.string(),
  source: z.enum(['unsplash', 'demo', 'upload', 'url']),
  query: z.string().optional(),
  sessionId: z.string().uuid().optional(),
  attribution: z.object({
    photographer: z.string(),
    photographerUrl: z.string().url().optional(),
    platform: z.string(),
    platformUrl: z.string().url(),
  }),
});

export type SaveImageMetadataRequest = z.infer<typeof saveImageMetadataRequestSchema>;

export const saveImageMetadataResponseSchema = z.object({
  success: z.boolean(),
  data: imageMetadataSchema.nullable(),
  error: z.string().optional(),
});

export type SaveImageMetadataResponse = z.infer<typeof saveImageMetadataResponseSchema>;

// ============================================================================
// IMAGE PROCESSING
// ============================================================================

export const imageProcessingOptionsSchema = z.object({
  width: z.number().int().positive().max(4000).optional(),
  height: z.number().int().positive().max(4000).optional(),
  quality: z.number().int().min(1).max(100).optional().default(80),
  format: z.enum(['jpg', 'png', 'webp', 'avif']).optional().default('webp'),
  fit: z.enum(['cover', 'contain', 'fill', 'inside', 'outside']).optional().default('cover'),
  compression: z.number().int().min(0).max(9).optional(),
});

export type ImageProcessingOptions = z.infer<typeof imageProcessingOptionsSchema>;

export const processedImageResultSchema = z.object({
  url: z.string().url(),
  format: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  size: z.number().int().nonnegative(),
  processedAt: z.string().datetime(),
});

export type ProcessedImageResult = z.infer<typeof processedImageResultSchema>;

// ============================================================================
// IMAGE USAGE STATS
// ============================================================================

export const imageUsageStatsSchema = z.object({
  imageId: z.string(),
  timesSelected: z.number().int().nonnegative(),
  lastUsed: z.string().datetime(),
  avgDescriptionQuality: z.number().min(0).max(1).optional(),
  categories: z.array(z.string()),
});

export type ImageUsageStats = z.infer<typeof imageUsageStatsSchema>;

export const getImageUsageStatsResponseSchema = z.object({
  success: z.boolean(),
  data: imageUsageStatsSchema.nullable(),
  error: z.string().optional(),
});

export type GetImageUsageStatsResponse = z.infer<typeof getImageUsageStatsResponseSchema>;
