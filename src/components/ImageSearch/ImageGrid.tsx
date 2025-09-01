'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Heart, Download, User, Calendar } from 'lucide-react';
import { UnsplashImage } from '@/types';

interface ImageGridProps {
  images: UnsplashImage[];
  onImageClick: (image: UnsplashImage) => void;
  loading?: boolean;
}

export function ImageGrid({ images, onImageClick, loading = false }: ImageGridProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.8,
      y: 20
    },
    visible: { 
      opacity: 1, 
      scale: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="aspect-square bg-gray-200 rounded-xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {images.map((image) => (
        <motion.div
          key={image.id}
          variants={itemVariants}
          className="group relative aspect-square overflow-hidden rounded-xl cursor-pointer bg-gray-100"
          whileHover={{ 
            scale: 1.02,
            transition: { duration: 0.2 }
          }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onImageClick(image)}
        >
          <img
            src={image.urls.small}
            alt={image.alt_description || image.description || 'Unsplash image'}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            loading="lazy"
          />
          
          {/* Overlay */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300" />
          
          {/* Hover Content */}
          <div className="absolute inset-0 p-3 flex flex-col justify-between opacity-0 group-hover:opacity-100 transition-all duration-300">
            {/* Top Section - Image Info */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-1 bg-black bg-opacity-50 rounded-full px-2 py-1 text-white text-xs">
                <Heart className="h-3 w-3" />
                <span>{image.likes}</span>
              </div>
              
              <div className="flex items-center gap-1 bg-black bg-opacity-50 rounded-full px-2 py-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Handle download - check if browser environment
                    if (typeof window !== 'undefined') {
                      const link = document.createElement('a');
                      link.href = image.urls.regular;
                      link.download = `unsplash-${image.id}.jpg`;
                      link.click();
                    }
                  }}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <Download className="h-3 w-3" />
                </button>
              </div>
            </div>
            
            {/* Bottom Section - User Info */}
            <div className="space-y-2">
              {/* Description */}
              {(image.description || image.alt_description) && (
                <p className="text-white text-xs bg-black bg-opacity-50 rounded-lg px-2 py-1 line-clamp-2">
                  {image.description || image.alt_description}
                </p>
              )}
              
              {/* User Info */}
              <div className="flex items-center gap-2 bg-black bg-opacity-50 rounded-lg px-2 py-1">
                <User className="h-3 w-3 text-white" />
                <span className="text-white text-xs font-medium truncate">
                  {image.user.name}
                </span>
              </div>
            </div>
          </div>
          
          {/* Quick Preview Button */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                onImageClick(image);
              }}
              className="bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-800 px-4 py-2 rounded-full font-medium transition-all duration-200 shadow-lg"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              View Image
            </motion.button>
          </div>
          
          {/* Image Dimensions Indicator */}
          <div className="absolute top-3 left-3 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300">
            {image.width} × {image.height}
          </div>
          
          {/* Creation Date */}
          <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300">
            <Calendar className="h-3 w-3" />
            <span>{new Date(image.created_at).toLocaleDateString()}</span>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}