import OpenAI from 'openai';
import { APIError, RetryConfig } from '@/types/api';
import { withRetry, RetryResult } from '@/lib/utils/error-retry';
import { getEnvironment } from '@/config/env';

interface StreamingOptions {
  onChunk?: (chunk: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: Error) => void;
}

interface CachedResponse {
  data: any;
  timestamp: number;
  ttl: number;
}

/**
 * Comprehensive OpenAI Service with streaming, caching, and error handling
 */
export class OpenAIService {
  private client: OpenAI | null = null;
  private cache = new Map<string, CachedResponse>();
  private retryConfig: RetryConfig;
  private rateLimitTracker = new Map<string, number[]>();
  private readonly maxCacheSize = 1000;
  private readonly defaultTTL = 3600000; // 1 hour in ms

  constructor() {
    this.initializeClient();
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffFactor: 2,
      shouldRetry: (error: Error) => {
        const message = error.message.toLowerCase();
        return (
          message.includes('503') ||
          message.includes('502') ||
          message.includes('429') ||
          message.includes('timeout')
        );
      },
    };
  }

  private initializeClient(): void {
    try {
      const env = getEnvironment();
      if (env.OPENAI_API_KEY) {
        this.client = new OpenAI({
          apiKey: env.OPENAI_API_KEY,
          timeout: 60000,
        });
      }
    } catch (error) {
      console.warn('OpenAI client initialization failed:', error);
      this.client = null;
    }
  }

  /**
   * Check if service is available
   */
  public isAvailable(): boolean {
    return this.client !== null;
  }

  /**
   * Generate description with caching and error handling
   */
  public async generateDescription(params: {
    imageUrl: string;
    style: string;
    language: string;
    maxLength: number;
  }): Promise<any> {
    const cacheKey = `desc_${params.imageUrl}_${params.style}_${params.language}`;
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    if (!this.isAvailable()) {
      return this.getDemoDescription(params);
    }

    try {
      const result = await withRetry(async () => {
        return await this.client!.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: this.getDescriptionSystemPrompt(params.style, params.language),
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: params.language === 'es' 
                    ? 'Describe esta imagen siguiendo el estilo indicado:'
                    : 'Describe this image following the indicated style:',
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: params.imageUrl,
                    detail: 'high',
                  },
                },
              ],
            },
          ],
          max_tokens: Math.ceil(params.maxLength * 1.5),
          temperature: this.getTemperatureForStyle(params.style),
        });
      }, this.retryConfig);

      if (result.success && result.data) {
        const text = result.data.choices[0]?.message?.content || '';
        const description = {
          style: params.style,
          text,
          language: params.language,
          wordCount: text.split(/\s+/).length,
          generatedAt: new Date().toISOString(),
        };
        
        this.setCache(cacheKey, description);
        return description;
      }
    } catch (error) {
      console.warn('OpenAI description generation failed:', error);
    }

    return this.getDemoDescription(params);
  }

  /**
   * Generate description with streaming support
   */
  public async generateDescriptionStream(
    params: {
      imageUrl: string;
      style: string;
      language: string;
      maxLength: number;
    },
    options: StreamingOptions = {}
  ): Promise<string> {
    if (!this.isAvailable()) {
      const demo = this.getDemoDescription(params);
      options.onComplete?.(demo.text);
      return demo.text;
    }

    try {
      const stream = await this.client!.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: this.getDescriptionSystemPrompt(params.style, params.language),
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: params.language === 'es' 
                  ? 'Describe esta imagen siguiendo el estilo indicado:'
                  : 'Describe this image following the indicated style:',
              },
              {
                type: 'image_url',
                image_url: {
                  url: params.imageUrl,
                  detail: 'high',
                },
              },
            ],
          },
        ],
        max_tokens: Math.ceil(params.maxLength * 1.5),
        temperature: this.getTemperatureForStyle(params.style),
        stream: true,
      });

      let fullText = '';
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullText += content;
          options.onChunk?.(content);
        }
      }

      options.onComplete?.(fullText);
      return fullText;
    } catch (error) {
      options.onError?.(error as Error);
      const demo = this.getDemoDescription(params);
      return demo.text;
    }
  }

  /**
   * Generate Q&A pairs
   */
  public async generateQA(description: string, language: string, count: number): Promise<any[]> {
    const cacheKey = `qa_${this.hashString(description)}_${language}_${count}`;
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    if (!this.isAvailable()) {
      return this.getDemoQA(description, language, count);
    }

    try {
      const result = await withRetry(async () => {
        return await this.client!.chat.completions.create({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are an educational content creator. Always respond with valid JSON format.',
            },
            {
              role: 'user',
              content: this.getQAPrompt(description, language, count),
            },
          ],
          max_tokens: 1500,
          temperature: 0.7,
          response_format: { type: "json_object" },
        });
      }, this.retryConfig);

      if (result.success && result.data) {
        const content = result.data.choices[0]?.message?.content || '{"questions":[]}';
        const parsed = JSON.parse(content);
        const qaData = parsed.questions || [];
        
        this.setCache(cacheKey, qaData);
        return qaData;
      }
    } catch (error) {
      console.warn('OpenAI Q&A generation failed:', error);
    }

    return this.getDemoQA(description, language, count);
  }

  /**
   * Extract phrases from description
   */
  public async extractPhrases(description: string, language: string): Promise<any> {
    const cacheKey = `phrases_${this.hashString(description)}_${language}`;
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    if (!this.isAvailable()) {
      return this.getDemoPhrases(language);
    }

    try {
      const result = await withRetry(async () => {
        return await this.client!.chat.completions.create({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are a linguistic analyzer. Always respond with valid JSON format.',
            },
            {
              role: 'user',
              content: this.getPhrasesPrompt(description, language),
            },
          ],
          max_tokens: 800,
          temperature: 0.3,
          response_format: { type: "json_object" },
        });
      }, this.retryConfig);

      if (result.success && result.data) {
        const content = result.data.choices[0]?.message?.content || '{}';
        const phrases = JSON.parse(content);
        
        const defaultPhrases = {
          objetos: [],
          acciones: [],
          lugares: [],
          colores: [],
          emociones: [],
          conceptos: [],
        };
        
        const result = { ...defaultPhrases, ...phrases };
        this.setCache(cacheKey, result);
        return result;
      }
    } catch (error) {
      console.warn('OpenAI phrase extraction failed:', error);
    }

    return this.getDemoPhrases(language);
  }

  /**
   * Translate text
   */
  public async translateText(params: {
    text: string;
    fromLanguage: string;
    toLanguage: string;
  }): Promise<string> {
    const cacheKey = `translate_${this.hashString(params.text)}_${params.fromLanguage}_${params.toLanguage}`;
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    if (!this.isAvailable()) {
      return `${params.text} [translation not available]`;
    }

    try {
      const result = await withRetry(async () => {
        return await this.client!.chat.completions.create({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are a professional translator. Provide accurate and natural translations.',
            },
            {
              role: 'user',
              content: `Translate the following text from ${params.fromLanguage} to ${params.toLanguage}. Only return the translation, no explanations.\n\n${params.text}`,
            },
          ],
          max_tokens: Math.ceil(params.text.length * 1.5),
          temperature: 0.3,
        });
      }, this.retryConfig);

      if (result.success && result.data) {
        const translation = result.data.choices[0]?.message?.content || params.text;
        this.setCache(cacheKey, translation, 604800000); // 7 days
        return translation;
      }
    } catch (error) {
      console.warn('OpenAI translation failed:', error);
    }

    return `${params.text} [translation not available]`;
  }

  // Private helper methods
  private getDescriptionSystemPrompt(style: string, language: string): string {
    const prompts = {
      es: {
        narrativo: 'Crea una descripción narrativa rica y detallada que cuente la historia de lo que ocurre en la imagen.',
        poetico: 'Crea una descripción poética y artística usando lenguaje figurativo y metáforas.',
        academico: 'Proporciona una descripción técnica y objetiva usando terminología precisa y formal.',
        conversacional: 'Describe la imagen como si estuvieras hablando con un amigo de manera casual.',
        infantil: 'Crea una descripción simple y divertida perfecta para niños pequeños.',
      },
      en: {
        narrativo: 'Create a rich and detailed narrative description that tells the story of what happens in the image.',
        poetico: 'Create a poetic and artistic description using figurative language and metaphors.',
        academico: 'Provide a technical and objective description using precise and formal terminology.',
        conversacional: 'Describe the image as if you were talking to a friend casually.',
        infantil: 'Create a simple and fun description perfect for young children.',
      },
    };

    return prompts[language as keyof typeof prompts]?.[style as keyof typeof prompts.es] ||
           prompts.es.narrativo;
  }

  private getTemperatureForStyle(style: string): number {
    const temperatures = {
      poetico: 0.9,
      academico: 0.3,
      narrativo: 0.7,
      conversacional: 0.8,
      infantil: 0.8,
    };
    return temperatures[style as keyof typeof temperatures] || 0.7;
  }

  private getQAPrompt(description: string, language: string, count: number): string {
    return language === 'es'
      ? `Basándote en la siguiente descripción, genera ${count} pares de pregunta-respuesta educativos con diferentes niveles de dificultad.\n\nDescripción: ${description}\n\nResponde en formato JSON: {"questions": [{"question": "pregunta", "answer": "respuesta", "difficulty": "facil|medio|dificil", "category": "categoría"}]}`
      : `Based on the following description, generate ${count} educational question-answer pairs with different difficulty levels.\n\nDescription: ${description}\n\nRespond in JSON format: {"questions": [{"question": "question", "answer": "answer", "difficulty": "facil|medio|dificil", "category": "category"}]}`;
  }

  private getPhrasesPrompt(description: string, language: string): string {
    return language === 'es'
      ? `Extrae y categoriza palabras clave de: ${description}\n\nRespuesta JSON: {"objetos": [], "acciones": [], "lugares": [], "colores": [], "emociones": [], "conceptos": []}`
      : `Extract and categorize key words from: ${description}\n\nJSON response: {"objetos": [], "acciones": [], "lugares": [], "colores": [], "emociones": [], "conceptos": []}`;
  }

  private getDemoDescription(params: any) {
    const demoTexts = {
      es: 'Una imagen fascinante que captura elementos visuales únicos con una composición cuidadosa y colores vibrantes.',
      en: 'A fascinating image that captures unique visual elements with careful composition and vibrant colors.',
    };
    
    return {
      style: params.style,
      text: demoTexts[params.language as keyof typeof demoTexts] || demoTexts.es,
      language: params.language,
      wordCount: 15,
      generatedAt: new Date().toISOString(),
    };
  }

  private getDemoQA(description: string, language: string, count: number): any[] {
    const demoQA = {
      es: [
        { question: '¿Qué elementos observas en la imagen?', answer: 'Se observan varios elementos visuales interesantes.', difficulty: 'facil', category: 'Observación' },
        { question: '¿Cómo describirías el ambiente?', answer: 'El ambiente transmite una sensación específica.', difficulty: 'medio', category: 'Interpretación' },
      ],
      en: [
        { question: 'What elements do you observe in the image?', answer: 'Several interesting visual elements can be observed.', difficulty: 'facil', category: 'Observation' },
        { question: 'How would you describe the atmosphere?', answer: 'The atmosphere conveys a specific feeling.', difficulty: 'medio', category: 'Interpretation' },
      ],
    };
    
    return (demoQA[language as keyof typeof demoQA] || demoQA.es).slice(0, count);
  }

  private getDemoPhrases(language: string) {
    return {
      objetos: ['imagen', 'elemento', 'color'],
      acciones: ['observar', 'capturar', 'mostrar'],
      lugares: ['escena', 'ambiente', 'espacio'],
      colores: ['vibrante', 'brillante', 'suave'],
      emociones: ['fascinante', 'interesante', 'atractivo'],
      conceptos: ['composición', 'técnica', 'estilo'],
    };
  }

  // Cache management
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() > cached.timestamp + cached.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  private setCache(key: string, data: any, ttl: number = this.defaultTTL): void {
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Health check
   */
  public async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    if (!this.isAvailable()) {
      return { healthy: false, error: 'OpenAI client not configured' };
    }

    try {
      const response = await this.client!.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5,
      });
      
      return { healthy: true };
    } catch (error) {
      return { healthy: false, error: (error as Error).message };
    }
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  public getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      usage: (this.cache.size / this.maxCacheSize) * 100,
    };
  }
}

// Export singleton instance
export const openAIService = new OpenAIService();
export default openAIService;
