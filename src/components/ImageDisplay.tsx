'use client';

import { memo, useCallback } from 'react';
import { Clock, User, CheckCircle } from 'lucide-react';
import { imageTracker } from '@/lib/tracking/imageTracker';
import { logger } from '@/lib/logger';

interface ImageDisplayProps {
  selectedImage: any;
  onImageSelect?: (image: any) => void;
}

export const ImageDisplay = memo<ImageDisplayProps>(function ImageDisplay({
  selectedImage,
  onImageSelect,
}) {
  if (!selectedImage) return null;

  return (
    <div className='bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4'>
      <div className='relative w-full h-64 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800'>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={selectedImage.urls?.regular || selectedImage.urls?.small || selectedImage.urls?.full}
          alt={selectedImage.alt_description || selectedImage.description || 'Selected image'}
          className='w-full h-full object-cover transition-opacity duration-300'
          loading='eager'
          decoding='async'
          onError={e => {
            const target = e.target as HTMLImageElement;
            // Try fallback URLs in order
            const fallbacks = [
              selectedImage.urls?.full,
              selectedImage.urls?.small,
              selectedImage.urls?.thumb,
            ].filter(Boolean);

            const currentIndex = fallbacks.findIndex(url => url === target.src);
            if (currentIndex < fallbacks.length - 1) {
              target.src = fallbacks[currentIndex + 1]!;
            } else {
              // All fallbacks failed, show error state
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                parent.innerHTML =
                  '<div class="flex items-center justify-center w-full h-full text-gray-400"><svg class="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>';
              }
            }
          }}
        />
      </div>
      <div className='mt-4'>
        <p className='text-sm text-gray-600 dark:text-gray-400'>
          {selectedImage.description || selectedImage.alt_description || 'No description available'}
        </p>
      </div>
    </div>
  );
});

interface ImageGridProps {
  images: any[];
  onImageSelect: (image: any) => void;
  showUsageIndicator?: boolean;
}

export const ImageGrid = memo<ImageGridProps>(function ImageGrid({
  images,
  onImageSelect,
  showUsageIndicator = true,
}) {
  const handleImageClick = useCallback(
    (image: any) => {
      onImageSelect(image);
    },
    [onImageSelect]
  );

  if (!images.length) return null;

  return (
    <div className='bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4'>
      <h3 className='text-lg font-semibold mb-4'>Search Results</h3>
      <div className='grid grid-cols-2 gap-2'>
        {images.slice(0, 4).map((image, index) => {
          const isUsed = imageTracker.isImageUsed(image.id);
          const usageInfo = isUsed ? imageTracker.getImageUsageInfo(image.id) : null;

          return (
            <button
              key={image.id || index}
              onClick={() => handleImageClick(image)}
              className='relative group overflow-hidden rounded-lg aspect-square'
              title={
                isUsed ? `Used ${new Date(usageInfo?.usedAt || 0).toLocaleDateString()}` : undefined
              }
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.urls?.small || image.urls?.regular}
                alt={image.alt_description || image.description || `Image ${index + 1}`}
                className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-300 ${
                  isUsed && showUsageIndicator ? 'opacity-75' : ''
                }`}
                loading='lazy'
                decoding='async'
                onLoad={() => logger.debug('Image loaded:', image.id)}
                onError={e => {
                  logger.warn('Image failed to load:', image.id);
                  const target = e.target as HTMLImageElement;
                  // Try fallback URL
                  if (image.urls?.regular && target.src !== image.urls.regular) {
                    target.src = image.urls.regular;
                  } else {
                    // Hide broken image
                    target.style.display = 'none';
                    target.parentElement?.classList.add('bg-gray-200', 'dark:bg-gray-700');
                  }
                }}
              />

              {/* Usage indicator overlay */}
              {isUsed && showUsageIndicator && (
                <div className='absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200'>
                  <div className='bg-white dark:bg-gray-800 rounded-full p-2 shadow-lg'>
                    <CheckCircle className='h-5 w-5 text-green-600' />
                  </div>
                </div>
              )}

              {/* Usage timestamp badge */}
              {isUsed && showUsageIndicator && (
                <div className='absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1'>
                  <Clock className='h-3 w-3' />
                  {usageInfo && (
                    <span>
                      {new Date(usageInfo.usedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Usage summary */}
      {showUsageIndicator && (
        <div className='mt-4 text-sm text-gray-500 dark:text-gray-400'>
          {(() => {
            const usedCount = images
              .slice(0, 4)
              .filter(img => imageTracker.isImageUsed(img.id)).length;
            if (usedCount === 0) return 'All images are new';
            if (usedCount === 1) return '1 image previously used';
            return `${usedCount} images previously used`;
          })()}
        </div>
      )}
    </div>
  );
});

ImageDisplay.displayName = 'ImageDisplay';
ImageGrid.displayName = 'ImageGrid';
