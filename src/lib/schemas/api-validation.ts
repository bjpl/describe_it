import { z } from "zod";
import { NextResponse } from "next/server";
import { safeStringify, safeParse } from '@/lib/utils/json-safe';

// ================================
// SECURITY VALIDATION SCHEMAS
// ================================

/**
 * Base security validation schema for all API requests
 */
export const baseRequestSchema = z.object({
  // Request metadata
  requestId: z.string().uuid().optional(),
  timestamp: z.string().datetime().optional(),
  
  // User identification (optional but recommended)
  userId: z.string()
    .min(1, "User ID cannot be empty")
    .max(128, "User ID too long")
    .regex(/^[a-zA-Z0-9\-_]+$/, "Invalid user ID format")
    .optional(),
    
  // Session validation
  sessionId: z.string()
    .min(10, "Session ID too short")
    .max(256, "Session ID too long")
    .optional(),
});

/**
 * Image URL validation with security checks - supports both URLs and data URIs
 */
export const imageUrlSchema = z.string()
  .min(1, "Image URL cannot be empty")
  .refine((url) => {
    // Allow data URIs for base64 encoded images
    if (url.startsWith('data:image/')) {
      // Basic validation for data URI format
      const match = url.match(/^data:image\/(jpeg|jpg|png|gif|webp);base64,(.+)$/);
      if (match && match[2] && match[2].length > 0) {
        return true;
      }
      return false;
    }
    
    // For HTTP/HTTPS URLs, validate domain
    try {
      const parsedUrl = new URL(url);
      
      // Only allow HTTPS (except localhost for development)
      if (parsedUrl.protocol !== 'https:' && !parsedUrl.hostname.includes('localhost')) {
        return false;
      }
      
      // Whitelist allowed image domains
      const allowedDomains = [
        'images.unsplash.com',
        'plus.unsplash.com', 
        'unsplash.com',
        'localhost',
        '127.0.0.1',
        // Add more trusted domains as needed
      ];
      
      return allowedDomains.some(domain => 
        parsedUrl.hostname === domain || 
        parsedUrl.hostname.endsWith(`.${domain}`)
      );
    } catch {
      return false;
    }
  }, "Invalid image URL or unsupported format");

/**
 * Text content validation with XSS protection
 */
export const safeTextSchema = z.string()
  .min(1, "Text cannot be empty")
  .max(10000, "Text too long (max 10,000 characters)")
  .refine((text) => {
    // Basic XSS protection - reject common script patterns
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
      /expression\s*\(/i,
      /vbscript:/i,
      /data:text\/html/i,
    ];
    
    return !dangerousPatterns.some(pattern => pattern.test(text));
  }, "Text contains potentially dangerous content");

/**
 * Language code validation
 */
export const languageCodeSchema = z.enum([
  "en", "es", "fr", "de", "it", "pt", "ru", "zh", "ja", "ko", "ar", "hi"
], {
  errorMap: () => ({ message: "Unsupported language code" })
});

/**
 * Style validation for descriptions
 */
export const descriptionStyleSchema = z.enum([
  "narrativo", "poetico", "academico", "conversacional", "infantil"
], {
  errorMap: () => ({ message: "Invalid description style" })
});

// ================================
// API-SPECIFIC SCHEMAS
// ================================

/**
 * Authentication validation schemas
 */
export const authSignupSchema = baseRequestSchema.extend({
  email: z.string()
    .email("Invalid email format")
    .min(1, "Email is required")
    .max(255, "Email too long")
    .toLowerCase()
    .trim(),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password too long")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
      "Password must contain uppercase, lowercase, number and special character"),
  confirmPassword: z.string().optional(),
  firstName: z.string()
    .min(1, "First name is required")
    .max(50, "First name too long")
    .regex(/^[a-zA-Z\s\-']+$/, "Invalid first name format")
    .trim()
    .optional(),
  lastName: z.string()
    .min(1, "Last name is required")
    .max(50, "Last name too long")
    .regex(/^[a-zA-Z\s\-']+$/, "Invalid last name format")
    .trim()
    .optional(),
}).refine((data) => !data.confirmPassword || data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const authSigninSchema = baseRequestSchema.extend({
  email: z.string()
    .email("Invalid email format")
    .min(1, "Email is required")
    .max(255, "Email too long")
    .toLowerCase()
    .trim(),
  password: z.string()
    .min(1, "Password is required")
    .max(128, "Password too long"),
  rememberMe: z.boolean().optional().default(false),
});

export const authResetPasswordSchema = baseRequestSchema.extend({
  email: z.string()
    .email("Invalid email format")
    .min(1, "Email is required")
    .max(255, "Email too long")
    .toLowerCase()
    .trim(),
});

export const authUpdatePasswordSchema = baseRequestSchema.extend({
  token: z.string()
    .min(1, "Reset token is required")
    .max(500, "Token too long"),
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password too long")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
      "Password must contain uppercase, lowercase, number and special character"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

/**
 * Analytics and metrics validation schemas
 */
export const analyticsTrackSchema = baseRequestSchema.extend({
  event: z.string()
    .min(1, "Event name is required")
    .max(100, "Event name too long")
    .regex(/^[a-zA-Z0-9_\-\.]+$/, "Invalid event name format"),
  properties: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .optional()
    .refine((props) => {
      if (!props) return true;
      const size = JSON.stringify(props).length;
      return size <= 10000; // 10KB limit for properties
    }, "Properties object too large"),
  timestamp: z.string().datetime().optional(),
});

export const metricsQuerySchema = baseRequestSchema.extend({
  metric: z.string()
    .min(1, "Metric name is required")
    .max(100, "Metric name too long")
    .regex(/^[a-zA-Z0-9_\-\.]+$/, "Invalid metric name format"),
  startTime: z.string().datetime("Invalid start time format"),
  endTime: z.string().datetime("Invalid end time format"),
  granularity: z.enum(["minute", "hour", "day", "week", "month"]).default("hour"),
  aggregation: z.enum(["sum", "avg", "min", "max", "count"]).default("sum"),
}).refine((data) => new Date(data.startTime) < new Date(data.endTime), {
  message: "Start time must be before end time",
  path: ["endTime"],
});

export const webVitalsSchema = baseRequestSchema.extend({
  url: z.string().url("Invalid URL format").max(2000, "URL too long"),
  metrics: z.object({
    CLS: z.number().min(0).max(1).optional(),
    FID: z.number().min(0).optional(),
    FCP: z.number().min(0).optional(),
    LCP: z.number().min(0).optional(),
    TTFB: z.number().min(0).optional(),
  }),
  userAgent: z.string().max(512, "User agent too long").optional(),
  connection: z.object({
    effectiveType: z.enum(["slow-2g", "2g", "3g", "4g"]).optional(),
    downlink: z.number().min(0).optional(),
    rtt: z.number().min(0).optional(),
  }).optional(),
});

/**
 * Image processing validation schemas
 */
export const imageUploadSchema = baseRequestSchema.extend({
  image: z.string()
    .min(1, "Image data is required")
    .refine((data) => {
      // Check if it's a valid data URI for images
      if (data.startsWith('data:image/')) {
        const match = data.match(/^data:image\/(jpeg|jpg|png|gif|webp);base64,(.+)$/);
        return match && match[2] && match[2].length > 0;
      }
      return false;
    }, "Invalid image format or encoding"),
  filename: z.string()
    .min(1, "Filename is required")
    .max(255, "Filename too long")
    .regex(/^[^<>:"/\\|?*]+\.(jpg|jpeg|png|gif|webp)$/i, "Invalid filename format"),
  alt: z.string().max(200, "Alt text too long").optional(),
});

export const imageProxySchema = baseRequestSchema.extend({
  imageUrl: imageUrlSchema,
  maxWidth: z.coerce.number()
    .int("Max width must be an integer")
    .min(50, "Minimum width is 50 pixels")
    .max(2000, "Maximum width is 2000 pixels")
    .optional(),
  maxHeight: z.coerce.number()
    .int("Max height must be an integer")
    .min(50, "Minimum height is 50 pixels")
    .max(2000, "Maximum height is 2000 pixels")
    .optional(),
  quality: z.coerce.number()
    .int("Quality must be an integer")
    .min(1, "Minimum quality is 1")
    .max(100, "Maximum quality is 100")
    .default(85),
});

/**
 * Monitoring and admin validation schemas
 */
export const healthCheckSchema = z.object({
  service: z.string().optional(),
  deep: z.boolean().default(false),
});

export const resourceUsageSchema = baseRequestSchema.extend({
  timeframe: z.enum(["1m", "5m", "15m", "1h", "24h"]).default("5m"),
  includeHistory: z.boolean().default(false),
});

export const auditLogSchema = baseRequestSchema.extend({
  action: z.string()
    .min(1, "Action is required")
    .max(100, "Action too long")
    .regex(/^[a-zA-Z0-9_\-\.]+$/, "Invalid action format"),
  resourceType: z.string()
    .min(1, "Resource type is required")
    .max(50, "Resource type too long"),
  resourceId: z.string()
    .min(1, "Resource ID is required")
    .max(128, "Resource ID too long"),
  details: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .optional(),
  severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
});

/**
 * Description generation request schema
 */
export const descriptionGenerateSchema = baseRequestSchema.extend({
  imageUrl: imageUrlSchema,
  style: descriptionStyleSchema,
  language: languageCodeSchema.default("es"),
  maxLength: z.coerce.number()
    .int("Max length must be an integer")
    .min(50, "Minimum length is 50 characters")
    .max(2000, "Maximum length is 2000 characters")
    .default(300),
  customPrompt: z.string().max(500, "Custom prompt too long").refine((text) => {
    // Basic XSS protection - reject common script patterns
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
      /expression\s*\(/i,
      /vbscript:/i,
      /data:text\/html/i,
    ];
    
    return !dangerousPatterns.some(pattern => pattern.test(text));
  }, "Text contains potentially dangerous content").optional(),
  // Add userApiKey field to allow passing user's OpenAI API key
  userApiKey: z.string()
    .min(20, "API key too short")
    .max(200, "API key too long")
    .startsWith("sk-", "API key must start with 'sk-'")
    .optional(),
});

/**
 * Q&A generation request schema
 */
export const qaGenerateSchema = baseRequestSchema.extend({
  description: safeTextSchema,
  language: languageCodeSchema.default("es"),
  count: z.coerce.number()
    .int("Count must be an integer")
    .min(1, "Minimum count is 1")
    .max(20, "Maximum count is 20")
    .default(5),
  difficulty: z.enum(["facil", "medio", "dificil", "mixed"]).default("mixed"),
});

/**
 * Translation request schema
 */
export const translationRequestSchema = baseRequestSchema.extend({
  text: safeTextSchema,
  fromLanguage: languageCodeSchema,
  toLanguage: languageCodeSchema,
  context: z.string().max(200, "Context too long").refine((text) => {
    // Basic XSS protection - reject common script patterns
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
      /expression\s*\(/i,
      /vbscript:/i,
      /data:text\/html/i,
    ];
    
    return !dangerousPatterns.some(pattern => pattern.test(text));
  }, "Text contains potentially dangerous content").optional(),
});

/**
 * Phrase extraction request schema  
 */
export const phraseExtractionSchema = baseRequestSchema.extend({
  description: safeTextSchema,
  language: languageCodeSchema.default("es"),
  categories: z.array(z.enum([
    "objetos", "acciones", "lugares", "colores", "emociones", "conceptos"
  ])).default(["objetos", "acciones", "lugares", "colores", "emociones", "conceptos"]),
});

/**
 * Image search request schema
 */
export const imageSearchSchema = baseRequestSchema.extend({
  query: z.string().max(100, "Search query too long").refine((text) => {
    // Basic XSS protection - reject common script patterns
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
      /expression\s*\(/i,
      /vbscript:/i,
      /data:text\/html/i,
    ];
    
    return !dangerousPatterns.some(pattern => pattern.test(text));
  }, "Text contains potentially dangerous content"),
  page: z.coerce.number()
    .int("Page must be an integer")
    .min(1, "Page must be at least 1")
    .max(50, "Page cannot exceed 50")
    .default(1),
  perPage: z.coerce.number()
    .int("Per page must be an integer")  
    .min(1, "Per page must be at least 1")
    .max(30, "Per page cannot exceed 30")
    .default(12),
});

/**
 * Data export request schema
 */
export const exportRequestSchema = baseRequestSchema.extend({
  userId: z.string()
    .min(1, "User ID required for export")
    .max(128, "User ID too long"),
  format: z.enum(["json", "csv", "pdf"]).default("json"),
  includeImages: z.boolean().default(false),
  dateRange: z.object({
    start: z.string().datetime().optional(),
    end: z.string().datetime().optional(),
  }).optional(),
});

/**
 * Vocabulary save request schema
 */
export const vocabularySaveSchema = baseRequestSchema.extend({
  userId: z.string()
    .min(1, "User ID required")
    .max(128, "User ID too long"),
  phrase: z.string().max(200, "Phrase too long").refine((text) => {
    // Basic XSS protection - reject common script patterns
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
      /expression\s*\(/i,
      /vbscript:/i,
      /data:text\/html/i,
    ];
    
    return !dangerousPatterns.some(pattern => pattern.test(text));
  }, "Text contains potentially dangerous content"),
  translation: z.string().max(200, "Translation too long").refine((text) => {
    // Basic XSS protection - reject common script patterns
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
      /expression\s*\(/i,
      /vbscript:/i,
      /data:text\/html/i,
    ];
    
    return !dangerousPatterns.some(pattern => pattern.test(text));
  }, "Text contains potentially dangerous content"),
  category: z.string()
    .min(1, "Category required")
    .max(50, "Category too long"),
  difficulty: z.enum(["facil", "medio", "dificil"]),
  context: z.string().max(500, "Context too long").refine((text) => {
    // Basic XSS protection - reject common script patterns
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
      /expression\s*\(/i,
      /vbscript:/i,
      /data:text\/html/i,
    ];
    
    return !dangerousPatterns.some(pattern => pattern.test(text));
  }, "Text contains potentially dangerous content").optional(),
});

/**
 * Progress tracking request schema
 */
export const progressTrackingSchema = baseRequestSchema.extend({
  userId: z.string()
    .min(1, "User ID required")
    .max(128, "User ID too long"),
  action: z.enum([
    "description_viewed", "qa_completed", "vocabulary_learned", 
    "exercise_completed", "achievement_unlocked"
  ]),
  data: z.record(z.unknown()).optional(),
  timestamp: z.string().datetime().optional(),
});

/**
 * Settings and configuration validation schemas
 */
export const settingsSaveSchema = baseRequestSchema.extend({
  userId: z.string()
    .min(1, "User ID required")
    .max(128, "User ID too long"),
  settings: z.object({
    language: languageCodeSchema.optional(),
    theme: z.enum(["light", "dark", "auto"]).optional(),
    difficulty: z.enum(["facil", "medio", "dificil"]).optional(),
    notifications: z.boolean().optional(),
    autoPlay: z.boolean().optional(),
    fontSize: z.enum(["small", "medium", "large"]).optional(),
  }).refine((settings) => Object.keys(settings).length > 0, 
    "At least one setting must be provided"),
});

export const apiKeySaveSchema = baseRequestSchema.extend({
  provider: z.enum(["openai", "anthropic", "google"]),
  apiKey: z.string()
    .min(20, "API key too short")
    .max(500, "API key too long")
    .refine((key) => {
      // Basic format validation for different providers
      if (key.startsWith('sk-')) return true; // OpenAI format
      if (key.startsWith('sk-ant-')) return true; // Anthropic format
      if (key.length > 30) return true; // Google format (varies)
      return false;
    }, "Invalid API key format"),
  name: z.string()
    .min(1, "API key name is required")
    .max(100, "API key name too long")
    .optional(),
});

/**
 * Cache management validation schemas
 */
export const cacheOperationSchema = baseRequestSchema.extend({
  operation: z.enum(["get", "set", "delete", "clear", "stats"]),
  key: z.string()
    .min(1, "Cache key is required")
    .max(250, "Cache key too long")
    .regex(/^[a-zA-Z0-9\-_:\.]+$/, "Invalid cache key format")
    .optional(),
  value: z.unknown().optional(),
  ttl: z.coerce.number()
    .int("TTL must be an integer")
    .min(0, "TTL cannot be negative")
    .max(86400 * 30, "TTL too large (max 30 days)")
    .optional(),
});

/**
 * Error reporting validation schema
 */
export const errorReportSchema = baseRequestSchema.extend({
  error: z.object({
    name: z.string().min(1, "Error name is required").max(100, "Error name too long"),
    message: z.string().min(1, "Error message is required").max(1000, "Error message too long"),
    stack: z.string().max(5000, "Stack trace too long").optional(),
    componentStack: z.string().max(2000, "Component stack too long").optional(),
  }),
  errorBoundary: z.object({
    componentName: z.string().max(100, "Component name too long").optional(),
    errorInfo: z.record(z.unknown()).optional(),
  }).optional(),
  userAgent: z.string().max(512, "User agent too long").optional(),
  url: z.string().url("Invalid URL format").max(2000, "URL too long").optional(),
  context: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .optional(),
});

/**
 * Test endpoint validation schemas
 */
export const testVisionSchema = baseRequestSchema.extend({
  imageUrl: imageUrlSchema.optional(),
  prompt: z.string().max(500, "Prompt too long").optional(),
  // MIGRATED TO CLAUDE: Updated model options
  model: z.enum([
    "claude-sonnet-4-5-20250629",
    "claude-sonnet-3-5-20240229",
    "claude-opus-4-20250514",
    "gpt-4-vision-preview", // Legacy support
    "gpt-4o",
    "gpt-4o-mini"
  ]).default("claude-sonnet-4-5-20250629"),
});

export const testKeyVerificationSchema = baseRequestSchema.extend({
  provider: z.enum(["openai", "anthropic", "google"]),
  apiKey: z.string()
    .min(20, "API key too short")
    .max(500, "API key too long"),
  testEndpoint: z.boolean().default(true),
});

/**
 * Storage and cleanup validation schemas  
 */
export const storageCleanupSchema = baseRequestSchema.extend({
  target: z.enum(["cache", "temp_files", "logs", "analytics", "all"]).default("cache"),
  olderThan: z.coerce.number()
    .int("Age must be an integer")
    .min(1, "Minimum age is 1 hour")
    .max(8760, "Maximum age is 1 year")
    .default(24), // Default to 24 hours
  dryRun: z.boolean().default(true),
});

/**
 * Admin and debug validation schemas
 */
export const adminAnalyticsSchema = baseRequestSchema.extend({
  timeRange: z.enum(["1h", "24h", "7d", "30d", "90d"]).default("24h"),
  metrics: z.array(z.enum([
    "requests", "errors", "response_time", "users", "conversions", "revenue"
  ])).min(1, "At least one metric must be specified"),
  groupBy: z.enum(["hour", "day", "week", "month"]).default("hour"),
});

export const debugEnvSchema = z.object({
  showSensitive: z.boolean().default(false),
  category: z.enum(["all", "database", "api_keys", "auth", "cache"]).default("all"),
});

/**
 * Query parameter schemas for GET endpoints
 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().max(50).optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const dateRangeQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return new Date(data.startDate) <= new Date(data.endDate);
  }
  return true;
}, {
  message: "Start date must be before or equal to end date",
  path: ["endDate"],
});

export const searchQuerySchema = z.object({
  query: z.string()
    .min(1, "Search query is required")
    .max(200, "Search query too long")
    .refine((query) => {
      // Basic search query sanitization
      const dangerousPatterns = [
        /[<>\"']/,
        /javascript:/i,
        /<script/i,
      ];
      return !dangerousPatterns.some(pattern => pattern.test(query));
    }, "Search query contains invalid characters"),
  filters: z.record(z.union([z.string(), z.array(z.string())]))
    .optional(),
});

// ================================
// RESPONSE SCHEMAS
// ================================

/**
 * Standard API response schema
 */
export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  errors: z.array(z.object({
    field: z.string(),
    message: z.string(),
    code: z.string().optional(),
  })).optional(),
  metadata: z.object({
    timestamp: z.string().datetime(),
    responseTime: z.string(),
    requestId: z.string(),
    version: z.string().optional(),
  }).optional(),
});

// ================================
// VALIDATION UTILITIES
// ================================

/**
 * Validate request size (in bytes)
 */
export const validateRequestSize = (data: unknown, maxSize: number = 1024 * 1024): boolean => {
  const stringified = safeStringify(data);
  if (!stringified) return false;
  return stringified.length <= maxSize;
};

/**
 * Validation middleware factory for API endpoints
 */
export const createValidationMiddleware = <T>(schema: z.ZodSchema<T>) => {
  return async (request: Request): Promise<{ 
    success: true; 
    data: T; 
  } | { 
    success: false; 
    error: NextResponse; 
  }> => {
    try {
      // Validate request size
      let body: unknown = {};
      
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        const text = await request.text();
        
        if (!validateRequestSize(text, 10 * 1024 * 1024)) { // 10MB limit
          return {
            success: false,
            error: NextResponse.json(
              {
                success: false,
                error: "Request too large",
                message: "Request body exceeds size limit",
              },
              { status: 413 }
            ),
          };
        }
        
        try {
          body = safeParse(text);
          if (!body) {
            return {
              success: false,
              error: NextResponse.json(
                {
                  success: false,
                  error: "Invalid JSON",
                  message: "Request body contains invalid JSON",
                },
                { status: 400 }
              ),
            };
          }
        } catch {
          return {
            success: false,
            error: NextResponse.json(
              {
                success: false,
                error: "Parse error",
                message: "Failed to parse request body",
              },
              { status: 400 }
            ),
          };
        }
      } else {
        // For GET requests, parse query parameters
        const url = new URL(request.url);
        const queryParams: Record<string, unknown> = {};
        
        for (const [key, value] of url.searchParams.entries()) {
          // Handle array parameters
          if (queryParams[key]) {
            if (Array.isArray(queryParams[key])) {
              (queryParams[key] as unknown[]).push(value);
            } else {
              queryParams[key] = [queryParams[key], value];
            }
          } else {
            queryParams[key] = value;
          }
        }
        
        body = queryParams;
      }

      // Validate with Zod schema
      const validatedData = schema.parse(body);
      
      return {
        success: true,
        data: validatedData,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: NextResponse.json(
            {
              success: false,
              error: "Validation failed",
              message: "Invalid request parameters",
              errors: error.errors.map((err) => ({
                field: err.path.join("."),
                message: err.message,
                code: err.code,
                value: err.input,
              })),
            },
            { status: 400 }
          ),
        };
      }

      return {
        success: false,
        error: NextResponse.json(
          {
            success: false,
            error: "Validation error",
            message: "An unexpected validation error occurred",
          },
          { status: 500 }
        ),
      };
    }
  };
};

/**
 * Higher-order function to wrap API handlers with validation
 */
export const withValidation = <T>(
  schema: z.ZodSchema<T>,
  handler: (validatedData: T, request: Request) => Promise<NextResponse>
) => {
  return async (request: Request): Promise<NextResponse> => {
    const validate = createValidationMiddleware(schema);
    const validation = await validate(request);
    
    if (!validation.success) {
      return validation.error;
    }
    
    return handler(validation.data, request);
  };
};

/**
 * Validation utility for query parameters
 */
export const validateQueryParams = <T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; errors: z.ZodError } => {
  try {
    const params: Record<string, unknown> = {};
    
    for (const [key, value] of searchParams.entries()) {
      if (params[key]) {
        if (Array.isArray(params[key])) {
          (params[key] as unknown[]).push(value);
        } else {
          params[key] = [params[key], value];
        }
      } else {
        params[key] = value;
      }
    }
    
    const validated = schema.parse(params);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
};

/**
 * Create standardized error response
 */
export const createErrorResponse = (
  message: string,
  status: number = 400,
  errors?: Array<{ field: string; message: string; code?: string }>
): NextResponse => {
  return NextResponse.json(
    {
      success: false,
      error: message,
      errors: errors || [],
      timestamp: new Date().toISOString(),
    },
    { 
      status,
      headers: {
        "Content-Type": "application/json",
        "X-Content-Type-Options": "nosniff",
      }
    }
  );
};

/**
 * Create standardized success response
 */
export const createSuccessResponse = (
  data: unknown,
  metadata?: Record<string, unknown>
): NextResponse => {
  return NextResponse.json(
    {
      success: true,
      data,
      metadata: {
        timestamp: new Date().toISOString(),
        ...metadata,
      },
    },
    {
      headers: {
        "Content-Type": "application/json",
        "X-Content-Type-Options": "nosniff",
      }
    }
  );
};

/**
 * Sanitize text input to prevent XSS
 */
export const sanitizeText = (text: string): string => {
  return text
    .replace(/[<>\"']/g, '') // Remove potentially dangerous characters
    .replace(/javascript:/gi, '') // Remove javascript: protocols  
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
};

/**
 * Validate file upload
 */
export const fileUploadSchema = z.object({
  name: z.string().min(1, "Filename required").max(255, "Filename too long"),
  size: z.number().max(10 * 1024 * 1024, "File too large (max 10MB)"),
  type: z.string().refine((type) => {
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'
    ];
    return allowedTypes.includes(type);
  }, "Invalid file type"),
});

/**
 * IP address validation
 */
export const ipAddressSchema = z.string().refine((ip) => {
  // IPv4 regex
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  // IPv6 regex (simplified)
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}, "Invalid IP address format");

// ================================
// SECURITY VALIDATION FUNCTIONS
// ================================

/**
 * Validate user agent string with development mode support
 */
export const validateUserAgent = (userAgent: string): boolean => {
  if (!userAgent || userAgent.length > 512) return false;
  
  // Development mode - allow all development tools
  if (process.env.NODE_ENV === 'development') {
    // Only block obviously malicious patterns in development
    const maliciousPatterns = [
      /sqlmap/i, /nikto/i, /nmap/i, /hack/i, /attack/i, /exploit/i,
      /injection/i, /vulnerability/i, /penetration/i
    ];
    
    return !maliciousPatterns.some(pattern => pattern.test(userAgent));
  }
  
  // Production mode - more restrictive but allow development tools
  const maliciousPatterns = [
    /sqlmap/i, /nikto/i, /nmap/i, /hack/i, /attack/i, /exploit/i,
    /injection/i, /vulnerability/i, /penetration/i, /masscan/i
  ];
  
  // Allow development tools, legitimate browsers, and known good bots
  const allowedPatterns = [
    // Browsers
    /mozilla/i, /chrome/i, /safari/i, /firefox/i, /edge/i, /opera/i,
    // Development tools
    /curl/i, /postman/i, /insomnia/i, /thunder/i, /httpie/i, /wget/i,
    /python-requests/i, /node-fetch/i, /axios/i, /fetch/i,
    // Legitimate bots and services
    /googlebot/i, /bingbot/i, /slackbot/i, /twitterbot/i, /facebookexternalhit/i,
    /linkedinbot/i, /discordbot/i, /whatsapp/i, /telegrambot/i,
    // Monitoring and testing tools
    /pingdom/i, /uptimerobot/i, /newrelic/i, /datadog/i, /statuspage/i
  ];
  
  const isMalicious = maliciousPatterns.some(pattern => pattern.test(userAgent));
  const isAllowed = allowedPatterns.some(pattern => pattern.test(userAgent));
  
  // Block only if malicious, otherwise allow
  return !isMalicious;
};

/**
 * Validate request headers for security with development mode support
 */
export const validateSecurityHeaders = (headers: Headers): { valid: boolean; reason?: string } => {
  const origin = headers.get('origin');
  const referer = headers.get('referer');
  const userAgent = headers.get('user-agent') || '';
  const contentType = headers.get('content-type') || '';
  
  // Development mode - more relaxed validation
  if (process.env.NODE_ENV === 'development') {
    // Still check for malicious user agents but allow development tools
    if (!validateUserAgent(userAgent)) {
      return { valid: false, reason: 'Malicious user agent detected' };
    }
    
    // Allow various content types in development for testing
    // No need to strictly validate content type in dev mode
    
    return { valid: true };
  }
  
  // Production mode - stricter validation
  
  // Check user agent
  if (!validateUserAgent(userAgent)) {
    return { valid: false, reason: 'Invalid user agent' };
  }
  
  // For POST/PUT requests, ensure proper content type but allow common dev tool formats
  if (contentType && contentType.trim()) {
    const allowedContentTypes = [
      'application/json',
      'application/x-www-form-urlencoded',
      'multipart/form-data',
      'text/plain', // Allow for curl and other tools
      'application/octet-stream' // For binary uploads
    ];
    
    const isValidContentType = allowedContentTypes.some(type => 
      contentType.toLowerCase().includes(type.toLowerCase())
    );
    
    if (!isValidContentType) {
      return { valid: false, reason: 'Invalid content type' };
    }
  }
  
  // Basic origin/referer validation with localhost support
  if (origin || referer) {
    try {
      const url = new URL(origin || referer || '');
      // Allow localhost and development URLs
      if (url.protocol !== 'https:' && 
          !url.hostname.includes('localhost') && 
          !url.hostname.includes('127.0.0.1') &&
          !url.hostname.includes('0.0.0.0')) {
        return { valid: false, reason: 'Non-HTTPS requests not allowed in production' };
      }
    } catch {
      return { valid: false, reason: 'Invalid origin/referer' };
    }
  }
  
  return { valid: true };
};