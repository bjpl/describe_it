"use client";

import React, { useState, memo, forwardRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ImageOff, Loader2 } from "lucide-react";

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  sizes?: string;
  fill?: boolean;
  quality?: number;
  placeholder?: "blur" | "empty";
  blurDataURL?: string;
  onLoad?: () => void;
  onError?: () => void;
  aspectRatio?: "square" | "video" | "portrait" | "wide";
  lazy?: boolean;
}

const aspectRatioClasses = {
  square: "aspect-square",
  video: "aspect-video",
  portrait: "aspect-[3/4]",
  wide: "aspect-[21/9]",
};

// Generate blur placeholder for better loading experience
const shimmer = (w: number, h: number) => `
<svg width="${w}" height="${h}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="g">
      <stop stop-color="#f3f4f6" offset="20%" />
      <stop stop-color="#e5e7eb" offset="50%" />
      <stop stop-color="#f3f4f6" offset="70%" />
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="#f3f4f6" />
  <rect id="r" width="${w}" height="${h}" fill="url(#g)" opacity="0" />
  <animate xlink:href="#r" attributeName="opacity" values="0;1;0" dur="1s" repeatCount="indefinite"/>
</svg>`;

const toBase64 = (str: string) =>
  typeof window === "undefined"
    ? Buffer.from(str).toString("base64")
    : window.btoa(str);

export const OptimizedImage = memo(
  forwardRef<HTMLDivElement, OptimizedImageProps>(
    (
      {
        src,
        alt,
        width = 800,
        height = 600,
        className = "",
        priority = false,
        sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
        fill = false,
        quality = 85,
        placeholder = "blur",
        blurDataURL,
        onLoad,
        onError,
        aspectRatio,
        lazy = true,
      },
      ref,
    ) => {
      const [isLoading, setIsLoading] = useState(true);
      const [hasError, setHasError] = useState(false);
      const [loadStartTime] = useState(Date.now());

      const handleLoad = () => {
        setIsLoading(false);
        const loadTime = Date.now() - loadStartTime;

        // Performance monitoring
        if (typeof window !== "undefined" && window.performance) {
          window.performance.mark("image-loaded");
          console.debug(`Image loaded in ${loadTime}ms:`, src);
        }

        onLoad?.();
      };

      const handleError = () => {
        setIsLoading(false);
        setHasError(true);
        onError?.();
      };

      const containerClasses = `
    relative overflow-hidden bg-gray-100 dark:bg-gray-800 
    ${aspectRatio ? aspectRatioClasses[aspectRatio] : ""}
    ${className}
  `.trim();

      // Error fallback
      if (hasError) {
        return (
          <div ref={ref} className={containerClasses}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500"
            >
              <ImageOff className="w-8 h-8 mb-2" />
              <span className="text-sm">Failed to load image</span>
            </motion.div>
          </div>
        );
      }

      const imageProps = {
        src,
        alt,
        onLoad: handleLoad,
        onError: handleError,
        className: "object-cover transition-opacity duration-300",
        quality,
        placeholder: placeholder as any,
        blurDataURL:
          blurDataURL ||
          `data:image/svg+xml;base64,${toBase64(shimmer(width, height))}`,
        sizes,
        priority,
        ...(fill ? { fill: true } : { width, height }),
      };

      return (
        <div ref={ref} className={containerClasses}>
          {/* Loading overlay */}
          <AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-10 flex items-center justify-center bg-gray-100 dark:bg-gray-800"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Loader2 className="w-6 h-6 text-gray-400" />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Optimized Next.js Image */}
          <Image {...imageProps} />
        </div>
      );
    },
  ),
);

OptimizedImage.displayName = "OptimizedImage";

// Preloader component for critical images
export const ImagePreloader = memo(({ urls }: { urls: string[] }) => {
  React.useEffect(() => {
    // Only run in browser environment
    if (typeof window !== "undefined") {
      urls.forEach((url) => {
        const link = document.createElement("link");
        link.rel = "prefetch";
        link.href = url;
        link.as = "image";
        document.head.appendChild(link);
      });
    }
  }, [urls]);

  return null;
});

ImagePreloader.displayName = "ImagePreloader";

// Hook for image performance monitoring
export const useImagePerformance = () => {
  const [metrics, setMetrics] = React.useState({
    totalImages: 0,
    loadedImages: 0,
    failedImages: 0,
    averageLoadTime: 0,
  });

  const recordImageLoad = React.useCallback(
    (loadTime: number, success: boolean) => {
      setMetrics((prev) => ({
        totalImages: prev.totalImages + 1,
        loadedImages: success ? prev.loadedImages + 1 : prev.loadedImages,
        failedImages: success ? prev.failedImages : prev.failedImages + 1,
        averageLoadTime: success
          ? (prev.averageLoadTime * prev.loadedImages + loadTime) /
            (prev.loadedImages + 1)
          : prev.averageLoadTime,
      }));
    },
    [],
  );

  return { metrics, recordImageLoad };
};
