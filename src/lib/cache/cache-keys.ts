/**
 * Centralized cache key management
 * Provides type-safe cache key generation and pattern matching
 */

export type CacheKeyPrefix =
  | "img" // Image data
  | "desc" // Descriptions
  | "qa" // Q&A pairs
  | "phrase" // Phrases
  | "vec" // Vector embeddings
  | "search" // Search results
  | "user" // User data
  | "session" // Session data
  | "auth" // Authentication
  | "api" // API responses
  | "compute" // Computed values
  | "req"; // Request deduplication

export interface CacheKeyOptions {
  userId?: string;
  sessionId?: string;
  version?: string | number;
  locale?: string;
  [key: string]: string | number | undefined;
}

/**
 * Cache key builder for type-safe key generation
 */
export class CacheKey {
  private parts: string[] = [];
  private prefix: CacheKeyPrefix;
  private options: CacheKeyOptions;

  constructor(prefix: CacheKeyPrefix, options: CacheKeyOptions = {}) {
    this.prefix = prefix;
    this.options = options;
    this.parts.push(prefix);
  }

  /**
   * Add a segment to the key
   */
  segment(value: string | number): this {
    if (value !== null && value !== undefined) {
      this.parts.push(String(value));
    }
    return this;
  }

  /**
   * Add multiple segments
   */
  segments(...values: (string | number)[]): this {
    values.forEach((val) => this.segment(val));
    return this;
  }

  /**
   * Add user ID if available
   */
  withUser(): this {
    if (this.options.userId) {
      this.parts.push(`u:${this.options.userId}`);
    }
    return this;
  }

  /**
   * Add session ID if available
   */
  withSession(): this {
    if (this.options.sessionId) {
      this.parts.push(`s:${this.options.sessionId}`);
    }
    return this;
  }

  /**
   * Add version if available
   */
  withVersion(): this {
    if (this.options.version) {
      this.parts.push(`v:${this.options.version}`);
    }
    return this;
  }

  /**
   * Add locale if available
   */
  withLocale(): this {
    if (this.options.locale) {
      this.parts.push(`l:${this.options.locale}`);
    }
    return this;
  }

  /**
   * Build the final key
   */
  build(): string {
    return this.parts.join(":");
  }

  /**
   * Get pattern for invalidation (wildcards supported)
   */
  pattern(): string {
    return `${this.parts.join(":")}*`;
  }

  /**
   * Convert to string (same as build)
   */
  toString(): string {
    return this.build();
  }
}

/**
 * Factory functions for common cache keys
 */
export const CacheKeys = {
  /**
   * Image cache key
   */
  image: (imageId: string, options?: CacheKeyOptions): CacheKey => {
    return new CacheKey("img", options).segment(imageId);
  },

  /**
   * Description cache key
   */
  description: (imageId: string, options?: CacheKeyOptions): CacheKey => {
    return new CacheKey("desc", options).segment(imageId);
  },

  /**
   * Q&A cache key
   */
  qa: (imageId: string, question?: string, options?: CacheKeyOptions): CacheKey => {
    const key = new CacheKey("qa", options).segment(imageId);
    if (question) {
      // Hash long questions for key stability
      const questionKey = question.length > 50
        ? hashString(question)
        : question.replace(/[^a-zA-Z0-9]/g, "_");
      key.segment(questionKey);
    }
    return key;
  },

  /**
   * Phrase cache key
   */
  phrase: (imageId: string, options?: CacheKeyOptions): CacheKey => {
    return new CacheKey("phrase", options).segment(imageId);
  },

  /**
   * Vector cache key
   */
  vector: (text: string, model?: string, options?: CacheKeyOptions): CacheKey => {
    const key = new CacheKey("vec", options);
    const textHash = hashString(text);
    key.segment(textHash);
    if (model) {
      key.segment(model);
    }
    return key;
  },

  /**
   * Search results cache key
   */
  search: (query: string, filters?: Record<string, any>, options?: CacheKeyOptions): CacheKey => {
    const key = new CacheKey("search", options);
    const queryHash = hashString(query);
    key.segment(queryHash);
    if (filters) {
      const filtersHash = hashString(JSON.stringify(filters));
      key.segment(filtersHash);
    }
    return key;
  },

  /**
   * User data cache key
   */
  user: (userId: string, dataType?: string, options?: CacheKeyOptions): CacheKey => {
    const key = new CacheKey("user", { ...options, userId }).segment(userId);
    if (dataType) {
      key.segment(dataType);
    }
    return key;
  },

  /**
   * Session cache key
   */
  session: (sessionId: string, dataType?: string, options?: CacheKeyOptions): CacheKey => {
    const key = new CacheKey("session", { ...options, sessionId }).segment(sessionId);
    if (dataType) {
      key.segment(dataType);
    }
    return key;
  },

  /**
   * API response cache key
   */
  api: (endpoint: string, params?: Record<string, any>, options?: CacheKeyOptions): CacheKey => {
    const key = new CacheKey("api", options);
    const endpointClean = endpoint.replace(/[^a-zA-Z0-9]/g, "_");
    key.segment(endpointClean);
    if (params) {
      const paramsHash = hashString(JSON.stringify(params));
      key.segment(paramsHash);
    }
    return key;
  },

  /**
   * Computed value cache key
   */
  computed: (functionName: string, args?: any[], options?: CacheKeyOptions): CacheKey => {
    const key = new CacheKey("compute", options).segment(functionName);
    if (args && args.length > 0) {
      const argsHash = hashString(JSON.stringify(args));
      key.segment(argsHash);
    }
    return key;
  },

  /**
   * Request deduplication key
   */
  request: (requestId: string, options?: CacheKeyOptions): CacheKey => {
    return new CacheKey("req", options).segment(requestId);
  },

  /**
   * Custom key builder
   */
  custom: (prefix: CacheKeyPrefix, options?: CacheKeyOptions): CacheKey => {
    return new CacheKey(prefix, options);
  },
};

/**
 * Cache key patterns for bulk operations
 */
export const CachePatterns = {
  /**
   * All keys for a specific prefix
   */
  allByPrefix: (prefix: CacheKeyPrefix): string => {
    return `${prefix}:*`;
  },

  /**
   * All keys for a user
   */
  allByUser: (userId: string): string => {
    return `*:u:${userId}:*`;
  },

  /**
   * All keys for a session
   */
  allBySession: (sessionId: string): string => {
    return `*:s:${sessionId}:*`;
  },

  /**
   * All keys for a version
   */
  allByVersion: (version: string | number): string => {
    return `*:v:${version}:*`;
  },

  /**
   * All image-related keys
   */
  allImages: (): string => {
    return "img:*";
  },

  /**
   * All description keys
   */
  allDescriptions: (): string => {
    return "desc:*";
  },

  /**
   * All Q&A keys
   */
  allQA: (): string => {
    return "qa:*";
  },

  /**
   * All vector keys
   */
  allVectors: (): string => {
    return "vec:*";
  },

  /**
   * All search keys
   */
  allSearches: (): string => {
    return "search:*";
  },

  /**
   * All session keys
   */
  allSessions: (): string => {
    return "session:*";
  },

  /**
   * All API response keys
   */
  allAPI: (): string => {
    return "api:*";
  },

  /**
   * All computed value keys
   */
  allComputed: (): string => {
    return "compute:*";
  },

  /**
   * All request deduplication keys
   */
  allRequests: (): string => {
    return "req:*";
  },
};

/**
 * Simple string hash function for creating consistent keys
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Validate cache key format
 */
export function isValidCacheKey(key: string): boolean {
  // Keys should be alphanumeric with colons and underscores
  return /^[a-zA-Z0-9:_-]+$/.test(key) && key.length > 0 && key.length <= 250;
}

/**
 * Parse a cache key into its components
 */
export function parseCacheKey(key: string): {
  prefix: string;
  segments: string[];
  userId?: string;
  sessionId?: string;
  version?: string;
  locale?: string;
} {
  const segments = key.split(":");
  const prefix = segments[0];
  const parsed: any = {
    prefix,
    segments: segments.slice(1),
  };

  // Extract special segments
  segments.forEach((segment) => {
    if (segment.startsWith("u:")) {
      parsed.userId = segment.substring(2);
    } else if (segment.startsWith("s:")) {
      parsed.sessionId = segment.substring(2);
    } else if (segment.startsWith("v:")) {
      parsed.version = segment.substring(2);
    } else if (segment.startsWith("l:")) {
      parsed.locale = segment.substring(2);
    }
  });

  return parsed;
}

/**
 * Export type for use in cache manager
 */
export type CacheKeyType = CacheKey | string;

/**
 * Convert any cache key type to string
 */
export function toCacheKeyString(key: CacheKeyType): string {
  if (typeof key === "string") {
    return key;
  }
  return key.build();
}
