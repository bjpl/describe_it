import { logger } from '@/lib/logger';
import { safeStringify } from '@/lib/utils/json-safe';

/**
 * Image Tracker - Prevents duplicate image usage
 * Tracks used images with timestamps and provides filtering functionality
 */

export interface TrackedImage {
  id: string;
  url: string;
  usedAt: number;
  searchQuery?: string;
  metadata?: {
    alt_description?: string;
    description?: string;
    photographer?: string;
  };
}

export interface ImageTrackerOptions {
  maxEntries?: number;
  expireAfterDays?: number;
}

const STORAGE_KEY = "describe_it_used_images";
const DEFAULT_MAX_ENTRIES = 1000;
const DEFAULT_EXPIRE_DAYS = 30;

class ImageTracker {
  private maxEntries: number;
  private expireAfterMs: number;

  constructor(options: ImageTrackerOptions = {}) {
    this.maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES;
    this.expireAfterMs =
      (options.expireAfterDays ?? DEFAULT_EXPIRE_DAYS) * 24 * 60 * 60 * 1000;
  }

  /**
   * Get all tracked images from localStorage
   */
  private getTrackedImages(): Map<string, TrackedImage> {
    // Check if we're on the client side
    if (typeof window === "undefined" || !window.localStorage) {
      return new Map();
    }

    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return new Map();

      const parsed = JSON.parse(data);
      const imageMap = new Map<string, TrackedImage>();

      // Convert array back to Map and filter expired entries
      const now = Date.now();
      for (const item of parsed) {
        if (item && item.id && typeof item.usedAt === "number") {
          // Check if entry has expired
          if (now - item.usedAt < this.expireAfterMs) {
            imageMap.set(item.id, item);
          }
        }
      }

      return imageMap;
    } catch (error) {
      logger.warn("Failed to load tracked images:", { error: error as Error });
      return new Map();
    }
  }

  /**
   * Save tracked images to localStorage
   */
  private saveTrackedImages(imageMap: Map<string, TrackedImage>): void {
    // Check if we're on the client side
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }

    try {
      // Convert Map to array for storage, keeping only the most recent entries
      const imageArray = Array.from(imageMap.values())
        .sort((a, b) => b.usedAt - a.usedAt)
        .slice(0, this.maxEntries);

      localStorage.setItem(STORAGE_KEY, safeStringify(imageArray));
    } catch (error) {
      logger.error("Failed to save tracked images:", error as Error);
      // If storage is full, try to clear old entries and retry
      this.clearExpiredImages();
      try {
        const imageArray = Array.from(imageMap.values())
          .sort((a, b) => b.usedAt - a.usedAt)
          .slice(0, Math.floor(this.maxEntries / 2)); // Reduce to half capacity
        if (typeof window !== "undefined" && window.localStorage) {
          localStorage.setItem(STORAGE_KEY, safeStringify(imageArray));
        }
      } catch (retryError) {
        logger.error(
          "Failed to save tracked images after cleanup:",
          retryError as Error,
        );
      }
    }
  }

  /**
   * Check if an image has been used before
   */
  isImageUsed(imageId: string): boolean {
    const trackedImages = this.getTrackedImages();
    return trackedImages.has(imageId);
  }

  /**
   * Get information about when an image was used
   */
  getImageUsageInfo(imageId: string): TrackedImage | null {
    const trackedImages = this.getTrackedImages();
    return trackedImages.get(imageId) || null;
  }

  /**
   * Mark an image as used
   */
  markImageAsUsed(
    image: {
      id: string;
      urls?: { regular?: string; small?: string };
      url?: string;
      alt_description?: string;
      description?: string;
      user?: { name?: string };
    },
    searchQuery?: string,
  ): void {
    const trackedImages = this.getTrackedImages();

    const trackedImage: TrackedImage = {
      id: image.id,
      url: image.urls?.regular || image.urls?.small || image.url || "",
      usedAt: Date.now(),
      searchQuery,
      metadata: {
        alt_description: image.alt_description,
        description: image.description,
        photographer: image.user?.name,
      },
    };

    trackedImages.set(image.id, trackedImage);
    this.saveTrackedImages(trackedImages);
  }

  /**
   * Filter out used images from search results
   */
  filterUsedImages<T extends { id: string }>(images: T[]): T[] {
    const trackedImages = this.getTrackedImages();
    return images.filter((image) => !trackedImages.has(image.id));
  }

  /**
   * Filter images and return both used and unused
   */
  categorizeImages<T extends { id: string }>(
    images: T[],
  ): {
    unused: T[];
    used: T[];
    usageInfo: Map<string, TrackedImage>;
  } {
    const trackedImages = this.getTrackedImages();
    const unused: T[] = [];
    const used: T[] = [];

    for (const image of images) {
      if (trackedImages.has(image.id)) {
        used.push(image);
      } else {
        unused.push(image);
      }
    }

    return { unused, used, usageInfo: trackedImages };
  }

  /**
   * Get all used images with metadata
   */
  getAllUsedImages(): TrackedImage[] {
    const trackedImages = this.getTrackedImages();
    return Array.from(trackedImages.values()).sort(
      (a, b) => b.usedAt - a.usedAt,
    );
  }

  /**
   * Get usage statistics
   */
  getUsageStats(): {
    totalUsed: number;
    usedToday: number;
    usedThisWeek: number;
    oldestEntry?: number;
    newestEntry?: number;
  } {
    const trackedImages = this.getTrackedImages();
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const oneWeekMs = 7 * oneDayMs;

    const images = Array.from(trackedImages.values());
    const usedTimes = images.map((img) => img.usedAt);

    return {
      totalUsed: images.length,
      usedToday: images.filter((img) => now - img.usedAt < oneDayMs).length,
      usedThisWeek: images.filter((img) => now - img.usedAt < oneWeekMs).length,
      oldestEntry: usedTimes.length > 0 ? Math.min(...usedTimes) : undefined,
      newestEntry: usedTimes.length > 0 ? Math.max(...usedTimes) : undefined,
    };
  }

  /**
   * Clear expired images from storage
   */
  clearExpiredImages(): number {
    const trackedImages = this.getTrackedImages();
    const originalSize = trackedImages.size;
    this.saveTrackedImages(trackedImages); // This will automatically filter expired entries
    const newTrackedImages = this.getTrackedImages();
    return originalSize - newTrackedImages.size;
  }

  /**
   * Clear all tracked images
   */
  clearAllHistory(): void {
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      logger.error("Failed to clear image history:", error as Error);
    }
  }

  /**
   * Remove a specific image from tracking
   */
  removeImage(imageId: string): boolean {
    const trackedImages = this.getTrackedImages();
    const existed = trackedImages.delete(imageId);
    if (existed) {
      this.saveTrackedImages(trackedImages);
    }
    return existed;
  }

  /**
   * Export usage history (for backup/analysis)
   */
  exportHistory(): TrackedImage[] {
    return this.getAllUsedImages();
  }

  /**
   * Import usage history (for restore from backup)
   */
  importHistory(images: TrackedImage[]): void {
    const trackedImages = new Map<string, TrackedImage>();

    for (const image of images) {
      if (image.id && typeof image.usedAt === "number") {
        trackedImages.set(image.id, image);
      }
    }

    this.saveTrackedImages(trackedImages);
  }
}

// Create singleton instance
export const imageTracker = new ImageTracker();

// Helper functions for easy usage
export const isImageUsed = (imageId: string): boolean =>
  imageTracker.isImageUsed(imageId);

export const markImageAsUsed = (image: any, searchQuery?: string): void =>
  imageTracker.markImageAsUsed(image, searchQuery);

export const filterUsedImages = <T extends { id: string }>(images: T[]): T[] =>
  imageTracker.filterUsedImages(images);

export const categorizeImages = <T extends { id: string }>(images: T[]) =>
  imageTracker.categorizeImages(images);

export const clearImageHistory = (): void => imageTracker.clearAllHistory();

export const getUsageStats = () => imageTracker.getUsageStats();

export const clearExpiredImages = (): number =>
  imageTracker.clearExpiredImages();

export default imageTracker;
