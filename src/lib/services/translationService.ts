import { withRetry, RetryConfig } from "@/lib/utils/error-retry";
import { openAIService } from "./openaiService";

interface CachedTranslation {
  translation: string;
  confidence: number;
  timestamp: number;
  ttl: number;
}

interface TranslationRequest {
  text: string;
  fromLanguage: string;
  toLanguage: string;
  context?: string;
}

interface TranslationResponse {
  translation: string;
  confidence: number;
  detectedLanguage: string;
  cached: boolean;
  provider: "openai" | "fallback";
}

interface BatchTranslationRequest {
  items: TranslationRequest[];
  priority?: "low" | "normal" | "high";
}

interface BatchTranslationResponse {
  results: (TranslationResponse | { error: string; originalText: string })[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    cached: number;
  };
}

/**
 * Translation Service with caching, batch processing, and fallback support
 */
export class TranslationService {
  private cache = new Map<string, CachedTranslation>();
  private readonly maxCacheSize = 5000;
  private readonly defaultTTL = 604800000; // 7 days
  private rateLimitTracker = new Map<string, number[]>();
  private readonly supportedLanguages = [
    "en",
    "es",
    "fr",
    "de",
    "it",
    "pt",
    "ru",
    "ja",
    "ko",
    "zh",
  ];

  private retryConfig: RetryConfig = {
    maxRetries: 2,
    baseDelay: 1500,
    maxDelay: 8000,
    backoffFactor: 2,
    shouldRetry: (error: Error) => {
      const message = error.message.toLowerCase();
      return (
        message.includes("503") ||
        message.includes("502") ||
        message.includes("429") ||
        message.includes("timeout")
      );
    },
  };

  /**
   * Translate single text
   */
  public async translate(
    request: TranslationRequest,
  ): Promise<TranslationResponse> {
    // Validate input
    this.validateTranslationRequest(request);

    // Generate cache key
    const cacheKey = this.generateCacheKey(request);

    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return {
        translation: cached.translation,
        confidence: cached.confidence,
        detectedLanguage: request.fromLanguage,
        cached: true,
        provider: "openai",
      };
    }

    // Same language check
    if (request.fromLanguage === request.toLanguage) {
      const response = {
        translation: request.text,
        confidence: 1.0,
        detectedLanguage: request.fromLanguage,
        cached: false,
        provider: "fallback" as const,
      };
      this.setCache(cacheKey, {
        translation: response.translation,
        confidence: response.confidence,
        timestamp: Date.now(),
        ttl: this.defaultTTL,
      });
      return response;
    }

    // Try OpenAI translation first
    if (openAIService.isAvailable()) {
      try {
        const translation = await this.translateWithOpenAI(request);
        const response = {
          translation,
          confidence: 0.95,
          detectedLanguage: request.fromLanguage,
          cached: false,
          provider: "openai" as const,
        };

        this.setCache(cacheKey, {
          translation: response.translation,
          confidence: response.confidence,
          timestamp: Date.now(),
          ttl: this.defaultTTL,
        });

        return response;
      } catch (error) {
        console.warn("OpenAI translation failed, using fallback:", error);
      }
    }

    // Fallback to dictionary/pattern-based translation
    const fallbackTranslation = await this.getFallbackTranslation(request);
    const response = {
      translation: fallbackTranslation,
      confidence: 0.7,
      detectedLanguage: request.fromLanguage,
      cached: false,
      provider: "fallback" as const,
    };

    this.setCache(cacheKey, {
      translation: response.translation,
      confidence: response.confidence,
      timestamp: Date.now(),
      ttl: this.defaultTTL,
    });

    return response;
  }

  /**
   * Batch translate multiple texts
   */
  public async translateBatch(
    request: BatchTranslationRequest,
  ): Promise<BatchTranslationResponse> {
    const results: (
      | TranslationResponse
      | { error: string; originalText: string }
    )[] = [];
    const summary = {
      total: request.items.length,
      successful: 0,
      failed: 0,
      cached: 0,
    };

    // Process in chunks to avoid rate limits
    const chunkSize =
      request.priority === "high" ? 10 : request.priority === "low" ? 3 : 5;
    const chunks = this.chunkArray(request.items, chunkSize);

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (item, index) => {
        try {
          const result = await this.translate(item);
          if (result.cached) summary.cached++;
          summary.successful++;
          return result;
        } catch (error) {
          summary.failed++;
          return {
            error:
              error instanceof Error ? error.message : "Translation failed",
            originalText: item.text,
          };
        }
      });

      const chunkResults = await Promise.allSettled(chunkPromises);

      chunkResults.forEach((result) => {
        if (result.status === "fulfilled") {
          results.push(result.value);
        } else {
          summary.failed++;
          results.push({
            error: result.reason?.message || "Unknown error",
            originalText: "Unknown",
          });
        }
      });

      // Add delay between chunks to respect rate limits
      if (chunks.indexOf(chunk) < chunks.length - 1) {
        await this.delay(request.priority === "high" ? 500 : 1000);
      }
    }

    return { results, summary };
  }

  /**
   * Detect language of text
   */
  public async detectLanguage(
    text: string,
  ): Promise<{ language: string; confidence: number }> {
    if (openAIService.isAvailable()) {
      try {
        const result = await withRetry(async () => {
          return await openAIService.translateText({
            text: `Detect the language of this text and respond with just the language code (en, es, fr, etc.): "${text.slice(0, 200)}"`,
            fromLanguage: "auto",
            toLanguage: "en",
          });
        }, this.retryConfig);

        const detected = result.toLowerCase().trim();
        if (this.supportedLanguages.includes(detected)) {
          return { language: detected, confidence: 0.9 };
        }
      } catch (error) {
        console.warn("Language detection failed:", error);
      }
    }

    // Fallback to basic pattern matching
    return this.detectLanguageFallback(text);
  }

  /**
   * Get supported languages
   */
  public getSupportedLanguages(): {
    code: string;
    name: string;
    native: string;
  }[] {
    const languages = [
      { code: "en", name: "English", native: "English" },
      { code: "es", name: "Spanish", native: "Español" },
      { code: "fr", name: "French", native: "Français" },
      { code: "de", name: "German", native: "Deutsch" },
      { code: "it", name: "Italian", native: "Italiano" },
      { code: "pt", name: "Portuguese", native: "Português" },
      { code: "ru", name: "Russian", native: "Русский" },
      { code: "ja", name: "Japanese", native: "日本語" },
      { code: "ko", name: "Korean", native: "한국어" },
      { code: "zh", name: "Chinese", native: "中文" },
    ];

    return languages;
  }

  /**
   * Validate translation quality
   */
  public async validateTranslation(
    original: string,
    translation: string,
    expectedLanguage: string,
  ): Promise<{
    isValid: boolean;
    confidence: number;
    issues: string[];
  }> {
    const issues: string[] = [];
    let confidence = 1.0;

    // Basic validation checks
    if (!translation || translation.trim().length === 0) {
      issues.push("Translation is empty");
      confidence = 0;
    }

    if (translation === original) {
      issues.push("Translation identical to original");
      confidence *= 0.3;
    }

    if (translation.includes("[translation not available]")) {
      issues.push("Translation service unavailable");
      confidence *= 0.1;
    }

    // Length ratio check (translations shouldn't be extremely different in length)
    const lengthRatio = translation.length / original.length;
    if (lengthRatio > 3 || lengthRatio < 0.3) {
      issues.push("Unusual length ratio between original and translation");
      confidence *= 0.7;
    }

    // Character encoding check
    if (translation.includes("�") || translation.includes("???")) {
      issues.push("Character encoding issues detected");
      confidence *= 0.5;
    }

    return {
      isValid: issues.length === 0 || confidence > 0.5,
      confidence,
      issues,
    };
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  public getCacheStats() {
    let expired = 0;
    const now = Date.now();

    this.cache.forEach((value) => {
      if (now > value.timestamp + value.ttl) {
        expired++;
      }
    });

    return {
      total: this.cache.size,
      expired,
      active: this.cache.size - expired,
      maxSize: this.maxCacheSize,
      usage: (this.cache.size / this.maxCacheSize) * 100,
    };
  }

  /**
   * Clean expired cache entries
   */
  public cleanExpiredCache(): number {
    const now = Date.now();
    let removed = 0;

    this.cache.forEach((value, key) => {
      if (now > value.timestamp + value.ttl) {
        this.cache.delete(key);
        removed++;
      }
    });

    return removed;
  }

  // Private helper methods
  private validateTranslationRequest(request: TranslationRequest): void {
    if (!request.text || request.text.trim().length === 0) {
      throw new Error("Text is required for translation");
    }

    if (!request.fromLanguage || !request.toLanguage) {
      throw new Error("Source and target languages are required");
    }

    if (!this.supportedLanguages.includes(request.fromLanguage)) {
      throw new Error(`Unsupported source language: ${request.fromLanguage}`);
    }

    if (!this.supportedLanguages.includes(request.toLanguage)) {
      throw new Error(`Unsupported target language: ${request.toLanguage}`);
    }

    if (request.text.length > 5000) {
      throw new Error("Text too long for translation (max 5000 characters)");
    }
  }

  private async translateWithOpenAI(
    request: TranslationRequest,
  ): Promise<string> {
    const result = await withRetry(async () => {
      return await openAIService.translateText({
        text: request.text,
        fromLanguage: request.fromLanguage,
        toLanguage: request.toLanguage,
      });
    }, this.retryConfig);

    return result;
  }

  private async getFallbackTranslation(
    request: TranslationRequest,
  ): Promise<string> {
    // Use the existing dictionary from the API route
    const spanishToEnglishDict: Record<string, string> = {
      // Common nouns
      casa: "house",
      gato: "cat",
      perro: "dog",
      agua: "water",
      libro: "book",
      mesa: "table",
      silla: "chair",
      árbol: "tree",
      flor: "flower",
      sol: "sun",

      // Common verbs
      ser: "to be",
      estar: "to be",
      tener: "to have",
      hacer: "to do/make",
      ir: "to go",
      venir: "to come",
      ver: "to see",
      decir: "to say",

      // Common adjectives
      grande: "big/large",
      pequeño: "small",
      bueno: "good",
      malo: "bad",
      nuevo: "new",
      viejo: "old",
      bonito: "pretty",
      feo: "ugly",

      // Common phrases
      "buenos días": "good morning",
      "buenas tardes": "good afternoon",
      "buenas noches": "good night",
      "por favor": "please",
      gracias: "thank you",
    };

    const englishToSpanishDict: Record<string, string> = {};
    Object.entries(spanishToEnglishDict).forEach(([spanish, english]) => {
      englishToSpanishDict[english] = spanish;
    });

    const text = request.text.toLowerCase().trim();

    // Direct lookup
    if (request.fromLanguage === "es" && request.toLanguage === "en") {
      if (spanishToEnglishDict[text]) {
        return spanishToEnglishDict[text];
      }
    } else if (request.fromLanguage === "en" && request.toLanguage === "es") {
      if (englishToSpanishDict[text]) {
        return englishToSpanishDict[text];
      }
    }

    // Pattern-based transformations for Spanish to English
    if (request.fromLanguage === "es" && request.toLanguage === "en") {
      if (text.endsWith("ción")) return text.replace("ción", "tion");
      if (text.endsWith("dad")) return text.replace("dad", "ty");
      if (text.endsWith("mente")) return text.replace("mente", "ly");
    }

    // If no translation found, return original with note
    return `${request.text} [translation not available]`;
  }

  private detectLanguageFallback(text: string): {
    language: string;
    confidence: number;
  } {
    const patterns = {
      es: [
        /ñ/,
        /¿/,
        /¡/,
        /[áéíóúü]/,
        /\b(el|la|los|las|un|una|de|en|y|es|que)\b/i,
      ],
      en: [/\b(the|and|or|of|to|in|is|that|it|with|for)\b/i],
      fr: [/[àâäéèêëîïôöùûüÿç]/, /\b(le|la|les|un|une|de|en|et|est|que)\b/i],
      de: [/[äöüß]/, /\b(der|die|das|und|oder|von|zu|in|ist|dass)\b/i],
    };

    let bestMatch = { language: "en", confidence: 0.1 };

    Object.entries(patterns).forEach(([lang, langPatterns]) => {
      let matches = 0;
      langPatterns.forEach((pattern) => {
        if (pattern.test(text)) matches++;
      });

      const confidence = matches / langPatterns.length;
      if (confidence > bestMatch.confidence) {
        bestMatch = { language: lang, confidence };
      }
    });

    return bestMatch;
  }

  private generateCacheKey(request: TranslationRequest): string {
    const contextHash = request.context ? this.hashString(request.context) : "";
    return `${this.hashString(request.text)}_${request.fromLanguage}_${request.toLanguage}_${contextHash}`;
  }

  private getFromCache(key: string): CachedTranslation | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.timestamp + cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached;
  }

  private setCache(key: string, value: CachedTranslation): void {
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, value);
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const translationService = new TranslationService();
export default translationService;
