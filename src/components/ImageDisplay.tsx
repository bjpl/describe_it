'use client';

import { memo, useCallback } from 'react';
import { Clock, User, CheckCircle } from 'lucide-react';
import { imageTracker } from '@/lib/tracking/imageTracker';

interface ImageDisplayProps {
  selectedImage: any;
  onImageSelect?: (image: any) => void;
}

export const ImageDisplay = memo<ImageDisplayProps>(function ImageDisplay({
  selectedImage,
  onImageSelect
}) {
  if (!selectedImage) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
      <div className="relative w-full h-64 rounded-lg overflow-hidden">
        <img
          src={selectedImage.urls?.regular || selectedImage.url}
          alt={selectedImage.alt_description || 'Selected image'}
          className="w-full h-full object-cover transition-opacity duration-300"
          loading="eager"
          decoding="async"
        />
      </div>
      <div className="mt-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
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
  showUsageIndicator = true
}) {
  const handleImageClick = useCallback((image: any) => {
    onImageSelect(image);
  }, [onImageSelect]);

  if (!images.length) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
      <h3 className="text-lg font-semibold mb-4">Search Results</h3>
      <div className="grid grid-cols-2 gap-2">
        {images.slice(0, 4).map((image, index) => {
          const isUsed = imageTracker.isImageUsed(image.id);
          const usageInfo = isUsed ? imageTracker.getImageUsageInfo(image.id) : null;

          return (
            <button
              key={image.id || index}
              onClick={() => handleImageClick(image)}
              className="relative group overflow-hidden rounded-lg aspect-square"
              title={isUsed ? `Used ${new Date(usageInfo?.usedAt || 0).toLocaleDateString()}` : undefined}
            >
              <img
                src={image.urls?.small || image.url}
                alt={image.alt_description || `Image ${index + 1}`}
                className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-300 ${
                  isUsed && showUsageIndicator ? 'opacity-75' : ''
                }`}
                loading="lazy"
                decoding="async"
                onLoad={() => console.debug('Image loaded:', image.id)}
                onError={() => console.warn('Image failed to load:', image.id)}
              />
              
              {/* Usage indicator overlay */}
              {isUsed && showUsageIndicator && (
                <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="bg-white dark:bg-gray-800 rounded-full p-2 shadow-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              )}
              
              {/* Usage timestamp badge */}
              {isUsed && showUsageIndicator && (
                <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {usageInfo && (
                    <span>
                      {new Date(usageInfo.usedAt).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
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
        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          {(() => {
            const usedCount = images.slice(0, 4).filter(img => imageTracker.isImageUsed(img.id)).length;
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