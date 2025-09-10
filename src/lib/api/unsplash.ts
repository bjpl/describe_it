import axios, { AxiosInstance, AxiosError } from "axios";
import {
  UnsplashImage,
  UnsplashSearchResponse,
  UnsplashSearchParams,
  ProcessedImage,
  APIError as BaseAPIError,
  RateLimitInfo,
  CacheEntry,
} from "../../types/api";

import { vercelKvCache } from "./vercel-kv";
import { apiKeyProvider } from "./keyProvider";

class UnsplashService {
  private client: AxiosInstance | null = null;
  private accessKey: string = '';
  private isDemo: boolean = false;
  private rateLimitInfo: RateLimitInfo = {
    remaining: 50,
    reset: Date.now() + 3600000,
    limit: 50,
    isBlocked: false
  };
  private imageCache = new Map<string, ProcessedImage>();
  private duplicateUrls = new Set<string>();
  private keyUpdateUnsubscribe: (() => void) | null = null;

  constructor() {
    this.initializeWithKeyProvider();
    this.setupKeyUpdateListener();
  }

  /**
   * Initialize service with current key from provider
   */
  private initializeWithKeyProvider(): void {
    try {
      const config = apiKeyProvider.getServiceConfig('unsplash');
      this.accessKey = config.apiKey;

      console.log("[UnsplashService] Initializing with keyProvider:", {
        hasKey: !!this.accessKey,
        accessKeyLength: this.accessKey.length,
        isDemo: config.isDemo,
        source: config.source,
        isValid: config.isValid,
      });

      if (config.isDemo || !config.isValid) {
        console.warn("Unsplash API key not configured or invalid. Using demo mode.");
        this.accessKey = "demo";
        this.isDemo = true;
        this.client = null;
        this.initializeDemoMode();
        return;
      }

      this.isDemo = false;
      this.initializeClient();
    } catch (error) {
      console.warn("[UnsplashService] KeyProvider failed, falling back to demo mode:", error);
      this.accessKey = "demo";
      this.client = null;
      this.initializeDemoMode();
    }
  }

  /**
   * Temporarily use a specific API key for a request
   */
  public useTemporaryKey(apiKey: string): void {
    if (apiKey && apiKey.trim()) {
      this.accessKey = apiKey.trim();
      this.isDemo = false; // Explicitly set to non-demo mode
      this.isDemo = false;
      this.initializeClient();
      console.log("[UnsplashService] Using temporary API key, demo mode:", this.isDemo);
    }
  }

  /**
   * Initialize HTTP client with current key
   */
  private initializeClient(): void {
    if (!this.accessKey || this.accessKey === "demo") {
      this.client = null;
      return;
    }

    this.client = axios.create({
      baseURL: "https://api.unsplash.com",
      timeout: 5000, // 5 second timeout for real API calls
      headers: {
        "Accept-Version": "v1",
        Authorization: `Client-ID ${this.accessKey}`,
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

  /**
   * Setup listener for key updates from keyProvider
   */
  private setupKeyUpdateListener(): void {
    try {
      this.keyUpdateUnsubscribe = apiKeyProvider.addListener((keys) => {
        const newKey = keys.unsplash;
        
        if (newKey !== this.accessKey) {
          console.log("[UnsplashService] Key updated, reinitializing service");
          this.accessKey = newKey;
          
          // Clear any existing client
          this.client = null;
          
          // Reinitialize with new key
          try {
            const config = apiKeyProvider.getServiceConfig('unsplash');
            if (config.isDemo || !config.isValid) {
              this.accessKey = "demo";
              this.initializeDemoMode();
            } else {
              this.isDemo = false;
      this.initializeClient();
            }
          } catch (error) {
            console.warn("[UnsplashService] Failed to reinitialize after key update:", error);
            this.accessKey = "demo";
            this.initializeDemoMode();
          }
        }
      });
    } catch (error) {
      console.warn("[UnsplashService] Failed to setup key update listener:", error);
    }
  }

  /**
   * Cleanup method for service destruction
   */
  public destroy(): void {
    if (this.keyUpdateUnsubscribe) {
      this.keyUpdateUnsubscribe();
      this.keyUpdateUnsubscribe = null;
    }
  }

  private setupInterceptors(): void {
    if (!this.client) return;
    
    // Request interceptor for rate limiting
    this.client.interceptors.request.use((config) => {
      if (this.rateLimitInfo.isBlocked) {
        throw new APIError({
          code: "RATE_LIMIT_EXCEEDED",
          message: "Rate limit exceeded. Please try again later.",
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
      },
    );
  }

  private updateRateLimitInfo(headers: any): void {
    if (headers["x-ratelimit-remaining"]) {
      this.rateLimitInfo.remaining = parseInt(headers["x-ratelimit-remaining"]);
    }
    if (headers["x-ratelimit-limit"]) {
      this.rateLimitInfo.limit = parseInt(headers["x-ratelimit-limit"]);
    }

    this.rateLimitInfo.isBlocked = this.rateLimitInfo.remaining <= 0;

    if (this.rateLimitInfo.isBlocked && headers["x-ratelimit-reset"]) {
      this.rateLimitInfo.reset = parseInt(headers["x-ratelimit-reset"]) * 1000;
    }
  }

  private transformError(error: AxiosError): APIError {
    const status = error.response?.status || 500;
    let message = error.message;
    let code = "UNKNOWN_ERROR";

    switch (status) {
      case 400:
        code = "BAD_REQUEST";
        message = "Invalid search parameters provided";
        break;
      case 401:
        code = "UNAUTHORIZED";
        message = "Invalid or missing API key";
        break;
      case 403:
        code = "FORBIDDEN";
        message = "Access forbidden. Check API key permissions";
        break;
      case 404:
        code = "NOT_FOUND";
        message = "Resource not found";
        break;
      case 429:
        code = "RATE_LIMIT_EXCEEDED";
        message = "Rate limit exceeded";
        break;
      case 500:
        code = "SERVER_ERROR";
        message = "Unsplash server error";
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
      const allowedParams = ["ixid", "ixlib"];
      const newUrl = new URL(urlObj.origin + urlObj.pathname);

      allowedParams.forEach((param) => {
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
  private checkDuplicate(image: UnsplashImage): {
    isDuplicate: boolean;
    duplicateOf?: string;
  } {
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
    return images
      .map((image) => {
        const canonicalUrl = this.canonicalizeUrl(image.urls.regular);
        const duplicateCheck = this.checkDuplicate(image);

        return {
          ...image,
          canonicalUrl,
          ...duplicateCheck,
        };
      })
      .filter((image) => !image.isDuplicate); // Remove duplicates
  }

  /**
   * Initialize demo mode with sample data
   */
  private initializeDemoMode(): void {
    // Demo mode initialized - will use generateDemoImages method
  }

  /**
   * Generate demo images when API key is not available
   */
  private generateDemoImages(params: UnsplashSearchParams): {
    images: ProcessedImage[];
    total: number;
    totalPages: number;
    currentPage: number;
    hasNextPage: boolean;
  } {
    const demoImages: ProcessedImage[] = [
      {
        id: "demo-1",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        width: 1920,
        height: 1080,
        color: "#4a90e2",
        blur_hash: "LEHV6nWB2yk8pyo0adR*.7kCMdnj",
        description: `Demo image for "${params.query}"`,
        alt_description: `A beautiful scene related to ${params.query}`,
        urls: {
          raw: `https://picsum.photos/1920/1080?random=1&${encodeURIComponent(params.query)}`,
          full: `https://picsum.photos/1920/1080?random=1&${encodeURIComponent(params.query)}`,
          regular: `https://picsum.photos/1080/720?random=1&${encodeURIComponent(params.query)}`,
          small: `https://picsum.photos/400/300?random=1&${encodeURIComponent(params.query)}`,
          thumb: `https://picsum.photos/200/150?random=1&${encodeURIComponent(params.query)}`,
          small_s3: `https://picsum.photos/400/300?random=1&${encodeURIComponent(params.query)}`,
        },
        links: {
          self: `https://api.unsplash.com/photos/demo-1`,
          html: `https://unsplash.com/photos/demo-1`,
          download: `https://picsum.photos/1920/1080?random=1&${encodeURIComponent(params.query)}`,
          download_location: `https://api.unsplash.com/photos/demo-1/download`,
        },
        user: {
          id: "demo-user",
          username: "demo_user",
          name: "Demo User",
          first_name: "Demo",
          last_name: "User",
          instagram_username: null,
          twitter_username: null,
          portfolio_url: null,
          bio: "Demo user for testing purposes",
          location: "Demo Land",
          total_likes: 100,
          total_photos: 50,
          accepted_tos: true,
          profile_image: {
            small: "https://picsum.photos/32/32?random=user",
            medium: "https://picsum.photos/64/64?random=user",
            large: "https://picsum.photos/128/128?random=user",
          },
          links: {
            self: "https://api.unsplash.com/users/demo_user",
            html: "https://unsplash.com/@demo_user",
            photos: "https://api.unsplash.com/users/demo_user/photos",
            likes: "https://api.unsplash.com/users/demo_user/likes",
            portfolio: "https://unsplash.com/@demo_user/portfolio",
          },
        },
        canonicalUrl: `https://picsum.photos/1080/720?random=1&${encodeURIComponent(params.query)}`,
        isDuplicate: false,
      },
      {
        id: "demo-2",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        width: 1920,
        height: 1080,
        color: "#e74c3c",
        blur_hash: "LEHV6nWB2yk8pyo0adR*.7kCMdnj",
        description: `Another demo image for "${params.query}"`,
        alt_description: `Another beautiful scene related to ${params.query}`,
        urls: {
          raw: `https://picsum.photos/1920/1080?random=2&${encodeURIComponent(params.query)}`,
          full: `https://picsum.photos/1920/1080?random=2&${encodeURIComponent(params.query)}`,
          regular: `https://picsum.photos/1080/720?random=2&${encodeURIComponent(params.query)}`,
          small: `https://picsum.photos/400/300?random=2&${encodeURIComponent(params.query)}`,
          thumb: `https://picsum.photos/200/150?random=2&${encodeURIComponent(params.query)}`,
          small_s3: `https://picsum.photos/400/300?random=2&${encodeURIComponent(params.query)}`,
        },
        links: {
          self: `https://api.unsplash.com/photos/demo-2`,
          html: `https://unsplash.com/photos/demo-2`,
          download: `https://picsum.photos/1920/1080?random=2&${encodeURIComponent(params.query)}`,
          download_location: `https://api.unsplash.com/photos/demo-2/download`,
        },
        user: {
          id: "demo-user-2",
          username: "demo_user_2",
          name: "Demo User 2",
          first_name: "Demo",
          last_name: "User 2",
          instagram_username: null,
          twitter_username: null,
          portfolio_url: null,
          bio: "Another demo user for testing purposes",
          location: "Demo City",
          total_likes: 200,
          total_photos: 75,
          accepted_tos: true,
          profile_image: {
            small: "https://picsum.photos/32/32?random=user2",
            medium: "https://picsum.photos/64/64?random=user2",
            large: "https://picsum.photos/128/128?random=user2",
          },
          links: {
            self: "https://api.unsplash.com/users/demo_user_2",
            html: "https://unsplash.com/@demo_user_2",
            photos: "https://api.unsplash.com/users/demo_user_2/photos",
            likes: "https://api.unsplash.com/users/demo_user_2/likes",
            portfolio: "https://unsplash.com/@demo_user_2/portfolio",
          },
        },
        canonicalUrl: `https://picsum.photos/1080/720?random=2&${encodeURIComponent(params.query)}`,
        isDuplicate: false,
      },
    ];

    const page = params.page || 1;
    const perPage = params.per_page || 20;
    const total = 50; // Demo total
    const totalPages = Math.ceil(total / perPage);

    return {
      images: demoImages.slice(0, Math.min(perPage, demoImages.length)),
      total,
      totalPages,
      currentPage: page,
      hasNextPage: page < totalPages,
    };
  }

  /**
   * Generates cache key for search parameters
   */
  private generateCacheKey(params: UnsplashSearchParams): string {
    const sortedParams = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join("&");
    return `unsplash:search:${Buffer.from(sortedParams).toString("base64")}`;
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
    console.log("[UnsplashService] searchImages called with:", {
      query: params.query,
      page: params.page,
      isDemo: this.isDemo,
      accessKey: this.accessKey?.substring(0, 10) + '...',
      hasClient: !!this.client
    });

    // Return demo data if no API key or explicitly in demo mode
    if (this.accessKey === "demo" || this.isDemo) {
      console.log("[UnsplashService] Using demo mode - generating demo images");
      return this.generateDemoImages(params);
    }

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

      // Make API request with aggressive timeout for Vercel
      if (!this.client) {
        return this.generateDemoImages(params);
      }
      
      // Create a timeout wrapper for Vercel serverless
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.warn('[UnsplashService] Request timeout - falling back to demo mode');
      }, 4000); // 4 second limit for real API calls
      
      try {
        const response = await this.client.get<UnsplashSearchResponse>(
          "/search/photos",
          {
            params: {
              query: params.query,
              page: params.page || 1,
              per_page: Math.min(params.per_page || 10, 10), // Reduce to 10 for faster response
              order_by: params.order_by || "relevant",
              collections: params.collections,
              content_filter: params.content_filter || "low",
              color: params.color,
              orientation: params.orientation,
            },
            signal: controller.signal as any,
          },
        );
        
        clearTimeout(timeoutId);

        const data = response.data;

        // Cache the response for 30 minutes (increased for better performance)
        await vercelKvCache.set(cacheKey, data, 1800).catch(err => 
          console.warn('[UnsplashService] Cache write failed:', err)
        );

        const processedImages = this.processImages(data.results);

        return {
          images: processedImages,
          total: data.total,
          totalPages: data.total_pages,
          currentPage: params.page || 1,
          hasNextPage: (params.page || 1) < data.total_pages,
        };
      } catch (timeoutError) {
        clearTimeout(timeoutId);
        if (timeoutError.name === 'CanceledError' || timeoutError.code === 'ECONNABORTED') {
          console.warn('[UnsplashService] Request timed out, using demo mode');
          return this.generateDemoImages(params);
        }
        throw timeoutError;
      }
    } catch (error) {
      // Always fallback to demo data on any error for reliability
      console.warn("[UnsplashService] API error, falling back to demo mode:", {
        error: error.message || error,
        code: error.code,
        status: error.response?.status
      });
      return this.generateDemoImages(params);
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

      if (!this.client) {
        throw new APIError({
          code: "CLIENT_NOT_INITIALIZED",
          message: "Unsplash client not initialized",
          status: 500,
        });
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
      if (!this.client) {
        throw new APIError({
          code: "CLIENT_NOT_INITIALIZED",
          message: "Unsplash client not initialized",
          status: 500,
        });
      }
      
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
  async getPopularImages(
    page = 1,
    perPage = 30,
  ): Promise<{
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

      if (!this.client) {
        // Return demo data for popular images when client not available
        const demoResult = this.generateDemoImages({ query: "popular", page, per_page: perPage });
        return {
          images: demoResult.images,
          currentPage: page,
          hasNextPage: demoResult.hasNextPage,
        };
      }
      
      const response = await this.client.get<UnsplashImage[]>("/photos", {
        params: {
          page,
          per_page: Math.min(perPage, 30),
          order_by: "popular",
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

  constructor({
    code,
    message,
    status,
    details,
    retryAfter,
  }: {
    code: string;
    message: string;
    status: number;
    details?: any;
    retryAfter?: number;
  }) {
    super(message);
    this.name = "APIError";
    this.code = code;
    this.status = status;
    this.details = details;
    this.retryAfter = retryAfter;
  }
}

// Export singleton instance
export const unsplashService = new UnsplashService();
