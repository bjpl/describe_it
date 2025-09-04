import OpenAI from "openai";
import {
  DescriptionStyle,
  DescriptionRequest,
  APIError,
  RetryConfig,
} from "@/types/api";
import { vercelKvCache } from "./vercel-kv";

class OpenAIService {
  private client: OpenAI | null;
  private retryConfig: RetryConfig;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      // OPENAI_API_KEY not configured - demo mode enabled (structured logging)
      this.client = null; // Will use demo mode
      this.initializeDemoMode();
      return;
    }

    this.client = new OpenAI({
      apiKey,
      timeout: 60000, // 60 seconds
    });

    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffFactor: 2,
      retryCondition: (error: APIError) => {
        return error.status >= 500 || error.status === 429;
      },
    };
  }

  /**
   * Initialize demo mode
   */
  private initializeDemoMode(): void {
    // Demo mode initialized - will use demo responses
  }

  /**
   * Generate demo Q&A when API key is not available
   */
  private generateDemoQA(
    description: string,
    language: string = "es",
    count: number = 5,
  ): QAGeneration[] {
    const demoQA = {
      es: [
        {
          question:
            "¿Qué elementos principales puedes identificar en esta imagen?",
          answer:
            "En esta imagen se pueden identificar varios elementos visuales clave que incluyen colores, formas, texturas y composición general.",
          difficulty: "facil" as const,
          category: "Observación",
        },
        {
          question:
            "¿Cómo describirías la atmósfera o el ambiente de esta escena?",
          answer:
            "La atmósfera de la imagen transmite una sensación específica a través de la iluminación, los colores y la composición visual.",
          difficulty: "medio" as const,
          category: "Interpretación",
        },
        {
          question:
            "¿Qué técnicas fotográficas o artísticas observas en esta imagen?",
          answer:
            "Se pueden apreciar diversas técnicas como el uso de la luz, la profundidad de campo, la composición y el balance visual.",
          difficulty: "dificil" as const,
          category: "Técnica",
        },
        {
          question: "¿Qué emociones o sensaciones te transmite esta imagen?",
          answer:
            "La imagen puede evocar diferentes emociones dependiendo de los elementos visuales, colores y la narrativa visual presente.",
          difficulty: "medio" as const,
          category: "Emocional",
        },
        {
          question: "¿Cuál crees que es el mensaje o propósito de esta imagen?",
          answer:
            "El propósito puede ser artístico, narrativo, documental o expresivo, dependiendo del contexto y la intención del autor.",
          difficulty: "dificil" as const,
          category: "Análisis",
        },
      ],
      en: [
        {
          question: "What main elements can you identify in this image?",
          answer:
            "In this image, several key visual elements can be identified including colors, shapes, textures, and overall composition.",
          difficulty: "facil" as const,
          category: "Observation",
        },
        {
          question:
            "How would you describe the atmosphere or mood of this scene?",
          answer:
            "The atmosphere of the image conveys a specific feeling through lighting, colors, and visual composition.",
          difficulty: "medio" as const,
          category: "Interpretation",
        },
        {
          question:
            "What photographic or artistic techniques do you observe in this image?",
          answer:
            "Various techniques can be appreciated such as use of light, depth of field, composition, and visual balance.",
          difficulty: "dificil" as const,
          category: "Technique",
        },
        {
          question:
            "What emotions or sensations does this image convey to you?",
          answer:
            "The image can evoke different emotions depending on the visual elements, colors, and visual narrative present.",
          difficulty: "medio" as const,
          category: "Emotional",
        },
        {
          question:
            "What do you think is the message or purpose of this image?",
          answer:
            "The purpose could be artistic, narrative, documentary, or expressive, depending on context and author's intention.",
          difficulty: "dificil" as const,
          category: "Analysis",
        },
      ],
    };

    const langQA = demoQA[language as keyof typeof demoQA] || demoQA.es;
    return langQA.slice(0, count);
  }

  /**
   * Generate demo description when API key is not available
   */
  private generateDemoDescription(
    style: DescriptionStyle,
    imageUrl: string,
    language: string = "es",
  ): any {
    const demoDescriptions = {
      es: {
        narrativo:
          "Una hermosa imagen que captura un momento especial. Los colores vibrantes y la composición cuidadosa crean una atmósfera única que invita al espectador a perderse en los detalles de esta escena fascinante.",
        poetico:
          "Como versos escritos en luz y sombra, esta imagen susurra secretos al alma. Cada pixel es una palabra, cada color una estrofa en el poema visual que se despliega ante nosotros.",
        academico:
          "Esta imagen presenta una composición técnicamente sólida con elementos visuales bien balanceados. La utilización del espacio, la paleta cromática y la distribución de la luz demuestran una comprensión profunda de los principios fotográficos.",
        conversacional:
          '¡Wow! Esta imagen está genial. Me encanta cómo se ven los colores y toda la composición. Es de esas fotos que te hacen parar y pensar "ojalá yo hubiera estado ahí".',
        infantil:
          "¡Mira qué imagen tan bonita! Tiene muchos colores alegres y cosas divertidas para ver. Es como un cuento de hadas lleno de sorpresas y aventuras esperando ser descubiertas.",
      },
      en: {
        narrativo:
          "A beautiful image that captures a special moment. The vibrant colors and careful composition create a unique atmosphere that invites the viewer to get lost in the details of this fascinating scene.",
        poetico:
          "Like verses written in light and shadow, this image whispers secrets to the soul. Each pixel is a word, each color a stanza in the visual poem that unfolds before us.",
        academico:
          "This image presents a technically solid composition with well-balanced visual elements. The use of space, color palette, and light distribution demonstrate a deep understanding of photographic principles.",
        conversacional:
          'Wow! This image is great. I love how the colors look and the whole composition. It\'s one of those photos that makes you stop and think "I wish I had been there".',
        infantil:
          "Look at this beautiful image! It has many happy colors and fun things to see. It's like a fairy tale full of surprises and adventures waiting to be discovered.",
      },
    };

    const langDescriptions =
      demoDescriptions[language as keyof typeof demoDescriptions] ||
      demoDescriptions.es;
    const text = langDescriptions[style] || langDescriptions.narrativo;

    return {
      style,
      text,
      language,
      wordCount: text.split(/\s+/).length,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Check if running in demo mode
   */
  private isDemoMode(): boolean {
    return this.client === null;
  }

  /**
   * Retry wrapper for API calls
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig = this.retryConfig,
  ): Promise<T> {
    let lastError: APIError;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = this.transformError(error);

        if (
          attempt === config.maxRetries ||
          !config.retryCondition?.(lastError)
        ) {
          throw lastError;
        }

        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffFactor, attempt),
          config.maxDelay,
        );

        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private transformError(error: any): APIError {
    // Handle null/undefined errors
    if (!error) {
      return new APIError({
        code: "UNKNOWN_ERROR",
        message: "Unknown error occurred",
        status: 500,
        details: null,
      });
    }

    // Check if already an APIError instance
    if (
      error &&
      typeof error === "object" &&
      error.constructor &&
      error.constructor.name === "APIError"
    ) {
      return error;
    }

    let code = "OPENAI_ERROR";
    let message = "Unknown OpenAI error";
    let status = 500;

    // Safely extract message
    if (typeof error === "string") {
      message = error;
    } else if (error && typeof error === "object") {
      message = error.message || error.error?.message || message;

      // Handle status codes
      if (typeof error.status === "number") {
        status = error.status;

        switch (status) {
          case 400:
            code = "BAD_REQUEST";
            message = "Invalid request parameters";
            break;
          case 401:
            code = "UNAUTHORIZED";
            message = "Invalid API key";
            break;
          case 429:
            code = "RATE_LIMIT_EXCEEDED";
            message = "Rate limit exceeded";
            break;
          case 500:
            code = "SERVER_ERROR";
            message = "OpenAI server error";
            break;
        }
      }
    }

    return new APIError({
      code,
      message,
      status,
      details:
        error && typeof error === "object" ? error.error || error : error,
    });
  }

  /**
   * Get style-specific prompts for different description types
   */
  private getStylePrompt(
    style: DescriptionStyle,
    language: string = "es",
  ): string {
    const prompts = {
      es: {
        narrativo: `Crea una descripción narrativa rica y detallada que cuente la historia de lo que ocurre en la imagen. 
        Usa un lenguaje descriptivo y envolvente que permita al lector visualizar claramente la escena. 
        Incluye detalles sobre el ambiente, las emociones y la atmósfera.`,

        poetico: `Crea una descripción poética y artística de la imagen usando lenguaje figurativo, metáforas y un tono lírico. 
        Enfócate en despertar emociones y crear una experiencia sensorial a través de las palabras. 
        Usa recursos literarios como aliteración, ritmo y simbolismo.`,

        academico: `Proporciona una descripción técnica y objetiva de la imagen usando terminología precisa y formal. 
        Analiza la composición, elementos visuales, técnicas utilizadas y contexto histórico o cultural si es relevante. 
        Mantén un tono impersonal y científico.`,

        conversacional: `Describe la imagen como si estuvieras hablando con un amigo de manera casual y relajada. 
        Usa un lenguaje cotidiano, expresiones coloquiales y un tono cercano y amigable. 
        Incluye observaciones personales y comentarios espontáneos.`,

        infantil: `Crea una descripción simple y divertida perfecta para niños pequeños. 
        Usa palabras sencillas, frases cortas y un tono alegre y juguetón. 
        Incluye elementos que capturen la atención de los niños y fomenten su curiosidad.`,
      },
      en: {
        narrativo: `Create a rich and detailed narrative description that tells the story of what happens in the image. 
        Use descriptive and engaging language that allows the reader to clearly visualize the scene. 
        Include details about the environment, emotions, and atmosphere.`,

        poetico: `Create a poetic and artistic description of the image using figurative language, metaphors, and a lyrical tone. 
        Focus on awakening emotions and creating a sensory experience through words. 
        Use literary devices like alliteration, rhythm, and symbolism.`,

        academico: `Provide a technical and objective description of the image using precise and formal terminology. 
        Analyze the composition, visual elements, techniques used, and historical or cultural context if relevant. 
        Maintain an impersonal and scientific tone.`,

        conversacional: `Describe the image as if you were talking to a friend in a casual and relaxed way. 
        Use everyday language, colloquial expressions, and a close and friendly tone. 
        Include personal observations and spontaneous comments.`,

        infantil: `Create a simple and fun description perfect for young children. 
        Use simple words, short phrases, and a cheerful and playful tone. 
        Include elements that capture children's attention and encourage their curiosity.`,
      },
    };

    return (
      prompts[language as keyof typeof prompts]?.[style] || prompts.es[style]
    );
  }

  /**
   * Generate cache key for descriptions
   */
  private generateDescriptionCacheKey(
    imageUrl: string,
    style: DescriptionStyle,
    language: string,
  ): string {
    const urlHash = Buffer.from(imageUrl).toString("base64").slice(0, 16);
    return `openai:description:${style}:${language}:${urlHash}`;
  }

  /**
   * Generate description for an image in multiple styles
   */
  async generateDescription(
    request: DescriptionRequest,
  ): Promise<GeneratedDescription> {
    const { imageUrl, style, language = "es", maxLength = 300 } = request;

    // Return demo description if in demo mode
    if (this.isDemoMode()) {
      return this.generateDemoDescription(style, imageUrl, language);
    }

    const cacheKey = this.generateDescriptionCacheKey(
      imageUrl,
      style,
      language,
    );

    try {
      // Check cache first
      const cached = await vercelKvCache.get<GeneratedDescription>(cacheKey);
      if (cached) {
        return cached;
      }

      const stylePrompt = this.getStylePrompt(style, language);
      const lengthInstruction =
        language === "es"
          ? `La descripción debe tener aproximadamente ${maxLength} palabras.`
          : `The description should be approximately ${maxLength} words.`;

      const systemPrompt = `${stylePrompt} ${lengthInstruction}`;

      const response = await this.withRetry(async () => {
        return await this.client.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text:
                    language === "es"
                      ? "Describe esta imagen siguiendo el estilo indicado:"
                      : "Describe this image following the indicated style:",
                },
                {
                  type: "image_url",
                  image_url: {
                    url: imageUrl,
                    detail: "high",
                  },
                },
              ],
            },
          ],
          max_tokens: Math.ceil(maxLength * 1.5),
          temperature:
            style === "poetico" ? 0.9 : style === "academico" ? 0.3 : 0.7,
        });
      });

      const text = response.choices[0]?.message?.content || "";
      const wordCount = text.split(/\s+/).length;

      const description: GeneratedDescription = {
        style,
        text,
        language,
        wordCount,
        generatedAt: new Date().toISOString(),
      };

      // Cache for 24 hours
      await vercelKvCache.set(cacheKey, description, 86400);

      return description;
    } catch (error) {
      // Fallback to demo mode on error
      // OpenAI API error, falling back to demo mode (structured logging)
      return this.generateDemoDescription(style, imageUrl, language);
    }
  }

  /**
   * Generate Q&A pairs from a description
   */
  async generateQA(
    description: string,
    language: string = "es",
    count: number = 5,
  ): Promise<QAGeneration[]> {
    // Return demo Q&A if in demo mode
    if (this.isDemoMode()) {
      return this.generateDemoQA(description, language, count);
    }
    const cacheKey = `openai:qa:${Buffer.from(description).toString("base64").slice(0, 32)}:${language}:${count}`;

    try {
      // Check cache first
      const cached = await vercelKvCache.get<QAGeneration[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const prompt =
        language === "es"
          ? `Basándote en la siguiente descripción, genera ${count} pares de pregunta-respuesta educativos con diferentes niveles de dificultad. 
           Cada pregunta debe ser clara y la respuesta debe ser precisa y educativa.
           
           Clasifica cada pregunta como 'facil', 'medio', o 'dificil' según su complejidad.
           También asigna una categoría temática a cada pregunta.
           
           Descripción: ${description}
           
           Formato de respuesta como JSON array:
           [
             {
               "question": "pregunta aquí",
               "answer": "respuesta aquí", 
               "difficulty": "facil|medio|dificil",
               "category": "categoría temática"
             }
           ]`
          : `Based on the following description, generate ${count} educational question-answer pairs with different difficulty levels.
           Each question should be clear and the answer should be precise and educational.
           
           Classify each question as 'facil', 'medio', or 'dificil' according to its complexity.
           Also assign a thematic category to each question.
           
           Description: ${description}
           
           Response format as JSON array:
           [
             {
               "question": "question here",
               "answer": "answer here",
               "difficulty": "facil|medio|dificil", 
               "category": "thematic category"
             }
           ]`;

      const response = await this.withRetry(async () => {
        return await this.client.chat.completions.create({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content:
                "You are an educational content creator. Always respond with valid JSON format.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: 1500,
          temperature: 0.7,
        });
      });

      const content = response.choices[0]?.message?.content || "[]";

      try {
        const qaData = JSON.parse(content) as QAGeneration[];

        // Cache for 12 hours
        await vercelKvCache.set(cacheKey, qaData, 43200);

        return qaData;
      } catch (parseError) {
        throw new APIError("Failed to parse Q&A response", "PARSE_ERROR", 500, {
          content,
          parseError,
        });
      }
    } catch (error) {
      throw this.transformError(error);
    }
  }

  /**
   * Extract categorized phrases from a description
   */
  async extractPhrases(
    description: string,
    language: string = "es",
  ): Promise<PhraseCategories> {
    const cacheKey = `openai:phrases:${Buffer.from(description).toString("base64").slice(0, 32)}:${language}`;

    try {
      // Check cache first
      const cached = await vercelKvCache.get<PhraseCategories>(cacheKey);
      if (cached) {
        return cached;
      }

      const prompt =
        language === "es"
          ? `Extrae y categoriza palabras y frases clave de la siguiente descripción en estas categorías:
           - objetos: elementos físicos, cosas, items
           - acciones: verbos, actividades, movimientos
           - lugares: ubicaciones, espacios, ambientes
           - colores: colores mencionados o implícitos
           - emociones: sentimientos, estados de ánimo
           - conceptos: ideas abstractas, conceptos
           
           Descripción: ${description}
           
           Responde en formato JSON:
           {
             "objetos": ["lista", "de", "objetos"],
             "acciones": ["lista", "de", "acciones"],
             "lugares": ["lista", "de", "lugares"],
             "colores": ["lista", "de", "colores"],
             "emociones": ["lista", "de", "emociones"],
             "conceptos": ["lista", "de", "conceptos"]
           }`
          : `Extract and categorize key words and phrases from the following description in these categories:
           - objetos: physical elements, things, items
           - acciones: verbs, activities, movements
           - lugares: locations, spaces, environments
           - colores: mentioned or implicit colors
           - emociones: feelings, moods
           - conceptos: abstract ideas, concepts
           
           Description: ${description}
           
           Respond in JSON format:
           {
             "objetos": ["list", "of", "objects"],
             "acciones": ["list", "of", "actions"],
             "lugares": ["list", "of", "places"],
             "colores": ["list", "of", "colors"],
             "emociones": ["list", "of", "emotions"],
             "conceptos": ["list", "of", "concepts"]
           }`;

      const response = await this.withRetry(async () => {
        return await this.client.chat.completions.create({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content:
                "You are a linguistic analyzer. Always respond with valid JSON format.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: 800,
          temperature: 0.3,
        });
      });

      const content = response.choices[0]?.message?.content || "{}";

      try {
        const phrases = JSON.parse(content) as PhraseCategories;

        // Ensure all categories exist
        const defaultPhrases: PhraseCategories = {
          objetos: [],
          acciones: [],
          lugares: [],
          colores: [],
          emociones: [],
          conceptos: [],
        };

        const result = { ...defaultPhrases, ...phrases };

        // Cache for 24 hours
        await vercelKvCache.set(cacheKey, result, 86400);

        return result;
      } catch (parseError) {
        throw new APIError(
          "Failed to parse phrases response",
          "PARSE_ERROR",
          500,
          { content, parseError },
        );
      }
    } catch (error) {
      throw this.transformError(error);
    }
  }

  /**
   * Translate text between languages
   */
  async translateText(request: TranslationRequest): Promise<string> {
    const { text, fromLanguage, toLanguage } = request;
    const cacheKey = `openai:translate:${fromLanguage}-${toLanguage}:${Buffer.from(text).toString("base64").slice(0, 32)}`;

    try {
      // Check cache first
      const cached = await vercelKvCache.get<string>(cacheKey);
      if (cached) {
        return cached;
      }

      const prompt = `Translate the following text from ${fromLanguage} to ${toLanguage}. 
                     Maintain the original style, tone, and meaning as much as possible.
                     
                     Text to translate: ${text}`;

      const response = await this.withRetry(async () => {
        return await this.client.chat.completions.create({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content:
                "You are a professional translator. Provide accurate and natural translations.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: Math.ceil(text.length * 1.5),
          temperature: 0.3,
        });
      });

      const translation = response.choices[0]?.message?.content || "";

      // Cache for 7 days
      await vercelKvCache.set(cacheKey, translation, 604800);

      return translation;
    } catch (error) {
      throw this.transformError(error);
    }
  }

  /**
   * Generate multiple descriptions at once
   */
  async generateMultipleDescriptions(
    imageUrl: string,
    styles: DescriptionStyle[],
    language: string = "es",
    maxLength: number = 300,
  ): Promise<GeneratedDescription[]> {
    try {
      const promises = styles.map((style) =>
        this.generateDescription({ imageUrl, style, language, maxLength }),
      );

      const results = await Promise.allSettled(promises);

      return results
        .filter(
          (result): result is PromiseFulfilledResult<GeneratedDescription> =>
            result.status === "fulfilled",
        )
        .map((result) => result.value);
    } catch (error) {
      throw this.transformError(error);
    }
  }

  /**
   * Check if the service is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "user",
            content: 'Hello, this is a health check. Please respond with "OK".',
          },
        ],
        max_tokens: 10,
      });

      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const openAIService = new OpenAIService();
