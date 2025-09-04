import { openAIService } from "./openai";
import { vercelKvCache } from "./vercel-kv";
import { APIError } from "@/types/api";

export interface TranslationRequest {
  text: string;
  fromLanguage: "es" | "en";
  toLanguage: "es" | "en";
  context?: string;
}

export interface TranslationResult {
  originalText: string;
  translatedText: string;
  fromLanguage: string;
  toLanguage: string;
  confidence?: number;
  alternatives?: string[];
}

export interface BatchTranslationRequest {
  texts: string[];
  fromLanguage: "es" | "en";
  toLanguage: "es" | "en";
  context?: string;
}

export interface BatchTranslationResult {
  translations: TranslationResult[];
  failed: Array<{ index: number; error: string; text: string }>;
}

// Common Spanish-English word mappings for fallbacks
const FALLBACK_TRANSLATIONS: Record<string, Record<string, string>> = {
  "es-en": {
    // Common nouns
    casa: "house",
    perro: "dog",
    gato: "cat",
    coche: "car",
    agua: "water",
    comida: "food",
    libro: "book",
    mesa: "table",
    silla: "chair",
    ventana: "window",
    puerta: "door",
    árbol: "tree",
    flor: "flower",
    sol: "sun",
    luna: "moon",
    cielo: "sky",
    mar: "sea",
    playa: "beach",
    montaña: "mountain",
    río: "river",

    // Common verbs
    ser: "to be",
    estar: "to be",
    tener: "to have",
    hacer: "to do/make",
    ir: "to go",
    venir: "to come",
    ver: "to see",
    mirar: "to look",
    comer: "to eat",
    beber: "to drink",
    hablar: "to speak",
    caminar: "to walk",
    correr: "to run",
    escribir: "to write",
    leer: "to read",
    estudiar: "to study",
    trabajar: "to work",
    dormir: "to sleep",
    vivir: "to live",
    amar: "to love",

    // Common adjectives
    grande: "big/large",
    pequeño: "small",
    bueno: "good",
    malo: "bad",
    bonito: "beautiful/pretty",
    feo: "ugly",
    nuevo: "new",
    viejo: "old",
    joven: "young",
    rápido: "fast",
    lento: "slow",
    fácil: "easy",
    difícil: "difficult",
    alto: "tall/high",
    bajo: "short/low",
    feliz: "happy",
    triste: "sad",
    caliente: "hot",
    frío: "cold",
    claro: "clear/light",

    // Colors
    rojo: "red",
    azul: "blue",
    verde: "green",
    amarillo: "yellow",
    negro: "black",
    blanco: "white",
    gris: "gray",
    rosa: "pink",
    naranja: "orange",
    morado: "purple",

    // Common phrases
    hola: "hello",
    adiós: "goodbye",
    "por favor": "please",
    gracias: "thank you",
    "de nada": "you're welcome",
    "lo siento": "I'm sorry",
    "¿cómo estás?": "how are you?",
    "muy bien": "very well",
    "no entiendo": "I don't understand",
    "¿hablas inglés?": "do you speak English?",
  },
  "en-es": {
    // Common nouns
    house: "casa",
    dog: "perro",
    cat: "gato",
    car: "coche",
    water: "agua",
    food: "comida",
    book: "libro",
    table: "mesa",
    chair: "silla",
    window: "ventana",
    door: "puerta",
    tree: "árbol",
    flower: "flor",
    sun: "sol",
    moon: "luna",
    sky: "cielo",
    sea: "mar",
    beach: "playa",
    mountain: "montaña",
    river: "río",

    // Common verbs
    "to be": "ser/estar",
    "to have": "tener",
    "to do": "hacer",
    "to make": "hacer",
    "to go": "ir",
    "to come": "venir",
    "to see": "ver",
    "to look": "mirar",
    "to eat": "comer",
    "to drink": "beber",
    "to speak": "hablar",
    "to walk": "caminar",
    "to run": "correr",
    "to write": "escribir",
    "to read": "leer",
    "to study": "estudiar",
    "to work": "trabajar",
    "to sleep": "dormir",
    "to live": "vivir",
    "to love": "amar",

    // Common adjectives
    big: "grande",
    large: "grande",
    small: "pequeño",
    good: "bueno",
    bad: "malo",
    beautiful: "bonito",
    pretty: "bonito",
    ugly: "feo",
    new: "nuevo",
    old: "viejo",
    young: "joven",
    fast: "rápido",
    slow: "lento",
    easy: "fácil",
    difficult: "difícil",
    tall: "alto",
    high: "alto",
    short: "bajo",
    low: "bajo",
    happy: "feliz",
    sad: "triste",
    hot: "caliente",
    cold: "frío",
    clear: "claro",
    light: "claro",

    // Colors
    red: "rojo",
    blue: "azul",
    green: "verde",
    yellow: "amarillo",
    black: "negro",
    white: "blanco",
    gray: "gris",
    pink: "rosa",
    orange: "naranja",
    purple: "morado",

    // Common phrases
    hello: "hola",
    goodbye: "adiós",
    please: "por favor",
    "thank you": "gracias",
    "you're welcome": "de nada",
    "I'm sorry": "lo siento",
    "how are you?": "¿cómo estás?",
    "very well": "muy bien",
    "I don't understand": "no entiendo",
    "do you speak Spanish?": "¿hablas español?",
  },
};

class TranslatorService {
  /**
   * Generate cache key for translations
   */
  private generateCacheKey(
    text: string,
    fromLanguage: string,
    toLanguage: string,
    context?: string,
  ): string {
    const contextSuffix = context
      ? `:${Buffer.from(context).toString("base64").slice(0, 8)}`
      : "";
    const textHash = Buffer.from(text.toLowerCase().trim())
      .toString("base64")
      .slice(0, 16);
    return `translator:${fromLanguage}-${toLanguage}:${textHash}${contextSuffix}`;
  }

  /**
   * Get fallback translation for common words
   */
  private getFallbackTranslation(
    text: string,
    fromLanguage: string,
    toLanguage: string,
  ): string | null {
    const key = `${fromLanguage}-${toLanguage}`;
    const fallbackMap = FALLBACK_TRANSLATIONS[key];

    if (!fallbackMap) return null;

    const normalizedText = text.toLowerCase().trim();
    return fallbackMap[normalizedText] || null;
  }

  /**
   * Translate a single text
   */
  async translateText(request: TranslationRequest): Promise<TranslationResult> {
    const { text, fromLanguage, toLanguage, context } = request;

    // Return original text if same language
    if (fromLanguage === toLanguage) {
      return {
        originalText: text,
        translatedText: text,
        fromLanguage,
        toLanguage,
        confidence: 1,
      };
    }

    const cacheKey = this.generateCacheKey(
      text,
      fromLanguage,
      toLanguage,
      context,
    );

    try {
      // Check cache first
      const cached = await vercelKvCache.get<TranslationResult>(cacheKey);
      if (cached) {
        return cached;
      }

      let translatedText: string;
      let confidence = 0.9; // Default confidence for OpenAI

      // Try OpenAI translation first
      try {
        const contextPrompt = context
          ? `Context: ${context}\n\nTranslate the following text from ${fromLanguage} to ${toLanguage}:`
          : `Translate the following text from ${fromLanguage} to ${toLanguage}:`;

        translatedText = await openAIService.translateText({
          text: `${contextPrompt}\n\n"${text}"`,
          fromLanguage,
          toLanguage,
        });

        // Clean up the response (remove quotes if AI added them)
        translatedText = translatedText.replace(/^["']|["']$/g, "").trim();
      } catch (openAIError) {
        console.warn(
          "OpenAI translation failed, trying fallback:",
          openAIError,
        );

        // Try fallback translation
        const fallback = this.getFallbackTranslation(
          text,
          fromLanguage,
          toLanguage,
        );

        if (fallback) {
          translatedText = fallback;
          confidence = 0.7; // Lower confidence for fallback
        } else {
          throw new APIError({
            code: "TRANSLATION_FAILED",
            message: `Unable to translate "${text}" from ${fromLanguage} to ${toLanguage}`,
            status: 500,
            details: openAIError,
          });
        }
      }

      const result: TranslationResult = {
        originalText: text,
        translatedText,
        fromLanguage,
        toLanguage,
        confidence,
      };

      // Cache successful translations for 7 days
      await vercelKvCache.set(cacheKey, result, 604800);

      return result;
    } catch (error) {
      // Final fallback: try common word lookup
      const fallback = this.getFallbackTranslation(
        text,
        fromLanguage,
        toLanguage,
      );

      if (fallback) {
        const result: TranslationResult = {
          originalText: text,
          translatedText: fallback,
          fromLanguage,
          toLanguage,
          confidence: 0.5, // Low confidence for dictionary lookup
        };

        // Cache fallback for 1 day
        await vercelKvCache.set(cacheKey, result, 86400);

        return result;
      }

      throw error instanceof APIError
        ? error
        : new APIError({
            code: "TRANSLATION_ERROR",
            message: `Translation failed for "${text}"`,
            status: 500,
            details: error,
          });
    }
  }

  /**
   * Translate multiple texts in batch
   */
  async batchTranslate(
    request: BatchTranslationRequest,
  ): Promise<BatchTranslationResult> {
    const { texts, fromLanguage, toLanguage, context } = request;

    const results: TranslationResult[] = [];
    const failed: Array<{ index: number; error: string; text: string }> = [];

    // Process translations with limited concurrency to avoid rate limits
    const BATCH_SIZE = 5;

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);

      const batchPromises = batch.map(async (text, batchIndex) => {
        const actualIndex = i + batchIndex;
        try {
          const result = await this.translateText({
            text,
            fromLanguage,
            toLanguage,
            context,
          });

          return { index: actualIndex, result, error: null };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          return {
            index: actualIndex,
            result: null,
            error: errorMessage,
            text,
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);

      batchResults.forEach(({ index, result, error, text }) => {
        if (result) {
          results[index] = result;
        } else {
          failed.push({
            index,
            error: error!,
            text: text!,
          });
        }
      });

      // Add small delay between batches to be respectful to the API
      if (i + BATCH_SIZE < texts.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return {
      translations: results.filter((r) => r !== undefined),
      failed,
    };
  }

  /**
   * Get supported language pairs
   */
  getSupportedLanguages(): Array<{
    code: string;
    name: string;
    nativeName: string;
  }> {
    return [
      { code: "es", name: "Spanish", nativeName: "Español" },
      { code: "en", name: "English", nativeName: "English" },
    ];
  }

  /**
   * Check if a language pair is supported
   */
  isLanguagePairSupported(fromLanguage: string, toLanguage: string): boolean {
    const supportedCodes = this.getSupportedLanguages().map(
      (lang) => lang.code,
    );
    return (
      supportedCodes.includes(fromLanguage) &&
      supportedCodes.includes(toLanguage)
    );
  }

  /**
   * Get translation statistics
   */
  async getTranslationStats(): Promise<{
    totalTranslations: number;
    cacheHitRate: number;
    supportedLanguages: number;
    fallbackTranslationsAvailable: number;
  }> {
    try {
      // This would require tracking metrics in cache
      const stats = await vercelKvCache.get<any>("translator:stats");

      return {
        totalTranslations: stats?.totalTranslations || 0,
        cacheHitRate: stats?.cacheHitRate || 0,
        supportedLanguages: this.getSupportedLanguages().length,
        fallbackTranslationsAvailable: Object.keys(
          FALLBACK_TRANSLATIONS["es-en"],
        ).length,
      };
    } catch {
      return {
        totalTranslations: 0,
        cacheHitRate: 0,
        supportedLanguages: this.getSupportedLanguages().length,
        fallbackTranslationsAvailable: Object.keys(
          FALLBACK_TRANSLATIONS["es-en"],
        ).length,
      };
    }
  }
}

// Export singleton instance
export const translatorService = new TranslatorService();
