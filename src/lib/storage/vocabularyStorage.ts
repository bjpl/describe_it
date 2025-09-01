/**
 * Vocabulary Storage System
 * Manages persistence of vocabulary sets and study progress in localStorage
 */

import { VocabularySet, SavedPhrase } from '@/types/api';
import { ReviewItem, StudyStatistics } from '../algorithms/spacedRepetition';

export interface StoredVocabularyData {
  vocabularySets: VocabularySet[];
  reviewItems: ReviewItem[];
  studyHistory: StudySession[];
  settings: VocabularySettings;
  lastBackup?: string;
  version: string;
}

export interface StudySession {
  id: string;
  date: string;
  duration: number; // minutes
  itemsStudied: number;
  correctAnswers: number;
  averageQuality: number;
  mode: 'flashcards' | 'quiz' | 'review';
}

export interface VocabularySettings {
  dailyGoal: number;
  maxNewItems: number;
  maxReviewItems: number;
  autoAdvance: boolean;
  showArticles: boolean;
  showConjugations: boolean;
  soundEnabled: boolean;
  darkMode: boolean;
  studyReminders: boolean;
}

export class VocabularyStorage {
  private static readonly STORAGE_KEY = 'vocabulary_builder_data';
  private static readonly BACKUP_KEY = 'vocabulary_builder_backup';
  private static readonly VERSION = '1.0.0';
  
  private static readonly DEFAULT_SETTINGS: VocabularySettings = {
    dailyGoal: 20,
    maxNewItems: 10,
    maxReviewItems: 50,
    autoAdvance: false,
    showArticles: true,
    showConjugations: true,
    soundEnabled: true,
    darkMode: false,
    studyReminders: true
  };
  
  /**
   * Load all vocabulary data from localStorage
   */
  static loadData(): StoredVocabularyData {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        return this.getDefaultData();
      }
      
      const data: StoredVocabularyData = JSON.parse(stored);
      
      // Migrate data if needed
      return this.migrateData(data);
    } catch (error) {
      console.error('Error loading vocabulary data:', error);
      return this.getDefaultData();
    }
  }
  
  /**
   * Save all vocabulary data to localStorage
   */
  static saveData(data: StoredVocabularyData): boolean {
    try {
      // Create backup before saving
      this.createBackup();
      
      // Update version and timestamp
      const dataToSave: StoredVocabularyData = {
        ...data,
        lastBackup: new Date().toISOString(),
        version: this.VERSION
      };
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(dataToSave));
      return true;
    } catch (error) {
      console.error('Error saving vocabulary data:', error);
      return false;
    }
  }
  
  /**
   * Load vocabulary sets only
   */
  static loadVocabularySets(): VocabularySet[] {
    const data = this.loadData();
    return data.vocabularySets.map(set => ({
      ...set,
      createdAt: new Date(set.createdAt),
      lastModified: new Date(set.lastModified),
      phrases: set.phrases.map(phrase => ({
        ...phrase,
        createdAt: new Date(phrase.createdAt),
        savedAt: new Date(phrase.savedAt),
        studyProgress: {
          ...phrase.studyProgress,
          lastReviewed: phrase.studyProgress.lastReviewed 
            ? new Date(phrase.studyProgress.lastReviewed)
            : undefined,
          nextReview: phrase.studyProgress.nextReview
            ? new Date(phrase.studyProgress.nextReview)
            : undefined
        }
      }))
    }));
  }
  
  /**
   * Save vocabulary sets
   */
  static saveVocabularySets(sets: VocabularySet[]): boolean {
    const data = this.loadData();
    data.vocabularySets = sets;
    return this.saveData(data);
  }
  
  /**
   * Add a new vocabulary set
   */
  static addVocabularySet(set: VocabularySet): boolean {
    const data = this.loadData();
    data.vocabularySets.push(set);
    return this.saveData(data);
  }
  
  /**
   * Update an existing vocabulary set
   */
  static updateVocabularySet(updatedSet: VocabularySet): boolean {
    const data = this.loadData();
    const index = data.vocabularySets.findIndex(set => set.id === updatedSet.id);
    
    if (index !== -1) {
      data.vocabularySets[index] = updatedSet;
      return this.saveData(data);
    }
    
    return false;
  }
  
  /**
   * Delete a vocabulary set
   */
  static deleteVocabularySet(setId: string): boolean {
    const data = this.loadData();
    data.vocabularySets = data.vocabularySets.filter(set => set.id !== setId);
    data.reviewItems = data.reviewItems.filter(item => !item.id.startsWith(setId));
    return this.saveData(data);
  }
  
  /**
   * Load review items
   */
  static loadReviewItems(): ReviewItem[] {
    const data = this.loadData();
    return data.reviewItems.map(item => ({
      ...item,
      lastReviewed: item.lastReviewed ? new Date(item.lastReviewed) : undefined,
      nextReview: item.nextReview ? new Date(item.nextReview) : undefined
    }));
  }
  
  /**
   * Save review items
   */
  static saveReviewItems(items: ReviewItem[]): boolean {
    const data = this.loadData();
    data.reviewItems = items;
    return this.saveData(data);
  }
  
  /**
   * Add study session to history
   */
  static addStudySession(session: StudySession): boolean {
    const data = this.loadData();
    data.studyHistory.push(session);
    
    // Keep only last 100 sessions
    if (data.studyHistory.length > 100) {
      data.studyHistory = data.studyHistory.slice(-100);
    }
    
    return this.saveData(data);
  }
  
  /**
   * Get study history
   */
  static getStudyHistory(days: number = 30): StudySession[] {
    const data = this.loadData();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return data.studyHistory.filter(session => 
      new Date(session.date) >= cutoffDate
    );
  }
  
  /**
   * Load settings
   */
  static loadSettings(): VocabularySettings {
    const data = this.loadData();
    return { ...this.DEFAULT_SETTINGS, ...data.settings };
  }
  
  /**
   * Save settings
   */
  static saveSettings(settings: VocabularySettings): boolean {
    const data = this.loadData();
    data.settings = settings;
    return this.saveData(data);
  }
  
  /**
   * Export data as JSON
   */
  static exportData(): string {
    const data = this.loadData();
    return JSON.stringify(data, null, 2);
  }
  
  /**
   * Import data from JSON
   */
  static importData(jsonData: string): boolean {
    try {
      const data: StoredVocabularyData = JSON.parse(jsonData);
      
      // Validate data structure
      if (!this.validateData(data)) {
        throw new Error('Invalid data structure');
      }
      
      // Migrate if needed
      const migratedData = this.migrateData(data);
      
      return this.saveData(migratedData);
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }
  
  /**
   * Export vocabulary set as CSV
   */
  static exportSetAsCSV(set: VocabularySet): string {
    const headers = [
      'Phrase',
      'Definition',
      'Translation',
      'Category',
      'Part of Speech',
      'Difficulty',
      'Context',
      'Gender',
      'Article',
      'Conjugation',
      'Correct Answers',
      'Total Attempts',
      'Last Reviewed',
      'Next Review'
    ];
    
    const rows = set.phrases.map(phrase => [
      phrase.phrase,
      phrase.definition,
      phrase.translation || '',
      phrase.category,
      phrase.partOfSpeech,
      phrase.difficulty,
      phrase.context,
      phrase.gender || '',
      phrase.article || '',
      phrase.conjugation || '',
      phrase.studyProgress.correctAnswers.toString(),
      phrase.studyProgress.totalAttempts.toString(),
      phrase.studyProgress.lastReviewed?.toISOString() || '',
      phrase.studyProgress.nextReview?.toISOString() || ''
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field.replace(/"/g, '""')}"`).join(','))
      .join('\n');
    
    return csvContent;
  }
  
  /**
   * Import vocabulary set from CSV
   */
  static importSetFromCSV(csvData: string, setName: string): VocabularySet | null {
    try {
      const lines = csvData.trim().split('\n');
      if (lines.length < 2) {
        throw new Error('CSV must have at least header and one data row');
      }
      
      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
      const phrases: SavedPhrase[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = this.parseCSVLine(lines[i]);
        
        if (values.length >= 6) { // Minimum required fields
          const phrase: SavedPhrase = {
            id: `imported_${Date.now()}_${i}`,
            phrase: values[0] || '',
            definition: values[1] || '',
            translation: values[2] || undefined,
            category: values[3] || 'frasesClaves',
            partOfSpeech: values[4] || '',
            difficulty: (values[5] as 'beginner' | 'intermediate' | 'advanced') || 'beginner',
            context: values[6] || '',
            gender: (values[7] as 'masculino' | 'femenino' | 'neutro') || undefined,
            article: values[8] || undefined,
            conjugation: values[9] || undefined,
            sortKey: values[0]?.toLowerCase() || '',
            saved: true,
            createdAt: new Date(),
            savedAt: new Date(),
            studyProgress: {
              correctAnswers: parseInt(values[10]) || 0,
              totalAttempts: parseInt(values[11]) || 0,
              lastReviewed: values[12] ? new Date(values[12]) : undefined,
              nextReview: values[13] ? new Date(values[13]) : undefined
            }
          };
          
          phrases.push(phrase);
        }
      }
      
      if (phrases.length === 0) {
        throw new Error('No valid phrases found in CSV');
      }
      
      const vocabularySet: VocabularySet = {
        id: `imported_${Date.now()}`,
        name: setName,
        description: `Imported from CSV - ${phrases.length} phrases`,
        phrases,
        createdAt: new Date(),
        lastModified: new Date(),
        studyStats: {
          totalPhrases: phrases.length,
          masteredPhrases: phrases.filter(p => p.studyProgress.correctAnswers >= 3).length,
          reviewsDue: phrases.filter(p => !p.studyProgress.nextReview || p.studyProgress.nextReview <= new Date()).length,
          averageProgress: phrases.length > 0 
            ? phrases.reduce((sum, p) => sum + (p.studyProgress.totalAttempts > 0 ? p.studyProgress.correctAnswers / p.studyProgress.totalAttempts : 0), 0) / phrases.length
            : 0
        }
      };
      
      return vocabularySet;
    } catch (error) {
      console.error('Error importing CSV:', error);
      return null;
    }
  }
  
  /**
   * Create backup of current data
   */
  private static createBackup(): void {
    try {
      const currentData = localStorage.getItem(this.STORAGE_KEY);
      if (currentData) {
        localStorage.setItem(this.BACKUP_KEY, currentData);
      }
    } catch (error) {
      console.error('Error creating backup:', error);
    }
  }
  
  /**
   * Restore from backup
   */
  static restoreFromBackup(): boolean {
    try {
      const backup = localStorage.getItem(this.BACKUP_KEY);
      if (backup) {
        localStorage.setItem(this.STORAGE_KEY, backup);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error restoring backup:', error);
      return false;
    }
  }
  
  /**
   * Clear all data
   */
  static clearAllData(): boolean {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.BACKUP_KEY);
      return true;
    } catch (error) {
      console.error('Error clearing data:', error);
      return false;
    }
  }
  
  /**
   * Get default data structure
   */
  private static getDefaultData(): StoredVocabularyData {
    return {
      vocabularySets: [],
      reviewItems: [],
      studyHistory: [],
      settings: this.DEFAULT_SETTINGS,
      version: this.VERSION
    };
  }
  
  /**
   * Validate data structure
   */
  private static validateData(data: any): data is StoredVocabularyData {
    return (
      data &&
      Array.isArray(data.vocabularySets) &&
      Array.isArray(data.reviewItems) &&
      Array.isArray(data.studyHistory) &&
      data.settings &&
      typeof data.settings === 'object'
    );
  }
  
  /**
   * Migrate data from older versions
   */
  private static migrateData(data: StoredVocabularyData): StoredVocabularyData {
    // Add migration logic here when needed
    return {
      ...data,
      version: this.VERSION,
      settings: { ...this.DEFAULT_SETTINGS, ...data.settings }
    };
  }
  
  /**
   * Parse CSV line handling quoted values
   */
  private static parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }
}

export default VocabularyStorage;