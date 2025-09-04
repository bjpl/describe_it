'use client';

/**
 * Vocabulary Extractor Component - Agent Gamma-3 Implementation
 * Enhanced phrase extraction with 5-category system and click-to-add functionality
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { BookOpen, Plus, Download, Filter, Search, ChevronDown, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { CategorizedPhrase } from '@/types/api';
import { PhraseExtractor, PhraseCategory } from '@/lib/services/phraseExtractor';
import { VocabularyManager, ClickToAddOptions } from '@/lib/services/vocabularyManager';
import { getDifficultyColor, getCategoryColor } from '@/lib/utils/phrase-helpers';

interface VocabularyExtractorProps {
  selectedImage: any;
  descriptionText: string | null;
  style: 'narrativo' | 'poetico' | 'academico' | 'conversacional' | 'infantil';
  onPhrasesUpdated?: (phrases: CategorizedPhrase[]) => void;
}

interface ExtractionState {
  isExtracting: boolean;
  error: string | null;
  categorizedPhrases: Record<PhraseCategory, CategorizedPhrase[]>;
  selectedPhrases: Set<string>;
  activeCategories: Set<PhraseCategory>;
  searchTerm: string;
}

const VocabularyExtractor: React.FC<VocabularyExtractorProps> = ({
  selectedImage,
  descriptionText,
  style,
  onPhrasesUpdated
}) => {
  const [state, setState] = useState<ExtractionState>({
    isExtracting: false,
    error: null,
    categorizedPhrases: {
      sustantivos: [],
      verbos: [],
      adjetivos: [],
      adverbios: [],
      frasesClaves: []
    },
    selectedPhrases: new Set(),
    activeCategories: new Set(['sustantivos', 'verbos', 'adjetivos', 'adverbios', 'frasesClaves']),
    searchTerm: ''
  });

  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [maxPhrases, setMaxPhrases] = useState(15);
  const [vocabularyManager] = useState(() => new VocabularyManager());
  const [addedPhrases, setAddedPhrases] = useState<Set<string>>(new Set());

  // Extract phrases when dependencies change
  const extractPhrases = useCallback(async () => {
    if (!selectedImage || !descriptionText) {
      setState(prev => ({ ...prev, error: 'No image or description available for extraction' }));
      return;
    }

    setState(prev => ({ ...prev, isExtracting: true, error: null }));

    try {
      const imageUrl = selectedImage.urls?.regular;
      const categorizedPhrases = await PhraseExtractor.extractCategorizedPhrases({
        description: descriptionText,
        imageUrl,
        targetLevel: difficulty,
        maxPhrases,
        categories: Array.from(state.activeCategories)
      });

      setState(prev => ({
        ...prev,
        categorizedPhrases,
        isExtracting: false,
        selectedPhrases: new Set()
      }));

      // Notify parent component
      const allPhrases = Object.values(categorizedPhrases).flat();
      onPhrasesUpdated?.(allPhrases);

    } catch (error) {
      console.error('Phrase extraction error:', error);
      setState(prev => ({
        ...prev,
        isExtracting: false,
        error: error instanceof Error ? error.message : 'Failed to extract phrases'
      }));
    }
  }, [selectedImage, descriptionText, difficulty, maxPhrases, state.activeCategories, onPhrasesUpdated]);

  // Auto-extract when dependencies change
  useEffect(() => {
    if (selectedImage && descriptionText) {
      const timer = setTimeout(extractPhrases, 800);
      return () => clearTimeout(timer);
    }
  }, [extractPhrases]);

  // Handle phrase selection
  const togglePhraseSelection = useCallback((phraseId: string) => {
    setState(prev => ({
      ...prev,
      selectedPhrases: new Set(
        prev.selectedPhrases.has(phraseId)
          ? [...prev.selectedPhrases].filter(id => id !== phraseId)
          : [...prev.selectedPhrases, phraseId]
      )
    }));
  }, []);

  // Handle category filter toggle
  const toggleCategory = useCallback((category: PhraseCategory) => {
    setState(prev => ({
      ...prev,
      activeCategories: new Set(
        prev.activeCategories.has(category)
          ? [...prev.activeCategories].filter(cat => cat !== category)
          : [...prev.activeCategories, category]
      )
    }));
  }, []);

  // Click-to-add phrase to vocabulary
  const addPhraseToVocabulary = useCallback(async (
    phrase: CategorizedPhrase,
    options: ClickToAddOptions = {}
  ) => {
    try {
      await vocabularyManager.addPhraseWithClick(phrase, {
        autoTranslate: true,
        markAsNew: true,
        ...options
      });

      setAddedPhrases(prev => new Set([...prev, phrase.id]));
      
      // Visual feedback
      const button = document.querySelector(`[data-phrase-id="${phrase.id}"]`);
      if (button) {
        button.classList.add('animate-pulse');
        setTimeout(() => button.classList.remove('animate-pulse'), 1000);
      }

    } catch (error) {
      console.error('Error adding phrase to vocabulary:', error);
      alert('Error adding phrase to vocabulary. Please try again.');
    }
  }, [vocabularyManager]);

  // Add selected phrases to vocabulary
  const addSelectedPhrases = useCallback(async () => {
    const selectedPhraseObjects = Object.values(state.categorizedPhrases)
      .flat()
      .filter(phrase => state.selectedPhrases.has(phrase.id));

    if (selectedPhraseObjects.length === 0) {
      alert('Please select phrases to add to vocabulary');
      return;
    }

    try {
      await vocabularyManager.addMultiplePhrases(selectedPhraseObjects, {
        autoTranslate: true,
        markAsNew: true
      });

      selectedPhraseObjects.forEach(phrase => {
        setAddedPhrases(prev => new Set([...prev, phrase.id]));
      });

      setState(prev => ({ ...prev, selectedPhrases: new Set() }));
      alert(`Successfully added ${selectedPhraseObjects.length} phrases to vocabulary!`);

    } catch (error) {
      console.error('Error adding selected phrases:', error);
      alert('Error adding phrases to vocabulary. Please try again.');
    }
  }, [state.categorizedPhrases, state.selectedPhrases, vocabularyManager]);

  // Export vocabulary
  const exportVocabulary = useCallback(async () => {
    try {
      await vocabularyManager.downloadTargetWordList(undefined, true);
      alert('Vocabulary exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      alert('Error exporting vocabulary. Please try again.');
    }
  }, [vocabularyManager]);

  // Filter phrases by search term
  const filteredCategories = useMemo(() => {
    if (!state.searchTerm) return state.categorizedPhrases;

    const filtered: Record<PhraseCategory, CategorizedPhrase[]> = {
      sustantivos: [],
      verbos: [],
      adjetivos: [],
      adverbios: [],
      frasesClaves: []
    };

    Object.entries(state.categorizedPhrases).forEach(([category, phrases]) => {
      filtered[category as PhraseCategory] = phrases.filter(phrase =>
        phrase.phrase.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
        phrase.definition.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
        phrase.context.toLowerCase().includes(state.searchTerm.toLowerCase())
      );
    });

    return filtered;
  }, [state.categorizedPhrases, state.searchTerm]);

  // Get category configurations
  const categoryConfigs = useMemo(() => PhraseExtractor.getAllCategories(), []);

  // Count total phrases
  const totalPhrases = useMemo(() => 
    Object.values(state.categorizedPhrases).reduce((sum, phrases) => sum + phrases.length, 0),
    [state.categorizedPhrases]
  );

  if (!selectedImage) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">
          Select an image to extract vocabulary and phrases.
        </p>
      </div>
    );
  }

  if (!descriptionText) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Vocabulary Extractor</h2>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                Description Required
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                Please generate a description first. The vocabulary will be extracted from the description content.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold">Vocabulary Extractor</h2>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Difficulty Selector */}
          <div className="relative">
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}
              className="appearance-none bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={state.isExtracting}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Max Phrases Selector */}
          <div className="relative">
            <select
              value={maxPhrases}
              onChange={(e) => setMaxPhrases(Number(e.target.value))}
              className="appearance-none bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={state.isExtracting}
            >
              <option value={10}>10 phrases</option>
              <option value={15}>15 phrases</option>
              <option value={20}>20 phrases</option>
              <option value={25}>25 phrases</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Extract Button */}
          <button
            onClick={extractPhrases}
            disabled={state.isExtracting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
          >
            {state.isExtracting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <BookOpen className="h-4 w-4" />
            )}
            Extract
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      {totalPhrases > 0 && (
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search phrases..."
              value={state.searchTerm}
              onChange={(e) => setState(prev => ({ ...prev, searchTerm: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700"
            />
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400 mr-2">Categories:</span>
            {categoryConfigs.map(config => (
              <button
                key={config.name}
                onClick={() => toggleCategory(config.name)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  state.activeCategories.has(config.name)
                    ? config.color
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                }`}
              >
                {config.displayName}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {state.selectedPhrases.size} of {totalPhrases} phrases selected
              </span>
              {state.selectedPhrases.size > 0 && (
                <button
                  onClick={addSelectedPhrases}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Add Selected
                </button>
              )}
            </div>
            
            <button
              onClick={exportVocabulary}
              className="px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm flex items-center gap-1"
              title="Export target_word_list.csv"
            >
              <Download className="h-3 w-3" />
              Export CSV
            </button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {state.error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
                Extraction Error
              </h3>
              <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                {state.error}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {state.isExtracting && (
        <div className="space-y-4">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600 dark:text-gray-400">
              Extracting vocabulary from description...
            </span>
          </div>
          
          {/* Skeleton loading for categories */}
          {categoryConfigs.map(config => (
            <div key={config.name} className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-300 animate-pulse">
                {config.displayName}
              </h3>
              <div className="grid gap-3">
                {[1, 2, 3].map(i => (
                  <div
                    key={i}
                    className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 animate-pulse"
                  >
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
                    <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Categorized Phrases Display */}
      {!state.isExtracting && totalPhrases > 0 && (
        <div className="space-y-6">
          {categoryConfigs.map(config => {
            const phrases = filteredCategories[config.name];
            if (!state.activeCategories.has(config.name) || phrases.length === 0) return null;

            return (
              <div key={config.name} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
                      {phrases.length}
                    </span>
                    {config.displayName}
                  </h3>
                </div>

                <div className="grid gap-3">
                  {phrases.map(phrase => {
                    const isSelected = state.selectedPhrases.has(phrase.id);
                    const isAdded = addedPhrases.has(phrase.id);

                    return (
                      <div
                        key={phrase.id}
                        className={`border rounded-lg p-4 transition-all hover:shadow-md ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800'
                        } ${isAdded ? 'opacity-70' : ''}`}
                      >
                        <div className="space-y-3">
                          {/* Phrase Header */}
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                  "{phrase.phrase}"
                                </h4>
                                {phrase.gender && (
                                  <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                                    {phrase.gender}
                                  </span>
                                )}
                                {phrase.article && (
                                  <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded">
                                    {phrase.article}
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-700 dark:text-gray-300 mb-2">
                                {phrase.definition}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                                "{phrase.context}"
                              </p>
                            </div>

                            <div className="flex items-center gap-2 ml-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(phrase.difficulty)}`}>
                                {phrase.difficulty}
                              </span>
                              
                              {/* Selection checkbox */}
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => togglePhraseSelection(phrase.id)}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                              />

                              {/* Quick add button */}
                              <button
                                data-phrase-id={phrase.id}
                                onClick={() => addPhraseToVocabulary(phrase)}
                                disabled={isAdded}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  isAdded
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 cursor-not-allowed'
                                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                                }`}
                                title={isAdded ? 'Added to vocabulary' : 'Add to vocabulary'}
                              >
                                {isAdded ? (
                                  <CheckCircle2 className="h-4 w-4" />
                                ) : (
                                  <Plus className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Part of Speech and Conjugation */}
                          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                            <span>Part of Speech: {phrase.partOfSpeech}</span>
                            {phrase.conjugation && (
                              <span>Infinitive: {phrase.conjugation}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!state.isExtracting && totalPhrases === 0 && !state.error && (
        <div className="text-center py-8">
          <BookOpen className="h-8 w-8 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No vocabulary extracted yet.
          </p>
          <button
            onClick={extractPhrases}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Extract Vocabulary
          </button>
        </div>
      )}
    </div>
  );
};

export default VocabularyExtractor;