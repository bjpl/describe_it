/**
 * API Endpoint Definitions
 *
 * Central definition of all API endpoints with type safety.
 */

export const API_ENDPOINTS = {
  // Vocabulary endpoints
  vocabulary: {
    list: '/vocabulary',
    get: (id: string) => `/vocabulary/${id}`,
    create: '/vocabulary',
    update: (id: string) => `/vocabulary/${id}`,
    delete: (id: string) => `/vocabulary/${id}`,
    search: '/vocabulary/search',
    bulk: '/vocabulary/bulk',
  },

  // Description endpoints
  descriptions: {
    list: '/descriptions',
    get: (id: string) => `/descriptions/${id}`,
    create: '/descriptions',
    generate: '/descriptions/generate',
    update: (id: string) => `/descriptions/${id}`,
    delete: (id: string) => `/descriptions/${id}`,
  },

  // Session endpoints
  sessions: {
    list: '/sessions',
    get: (id: string) => `/sessions/${id}`,
    create: '/sessions',
    update: (id: string) => `/sessions/${id}`,
    complete: (id: string) => `/sessions/${id}/complete`,
    abandon: (id: string) => `/sessions/${id}/abandon`,
    active: '/sessions/active',
  },

  // Progress endpoints
  progress: {
    track: '/progress/track',
    stats: '/progress/stats',
    history: '/progress/history',
    user: (userId: string) => `/progress/user/${userId}`,
  },

  // Image endpoints
  images: {
    search: '/images/search',
    get: (id: string) => `/images/${id}`,
  },

  // Q&A endpoints
  qa: {
    generate: '/qa/generate',
    list: '/qa',
    get: (id: string) => `/qa/${id}`,
  },

  // Phrases endpoints
  phrases: {
    extract: '/phrases/extract',
  },

  // Settings endpoints
  settings: {
    get: '/settings',
    update: '/settings',
    reset: '/settings/reset',
  },

  // Export endpoints
  export: {
    generate: '/export',
    download: (filename: string) => `/export/${filename}`,
  },

  // System endpoints
  health: '/health',
  status: '/status',
} as const;

/**
 * Build query string from params
 */
export function buildQueryString(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        value.forEach(item => searchParams.append(key, String(item)));
      } else {
        searchParams.append(key, String(value));
      }
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}
