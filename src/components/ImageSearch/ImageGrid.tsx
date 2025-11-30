'use client';

import React, { useCallback, useMemo, memo } from 'react';
import { Heart, Download, User, Calendar } from 'lucide-react';
import { UnsplashImage } from '@/types';
import { performanceProfiler, useRenderCount } from '@/lib/utils/performance-helpers';

interface ImageGridProps {
  images: UnsplashImage[];
  onImageClick: (image: UnsplashImage) => void;
  loading?: boolean;
}

// Individual image item component for better memoization
const ImageItem = memo(
  ({
    image,
    onImageClick,
  }: {
    image: UnsplashImage;
    onImageClick: (image: UnsplashImage) => void;
  }) => {
    const handleClick = useCallback(() => onImageClick(image), [image, onImageClick]);

    const handleDownload = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        if (typeof window !== 'undefined') {
          const link = document.createElement('a');
          link.href = image.urls.regular;
          link.download = `unsplash-${image.id}.jpg`;
          link.click();
        }
      },
      [image.urls.regular, image.id]
    );

    const handleViewClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onImageClick(image);
      },
      [image, onImageClick]
    );

    return (
      <div
        className='group relative aspect-square overflow-hidden rounded-xl cursor-pointer bg-gray-100 hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200'
        onClick={handleClick}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.urls.small || image.urls.regular}
          alt={image.alt_description || image.description || 'Unsplash image'}
          className='w-full h-full object-cover transition-transform duration-300 group-hover:scale-110'
          loading='lazy'
          decoding='async'
          onError={e => {
            const target = e.target as HTMLImageElement;
            // Try fallback to regular size
            if (image.urls.regular && target.src !== image.urls.regular) {
              target.src = image.urls.regular;
            } else if (image.urls.full && target.src !== image.urls.full) {
              target.src = image.urls.full;
            } else {
              // Show placeholder on complete failure
              target.style.display = 'none';
              const parent = target.closest('.aspect-square');
              parent?.classList.add('bg-gray-200', 'dark:bg-gray-700');
            }
          }}
        />

        {/* Overlay */}
        <div className='absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300' />

        {/* Hover Content */}
        <div className='absolute inset-0 p-3 flex flex-col justify-between opacity-0 group-hover:opacity-100 transition-all duration-300'>
          {/* Top Section - Image Info */}
          <div className='flex items-start justify-between'>
            <div className='flex items-center gap-1 bg-black bg-opacity-50 rounded-full px-2 py-1 text-white text-xs'>
              <Heart className='h-3 w-3' />
              <span>{image.likes}</span>
            </div>

            <div className='flex items-center gap-1 bg-black bg-opacity-50 rounded-full px-2 py-1'>
              <button
                onClick={handleDownload}
                className='text-white hover:text-gray-200 transition-colors'
              >
                <Download className='h-3 w-3' />
              </button>
            </div>
          </div>

          {/* Bottom Section - User Info */}
          <div className='space-y-2'>
            {/* Description */}
            {(image.description || image.alt_description) && (
              <p className='text-white text-xs bg-black bg-opacity-50 rounded-lg px-2 py-1 line-clamp-2'>
                {image.description || image.alt_description}
              </p>
            )}

            {/* User Info */}
            <div className='flex items-center gap-2 bg-black bg-opacity-50 rounded-lg px-2 py-1'>
              <User className='h-3 w-3 text-white' />
              <span className='text-white text-xs font-medium truncate'>{image.user.name}</span>
            </div>
          </div>
        </div>

        {/* Quick Preview Button */}
        <div className='absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300'>
          <button
            onClick={handleViewClick}
            className='bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-800 px-4 py-2 rounded-full font-medium transition-all duration-200 shadow-lg hover:scale-105 active:scale-95'
          >
            View Image
          </button>
        </div>

        {/* Image Dimensions Indicator */}
        <div className='absolute top-3 left-3 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300'>
          {image.width} × {image.height}
        </div>

        {/* Creation Date */}
        <div className='absolute bottom-3 right-3 flex items-center gap-1 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300'>
          <Calendar className='h-3 w-3' />
          <span>{new Date(image.created_at).toLocaleDateString()}</span>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.image.id === nextProps.image.id && prevProps.onImageClick === nextProps.onImageClick
    );
  }
);

ImageItem.displayName = 'ImageItem';

const ImageGridBase: React.FC<ImageGridProps> = ({ images, onImageClick, loading = false }) => {
  // Performance monitoring
  const renderCount = useRenderCount('ImageGrid');

  React.useEffect(() => {
    performanceProfiler.startMark('ImageGrid-render');
    return () => {
      performanceProfiler.endMark('ImageGrid-render');
    };
  });

  // Memoize loading skeleton
  const loadingSkeleton = useMemo(
    () => (
      <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'>
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className='aspect-square bg-gray-200 rounded-xl animate-pulse' />
        ))}
      </div>
    ),
    []
  );

  if (loading) {
    return loadingSkeleton;
  }

  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'>
      {images.map(image => (
        <ImageItem key={image.id} image={image} onImageClick={onImageClick} />
      ))}
    </div>
  );
};

// Export memoized component with optimized comparison
export const ImageGrid = memo(ImageGridBase, (prevProps, nextProps) => {
  return (
    prevProps.loading === nextProps.loading &&
    prevProps.onImageClick === nextProps.onImageClick &&
    prevProps.images.length === nextProps.images.length &&
    prevProps.images.every((img, idx) => img.id === nextProps.images[idx]?.id)
  );
});

ImageGrid.displayName = 'ImageGrid';
