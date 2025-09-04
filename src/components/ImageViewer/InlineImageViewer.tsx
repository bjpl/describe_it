"use client";

import React from "react";
import { motion } from "framer-motion";
import { Image as ImageIcon, Loader2 } from "lucide-react";
import { UnsplashImage } from "@/types";

interface InlineImageViewerProps {
  image: UnsplashImage;
  onGenerateDescriptions?: () => void;
  isGenerating?: boolean;
  className?: string;
}

export function InlineImageViewer({
  image,
  onGenerateDescriptions,
  isGenerating = false,
  className = "",
}: InlineImageViewerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`space-y-4 ${className}`}
    >
      {/* Image Display */}
      <div className="relative w-full h-64 rounded-lg overflow-hidden mb-4">
        <img
          src={image.urls?.regular || image.urls.small}
          alt={image.alt_description || "Selected image"}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      {/* Image Info */}
      <div className="space-y-2">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {image.description ||
            image.alt_description ||
            "No description available"}
        </p>

        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Photo by {image.user.name}</span>
          <span>
            {image.width} × {image.height}
          </span>
        </div>
      </div>

      {/* Generate Button */}
      {onGenerateDescriptions && (
        <motion.button
          onClick={onGenerateDescriptions}
          disabled={isGenerating}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
          whileHover={{ scale: isGenerating ? 1 : 1.02 }}
          whileTap={{ scale: isGenerating ? 1 : 0.98 }}
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImageIcon className="h-4 w-4" />
          )}
          {isGenerating ? "Generating..." : "Generate Descriptions"}
        </motion.button>
      )}
    </motion.div>
  );
}
