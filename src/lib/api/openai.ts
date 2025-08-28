import OpenAI from 'openai';
import {
  DescriptionStyle,
  DescriptionRequest,
  GeneratedDescription,
  QAGeneration,
  PhraseCategories,
  TranslationRequest,
  APIError,
  RetryConfig
} from '../../types/api';
import { vercelKvCache } from './vercel-kv';

class OpenAIService {
  private client: OpenAI;
  private retryConfig: RetryConfig;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
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
   * Retry wrapper for API calls
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig = this.retryConfig
  ): Promise<T> {
    let lastError: APIError;
    
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = this.transformError(error);
        
        if (attempt === config.maxRetries || !config.retryCondition?.(lastError)) {
          throw lastError;
        }

        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffFactor, attempt),
          config.maxDelay
        );

        await this.sleep(delay);
      }
    }
    
    throw lastError!;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private transformError(error: any): APIError {
    if (error instanceof APIError) {
      return error;
    }

    let code = 'OPENAI_ERROR';
    let message = error.message || 'Unknown OpenAI error';
    let status = 500;

    if (error.status) {
      status = error.status;
      
      switch (status) {
        case 400:
          code = 'BAD_REQUEST';
          message = 'Invalid request parameters';
          break;
        case 401:
          code = 'UNAUTHORIZED';
          message = 'Invalid API key';
          break;
        case 429:
          code = 'RATE_LIMIT_EXCEEDED';
          message = 'Rate limit exceeded';
          break;
        case 500:
          code = 'SERVER_ERROR';
          message = 'OpenAI server error';
          break;
      }
    }

    return new APIError({
      code,
      message,
      status,
      details: error.error || error,
    });
  }

  /**
   * Get style-specific prompts for different description types
   */
  private getStylePrompt(style: DescriptionStyle, language: string = 'es'): string {
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
        Incluye elementos que capturen la atención de los niños y fomenten su curiosidad.`
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
        Include elements that capture children's attention and encourage their curiosity.`
      }
    };

    return prompts[language as keyof typeof prompts]?.[style] || prompts.es[style];
  }

  /**
   * Generate cache key for descriptions
   */
  private generateDescriptionCacheKey(imageUrl: string, style: DescriptionStyle, language: string): string {
    const urlHash = Buffer.from(imageUrl).toString('base64').slice(0, 16);
    return `openai:description:${style}:${language}:${urlHash}`;
  }

  /**
   * Generate description for an image in multiple styles
   */
  async generateDescription(request: DescriptionRequest): Promise<GeneratedDescription> {
    const { imageUrl, style, language = 'es', maxLength = 300 } = request;
    const cacheKey = this.generateDescriptionCacheKey(imageUrl, style, language);

    try {
      // Check cache first
      const cached = await vercelKvCache.get<GeneratedDescription>(cacheKey);
      if (cached) {
        return cached;
      }

      const stylePrompt = this.getStylePrompt(style, language);
      const lengthInstruction = language === 'es' 
        ? `La descripción debe tener aproximadamente ${maxLength} palabras.`
        : `The description should be approximately ${maxLength} words.`;

      const systemPrompt = `${stylePrompt} ${lengthInstruction}`;

      const response = await this.withRetry(async () => {
        return await this.client.chat.completions.create({
          model: 'gpt-4-vision-preview',
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: language === 'es' 
                    ? 'Describe esta imagen siguiendo el estilo indicado:'
                    : 'Describe this image following the indicated style:'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: imageUrl,
                    detail: 'high'
                  }
                }
              ]
            }
          ],
          max_tokens: Math.ceil(maxLength * 1.5),
          temperature: style === 'poetico' ? 0.9 : style === 'academico' ? 0.3 : 0.7,
        });
      });

      const text = response.choices[0]?.message?.content || '';
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
      throw this.transformError(error);
    }
  }

  /**
   * Generate Q&A pairs from a description
   */
  async generateQA(description: string, language: string = 'es', count: number = 5): Promise<QAGeneration[]> {
    const cacheKey = `openai:qa:${Buffer.from(description).toString('base64').slice(0, 32)}:${language}:${count}`;

    try {
      // Check cache first
      const cached = await vercelKvCache.get<QAGeneration[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const prompt = language === 'es' 
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
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are an educational content creator. Always respond with valid JSON format.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1500,
          temperature: 0.7,
        });
      });

      const content = response.choices[0]?.message?.content || '[]';
      
      try {
        const qaData = JSON.parse(content) as QAGeneration[];
        
        // Cache for 12 hours
        await vercelKvCache.set(cacheKey, qaData, 43200);
        
        return qaData;
      } catch (parseError) {
        throw new APIError({
          code: 'PARSE_ERROR',
          message: 'Failed to parse Q&A response',
          status: 500,
          details: { content, parseError }
        });
      }

    } catch (error) {
      throw this.transformError(error);
    }
  }

  /**
   * Extract categorized phrases from a description
   */
  async extractPhrases(description: string, language: string = 'es'): Promise<PhraseCategories> {
    const cacheKey = `openai:phrases:${Buffer.from(description).toString('base64').slice(0, 32)}:${language}`;

    try {
      // Check cache first
      const cached = await vercelKvCache.get<PhraseCategories>(cacheKey);
      if (cached) {
        return cached;
      }

      const prompt = language === 'es'
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
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are a linguistic analyzer. Always respond with valid JSON format.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 800,
          temperature: 0.3,
        });
      });

      const content = response.choices[0]?.message?.content || '{}';
      
      try {
        const phrases = JSON.parse(content) as PhraseCategories;
        
        // Ensure all categories exist
        const defaultPhrases: PhraseCategories = {
          objetos: [],
          acciones: [],
          lugares: [],
          colores: [],
          emociones: [],
          conceptos: []
        };
        
        const result = { ...defaultPhrases, ...phrases };
        
        // Cache for 24 hours
        await vercelKvCache.set(cacheKey, result, 86400);
        
        return result;
      } catch (parseError) {
        throw new APIError({
          code: 'PARSE_ERROR',
          message: 'Failed to parse phrases response',
          status: 500,
          details: { content, parseError }
        });
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
    const cacheKey = `openai:translate:${fromLanguage}-${toLanguage}:${Buffer.from(text).toString('base64').slice(0, 32)}`;

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
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are a professional translator. Provide accurate and natural translations.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: Math.ceil(text.length * 1.5),
          temperature: 0.3,
        });
      });

      const translation = response.choices[0]?.message?.content || '';
      
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
    language: string = 'es',
    maxLength: number = 300
  ): Promise<GeneratedDescription[]> {
    try {
      const promises = styles.map(style => 
        this.generateDescription({ imageUrl, style, language, maxLength })
      );

      const results = await Promise.allSettled(promises);
      
      return results
        .filter((result): result is PromiseFulfilledResult<GeneratedDescription> => 
          result.status === 'fulfilled'
        )
        .map(result => result.value);

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
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: 'Hello, this is a health check. Please respond with "OK".'
          }
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