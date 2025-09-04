// Session Logger - Comprehensive user interaction tracking
import { 
  SessionInteraction, 
  InteractionType, 
  InteractionData, 
  SessionMetadata, 
  SessionSummary, 
  SessionStorage, 
  SessionLoggerSettings,
  LearningMetrics,
  SessionReport
} from '@/types/session';

export class SessionLogger {
  private sessionId: string;
  private interactions: SessionInteraction[] = [];
  private sessionMetadata: SessionMetadata;
  private settings: SessionLoggerSettings;
  private startTime: number;
  private lastActivity: number;

  constructor(settings: Partial<SessionLoggerSettings> = {}) {
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
    this.lastActivity = this.startTime;
    
    this.settings = {
      enabled: true,
      maxInteractions: 1000,
      persistToStorage: true,
      trackUserAgent: true,
      trackLocation: false,
      anonymizeData: false,
      autoExport: false,
      exportInterval: 30,
      ...settings
    };

    this.sessionMetadata = {
      sessionId: this.sessionId,
      startTime: this.startTime,
      lastActivity: this.lastActivity,
      deviceType: this.detectDeviceType(),
      browserName: this.detectBrowser(),
      language: typeof navigator !== 'undefined' ? navigator.language : 'en',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };

    this.initializeSession();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private detectDeviceType(): 'desktop' | 'tablet' | 'mobile' {
    if (typeof window === 'undefined') return 'desktop';
    
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  private detectBrowser(): string {
    if (typeof navigator === 'undefined') return 'unknown';
    
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'other';
  }

  private initializeSession(): void {
    if (!this.settings.enabled) return;
    
    // Log session start
    this.logInteraction('session_started', {
      userAgent: this.settings.trackUserAgent && typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined
    });

    // Load existing session data if persistent
    if (this.settings.persistToStorage) {
      this.loadFromStorage();
    }

    // Setup auto-save
    this.setupAutoSave();
  }

  public logInteraction(type: InteractionType, data: InteractionData = {}): void {
    if (!this.settings.enabled) return;

    const interaction: SessionInteraction = {
      id: `${this.sessionId}_${this.interactions.length + 1}`,
      timestamp: Date.now(),
      type,
      data: this.settings.anonymizeData ? this.anonymizeData(data) : data,
      metadata: this.sessionMetadata
    };

    this.interactions.push(interaction);
    this.lastActivity = interaction.timestamp;
    this.sessionMetadata.lastActivity = this.lastActivity;

    // Trim interactions if exceeding max
    if (this.interactions.length > this.settings.maxInteractions) {
      this.interactions = this.interactions.slice(-this.settings.maxInteractions);
    }

    // Save to storage if enabled
    if (this.settings.persistToStorage) {
      this.saveToStorage();
    }

    console.debug('Session interaction logged:', { type, data });
  }

  // Specific logging methods for better type safety
  public logSearch(query: string, resultCount: number, duration: number): void {
    this.logInteraction('search_query', {
      searchQuery: query,
      searchResultCount: resultCount,
      searchDuration: duration
    });
  }

  public logImageSelection(imageId: string, imageUrl: string, selectionTime: number): void {
    this.logInteraction('image_selected', {
      imageId,
      imageUrl,
      selectionTime
    });
  }

  public logDescriptionGeneration(
    style: string,
    language: string,
    wordCount: number,
    generationTime: number,
    text?: string
  ): void {
    this.logInteraction('description_generated', {
      descriptionStyle: style,
      descriptionLanguage: language,
      descriptionWordCount: wordCount,
      descriptionGenerationTime: generationTime,
      descriptionText: this.settings.anonymizeData ? undefined : text
    });
  }

  public logQAGeneration(
    question: string,
    answer: string,
    difficulty: string,
    category: string,
    generationTime: number
  ): void {
    this.logInteraction('qa_generated', {
      questionText: question,
      answerText: answer,
      qaDifficulty: difficulty,
      qaCategory: category,
      qaGenerationTime: generationTime
    });
  }

  public logVocabularySelection(words: string[], category: string): void {
    this.logInteraction('vocabulary_selected', {
      selectedWords: words,
      vocabularyCategory: category
    });
  }

  public logPhraseExtraction(phrases: string[], categories: Record<string, string[]>): void {
    this.logInteraction('phrase_extracted', {
      extractedPhrases: phrases,
      phraseCategories: categories
    });
  }

  public logError(message: string, stack?: string, code?: string): void {
    this.logInteraction('error_occurred', {
      errorMessage: message,
      errorStack: stack,
      errorCode: code
    });
  }

  public logSettingsChange(settingName: string, oldValue: any, newValue: any): void {
    this.logInteraction('settings_changed', {
      settingName,
      oldValue,
      newValue
    });
  }

  private anonymizeData(data: InteractionData): InteractionData {
    const anonymized = { ...data };
    
    // Remove or hash sensitive data
    if (anonymized.searchQuery) {
      anonymized.searchQuery = this.hashString(anonymized.searchQuery);
    }
    
    if (anonymized.descriptionText) {
      delete anonymized.descriptionText;
    }
    
    if (anonymized.questionText) {
      anonymized.questionText = this.hashString(anonymized.questionText);
    }
    
    return anonymized;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `hash_${hash}`;
  }

  public generateSummary(): SessionSummary {
    const endTime = Date.now();
    const totalDuration = endTime - this.startTime;
    
    // Count interactions by type
    const interactionBreakdown: Record<InteractionType, number> = {} as Record<InteractionType, number>;
    this.interactions.forEach(interaction => {
      interactionBreakdown[interaction.type] = (interactionBreakdown[interaction.type] || 0) + 1;
    });

    // Calculate search statistics
    const searchInteractions = this.interactions.filter(i => i.type === 'search_query');
    const uniqueQueries = [...new Set(searchInteractions.map(i => i.data.searchQuery))];
    const averageSearchTime = searchInteractions.length > 0 
      ? searchInteractions.reduce((sum, i) => sum + (i.data.searchDuration || 0), 0) / searchInteractions.length 
      : 0;

    // Calculate image statistics
    const imageInteractions = this.interactions.filter(i => i.type === 'image_selected');
    const uniqueImages = [...new Set(imageInteractions.map(i => i.data.imageId))];
    const averageSelectionTime = imageInteractions.length > 0
      ? imageInteractions.reduce((sum, i) => sum + (i.data.selectionTime || 0), 0) / imageInteractions.length
      : 0;

    // Calculate description statistics
    const descriptionInteractions = this.interactions.filter(i => i.type === 'description_generated');
    const descriptionsByStyle: Record<string, number> = {};
    const descriptionsByLanguage: Record<string, number> = {};
    let totalWordsGenerated = 0;
    let totalDescriptionTime = 0;

    descriptionInteractions.forEach(interaction => {
      const style = interaction.data.descriptionStyle || 'unknown';
      const language = interaction.data.descriptionLanguage || 'unknown';
      
      descriptionsByStyle[style] = (descriptionsByStyle[style] || 0) + 1;
      descriptionsByLanguage[language] = (descriptionsByLanguage[language] || 0) + 1;
      totalWordsGenerated += interaction.data.descriptionWordCount || 0;
      totalDescriptionTime += interaction.data.descriptionGenerationTime || 0;
    });

    const averageDescriptionTime = descriptionInteractions.length > 0 
      ? totalDescriptionTime / descriptionInteractions.length 
      : 0;

    // Calculate Q&A statistics
    const qaInteractions = this.interactions.filter(i => i.type === 'qa_generated');
    const questionsByDifficulty: Record<string, number> = {};
    const questionsByCategory: Record<string, number> = {};
    let totalQATime = 0;

    qaInteractions.forEach(interaction => {
      const difficulty = interaction.data.qaDifficulty || 'unknown';
      const category = interaction.data.qaCategory || 'unknown';
      
      questionsByDifficulty[difficulty] = (questionsByDifficulty[difficulty] || 0) + 1;
      questionsByCategory[category] = (questionsByCategory[category] || 0) + 1;
      totalQATime += interaction.data.qaGenerationTime || 0;
    });

    const averageQATime = qaInteractions.length > 0 ? totalQATime / qaInteractions.length : 0;

    // Calculate vocabulary statistics
    const vocabularyInteractions = this.interactions.filter(i => i.type === 'vocabulary_selected');
    const vocabularyByCategory: Record<string, number> = {};
    let vocabularySelected = 0;

    vocabularyInteractions.forEach(interaction => {
      const category = interaction.data.vocabularyCategory || 'unknown';
      const wordsCount = interaction.data.selectedWords?.length || 0;
      
      vocabularyByCategory[category] = (vocabularyByCategory[category] || 0) + wordsCount;
      vocabularySelected += wordsCount;
    });

    // Calculate error statistics
    const errorInteractions = this.interactions.filter(i => i.type === 'error_occurred');
    const errorsByType: Record<string, number> = {};
    errorInteractions.forEach(interaction => {
      const errorType = interaction.data.errorCode || 'unknown';
      errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;
    });

    // Calculate learning scores
    const learningScore = this.calculateLearningScore();
    const engagementScore = this.calculateEngagementScore();
    const comprehensionLevel = this.determineComprehensionLevel();

    return {
      sessionId: this.sessionId,
      startTime: this.startTime,
      endTime: endTime,
      totalDuration,
      totalInteractions: this.interactions.length,
      interactionBreakdown,
      
      totalSearches: searchInteractions.length,
      uniqueQueries,
      averageSearchTime,
      
      imagesViewed: imageInteractions.length,
      uniqueImages,
      averageSelectionTime,
      
      descriptionsGenerated: descriptionInteractions.length,
      descriptionsByStyle,
      descriptionsByLanguage,
      averageDescriptionTime,
      totalWordsGenerated,
      
      questionsGenerated: qaInteractions.length,
      questionsByDifficulty,
      questionsByCategory,
      averageQATime,
      
      phrasesExtracted: this.interactions.filter(i => i.type === 'phrase_extracted').length,
      vocabularySelected,
      vocabularyByCategory,
      
      errorCount: errorInteractions.length,
      errorsByType,
      
      learningScore,
      engagementScore,
      comprehensionLevel,
      
      exportCount: this.interactions.filter(i => i.type === 'export_initiated').length,
      exportFormats: []
    };
  }

  private calculateLearningScore(): number {
    // Score based on variety and depth of interactions
    const weights = {
      description_generated: 10,
      qa_generated: 15,
      vocabulary_selected: 8,
      phrase_extracted: 5,
      image_selected: 3,
      search_query: 2
    };

    let totalScore = 0;
    let maxPossibleScore = 0;

    Object.entries(weights).forEach(([type, weight]) => {
      const count = this.interactions.filter(i => i.type === type).length;
      totalScore += Math.min(count * weight, weight * 10); // Cap at 10 instances per type
      maxPossibleScore += weight * 10;
    });

    return Math.round((totalScore / maxPossibleScore) * 100);
  }

  private calculateEngagementScore(): number {
    const totalTime = Date.now() - this.startTime;
    const activeTime = this.interactions.length * 30000; // Assume 30s per interaction
    const engagementRatio = Math.min(activeTime / totalTime, 1);
    
    return Math.round(engagementRatio * 100);
  }

  private determineComprehensionLevel(): 'beginner' | 'intermediate' | 'advanced' {
    const summary = this.generateSummary();
    
    if (summary.learningScore >= 80 && summary.vocabularySelected >= 50) {
      return 'advanced';
    } else if (summary.learningScore >= 50 && summary.vocabularySelected >= 20) {
      return 'intermediate';
    }
    
    return 'beginner';
  }

  public getLearningMetrics(): LearningMetrics {
    const readingInteractions = this.interactions.filter(i => 
      i.type === 'description_viewed' || i.type === 'qa_viewed'
    );
    
    const timeSpentReading = readingInteractions.reduce((sum, i) => 
      sum + (i.data.duration || 0), 0
    );

    const vocabularyEncountered = this.interactions
      .filter(i => i.type === 'vocabulary_selected')
      .reduce((sum, i) => sum + (i.data.selectedWords?.length || 0), 0);

    return {
      timeSpentReading,
      descriptionsRead: this.interactions.filter(i => i.type === 'description_viewed').length,
      questionsAnswered: this.interactions.filter(i => i.type === 'qa_viewed').length,
      vocabularyEncountered,
      repetitionPatterns: {},
      difficultyProgression: [],
      focusAreas: [],
      improvementSuggestions: this.generateImprovementSuggestions()
    };
  }

  private generateImprovementSuggestions(): string[] {
    const suggestions: string[] = [];
    const summary = this.generateSummary();

    if (summary.vocabularySelected < 10) {
      suggestions.push('Try selecting more vocabulary words to enhance learning');
    }

    if (summary.descriptionsGenerated < 3) {
      suggestions.push('Generate more descriptions in different styles to improve comprehension');
    }

    if (summary.questionsGenerated === 0) {
      suggestions.push('Use the Q&A feature to test your understanding');
    }

    if (summary.errorCount > 5) {
      suggestions.push('Check your internet connection for better experience');
    }

    return suggestions;
  }

  private saveToStorage(): void {
    if (typeof localStorage === 'undefined') return;
    
    try {
      const storage: SessionStorage = {
        currentSession: this.sessionMetadata,
        interactions: this.interactions,
        settings: this.settings
      };

      localStorage.setItem(`session_${this.sessionId}`, JSON.stringify(storage));
    } catch (error) {
      console.warn('Failed to save session to storage:', error);
    }
  }

  private loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(`session_${this.sessionId}`);
      if (stored) {
        const storage: SessionStorage = JSON.parse(stored);
        this.interactions = storage.interactions || [];
        this.settings = { ...this.settings, ...storage.settings };
      }
    } catch (error) {
      console.warn('Failed to load session from storage:', error);
    }
  }

  private setupAutoSave(): void {
    if (typeof window === 'undefined') return;

    // Save on page unload
    window.addEventListener('beforeunload', () => {
      this.logInteraction('session_ended', {
        duration: Date.now() - this.startTime
      });
      
      if (this.settings.persistToStorage) {
        this.saveToStorage();
      }
    });

    // Periodic auto-save
    if (this.settings.autoExport) {
      setInterval(() => {
        this.saveToStorage();
      }, this.settings.exportInterval * 60 * 1000);
    }
  }

  // Getters
  public getSessionId(): string {
    return this.sessionId;
  }

  public getInteractions(): SessionInteraction[] {
    return [...this.interactions];
  }

  public getSessionMetadata(): SessionMetadata {
    return { ...this.sessionMetadata };
  }

  public getSettings(): SessionLoggerSettings {
    return { ...this.settings };
  }

  // Clear session
  public clearSession(): void {
    this.interactions = [];
    this.lastActivity = Date.now();
    this.sessionMetadata.lastActivity = this.lastActivity;
    
    if (this.settings.persistToStorage && typeof localStorage !== 'undefined') {
      localStorage.removeItem(`session_${this.sessionId}`);
    }
  }

  // Export functionality
  public exportSession(format: 'json' | 'text' | 'csv' = 'json'): string {
    this.logInteraction('export_initiated', { exportFormat: format });
    
    const summary = this.generateSummary();
    const learningMetrics = this.getLearningMetrics();
    
    const report: SessionReport = {
      summary,
      interactions: this.interactions,
      learningMetrics,
      recommendations: learningMetrics.improvementSuggestions,
      exportFormat: format,
      generatedAt: Date.now()
    };

    switch (format) {
      case 'json':
        return JSON.stringify(report, null, 2);
      case 'text':
        return this.formatAsText(report);
      case 'csv':
        return this.formatAsCSV(report);
      default:
        return JSON.stringify(report, null, 2);
    }
  }

  private formatAsText(report: SessionReport): string {
    const { summary, learningMetrics } = report;
    
    return `
SESSION REPORT
==============
Session ID: ${summary.sessionId}
Duration: ${Math.round(summary.totalDuration / 1000 / 60)} minutes
Total Interactions: ${summary.totalInteractions}

ACTIVITY SUMMARY
================
Searches: ${summary.totalSearches}
Images Viewed: ${summary.imagesViewed}  
Descriptions Generated: ${summary.descriptionsGenerated}
Questions Generated: ${summary.questionsGenerated}
Vocabulary Selected: ${summary.vocabularySelected}

LEARNING METRICS
================
Learning Score: ${summary.learningScore}/100
Engagement Score: ${summary.engagementScore}/100
Comprehension Level: ${summary.comprehensionLevel}
Time Spent Reading: ${Math.round(learningMetrics.timeSpentReading / 1000 / 60)} minutes

RECOMMENDATIONS
===============
${report.recommendations.map(r => `- ${r}`).join('\n')}

Generated on: ${new Date(report.generatedAt).toLocaleString()}
    `.trim();
  }

  private formatAsCSV(report: SessionReport): string {
    const headers = [
      'timestamp', 'interaction_type', 'component', 'duration', 
      'search_query', 'image_id', 'description_style', 'vocabulary_count'
    ];

    const rows = report.interactions.map(interaction => [
      new Date(interaction.timestamp).toISOString(),
      interaction.type,
      interaction.data.componentName || '',
      interaction.data.duration || '',
      interaction.data.searchQuery || '',
      interaction.data.imageId || '',
      interaction.data.descriptionStyle || '',
      interaction.data.selectedWords?.length || ''
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }
}

// Singleton instance for global use (client-side only)
let globalSessionLogger: SessionLogger | null = null;

export function getSessionLogger(): SessionLogger {
  // Only create on client-side
  if (typeof window === 'undefined') {
    // Return a minimal mock for SSR
    return {
      logInteraction: () => {},
      logSearch: () => {},
      logImageSelection: () => {},
      logDescriptionGeneration: () => {},
      logQAGeneration: () => {},
      logVocabularySelection: () => {},
      logPhraseExtraction: () => {},
      logError: () => {},
      logSettingsChange: () => {},
      generateSummary: () => ({} as any),
      getLearningMetrics: () => ({} as any),
      getSessionId: () => 'ssr-mock',
      getInteractions: () => [],
      getSessionMetadata: () => ({} as any),
      getSettings: () => ({} as any),
      clearSession: () => {},
      exportSession: () => '{}'
    } as SessionLogger;
  }
  
  if (!globalSessionLogger) {
    globalSessionLogger = new SessionLogger();
  }
  return globalSessionLogger;
}

export function createSessionLogger(settings?: Partial<SessionLoggerSettings>): SessionLogger {
  return new SessionLogger(settings);
}