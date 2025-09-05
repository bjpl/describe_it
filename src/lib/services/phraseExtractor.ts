/**
 * Enhanced Phrase Extraction Service - Agent Gamma-3 Implementation
 * Extracts and categorizes Spanish vocabulary into 5 specific categories
 */

import { CategorizedPhrase } from "@/types/api";
import {
  createCategorizedPhrase,
  inferCategory,
  inferGender,
  inferArticle,
  inferInfinitive,
  generateContext,
} from "../utils/phrase-helpers";

export interface PhraseExtractionRequest {
  description: string;
  imageUrl: string;
  targetLevel: "beginner" | "intermediate" | "advanced";
  maxPhrases: number;
  categories?: PhraseCategory[];
}

export type PhraseCategory =
  | "sustantivos"
  | "verbos"
  | "adjetivos"
  | "adverbios"
  | "frasesClaves";

export interface CategoryConfig {
  name: PhraseCategory;
  displayName: string;
  color: string;
  maxItems: number;
  priority: number;
}

export class PhraseExtractor {
  private static readonly CATEGORIES: Record<PhraseCategory, CategoryConfig> = {
    sustantivos: {
      name: "sustantivos",
      displayName: "Sustantivos (Nouns)",
      color: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300",
      maxItems: 8,
      priority: 1,
    },
    verbos: {
      name: "verbos",
      displayName: "Verbos (Verbs)",
      color:
        "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300",
      maxItems: 6,
      priority: 2,
    },
    adjetivos: {
      name: "adjetivos",
      displayName: "Adjetivos (Adjectives)",
      color:
        "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300",
      maxItems: 6,
      priority: 3,
    },
    adverbios: {
      name: "adverbios",
      displayName: "Adverbios (Adverbs)",
      color:
        "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300",
      maxItems: 4,
      priority: 4,
    },
    frasesClaves: {
      name: "frasesClaves",
      displayName: "Frases Clave (Key Phrases)",
      color: "bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-300",
      maxItems: 6,
      priority: 5,
    },
  };

  /**
   * Extract phrases from description text, categorizing them into the 5 main categories
   */
  static async extractCategorizedPhrases(
    request: PhraseExtractionRequest,
  ): Promise<Record<PhraseCategory, CategorizedPhrase[]>> {
    const { description, imageUrl, targetLevel, maxPhrases, categories } =
      request;

    // Initialize result structure
    const result: Record<PhraseCategory, CategorizedPhrase[]> = {
      sustantivos: [],
      verbos: [],
      adjetivos: [],
      adverbios: [],
      frasesClaves: [],
    };

    // Use AI service for extraction (OpenAI GPT or similar)
    const extractedPhrases = await this.callAIExtractionService({
      description,
      imageUrl,
      targetLevel,
      maxPhrases,
      categories:
        categories || (Object.keys(this.CATEGORIES) as PhraseCategory[]),
    });

    // Process and categorize each extracted phrase
    extractedPhrases.forEach((phraseData, index) => {
      const phrase = createCategorizedPhrase({
        phrase: phraseData.phrase,
        category: phraseData.category,
        partOfSpeech: phraseData.partOfSpeech,
        definition: phraseData.definition,
        difficulty: targetLevel,
        context:
          phraseData.context || generateContext(phraseData.phrase, description),
        imageUrl,
        index,
        gender: phraseData.gender || inferGender(phraseData.phrase),
        article: phraseData.article || inferArticle(phraseData.phrase),
        conjugation:
          phraseData.conjugation ||
          (phraseData.category === "verbos"
            ? inferInfinitive(phraseData.phrase)
            : undefined),
      });

      // Add to appropriate category
      if (result[phrase.category as PhraseCategory]) {
        result[phrase.category as PhraseCategory].push(phrase);
      } else {
        result.frasesClaves.push(phrase);
      }
    });

    // Sort each category alphabetically by sortKey
    Object.keys(result).forEach((category) => {
      result[category as PhraseCategory].sort((a, b) =>
        a.sortKey.localeCompare(b.sortKey, "es", { sensitivity: "base" }),
      );
    });

    return result;
  }

  /**
   * AI Service call for phrase extraction (OpenAI GPT-4 Vision or similar)
   */
  private static async callAIExtractionService(params: {
    description: string;
    imageUrl: string;
    targetLevel: string;
    maxPhrases: number;
    categories: PhraseCategory[];
  }): Promise<any[]> {
    // This would integrate with actual AI service
    // For now, return intelligent mock data based on description

    const mockExtractions = await this.generateIntelligentMockPhrases(
      params.description,
      params.targetLevel,
      params.maxPhrases,
      params.categories,
    );

    return mockExtractions;
  }

  /**
   * Generate intelligent mock phrases based on description content
   */
  private static async generateIntelligentMockPhrases(
    description: string,
    targetLevel: string,
    maxPhrases: number,
    categories: PhraseCategory[],
  ): Promise<any[]> {
    // Simulate AI processing delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Extract actual words from the description
    const extractedWords = this.extractWordsFromDescription(description);
    const phrases: any[] = [];
    
    // Process the extracted words into categorized phrases
    if (categories.includes("sustantivos") && extractedWords.nouns.length > 0) {
      extractedWords.nouns.slice(0, 8).forEach((noun) => {
        phrases.push({
          phrase: noun,
          definition: this.generateDefinition(noun, "noun"),
          partOfSpeech: "sustantivo",
          category: "sustantivos",
          gender: this.inferSpanishGender(noun),
          article: this.inferSpanishArticle(noun),
          context: this.generateContextFromDescription(noun, description),
        });
      });
    }
    
    if (categories.includes("verbos") && extractedWords.verbs.length > 0) {
      extractedWords.verbs.slice(0, 6).forEach((verb) => {
        phrases.push({
          phrase: verb,
          definition: this.generateDefinition(verb, "verb"),
          partOfSpeech: "verbo",
          category: "verbos",
          conjugation: verb,
          context: this.generateContextFromDescription(verb, description),
        });
      });
    }
    
    if (categories.includes("adjetivos") && extractedWords.adjectives.length > 0) {
      extractedWords.adjectives.slice(0, 6).forEach((adjective) => {
        phrases.push({
          phrase: adjective,
          definition: this.generateDefinition(adjective, "adjective"),
          partOfSpeech: "adjetivo",
          category: "adjetivos",
          context: this.generateContextFromDescription(adjective, description),
        });
      });
    }
    
    if (categories.includes("adverbios") && extractedWords.adverbs.length > 0) {
      extractedWords.adverbs.slice(0, 4).forEach((adverb) => {
        phrases.push({
          phrase: adverb,
          definition: this.generateDefinition(adverb, "adverb"),
          partOfSpeech: "adverbio",
          category: "adverbios",
          context: this.generateContextFromDescription(adverb, description),
        });
      });
    }
    
    if (categories.includes("frasesClaves") && extractedWords.keyPhrases.length > 0) {
      extractedWords.keyPhrases.slice(0, 6).forEach((keyPhrase) => {
        phrases.push({
          phrase: keyPhrase,
          definition: this.generateDefinition(keyPhrase, "phrase"),
          partOfSpeech: "frase clave",
          category: "frasesClaves",
          context: `Esta frase aparece en la descripción: "${keyPhrase}"`,
        });
      });
    }
    
    // If we still need more phrases to meet the requested count, fallback to common vocabulary
    const wordsInDescription = description.toLowerCase().split(/\s+/);

    // Category-specific phrase generation based on level
    const levelPhrases = {
      beginner: {
        sustantivos: [
          {
            phrase: "casa",
            definition: "house, home",
            partOfSpeech: "sustantivo",
            gender: "femenino",
            article: "la",
          },
          {
            phrase: "gato",
            definition: "cat",
            partOfSpeech: "sustantivo",
            gender: "masculino",
            article: "el",
          },
          {
            phrase: "agua",
            definition: "water",
            partOfSpeech: "sustantivo",
            gender: "femenino",
            article: "el",
          },
          {
            phrase: "libro",
            definition: "book",
            partOfSpeech: "sustantivo",
            gender: "masculino",
            article: "el",
          },
          {
            phrase: "mesa",
            definition: "table",
            partOfSpeech: "sustantivo",
            gender: "femenino",
            article: "la",
          },
        ],
        verbos: [
          {
            phrase: "caminar",
            definition: "to walk",
            partOfSpeech: "verbo",
            conjugation: "caminar",
          },
          {
            phrase: "comer",
            definition: "to eat",
            partOfSpeech: "verbo",
            conjugation: "comer",
          },
          {
            phrase: "dormir",
            definition: "to sleep",
            partOfSpeech: "verbo",
            conjugation: "dormir",
          },
          {
            phrase: "estudiar",
            definition: "to study",
            partOfSpeech: "verbo",
            conjugation: "estudiar",
          },
        ],
        adjetivos: [
          {
            phrase: "grande",
            definition: "big, large",
            partOfSpeech: "adjetivo",
          },
          { phrase: "pequeño", definition: "small", partOfSpeech: "adjetivo" },
          {
            phrase: "bonito",
            definition: "pretty, beautiful",
            partOfSpeech: "adjetivo",
          },
          { phrase: "fácil", definition: "easy", partOfSpeech: "adjetivo" },
        ],
        adverbios: [
          {
            phrase: "rápidamente",
            definition: "quickly",
            partOfSpeech: "adverbio",
          },
          { phrase: "muy", definition: "very", partOfSpeech: "adverbio" },
          { phrase: "bien", definition: "well", partOfSpeech: "adverbio" },
        ],
        frasesClaves: [
          {
            phrase: "¿Cómo estás?",
            definition: "How are you?",
            partOfSpeech: "frase interrogativa",
          },
          {
            phrase: "Por favor",
            definition: "Please",
            partOfSpeech: "expresión de cortesía",
          },
          {
            phrase: "Muchas gracias",
            definition: "Thank you very much",
            partOfSpeech: "expresión de gratitud",
          },
        ],
      },
      intermediate: {
        sustantivos: [
          {
            phrase: "oportunidad",
            definition: "opportunity",
            partOfSpeech: "sustantivo",
            gender: "femenino",
            article: "la",
          },
          {
            phrase: "conocimiento",
            definition: "knowledge",
            partOfSpeech: "sustantivo",
            gender: "masculino",
            article: "el",
          },
          {
            phrase: "desarrollo",
            definition: "development",
            partOfSpeech: "sustantivo",
            gender: "masculino",
            article: "el",
          },
          {
            phrase: "experiencia",
            definition: "experience",
            partOfSpeech: "sustantivo",
            gender: "femenino",
            article: "la",
          },
        ],
        verbos: [
          {
            phrase: "desarrollar",
            definition: "to develop",
            partOfSpeech: "verbo",
            conjugation: "desarrollar",
          },
          {
            phrase: "establecer",
            definition: "to establish",
            partOfSpeech: "verbo",
            conjugation: "establecer",
          },
          {
            phrase: "contribuir",
            definition: "to contribute",
            partOfSpeech: "verbo",
            conjugation: "contribuir",
          },
          {
            phrase: "analizar",
            definition: "to analyze",
            partOfSpeech: "verbo",
            conjugation: "analizar",
          },
        ],
        adjetivos: [
          {
            phrase: "complejo",
            definition: "complex",
            partOfSpeech: "adjetivo",
          },
          {
            phrase: "eficiente",
            definition: "efficient",
            partOfSpeech: "adjetivo",
          },
          {
            phrase: "significativo",
            definition: "significant",
            partOfSpeech: "adjetivo",
          },
          {
            phrase: "innovador",
            definition: "innovative",
            partOfSpeech: "adjetivo",
          },
        ],
        adverbios: [
          {
            phrase: "principalmente",
            definition: "mainly, primarily",
            partOfSpeech: "adverbio",
          },
          {
            phrase: "efectivamente",
            definition: "effectively",
            partOfSpeech: "adverbio",
          },
          {
            phrase: "específicamente",
            definition: "specifically",
            partOfSpeech: "adverbio",
          },
        ],
        frasesClaves: [
          {
            phrase: "por lo tanto",
            definition: "therefore",
            partOfSpeech: "locución adverbial",
          },
          {
            phrase: "sin embargo",
            definition: "however",
            partOfSpeech: "locución adversativa",
          },
          {
            phrase: "en cuanto a",
            definition: "as for, regarding",
            partOfSpeech: "locución prepositiva",
          },
        ],
      },
      advanced: {
        sustantivos: [
          {
            phrase: "paradigma",
            definition: "paradigm",
            partOfSpeech: "sustantivo",
            gender: "masculino",
            article: "el",
          },
          {
            phrase: "sostenibilidad",
            definition: "sustainability",
            partOfSpeech: "sustantivo",
            gender: "femenino",
            article: "la",
          },
          {
            phrase: "infraestructura",
            definition: "infrastructure",
            partOfSpeech: "sustantivo",
            gender: "femenino",
            article: "la",
          },
          {
            phrase: "metodología",
            definition: "methodology",
            partOfSpeech: "sustantivo",
            gender: "femenino",
            article: "la",
          },
        ],
        verbos: [
          {
            phrase: "conceptualizar",
            definition: "to conceptualize",
            partOfSpeech: "verbo",
            conjugation: "conceptualizar",
          },
          {
            phrase: "implementar",
            definition: "to implement",
            partOfSpeech: "verbo",
            conjugation: "implementar",
          },
          {
            phrase: "optimizar",
            definition: "to optimize",
            partOfSpeech: "verbo",
            conjugation: "optimizar",
          },
          {
            phrase: "fundamentar",
            definition: "to base, to ground",
            partOfSpeech: "verbo",
            conjugation: "fundamentar",
          },
        ],
        adjetivos: [
          {
            phrase: "multidisciplinario",
            definition: "multidisciplinary",
            partOfSpeech: "adjetivo",
          },
          {
            phrase: "heterogéneo",
            definition: "heterogeneous",
            partOfSpeech: "adjetivo",
          },
          {
            phrase: "intrínseco",
            definition: "intrinsic",
            partOfSpeech: "adjetivo",
          },
          {
            phrase: "pragmático",
            definition: "pragmatic",
            partOfSpeech: "adjetivo",
          },
        ],
        adverbios: [
          {
            phrase: "intrínsecamente",
            definition: "intrinsically",
            partOfSpeech: "adverbio",
          },
          {
            phrase: "paradigmáticamente",
            definition: "paradigmatically",
            partOfSpeech: "adverbio",
          },
          {
            phrase: "sistemáticamente",
            definition: "systematically",
            partOfSpeech: "adverbio",
          },
        ],
        frasesClaves: [
          {
            phrase: "en última instancia",
            definition: "ultimately, in the final analysis",
            partOfSpeech: "locución adverbial",
          },
          {
            phrase: "a partir de",
            definition: "based on, starting from",
            partOfSpeech: "locución prepositiva",
          },
          {
            phrase: "no obstante",
            definition: "nevertheless, nonetheless",
            partOfSpeech: "locución adversativa",
          },
        ],
      },
    };

    // Select phrases from each requested category
    categories.forEach((category) => {
      const categoryPhrases =
        levelPhrases[targetLevel as keyof typeof levelPhrases][category] || [];
      const categoryConfig = this.CATEGORIES[category];
      const maxForCategory = Math.min(
        categoryConfig.maxItems,
        Math.floor(maxPhrases / categories.length),
      );

      const selectedPhrases = categoryPhrases.slice(0, maxForCategory);

      selectedPhrases.forEach((phraseData, index) => {
        phrases.push({
          ...phraseData,
          category,
          context: this.generateContextForPhrase(
            phraseData.phrase,
            description,
            targetLevel,
          ),
        });
      });
    });

    return phrases.slice(0, maxPhrases);
  }

  /**
   * Generate contextual sentence for a phrase
   */
  private static generateContextForPhrase(
    phrase: string,
    description: string,
    level: string,
  ): string {
    const contexts = {
      beginner: [
        `En la imagen se ve ${phrase}.`,
        `Puedo observar ${phrase} claramente.`,
        `La palabra "${phrase}" describe lo que vemos.`,
        `En el contexto de la imagen, ${phrase} es importante.`,
      ],
      intermediate: [
        `El concepto de "${phrase}" se relaciona directamente con lo observado en la imagen.`,
        `La presencia de ${phrase} en esta situación es significativa.`,
        `El término "${phrase}" describe apropiadamente este elemento.`,
        `En este contexto específico, ${phrase} juega un papel importante.`,
      ],
      advanced: [
        `La conceptualización de "${phrase}" se manifiesta claramente en esta representación visual.`,
        `El paradigma subyacente de ${phrase} se evidencia en los elementos compositivos.`,
        `La implementación práctica de "${phrase}" se observa en la estructura presentada.`,
        `El análisis semántico de "${phrase}" revela su relevancia contextual.`,
      ],
    };

    const levelContexts = contexts[level as keyof typeof contexts];
    return levelContexts[Math.floor(Math.random() * levelContexts.length)];
  }

  /**
   * Generate context from actual description
   */
  private static generateContextFromDescription(
    word: string,
    description: string,
  ): string {
    // Find sentences containing the word
    const sentences = description.split(/[.!?]+/);
    for (const sentence of sentences) {
      if (sentence.toLowerCase().includes(word.toLowerCase())) {
        return sentence.trim();
      }
    }
    // Fallback to generic context
    return `La palabra "${word}" aparece en la descripción de la imagen.`;
  }

  /**
   * Generate basic definition for extracted words
   */
  private static generateDefinition(word: string, type: string): string {
    // In production, this would use a dictionary API or translation service
    // For now, provide a basic template
    const definitions: Record<string, string> = {
      noun: `[sustantivo] - objeto, persona o concepto`,
      verb: `[verbo] - acción o estado`,
      adjective: `[adjetivo] - cualidad o característica`,
      adverb: `[adverbio] - modifica verbos, adjetivos u otros adverbios`,
      phrase: `[frase] - expresión completa con significado`,
    };
    return definitions[type] || `[${type}] - palabra importante en el contexto`;
  }

  /**
   * Infer Spanish gender for nouns
   */
  private static inferSpanishGender(noun: string): "masculino" | "femenino" {
    // Basic Spanish gender rules
    if (noun.endsWith("a") || noun.endsWith("ción") || noun.endsWith("dad") || noun.endsWith("tad")) {
      return "femenino";
    }
    if (noun.endsWith("o") || noun.endsWith("miento")) {
      return "masculino";
    }
    // Default to masculine for uncertain cases
    return "masculino";
  }

  /**
   * Infer Spanish article based on gender
   */
  private static inferSpanishArticle(noun: string): "el" | "la" {
    const gender = this.inferSpanishGender(noun);
    // Special case for feminine nouns starting with stressed 'a' or 'ha'
    if (gender === "femenino" && (noun.startsWith("a") || noun.startsWith("ha"))) {
      return "el";
    }
    return gender === "masculino" ? "el" : "la";
  }

  /**
   * Get category configuration
   */
  static getCategoryConfig(category: PhraseCategory): CategoryConfig {
    return this.CATEGORIES[category];
  }

  /**
   * Get all category configurations
   */
  static getAllCategories(): CategoryConfig[] {
    return Object.values(this.CATEGORIES).sort(
      (a, b) => a.priority - b.priority,
    );
  }

  /**
   * Extract specific words from description text
   */
  static extractWordsFromDescription(description: string): {
    nouns: string[];
    verbs: string[];
    adjectives: string[];
    adverbs: string[];
    keyPhrases: string[];
  } {
    // Simple word extraction - in production would use NLP library
    const words = description.toLowerCase().match(/\b\w+\b/g) || [];

    // Basic categorization heuristics
    const nouns = words.filter(
      (word) => word.match(/o$|a$|ción$|dad$|tad$|miento$/) && word.length > 3,
    );

    const verbs = words.filter(
      (word) => word.match(/ar$|er$|ir$|ando$|iendo$/) && word.length > 3,
    );

    const adjectives = words.filter(
      (word) =>
        word.match(/oso$|osa$|ivo$|iva$|ante$|ente$/) && word.length > 4,
    );

    const adverbs = words.filter(
      (word) => word.match(/mente$/) && word.length > 6,
    );

    // Key phrases are longer sequences
    const keyPhrases: string[] = [];
    const sentences = description.split(/[.!?]+/);
    sentences.forEach((sentence) => {
      const trimmed = sentence.trim();
      if (trimmed.length > 10 && trimmed.length < 50) {
        keyPhrases.push(trimmed);
      }
    });

    return {
      nouns: [...new Set(nouns)].slice(0, 10),
      verbs: [...new Set(verbs)].slice(0, 8),
      adjectives: [...new Set(adjectives)].slice(0, 8),
      adverbs: [...new Set(adverbs)].slice(0, 5),
      keyPhrases: keyPhrases.slice(0, 6),
    };
  }
}

export default PhraseExtractor;
