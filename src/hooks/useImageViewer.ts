import { useState, useCallback } from 'react';
import { Image } from '@/types';

export function useImageViewer() {
  const [currentImage, setCurrentImage] = useState<Image | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scale, setScale] = useState(1);

  const openImage = useCallback((image: Image) => {
    setCurrentImage(image);
    setIsFullscreen(true);
    setScale(1);
  }, []);

  const closeImage = useCallback(() => {
    setCurrentImage(null);
    setIsFullscreen(false);
    setScale(1);
  }, []);

  const zoomIn = useCallback(() => {
    setScale(prev => Math.min(prev * 1.2, 3));
  }, []);

  const zoomOut = useCallback(() => {
    setScale(prev => Math.max(prev / 1.2, 0.5));
  }, []);

  const resetZoom = useCallback(() => {
    setScale(1);
  }, []);

  return {
    currentImage,
    isFullscreen,
    scale,
    openImage,
    closeImage,
    zoomIn,
    zoomOut,
    resetZoom
  };
}