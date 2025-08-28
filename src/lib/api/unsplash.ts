import axios, { AxiosInstance, AxiosError } from 'axios';
import { 
  UnsplashImage, 
  UnsplashSearchResponse, 
  UnsplashSearchParams, 
  ProcessedImage,
  APIError,
  RateLimitInfo,
  CacheEntry
} from '../../types/api';
import { vercelKvCache } from './vercel-kv';

class UnsplashService {
  private client: AxiosInstance;
  private accessKey: string;
  private rateLimitInfo: RateLimitInfo;
  private imageCache = new Map<string, ProcessedImage>();
  private duplicateUrls = new Set<string>();

  constructor() {
    this.accessKey = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY || '';
    
    if (!this.accessKey) {
      throw new Error('NEXT_PUBLIC_UNSPLASH_ACCESS_KEY environment variable is required');
    }

    this.client = axios.create({
      baseURL: 'https://api.unsplash.com',
      timeout: 30000,
      headers: {
        'Accept-Version': 'v1',
        'Authorization': `Client-ID ${this.accessKey}`,
      },
    });

    this.rateLimitInfo = {
      remaining: 1000,
      reset: Date.now() + 3600000,
      limit: 1000,
      isBlocked: false,
    };

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor for rate limiting
    this.client.interceptors.request.use((config) => {
      if (this.rateLimitInfo.isBlocked) {
        throw new APIError({
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded. Please try again later.',
          status: 429,
          retryAfter: Math.ceil((this.rateLimitInfo.reset - Date.now()) / 1000),
        });
      }
      return config;
    });

    // Response interceptor for rate limit tracking
    this.client.interceptors.response.use(
      (response) => {
        this.updateRateLimitInfo(response.headers);
        return response;
      },
      (error: AxiosError) => {
        if (error.response) {
          this.updateRateLimitInfo(error.response.headers);
        }
        throw this.transformError(error);
      }
    );
  }

  private updateRateLimitInfo(headers: any): void {
    if (headers['x-ratelimit-remaining']) {
      this.rateLimitInfo.remaining = parseInt(headers['x-ratelimit-remaining']);
    }
    if (headers['x-ratelimit-limit']) {
      this.rateLimitInfo.limit = parseInt(headers['x-ratelimit-limit']);
    }
    
    this.rateLimitInfo.isBlocked = this.rateLimitInfo.remaining <= 0;
    
    if (this.rateLimitInfo.isBlocked && headers['x-ratelimit-reset']) {
      this.rateLimitInfo.reset = parseInt(headers['x-ratelimit-reset']) * 1000;
    }
  }

  private transformError(error: AxiosError): APIError {
    const status = error.response?.status || 500;
    let message = error.message;
    let code = 'UNKNOWN_ERROR';

    switch (status) {
      case 400:
        code = 'BAD_REQUEST';
        message = 'Invalid search parameters provided';
        break;
      case 401:
        code = 'UNAUTHORIZED';
        message = 'Invalid or missing API key';
        break;
      case 403:
        code = 'FORBIDDEN';
        message = 'Access forbidden. Check API key permissions';
        break;
      case 404:
        code = 'NOT_FOUND';
        message = 'Resource not found';
        break;
      case 429:
        code = 'RATE_LIMIT_EXCEEDED';
        message = 'Rate limit exceeded';
        break;
      case 500:
        code = 'SERVER_ERROR';
        message = 'Unsplash server error';
        break;
      default:
        message = `HTTP ${status}: ${error.message}`;
    }

    return new APIError({
      code,
      message,
      status,
      details: error.response?.data,
    });
  }

  /**
   * Canonicalizes image URLs by removing query parameters and normalizing format
   */
  private canonicalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Remove all query parameters except essential ones
      const allowedParams = ['ixid', 'ixlib'];
      const newUrl = new URL(urlObj.origin + urlObj.pathname);
      
      allowedParams.forEach(param => {
        const value = urlObj.searchParams.get(param);
        if (value) {
          newUrl.searchParams.set(param, value);
        }
      });
      
      return newUrl.toString();
    } catch {
      return url;
    }
  }

  /**
   * Checks if an image is a duplicate based on canonical URL
   */
  private checkDuplicate(image: UnsplashImage): { isDuplicate: boolean; duplicateOf?: string } {
    const canonicalUrl = this.canonicalizeUrl(image.urls.regular);
    
    if (this.duplicateUrls.has(canonicalUrl)) {
      return { isDuplicate: true, duplicateOf: canonicalUrl };
    }
    
    this.duplicateUrls.add(canonicalUrl);
    return { isDuplicate: false };
  }

  /**
   * Processes raw images from Unsplash API
   */
  private processImages(images: UnsplashImage[]): ProcessedImage[] {
    return images.map(image => {
      const canonicalUrl = this.canonicalizeUrl(image.urls.regular);
      const duplicateCheck = this.checkDuplicate(image);
      
      return {
        ...image,
        canonicalUrl,
        ...duplicateCheck,
      };
    }).filter(image => !image.isDuplicate); // Remove duplicates
  }

  /**
   * Generates cache key for search parameters
   */
  private generateCacheKey(params: UnsplashSearchParams): string {
    const sortedParams = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
    return `unsplash:search:${Buffer.from(sortedParams).toString('base64')}`;
  }

  /**
   * Searches for images on Unsplash with caching and duplicate prevention
   */
  async searchImages(params: UnsplashSearchParams): Promise<{
    images: ProcessedImage[];
    total: number;
    totalPages: number;
    currentPage: number;
    hasNextPage: boolean;
  }> {
    const cacheKey = this.generateCacheKey(params);
    
    try {
      // Check cache first
      const cached = await vercelKvCache.get<UnsplashSearchResponse>(cacheKey);
      if (cached) {
        const processedImages = this.processImages(cached.results);
        return {
          images: processedImages,
          total: cached.total,
          totalPages: cached.total_pages,
          currentPage: params.page || 1,
          hasNextPage: (params.page || 1) < cached.total_pages,
        };
      }

      // Make API request
      const response = await this.client.get<UnsplashSearchResponse>('/search/photos', {
        params: {
          query: params.query,
          page: params.page || 1,
          per_page: Math.min(params.per_page || 30, 30), // Limit to 30 per page
          order_by: params.order_by || 'relevant',
          collections: params.collections,
          content_filter: params.content_filter || 'low',
          color: params.color,
          orientation: params.orientation,
        },
      });

      const data = response.data;

      // Cache the response for 10 minutes
      await vercelKvCache.set(cacheKey, data, 600);

      const processedImages = this.processImages(data.results);

      return {
        images: processedImages,
        total: data.total,
        totalPages: data.total_pages,
        currentPage: params.page || 1,
        hasNextPage: (params.page || 1) < data.total_pages,
      };

    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw this.transformError(error as AxiosError);
    }
  }

  /**
   * Gets a single image by ID
   */
  async getImage(id: string): Promise<ProcessedImage> {
    const cacheKey = `unsplash:image:${id}`;
    
    try {
      // Check cache first
      const cached = await vercelKvCache.get<UnsplashImage>(cacheKey);
      if (cached) {
        const [processedImage] = this.processImages([cached]);
        return processedImage;
      }

      const response = await this.client.get<UnsplashImage>(`/photos/${id}`);
      const image = response.data;

      // Cache for 1 hour
      await vercelKvCache.set(cacheKey, image, 3600);

      const [processedImage] = this.processImages([image]);
      return processedImage;

    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw this.transformError(error as AxiosError);
    }
  }

  /**
   * Downloads an image and triggers download analytics
   */
  async downloadImage(id: string): Promise<string> {
    try {
      const response = await this.client.get(`/photos/${id}/download`);
      return response.data.url;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw this.transformError(error as AxiosError);
    }
  }

  /**
   * Gets current rate limit information
   */
  getRateLimitInfo(): RateLimitInfo {
    return { ...this.rateLimitInfo };
  }

  /**
   * Clears duplicate tracking cache
   */
  clearDuplicateCache(): void {
    this.duplicateUrls.clear();
    this.imageCache.clear();
  }

  /**
   * Gets popular images with caching
   */
  async getPopularImages(page = 1, perPage = 30): Promise<{
    images: ProcessedImage[];
    currentPage: number;
    hasNextPage: boolean;
  }> {
    const cacheKey = `unsplash:popular:${page}:${perPage}`;
    
    try {
      // Check cache first
      const cached = await vercelKvCache.get<UnsplashImage[]>(cacheKey);
      if (cached) {
        const processedImages = this.processImages(cached);
        return {
          images: processedImages,
          currentPage: page,
          hasNextPage: processedImages.length === perPage,
        };
      }

      const response = await this.client.get<UnsplashImage[]>('/photos', {
        params: {
          page,
          per_page: Math.min(perPage, 30),
          order_by: 'popular',
        },
      });

      const images = response.data;

      // Cache for 30 minutes
      await vercelKvCache.set(cacheKey, images, 1800);

      const processedImages = this.processImages(images);

      return {
        images: processedImages,
        currentPage: page,
        hasNextPage: images.length === perPage,
      };

    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw this.transformError(error as AxiosError);
    }
  }
}

// Custom Error class
class APIError extends Error {
  code: string;
  status: number;
  details?: any;
  retryAfter?: number;

  constructor({ code, message, status, details, retryAfter }: {
    code: string;
    message: string;
    status: number;
    details?: any;
    retryAfter?: number;
  }) {
    super(message);
    this.name = 'APIError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.retryAfter = retryAfter;
  }
}

// Export singleton instance
export const unsplashService = new UnsplashService();
export { APIError };