'use client';

import { useState, useCallback } from 'react';
import { Search, Image as ImageIcon } from 'lucide-react';
import { UnsplashImage } from '@/types';
import {
  safeParse,
  safeStringify,
  safeParseLocalStorage,
  safeSetLocalStorage,
} from '@/lib/utils/json-safe';
import { logger } from '@/lib/logger';

interface ImageSearchProps {
  onImageSelect: (image: UnsplashImage) => void;
}

export function ImageSearch({ onImageSelect }: ImageSearchProps) {
  const [query, setQuery] = useState('');
  const [images, setImages] = useState<UnsplashImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchImages = useCallback(async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // Build URL with query parameters
      const url = new URL('/api/images/search', window.location.origin);
      url.searchParams.set('query', query);
      url.searchParams.set('per_page', '12');

      // Add API key from localStorage if available
      try {
        // Try multiple possible storage locations
        const settingsStr = localStorage.getItem('app-settings');
        const describeItSettingsStr = localStorage.getItem('describe-it-settings');

        let apiKey = null;

        // Check app-settings first
        if (settingsStr) {
          const settings = safeParse(settingsStr);
          // Check both possible paths
          apiKey = settings.data?.apiKeys?.unsplash || settings.apiKeys?.unsplash;
        }

        // Check describe-it-settings if not found
        if (!apiKey && describeItSettingsStr) {
          const settings = safeParse(describeItSettingsStr);
          apiKey = settings.apiKeys?.unsplash;
        }

        if (apiKey) {
          url.searchParams.set('api_key', apiKey);
          logger.info('[ImageSearch] Using API key from settings (found)');
        } else {
          logger.info('[ImageSearch] No API key found in localStorage');
        }
      } catch (e) {
        logger.warn('[ImageSearch] Could not retrieve API key from settings:', {
          error: e as Error,
        });
      }

      const response = await fetch(url.toString());
      const data = await response.json();

      // Check if we have images directly in the response
      if (data.images && Array.isArray(data.images)) {
        setImages(data.images);
      } else if (data.success && data.data?.images) {
        // Fallback for wrapped response
        setImages(data.data.images);
      } else {
        setError(data.error || 'Failed to search images');
      }
    } catch (err) {
      setError('Failed to search images');
      logger.error('Search error:', err as Error);
    } finally {
      setLoading(false);
    }
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    searchImages();
  };

  return (
    <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6'>
      <h2 className='text-xl font-semibold mb-4 flex items-center'>
        <ImageIcon className='w-5 h-5 mr-2' />
        Image Search
      </h2>

      <form onSubmit={handleSubmit} className='mb-6'>
        <div className='flex gap-2'>
          <input
            type='text'
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder='Search for images...'
            className='flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
          />
          <button
            type='submit'
            disabled={loading || !query.trim()}
            className='px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center'
          >
            <Search className='w-4 h-4 mr-2' />
            Search
          </button>
        </div>
      </form>

      {error && (
        <div className='mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700'>
          {error}
        </div>
      )}

      {loading && (
        <div className='flex justify-center py-8'>
          <div className='w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin' />
        </div>
      )}

      {images.length > 0 && (
        <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
          {images.map(image => (
            <button
              key={image.id}
              onClick={() => onImageSelect(image)}
              className='group relative aspect-square overflow-hidden rounded-lg hover:ring-2 hover:ring-blue-500 transition-all bg-gray-100 dark:bg-gray-800'
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.urls.small || image.urls.regular}
                alt={image.alt_description || image.description || 'Image'}
                className='w-full h-full object-cover group-hover:scale-105 transition-transform'
                loading='lazy'
                decoding='async'
                onError={e => {
                  const target = e.target as HTMLImageElement;
                  // Fallback to regular size if small fails
                  if (image.urls.regular && target.src !== image.urls.regular) {
                    target.src = image.urls.regular;
                  } else {
                    // Show placeholder on complete failure
                    target.style.display = 'none';
                    target.parentElement?.classList.add('bg-gray-200', 'dark:bg-gray-700');
                  }
                }}
              />
              <div className='absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity'>
                <div className='absolute bottom-2 left-2 right-2'>
                  <p className='text-white text-xs truncate'>by {image.user?.name || 'Unknown'}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
