/**
 * Vocabulary Manager Component
 * Handles vocabulary CRUD operations and spaced repetition
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@radix-ui/react-card';
import { Button } from '@radix-ui/react-button';
import { Input } from '@radix-ui/react-input';
import { Badge } from '@radix-ui/react-badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@radix-ui/react-tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@radix-ui/react-select';
import { 
  Search,
  Filter,
  Plus,
  BookOpen,
  Star,
  Trash2,
  Edit3,
  Volume2,
  CheckCircle,
  Clock,
  TrendingUp,
  Target
} from 'lucide-react';
import { 
  useUserPhrases,
  useVocabularyStats,
  useUpdatePhrase,
  useDeletePhrase,
  useTogglePhraseSelection,
  useBulkUpdatePhraseSelection,
  usePhrasesByCategory
} from '../../hooks/useVocabulary';
import { useDebounce } from '../../hooks/useDebounce';
import { LoadingSpinner } from '../Shared/LoadingStates';
import { Phrase } from '../../types/database';

interface VocabularyManagerProps {
  className?: string;
  showStats?: boolean;
  allowEdit?: boolean;
  compact?: boolean;
}

export const VocabularyManager: React.FC<VocabularyManagerProps> = ({
  className = '',
  showStats = true,
  allowEdit = true,
  compact = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [selectedPhrases, setSelectedPhrases] = useState<string[]>([]);
  const [editingPhrase, setEditingPhrase] = useState<string | null>(null);

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Build filters object
  const filters = useMemo(() => {
    const filterObj: any = {};
    
    if (selectedCategory !== 'all') filterObj.category = selectedCategory;
    if (selectedDifficulty !== 'all') filterObj.difficulty = selectedDifficulty;
    if (selectedFilter === 'selected') filterObj.isUserSelected = true;
    if (selectedFilter === 'mastered') filterObj.isMastered = true;
    if (debouncedSearch) filterObj.search_query = debouncedSearch;
    
    return filterObj;
  }, [selectedCategory, selectedDifficulty, selectedFilter, debouncedSearch]);

  // Queries
  const { data: phrases, isLoading: phrasesLoading } = useUserPhrases(filters);
  const { data: stats, isLoading: statsLoading } = useVocabularyStats();
  const { data: categorizedPhrases } = usePhrasesByCategory();

  // Mutations
  const updatePhrase = useUpdatePhrase();
  const deletePhrase = useDeletePhrase();
  const toggleSelection = useTogglePhraseSelection();
  const bulkUpdateSelection = useBulkUpdatePhraseSelection();

  const handlePhraseSelect = (phraseId: string) => {
    setSelectedPhrases(prev => 
      prev.includes(phraseId) 
        ? prev.filter(id => id !== phraseId)
        : [...prev, phraseId]
    );
  };

  const handleBulkAction = async (action: 'select' | 'deselect' | 'delete') => {
    if (selectedPhrases.length === 0) return;

    try {
      switch (action) {
        case 'select':
          await bulkUpdateSelection.mutateAsync({ phraseIds: selectedPhrases, isSelected: true });
          break;
        case 'deselect':
          await bulkUpdateSelection.mutateAsync({ phraseIds: selectedPhrases, isSelected: false });
          break;
        case 'delete':
          await Promise.all(selectedPhrases.map(id => deletePhrase.mutateAsync(id)));
          break;
      }
      setSelectedPhrases([]);
    } catch (error) {
      console.error('Bulk action failed:', error);
    }
  };

  const handleToggleSelection = async (phrase: Phrase) => {
    try {
      await toggleSelection.mutateAsync({
        phraseId: phrase.id,
        isSelected: !phrase.is_user_selected,
      });
    } catch (error) {
      console.error('Failed to toggle phrase selection:', error);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'advanced':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      vocabulary: 'bg-blue-100 text-blue-800 border-blue-200',
      expression: 'bg-purple-100 text-purple-800 border-purple-200',
      idiom: 'bg-pink-100 text-pink-800 border-pink-200',
      phrase: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      grammar_pattern: 'bg-orange-100 text-orange-800 border-orange-200',
      verb_conjugation: 'bg-teal-100 text-teal-800 border-teal-200',
      cultural_reference: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  if (phrasesLoading || (showStats && statsLoading)) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Stats Overview */}
      {showStats && stats && !compact && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-500" />
                <div>
                  <div className="text-lg font-semibold">{stats.total}</div>
                  <div className="text-sm text-gray-600">Total Phrases</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-green-500" />
                <div>
                  <div className="text-lg font-semibold">{stats.selected}</div>
                  <div className="text-sm text-gray-600">Selected</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-purple-500" />
                <div>
                  <div className="text-lg font-semibold">{stats.mastered}</div>
                  <div className="text-sm text-gray-600">Mastered</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-orange-500" />
                <div>
                  <div className="text-lg font-semibold">{Math.round(stats.mastery_rate * 100)}%</div>
                  <div className="text-sm text-gray-600">Mastery Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Vocabulary Library
            </span>
            {selectedPhrases.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('select')}
                >
                  Select for Study
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('deselect')}
                >
                  Deselect
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleBulkAction('delete')}
                >
                  Delete ({selectedPhrases.length})
                </Button>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search phrases..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filter Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categorizedPhrases?.map(cat => (
                    <SelectItem key={cat.category} value={cat.category}>
                      {cat.category.replace('_', ' ')} ({cat.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                <SelectTrigger>
                  <SelectValue placeholder="All Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedFilter} onValueChange={setSelectedFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Phrases" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Phrases</SelectItem>
                  <SelectItem value="selected">Selected for Study</SelectItem>
                  <SelectItem value="mastered">Mastered</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Phrases List */}
      <div className="space-y-4">
        {phrases && phrases.length > 0 ? (
          phrases.map((phrase) => (
            <Card key={phrase.id} className={`transition-all duration-200 ${
              selectedPhrases.includes(phrase.id) ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
            }`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  {/* Phrase Content */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedPhrases.includes(phrase.id)}
                        onChange={() => handlePhraseSelect(phrase.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-lg">{phrase.spanish_text}</h3>
                          {phrase.is_user_selected && (
                            <Star className="w-4 h-4 text-yellow-500 fill-current" />
                          )}
                          {phrase.is_mastered && (
                            <CheckCircle className="w-4 h-4 text-green-500 fill-current" />
                          )}
                        </div>
                        <p className="text-gray-600 mb-2">{phrase.english_translation}</p>
                        
                        {/* Context sentences */}
                        {phrase.context_sentence_spanish && (
                          <div className="text-sm bg-gray-50 p-2 rounded">
                            <p className="italic text-gray-700">{phrase.context_sentence_spanish}</p>
                            {phrase.context_sentence_english && (
                              <p className="text-gray-500 mt-1">{phrase.context_sentence_english}</p>
                            )}
                          </div>
                        )}

                        {/* Badges */}
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge className={getDifficultyColor(phrase.difficulty_level)}>
                            {phrase.difficulty_level}
                          </Badge>
                          <Badge className={getCategoryColor(phrase.category)}>
                            {phrase.category.replace('_', ' ')}
                          </Badge>
                          {phrase.word_type && (
                            <Badge variant="outline">
                              {phrase.word_type}
                            </Badge>
                          )}
                          {phrase.formality_level !== 'neutral' && (
                            <Badge variant="outline">
                              {phrase.formality_level}
                            </Badge>
                          )}
                        </div>

                        {/* Study Stats */}
                        {phrase.study_count > 0 && (
                          <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                            <span>Studied {phrase.study_count} times</span>
                            <span>
                              Accuracy: {phrase.study_count > 0 
                                ? Math.round((phrase.correct_count / phrase.study_count) * 100)
                                : 0}%
                            </span>
                            {phrase.last_studied_at && (
                              <span>
                                Last: {new Date(phrase.last_studied_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        )}

                        {/* User Notes */}
                        {phrase.user_notes && (
                          <div className="text-sm bg-blue-50 p-2 rounded border-l-4 border-blue-300 mt-2">
                            <strong>Note:</strong> {phrase.user_notes}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {allowEdit && (
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleSelection(phrase)}
                        className={phrase.is_user_selected ? 'bg-yellow-50' : ''}
                      >
                        {phrase.is_user_selected ? (
                          <>
                            <Star className="w-4 h-4 mr-1 fill-current" />
                            Selected
                          </>
                        ) : (
                          <>
                            <Star className="w-4 h-4 mr-1" />
                            Select
                          </>
                        )}
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingPhrase(phrase.id)}
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Play pronunciation if available
                          if (phrase.phonetic_pronunciation) {
                            // This would integrate with a TTS service
                            // console.log('Playing pronunciation:', phrase.phonetic_pronunciation);
                          }
                        }}
                      >
                        <Volume2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">No phrases found</h3>
              <p className="text-gray-500">
                {debouncedSearch || selectedCategory !== 'all' || selectedDifficulty !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Start extracting phrases from images to build your vocabulary'
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Load More Button */}
      {phrases && phrases.length >= 20 && (
        <div className="text-center">
          <Button variant="outline">Load More Phrases</Button>
        </div>
      )}
    </div>
  );
};

export default VocabularyManager;