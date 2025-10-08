import OpenAI from "openai";
import {
  DescriptionStyle,
  DescriptionRequest,
  APIError,
  RetryConfig,
  QAGeneration,
  GeneratedDescription,
  PhraseCategories,
  TranslationRequest,
} from "../../types/api";
import { vercelKvCache } from "./vercel-kv";
import { apiKeyProvider } from "./keyProvider";
import { safeParse, safeStringify } from "@/lib/utils/json-safe";
import { apiLogger } from '@/lib/logger';

class OpenAIService {
  private client: OpenAI | null = null;
  private retryConfig: RetryConfig;
  private isValidApiKey: boolean = false;
  private currentApiKey: string = '';
  private keyUpdateUnsubscribe: (() => void) | null = null;

  constructor() {
    // Initialize retryConfig first
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffFactor: 2,
      retryCondition: (error: APIError) => {
        return error.status >= 500 || error.status === 429;
      },
    };

    // Only initialize if we're on the server
    if (typeof window === 'undefined') {
      this.initializeWithKeyProvider();
      this.setupKeyUpdateListener();
    } else {
      apiLogger.warn('[OpenAIService] Running in browser environment - service will use server API routes');
      this.client = null;
      this.isValidApiKey = false;
    }
  }

  /**
   * Initialize service with current key from provider with enhanced error handling
   */
  private initializeWithKeyProvider(): void {
    let config;
    
    try {
      config = apiKeyProvider.getServiceConfig('openai');
    } catch (configError) {
      apiLogger.error('[OpenAIService] Failed to get service config:', configError);
      this.client = null;
      this.isValidApiKey = false;
      this.initializeDemoMode();
      return;
    }
    
    if (!config) {
      apiLogger.error('[OpenAIService] No service config returned');
      this.client = null;
      this.isValidApiKey = false;
      this.initializeDemoMode();
      return;
    }
    
    this.currentApiKey = config.apiKey || '';

    if (process.env.NODE_ENV !== 'production') {
      apiLogger.info('[OpenAIService] Initializing with keyProvider:', {
        hasKey: !!this.currentApiKey,
        keyLength: this.currentApiKey?.length || 0,
        keyPrefix: this.currentApiKey ? this.currentApiKey.substring(0, 6) + '...' : 'none',
        isDemo: config.isDemo,
        source: config.source,
        isValid: config.isValid,
        keyPattern: this.currentApiKey ? (this.currentApiKey.startsWith('sk-proj-') ? 'sk-proj-*' : this.currentApiKey.startsWith('sk-') ? 'sk-*' : 'unknown') : 'none'
      });
    }

    // First check if we have a valid API key before falling back to demo mode
    if (!this.currentApiKey || !this.validateApiKey(this.currentApiKey)) {
      apiLogger.warn('[OpenAIService] API key not found or invalid format. Using demo mode.', {
        hasKey: !!this.currentApiKey,
        keyLength: this.currentApiKey?.length || 0,
        validationResult: this.currentApiKey ? this.validateApiKey(this.currentApiKey) : false,
        reason: !this.currentApiKey ? 'no_key' : 'invalid_format',
        configSource: config.source
      });
      this.client = null;
      this.isValidApiKey = false;
      this.initializeDemoMode();
      return;
    }

    // Key exists and has valid format, initialize client
    if (process.env.NODE_ENV !== 'production') {
      apiLogger.info('[OpenAIService] Valid API key detected, initializing OpenAI client', {
        keyLength: this.currentApiKey.length,
        keyPrefix: this.currentApiKey.substring(0, 6) + '...',
        source: config.source
      });
    }
    
    try {
      this.initializeClient();
    } catch (initError) {
      apiLogger.error('[OpenAIService] Failed to initialize client:', initError);
      this.client = null;
      this.isValidApiKey = false;
      this.initializeDemoMode();
    }
  }

  /**
   * Initialize OpenAI client with current key
   */
  private initializeClient(): void {
    // CRITICAL: Only initialize OpenAI client on the server side
    // The OpenAI SDK blocks browser initialization for security
    if (typeof window !== 'undefined') {
      apiLogger.warn('[OpenAIService] Skipping client initialization in browser environment');
      this.client = null;
      this.isValidApiKey = false;
      return;
    }

    if (!this.currentApiKey) {
      apiLogger.error('[OpenAIService] Cannot initialize client: no API key available');
      this.client = null;
      this.isValidApiKey = false;
      return;
    }

    if (!this.validateApiKey(this.currentApiKey)) {
      apiLogger.error('[OpenAIService] Cannot initialize client: API key validation failed');
      this.client = null;
      this.isValidApiKey = false;
      return;
    }

    try {
      // Only create the OpenAI client in server environment
      this.client = new OpenAI({
        apiKey: this.currentApiKey,
        timeout: 60000, // 60 seconds
        maxRetries: 0, // We handle retries manually
        dangerouslyAllowBrowser: false, // Explicitly disable browser usage
      });

      this.isValidApiKey = true;
      
      apiLogger.info('[OpenAIService] OpenAI client successfully initialized (server-side)', {
        hasClient: !!this.client,
        isValidApiKey: this.isValidApiKey,
        keyType: this.currentApiKey.startsWith('sk-proj-') ? 'project' : 'standard',
        environment: 'server'
      });
    } catch (error) {
      apiLogger.error('[OpenAIService] Failed to initialize OpenAI client:', error);
      this.client = null;
      this.isValidApiKey = false;
    }
  }

  /**
   * Setup listener for key updates from keyProvider with enhanced error handling
   */
  private setupKeyUpdateListener(): void {
    try {
      this.keyUpdateUnsubscribe = apiKeyProvider.addListener((keys) => {
        try {
          const newKey = keys?.openai || '';
          
          if (newKey !== this.currentApiKey) {
            apiLogger.info('[OpenAIService] Key updated, reinitializing service', {
              hadPreviousKey: !!this.currentApiKey,
              hasNewKey: !!newKey,
              keyChanged: true
            });
            
            this.currentApiKey = newKey;
            
            // Clear any existing client
            this.client = null;
            this.isValidApiKey = false;
            
            // Reinitialize with new key
            try {
              const config = apiKeyProvider.getServiceConfig('openai');
              if (config.isDemo || !config.isValid) {
                this.initializeDemoMode();
              } else {
                this.initializeClient();
              }
            } catch (reinitError) {
              apiLogger.error('[OpenAIService] Failed to reinitialize after key update:', reinitError);
              this.initializeDemoMode();
            }
          }
        } catch (listenerError) {
          apiLogger.error('[OpenAIService] Error in key update listener:', listenerError);
        }
      });
    } catch (setupError) {
      apiLogger.error('[OpenAIService] Failed to setup key update listener:', setupError);
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

  /**
   * Validate OpenAI API key format and security
   */
  private validateApiKey(apiKey: string | undefined): boolean {
    if (!apiKey || typeof apiKey !== 'string') {
      apiLogger.warn('[OpenAIService] API key validation failed: missing or invalid type', {
        hasKey: !!apiKey,
        type: typeof apiKey
      });
      return false;
    }

    // Check API key format (OpenAI keys start with 'sk-' or 'sk-proj-')
    if (!apiKey.startsWith('sk-')) {
      apiLogger.error('[OpenAIService] API key validation failed: invalid format', {
        keyPrefix: apiKey.substring(0, 5),
        expectedFormat: 'sk-* or sk-proj-*'
      });
      return false;
    }

    // Modern OpenAI keys can be VERY long (150-200+ characters)
    // Only check for minimum reasonable length, no maximum
    const minLength = 20;

    if (apiKey.length < minLength) {
      apiLogger.error('[OpenAIService] API key validation failed: too short', {
        keyLength: apiKey.length,
        expectedMinLength: minLength
      });
      return false;
    }
    
    // Use consistent regex pattern with keyProvider
    const keyPattern = /^sk-(proj-)?[a-zA-Z0-9_-]{20,}$/;
    if (!keyPattern.test(apiKey)) {
      apiLogger.error('[OpenAIService] API key validation failed: invalid format pattern', {
        keyLength: apiKey.length,
        keyPrefix: apiKey.substring(0, 8) + '...'
      });
      return false;
    }
    
    // Accept any length above minimum - keys can be 164+ characters
    if (process.env.NODE_ENV !== 'production') {
      apiLogger.info('[OpenAIService] API key validation passed', {
        keyLength: apiKey.length,
        keyType: apiKey.startsWith('sk-proj-') ? 'project' : 'standard'
      });
    }

    // Check for placeholder or example keys
    const invalidPlaceholders = [
      'sk-your-openai-api-key-here',
      'sk-example',
      'sk-placeholder',
      'sk-demo',
      'sk-test',
      'sk-proj-example',
      'sk-proj-demo',
      'sk-proj-test'
    ];

    if (invalidPlaceholders.some(placeholder => apiKey.toLowerCase().includes(placeholder.toLowerCase()))) {
      if (process.env.NODE_ENV !== 'production') {
        apiLogger.error('[OpenAIService] API key validation failed: placeholder detected', {
          keyPrefix: apiKey.substring(0, 6) + '...'
        });
      }
      return false;
    }

    // Additional security: check for obvious patterns that shouldn't be in API keys
    const suspiciousPatterns = /[<>"'`\\]/;
    if (suspiciousPatterns.test(apiKey)) {
      if (process.env.NODE_ENV !== 'production') {
        apiLogger.error('[OpenAIService] API key validation failed: suspicious characters', {
          keyPrefix: apiKey.substring(0, 6) + '...'
        });
      }
      return false;
    }

    if (process.env.NODE_ENV !== 'production') {
      apiLogger.info('[OpenAIService] API key validation passed', {
        keyLength: apiKey.length,
        keyType: apiKey.startsWith('sk-proj-') ? 'project' : 'standard',
        keyPrefix: apiKey.substring(0, 6) + '...'
      });
    }

    return true;
  }

  /**
   * Initialize demo mode with enhanced logging
   */
  private initializeDemoMode(): void {
    apiLogger.info('[OpenAIService] Initializing demo mode', {
      reason: 'API key unavailable or invalid',
      hasCurrentKey: !!this.currentApiKey,
      keyLength: this.currentApiKey?.length || 0,
      environment: typeof window === 'undefined' ? 'server' : 'client',
      timestamp: new Date().toISOString()
    });
    
    // Ensure client state is properly cleared
    this.client = null;
    this.isValidApiKey = false;
    
    // Log demo mode capabilities
    apiLogger.info('[OpenAIService] Demo mode active - will use fallback responses for:', {
      capabilities: [
        'generateDescription',
        'generateQA', 
        'extractPhrases',
        'translateText',
        'generateMultipleDescriptions'
      ]
    });
  }

  /**
   * Check if API key is valid and service is properly configured
   */
  public isConfiguredSecurely(): boolean {
    return this.isValidApiKey && this.client !== null;
  }

  /**
   * Force refresh the service with latest keys
   */
  public refreshService(): void {
    apiLogger.info('[OpenAIService] Force refreshing service');
    // Force the key provider to refresh
    apiKeyProvider.refreshKeys();
    // Reinitialize with latest keys
    this.initializeWithKeyProvider();
  }

  /**
   * Generate demo Q&A when API key is not available
   */
  private generateDemoQA(
    description: string,
    language: string = "es",
    count: number = 5,
  ): QAGeneration[] {
    // Extract key information from the description to generate relevant Q&A
    const sentences = description.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const words = description.toLowerCase().split(/\s+/);
    
    // Find objects, colors, actions, and locations mentioned in the description
    const objects = words.filter(w => w.length > 4 && !w.includes("que") && !w.includes("para"));
    const hasNumbers = /\d+/.test(description);
    const hasColors = /rojo|azul|verde|amarillo|negro|blanco|gris|marrón|naranja|rosa|púrpura|red|blue|green|yellow|black|white|gray|brown|orange|pink|purple/i.test(description);
    
    // Generate content-based questions
    const contentQA = {
      es: [
        {
          question: `¿Qué objetos o elementos específicos se mencionan en la descripción?`,
          answer: sentences[0] || "La descripción menciona varios elementos visuales importantes que forman parte de la escena.",
          difficulty: "facil" as const,
          category: "Identificación",
        },
        {
          question: hasColors 
            ? "¿Qué colores se observan en la imagen según la descripción?"
            : "¿Cuáles son las características visuales principales descritas?",
          answer: sentences[1] || "Las características visuales incluyen elementos diversos que componen la escena.",
          difficulty: "facil" as const,
          category: "Observación",
        },
        {
          question: hasNumbers
            ? "¿Cuántos elementos o cantidades se mencionan en la descripción?"
            : "¿Cómo están organizados los elementos en la escena?",
          answer: sentences[2] || "Los elementos están dispuestos de manera que crean una composición visual interesante.",
          difficulty: "medio" as const,
          category: "Detalles",
        },
        {
          question: "¿Qué actividad o acción principal ocurre en la escena descrita?",
          answer: this.extractActionFromDescription(description, "es"),
          difficulty: "medio" as const,
          category: "Acciones",
        },
        {
          question: "¿En qué lugar o ambiente se desarrolla la escena?",
          answer: this.extractLocationFromDescription(description, "es"),
          difficulty: "dificil" as const,
          category: "Contexto",
        },
        {
          question: "¿Qué detalles específicos hacen única esta imagen?",
          answer: sentences[Math.min(3, sentences.length - 1)] || "La imagen presenta características distintivas en su composición y elementos.",
          difficulty: "dificil" as const,
          category: "Análisis",
        },
      ],
      en: [
        {
          question: "What specific objects or elements are mentioned in the description?",
          answer: sentences[0] || "The description mentions several important visual elements that are part of the scene.",
          difficulty: "facil" as const,
          category: "Identification",
        },
        {
          question: hasColors
            ? "What colors are observed in the image according to the description?"
            : "What are the main visual characteristics described?",
          answer: sentences[1] || "The visual characteristics include various elements that compose the scene.",
          difficulty: "facil" as const,
          category: "Observation",
        },
        {
          question: hasNumbers
            ? "How many elements or quantities are mentioned in the description?"
            : "How are the elements organized in the scene?",
          answer: sentences[2] || "The elements are arranged in a way that creates an interesting visual composition.",
          difficulty: "medio" as const,
          category: "Details",
        },
        {
          question: "What main activity or action occurs in the described scene?",
          answer: this.extractActionFromDescription(description, "en"),
          difficulty: "medio" as const,
          category: "Actions",
        },
        {
          question: "Where does the scene take place or what is the setting?",
          answer: this.extractLocationFromDescription(description, "en"),
          difficulty: "dificil" as const,
          category: "Context",
        },
        {
          question: "What specific details make this image unique?",
          answer: sentences[Math.min(3, sentences.length - 1)] || "The image presents distinctive features in its composition and elements.",
          difficulty: "dificil" as const,
          category: "Analysis",
        },
      ],
    };

    const langQA = contentQA[language as keyof typeof contentQA] || contentQA.es;
    return langQA.slice(0, count);
  }

  /**
   * Extract action information from description
   */
  private extractActionFromDescription(description: string, language: string): string {
    const verbs = description.match(/\b\w+(ando|iendo|ing|ed|s)\b/gi) || [];
    if (verbs.length > 0) {
      return language === "es" 
        ? `Se observan acciones como ${verbs.slice(0, 2).join(", ")} en la escena.`
        : `Actions such as ${verbs.slice(0, 2).join(", ")} can be observed in the scene.`;
    }
    return language === "es"
      ? "La escena muestra una situación o momento específico capturado en la imagen."
      : "The scene shows a specific situation or moment captured in the image.";
  }

  /**
   * Extract location information from description
   */
  private extractLocationFromDescription(description: string, language: string): string {
    const locationWords = description.match(/\b(en|at|in|dentro|fuera|sobre|bajo|cerca|lejos|interior|exterior|inside|outside|near|far)\s+\w+/gi) || [];
    if (locationWords.length > 0 && locationWords[0]) {
      return language === "es"
        ? `La escena se desarrolla ${locationWords[0].toLowerCase()}.`
        : `The scene takes place ${locationWords[0].toLowerCase()}.`;
    }
    return language === "es"
      ? "El entorno muestra un espacio con características particulares descritas en la imagen."
      : "The setting shows a space with particular characteristics described in the image.";
  }

  /**
   * Generate demo description when API key is not available
   */
  private generateDemoDescription(
    style: DescriptionStyle,
    imageUrl: string,
    language: string = "es",
  ): GeneratedDescription {
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
    const demoMode = this.client === null || !this.isValidApiKey;
    
    if (demoMode) {
      apiLogger.warn('[OpenAIService] Currently in demo mode', {
        hasClient: !!this.client,
        isValidApiKey: this.isValidApiKey,
        hasCurrentApiKey: !!this.currentApiKey,
        keyLength: this.currentApiKey?.length || 0
      });
    }
    
    return demoMode;
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

  private transformError(error: unknown): APIError {
    // Handle null/undefined errors
    if (!error) {
      return new APIError({
        code: "UNKNOWN_ERROR",
        message: "Unknown error occurred",
        status: 500,
        details: undefined,
      });
    }

    // Check if already an APIError instance
    if (
      error &&
      typeof error === "object" &&
      error.constructor &&
      error.constructor.name === "APIError"
    ) {
      return error as APIError;
    }

    let code = "OPENAI_ERROR";
    let message = "Unknown OpenAI error";
    let status = 500;

    // Safely extract message
    if (typeof error === "string") {
      message = error;
    } else if (error && typeof error === "object") {
      const errorObj = error as Record<string, unknown>;
      const errorMessage = errorObj.message;
      const nestedError = errorObj.error;

      if (typeof errorMessage === "string") {
        message = errorMessage;
      } else if (nestedError && typeof nestedError === "object") {
        const nestedMessage = (nestedError as Record<string, unknown>).message;
        if (typeof nestedMessage === "string") {
          message = nestedMessage;
        }
      }

      // Handle status codes
      if (typeof errorObj.status === "number") {
        status = errorObj.status;

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

    const details = error && typeof error === "object"
      ? ((error as Record<string, unknown>).error as Record<string, unknown>) || (error as Record<string, unknown>)
      : {};

    return new APIError({
      code,
      message,
      status,
      details: details as Record<string, unknown>,
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
        narrativo: `OBJETIVO EDUCATIVO: Enseñar español a través de una descripción narrativa rica en vocabulario y estructuras gramaticales variadas.
        
        Crea una descripción narrativa detallada que cuente la historia de lo que ocurre en la imagen.
        IMPORTANTE PARA EL APRENDIZAJE:
        • Usa una mezcla equilibrada de tiempos verbales (presente, pasado, futuro condicional)
        • Incluye al menos 10-15 vocabulario clave útil para estudiantes de español
        • Incorpora expresiones idiomáticas comunes pero comprensibles
        • Usa conectores narrativos (mientras, sin embargo, además, por lo tanto)
        • Describe colores, formas, emociones y acciones con adjetivos variados
        • Incluye al menos 3-4 frases con subjuntivo de manera natural
        • Mantén las oraciones claras pero con estructuras variadas`,

        poetico: `OBJETIVO EDUCATIVO: Enseñar español avanzado a través de lenguaje figurativo y expresiones artísticas.
        
        Crea una descripción poética de la imagen que sea educativa y artística.
        IMPORTANTE PARA EL APRENDIZAJE:
        • Usa metáforas y símiles accesibles para estudiantes intermedios
        • Incluye vocabulario poético pero explica su significado a través del contexto
        • Usa gerundios y participios de manera expresiva
        • Incorpora al menos 5 adjetivos descriptivos poco comunes pero útiles
        • Emplea estructuras como "como si + subjuntivo" y "tal vez + subjuntivo"
        • Incluye sonoridad y ritmo sin sacrificar claridad
        • Usa vocabulario sensorial (vista, oído, tacto, olfato, gusto)`,

        academico: `OBJETIVO EDUCATIVO: Enseñar español formal y técnico con vocabulario académico y estructuras complejas.
        
        Proporciona una descripción analítica y objetiva de la imagen.
        IMPORTANTE PARA EL APRENDIZAJE:
        • Usa vocabulario académico y técnico con definiciones contextuales
        • Emplea la voz pasiva y pasiva refleja apropiadamente
        • Incluye estructuras subordinadas complejas
        • Usa conectores académicos (no obstante, asimismo, por consiguiente)
        • Incorpora términos de análisis visual (composición, perspectiva, contraste)
        • Usa el presente atemporal para descripciones generales
        • Incluye al menos 5 términos especializados con contexto claro
        • Mantén precisión terminológica sin ser inaccesible`,

        conversacional: `OBJETIVO EDUCATIVO: Enseñar español coloquial y expresiones cotidianas útiles para conversación diaria.
        
        Describe la imagen como en una conversación amistosa y natural.
        IMPORTANTE PARA EL APRENDIZAJE:
        • Usa expresiones coloquiales comunes con su significado claro por contexto
        • Incluye muletillas naturales (bueno, pues, mira, oye, ¿sabes?)
        • Usa contracciones comunes (pa' = para, ta' = está) con moderación
        • Incorpora al menos 10 expresiones idiomáticas de uso diario
        • Usa el presente continuo y perífrasis verbales frecuentes
        • Incluye preguntas retóricas y exclamaciones naturales
        • Mezcla registro informal con vocabulario descriptivo útil
        • Emplea modismos regionales comunes con contexto claro`,

        infantil: `OBJETIVO EDUCATIVO: Enseñar español básico con vocabulario fundamental y estructuras simples pero correctas.
        
        Crea una descripción alegre y sencilla perfecta para principiantes.
        IMPORTANTE PARA EL APRENDIZAJE:
        • Usa vocabulario básico de alta frecuencia (colores, números, familia, animales)
        • Repite palabras clave para reforzar el aprendizaje
        • Usa principalmente presente simple y presente continuo
        • Incluye onomatopeyas y sonidos descriptivos con su significado
        • Emplea diminutivos y aumentativos de manera educativa
        • Usa frases cortas pero gramaticalmente correctas
        • Include comparaciones simples (más que, menos que, tan... como)
        • Incorpora preguntas simples para fomentar participación`,
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

    if (process.env.NODE_ENV !== 'production') {
      apiLogger.info('[OpenAI] generateDescription called:', {
        hasImageUrl: !!imageUrl,
        imageUrlType: imageUrl?.startsWith('data:') ? 'base64' : 'url',
        style,
        language,
        isDemoMode: this.isDemoMode(),
        hasClient: !!this.client,
        isValidApiKey: this.isValidApiKey
      });
    }

    // Return demo description if in demo mode
    if (this.isDemoMode()) {
      apiLogger.warn('[OpenAI] Running in DEMO MODE - no real vision analysis will occur');
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

      if (process.env.NODE_ENV !== 'production') {
        apiLogger.info('[OpenAI] Calling GPT-4 Vision with:', {
          model: 'gpt-4o',
          style,
          language,
          temperature: style === "poetico" ? 0.9 : style === "academico" ? 0.3 : 0.7,
          imageUrlLength: imageUrl?.length,
          systemPromptPreview: systemPrompt.substring(0, 100) + '...'
        });
      }

      const response = await this.withRetry(async () => {
        if (!this.client) {
          throw new APIError({
            code: "NO_CLIENT",
            message: "OpenAI client not initialized",
            status: 500,
            details: undefined,
          });
        }
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
      // Log the actual error for debugging
      apiLogger.error('[OpenAI] generateDescription error:', {
        error: error instanceof Error ? error.message : error,
        isDemoMode: this.isDemoMode(),
        hasClient: !!this.client,
        imageUrlLength: imageUrl?.length,
        style,
        language
      });
      
      // Fallback to demo mode on error
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
          ? `OBJETIVO: Crear preguntas de comprensión lectora que evalúen el entendimiento del español y el contenido de la imagen.

           Basándote en la siguiente descripción en español, genera ${count} pares de pregunta-respuesta que:
           
           REQUISITOS EDUCATIVOS:
           • Las preguntas FÁCILES deben evaluar comprensión literal (¿Qué? ¿Cuántos? ¿De qué color?)
           • Las preguntas MEDIAS deben evaluar inferencia y vocabulario (¿Por qué? ¿Cómo? ¿Para qué?)
           • Las preguntas DIFÍCILES deben evaluar análisis y uso del subjuntivo (¿Qué pasaría si...? ¿Es posible que...?)
           
           CATEGORÍAS TEMÁTICAS A USAR:
           • "Vocabulario" - preguntas sobre el significado de palabras específicas
           • "Comprensión" - preguntas sobre información explícita en el texto
           • "Inferencia" - preguntas que requieren deducir información
           • "Gramática" - preguntas sobre estructuras gramaticales usadas
           • "Cultura" - preguntas sobre aspectos culturales mencionados
           
           IMPORTANTE:
           • Las respuestas deben incluir la palabra o frase clave del texto original
           • Usa el vocabulario exacto de la descripción para reforzar el aprendizaje
           • Las respuestas deben ser completas y educativas, no solo "sí" o "no"
           
           Descripción: ${description}
           
           Formato de respuesta como JSON array:
           [
             {
               "question": "pregunta aquí",
               "answer": "respuesta completa aquí", 
               "difficulty": "facil|medio|dificil",
               "category": "Vocabulario|Comprensión|Inferencia|Gramática|Cultura"
             }
           ]`
          : `OBJECTIVE: Create reading comprehension questions that assess understanding of Spanish and image content.

           Based on the following Spanish description, generate ${count} question-answer pairs that:
           
           EDUCATIONAL REQUIREMENTS:
           • EASY questions should test literal comprehension (What? How many? What color?)
           • MEDIUM questions should test inference and vocabulary (Why? How? What for?)
           • DIFFICULT questions should test analysis and subjunctive use (What would happen if...? Is it possible that...?)
           
           THEMATIC CATEGORIES TO USE:
           • "Vocabulary" - questions about the meaning of specific words
           • "Comprehension" - questions about explicit information in the text
           • "Inference" - questions requiring information deduction
           • "Grammar" - questions about grammatical structures used
           • "Culture" - questions about cultural aspects mentioned
           
           IMPORTANT:
           • Answers should include the key word or phrase from the original text
           • Use exact vocabulary from the description to reinforce learning
           • Answers should be complete and educational, not just "yes" or "no"
           
           Description: ${description}
           
           Response format as JSON array:
           [
             {
               "question": "question here",
               "answer": "complete answer here",
               "difficulty": "facil|medio|dificil", 
               "category": "Vocabulary|Comprehension|Inference|Grammar|Culture"
             }
           ]`;

      const response = await this.withRetry(async () => {
        if (!this.client) {
          throw new APIError({
            code: "NO_CLIENT",
            message: "OpenAI client not initialized",
            status: 500,
            details: undefined,
          });
        }
        return await this.client.chat.completions.create({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content:
                "You are a Spanish language education specialist creating comprehension questions for language learners. Focus on teaching vocabulary, grammar structures, and reading comprehension. Always respond with valid JSON format.",
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
        throw new APIError({
          code: "PARSE_ERROR",
          message: "Failed to parse Q&A response",
          status: 500,
          details: { content, parseError },
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
        if (!this.client) {
          throw new APIError({
            code: "NO_CLIENT",
            message: "OpenAI client not initialized",
            status: 500,
            details: undefined,
          });
        }
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
        throw new APIError({
          code: "PARSE_ERROR",
          message: "Failed to parse phrases response",
          status: 500,
          details: { content, parseError },
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
        if (!this.client) {
          throw new APIError({
            code: "NO_CLIENT",
            message: "OpenAI client not initialized",
            status: 500,
            details: undefined,
          });
        }
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
    language: "es" | "en" = "es",
    maxLength: number = 300,
  ): Promise<GeneratedDescription[]> {
    try {
      const promises = styles.map((style) =>
        this.generateDescription({ 
          imageUrl, 
          style, 
          language: language as "es" | "en", 
          maxLength 
        }),
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
      if (!this.client) {
        return false;
      }
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
