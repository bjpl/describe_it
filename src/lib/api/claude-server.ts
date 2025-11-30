/**
 * Server-side only Anthropic Claude service
 * This file should ONLY be imported in API routes, never in client components
 *
 * Using Claude Sonnet 4.5 with 1M token context for superior Spanish learning descriptions
 */

import Anthropic from '@anthropic-ai/sdk';
import { keyManager, getServerKey } from '@/lib/keys/keyManager';
import { apiLogger, securityLogger, performanceLogger } from '@/lib/logging/logger';
import type { DescriptionStyle, DescriptionRequest, GeneratedDescription } from '../../types/api';
import * as Sentry from '@sentry/nextjs';
import {
  trackClaudeAPICall,
  trackClaudeError,
  startClaudeSpan,
  calculateClaudeCost,
  ClaudePerformanceTracker,
  checkPerformanceThreshold,
  trackEndpointErrorRate,
} from '@/lib/monitoring/claude-metrics';

// Singleton Claude client instance for memory optimization
let claudeClientInstance: Anthropic | null = null;
let lastConfigHash: string | null = null;

// Maximum image size limit (5MB) to prevent memory issues
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

// Claude 3.5 Sonnet model identifier (with vision capabilities)
const CLAUDE_MODEL = 'claude-3-5-sonnet-20241022';
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

  // Debug logging for API key resolution
  apiLogger.info('[getServerClaudeClient] Starting API key resolution', {
    hasUserApiKey: !!userApiKey,
    userKeyLength: userApiKey?.length,
    userKeyPrefix: userApiKey ? userApiKey.substring(0, 15) + '...' : 'none',
    userKeyStartsWithSkAnt: userApiKey?.startsWith('sk-ant-'),
  });

  let apiKey: string | undefined;

  // Priority 1: User-provided API key (for user-specific calls)
  if (userApiKey && userApiKey.startsWith('sk-ant-')) {
    apiKey = userApiKey;
    securityLogger.info('[getServerClaudeClient] Using user-provided Anthropic API key', {
      keyLength: apiKey.length,
      keyPrefix: apiKey.substring(0, 15) + '...',
    });
  }
  // Priority 2: Server environment variable (Vercel)
  else {
    apiKey = getServerKey('anthropic');
    apiLogger.info('[getServerClaudeClient] Tried getServerKey result', {
      hasEnvKey: !!apiKey,
      envKeyLength: apiKey?.length,
      envKeyPrefix: apiKey ? apiKey.substring(0, 15) + '...' : 'none',
      whyNotUserKey: !userApiKey
        ? 'no user key provided'
        : !userApiKey.startsWith('sk-ant-')
          ? 'user key has wrong prefix'
          : 'unknown',
    });
    if (apiKey) {
      securityLogger.info('[getServerClaudeClient] Using server environment Anthropic API key');
    }
  }

  if (!apiKey) {
    apiLogger.warn('[getServerClaudeClient] No valid Anthropic API key available', {
      hasUserKey: !!userApiKey,
      userKeyPrefix: userApiKey ? userApiKey.substring(0, 15) : 'none',
      hasEnvKey: !!process.env.ANTHROPIC_API_KEY,
      envKeyPrefix: process.env.ANTHROPIC_API_KEY
        ? process.env.ANTHROPIC_API_KEY.substring(0, 15)
        : 'none',
    });
    return null;
  }

  // Validate key format
  if (!apiKey.startsWith('sk-ant-')) {
    apiLogger.error('[getServerClaudeClient] Invalid Anthropic API key format', {
      keyPrefix: apiKey.substring(0, 15),
      keyLength: apiKey.length,
      expectedPrefix: 'sk-ant-',
      source: userApiKey?.startsWith('sk-ant-') ? 'user' : 'environment',
    });
    return null;
  }

  apiLogger.info('[getServerClaudeClient] API key validated successfully', {
    keyLength: apiKey.length,
    keyPrefix: apiKey.substring(0, 15) + '...',
    source: userApiKey?.startsWith('sk-ant-') ? 'user' : 'environment',
  });

  try {
    const currentConfigHash = getConfigHash(apiKey);

    // Return cached client if configuration hasn't changed
    if (claudeClientInstance && lastConfigHash === currentConfigHash) {
      apiLogger.debug('Reusing cached Claude client instance', {
        cached: true,
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
      cached: false,
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
      es: 'Eres un narrador creativo experto en español. Tu tarea es describir imágenes como si fueran parte de historias fascinantes, usando lenguaje vívido, evocador y rico en detalles sensoriales. Enfócate en crear atmósfera y contar una historia visual que cautive al lector.',
      en: 'You are an expert creative storyteller in English. Your task is to describe images as if they were part of fascinating stories, using vivid, evocative language rich in sensory details. Focus on creating atmosphere and telling a visual story that captivates the reader.',
    },
    poetico: {
      es: 'Eres un poeta visual experto en español. Describe imágenes con lenguaje poético sublime, usando metáforas elaboradas, símiles elegantes y lenguaje figurativo. Captura la esencia emocional, la belleza estética y el significado profundo de lo que observas.',
      en: 'You are an expert visual poet in English. Describe images with sublime poetic language, using elaborate metaphors, elegant similes, and figurative language. Capture the emotional essence, aesthetic beauty, and deep meaning of what you observe.',
    },
    academico: {
      es: 'Eres un analista visual académico experto en español. Proporciona descripciones objetivas, detalladas y estructuradas de imágenes, analizando meticulosamente la composición, elementos técnicos, contexto cultural, simbolismo y significado histórico o social.',
      en: 'You are an expert academic visual analyst in English. Provide objective, detailed, and structured descriptions of images, meticulously analyzing composition, technical elements, cultural context, symbolism, and historical or social significance.',
    },
    conversacional: {
      es: 'Eres un amigo hispanohablante cercano describiendo una imagen. Usa un tono casual, accesible y natural, como si estuvieras compartiendo lo que ves con alguien de confianza. Sé entusiasta, genuino y usa expresiones cotidianas del español.',
      en: 'You are a close English-speaking friend describing an image. Use a casual, accessible, and natural tone, as if you were sharing what you see with someone you trust. Be enthusiastic, genuine, and use everyday expressions.',
    },
    infantil: {
      es: 'Eres un cuentacuentos mágico para niños hispanohablantes. Describe imágenes de manera divertida, simple y encantadora, usando palabras que los niños puedan entender fácilmente. Hazlo mágico, emocionante y lleno de asombro, como si cada imagen fuera una aventura especial.',
      en: 'You are a magical storyteller for English-speaking children. Describe images in a fun, simple, and enchanting way, using words that children can easily understand. Make it magical, exciting, and full of wonder, as if each image were a special adventure.',
    },
    creativo: {
      es: 'Eres un artista visual creativo experto en español. Describe imágenes desde perspectivas únicas e inesperadas, explorando significados ocultos, conexiones inusuales y posibilidades imaginativas. Sé innovador, original y sorprendente en tus descripciones.',
      en: 'You are an expert creative visual artist in English. Describe images from unique and unexpected perspectives, exploring hidden meanings, unusual connections, and imaginative possibilities. Be innovative, original, and surprising in your descriptions.',
    },
    tecnico: {
      es: 'Eres un experto técnico en análisis visual en español. Proporciona descripciones precisas y técnicas de imágenes, enfocándote en aspectos como iluminación, composición, perspectiva, técnica fotográfica, valores de exposición y características técnicas específicas.',
      en: 'You are an expert technical visual analyst in English. Provide precise and technical descriptions of images, focusing on aspects like lighting, composition, perspective, photographic technique, exposure values, and specific technical characteristics.',
    },
  };

  const prompt = prompts[style]?.[language as 'es' | 'en'];

  if (!prompt) {
    return language === 'es'
      ? 'Eres un experto en describir imágenes en español de manera detallada, precisa y atractiva.'
      : 'You are an expert at describing images in English in a detailed, precise, and engaging way.';
  }

  return prompt;
}

/**
 * Generate image description using Claude's vision capabilities
 * Supports both URL and base64 image inputs
 */
export async function generateClaudeVisionDescription(
  request: DescriptionRequest & { language?: 'en' | 'es' },
  userApiKey?: string
): Promise<string> {
  const startTime = performance.now();
  const performanceTracker = new ClaudePerformanceTracker('/api/descriptions/generate');
  const span = startClaudeSpan('vision', 'Generate image description with Claude vision');

  try {
    const client = getServerClaudeClient(userApiKey);

    if (!client) {
      trackEndpointErrorRate('/api/descriptions/generate', true);
      throw new Error('Claude client not initialized - missing API key');
    }

    const { imageUrl, style, maxLength = 500, customPrompt, language = 'en' } = request;

    if (!imageUrl) {
      trackEndpointErrorRate('/api/descriptions/generate', true);
      throw new Error('Image URL is required');
    }

    performanceTracker.mark('client_initialized');

    performanceLogger.info('Starting Claude vision description', {
      step: 'vision_start',
      hasImageUrl: !!imageUrl,
      imageType: imageUrl.startsWith('data:') ? 'base64' : 'url',
      style,
      language,
      maxLength,
    });

    // Get style-specific system prompt
    const systemPrompt = getStyleSystemPrompt(style, language);

    // Prepare image content for Claude
    let imageContent: any;

    if (imageUrl.startsWith('data:')) {
      // Base64 image
      const matches = imageUrl.match(/^data:image\/([^;]+);base64,(.+)$/);
      if (!matches) {
        throw new Error('Invalid base64 image format');
      }

      const [, mediaType, data] = matches;
      imageContent = {
        type: 'image' as const,
        source: {
          type: 'base64' as const,
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
        type: 'image' as const,
        source: {
          type: 'base64' as const,
          media_type: contentType as any,
          data: base64,
        },
      };
    }

    // Build the user message with image and prompt
    // Style-specific instructions for rich paragraph descriptions based on VISUAL ANALYSIS
    const styleInstructions: Record<string, { es: string; en: string }> = {
      narrativo: {
        es: `MIRA CUIDADOSAMENTE ESTA IMAGEN y escribe una descripción narrativa detallada.

Analiza visualmente: ¿Qué personas, objetos, lugares o acciones ves? ¿Qué colores dominan? ¿Cómo es la iluminación? ¿Qué emociones transmite la escena?

Escribe como si fuera el comienzo de una historia cautivadora. Describe específicamente lo que VES: los detalles visuales concretos, la atmósfera que crea la imagen, las texturas, los gestos, las expresiones. Usa verbos de acción y adjetivos sensoriales para crear una narrativa envolvente que transporte al lector a esta escena específica.`,
        en: `LOOK CAREFULLY AT THIS IMAGE and write a detailed narrative description.

Visually analyze: What people, objects, places, or actions do you see? What colors dominate? How is the lighting? What emotions does the scene convey?

Write as if it were the beginning of a captivating story. Describe specifically what you SEE: the concrete visual details, the atmosphere the image creates, the textures, gestures, expressions. Use action verbs and sensory adjectives to create an immersive narrative that transports the reader to this specific scene.`,
      },
      poetico: {
        es: `CONTEMPLA ESTA IMAGEN como un poeta y crea una descripción lírica profunda.

Observa con atención: ¿Qué belleza encuentras en los detalles? ¿Qué simbolismo sugieren los elementos visuales? ¿Qué emociones te evoca cada color, cada forma, cada luz y sombra?

Transforma lo que VES en poesía: usa metáforas elaboradas para describir los colores específicos, símiles elegantes para las formas que observas, personificación para los objetos. Captura la esencia emocional de ESTA imagen particular, sus tonalidades únicas, su composición, su alma visual.`,
        en: `CONTEMPLATE THIS IMAGE as a poet and create a deep lyrical description.

Observe carefully: What beauty do you find in the details? What symbolism do the visual elements suggest? What emotions does each color, each shape, each light and shadow evoke?

Transform what you SEE into poetry: use elaborate metaphors to describe the specific colors, elegant similes for the shapes you observe, personification for objects. Capture the emotional essence of THIS particular image, its unique tones, its composition, its visual soul.`,
      },
      academico: {
        es: `EXAMINA ESTA IMAGEN de manera analítica y proporciona un análisis académico completo.

Estudia sistemáticamente: ¿Cuál es la composición (regla de tercios, simetría, líneas guía)? ¿Qué técnicas de iluminación se utilizan? ¿Qué elementos visuales son el foco principal? ¿Qué contexto cultural o histórico sugiere?

Describe objetivamente cada elemento que OBSERVAS: la paleta de colores específica, la perspectiva utilizada, el balance visual, los puntos focales, las relaciones entre elementos. Analiza el significado potencial y el mensaje que comunica esta imagen particular.`,
        en: `EXAMINE THIS IMAGE analytically and provide a complete academic analysis.

Study systematically: What is the composition (rule of thirds, symmetry, leading lines)? What lighting techniques are used? What visual elements are the main focus? What cultural or historical context does it suggest?

Objectively describe each element you OBSERVE: the specific color palette, the perspective used, the visual balance, the focal points, the relationships between elements. Analyze the potential meaning and message this particular image communicates.`,
      },
      conversacional: {
        es: `¡MIRA ESTA IMAGEN! Descríbela como si se la contaras a un amigo cercano.

Fíjate bien: ¿Qué es lo primero que te llama la atención? ¿Qué detalles curiosos o interesantes notas? ¿Qué te hace sentir o pensar?

Cuéntame de forma natural y entusiasta lo que VES: "¡Oye, mira esto...!" Usa expresiones coloquiales, comparte tus impresiones personales sobre los colores, las personas, los objetos específicos. Sé genuino y descriptivo, como si estuvieras compartiendo algo que te ha impresionado.`,
        en: `LOOK AT THIS IMAGE! Describe it as if you were telling a close friend.

Notice carefully: What first catches your attention? What curious or interesting details do you notice? What does it make you feel or think?

Tell me naturally and enthusiastically what you SEE: "Hey, look at this...!" Use casual expressions, share your personal impressions about the colors, the people, the specific objects. Be genuine and descriptive, as if you were sharing something that impressed you.`,
      },
      infantil: {
        es: `¡MIRA ESTA IMAGEN MÁGICA! Descríbela como si le contaras un cuento a un niño pequeño.

Observa con ojos de niño: ¿Qué colores brillantes ves? ¿Qué formas divertidas hay? ¿Quién o qué aparece en la imagen? ¿Qué podría estar pasando?

Cuenta lo que VES de forma mágica y emocionante: "¡Mira! ¿Ves ese...?" Usa palabras simples pero expresivas. Señala los colores bonitos, las formas curiosas, los personajes o animales. Hazlo lleno de asombro y diversión, como si cada detalle fuera un descubrimiento especial.`,
        en: `LOOK AT THIS MAGICAL IMAGE! Describe it as if you were telling a story to a young child.

Observe with a child's eyes: What bright colors do you see? What fun shapes are there? Who or what appears in the image? What might be happening?

Tell what you SEE in a magical and exciting way: "Look! Do you see that...?" Use simple but expressive words. Point out the pretty colors, the curious shapes, the characters or animals. Make it full of wonder and fun, as if each detail were a special discovery.`,
      },
      creativo: {
        es: `OBSERVA ESTA IMAGEN desde una perspectiva única y ofrece una descripción imaginativa.

Mira más allá de lo obvio: ¿Qué historia oculta podrían contar estos elementos? ¿Qué conexiones inesperadas puedes hacer? ¿Qué significados alternativos sugieren los colores, las formas, la composición?

Describe lo que VES de manera innovadora: encuentra lo extraordinario en los detalles ordinarios, imagina historias detrás de cada elemento visual, crea conexiones sorprendentes entre lo que observas. Invita al lector a ver esta imagen de una manera completamente nueva.`,
        en: `OBSERVE THIS IMAGE from a unique perspective and offer an imaginative description.

Look beyond the obvious: What hidden story could these elements tell? What unexpected connections can you make? What alternative meanings do the colors, shapes, composition suggest?

Describe what you SEE in an innovative way: find the extraordinary in ordinary details, imagine stories behind each visual element, create surprising connections between what you observe. Invite the reader to see this image in a completely new way.`,
      },
      tecnico: {
        es: `ANALIZA ESTA IMAGEN técnicamente como un experto en fotografía o arte visual.

Evalúa profesionalmente: ¿Cómo está la exposición? ¿Qué tipo de iluminación se usa (natural, artificial, dura, suave)? ¿Cuál es la profundidad de campo? ¿Qué ángulo y perspectiva se emplean? ¿Cómo es el balance de blancos y la saturación de colores?

Describe con precisión técnica lo que OBSERVAS: la composición específica, las características de la luz, la gama tonal, el enfoque, los valores de contraste. Incluye observaciones sobre técnica fotográfica o artística que esta imagen particular demuestra.`,
        en: `ANALYZE THIS IMAGE technically as a photography or visual arts expert.

Evaluate professionally: How is the exposure? What type of lighting is used (natural, artificial, hard, soft)? What is the depth of field? What angle and perspective are employed? How is the white balance and color saturation?

Describe with technical precision what you OBSERVE: the specific composition, lighting characteristics, tonal range, focus, contrast values. Include observations about photographic or artistic technique that this particular image demonstrates.`,
      },
    };

    const styleInstruction =
      styleInstructions[style]?.[language] || styleInstructions['narrativo'][language];

    const userPrompt =
      customPrompt ||
      (language === 'es'
        ? `${styleInstruction}

IMPORTANTE: Basa tu descripción ÚNICAMENTE en lo que puedes VER en esta imagen específica. Escribe ${maxLength} palabras aproximadamente en párrafos fluidos. NO incluyas títulos, encabezados ni listas. Solo texto descriptivo rico y expresivo.`
        : `${styleInstruction}

IMPORTANT: Base your description ONLY on what you can SEE in this specific image. Write approximately ${maxLength} words in flowing paragraphs. Do NOT include titles, headings, or lists. Only rich, expressive descriptive text.`);

    performanceTracker.mark('image_prepared');

    performanceLogger.info('Calling Claude API', {
      step: 'claude_api_call',
      model: CLAUDE_MODEL,
      maxTokens: CLAUDE_MAX_TOKENS,
      systemPromptLength: systemPrompt.length,
      userPromptLength: userPrompt.length,
    });

    performanceTracker.mark('api_call_start');

    // Call Claude with vision
    const response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: CLAUDE_MAX_TOKENS,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            imageContent,
            {
              type: 'text',
              text: userPrompt,
            },
          ],
        },
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
      throw new Error('No text content in Claude response');
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
      style,
    });

    return description;
  } catch (error: any) {
    const endTime = performance.now();
    const duration = endTime - startTime;

    performanceTracker.finish();

    // CRITICAL: Use console.error to ensure it appears in Vercel logs
    // eslint-disable-next-line no-console, custom-rules/require-logger
    console.error('[CLAUDE_ERROR] Vision description failed:', error?.message || String(error));
    // eslint-disable-next-line no-console, custom-rules/require-logger
    console.error('[CLAUDE_ERROR] Error type:', error?.constructor?.name);
    // eslint-disable-next-line no-console, custom-rules/require-logger
    console.error('[CLAUDE_ERROR] Status code:', error?.status);
    // eslint-disable-next-line no-console, custom-rules/require-logger
    console.error('[CLAUDE_ERROR] Error details:', error?.error);
    // eslint-disable-next-line no-console, custom-rules/require-logger
    console.error('[CLAUDE_ERROR] Duration:', `${duration.toFixed(2)}ms`);
    // eslint-disable-next-line no-console, custom-rules/require-logger
    console.error('[CLAUDE_ERROR] Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error || {})));

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
      errorCode: error.error?.type,
    });

    // Provide helpful error messages
    if (error.status === 401) {
      throw new Error('Invalid Anthropic API key - please check your configuration');
    } else if (error.status === 429) {
      throw new Error('Rate limit exceeded - please try again in a moment');
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
      throw new Error('Claude client not initialized - missing API key');
    }

    const { maxTokens = 2048, temperature = 0.7, stopSequences = [] } = options;

    performanceLogger.info('Starting Claude text completion', {
      step: 'completion_start',
      promptLength: prompt.length,
      hasSystemPrompt: !!systemPrompt,
      maxTokens,
      temperature,
    });

    const response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      system:
        systemPrompt || 'You are a helpful AI assistant specializing in Spanish language learning.',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
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

    performanceLogger.info('Claude completion finished', {
      step: 'completion_complete',
      duration: `${duration.toFixed(2)}ms`,
      inputTokens,
      outputTokens,
      totalTokens,
      estimatedCost: `$${estimatedCost.toFixed(4)}`,
      stopReason: response.stop_reason,
      completionLength: completion.length,
    });

    return completion;
  } catch (error: any) {
    const endTime = performance.now();
    const duration = endTime - startTime;

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
      statusCode: error.status,
    });

    throw error;
  }
}

/**
 * Generate Q&A from image description using Claude
 */
export async function generateClaudeQA(
  imageDescription: string,
  difficulty: 'facil' | 'medio' | 'dificil' = 'medio',
  count: number = 5,
  userApiKey?: string
): Promise<Array<{ question: string; answer: string; difficulty: string }>> {
  const difficultyMap = {
    facil: 'easy (A1-A2 CEFR level)',
    medio: 'intermediate (B1-B2 CEFR level)',
    dificil: 'advanced (C1-C2 CEFR level)',
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
      throw new Error('Failed to extract JSON from Claude response');
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
  difficulty: 'beginner' | 'intermediate' | 'advanced' = 'intermediate',
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
      throw new Error('Failed to extract JSON from Claude response');
    }

    const vocab = JSON.parse(jsonMatch[0]);
    return vocab;
  } catch (error) {
    apiLogger.error('Claude vocabulary extraction failed', error);
    throw error;
  }
}

// Export for server-side use
export { CLAUDE_MODEL, CLAUDE_MAX_TOKENS };
