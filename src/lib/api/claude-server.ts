/**
 * Server-side only Anthropic Claude service
 * This file should ONLY be imported in API routes, never in client components
 *
 * Using Claude Sonnet 4.5 with 1M token context for superior Spanish learning descriptions
 */

import Anthropic from "@anthropic-ai/sdk";
import { keyManager, getServerKey } from "@/lib/keys/keyManager";
import { apiLogger, securityLogger, performanceLogger } from "@/lib/logging/logger";
import type {
  DescriptionStyle,
  DescriptionRequest,
  GeneratedDescription
} from "../../types/api";
import * as Sentry from "@sentry/nextjs";
import {
  trackClaudeAPICall,
  trackClaudeError,
  startClaudeSpan,
  calculateClaudeCost,
  ClaudePerformanceTracker,
  checkPerformanceThreshold,
  trackEndpointErrorRate
} from "@/lib/monitoring/claude-metrics";

// Singleton Claude client instance for memory optimization
let claudeClientInstance: Anthropic | null = null;
let lastConfigHash: string | null = null;

// Maximum image size limit (5MB) to prevent memory issues
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

// Claude Sonnet 4.5 model identifier
const CLAUDE_MODEL = "claude-sonnet-4-5-20250629"; // Update with actual model ID when available
const CLAUDE_MAX_TOKENS = 8192; // Claude's max output tokens

// Helper to calculate configuration hash for caching
function getConfigHash(apiKey: string): string {
  return `${apiKey.substring(0, 12)}_${apiKey.length}`;
}

/**
 * Get Claude client instance for server-side use only
 * Uses singleton pattern with smart caching for memory optimization
 * @param userApiKey - Optional API key from the user's request
 */
export function getServerClaudeClient(userApiKey?: string): Anthropic | null {
  // This function should only run on the server
  if (typeof window !== 'undefined') {
    apiLogger.error('This function can only be called server-side');
    throw new Error('[Claude Server] This function can only be called server-side');
  }

  let apiKey: string | undefined;

  // Priority 1: User-provided API key (for user-specific calls)
  if (userApiKey && userApiKey.startsWith('sk-ant-')) {
    apiKey = userApiKey;
    securityLogger.info('Using user-provided Anthropic API key');
  }
  // Priority 2: Server environment variable (Vercel)
  else {
    apiKey = getServerKey('anthropic');
    if (apiKey) {
      securityLogger.info('Using server environment Anthropic API key');
    }
  }

  if (!apiKey) {
    apiLogger.warn('No valid Anthropic API key available');
    return null;
  }

  try {
    const currentConfigHash = getConfigHash(apiKey);

    // Return cached client if configuration hasn't changed
    if (claudeClientInstance && lastConfigHash === currentConfigHash) {
      apiLogger.debug('Reusing cached Claude client instance', {
        cached: true
      });
      return claudeClientInstance;
    }

    // Create new Anthropic client instance
    const client = new Anthropic({
      apiKey: apiKey,
      timeout: 60000, // 60 second timeout
      maxRetries: 0, // Handle retries manually for better control
    });

    // Validate the client was created properly
    if (!client) {
      apiLogger.error('Claude client creation returned null/undefined');
      return null;
    }

    // Cache the new client instance
    claudeClientInstance = client;
    lastConfigHash = currentConfigHash;

    apiLogger.info('Claude client created successfully', {
      source: userApiKey ? 'user-header' : 'environment',
      model: CLAUDE_MODEL,
      cached: false
    });

    return client;
  } catch (error) {
    apiLogger.error('Failed to create Claude client', error);
    return null;
  }
}

/**
 * Get style-specific system prompt for Claude
 * Claude uses system prompts differently than OpenAI
 */
function getStyleSystemPrompt(style: DescriptionStyle, language: string): string {
  const prompts = {
    narrativo: {
      es: "Eres un narrador creativo experto en español. Tu tarea es describir imágenes como si fueran parte de historias fascinantes, usando lenguaje vívido, evocador y rico en detalles sensoriales. Enfócate en crear atmósfera y contar una historia visual que cautive al lector.",
      en: "You are an expert creative storyteller in English. Your task is to describe images as if they were part of fascinating stories, using vivid, evocative language rich in sensory details. Focus on creating atmosphere and telling a visual story that captivates the reader."
    },
    poetico: {
      es: "Eres un poeta visual experto en español. Describe imágenes con lenguaje poético sublime, usando metáforas elaboradas, símiles elegantes y lenguaje figurativo. Captura la esencia emocional, la belleza estética y el significado profundo de lo que observas.",
      en: "You are an expert visual poet in English. Describe images with sublime poetic language, using elaborate metaphors, elegant similes, and figurative language. Capture the emotional essence, aesthetic beauty, and deep meaning of what you observe."
    },
    academico: {
      es: "Eres un analista visual académico experto en español. Proporciona descripciones objetivas, detalladas y estructuradas de imágenes, analizando meticulosamente la composición, elementos técnicos, contexto cultural, simbolismo y significado histórico o social.",
      en: "You are an expert academic visual analyst in English. Provide objective, detailed, and structured descriptions of images, meticulously analyzing composition, technical elements, cultural context, symbolism, and historical or social significance."
    },
    conversacional: {
      es: "Eres un amigo hispanohablante cercano describiendo una imagen. Usa un tono casual, accesible y natural, como si estuvieras compartiendo lo que ves con alguien de confianza. Sé entusiasta, genuino y usa expresiones cotidianas del español.",
      en: "You are a close English-speaking friend describing an image. Use a casual, accessible, and natural tone, as if you were sharing what you see with someone you trust. Be enthusiastic, genuine, and use everyday expressions."
    },
    infantil: {
      es: "Eres un cuentacuentos mágico para niños hispanohablantes. Describe imágenes de manera divertida, simple y encantadora, usando palabras que los niños puedan entender fácilmente. Hazlo mágico, emocionante y lleno de asombro, como si cada imagen fuera una aventura especial.",
      en: "You are a magical storyteller for English-speaking children. Describe images in a fun, simple, and enchanting way, using words that children can easily understand. Make it magical, exciting, and full of wonder, as if each image were a special adventure."
    },
    creativo: {
      es: "Eres un artista visual creativo experto en español. Describe imágenes desde perspectivas únicas e inesperadas, explorando significados ocultos, conexiones inusuales y posibilidades imaginativas. Sé innovador, original y sorprendente en tus descripciones.",
      en: "You are an expert creative visual artist in English. Describe images from unique and unexpected perspectives, exploring hidden meanings, unusual connections, and imaginative possibilities. Be innovative, original, and surprising in your descriptions."
    },
    tecnico: {
      es: "Eres un experto técnico en análisis visual en español. Proporciona descripciones precisas y técnicas de imágenes, enfocándote en aspectos como iluminación, composición, perspectiva, técnica fotográfica, valores de exposición y características técnicas específicas.",
      en: "You are an expert technical visual analyst in English. Provide precise and technical descriptions of images, focusing on aspects like lighting, composition, perspective, photographic technique, exposure values, and specific technical characteristics."
    }
  };

  const prompt = prompts[style]?.[language as 'es' | 'en'];

  if (!prompt) {
    return language === 'es'
      ? "Eres un experto en describir imágenes en español de manera detallada, precisa y atractiva."
      : "You are an expert at describing images in English in a detailed, precise, and engaging way.";
  }

  return prompt;
}

/**
 * Generate image description using Claude's vision capabilities
 * Supports both URL and base64 image inputs
 */
export async function generateClaudeVisionDescription(
  request: DescriptionRequest & { language?: "en" | "es" },
  userApiKey?: string
): Promise<string> {
  const startTime = performance.now();
  const performanceTracker = new ClaudePerformanceTracker('/api/descriptions/generate');
  const span = startClaudeSpan('vision', 'Generate image description with Claude vision');

  try {
    const client = getServerClaudeClient(userApiKey);

    if (!client) {
      trackEndpointErrorRate('/api/descriptions/generate', true);
      throw new Error("Claude client not initialized - missing API key");
    }

    const { imageUrl, style, maxLength = 500, customPrompt, language = "en" } = request;

    if (!imageUrl) {
      trackEndpointErrorRate('/api/descriptions/generate', true);
      throw new Error("Image URL is required");
    }

    performanceTracker.mark('client_initialized');

    performanceLogger.info('Starting Claude vision description', {
      step: 'vision_start',
      hasImageUrl: !!imageUrl,
      imageType: imageUrl.startsWith('data:') ? 'base64' : 'url',
      style,
      language,
      maxLength
    });

    // Get style-specific system prompt
    const systemPrompt = getStyleSystemPrompt(style, language);

    // Prepare image content for Claude
    let imageContent: any;

    if (imageUrl.startsWith('data:')) {
      // Base64 image
      const matches = imageUrl.match(/^data:image\/([^;]+);base64,(.+)$/);
      if (!matches) {
        throw new Error("Invalid base64 image format");
      }

      const [, mediaType, data] = matches;
      imageContent = {
        type: "image" as const,
        source: {
          type: "base64" as const,
          media_type: `image/${mediaType}` as any,
          data: data,
        },
      };
    } else {
      // URL image - Claude doesn't support URLs directly, need to fetch and convert
      performanceLogger.info('Fetching image for Claude', { url: imageUrl.substring(0, 100) });

      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.status}`);
      }

      const arrayBuffer = await imageResponse.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

      imageContent = {
        type: "image" as const,
        source: {
          type: "base64" as const,
          media_type: contentType as any,
          data: base64,
        },
      };
    }

    // Build the user message with image and prompt
    const userPrompt = customPrompt ||
      (language === 'es'
        ? `Describe esta imagen de manera ${style}. Máximo ${maxLength} palabras. Usa español natural y expresivo.`
        : `Describe this image in a ${style} style. Maximum ${maxLength} words. Use natural and expressive English.`);

    performanceTracker.mark('image_prepared');

    performanceLogger.info('Calling Claude API', {
      step: 'claude_api_call',
      model: CLAUDE_MODEL,
      maxTokens: CLAUDE_MAX_TOKENS,
      systemPromptLength: systemPrompt.length,
      userPromptLength: userPrompt.length
    });

    performanceTracker.mark('api_call_start');

    // Call Claude with vision
    const response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: CLAUDE_MAX_TOKENS,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            imageContent,
            {
              type: "text",
              text: userPrompt
            }
          ]
        }
      ],
      temperature: 0.7,
    });

    performanceTracker.mark('api_call_complete');

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Extract text from Claude's response
    const description = response.content
      .filter(block => block.type === 'text')
      .map(block => ('text' in block ? block.text : ''))
      .join('\n');

    if (!description) {
      trackEndpointErrorRate('/api/descriptions/generate', true);
      throw new Error("No text content in Claude response");
    }

    performanceTracker.mark('response_processed');

    // Track metrics in Sentry
    const inputTokens = response.usage?.input_tokens || 0;
    const outputTokens = response.usage?.output_tokens || 0;
    const totalTokens = inputTokens + outputTokens;
    const estimatedCost = calculateClaudeCost(CLAUDE_MODEL, inputTokens, outputTokens);

    trackClaudeAPICall({
      endpoint: '/api/descriptions/generate',
      model: CLAUDE_MODEL,
      inputTokens,
      outputTokens,
      totalTokens,
      responseTime: duration,
      estimatedCost,
      success: true,
    });

    trackEndpointErrorRate('/api/descriptions/generate', false);
    checkPerformanceThreshold('/api/descriptions/generate', duration, 2000);

    performanceTracker.finish();
    span?.finish();

    performanceLogger.info('Claude vision description complete', {
      step: 'vision_complete',
      duration: `${duration.toFixed(2)}ms`,
      model: response.model,
      inputTokens,
      outputTokens,
      totalTokens,
      estimatedCost: `$${estimatedCost.toFixed(4)}`,
      stopReason: response.stop_reason,
      descriptionLength: description.length,
      language,
      style
    });

    return description;

  } catch (error: any) {
    const endTime = performance.now();
    const duration = endTime - startTime;

    performanceTracker.finish();
    span?.finish();

    // Track error in Sentry
    trackClaudeError(error, {
      endpoint: '/api/descriptions/generate',
      model: CLAUDE_MODEL,
      requestDuration: duration,
    });

    trackEndpointErrorRate('/api/descriptions/generate', true);

    apiLogger.error('Claude vision description failed', {
      error: error.message,
      duration: `${duration.toFixed(2)}ms`,
      step: 'vision_error',
      errorType: error.constructor.name,
      statusCode: error.status,
      errorCode: error.error?.type
    });

    // Provide helpful error messages
    if (error.status === 401) {
      throw new Error("Invalid Anthropic API key - please check your configuration");
    } else if (error.status === 429) {
      throw new Error("Rate limit exceeded - please try again in a moment");
    } else if (error.error?.type === 'invalid_request_error') {
      throw new Error(`Invalid request: ${error.message}`);
    }

    throw error;
  }
}

/**
 * Generate text completion using Claude (no vision)
 * Used for Q&A, translation, and text-only tasks
 */
export async function generateClaudeCompletion(
  prompt: string,
  systemPrompt?: string,
  options: {
    maxTokens?: number;
    temperature?: number;
    stopSequences?: string[];
    endpoint?: string;
  } = {},
  userApiKey?: string
): Promise<string> {
  const startTime = performance.now();
  const endpoint = options.endpoint || '/api/claude/completion';
  const span = startClaudeSpan('completion', 'Generate text completion with Claude');

  try {
    const client = getServerClaudeClient(userApiKey);

    if (!client) {
      trackEndpointErrorRate(endpoint, true);
      throw new Error("Claude client not initialized - missing API key");
    }

    const {
      maxTokens = 2048,
      temperature = 0.7,
      stopSequences = []
    } = options;

    performanceLogger.info('Starting Claude text completion', {
      step: 'completion_start',
      promptLength: prompt.length,
      hasSystemPrompt: !!systemPrompt,
      maxTokens,
      temperature
    });

    const response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      system: systemPrompt || "You are a helpful AI assistant specializing in Spanish language learning.",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      temperature,
      stop_sequences: stopSequences.length > 0 ? stopSequences : undefined,
    });

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Extract text from response
    const completion = response.content
      .filter(block => block.type === 'text')
      .map(block => ('text' in block ? block.text : ''))
      .join('\n');

    // Track metrics in Sentry
    const inputTokens = response.usage?.input_tokens || 0;
    const outputTokens = response.usage?.output_tokens || 0;
    const totalTokens = inputTokens + outputTokens;
    const estimatedCost = calculateClaudeCost(CLAUDE_MODEL, inputTokens, outputTokens);

    trackClaudeAPICall({
      endpoint,
      model: CLAUDE_MODEL,
      inputTokens,
      outputTokens,
      totalTokens,
      responseTime: duration,
      estimatedCost,
      success: true,
    });

    trackEndpointErrorRate(endpoint, false);
    checkPerformanceThreshold(endpoint, duration, 1500);

    span?.finish();

    performanceLogger.info('Claude completion finished', {
      step: 'completion_complete',
      duration: `${duration.toFixed(2)}ms`,
      inputTokens,
      outputTokens,
      totalTokens,
      estimatedCost: `$${estimatedCost.toFixed(4)}`,
      stopReason: response.stop_reason,
      completionLength: completion.length
    });

    return completion;

  } catch (error: any) {
    const endTime = performance.now();
    const duration = endTime - startTime;

    span?.finish();

    // Track error in Sentry
    trackClaudeError(error, {
      endpoint,
      model: CLAUDE_MODEL,
      requestDuration: duration,
    });

    trackEndpointErrorRate(endpoint, true);

    apiLogger.error('Claude completion failed', {
      error: error.message,
      duration: `${duration.toFixed(2)}ms`,
      errorType: error.constructor.name,
      statusCode: error.status
    });

    throw error;
  }
}

/**
 * Generate Q&A from image description using Claude
 */
export async function generateClaudeQA(
  imageDescription: string,
  difficulty: "facil" | "medio" | "dificil" = "medio",
  count: number = 5,
  userApiKey?: string
): Promise<Array<{ question: string; answer: string; difficulty: string }>> {
  const difficultyMap = {
    facil: "easy (A1-A2 CEFR level)",
    medio: "intermediate (B1-B2 CEFR level)",
    dificil: "advanced (C1-C2 CEFR level)"
  };

  const systemPrompt = `You are an expert Spanish language teacher creating comprehension questions based on image descriptions.
Generate questions at ${difficultyMap[difficulty]} that test vocabulary, grammar, and comprehension.
Focus on helping students learn Spanish naturally through contextual understanding.`;

  const userPrompt = `Based on this image description, generate ${count} questions and answers in Spanish:

Description: "${imageDescription}"

Generate ${count} questions at ${difficulty} difficulty level. For each question:
1. Ask about specific details, vocabulary, or concepts from the description
2. Provide a clear, correct answer in Spanish
3. Make questions interesting and educational

Return ONLY valid JSON array in this exact format:
[
  {
    "question": "¿Qué se describe en la imagen?",
    "answer": "Se describe...",
    "difficulty": "${difficulty}"
  }
]`;

  try {
    const completion = await generateClaudeCompletion(
      userPrompt,
      systemPrompt,
      { maxTokens: 2048, temperature: 0.8, endpoint: '/api/qa/generate' },
      userApiKey
    );

    // Parse JSON from Claude's response
    const jsonMatch = completion.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("Failed to extract JSON from Claude response");
    }

    const qaArray = JSON.parse(jsonMatch[0]);
    return qaArray;

  } catch (error) {
    apiLogger.error('Claude Q&A generation failed', error);
    throw error;
  }
}

/**
 * Translate text using Claude
 */
export async function translateWithClaude(
  text: string,
  fromLang: string,
  toLang: string,
  userApiKey?: string
): Promise<string> {
  const systemPrompt = `You are an expert translator specializing in ${fromLang} to ${toLang} translation.
Provide natural, contextually appropriate translations that preserve meaning, tone, and cultural nuances.
For Spanish translations, use appropriate regional variations and maintain proper grammar.`;

  const userPrompt = `Translate the following text from ${fromLang} to ${toLang}.
Provide ONLY the translation, no explanations:

${text}`;

  return await generateClaudeCompletion(
    userPrompt,
    systemPrompt,
    { maxTokens: text.length * 3, temperature: 0.3, endpoint: '/api/translate' }, // Lower temp for accurate translation
    userApiKey
  );
}

/**
 * Extract vocabulary phrases using Claude
 */
export async function extractVocabularyWithClaude(
  text: string,
  difficulty: "beginner" | "intermediate" | "advanced" = "intermediate",
  userApiKey?: string
): Promise<Array<{ spanish: string; english: string; partOfSpeech: string; context: string }>> {
  const systemPrompt = `You are an expert Spanish language teacher specializing in vocabulary extraction and teaching.
Extract the most important and useful vocabulary from Spanish texts, providing translations, grammatical information, and learning context.`;

  const userPrompt = `Extract ${difficulty}-level vocabulary from this Spanish text. Return ONLY valid JSON:

Text: "${text}"

Extract 10-15 key vocabulary items. For each:
- Provide Spanish word/phrase
- English translation
- Part of speech
- Example usage in context

Return JSON array:
[
  {
    "spanish": "palabra",
    "english": "word",
    "partOfSpeech": "noun",
    "context": "Example sentence in Spanish"
  }
]`;

  try {
    const completion = await generateClaudeCompletion(
      userPrompt,
      systemPrompt,
      { maxTokens: 3000, temperature: 0.5 },
      userApiKey
    );

    // Parse JSON from response
    const jsonMatch = completion.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("Failed to extract JSON from Claude response");
    }

    const vocab = JSON.parse(jsonMatch[0]);
    return vocab;

  } catch (error) {
    apiLogger.error('Claude vocabulary extraction failed', error);
    throw error;
  }
}

// Export for server-side use
export {
  CLAUDE_MODEL,
  CLAUDE_MAX_TOKENS
};
