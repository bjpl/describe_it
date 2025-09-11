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