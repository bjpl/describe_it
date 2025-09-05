"use client";

import React from "react";
import { AnimatePresence } from "framer-motion";
import { MotionDiv, MotionButton, MotionSpan, MotionImg } from "@/components/ui/MotionComponents";
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { UnsplashImage } from "@/types";

interface ImageViewerProps {
  image: UnsplashImage | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ImageViewer({ image, isOpen, onClose }: ImageViewerProps) {
  const [scale, setScale] = React.useState(1);

  const handleZoomIn = () => setScale((prev) => Math.min(prev * 1.2, 3));
  const handleZoomOut = () => setScale((prev) => Math.max(prev / 1.2, 0.5));
  const handleReset = () => setScale(1);

  if (!image) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <MotionDiv
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center"
          onClick={onClose}
        >
          <div className="absolute top-4 right-4 z-10 flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleZoomOut();
              }}
              className="p-2 bg-black bg-opacity-50 text-white rounded-lg hover:bg-opacity-70 transition-colors"
            >
              <ZoomOut className="h-5 w-5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleZoomIn();
              }}
              className="p-2 bg-black bg-opacity-50 text-white rounded-lg hover:bg-opacity-70 transition-colors"
            >
              <ZoomIn className="h-5 w-5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleReset();
              }}
              className="p-2 bg-black bg-opacity-50 text-white rounded-lg hover:bg-opacity-70 transition-colors"
            >
              <RotateCcw className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-black bg-opacity-50 text-white rounded-lg hover:bg-opacity-70 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <MotionDiv
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.8 }}
            className="max-w-[90vw] max-h-[90vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <MotionImg
              src={image.urls.regular}
              alt={image.alt_description || "Image viewer"}
              className="max-w-full max-h-full object-contain"
              style={{ scale }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          </MotionDiv>

          <div className="absolute bottom-4 left-4 text-white text-sm bg-black bg-opacity-50 rounded-lg p-3">
            <p className="font-medium">{image.user.name}</p>
            {image.description && (
              <p className="text-gray-300">{image.description}</p>
            )}
          </div>
        </MotionDiv>
      )}
    </AnimatePresence>
  );
}
