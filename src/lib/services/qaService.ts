/**
 * Q&A Service - Question generation and answer validation
 */

import { withRetry, RetryConfig } from "@/lib/utils/error-retry";
import { openAIService } from "./openaiService";
import { translationService } from "./translationService";
import { supabase } from "@/lib/supabase";

interface QAItem {
  id: string;
  imageId?: string;
  imageUrl?: string;
  question: string;
  answer: string;
  difficulty: "facil" | "medio" | "dificil";
  category: string;
  language: "es" | "en";
  createdAt: string;
  updatedAt?: string;
  metadata?: {
    source: string;
    confidence?: number;
    validated?: boolean;
    userId?: string;
  };
}

interface QAGenerationRequest {
  content: string; // Description or text to generate Q&A from
  contentType: "image_description" | "text" | "vocabulary";
  language: "es" | "en";
  count: number;
  difficulty?: "facil" | "medio" | "dificil";
  categories?: string[];
  imageUrl?: string;
  imageId?: string;
}

interface QAGenerationResponse {
  questions: QAItem[];
  totalGenerated: number;
  generationTime: number;
  cached: boolean;
  source: "openai" | "fallback";
}

interface AnswerValidationRequest {
  questionId: string;
  userAnswer: string;
  expectedAnswer: string;
  language: "es" | "en";
  strictMode?: boolean;
}

interface AnswerValidationResponse {
  isCorrect: boolean;
  confidence: number;
  feedback: string;
  suggestions?: string[];
  score: number; // 0-100
  details: {
    exactMatch: boolean;
    semanticMatch: boolean;
    keywordMatch: boolean;
    grammarIssues?: string[];
  };
}

interface QAFilter {
  imageId?: string;
  difficulty?: string[];
  category?: string[];
  language?: "es" | "en";
  validated?: boolean;
  searchTerm?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  limit?: number;
  offset?: number;
}

interface QAStats {
  totalQuestions: number;
  byDifficulty: Record<string, number>;
  byCategory: Record<string, number>;
  byLanguage: Record<string, number>;
  averageConfidence: number;
  validationRate: number;
}

export class QAService {
  private cache = new Map<string, any>();
  private retryConfig: RetryConfig;
  private readonly defaultTTL = 1800000; // 30 minutes
  private readonly maxCacheSize = 1000;

  constructor() {
    this.retryConfig = {
      maxRetries: 2,
      baseDelay: 1500,
      maxDelay: 8000,
      backoffFactor: 2,
      shouldRetry: (error: Error) => {
        const message = error.message.toLowerCase();
        return (
          message.includes("503") ||
          message.includes("502") ||
          message.includes("timeout") ||
          message.includes("rate limit")
        );
      },
    };
  }

  /**
   * Generate Q&A pairs from content
   */
  public async generateQA(
    request: QAGenerationRequest,
  ): Promise<QAGenerationResponse> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey("generate_qa", request);
    const cached = this.getFromCache(cacheKey);

    if (cached) {
      return {
        ...cached,
        cached: true,
        generationTime: Date.now() - startTime,
      };
    }

    let questions: QAItem[] = [];
    let source: "openai" | "fallback" = "fallback";

    // Try OpenAI generation first
    if (openAIService.isAvailable()) {
      try {
        const result = await withRetry(async () => {
          return await openAIService.generateQA(
            request.content,
            request.language,
            request.count,
          );
        }, this.retryConfig);

        questions = this.processGeneratedQuestions(result, request);
        source = "openai";
      } catch (error) {
        console.warn("OpenAI Q&A generation failed:", error);
      }
    }

    // Fallback to predefined questions
    if (questions.length === 0) {
      questions = this.generateFallbackQuestions(request);
      source = "fallback";
    }

    // Store in database if available
    if (questions.length > 0) {
      try {
        await this.saveQuestionsToDatabase(questions);
      } catch (error) {
        console.warn("Failed to save questions to database:", error);
      }
    }

    const response: QAGenerationResponse = {
      questions,
      totalGenerated: questions.length,
      generationTime: Date.now() - startTime,
      cached: false,
      source,
    };

    this.setCache(cacheKey, response);
    return response;
  }

  /**
   * Validate user answer
   */
  public async validateAnswer(
    request: AnswerValidationRequest,
  ): Promise<AnswerValidationResponse> {
    const cacheKey = this.generateCacheKey("validate_answer", {
      questionId: request.questionId,
      userAnswer: request.userAnswer,
      expectedAnswer: request.expectedAnswer,
    });
    const cached = this.getFromCache(cacheKey);

    if (cached) {
      return cached;
    }

    const validation = await this.performAnswerValidation(request);
    this.setCache(cacheKey, validation, 3600000); // 1 hour cache

    // Record validation in database
    try {
      await this.recordAnswerValidation(request, validation);
    } catch (error) {
      console.warn("Failed to record answer validation:", error);
    }

    return validation;
  }

  /**
   * Get Q&A items with filtering
   */
  public async getQAItems(filter: QAFilter = {}): Promise<{
    items: QAItem[];
    total: number;
    hasMore: boolean;
  }> {
    const cacheKey = this.generateCacheKey("qa_items", filter);
    const cached = this.getFromCache(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const result = await this.getFromDatabase(filter);
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.warn("Database query failed:", error);
      return { items: [], total: 0, hasMore: false };
    }
  }

  /**
   * Update Q&A item
   */
  public async updateQAItem(
    id: string,
    updates: Partial<QAItem>,
  ): Promise<QAItem | null> {
    try {
      const result = await withRetry(async () => {
        if (supabase) {
          const { data, error } = await supabase
            .from("qa_items")
            .update({
              ...updates,
              updatedAt: new Date().toISOString(),
            })
            .eq("id", id)
            .select()
            .single();

          if (error) throw error;
          return data;
        }
        throw new Error("Database not available");
      }, this.retryConfig);

      this.clearCacheByPattern("qa_");
      return result;
    } catch (error) {
      console.warn("Failed to update Q&A item:", error);
      return null;
    }
  }

  /**
   * Delete Q&A item
   */
  public async deleteQAItem(id: string): Promise<boolean> {
    try {
      await withRetry(async () => {
        if (supabase) {
          const { error } = await supabase
            .from("qa_items")
            .delete()
            .eq("id", id);

          if (error) throw error;
        }
      }, this.retryConfig);

      this.clearCacheByPattern("qa_");
      return true;
    } catch (error) {
      console.warn("Failed to delete Q&A item:", error);
      return false;
    }
  }

  /**
   * Get Q&A statistics
   */
  public async getQAStats(): Promise<QAStats> {
    const cacheKey = "qa_stats";
    const cached = this.getFromCache(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const { items } = await this.getQAItems({ limit: 10000 });

      const stats: QAStats = {
        totalQuestions: items.length,
        byDifficulty: {},
        byCategory: {},
        byLanguage: {},
        averageConfidence: 0,
        validationRate: 0,
      };

      let totalConfidence = 0;
      let itemsWithConfidence = 0;
      let validatedItems = 0;

      items.forEach((item) => {
        // Count by difficulty
        stats.byDifficulty[item.difficulty] =
          (stats.byDifficulty[item.difficulty] || 0) + 1;

        // Count by category
        stats.byCategory[item.category] =
          (stats.byCategory[item.category] || 0) + 1;

        // Count by language
        stats.byLanguage[item.language] =
          (stats.byLanguage[item.language] || 0) + 1;

        // Calculate average confidence
        if (item.metadata?.confidence) {
          totalConfidence += item.metadata.confidence;
          itemsWithConfidence++;
        }

        // Count validated items
        if (item.metadata?.validated) {
          validatedItems++;
        }
      });

      stats.averageConfidence =
        itemsWithConfidence > 0 ? totalConfidence / itemsWithConfidence : 0;
      stats.validationRate =
        items.length > 0 ? validatedItems / items.length : 0;

      this.setCache(cacheKey, stats, 600000); // 10 minutes
      return stats;
    } catch (error) {
      console.warn("Failed to calculate Q&A stats:", error);
      return {
        totalQuestions: 0,
        byDifficulty: {},
        byCategory: {},
        byLanguage: {},
        averageConfidence: 0,
        validationRate: 0,
      };
    }
  }

  /**
   * Batch validate questions
   */
  public async batchValidateQuestions(questionIds: string[]): Promise<{
    results: { questionId: string; isValid: boolean; issues?: string[] }[];
    summary: { total: number; valid: number; invalid: number };
  }> {
    const results: {
      questionId: string;
      isValid: boolean;
      issues?: string[];
    }[] = [];

    for (const questionId of questionIds) {
      try {
        const validation = await this.validateQuestionQuality(questionId);
        results.push({
          questionId,
          isValid: validation.isValid,
          issues: validation.issues,
        });
      } catch (error) {
        results.push({
          questionId,
          isValid: false,
          issues: ["Validation failed: " + (error as Error).message],
        });
      }
    }

    const valid = results.filter((r) => r.isValid).length;
    const invalid = results.length - valid;

    return {
      results,
      summary: {
        total: results.length,
        valid,
        invalid,
      },
    };
  }

  // Private helper methods
  private processGeneratedQuestions(
    generatedQuestions: any[],
    request: QAGenerationRequest,
  ): QAItem[] {
    return generatedQuestions.map((q) => ({
      id: this.generateId(),
      imageId: request.imageId,
      imageUrl: request.imageUrl,
      question: q.question,
      answer: q.answer,
      difficulty: q.difficulty || "medio",
      category: q.category || "General",
      language: request.language,
      createdAt: new Date().toISOString(),
      metadata: {
        source: "openai",
        confidence: 0.9,
        validated: false,
      },
    }));
  }

  private generateFallbackQuestions(request: QAGenerationRequest): QAItem[] {
    const fallbackQuestions = {
      es: [
        {
          question:
            "¿Qué elementos principales puedes identificar en esta imagen?",
          answer:
            "En esta imagen se pueden identificar varios elementos visuales importantes.",
          difficulty: "facil" as const,
          category: "Observación",
        },
        {
          question:
            "¿Cómo describirías la atmósfera o el ambiente de esta escena?",
          answer:
            "La atmósfera de la imagen transmite una sensación específica a través de colores y composición.",
          difficulty: "medio" as const,
          category: "Interpretación",
        },
        {
          question: "¿Qué emociones te transmite esta imagen y por qué?",
          answer:
            "La imagen puede evocar diferentes emociones dependiendo de los elementos visuales presentes.",
          difficulty: "dificil" as const,
          category: "Análisis",
        },
      ],
      en: [
        {
          question: "What main elements can you identify in this image?",
          answer:
            "Several important visual elements can be identified in this image.",
          difficulty: "facil" as const,
          category: "Observation",
        },
        {
          question:
            "How would you describe the atmosphere or mood of this scene?",
          answer:
            "The atmosphere of the image conveys a specific feeling through colors and composition.",
          difficulty: "medio" as const,
          category: "Interpretation",
        },
        {
          question: "What emotions does this image convey to you and why?",
          answer:
            "The image can evoke different emotions depending on the visual elements present.",
          difficulty: "dificil" as const,
          category: "Analysis",
        },
      ],
    };

    const questions =
      fallbackQuestions[request.language] || fallbackQuestions.es;

    return questions.slice(0, request.count).map((q) => ({
      id: this.generateId(),
      imageId: request.imageId,
      imageUrl: request.imageUrl,
      question: q.question,
      answer: q.answer,
      difficulty: q.difficulty,
      category: q.category,
      language: request.language,
      createdAt: new Date().toISOString(),
      metadata: {
        source: "fallback",
        confidence: 0.7,
        validated: true,
      },
    }));
  }

  private async performAnswerValidation(
    request: AnswerValidationRequest,
  ): Promise<AnswerValidationResponse> {
    const userAnswer = request.userAnswer.trim().toLowerCase();
    const expectedAnswer = request.expectedAnswer.trim().toLowerCase();

    // Basic validation
    const exactMatch = userAnswer === expectedAnswer;

    // Keyword matching
    const expectedKeywords = this.extractKeywords(
      expectedAnswer,
      request.language,
    );
    const userKeywords = this.extractKeywords(userAnswer, request.language);
    const keywordMatch = this.calculateKeywordMatch(
      expectedKeywords,
      userKeywords,
    );

    // Semantic matching (if OpenAI is available)
    let semanticMatch = keywordMatch > 0.7;
    let confidence = keywordMatch;

    if (openAIService.isAvailable() && !exactMatch) {
      try {
        semanticMatch = await this.checkSemanticSimilarity(
          request.userAnswer,
          request.expectedAnswer,
          request.language,
        );
        confidence = semanticMatch
          ? Math.max(confidence, 0.8)
          : Math.min(confidence, 0.6);
      } catch (error) {
        console.warn("Semantic matching failed:", error);
      }
    }

    const isCorrect = exactMatch || (semanticMatch && keywordMatch > 0.5);
    const score = Math.round(confidence * 100);

    let feedback = "";
    const suggestions: string[] = [];

    if (isCorrect) {
      feedback =
        request.language === "es"
          ? "¡Correcto! Tu respuesta es apropiada."
          : "Correct! Your answer is appropriate.";
    } else {
      feedback =
        request.language === "es"
          ? "Tu respuesta no es completamente correcta. Intenta incluir más detalles específicos."
          : "Your answer is not completely correct. Try to include more specific details.";

      if (keywordMatch < 0.3) {
        suggestions.push(
          request.language === "es"
            ? "Intenta usar palabras clave relacionadas con la pregunta"
            : "Try to use keywords related to the question",
        );
      }
    }

    return {
      isCorrect,
      confidence,
      feedback,
      suggestions,
      score,
      details: {
        exactMatch,
        semanticMatch,
        keywordMatch: keywordMatch > 0.5,
        grammarIssues: [], // Could be enhanced with grammar checking
      },
    };
  }

  private async checkSemanticSimilarity(
    answer1: string,
    answer2: string,
    language: string,
  ): Promise<boolean> {
    try {
      const prompt =
        language === "es"
          ? `¿Son estas dos respuestas semánticamente similares? Responde solo "SÍ" o "NO":\n\nRespuesta 1: "${answer1}"\nRespuesta 2: "${answer2}"`
          : `Are these two answers semantically similar? Answer only "YES" or "NO":\n\nAnswer 1: "${answer1}"\nAnswer 2: "${answer2}"`;

      const result = await openAIService.translateText({
        text: prompt,
        fromLanguage: language,
        toLanguage: language,
      });

      return result.toLowerCase().includes(language === "es" ? "sí" : "yes");
    } catch (error) {
      return false;
    }
  }

  private extractKeywords(text: string, language: string): string[] {
    // Remove common stop words
    const stopWords = {
      es: [
        "el",
        "la",
        "los",
        "las",
        "un",
        "una",
        "y",
        "o",
        "pero",
        "que",
        "de",
        "en",
        "a",
        "por",
        "con",
        "se",
        "es",
        "son",
      ],
      en: [
        "the",
        "a",
        "an",
        "and",
        "or",
        "but",
        "that",
        "of",
        "in",
        "to",
        "by",
        "with",
        "is",
        "are",
        "was",
        "were",
      ],
    };

    const words = text
      .toLowerCase()
      .split(/\\s+/)
      .filter((word) => {
        return word.length > 2 && !stopWords[language]?.includes(word);
      });

    return [...new Set(words)]; // Remove duplicates
  }

  private calculateKeywordMatch(expected: string[], user: string[]): number {
    if (expected.length === 0) return 0;

    const matches = expected.filter((keyword) => user.includes(keyword));
    return matches.length / expected.length;
  }

  private async validateQuestionQuality(questionId: string): Promise<{
    isValid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      const { items } = await this.getQAItems({ limit: 1 }); // This would need to filter by ID
      const question = items.find((item) => item.id === questionId);

      if (!question) {
        return { isValid: false, issues: ["Question not found"] };
      }

      // Basic validation checks
      if (!question.question || question.question.trim().length < 10) {
        issues.push("Question is too short or empty");
      }

      if (!question.answer || question.answer.trim().length < 5) {
        issues.push("Answer is too short or empty");
      }

      if (question.question === question.answer) {
        issues.push("Question and answer are identical");
      }

      // Language-specific checks
      if (question.language === "es") {
        if (
          !question.question.includes("¿") &&
          !question.question.includes("?")
        ) {
          issues.push("Spanish question should have question marks");
        }
      }

      return { isValid: issues.length === 0, issues };
    } catch (error) {
      return {
        isValid: false,
        issues: ["Validation error: " + (error as Error).message],
      };
    }
  }

  private async getFromDatabase(filter: QAFilter): Promise<{
    items: QAItem[];
    total: number;
    hasMore: boolean;
  }> {
    if (!supabase) {
      return { items: [], total: 0, hasMore: false };
    }

    let query = supabase.from("qa_items").select("*", { count: "exact" });

    // Apply filters
    if (filter.imageId) {
      query = query.eq("imageId", filter.imageId);
    }

    if (filter.difficulty?.length) {
      query = query.in("difficulty", filter.difficulty);
    }

    if (filter.category?.length) {
      query = query.in("category", filter.category);
    }

    if (filter.language) {
      query = query.eq("language", filter.language);
    }

    if (filter.searchTerm) {
      query = query.or(
        `question.ilike.%${filter.searchTerm}%,answer.ilike.%${filter.searchTerm}%`,
      );
    }

    if (filter.dateRange) {
      query = query.gte("createdAt", filter.dateRange.start);
      query = query.lte("createdAt", filter.dateRange.end);
    }

    // Apply pagination
    if (filter.offset) {
      query = query.range(
        filter.offset,
        filter.offset + (filter.limit || 50) - 1,
      );
    } else if (filter.limit) {
      query = query.limit(filter.limit);
    }

    const { data, error, count } = await query.order("createdAt", {
      ascending: false,
    });

    if (error) throw error;

    const items = data || [];
    const total = count || 0;
    const hasMore = filter.limit
      ? (filter.offset || 0) + items.length < total
      : false;

    return { items, total, hasMore };
  }

  private async saveQuestionsToDatabase(questions: QAItem[]): Promise<void> {
    if (!supabase || questions.length === 0) return;

    const { error } = await supabase.from("qa_items").insert(questions);

    if (error) {
      console.warn("Failed to save questions to database:", error);
    }
  }

  private async recordAnswerValidation(
    request: AnswerValidationRequest,
    validation: AnswerValidationResponse,
  ): Promise<void> {
    if (!supabase) return;

    try {
      await supabase.from("answer_validations").insert([
        {
          questionId: request.questionId,
          userAnswer: request.userAnswer,
          expectedAnswer: request.expectedAnswer,
          isCorrect: validation.isCorrect,
          score: validation.score,
          confidence: validation.confidence,
          language: request.language,
          createdAt: new Date().toISOString(),
          details: validation.details,
        },
      ]);
    } catch (error) {
      console.warn("Failed to record answer validation:", error);
    }
  }

  // Utility methods
  private generateCacheKey(prefix: string, data: any): string {
    return `${prefix}_${this.hashString(JSON.stringify(data))}`;
  }

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.timestamp + cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(
    key: string,
    data: any,
    ttl: number = this.defaultTTL,
  ): void {
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

  private clearCacheByPattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  private generateId(): string {
    return `qa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
}

// Export singleton instance
export const qaService = new QAService();
export default qaService;
