// API Keys Configuration
// This file provides the API keys with fallback to environment variables

export const API_KEYS = {
  unsplash: {
    accessKey: process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY || 
               process.env.UNSPLASH_ACCESS_KEY || 
               ''
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || ''
  }
} as const;

// Log for debugging (only in development)
if (process.env.NODE_ENV === 'development') {
  console.log('[Config] API Keys loaded:', {
    hasUnsplashKey: !!API_KEYS.unsplash.accessKey,
    unsplashKeyLength: API_KEYS.unsplash.accessKey?.length || 0
  });
}