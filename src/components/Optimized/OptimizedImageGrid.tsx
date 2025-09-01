import React, { memo } from 'react';
import { UnsplashImage } from '@/types';

interface OptimizedImageGridProps {
  images: UnsplashImage[];
  onImageClick: (image: UnsplashImage) => void;
  loading?: boolean;
  columns?: number;
}

export const OptimizedImageGrid = memo<OptimizedImageGridProps>(({ 
  images, 
  onImageClick, 
  loading = false,
  columns = 4
}) => {
  const gridClasses = `grid gap-4 w-full ${
    columns === 1 ? 'grid-cols-1' :
    columns === 2 ? 'grid-cols-1 sm:grid-cols-2' :
    columns === 3 ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3' :
    'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
  }`;

  if (loading) {
    return (
      <div className={gridClasses}>
        {Array.from({ length: columns * 2 }).map((_, index) => (
          <div 
            key={index}
            className="aspect-square bg-gray-200 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="text-6xl mb-4">🔍</div>
        <h3 className="text-xl font-medium text-gray-700">No images found</h3>
        <p className="text-gray-500 max-w-md mx-auto">
          Try different keywords or check your spelling.
        </p>
      </div>
    );
  }

  return (
    <div className={gridClasses}>
      {images.map((image) => (
        <div
          key={image.id}
          className="group relative aspect-square overflow-hidden rounded-xl cursor-pointer bg-gray-100 shadow-sm hover:shadow-md transition-shadow"
          onClick={() => onImageClick(image)}
        >
          <img 
            src={image.urls.small}
            alt={image.alt_description || image.description || 'Image'}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300" />
          <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <p className="text-white text-xs bg-black bg-opacity-50 rounded px-2 py-1 truncate">
              By {image.user.name}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
});

OptimizedImageGrid.displayName = 'OptimizedImageGrid';