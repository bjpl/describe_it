import { z } from "zod";

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
 * Image URL validation with security checks
 */
export const imageUrlSchema = z.string()
  .url("Invalid image URL format")
  .refine((url) => {
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
  }, "Image URL must be from a trusted domain and use HTTPS");

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
  customPrompt: safeTextSchema.max(500, "Custom prompt too long").optional(),
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
  context: safeTextSchema.max(200, "Context too long").optional(),
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
  query: safeTextSchema.max(100, "Search query too long"),
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
  phrase: safeTextSchema.max(200, "Phrase too long"),
  translation: safeTextSchema.max(200, "Translation too long"),
  category: z.string()
    .min(1, "Category required")
    .max(50, "Category too long"),
  difficulty: z.enum(["facil", "medio", "dificil"]),
  context: safeTextSchema.max(500, "Context too long").optional(),
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
 * Settings save request schema
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
  try {
    const size = JSON.stringify(data).length;
    return size <= maxSize;
  } catch {
    return false;
  }
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
 * Validate user agent string
 */
export const validateUserAgent = (userAgent: string): boolean => {
  if (!userAgent || userAgent.length > 512) return false;
  
  // Block obvious bot patterns
  const suspiciousPatterns = [
    /curl/i, /wget/i, /python/i, /ruby/i, /java/i,
    /scanner/i, /crawler/i, /bot/i, /spider/i
  ];
  
  // Allow legitimate browsers and known good bots
  const allowedPatterns = [
    /mozilla/i, /chrome/i, /safari/i, /firefox/i, /edge/i,
    /googlebot/i, /bingbot/i, /slackbot/i
  ];
  
  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(userAgent));
  const isAllowed = allowedPatterns.some(pattern => pattern.test(userAgent));
  
  return !isSuspicious || isAllowed;
};

/**
 * Validate request headers for security
 */
export const validateSecurityHeaders = (headers: Headers): { valid: boolean; reason?: string } => {
  const origin = headers.get('origin');
  const referer = headers.get('referer');
  const userAgent = headers.get('user-agent') || '';
  const contentType = headers.get('content-type') || '';
  
  // Check user agent
  if (!validateUserAgent(userAgent)) {
    return { valid: false, reason: 'Invalid user agent' };
  }
  
  // For POST/PUT requests, ensure proper content type
  if (contentType && !contentType.includes('application/json') && 
      !contentType.includes('application/x-www-form-urlencoded')) {
    return { valid: false, reason: 'Invalid content type' };
  }
  
  // Basic origin/referer validation
  if (origin || referer) {
    try {
      const url = new URL(origin || referer || '');
      if (url.protocol !== 'https:' && !url.hostname.includes('localhost')) {
        return { valid: false, reason: 'Non-HTTPS requests not allowed' };
      }
    } catch {
      return { valid: false, reason: 'Invalid origin/referer' };
    }
  }
  
  return { valid: true };
};