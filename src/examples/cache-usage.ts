/**
 * Cache System Usage Examples
 * Demonstrates all major features of the unified cache system
 */

import { cache, CacheKeys, CachePatterns, cacheManager } from "@/lib/cache";

// ========================================
// EXAMPLE 1: Basic Cache Operations
// ========================================

export async function basicCacheExample() {
  // Simple string key
  await cache.set("simple_key", { data: "value" }, { ttl: 3600 });
  const value = await cache.get("simple_key");
  console.log("Simple cache:", value);

  // Type-safe key
  const imageKey = CacheKeys.image("img_123");
  await cache.set(imageKey, { url: "https://example.com/img.jpg" });
  const image = await cache.get(imageKey);
  console.log("Image cache:", image);

  // Delete
  await cache.delete(imageKey);
}

// ========================================
// EXAMPLE 2: Cache-Aside Pattern
// ========================================

async function fetchUserData(userId: string) {
  // Simulate API call
  return { id: userId, name: "John Doe", email: "john@example.com" };
}

export async function cacheAsideExample(userId: string) {
  const userKey = CacheKeys.user(userId, "profile");

  const userData = await cache.getOrSet(
    userKey,
    async () => {
      console.log("Fetching from API...");
      return await fetchUserData(userId);
    },
    { ttl: 3600 }
  );

  console.log("User data:", userData);
  return userData;
}

// ========================================
// EXAMPLE 3: Request Deduplication
// ========================================

export async function requestDeduplicationExample() {
  async function expensiveOperation() {
    console.log("Executing expensive operation...");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return { result: "computed" };
  }

  // Multiple concurrent calls - only one will execute
  const [result1, result2, result3] = await Promise.all([
    cache.deduplicate("expensive_op", expensiveOperation),
    cache.deduplicate("expensive_op", expensiveOperation),
    cache.deduplicate("expensive_op", expensiveOperation),
  ]);

  console.log("All results are the same:", result1 === result2 && result2 === result3);
}

// ========================================
// EXAMPLE 4: Function Memoization
// ========================================

export async function memoizationExample() {
  async function calculateFibonacci(n: number): Promise<number> {
    if (n <= 1) return n;
    return (await calculateFibonacci(n - 1)) + (await calculateFibonacci(n - 2));
  }

  const memoizedFib = cache.memoize(calculateFibonacci, { ttl: 3600 });

  console.time("First call");
  const result1 = await memoizedFib(10);
  console.timeEnd("First call");

  console.time("Second call (cached)");
  const result2 = await memoizedFib(10);
  console.timeEnd("Second call (cached)");

  console.log("Results:", result1, result2);
}

// ========================================
// EXAMPLE 5: Session Cache
// ========================================

export async function sessionCacheExample(sessionId: string, userId: string) {
  // Create session
  cacheManager.session_ops.create(sessionId, userId);

  // Store session data
  await cache.set("preferences", { theme: "dark", lang: "en" }, { sessionId, ttl: 1800 });

  await cache.set("cart", { items: ["item1", "item2"] }, { sessionId, ttl: 1800 });

  // Retrieve session data
  const prefs = await cache.get("preferences", sessionId);
  const cart = await cache.get("cart", sessionId);

  console.log("Session data:", { prefs, cart });

  // Get all session data
  const allSessionData = await cacheManager.session_ops.getData(sessionId);
  console.log("All session data:", allSessionData);

  // Destroy session
  await cacheManager.session_ops.destroy(sessionId);
}

// ========================================
// EXAMPLE 6: Cache Invalidation
// ========================================

export async function invalidationExample() {
  // Set up some cached data
  await cache.set(CacheKeys.image("img_1"), { url: "img1.jpg" });
  await cache.set(CacheKeys.image("img_2"), { url: "img2.jpg" });
  await cache.set(CacheKeys.description("img_1"), { text: "Description 1" });
  await cache.set(CacheKeys.description("img_2"), { text: "Description 2" });

  // Invalidate all images
  const invalidatedCount = await cache.invalidate(CachePatterns.allImages());
  console.log(`Invalidated ${invalidatedCount} image cache entries`);

  // Invalidate with custom pattern
  await cache.invalidate("desc:*");
  console.log("Invalidated all descriptions");

  // Invalidate by user
  await cache.set(CacheKeys.user("user_1", "profile").withUser(), { name: "User 1" });
  await cache.invalidate(CachePatterns.allByUser("user_1"));
  console.log("Invalidated all user_1 data");
}

// ========================================
// EXAMPLE 7: Cache Warming
// ========================================

export async function cacheWarmingExample() {
  const popularImages = ["img_1", "img_2", "img_3"];

  await cache.warm(
    popularImages.map((imgId) => ({
      key: CacheKeys.image(imgId),
      fetcher: async () => {
        console.log(`Warming cache for ${imgId}`);
        return { id: imgId, url: `https://example.com/${imgId}.jpg` };
      },
    }))
  );

  console.log("Cache warming complete");
}

// ========================================
// EXAMPLE 8: Metrics and Monitoring
// ========================================

export async function metricsExample() {
  // Perform some cache operations
  await cache.set("key1", "value1");
  await cache.get("key1");
  await cache.get("key2"); // Miss
  await cache.set("key2", "value2");
  await cache.get("key2");

  // Get metrics
  const metrics = await cache.metrics();
  console.log("Cache Metrics:", JSON.stringify(metrics, null, 2));

  // Get summary
  const summary = await cache.summary();
  console.log("\n" + summary);

  // Health check
  const health = await cache.health();
  console.log("Health:", health);
}

// ========================================
// EXAMPLE 9: Advanced Key Management
// ========================================

export async function advancedKeyExample() {
  // Complex key with multiple contexts
  const searchKey = CacheKeys.search(
    "cat photos",
    { color: "orange", size: "large" },
    { userId: "user_123", locale: "en-US", version: "v2" }
  )
    .withUser()
    .withLocale()
    .withVersion();

  await cache.set(searchKey, { results: ["img1", "img2", "img3"] }, { ttl: 600 });

  // Retrieve
  const results = await cache.get(searchKey);
  console.log("Search results:", results);

  // Generate pattern for invalidation
  const pattern = searchKey.pattern();
  console.log("Invalidation pattern:", pattern);
}

// ========================================
// EXAMPLE 10: Production Usage Pattern
// ========================================

interface ImageData {
  id: string;
  url: string;
  description?: string;
}

export class ImageService {
  async getImage(imageId: string): Promise<ImageData | null> {
    const cacheKey = CacheKeys.image(imageId);

    return cache.getOrSet(
      cacheKey,
      async () => {
        // Fetch from database or API
        console.log(`Fetching image ${imageId} from database...`);
        return {
          id: imageId,
          url: `https://cdn.example.com/${imageId}.jpg`,
        };
      },
      { ttl: 3600 } // Cache for 1 hour
    );
  }

  async getImageWithDescription(imageId: string): Promise<ImageData | null> {
    // Use deduplication to prevent concurrent requests
    return cache.deduplicate(`image_with_desc_${imageId}`, async () => {
      const [image, description] = await Promise.all([
        this.getImage(imageId),
        this.getDescription(imageId),
      ]);

      if (!image) return null;

      return {
        ...image,
        description: description?.text,
      };
    });
  }

  async getDescription(imageId: string): Promise<{ text: string } | null> {
    const cacheKey = CacheKeys.description(imageId);

    return cache.getOrSet(
      cacheKey,
      async () => {
        console.log(`Generating description for ${imageId}...`);
        return { text: `Description for image ${imageId}` };
      },
      { ttl: 7200 } // Cache for 2 hours
    );
  }

  async invalidateImage(imageId: string): Promise<void> {
    await Promise.all([
      cache.delete(CacheKeys.image(imageId)),
      cache.delete(CacheKeys.description(imageId)),
      cache.invalidate(`*:${imageId}:*`), // Clear all related caches
    ]);
  }

  async warmPopularImages(imageIds: string[]): Promise<void> {
    await cache.warm(
      imageIds.flatMap((id) => [
        {
          key: CacheKeys.image(id),
          fetcher: () => this.getImage(id),
        },
        {
          key: CacheKeys.description(id),
          fetcher: () => this.getDescription(id),
        },
      ])
    );
  }
}

// ========================================
// Run All Examples
// ========================================

export async function runAllExamples() {
  console.log("=== Basic Cache ===");
  await basicCacheExample();

  console.log("\n=== Cache-Aside ===");
  await cacheAsideExample("user_123");

  console.log("\n=== Request Deduplication ===");
  await requestDeduplicationExample();

  console.log("\n=== Memoization ===");
  await memoizationExample();

  console.log("\n=== Session Cache ===");
  await sessionCacheExample("session_123", "user_456");

  console.log("\n=== Invalidation ===");
  await invalidationExample();

  console.log("\n=== Cache Warming ===");
  await cacheWarmingExample();

  console.log("\n=== Metrics ===");
  await metricsExample();

  console.log("\n=== Advanced Keys ===");
  await advancedKeyExample();

  console.log("\n=== Production Service ===");
  const service = new ImageService();
  await service.getImageWithDescription("img_prod_1");
  await service.warmPopularImages(["img_pop_1", "img_pop_2"]);
}
