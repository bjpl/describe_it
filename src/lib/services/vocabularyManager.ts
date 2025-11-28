/**
 * Vocabulary Manager - Agent Gamma-3 Implementation
 * Manages vocabulary collection with click-to-add functionality and persistence
 */

import { CategorizedPhrase, VocabularySet, SavedPhrase } from "@/types/api";
import VocabularyStorage, {
  StoredVocabularyData,
} from "../storage/vocabularyStorage";
import { createSortKey } from "../utils/phrase-helpers";
import { safeParse, safeStringify } from "@/lib/utils/json-safe";
import { logger } from '@/lib/logger';

export interface VocabularyManagerConfig {
  autoSave: boolean;
  maxPhrasesPerSet: number;
  enableTranslation: boolean;
  sortIgnoreArticles: boolean;
}

export interface VocabularyStats {
  totalPhrases: number;
  categoryCounts: Record<string, number>;
  difficultyDistribution: Record<string, number>;
  recentlyAdded: SavedPhrase[];
  mostStudied: SavedPhrase[];
}

export interface ClickToAddOptions {
  category?: string;
  setId?: string;
  autoTranslate?: boolean;
  markAsNew?: boolean;
}

export class VocabularyManager {
  private config: VocabularyManagerConfig;
  private storage: typeof VocabularyStorage;
  private currentPhrases: Map<string, SavedPhrase>;
  private listeners: Set<(event: VocabularyEvent) => void>;

  constructor(config: Partial<VocabularyManagerConfig> = {}) {
    this.config = {
      autoSave: true,
      maxPhrasesPerSet: 100,
      enableTranslation: true,
      sortIgnoreArticles: true,
      ...config,
    };

    this.storage = VocabularyStorage;
    this.currentPhrases = new Map();
    this.listeners = new Set();

    // Load existing phrases
    this.loadCurrentPhrases();
  }

  /**
   * Add phrase with click-to-add functionality
   */
  async addPhraseWithClick(
    phrase: CategorizedPhrase,
    options: ClickToAddOptions = {},
  ): Promise<SavedPhrase> {
    const {
      category = phrase.category,
      setId,
      autoTranslate = this.config.enableTranslation,
      markAsNew = true,
    } = options;

    // Create saved phrase with enhanced data
    const savedPhrase: SavedPhrase = {
      ...phrase,
      category,
      saved: true,
      savedAt: new Date(),
      translation: autoTranslate
        ? (await this.translatePhrase(phrase.phrase, phrase.definition)) || ""
        : "",
      studyProgress: {
        correctAnswers: 0,
        totalAttempts: 0,
        lastReviewed: undefined,
      },
    };

    // Add to current phrases collection
    this.currentPhrases.set(savedPhrase.id, savedPhrase);

    // Add to specific vocabulary set if provided
    if (setId) {
      await this.addPhraseToSet(savedPhrase, setId);
    } else {
      // Add to default "Recent Additions" set
      await this.addToRecentAdditions(savedPhrase);
    }

    // Auto-save if enabled
    if (this.config.autoSave) {
      await this.savePhrases();
    }

    // Emit event
    this.emitEvent({
      type: "phraseAdded",
      phrase: savedPhrase,
      timestamp: new Date(),
    });

    return savedPhrase;
  }

  /**
   * Click-to-add multiple phrases at once
   */
  async addMultiplePhrases(
    phrases: CategorizedPhrase[],
    options: ClickToAddOptions = {},
  ): Promise<SavedPhrase[]> {
    const savedPhrases: SavedPhrase[] = [];

    for (const phrase of phrases) {
      try {
        const savedPhrase = await this.addPhraseWithClick(phrase, options);
        savedPhrases.push(savedPhrase);
      } catch (error) {
        logger.error(`Error adding phrase "${phrase.phrase}":`, error);
      }
    }

    return savedPhrases;
  }

  /**
   * Remove phrase from vocabulary
   */
  async removePhrase(phraseId: string): Promise<boolean> {
    const phrase = this.currentPhrases.get(phraseId);
    if (!phrase) return false;

    // Remove from current phrases
    this.currentPhrases.delete(phraseId);

    // Remove from all vocabulary sets
    const vocabularySets = this.storage.loadVocabularySets();
    const updatedSets = vocabularySets.map((set) => ({
      ...set,
      phrases: set.phrases.filter((p) => p.id !== phraseId),
      lastModified: new Date(),
    }));

    // Save updated sets
    this.storage.saveVocabularySets(updatedSets);

    // Auto-save if enabled
    if (this.config.autoSave) {
      await this.savePhrases();
    }

    // Emit event
    this.emitEvent({
      type: "phraseRemoved",
      phraseId,
      timestamp: new Date(),
    });

    return true;
  }

  /**
   * Create new vocabulary set from selected phrases
   */
  async createSetFromPhrases(
    selectedPhraseIds: string[],
    setName: string,
    description?: string,
  ): Promise<VocabularySet> {
    const selectedPhrases = selectedPhraseIds
      .map((id) => this.currentPhrases.get(id))
      .filter((phrase) => phrase !== undefined) as SavedPhrase[];

    if (selectedPhrases.length === 0) {
      throw new Error("No valid phrases selected for vocabulary set");
    }

    // Create new vocabulary set
    const vocabularySet: VocabularySet = {
      id: `set_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: setName,
      description:
        description || `Study set with ${selectedPhrases.length} phrases`,
      phrases: this.sortPhrasesAlphabetically(selectedPhrases),
      createdAt: new Date(),
      lastModified: new Date(),
      studyStats: {
        totalStudied: 0,
        totalPhrases: selectedPhrases.length,
        masteredPhrases: 0,
        reviewsDue: selectedPhrases.length,
        averageScore: 0,
        averageProgress: 0,
      },
    };

    // Save to storage
    this.storage.addVocabularySet(vocabularySet);

    // Emit event
    this.emitEvent({
      type: "setCreated",
      set: vocabularySet,
      timestamp: new Date(),
    });

    return vocabularySet;
  }

  /**
   * Get phrases sorted alphabetically, ignoring articles
   */
  sortPhrasesAlphabetically(phrases: SavedPhrase[]): SavedPhrase[] {
    if (!this.config.sortIgnoreArticles) {
      return phrases.sort((a, b) => a.phrase.localeCompare(b.phrase, "es"));
    }

    return phrases.sort((a, b) => {
      const sortKeyA = createSortKey(a.phrase);
      const sortKeyB = createSortKey(b.phrase);
      return sortKeyA.localeCompare(sortKeyB, "es", { sensitivity: "base" });
    });
  }

  /**
   * Export vocabulary as target_word_list.csv
   */
  async exportTargetWordList(
    setId?: string,
    includeTranslations: boolean = true,
  ): Promise<string> {
    let phrasesToExport: SavedPhrase[];

    if (setId) {
      const vocabularySet = this.storage
        .loadVocabularySets()
        .find((set) => set.id === setId);
      if (!vocabularySet) {
        throw new Error("Vocabulary set not found");
      }
      phrasesToExport = vocabularySet.phrases;
    } else {
      phrasesToExport = Array.from(
        this.currentPhrases.values(),
      ) as SavedPhrase[];
    }

    // Sort alphabetically
    const sortedPhrases = this.sortPhrasesAlphabetically(phrasesToExport);

    // Generate CSV headers
    const headers = [
      "Word/Phrase",
      "Translation",
      "Category",
      "Part of Speech",
      "Difficulty",
      "Context",
      "Gender",
      "Article",
      "Conjugation",
      "Date Added",
      "Study Progress",
    ];

    // Generate CSV rows
    const rows = sortedPhrases.map((phrase) => [
      phrase.phrase,
      includeTranslations
        ? phrase.translation || phrase.definition
        : phrase.definition,
      this.getCategoryDisplayName(phrase.category),
      phrase.partOfSpeech,
      phrase.difficulty,
      (phrase.context || "").replace(/"/g, '""'), // Escape quotes
      phrase.gender || "",
      phrase.article || "",
      phrase.conjugation || "",
      phrase.savedAt ? new Date(phrase.savedAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      `${phrase.studyProgress?.correctAnswers ?? 0}/${phrase.studyProgress?.totalAttempts ?? 0}`,
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.map((header) => `"${header}"`).join(","),
      ...rows.map((row) => row.map((field) => `"${field}"`).join(",")),
    ].join("\n");

    return csvContent;
  }

  /**
   * Download target_word_list.csv file
   */
  async downloadTargetWordList(
    setId?: string,
    includeTranslations: boolean = true,
  ): Promise<void> {
    const csvContent = await this.exportTargetWordList(
      setId,
      includeTranslations,
    );
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `target_word_list_${timestamp}.csv`;

    // Create and trigger download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Emit event
    this.emitEvent({
      type: "dataExported",
      filename,
      recordCount: csvContent.split("\n").length - 1,
      timestamp: new Date(),
    });
  }

  /**
   * Get vocabulary statistics
   */
  getVocabularyStats(): VocabularyStats {
    const phrases = Array.from(this.currentPhrases.values()) as SavedPhrase[];

    const categoryCounts: Record<string, number> = {};
    const difficultyDistribution: Record<string, number> = {};

    phrases.forEach((phrase) => {
      categoryCounts[phrase.category] =
        (categoryCounts[phrase.category] || 0) + 1;
      difficultyDistribution[phrase.difficulty] =
        (difficultyDistribution[phrase.difficulty] || 0) + 1;
    });

    // Get recently added phrases (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentlyAdded = phrases
      .filter((phrase) => {
        const savedDate = phrase.savedAt ? new Date(phrase.savedAt) : null;
        return savedDate && savedDate >= sevenDaysAgo;
      })
      .sort((a, b) => {
        const dateA = a.savedAt ? new Date(a.savedAt).getTime() : 0;
        const dateB = b.savedAt ? new Date(b.savedAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 10);

    // Get most studied phrases
    const mostStudied = phrases
      .filter((phrase) => (phrase.studyProgress?.totalAttempts ?? 0) > 0)
      .sort(
        (a, b) => (b.studyProgress?.totalAttempts ?? 0) - (a.studyProgress?.totalAttempts ?? 0),
      )
      .slice(0, 10);

    return {
      totalPhrases: phrases.length,
      categoryCounts,
      difficultyDistribution,
      recentlyAdded,
      mostStudied,
    };
  }

  /**
   * Search phrases by text
   */
  searchPhrases(query: string, category?: string): SavedPhrase[] {
    const allPhrases = Array.from(
      this.currentPhrases.values(),
    ) as SavedPhrase[];
    const lowerQuery = query.toLowerCase();

    return allPhrases.filter((phrase) => {
      const matchesQuery =
        phrase.phrase.toLowerCase().includes(lowerQuery) ||
        (phrase.definition || "").toLowerCase().includes(lowerQuery) ||
        (phrase.context || "").toLowerCase().includes(lowerQuery) ||
        (phrase.translation &&
          phrase.translation.toLowerCase().includes(lowerQuery));

      const matchesCategory = !category || phrase.category === category;

      return matchesQuery && matchesCategory;
    });
  }

  /**
   * Get phrases by category
   */
  getPhrasesByCategory(category: string): SavedPhrase[] {
    const phrases = Array.from(this.currentPhrases.values()) as SavedPhrase[];
    return this.sortPhrasesAlphabetically(
      phrases.filter((phrase) => phrase.category === category),
    );
  }

  /**
   * Add event listener
   */
  addEventListener(listener: (event: VocabularyEvent) => void): void {
    this.listeners.add(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: (event: VocabularyEvent) => void): void {
    this.listeners.delete(listener);
  }

  /**
   * Private Methods
   */
  private async loadCurrentPhrases(): Promise<void> {
    try {
      const vocabularySets = this.storage.loadVocabularySets();
      const allPhrases = vocabularySets.flatMap((set) => set.phrases);

      allPhrases.forEach((phrase) => {
        this.currentPhrases.set(phrase.id, phrase);
      });
    } catch (error) {
      logger.error("Error loading current phrases:", error);
    }
  }

  private async savePhrases(): Promise<void> {
    // This method would implement additional saving logic if needed
    // The VocabularyStorage already handles persistence
  }

  private async addPhraseToSet(
    phrase: SavedPhrase,
    setId: string,
  ): Promise<void> {
    const vocabularySets = this.storage.loadVocabularySets();
    const targetSet = vocabularySets.find((set) => set.id === setId);

    if (!targetSet) {
      throw new Error(`Vocabulary set with ID ${setId} not found`);
    }

    // Check if phrase already exists in set
    if (targetSet.phrases.some((p) => p.id === phrase.id)) {
      return; // Already exists
    }

    // Add phrase to set
    targetSet.phrases.push(phrase);
    targetSet.lastModified = new Date();
    if (targetSet.studyStats) {
      targetSet.studyStats.totalPhrases = targetSet.phrases.length;
    }

    // Save updated sets
    this.storage.saveVocabularySets(vocabularySets);
  }

  private async addToRecentAdditions(phrase: SavedPhrase): Promise<void> {
    const vocabularySets = this.storage.loadVocabularySets();
    let recentSet = vocabularySets.find(
      (set) => set.name === "Recent Additions",
    );

    if (!recentSet) {
      // Create "Recent Additions" set
      recentSet = {
        id: "recent_additions",
        name: "Recent Additions",
        description: "Recently added phrases",
        phrases: [],
        createdAt: new Date(),
        lastModified: new Date(),
        studyStats: {
          totalStudied: 0,
          totalPhrases: 0,
          masteredPhrases: 0,
          reviewsDue: 0,
          averageScore: 0,
          averageProgress: 0,
        },
      };
      vocabularySets.push(recentSet);
    }

    // Add phrase to recent set
    recentSet.phrases.push(phrase);
    recentSet.lastModified = new Date();
    if (recentSet.studyStats) {
      recentSet.studyStats.totalPhrases = recentSet.phrases.length;
    }

    // Save updated sets
    this.storage.saveVocabularySets(vocabularySets);
  }

  private async translatePhrase(
    phrase: string,
    definition: string,
  ): Promise<string | undefined> {
    if (!this.config.enableTranslation) return undefined;

    try {
      // Call translation service (would integrate with actual translation API)
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: phrase,
          context: definition,
          targetLanguage: "en",
          sourceLanguage: "es",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.translation;
      }
    } catch (error) {
      logger.error("Translation error:", error);
    }

    return undefined;
  }

  private getCategoryDisplayName(category: string): string {
    const categoryMap: Record<string, string> = {
      sustantivos: "Nouns",
      verbos: "Verbs",
      adjetivos: "Adjectives",
      adverbios: "Adverbs",
      frasesClaves: "Key Phrases",
    };
    return categoryMap[category] || category;
  }

  private emitEvent(event: VocabularyEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        logger.error("Error in vocabulary event listener:", error);
      }
    });
  }
}

export interface VocabularyEvent {
  type: "phraseAdded" | "phraseRemoved" | "setCreated" | "dataExported";
  phrase?: SavedPhrase;
  phraseId?: string;
  set?: VocabularySet;
  filename?: string;
  recordCount?: number;
  timestamp: Date;
}

export default VocabularyManager;
