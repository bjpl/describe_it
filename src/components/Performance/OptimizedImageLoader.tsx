'use client';

import React, { useState, useRef, useCallback, memo } from 'react';
import Image from 'next/image';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import { useIntersectionObserver, imageOptimization } from '@/lib/utils/performance-helpers';
import 'react-lazy-load-image-component/src/effects/blur.css';

interface OptimizedImageLoaderProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  quality?: number;
  placeholder?: 'blur' | 'empty';
  sizes?: string;
  fill?: boolean;
  loading?: 'lazy' | 'eager';
  onLoad?: () => void;
  onError?: () => void;
  fallbackSrc?: string;
  useNextImage?: boolean; // Toggle between Next.js Image and LazyLoadImage
}

const OptimizedImageLoaderBase: React.FC<OptimizedImageLoaderProps> = ({
  src,
  alt,
  width = 400,
  height = 300,
  className = '',
  priority = false,
  quality = 75,
  placeholder = 'blur',
  sizes,
  fill = false,
  loading = 'lazy',
  onLoad,
  onError,
  fallbackSrc,
  useNextImage = true
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imageRef = useRef<HTMLDivElement>(null);
  const isIntersecting = useIntersectionObserver(imageRef, {
    threshold: 0.1,
    rootMargin: '50px'
  });

  const hasIntersected = isIntersecting;

  const handleLoad = useCallback(() => {
    setImageLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setImageError(true);
    onError?.();
  }, [onError]);

  // Generate blur placeholder
  const blurDataURL = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8A0s8t1tcTXMMvOVFKoVJDdZHr1Z9VzHsGQl9zYXqtzIj6Hq8fSfQCHzXGhfXQFT7LJFXG+VVjr36sJvM/8AADUqfVH//9k=';

  // Determine image source
  const imageSrc = imageError && fallbackSrc ? fallbackSrc : src;

  // Calculate optimal sizes based on container
  const optimalSize = width || 800;

  // If using Next.js Image component
  if (useNextImage) {
    return (
      <div 
        ref={imageRef as React.RefObject<HTMLDivElement>}
        className={`relative overflow-hidden ${className}`}
        style={!fill ? { width, height } : undefined}
      >
        {(priority || hasIntersected) && (
          <Image
            src={imageSrc}
            alt={alt}
            width={fill ? undefined : width}
            height={fill ? undefined : height}
            fill={fill}
            priority={priority}
            quality={quality}
            placeholder={placeholder}
            blurDataURL={placeholder === 'blur' ? blurDataURL : undefined}
            sizes={sizes || `(max-width: 768px) 100vw, (max-width: 1200px) 50vw, ${width}px`}
            loading={loading}
            className={`transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={handleLoad}
            onError={handleError}
            style={{
              objectFit: 'cover',
              objectPosition: 'center'
            }}
          />
        )}
        
        {/* Loading placeholder */}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
            <div className="text-gray-400 text-sm">Loading...</div>
          </div>
        )}
        
        {/* Error fallback */}
        {imageError && !fallbackSrc && (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
            <div className="text-gray-400 text-center p-4">
              <div className="text-2xl mb-2">📷</div>
              <div className="text-sm">Image failed to load</div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Using react-lazy-load-image-component for more control
  return (
    <div 
      ref={imageRef as React.RefObject<HTMLDivElement>}
      className={`relative overflow-hidden ${className}`}
      style={!fill ? { width, height } : undefined}
    >
      {(priority || hasIntersected) && (
        <LazyLoadImage
          src={imageSrc}
          alt={alt}
          width={width}
          height={height}
          effect="blur"
          placeholderSrc={blurDataURL}
          threshold={100}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={handleLoad}
          onError={handleError}
          wrapperClassName="w-full h-full"
        />
      )}
      
      {/* Loading placeholder */}
      {!imageLoaded && !imageError && !hasIntersected && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          <div className="text-gray-400 text-sm">Loading...</div>
        </div>
      )}
      
      {/* Error fallback */}
      {imageError && !fallbackSrc && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-gray-400 text-center p-4">
            <div className="text-2xl mb-2">📷</div>
            <div className="text-sm">Image failed to load</div>
          </div>
        </div>
      )}
    </div>
  );
};

// Memoized component with custom comparison
export const OptimizedImageLoader = memo(OptimizedImageLoaderBase, (prevProps, nextProps) => {
  return (
    prevProps.src === nextProps.src &&
    prevProps.alt === nextProps.alt &&
    prevProps.width === nextProps.width &&
    prevProps.height === nextProps.height &&
    prevProps.className === nextProps.className &&
    prevProps.priority === nextProps.priority &&
    prevProps.quality === nextProps.quality &&
    prevProps.useNextImage === nextProps.useNextImage
  );
});

OptimizedImageLoader.displayName = 'OptimizedImageLoader';

// Grid component for multiple images
interface OptimizedImageGridProps {
  images: Array<{
    id: string;
    src: string;
    alt: string;
    width?: number;
    height?: number;
  }>;
  className?: string;
  itemClassName?: string;
  onImageClick?: (image: any) => void;
  loading?: boolean;
  columns?: number;
}

export const OptimizedImageGrid = memo<OptimizedImageGridProps>(function OptimizedImageGrid({
  images,
  className = '',
  itemClassName = '',
  onImageClick,
  loading = false,
  columns = 3
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  
  const handleImageClick = useCallback((image: any) => {
    onImageClick?.(image);
  }, [onImageClick]);

  if (loading) {
    return (
      <div className={`grid gap-4 ${className}`} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="aspect-square bg-gray-200 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div 
      ref={gridRef}
      className={`grid gap-4 ${className}`}
      style={{ gridTemplateColumns: `repeat(auto-fill, minmax(250px, 1fr))` }}
    >
      {images.map((image, index) => (
        <div 
          key={image.id} 
          className={`aspect-square cursor-pointer hover:scale-105 transition-transform duration-200 ${itemClassName}`}
          onClick={() => handleImageClick(image)}
        >
          <OptimizedImageLoader
            src={image.src}
            alt={image.alt}
            width={image.width || 300}
            height={image.height || 300}
            className="w-full h-full rounded-lg"
            loading={index < 6 ? 'eager' : 'lazy'} // Load first 6 images immediately
            priority={index < 2} // Prioritize first 2 images
            quality={80}
            useNextImage={true}
          />
        </div>
      ))}
    </div>
  );
});

OptimizedImageGrid.displayName = 'OptimizedImageGrid';