// Re-export all validation schemas for centralized access
export * from './auth';
export * from './vocabulary';
export * from './sessions';
export * from './progress';

// Common validation utilities
import { z } from 'zod';

export const paginationSchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  page: z.number().min(1).optional(),
});

export const sortingSchema = z.object({
  sort_by: z.string().min(1),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

export const dateRangeSchema = z.object({
  date_from: z.string().date().optional(),
  date_to: z.string().date().optional(),
});

export const searchSchema = z.object({
  q: z.string().min(1).max(100).optional(),
  search: z.string().min(1).max(100).optional(),
});

// UUID validation
export const uuidSchema = z.string().uuid();

// Common response schema
export const apiResponseSchema = z.object({
  data: z.any().nullable(),
  error: z.string().nullable(),
  message: z.string().optional(),
  meta: z.object({
    total: z.number().optional(),
    page: z.number().optional(),
    limit: z.number().optional(),
    has_more: z.boolean().optional(),
    pages: z.number().optional(),
  }).optional(),
});

export type PaginationRequest = z.infer<typeof paginationSchema>;
export type SortingRequest = z.infer<typeof sortingSchema>;
export type DateRangeRequest = z.infer<typeof dateRangeSchema>;
export type SearchRequest = z.infer<typeof searchSchema>;
export type ApiResponse<T = any> = {
  data: T | null;
  error: string | null;
  message?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    has_more?: boolean;
    pages?: number;
  };
};