/**
 * Server-side only OpenAI service
 * This file should ONLY be imported in API routes, never in client components
 */

import OpenAI from "openai";
import { apiKeyProvider } from "./keyProvider";
import type { 
  DescriptionStyle, 
  DescriptionRequest, 
  GeneratedDescription 
} from "../../types/api";

// Singleton OpenAI client instance for memory optimization
let openAIClientInstance: OpenAI | null = null;
let lastConfigHash: string | null = null;

// Maximum image size limit (5MB) to prevent memory issues
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

// Helper to calculate configuration hash for caching
function getConfigHash(apiKey: string): string {
  return `${apiKey.substring(0, 12)}_${apiKey.length}`;
}

/**
 * Get OpenAI client instance for server-side use only
 * Uses singleton pattern with smart caching for memory optimization
 */
export function getServerOpenAIClient(): OpenAI | null {
  // This function should only run on the server
  if (typeof window !== 'undefined') {
    console.error('[OpenAI Server] This function can only be called server-side');
    throw new Error('[OpenAI Server] This function can only be called server-side');
  }

  let config;
  try {
    config = apiKeyProvider.getServiceConfig('openai');
  } catch (configError) {
    console.error('[OpenAI Server] Failed to get service config:', configError);
    return null;
  }
  
  if (!config || !config.apiKey || !config.isValid) {
    console.warn('[OpenAI Server] No valid API key available', {
      hasConfig: !!config,
      hasKey: !!config?.apiKey,
      keyLength: config?.apiKey?.length || 0,
      isValid: config?.isValid || false,
      source: config?.source || 'unknown',
      isDemo: config?.isDemo || true
    });
    return null;
  }

  try {
    const currentConfigHash = getConfigHash(config.apiKey);
    
    // Return cached client if configuration hasn't changed
    if (openAIClientInstance && lastConfigHash === currentConfigHash) {
      console.log('[OpenAI Server] Reusing cached client instance', {
        keyLength: config.apiKey.length,
        keyPrefix: config.apiKey.substring(0, 6) + '...',
        cached: true
      });
      return openAIClientInstance;
    }

    // Create new client instance with error handling
    const client = new OpenAI({
      apiKey: config.apiKey,
      timeout: 60000,
      maxRetries: 0,
      // Ensure server-side only
      dangerouslyAllowBrowser: false,
    });

    // Validate the client was created properly
    if (!client) {
      console.error('[OpenAI Server] Client creation returned null/undefined');
      return null;
    }

    // Cache the new client instance
    openAIClientInstance = client;
    lastConfigHash = currentConfigHash;

    console.log('[OpenAI Server] Client created successfully', {
      keyLength: config.apiKey.length,
      keyPrefix: config.apiKey.substring(0, 6) + '...',
      source: config.source,
      keyType: config.apiKey.startsWith('sk-proj-') ? 'project' : 'standard',
      cached: false
    });

    return client;
  } catch (error) {
    console.error('[OpenAI Server] Failed to create client:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      keyLength: config.apiKey?.length || 0,
      keyPrefix: config.apiKey ? config.apiKey.substring(0, 6) + '...' : 'none'
    });
    return null;
  }
}

/**
 * Get style-specific prompt for description generation
 */
function getStylePrompt(style: DescriptionStyle, language: string): string {
  const prompts = {
    narrativo: {
      es: "Eres un narrador creativo. Describe esta imagen como si fuera parte de una historia fascinante, usando lenguaje vívido y evocador. Enfócate en los detalles que cuentan una historia y crean atmósfera.",
      en: "You are a creative storyteller. Describe this image as if it were part of a fascinating story, using vivid and evocative language. Focus on details that tell a story and create atmosphere."
    },
    poetico: {
      es: "Eres un poeta visual. Describe esta imagen con lenguaje poético, usando metáforas, símiles y lenguaje figurativo. Captura la esencia emocional y la belleza estética de lo que ves.",
      en: "You are a visual poet. Describe this image with poetic language, using metaphors, similes, and figurative language. Capture the emotional essence and aesthetic beauty of what you see."
    },
    academico: {
      es: "Eres un analista visual académico. Proporciona una descripción objetiva y detallada de esta imagen, analizando composición, elementos técnicos, contexto cultural y significado.",
      en: "You are an academic visual analyst. Provide an objective and detailed description of this image, analyzing composition, technical elements, cultural context, and meaning."
    },
    conversacional: {
      es: "Eres un amigo describiendo una imagen. Usa un tono casual y accesible, como si estuvieras compartiendo lo que ves con alguien cercano. Sé natural y entusiasta.",
      en: "You are a friend describing an image. Use a casual and accessible tone, as if you were sharing what you see with someone close. Be natural and enthusiastic."
    },
    infantil: {
      es: "Eres un cuentacuentos para niños. Describe esta imagen de manera divertida y simple, usando palabras que los niños puedan entender. Hazlo mágico y emocionante.",
      en: "You are a storyteller for children. Describe this image in a fun and simple way, using words that children can understand. Make it magical and exciting."
    }
  };

  const prompt = prompts[style]?.[language as 'es' | 'en'];
  
  if (!prompt) {
    return language === 'es' 
      ? "Describe esta imagen de manera detallada y atractiva."
      : "Describe this image in a detailed and engaging way.";
  }

  return prompt;
}

/**
 * Validate and optimize image data before processing
 */
function validateAndOptimizeImageData(imageUrl: string): { valid: boolean; optimized?: string; error?: string } {
  try {
    // Check if it's a data URI
    if (imageUrl.startsWith('data:')) {
      const base64Data = imageUrl.split(',')[1];
      if (!base64Data) {
        return { valid: false, error: 'Invalid base64 data URI format' };
      }
      
      // Estimate size from base64 (rough calculation)
      const estimatedSize = (base64Data.length * 3) / 4;
      if (estimatedSize > MAX_IMAGE_SIZE) {
        return { 
          valid: false, 
          error: `Image too large: ${Math.round(estimatedSize / 1024 / 1024)}MB (max: ${MAX_IMAGE_SIZE / 1024 / 1024}MB)` 
        };
      }
      
      return { valid: true, optimized: imageUrl };
    }
    
    // For HTTP URLs, we'll validate format but can't check size until download
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return { valid: true, optimized: imageUrl };
    }
    
    return { valid: false, error: 'Invalid image URL format' };
  } catch (error) {
    return { valid: false, error: `Image validation failed: ${error}` };
  }
}

/**
 * Generate a description for an image using GPT-4 Vision
 * Server-side only function with memory optimization
 */
export async function generateVisionDescription(
  request: DescriptionRequest
): Promise<GeneratedDescription> {
  // Comprehensive input validation
  if (!request) {
    console.error('[OpenAI Server] Request parameter is required');
    throw new Error('[OpenAI Server] Request parameter is required');
  }

  const { imageUrl, style, language = "es", maxLength = 300, customPrompt } = request;
  
  // Validate imageUrl - critical validation to prevent API failures
  if (!imageUrl || typeof imageUrl !== 'string') {
    console.warn('[OpenAI Server] Invalid imageUrl provided, returning demo description', {
      hasImageUrl: !!imageUrl,
      imageUrlType: typeof imageUrl,
      imageUrlLength: imageUrl?.length
    });
    return generateDemoDescription(style || 'narrativo', '', language);
  }

  // Validate and optimize image data with size limits
  const imageValidation = validateAndOptimizeImageData(imageUrl);
  if (!imageValidation.valid) {
    console.warn('[OpenAI Server] Image validation failed, returning demo description', {
      error: imageValidation.error,
      imageUrlLength: imageUrl?.length
    });
    return generateDemoDescription(style || 'narrativo', imageUrl || '', language);
  }
  
  const optimizedImageUrl = imageValidation.optimized || imageUrl;

  // Validate style parameter
  if (!style || typeof style !== 'string') {
    console.warn('[OpenAI Server] Invalid style parameter, using default', {
      hasStyle: !!style,
      styleType: typeof style,
      styleValue: style
    });
  }

  const validStyles: DescriptionStyle[] = ['narrativo', 'poetico', 'academico', 'conversacional', 'infantil'];
  if (style && !validStyles.includes(style)) {
    console.warn('[OpenAI Server] Invalid style value, using default', {
      providedStyle: style,
      validStyles
    });
  }

  // Validate language parameter
  const validLanguages = ['es', 'en'];
  if (language && !validLanguages.includes(language)) {
    console.warn('[OpenAI Server] Invalid language parameter, using default', {
      providedLanguage: language,
      validLanguages,
      usingDefault: 'es'
    });
  }

  // Validate maxLength parameter
  if (maxLength && (typeof maxLength !== 'number' || maxLength < 50 || maxLength > 1000)) {
    console.warn('[OpenAI Server] Invalid maxLength parameter, using default', {
      providedMaxLength: maxLength,
      maxLengthType: typeof maxLength,
      usingDefault: 300
    });
  }

  // Validate customPrompt if provided
  if (customPrompt && (typeof customPrompt !== 'string' || customPrompt.length > 500)) {
    console.warn('[OpenAI Server] Invalid customPrompt parameter', {
      hasCustomPrompt: !!customPrompt,
      customPromptType: typeof customPrompt,
      customPromptLength: customPrompt?.length
    });
  }

  // Use validated or default values
  const validatedStyle = (style && validStyles.includes(style)) ? style : 'narrativo';
  const validatedLanguage = (language && validLanguages.includes(language)) ? language : 'es';
  const validatedMaxLength = (typeof maxLength === 'number' && maxLength >= 50 && maxLength <= 1000) ? maxLength : 300;
  const validatedCustomPrompt = (typeof customPrompt === 'string' && customPrompt.length <= 500) ? customPrompt : undefined;
  
  if (process.env.NODE_ENV !== 'production') {
    console.log('[OpenAI Server] Generating vision description with validated parameters:', {
      hasImageUrl: !!optimizedImageUrl,
      imageUrlType: optimizedImageUrl?.startsWith('data:') ? 'base64' : 'url',
      imageUrlLength: optimizedImageUrl?.length,
      originalStyle: style,
      validatedStyle,
      originalLanguage: language,
      validatedLanguage,
      originalMaxLength: maxLength,
      validatedMaxLength,
      hasCustomPrompt: !!validatedCustomPrompt
    });
  }

  let client;
  try {
    client = getServerOpenAIClient();
  } catch (clientError) {
    console.error('[OpenAI Server] Failed to get OpenAI client:', clientError);
    return generateDemoDescription(style, imageUrl, language);
  }
  
  if (!client) {
    console.warn('[OpenAI Server] No client available, returning demo description');
    return generateDemoDescription(validatedStyle, imageUrl, validatedLanguage);
  }

  try {
    const stylePrompt = getStylePrompt(validatedStyle, validatedLanguage);
    const lengthInstruction = validatedLanguage === "es"
      ? `La descripción debe tener aproximadamente ${validatedMaxLength} palabras.`
      : `The description should be approximately ${validatedMaxLength} words.`;
    
    const systemPrompt = validatedCustomPrompt 
      ? `${validatedCustomPrompt} ${lengthInstruction}`
      : `${stylePrompt} ${lengthInstruction}`;

    if (process.env.NODE_ENV !== 'production') {
      console.log('[OpenAI Server] Calling GPT-4 Vision API:', {
        model: 'gpt-4o',
        validatedStyle,
        validatedLanguage,
        validatedMaxLength,
        hasCustomPrompt: !!validatedCustomPrompt,
        systemPromptPreview: systemPrompt.substring(0, 100) + '...'
      });
    }

    // Validate image URL format
    if (!imageUrl || (!imageUrl.startsWith('data:') && !imageUrl.startsWith('http'))) {
      throw new Error('[OpenAI Server] Invalid or missing image URL format');
    }

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: validatedLanguage === "es" 
                ? "Describe esta imagen en detalle."
                : "Describe this image in detail."
            },
            {
              type: "image_url",
              image_url: {
                url: optimizedImageUrl,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: Math.min(Math.ceil(validatedMaxLength * 1.5), 1000),
      temperature: validatedStyle === "poetico" ? 0.9 : validatedStyle === "academico" ? 0.3 : 0.7,
    });

    // Validate response
    if (!response || !response.choices || response.choices.length === 0) {
      throw new Error('[OpenAI Server] Invalid API response: no choices returned');
    }

    const description = response.choices[0]?.message?.content || "";
    
    if (!description.trim()) {
      console.warn('[OpenAI Server] Empty description returned from API');
      return generateDemoDescription(validatedStyle, imageUrl, validatedLanguage);
    }
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('[OpenAI Server] Vision description generated successfully:', {
        descriptionLength: description.length,
        wordCount: description.split(/\s+/).length,
        model: response.model,
        usage: response.usage
      });
    }

    const result = {
      text: description,
      style: validatedStyle,
      language: validatedLanguage as "es" | "en",
      wordCount: description.split(/\s+/).length,
      timestamp: new Date().toISOString(),
    };
    
    // Clear any large variables to help with garbage collection
    if (optimizedImageUrl.startsWith('data:') && optimizedImageUrl !== imageUrl) {
      // Help GC by clearing references to large image data
      setTimeout(() => {
        // Force garbage collection hint
        if (global.gc) global.gc();
      }, 100);
    }
    
    return result;
  } catch (error) {
    // Enhanced error logging
    console.error('[OpenAI Server] Vision API error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      code: (error instanceof Error && 'code' in error) ? (error as any).code : undefined,
      status: (error instanceof Error && 'status' in error) ? (error as any).status : undefined,
      requestDetails: {
        originalStyle: style,
        validatedStyle,
        originalLanguage: language,
        validatedLanguage,
        originalMaxLength: maxLength,
        validatedMaxLength,
        imageUrlLength: optimizedImageUrl?.length,
        imageUrlType: optimizedImageUrl?.startsWith('data:') ? 'base64' : 'url'
      }
    });
    
    // Return a demo description on error with validated parameters
    return generateDemoDescription(validatedStyle, imageUrl, validatedLanguage);
  }
}

/**
 * Generate a demo description when API is not available
 */
function generateDemoDescription(
  style: DescriptionStyle,
  imageUrl: string,
  language: string
): GeneratedDescription {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[OpenAI Server] Generating demo description for fallback:', {
      style,
      language,
      hasImageUrl: !!imageUrl,
      reason: 'API unavailable or error occurred'
    });
  }

  const descriptions = {
    narrativo: {
      es: "En esta cautivadora imagen, los elementos visuales se entrelazan para contar una historia única. Los colores y formas crean una narrativa visual que invita al espectador a imaginar los momentos capturados en el tiempo.",
      en: "In this captivating image, visual elements intertwine to tell a unique story. Colors and shapes create a visual narrative that invites the viewer to imagine the moments captured in time."
    },
    poetico: {
      es: "Como versos visuales en el lienzo del mundo, esta imagen danza entre luces y sombras, susurrando secretos al alma que la contempla con ojos de asombro.",
      en: "Like visual verses on the canvas of the world, this image dances between lights and shadows, whispering secrets to the soul that contemplates it with eyes of wonder."
    },
    academico: {
      es: "La composición presenta elementos estructurales significativos que demuestran principios fundamentales del diseño visual. La interacción entre los componentes primarios y secundarios establece una jerarquía visual clara.",
      en: "The composition presents significant structural elements that demonstrate fundamental principles of visual design. The interaction between primary and secondary components establishes a clear visual hierarchy."
    },
    conversacional: {
      es: "¡Wow, mira esta imagen! Es realmente impresionante cómo todos los elementos se combinan perfectamente. Me encanta la forma en que los colores juegan entre sí.",
      en: "Wow, look at this image! It's really impressive how all the elements combine perfectly. I love the way the colors play with each other."
    },
    infantil: {
      es: "¡Qué imagen tan divertida y colorida! Es como un cuento mágico lleno de aventuras esperando ser descubiertas. ¡Cada parte cuenta su propia historia especial!",
      en: "What a fun and colorful image! It's like a magical tale full of adventures waiting to be discovered. Each part tells its own special story!"
    }
  };

  // Provide fallback for unknown styles
  const styleDescriptions = descriptions[style] || descriptions.narrativo;
  const text = styleDescriptions[language as 'es' | 'en'] || styleDescriptions.es;

  if (!text) {
    console.warn('[OpenAI Server] No demo description found for style/language combination');
    const fallbackText = language === 'es' 
      ? 'Esta imagen presenta elementos visuales interesantes que capturan la atención del espectador.'
      : 'This image presents interesting visual elements that capture the viewer\'s attention.';
    return {
      text: `[DEMO MODE] ${fallbackText}`,
      style,
      language: language as "es" | "en",
      wordCount: fallbackText.split(/\s+/).length,
      timestamp: new Date().toISOString(),
    };
  }

  return {
    text: `[DEMO MODE] ${text}`,
    style,
    language: language as "es" | "en",
    wordCount: text.split(/\s+/).length,
    timestamp: new Date().toISOString(),
  };
}